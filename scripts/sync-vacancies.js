/**
 * sync-vacancies.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time / on-demand script to OCR and parse job vacancy posters from
 * Google Drive, then store structured data in Supabase.
 *
 * WORKFLOW:
 *   1. Fetch all file IDs from the Drive vacancy folder (via GAS)
 *   2. Check which IDs are already in Supabase (skip them — no duplicates)
 *   3. For each new file: OCR → parse → upsert to Supabase
 *   4. Print a summary
 *
 * USAGE:
 *   node scripts/sync-vacancies.js              ← sync only NEW files (safe to re-run)
 *   node scripts/sync-vacancies.js --dry-run    ← preview without writing anything
 *   node scripts/sync-vacancies.js --reparse    ← re-parse rows that have text but null industry
 *   node scripts/sync-vacancies.js --force      ← re-OCR + re-parse ALL files
 *   node scripts/sync-vacancies.js --limit 10   ← only process first N files
 *
 * This script is intentionally NOT called from the analytics page.
 * Run it manually whenever new posters are added to the Drive folder.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ─── Config ──────────────────────────────────────────────────────────────────
// Load from env.js (parse the window.ENV object)
const __dir = dirname(fileURLToPath(import.meta.url));
const envRaw = readFileSync(join(__dir, '..', 'env.js'), 'utf8');
const envMatch = envRaw.match(/window\.ENV\s*=\s*(\{[\s\S]+?\});/);
if (!envMatch) { console.error('Could not parse env.js'); process.exit(1); }
// eslint-disable-next-line no-new-func
const ENV = new Function('return ' + envMatch[1])();

const BACKEND_URL  = ENV.BACKEND_GAS_URL;
const SUPABASE_URL = ENV.SUPABASE_URL;
const SUPABASE_KEY = ENV.SUPABASE_ANON_KEY;

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE   = process.argv.includes('--force');
const REPARSE = process.argv.includes('--reparse'); // re-parse existing text without re-OCR
const limitArg = process.argv.indexOf('--limit');
const LIMIT   = limitArg !== -1 ? parseInt(process.argv[limitArg + 1]) || 999 : 999;

// Low-content threshold: posters with fewer chars than this are likely
// QR codes, "ongoing interview" notices, or image-only designs
const LOW_CONTENT_THRESHOLD = 80;

// ─── Supabase client ─────────────────────────────────────────────────────────
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Fetch helpers ────────────────────────────────────────────────────────────
async function gasGet(action, params = {}) {
  const url = new URL(BACKEND_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString(), { signal: AbortSignal.timeout(60000) });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Non-JSON from GAS (${action}): ${text.substring(0, 200)}`); }
}

async function gasPost(action, body = {}) {
  const res = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...body }),
    signal: AbortSignal.timeout(90000)
  });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch { throw new Error(`Non-JSON from GAS (${action}): ${text.substring(0, 200)}`); }
}

// ─── Job Posting Parser (mirrors the test script logic) ──────────────────────
const NOISE_PATTERNS = [
  /^P\.?E\.?S\.?O/i, /public\s+employment\s+service/i,
  /local\s+recruitment\s+activity/i, /in.?house\s+interview/i,
  /interview\s+schedule/i, /facebook\.com/i, /^@/, /^www\./i,
  /^https?:\/\//i, /city\s+hall/i, /executive\s+building/i,
  /south\s+wing/i, /2nd\s+floor/i, /ground\s+floor/i,
  /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d/i,
  /^(mon|tue|wed|thu|fri|sat|sun)$/i,
  /^we\s+want\s+you/i, /^apply\s+na/i, /^office\s+of\s+the/i,
];

const JOB_TITLE_WORDS = [
  'CARPENTER','ELECTRICIAN','WELDER','PLUMBER','MECHANIC','TECHNICIAN',
  'DRIVER','COOK','WAITER','CASHIER','SALES','NURSE','CAREGIVER',
  'TEACHER','ENCODER','MANAGER','SUPERVISOR','GUARD','JANITOR',
  'HELPER','LABORER','WORKER','STAFF','CLERK','AGENT','OPERATOR',
  'ASSEMBLER','PACKER','BARISTA','CREW','TRAINER','INSTRUCTOR',
  'PROGRAMMER','DEVELOPER','ANALYST','ACCOUNTANT','BOOKKEEPER',
  'SECRETARY','COORDINATOR','ASSISTANT','RECEPTIONIST','DISPATCHER',
  'FORKLIFT','WELDER','FABRICATOR','MASON','PAINTER','STEWARD',
  'BARTENDER','HOUSEKEEPING','PHARMACIST','THERAPIST','RADIOLOGIST',
  'MIDWIFE','REPRESENTATIVE','PROMOTER','SALESPERSON',
];

const JOB_DICTIONARY = {
  'Skilled Trades':            ['CARPENTER','ELECTRICIAN','WELDER','PLUMBER','MECHANIC','TECHNICIAN','MASON','PAINTER','FABRICATOR'],
  'Manufacturing & Logistics': ['PRODUCTION','FORKLIFT','WAREHOUSE','DELIVERY','OPERATOR','PACKER','ASSEMBLER','LOGISTICS','INVENTORY'],
  'Hospitality & Food':        ['KITCHEN','DINING','COOK','WAITER','BARISTA','HOTEL','RESTAURANT','CREW','HOUSEKEEPING','STEWARD','BARTENDER'],
  'Retail & Sales':            ['SALES','CASHIER','MERCHANDISER','CLERK','PROMOTER','SALESPERSON','STORE'],
  'Business & Admin':          ['MANAGER','ADMIN','ASSISTANT','SECRETARY','SUPERVISOR','COORDINATOR','ENCODER','BOOKKEEPER','ACCOUNTING'],
  'IT & Tech':                 ['DEVELOPER','PROGRAMMER','SOFTWARE','NETWORK ENGINEER','SYSTEM ADMIN','WEB DEVELOPER','TECH SUPPORT','DATA ANALYST','IT OFFICER'],
  'Education':                 ['TEACHER','INSTRUCTOR','PROFESSOR','TUTOR','FACULTY','TRAINER'],
  'Healthcare':                ['NURSE','CAREGIVER','MIDWIFE','PHARMACIST','MEDICAL','DENTAL','THERAPIST','RADIOLOGIST'],
  'Security & Government':     ['SECURITY GUARD','SECURITY OFFICER','UTILITY','JANITOR','MAINTENANCE'],
  'BPO & Customer Service':    ['CUSTOMER SERVICE','CALL CENTER','AGENT','REPRESENTATIVE','CHAT SUPPORT'],
};

function matchesKeyword(text, kw) {
  return new RegExp('\\b' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text);
}

function isBullet(line) {
  return /^[•\-\*\u2022►▸▶→]/.test(line) || /^\d+[.)]\s/.test(line);
}

function cleanBullet(line) {
  return line.replace(/^[•\-\*\u2022►▸▶→\d.)\s]+/, '').trim();
}

function parseJobPosting(rawText) {
  const lines = rawText
    .split('\n')
    .map(l => l.replace(/_{3,}/g, '').replace(/\s{2,}/g, ' ').trim())
    .filter(l => l.length > 1);

  const cleanLines = lines.filter(l => !NOISE_PATTERNS.some(p => p.test(l)));

  const result = {
    positions: [], company: null, location: null,
    qualifications: [], requirements: [],
    howToApply: null, contact: null, salary: null, slots: null,
  };

  // ── Positions ──
  const posPatterns = [
    /(?:open\s+)?position[s]?\s*[:\-–]\s*(.+)/i,
    /(?:we\s+are\s+)?hiring\s*[:\-–]\s*(.+)/i,
    /(?:job\s+)?opening[s]?\s*[:\-–]\s*(.+)/i,
    /vacancy\s*[:\-–]\s*(.+)/i,
    /looking\s+for\s*[:\-–]?\s*(.+)/i,
    /needed\s*[:\-–]\s*(.+)/i,
    /wanted\s*[:\-–]\s*(.+)/i,
  ];
  for (const line of cleanLines) {
    for (const pat of posPatterns) {
      const m = line.match(pat);
      if (m) {
        m[1].split(/[,\/&]|and\s/i)
          .map(p => p.replace(/[•\-\*\.]/g, '').trim())
          .filter(p => p.length > 1)
          .forEach(p => result.positions.push(p));
      }
    }
  }
  // Fallback: scan for known job title words
  if (result.positions.length === 0) {
    const upper = rawText.toUpperCase();
    JOB_TITLE_WORDS.filter(w => new RegExp('\\b' + w + '\\b').test(upper))
      .forEach(w => result.positions.push(w.charAt(0) + w.slice(1).toLowerCase()));
  }
  result.positions = [...new Set(result.positions.map(p => p.trim()).filter(p => p.length > 1))];

  // ── Company ──
  const companyKw = /\b(Mall|Hotel|Hospital|Clinic|School|College|University|Corporation|Inc\.|Corp\.|Ltd\.|Company|Enterprise|Industries|Construction|Trading|Services|Solutions|Holdings|Group|Restaurant|Bakery|Farm|Resort|Cooperative|Foundation|Agency|Center|Centre)\b/i;
  for (const line of cleanLines) {
    if (/^[•\-\*]/.test(line)) continue;
    if (/qualif|require|graduate|experience|skilled|able to|physically|submit|apply|contact|email|phone|salary|position|hiring|opening|vacancy|needed|wanted/i.test(line)) continue;
    if (line.length > 70 || line.length < 4) continue;
    if (companyKw.test(line)) { result.company = line.trim(); break; }
  }

  // ── Location ──
  for (const line of cleanLines) {
    const m = line.match(/(?:location|address)\s*[:\-–]\s*(.+)/i)
           || line.match(/(?:located|based)\s+(?:at|in)\s+(.+)/i);
    if (m && !result.location) result.location = m[1].trim();
  }
  // Fallback: look for "LOCATION" label followed by next line
  for (let i = 0; i < cleanLines.length - 1; i++) {
    if (/^location$/i.test(cleanLines[i])) {
      result.location = cleanLines[i + 1].trim();
      break;
    }
  }

  // ── Qualifications & Requirements ──
  let inQual = false, inReq = false;
  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];
    if (/^qualif/i.test(line) || /qualifications?\s*[:\-–]/i.test(line)) {
      inQual = true; inReq = false;
      const inline = line.replace(/qualifications?\s*[:\-–]/i, '').trim();
      if (inline.length > 2) result.qualifications.push(cleanBullet(inline));
      continue;
    }
    if (/^requirements?\s*[:\-–]/i.test(line) || /documents?\s+(?:needed|required)/i.test(line) || /submit\s+your/i.test(line)) {
      inQual = false; inReq = true;
      const inline = line.replace(/requirements?\s*[:\-–]/i, '').replace(/submit\s+your/i, '').trim();
      if (inline.length > 2) result.requirements.push(cleanBullet(inline));
      continue;
    }
    if (/^(?:salary|compensation|benefits|how\s+to\s+apply|contact|send|email|interested|for\s+inquir)/i.test(line)) {
      inQual = false; inReq = false;
    }
    if (inQual && (isBullet(line) || line.length < 100)) result.qualifications.push(cleanBullet(line));
    else if (inReq && (isBullet(line) || line.length < 100)) result.requirements.push(cleanBullet(line));
  }

  // ── Salary ──
  for (const line of cleanLines) {
    const m = line.match(/(?:salary|rate|pay|compensation|wage)\s*[:\-–]?\s*([\₱$]?[\d,]+(?:\s*[-–]\s*[\₱$]?[\d,]+)?(?:\s*(?:per\s+)?(?:month|day|hour|week))?)/i);
    if (m) { result.salary = m[1].trim(); break; }
    const peso = line.match(/₱\s*[\d,]+(?:\s*[-–]\s*₱?\s*[\d,]+)?/);
    if (peso && !result.salary) result.salary = peso[0].trim();
  }

  // ── How to Apply ──
  const applyLines = [];
  let inApply = false;
  for (const line of cleanLines) {
    if (/submit\s+your|send\s+(?:your|to)|apply\s+(?:at|to|by|via|through)|interested\s+applicants?|for\s+inquir|walk.?in|drop\s+(?:your|resume)/i.test(line)) inApply = true;
    if (/^apply\s+na/i.test(line)) continue;
    if (inApply && line.length > 5) { applyLines.push(line); if (applyLines.length >= 3) break; }
  }
  if (applyLines.length) result.howToApply = applyLines.join(' ').substring(0, 300);

  // ── Contact ──
  const emailM = rawText.match(/[\w.\-+]+@[\w.\-]+\.[a-z]{2,}/i);
  if (emailM) result.contact = emailM[0];
  if (!result.contact) {
    const phoneM = rawText.match(/(?:\+63|0)[\d\s\-]{9,12}/);
    if (phoneM) result.contact = phoneM[0].trim();
  }

  // ── Slots ──
  const slotsM = rawText.match(/(\d+)\s*(?:slot|opening|position|vacancy|vacancies|needed|wanted)/i);
  if (slotsM) result.slots = parseInt(slotsM[1]);

  return result;
}

function classifyIndustry(upperText) {
  for (const [industry, keywords] of Object.entries(JOB_DICTIONARY)) {
    for (const kw of keywords) {
      if (matchesKeyword(upperText, kw)) return industry;
    }
  }
  return 'Others';
}

function getConfidence(parsed, textLength) {
  if (textLength < LOW_CONTENT_THRESHOLD) return 'low';
  const score = (parsed.positions.length > 0 ? 2 : 0)
              + (parsed.company ? 1 : 0)
              + (parsed.qualifications.length > 0 ? 1 : 0)
              + (parsed.contact ? 1 : 0);
  if (score >= 4) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║         Job Vacancy Sync — NBSC SAS                     ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  if (DRY_RUN) console.log('⚠️  DRY RUN — no data will be written\n');
  if (FORCE)   console.log('⚠️  FORCE mode — will re-OCR and re-parse all files\n');
  if (REPARSE) console.log('♻️  REPARSE mode — re-parsing existing text without re-OCR\n');

  // ══════════════════════════════════════════════════════════════
  // REPARSE MODE: fix existing rows that have text but null fields
  // Use this to fix the old data that was written without parsing
  // ══════════════════════════════════════════════════════════════
  if (REPARSE) {
    console.log('🔍 Fetching rows with extracted_text but null industry...');
    const { data: staleRows, error: fetchErr } = await sb
      .from('sas_job_vacancies')
      .select('id, drive_file_id, file_name, extracted_text, text_length')
      .is('industry', null)
      .not('extracted_text', 'is', null);

    if (fetchErr) { console.error('❌ Supabase fetch failed:', fetchErr.message); process.exit(1); }

    const rows = (staleRows || []).slice(0, LIMIT);
    console.log(`📊 Found ${staleRows?.length || 0} rows to re-parse${LIMIT < (staleRows?.length || 0) ? ` (limited to ${LIMIT})` : ''}\n`);

    if (rows.length === 0) {
      console.log('✅ All rows already have structured data. Nothing to re-parse.');
      return;
    }

    let reparsed = 0, lowContent = 0, failed = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const prefix = `[${i + 1}/${rows.length}]`;
      const rawText = row.extracted_text || '';
      const textLength = rawText.length;
      const isLowContent = textLength < LOW_CONTENT_THRESHOLD;

      process.stdout.write(`${prefix} Re-parsing: "${(row.file_name || row.drive_file_id).substring(0, 45)}"... `);

      try {
        const parsed = isLowContent ? {
          positions: [], company: null, location: null,
          qualifications: [], requirements: [],
          howToApply: null, contact: null, salary: null, slots: null,
        } : parseJobPosting(rawText);

        const upperText = rawText.toUpperCase();
        const industry = isLowContent ? null : classifyIndustry(upperText);
        const confidence = getConfidence(parsed, textLength);

        if (isLowContent) {
          console.log(`⚠️  Low content (${textLength} chars)`);
          lowContent++;
        } else {
          console.log(`✅ ${industry || 'Others'} | [${(parsed.positions || []).slice(0,3).join(', ') || 'no positions'}] | ${confidence}`);
        }

        if (!DRY_RUN) {
          const { error: updateErr } = await sb
            .from('sas_job_vacancies')
            .update({
              text_length:      textLength,
              is_low_content:   isLowContent,
              industry:         industry,
              positions:        parsed.positions.length > 0 ? parsed.positions : null,
              company:          parsed.company || null,
              location:         parsed.location || null,
              salary:           parsed.salary || null,
              slots:            parsed.slots || null,
              qualifications:   parsed.qualifications.length > 0 ? parsed.qualifications : null,
              requirements:     parsed.requirements.length > 0 ? parsed.requirements : null,
              how_to_apply:     parsed.howToApply || null,
              contact:          parsed.contact || null,
              parse_confidence: confidence,
            })
            .eq('id', row.id);

          if (updateErr) {
            console.log(`   ❌ Update failed: ${updateErr.message}`);
            failed++;
            continue;
          }
        }
        reparsed++;
      } catch (err) {
        console.log(`❌ ${err.message}`);
        failed++;
      }
    }

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                  REPARSE COMPLETE                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log(`✅ Re-parsed:    ${reparsed}`);
    console.log(`⚠️  Low content:  ${lowContent}`);
    console.log(`❌ Failed:       ${failed}`);
    if (DRY_RUN) console.log('\n⚠️  DRY RUN — nothing was written.');
    return;
  }

  // ══════════════════════════════════════════════════════════════
  // NORMAL / FORCE MODE: OCR new files from Drive
  // ══════════════════════════════════════════════════════════════

  // ── Step 1: Get all Drive file IDs ──
  console.log('📁 Fetching Drive vacancy folder...');
  const driveRes = await gasGet('getDriveVacancies');
  if (!driveRes.success) {
    console.error('❌ getDriveVacancies failed:', driveRes.message);
    process.exit(1);
  }

  const allFiles = [];
  driveRes.folders.forEach(f => {
    const folderName = f.name;
    if (f.files) f.files.forEach(file => allFiles.push({ ...file, folderName }));
    if (f.subfolders) f.subfolders.forEach(sf => {
      if (sf.files) sf.files.forEach(file => allFiles.push({ ...file, folderName: folderName + '/' + sf.name }));
    });
  });
  console.log(`✅ Found ${allFiles.length} files across ${driveRes.folders.length} folders`);

  // ── Step 2: Check which are already in Supabase ──
  console.log('\n🔍 Checking Supabase for existing records...');
  const { data: existing, error: fetchErr } = await sb
    .from('sas_job_vacancies')
    .select('drive_file_id');
  if (fetchErr) { console.error('❌ Supabase fetch failed:', fetchErr.message); process.exit(1); }

  const existingIds = new Set((existing || []).map(r => r.drive_file_id));
  const toProcess = FORCE
    ? allFiles
    : allFiles.filter(f => !existingIds.has(f.id));

  const limited = toProcess.slice(0, LIMIT);
  console.log(`📊 Already synced: ${existingIds.size} | New to process: ${toProcess.length}${LIMIT < toProcess.length ? ` (limited to ${LIMIT})` : ''}`);

  if (limited.length === 0) {
    console.log('\n✅ Nothing to sync — all files are already in Supabase.');
    console.log('   • Add new posters to the Drive folder, then run this script again.');
    console.log('   • To fix existing rows with null fields: node scripts/sync-vacancies.js --reparse');
    return;
  }

  // ── Step 3: Process each new file ──
  console.log(`\n⚙️  Processing ${limited.length} file(s)...\n`);

  const stats = { success: 0, lowContent: 0, failed: 0 };

  for (let i = 0; i < limited.length; i++) {
    const file = limited[i];
    const prefix = `[${i + 1}/${limited.length}]`;

    process.stdout.write(`${prefix} OCR: "${file.name.substring(0, 50)}"... `);

    try {
      const ocrRes = await gasGet('testOCRSingleFile', { fileId: file.id });
      if (!ocrRes.success) {
        console.log(`❌ ${ocrRes.message}`);
        stats.failed++;
        continue;
      }

      const rawText = ocrRes.extractedText || '';
      const textLength = rawText.length;
      const isLowContent = textLength < LOW_CONTENT_THRESHOLD;

      if (isLowContent) {
        console.log(`⚠️  Low content (${textLength} chars) — QR/image-only`);
        stats.lowContent++;
      } else {
        console.log(`✅ ${textLength} chars`);
      }

      const parsed = isLowContent ? {
        positions: [], company: null, location: null,
        qualifications: [], requirements: [],
        howToApply: null, contact: null, salary: null, slots: null,
      } : parseJobPosting(rawText);

      const upperText = rawText.toUpperCase();
      const industry = isLowContent ? null : classifyIndustry(upperText);
      const confidence = getConfidence(parsed, textLength);

      if (!isLowContent) {
        console.log(`         → ${industry || 'Others'} | [${(parsed.positions || []).slice(0,3).join(', ') || 'none'}] | ${confidence}`);
      }

      const record = {
        drive_file_id:    file.id,
        file_name:        file.name,
        folder_name:      file.folderName || null,
        synced_at:        new Date().toISOString(),
        extracted_text:   rawText,
        text_length:      textLength,
        is_low_content:   isLowContent,
        industry:         industry,
        positions:        parsed.positions.length > 0 ? parsed.positions : null,
        company:          parsed.company || null,
        location:         parsed.location || null,
        salary:           parsed.salary || null,
        slots:            parsed.slots || null,
        qualifications:   parsed.qualifications.length > 0 ? parsed.qualifications : null,
        requirements:     parsed.requirements.length > 0 ? parsed.requirements : null,
        how_to_apply:     parsed.howToApply || null,
        contact:          parsed.contact || null,
        parse_confidence: confidence,
      };

      if (!DRY_RUN) {
        const { error: upsertErr } = await sb
          .from('sas_job_vacancies')
          .upsert(record, { onConflict: 'drive_file_id' });

        if (upsertErr) {
          console.log(`         ❌ Supabase upsert failed: ${upsertErr.message}`);
          stats.failed++;
          continue;
        }
      }

      stats.success++;

    } catch (err) {
      console.log(`❌ Error: ${err.message}`);
      stats.failed++;
    }

    // Small delay between files to avoid GAS rate limits
    if (i < limited.length - 1) await new Promise(r => setTimeout(r, 1500));
  }

  // ── Summary ──
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║                    SYNC COMPLETE                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`✅ Processed:    ${stats.success}`);
  console.log(`⚠️  Low content:  ${stats.lowContent} (stored but excluded from analytics)`);
  console.log(`❌ Failed:       ${stats.failed}`);
  if (DRY_RUN) console.log('\n⚠️  DRY RUN — nothing was written. Remove --dry-run to sync for real.');
  else {
    console.log(`\n📊 Total in Supabase now: ~${existingIds.size + stats.success}`);
    console.log('\nNext steps:');
    console.log('  • Open Analytics → Job Vacancies to see the charts');
    console.log('  • Run again when new posters are added to Drive');
  }
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
