/**
 * OCR Single File Test — with structured parsing
 *
 * Usage:
 *   node scratch/test-ocr-single.js              ← picks first file from Drive
 *   node scratch/test-ocr-single.js <FILE_ID>    ← specific file
 *   node scratch/test-ocr-single.js --all        ← test first 5 files
 */

const BACKEND_URL = 'https://script.google.com/macros/s/AKfycbwXAyuE63HcK0maq2bmDtr3Bfvh1QjC1mqOcqGgClq8cj8t2jj9hbQIix66pYkT2d59Ag/exec';

// ─── Structured Job Posting Parser ───────────────────────────────────────────
// Takes raw OCR text and extracts structured fields.
// Handles the messy output from Google's OCR on job posting images.

function parseJobPosting(rawText) {
  // Normalize: collapse multiple spaces/underscores, trim lines
  const lines = rawText
    .split('\n')
    .map(l => l.replace(/_{3,}/g, '').replace(/\s{2,}/g, ' ').trim())
    .filter(l => l.length > 1);

  // Strip known noise lines: PESO headers, social media handles, event labels
  const NOISE_PATTERNS = [
    /^P\.?E\.?S\.?O/i,
    /public\s+employment\s+service/i,
    /local\s+recruitment\s+activity/i,
    /in.?house\s+interview/i,
    /interview\s+schedule/i,
    /facebook\.com/i,
    /^@/,
    /^www\./i,
    /^https?:\/\//i,
    /city\s+hall/i,
    /executive\s+building/i,
    /south\s+wing/i,
    /2nd\s+floor/i,
    /ground\s+floor/i,
    /^apr\s+\d/i,
    /^jan\s+\d/i, /^feb\s+\d/i, /^mar\s+\d/i, /^may\s+\d/i,
    /^jun\s+\d/i, /^jul\s+\d/i, /^aug\s+\d/i, /^sep\s+\d/i,
    /^oct\s+\d/i, /^nov\s+\d/i, /^dec\s+\d/i,
    /^mon$|^tue$|^wed$|^thu$|^fri$|^sat$|^sun$/i,
    /^we\s+want\s+you/i,
    /^apply\s+na/i,
    /^city\s+of/i,           // "CITY OF CAGAYAN DE ORO" — not a company
    /^office\s+of\s+the/i,
  ];

  const cleanLines = lines.filter(l => !NOISE_PATTERNS.some(p => p.test(l)));

  const result = {
    positions: [],
    company: null,
    location: null,
    qualifications: [],
    requirements: [],
    howToApply: null,
    contact: null,
    salary: null,
    slots: null,
    rawLines: lines.length
  };

  // ── 1. Extract positions ──────────────────────────────────────────────────
  // Patterns: "Open Position: CARPENTER", "Position: Driver", "We are hiring: NURSE"
  // Also: lines that are ALL CAPS and short (2-4 words) after "HIRING" or "POSITION"
  const positionPatterns = [
    /(?:open\s+)?position[s]?\s*[:\-–]\s*(.+)/i,
    /(?:we\s+are\s+)?hiring\s*[:\-–]\s*(.+)/i,
    /(?:job\s+)?opening[s]?\s*[:\-–]\s*(.+)/i,
    /vacancy\s*[:\-–]\s*(.+)/i,
    /looking\s+for\s*[:\-–]?\s*(.+)/i,
    /needed\s*[:\-–]\s*(.+)/i,
    /wanted\s*[:\-–]\s*(.+)/i,
  ];

  for (const line of cleanLines) {
    for (const pat of positionPatterns) {
      const m = line.match(pat);
      if (m) {
        // Split on common separators in case multiple positions listed
        const raw = m[1].trim();
        const parts = raw.split(/[,\/&]|and\s/i).map(p => p.replace(/[•\-\*\.]/g, '').trim()).filter(p => p.length > 1);
        result.positions.push(...parts);
      }
    }
  }

  // Fallback: look for ALL-CAPS lines that look like job titles (2-5 words, no numbers)
  if (result.positions.length === 0) {
    const JOB_TITLE_WORDS = [
      'CARPENTER','ELECTRICIAN','WELDER','PLUMBER','MECHANIC','TECHNICIAN',
      'DRIVER','COOK','WAITER','CASHIER','SALES','NURSE','CAREGIVER',
      'TEACHER','ENCODER','MANAGER','SUPERVISOR','GUARD','JANITOR',
      'HELPER','LABORER','WORKER','STAFF','CLERK','AGENT','OPERATOR',
      'ASSEMBLER','PACKER','BARISTA','CREW','TRAINER','INSTRUCTOR',
      'PROGRAMMER','DEVELOPER','ANALYST','ACCOUNTANT','BOOKKEEPER',
      'SECRETARY','COORDINATOR','ASSISTANT','RECEPTIONIST','DISPATCHER'
    ];
    for (const line of cleanLines) {
      const upper = line.toUpperCase();
      if (JOB_TITLE_WORDS.some(w => upper.includes(w))) {
        // Extract just the job title word(s)
        const matched = JOB_TITLE_WORDS.filter(w => upper.includes(w));
        result.positions.push(...matched.map(w => toTitleCase(w)));
      }
    }
  }

  // Deduplicate positions
  result.positions = [...new Set(result.positions.map(p => p.trim()).filter(p => p.length > 1))];

  // ── 2. Extract company name ───────────────────────────────────────────────
  // Strategy: find lines that look like company names BEFORE the qualifications section
  // Avoid picking up bullet points or qualification lines
  const companyPatterns = [
    /company\s*[:\-–]\s*(.+)/i,
    /employer\s*[:\-–]\s*(.+)/i,
  ];

  for (const line of cleanLines) {
    for (const pat of companyPatterns) {
      const m = line.match(pat);
      if (m && !result.company) {
        result.company = m[1].trim();
      }
    }
  }

  // Fallback: scan for lines with known company-type words,
  // but SKIP lines that start with bullets or look like qualifications
  if (!result.company) {
    const companyKeywords = /\b(Mall|Hotel|Hospital|Clinic|School|College|University|Corporation|Inc\.|Corp\.|Ltd\.|Company|Enterprise|Industries|Construction|Trading|Services|Solutions|Holdings|Group|Restaurant|Bakery|Farm|Resort|Cooperative|Foundation|Agency|Center|Centre)\b/i;
    for (const line of cleanLines) {
      // Skip bullet lines, qualification lines, and very long lines
      if (/^[•\-\*]/.test(line)) continue;
      if (/qualif|require|graduate|experience|skilled|able to|physically|submit|apply|contact|email|phone|salary|position|hiring|opening|vacancy|needed|wanted/i.test(line)) continue;
      if (line.length > 70 || line.length < 4) continue;
      if (companyKeywords.test(line)) {
        result.company = line.trim();
        break;
      }
    }
  }

  // ── 3. Extract location ───────────────────────────────────────────────────
  const locationPatterns = [
    /location\s*[:\-–]\s*(.+)/i,
    /address\s*[:\-–]\s*(.+)/i,
    /(?:located|based)\s+(?:at|in)\s+(.+)/i,
    /(?:report\s+to|work\s+(?:at|in))\s+(.+)/i,
  ];

  for (const line of cleanLines) {
    for (const pat of locationPatterns) {
      const m = line.match(pat);
      if (m && !result.location) {
        result.location = m[1].trim();
      }
    }
  }

  // ── 4. Extract qualifications ─────────────────────────────────────────────
  let inQualSection = false;
  let inReqSection = false;

  for (let i = 0; i < cleanLines.length; i++) {
    const line = cleanLines[i];
    const lower = line.toLowerCase();

    // Section headers
    if (/^qualif/i.test(line) || /qualifications?\s*[:\-–]/i.test(line)) {
      inQualSection = true;
      inReqSection = false;
      // If the header has content after the colon, grab it
      const inline = line.replace(/qualifications?\s*[:\-–]/i, '').trim();
      if (inline.length > 2) result.qualifications.push(cleanBullet(inline));
      continue;
    }

    if (/^requirements?\s*[:\-–]/i.test(line) || /documents?\s+(?:needed|required)/i.test(line) || /submit\s+your/i.test(line)) {
      inQualSection = false;
      inReqSection = true;
      const inline = line.replace(/requirements?\s*[:\-–]/i, '').replace(/submit\s+your/i, '').trim();
      if (inline.length > 2) result.requirements.push(cleanBullet(inline));
      continue;
    }

    // Stop qual/req section on new major section headers
    if (/^(?:salary|compensation|benefits|how\s+to\s+apply|contact|send|email|interested|for\s+inquir)/i.test(line)) {
      inQualSection = false;
      inReqSection = false;
    }

    if (inQualSection && isBulletLine(line)) {
      result.qualifications.push(cleanBullet(line));
    } else if (inReqSection && isBulletLine(line)) {
      result.requirements.push(cleanBullet(line));
    }
  }

  // ── 5. Extract salary ─────────────────────────────────────────────────────
  for (const line of cleanLines) {
    const m = line.match(/(?:salary|rate|pay|compensation|wage)\s*[:\-–]?\s*([\₱$]?[\d,]+(?:\s*[-–]\s*[\₱$]?[\d,]+)?(?:\s*(?:per\s+)?(?:month|day|hour|week))?)/i);
    if (m) {
      result.salary = m[1].trim();
      break;
    }
    // Also catch "₱XX,XXX" standalone
    const peso = line.match(/₱\s*[\d,]+(?:\s*[-–]\s*₱?\s*[\d,]+)?/);
    if (peso && !result.salary) {
      result.salary = peso[0].trim();
    }
  }

  // ── 6. Extract how to apply / contact ────────────────────────────────────
  // Look for the actual submission instructions, not header noise
  const applyLines = [];
  let inApplySection = false;

  for (const line of cleanLines) {
    const lower = line.toLowerCase();
    // Trigger on actual submission/application instructions
    if (/submit\s+your|send\s+(?:your|to)|apply\s+(?:at|to|by|via|through)|interested\s+applicants?|for\s+inquir|walk.?in|drop\s+(?:your|resume)/i.test(line)) {
      inApplySection = true;
    }
    // Don't trigger on noisy header phrases like "APPLY NA!" (Filipino slang)
    if (/^apply\s+na/i.test(line)) continue;

    if (inApplySection && line.length > 5) {
      applyLines.push(line);
      if (applyLines.length >= 4) break;
    }
  }
  if (applyLines.length > 0) result.howToApply = applyLines.join(' ');

  // Extract email
  const emailMatch = rawText.match(/[\w.\-+]+@[\w.\-]+\.[a-z]{2,}/i);
  if (emailMatch) result.contact = emailMatch[0];

  // Extract phone
  if (!result.contact) {
    const phoneMatch = rawText.match(/(?:\+63|0)[\d\s\-]{9,12}/);
    if (phoneMatch) result.contact = phoneMatch[0].trim();
  }

  // ── 7. Extract number of slots ────────────────────────────────────────────
  const slotsMatch = rawText.match(/(\d+)\s*(?:slot|opening|position|vacancy|vacancies|needed|wanted)/i);
  if (slotsMatch) result.slots = parseInt(slotsMatch[1]);

  return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isBulletLine(line) {
  return /^[•\-\*\u2022\u25cf\u25e6►▸▶→]/.test(line) ||
         /^[\d]+[.)]\s/.test(line) ||
         (line.length > 5 && line.length < 120 && !/^[A-Z\s]{10,}$/.test(line));
}

function cleanBullet(line) {
  return line.replace(/^[•\-\*\u2022\u25cf\u25e6►▸▶→\d.)\s]+/, '').trim();
}

function toTitleCase(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function formatParsed(parsed, industry, keywords) {
  const lines = [];
  lines.push('');
  lines.push('╔══════════════════════════════════════════════════════════╗');
  lines.push('║              STRUCTURED JOB POSTING                     ║');
  lines.push('╚══════════════════════════════════════════════════════════╝');

  lines.push(`\n🏭  Industry:      ${industry}`);
  lines.push(`🔑  Keywords:      ${keywords.map(k => k.keyword).join(', ') || 'none'}`);

  lines.push(`\n💼  Position(s):   ${parsed.positions.length > 0 ? parsed.positions.join(', ') : '⚠ Not detected'}`);
  lines.push(`🏢  Company:       ${parsed.company || '⚠ Not detected'}`);
  lines.push(`📍  Location:      ${parsed.location || '⚠ Not detected'}`);
  lines.push(`💰  Salary:        ${parsed.salary || '⚠ Not stated'}`);
  lines.push(`🎯  Slots:         ${parsed.slots != null ? parsed.slots : '⚠ Not stated'}`);

  if (parsed.qualifications.length > 0) {
    lines.push('\n📋  Qualifications:');
    parsed.qualifications.slice(0, 8).forEach(q => lines.push(`    • ${q}`));
  } else {
    lines.push('\n📋  Qualifications: ⚠ Not detected');
  }

  if (parsed.requirements.length > 0) {
    lines.push('\n📎  Requirements (documents):');
    parsed.requirements.slice(0, 6).forEach(r => lines.push(`    • ${r}`));
  }

  if (parsed.howToApply) {
    lines.push(`\n📬  How to Apply:  ${parsed.howToApply.substring(0, 200)}`);
  }
  if (parsed.contact) {
    lines.push(`📞  Contact:       ${parsed.contact}`);
  }

  lines.push('\n──────────────────────────────────────────────────────────');
  return lines.join('\n');
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, signal: AbortSignal.timeout(60000) });
  const text = await res.text();
  try { return JSON.parse(text); }
  catch (e) {
    console.error('Non-JSON response:', text.substring(0, 300));
    throw new Error('Response was not JSON');
  }
}

async function testFile(fileId, label) {
  console.log(`\n⏳ Running OCR on: ${label}`);
  const start = Date.now();
  const result = await fetchJSON(`${BACKEND_URL}?action=testOCRSingleFile&fileId=${encodeURIComponent(fileId)}`);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  if (!result.success) {
    console.error(`❌ OCR failed: ${result.message}`);
    return;
  }

  console.log(`✅ OCR done in ${elapsed}s — ${result.extractedTextLength} chars extracted`);

  const parsed = parseJobPosting(result.extractedText);
  console.log(formatParsed(parsed, result.matchedIndustry, result.matchedKeywords));

  // Show unmatched ALL-CAPS words as hints for expanding the dictionary
  if (result.matchedKeywords.length === 0 && result.extractedTextLength > 50) {
    const capsWords = [...new Set((result.extractedText.toUpperCase().match(/\b[A-Z]{4,}\b/g) || []))]
      .filter(w => !['THIS','THAT','WITH','FROM','YOUR','HAVE','WILL','BEEN','THEY','THEIR',
                     'APPLY','SUBMIT','PLEASE','OFFICE','LOCAL','CITY','FLOOR','BUILDING',
                     'CERTIFICATE','LETTER','RESUME','EMAIL','PHONE','CONTACT'].includes(w));
    console.log(`\n💡 Unmatched caps words (potential keywords to add):`);
    console.log(`   ${capsWords.slice(0, 15).join(', ')}`);
  }
}

async function main() {
  const arg = process.argv[2];

  // Fetch Drive listing
  console.log('\n📁 Fetching Drive vacancy folder listing...');
  const driveRes = await fetchJSON(`${BACKEND_URL}?action=getDriveVacancies`);
  if (!driveRes.success) { console.error('❌', driveRes.message); process.exit(1); }

  const allFiles = [];
  driveRes.folders.forEach(f => {
    if (f.files) f.files.forEach(file => allFiles.push({ ...file, folder: f.name }));
    if (f.subfolders) f.subfolders.forEach(sf => {
      if (sf.files) sf.files.forEach(file => allFiles.push({ ...file, folder: f.name + '/' + sf.name }));
    });
  });
  console.log(`✅ Found ${allFiles.length} files across ${driveRes.folders.length} folders\n`);

  if (arg === '--all') {
    // Test first 5 files
    const sample = allFiles.slice(0, 5);
    for (const f of sample) {
      await testFile(f.id, `"${f.name}" [${f.folder}]`);
    }
  } else if (arg && arg !== '--all') {
    // Specific file ID
    await testFile(arg, arg);
  } else {
    // Default: first file
    const f = allFiles[0];
    console.log(`🎯 Testing: "${f.name}" [${f.folder}]`);
    console.log(`   Drive ID: ${f.id}`);
    await testFile(f.id, f.name);
  }
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
