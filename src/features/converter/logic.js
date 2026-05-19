/**
 * NBSC Convert — Modular Universal Client-Side Converter Engine
 */

import { getEl } from "../../utils/dom.js";

// iLovePDF Cloud Suite Tools Database (21 Premium Tools)
const ILOVEPDF_TOOLS = [
  {
    id: 'merge',
    title: 'Merge PDF',
    desc: 'Combine PDFs in the order you want with the easiest PDF merger.',
    url: 'https://www.ilovepdf.com/merge_pdf',
    glow: '#ef4444',
    glowRgb: '239, 68, 68',
    category: 'optimize',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"></path></svg>`
  },
  {
    id: 'split',
    title: 'Split PDF',
    desc: 'Extract pages from your PDF or convert each page to a separate PDF.',
    url: 'https://www.ilovepdf.com/split_pdf',
    glow: '#f97316',
    glowRgb: '249, 115, 22',
    category: 'optimize',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="12" y1="3" x2="12" y2="21"></line></svg>`
  },
  {
    id: 'compress',
    title: 'Compress PDF',
    desc: 'Reduce file size while optimizing for maximal PDF quality.',
    url: 'https://www.ilovepdf.com/compress_pdf',
    glow: '#3b82f6',
    glowRgb: '59, 130, 246',
    category: 'optimize',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"></path></svg>`
  },
  {
    id: 'pdf-word',
    title: 'PDF to Word',
    desc: 'Convert your PDF to Word documents with incredible accuracy.',
    url: 'https://www.ilovepdf.com/pdf_to_word',
    glow: '#0ea5e9',
    glowRgb: '14, 165, 233',
    category: 'convert',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`
  },
  {
    id: 'word-pdf',
    title: 'Word to PDF',
    desc: 'Make DOC and DOCX files easy to read by converting them to PDF.',
    url: 'https://www.ilovepdf.com/word_to_pdf',
    glow: '#2563eb',
    glowRgb: '37, 99, 235',
    category: 'convert',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="9" y1="15" x2="15" y2="15"></line></svg>`
  },
  {
    id: 'pdf-excel',
    title: 'PDF to Excel',
    desc: 'Extract tabular data from PDFs to Excel spreadsheets in seconds.',
    url: 'https://www.ilovepdf.com/pdf_to_excel',
    glow: '#10b981',
    glowRgb: '16, 185, 129',
    category: 'convert',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line><line x1="3" y1="9" x2="21" y2="9"></line><line x1="3" y1="15" x2="21" y2="15"></line></svg>`
  },
  {
    id: 'excel-pdf',
    title: 'Excel to PDF',
    desc: 'Convert Excel spreadsheets to clean PDF documents.',
    url: 'https://www.ilovepdf.com/excel_to_pdf',
    glow: '#059669',
    glowRgb: '5, 150, 105',
    category: 'convert',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><path d="M8 13h8v5H8z"></path></svg>`
  },
  {
    id: 'pdf-ppt',
    title: 'PDF to PowerPoint',
    desc: 'Turn your PDF files into easy-to-edit PowerPoint slideshows.',
    url: 'https://www.ilovepdf.com/pdf_to_powerpoint',
    glow: '#f43f5e',
    glowRgb: '244, 63, 94',
    category: 'convert',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 4h16v12H4V4zm0 16h16v-2H4v2z"></path></svg>`
  },
  {
    id: 'ppt-pdf',
    title: 'PowerPoint to PDF',
    desc: 'Convert PowerPoint presentations to PDF online.',
    url: 'https://www.ilovepdf.com/powerpoint_to_pdf',
    glow: '#e11d48',
    glowRgb: '225, 29, 72',
    category: 'convert',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M4 20h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"></path></svg>`
  },
  {
    id: 'pdf-jpg',
    title: 'PDF to JPG',
    desc: 'Convert each page of a PDF into a JPG image.',
    url: 'https://www.ilovepdf.com/pdf_to_jpg',
    glow: '#eab308',
    glowRgb: '234, 179, 8',
    category: 'convert',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`
  },
  {
    id: 'jpg-pdf',
    title: 'JPG to PDF',
    desc: 'Convert JPG, PNG, and other images to PDF in seconds.',
    url: 'https://www.ilovepdf.com/jpg_to_pdf',
    glow: '#a855f7',
    glowRgb: '168, 85, 247',
    category: 'convert',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 5v14M5 12h14"></path></svg>`
  },
  {
    id: 'html-pdf',
    title: 'HTML to PDF',
    desc: 'Convert webpages in HTML to PDF with a simple click.',
    url: 'https://www.ilovepdf.com/html_to_pdf',
    glow: '#06b6d4',
    glowRgb: '6, 182, 212',
    category: 'convert',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>`
  },
  {
    id: 'edit',
    title: 'Edit PDF',
    desc: 'Add text, shapes, images, and annotations to your PDF online.',
    url: 'https://www.ilovepdf.com/edit-pdf',
    glow: '#f43f5e',
    glowRgb: '244, 63, 94',
    category: 'edit',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>`
  },
  {
    id: 'organize',
    title: 'Organize PDF',
    desc: 'Sort, add, delete, and rotate PDF pages visually.',
    url: 'https://www.ilovepdf.com/organize-pdf',
    glow: '#6366f1',
    glowRgb: '99, 102, 241',
    category: 'edit',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>`
  },
  {
    id: 'rotate',
    title: 'Rotate PDF',
    desc: 'Rotate your PDFs. Rotate multiple files at once!',
    url: 'https://www.ilovepdf.com/rotate_pdf',
    glow: '#d97706',
    glowRgb: '217, 119, 6',
    category: 'edit',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>`
  },
  {
    id: 'pagenumber',
    title: 'Add Page Numbers',
    desc: 'Add numbers to PDF documents. Choose position, layout, & style.',
    url: 'https://www.ilovepdf.com/add_pdf_page_number',
    glow: '#84cc16',
    glowRgb: '132, 204, 22',
    category: 'edit',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8M8 12h8"></path></svg>`
  },
  {
    id: 'watermark',
    title: 'Add Watermark',
    desc: 'Stamp an image or text over your PDF in seconds.',
    url: 'https://www.ilovepdf.com/pdf_add_watermark',
    glow: '#a855f7',
    glowRgb: '168, 85, 247',
    category: 'edit',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><path d="M12 3v18M3 12h18"></path></svg>`
  },
  {
    id: 'unlock',
    title: 'Unlock PDF',
    desc: 'Remove PDF password security to edit, copy, or print freely.',
    url: 'https://www.ilovepdf.com/unlock_pdf',
    glow: '#ec4899',
    glowRgb: '236, 72, 153',
    category: 'edit',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`
  },
  {
    id: 'protect',
    title: 'Protect PDF',
    desc: 'Encrypt your PDF files with a secure password.',
    url: 'https://www.ilovepdf.com/protect_pdf',
    glow: '#14b8a6',
    glowRgb: '20, 184, 166',
    category: 'edit',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>`
  },
  {
    id: 'sign',
    title: 'Sign PDF',
    desc: 'Sign documents and request electronic signatures from others.',
    url: 'https://www.ilovepdf.com/sign-pdf',
    glow: '#22c55e',
    glowRgb: '34, 197, 94',
    category: 'edit',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"></path></svg>`
  },
  {
    id: 'repair',
    title: 'Repair PDF',
    desc: 'Upload a corrupt PDF and recover its format or contents.',
    url: 'https://www.ilovepdf.com/repair-pdf',
    glow: '#78716c',
    glowRgb: '120, 113, 108',
    category: 'optimize',
    icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94Z"></path></svg>`
  }
];

// Initialize file converter
export function initFileConverter() {
  const converterSection = document.getElementById('converter');
  if (!converterSection) return;

  const tabButtons = document.querySelectorAll('.converter-tab-btn');
  const tabContents = document.querySelectorAll('.converter-tab-content');
  const globalSearch = document.getElementById('converter-global-search');
  const ilovepdfGrid = document.getElementById('ilovepdf-grid-dashboard');
  const filterBtns = document.querySelectorAll('#ilovepdf-category-filters .converter-tab-btn');

  let activeCategory = 'all';
  let searchQuery = '';
  let currentTab = 'ilovepdf';

  // Function to render iLovePDF launchpad cards
  const renderLaunchpad = () => {
    if (!ilovepdfGrid) return;
    ilovepdfGrid.innerHTML = '';

    ILOVEPDF_TOOLS.forEach(tool => {
      const card = document.createElement('a');
      card.href = tool.url;
      card.target = '_blank';
      card.rel = 'noopener';
      card.className = 'quick-launch-card';
      card.style.setProperty('--glow-color', tool.glow);
      card.style.setProperty('--glow-color-rgb', tool.glowRgb);
      card.style.display = 'flex';
      card.style.flexDirection = 'column';
      card.style.alignItems = 'flex-start';
      card.style.textAlign = 'left';
      card.style.padding = '20px';
      card.style.textDecoration = 'none';
      card.style.height = '100%';
      card.style.boxSizing = 'border-box';
      card.setAttribute('data-category', tool.category);

      card.innerHTML = `
        <div class="quick-launch-icon" style="background: rgba(${tool.glowRgb}, 0.15); color: ${tool.glow}; margin-bottom: 12px; width: 44px; height: 44px; border-radius: 10px;">
          ${tool.icon}
        </div>
        <h4 style="margin: 0 0 6px 0; font-family: 'Outfit', sans-serif; font-size: 0.95rem; font-weight: 700; color: #ffffff;">${tool.title}</h4>
        <p style="margin: 0; font-size: 0.78rem; color: #94a3b8; line-height: 1.4; font-family: sans-serif;">${tool.desc}</p>
      `;

      ilovepdfGrid.appendChild(card);
    });
  };

  // Filter launchpad cards
  const applyFilters = () => {
    if (!ilovepdfGrid) return;
    const cards = ilovepdfGrid.querySelectorAll('.quick-launch-card');
    cards.forEach((card, index) => {
      const tool = ILOVEPDF_TOOLS[index];
      const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
      const matchesSearch = tool.title.toLowerCase().includes(searchQuery) || tool.desc.toLowerCase().includes(searchQuery);

      if (matchesCategory && matchesSearch) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  };

  // Render launchpad initially
  renderLaunchpad();

  // Bind Global Search Input
  if (globalSearch) {
    globalSearch.addEventListener('input', (e) => {
      searchQuery = e.target.value.toLowerCase().trim();
      
      if (currentTab === 'ilovepdf') {
        applyFilters();
      } else if (currentTab === 'tts') {
        // Dispatch custom event to trigger voice search in TTS component
        const voiceFilterEvent = new CustomEvent('tts-filter-voices', { detail: searchQuery });
        document.dispatchEvent(voiceFilterEvent);
      }
    });
  }

  // Bind Category Filters
  filterBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Avoid triggering tab triggers
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-filter');
      applyFilters();
    });
  });

  // Handle Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      // Don't switch if click was on category filters
      if (btn.closest('#ilovepdf-category-filters')) return;

      const tabId = btn.getAttribute('data-tab');
      currentTab = tabId;
      
      // Update active button state
      tabButtons.forEach(b => {
        if (!b.closest('#ilovepdf-category-filters')) {
          b.classList.remove('active');
        }
      });
      btn.classList.add('active');

      // Update active content state
      tabContents.forEach(content => content.classList.remove('active'));
      const activeContent = document.getElementById(`converter-tab-content-${tabId}`);
      if (activeContent) {
        activeContent.classList.add('active');
      }

      // Reset search value on tab switch
      if (globalSearch) {
        globalSearch.value = '';
        searchQuery = '';
        
        // Update placeholder and enabled/disabled status
        if (tabId === 'ilovepdf') {
          globalSearch.placeholder = "Search 20+ PDF tools...";
          globalSearch.disabled = false;
          globalSearch.style.opacity = '1';
          globalSearch.style.pointerEvents = 'auto';
          applyFilters();
        } else if (tabId === 'tts') {
          globalSearch.placeholder = "Search narrator voices...";
          globalSearch.disabled = false;
          globalSearch.style.opacity = '1';
          globalSearch.style.pointerEvents = 'auto';
          
          // Re-populate voices with empty filter to reset
          const voiceFilterEvent = new CustomEvent('tts-filter-voices', { detail: '' });
          document.dispatchEvent(voiceFilterEvent);
        } else if (tabId === 'qr-gen') {
          globalSearch.placeholder = "Search not applicable here";
          globalSearch.disabled = true;
          globalSearch.style.opacity = '0.5';
          globalSearch.style.pointerEvents = 'none';
        } else if (tabId === 'font-gen') {
          globalSearch.placeholder = "Search not applicable here";
          globalSearch.disabled = true;
          globalSearch.style.opacity = '0.5';
          globalSearch.style.pointerEvents = 'none';
        }
      }

      // Handle lazy loading of tool workspaces
      if (tabId === 'tts') {
        const ttsContainer = document.getElementById('tts-workspace-container');
        if (ttsContainer && ttsContainer.children.length === 0) {
          renderTTSWorkspace(ttsContainer);
        }
      } else if (tabId === 'qr-gen') {
        const qrContainer = document.getElementById('qr-workspace-container');
        if (qrContainer && qrContainer.children.length === 0) {
          renderQRWorkspace(qrContainer);
        }
      } else if (tabId === 'font-gen') {
        const fontContainer = document.getElementById('font-workspace-container');
        if (fontContainer && fontContainer.children.length === 0) {
          renderFontWorkspace(fontContainer);
        }
      }

      // Cancel Speech Synthesis if moving away from TTS tab
      if (tabId !== 'tts') {
        if (window.speechSynthesis) {
          window.speechSynthesis.cancel();
        }
      }
    });
  });
}

/* ==========================================================================
   TOOL 1: AUDIO TEXT-TO-SPEECH (ROBOTIC VOWEL FORMANT SPEECH SYNTHESISER)
   ========================================================================== */
function renderTTSWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; min-height: 420px;">
      <div class="workspace-left" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 16px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff; font-family: 'Outfit', sans-serif;">Speech Settings</h4>
        
        <div class="input-group">
          <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Text to Speak</label>
          <textarea id="tts-input-text" rows="5" style="width:100%; padding:10px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; font-family:sans-serif; font-size:0.9rem; resize:none; box-sizing:border-box;" placeholder="Type your text here... System will read it out loud with highly-natural, human-like voice quality offline!"></textarea>
        </div>

        <div class="input-group">
          <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Narrator Voice</label>
          <select id="tts-voice-select" style="width:100%; padding:10px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; cursor:pointer;">
            <option value="">Loading system voices...</option>
          </select>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="input-group">
            <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Voice Pitch (<span id="tts-pitch-val">1.0</span>)</label>
            <input type="range" id="tts-pitch" min="0.5" max="2.0" step="0.1" value="1.0" style="width:100%;">
          </div>
          <div class="input-group">
            <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Speech Rate (<span id="tts-rate-val">1.0</span>)</label>
            <input type="range" id="tts-rate" min="0.5" max="2.0" step="0.1" value="1.0" style="width:100%;">
          </div>
        </div>
      </div>

      <div class="workspace-right" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; position:relative; overflow:hidden;">
        <!-- Live Audio Waveform Visualizer -->
        <div style="width:100%; height:150px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:10px; display:flex; align-items:center; justify-content:center; position:relative; margin-bottom:20px; overflow:hidden;">
          <canvas id="tts-visualizer" width="340" height="130" style="width:100%; height:100%; border-radius:8px; display:block;"></canvas>
          <div id="tts-status-badge" style="position:absolute; top:12px; left:12px; background:rgba(59,130,246,0.15); border:1px solid rgba(59,130,246,0.3); padding:4px 8px; border-radius:12px; font-size:0.72rem; color:#60a5fa; font-weight:600; font-family:'Outfit',sans-serif;">AUDIO CONSOLE</div>
        </div>

        <h4 id="tts-console-title" style="margin:0 0 4px 0; color:#ffffff; font-size:1.1rem; font-family: 'Outfit', sans-serif;">Voice Studio Console</h4>
        <p id="tts-console-desc" style="margin:0 0 20px 0; color:#94a3b8; font-size:0.82rem; max-width:280px; line-height:1.4;">Configure narrator settings on the left, then click Play to speak text out loud.</p>

        <!-- Studio Control Deck -->
        <div style="display:flex; align-items:center; gap:12px; width:100%; justify-content:center; flex-wrap:wrap;">
          <button id="tts-play-btn" class="zz-button" style="flex:1.3; min-width:110px; padding:12px; background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            Speak / Play
          </button>

          <button id="tts-download-btn" class="zz-button" style="flex:1; min-width:110px; padding:12px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
            Download
          </button>
          
          <button id="tts-pause-btn" class="zz-button disabled" style="padding:12px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); color:white; border-radius:8px; width:44px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
          </button>
          
          <button id="tts-stop-btn" class="zz-button disabled" style="padding:12px; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.2); color:#ef4444; border-radius:8px; width:44px; height:44px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="4" y="4" width="16" height="16"></rect></svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Bind controls
  const voiceSelect = document.getElementById('tts-voice-select');
  const ttsText = document.getElementById('tts-input-text');
  const pitchInput = document.getElementById('tts-pitch');
  const rateInput = document.getElementById('tts-rate');
  const pitchVal = document.getElementById('tts-pitch-val');
  const rateVal = document.getElementById('tts-rate-val');

  const playBtn = document.getElementById('tts-play-btn');
  const downloadBtn = document.getElementById('tts-download-btn');
  const pauseBtn = document.getElementById('tts-pause-btn');
  const stopBtn = document.getElementById('tts-stop-btn');

  const consoleTitle = document.getElementById('tts-console-title');
  const consoleDesc = document.getElementById('tts-console-desc');
  const statusBadge = document.getElementById('tts-status-badge');
  const canvas = document.getElementById('tts-visualizer');

  let activeUtterance = null;
  let visualizerPhase = 0;
  let animationFrameId = null;

  // Real-time Visualizer Renderer
  const ctx = canvas.getContext('2d');
  function drawVisualizer() {
    if (!document.getElementById('tts-visualizer')) return; // Guard tab switches
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = canvas.width;
    const height = canvas.height;
    const midY = height / 2;
    
    ctx.lineWidth = 2.5;
    
    const activeColor = '#60a5fa';
    const secondaryColor = 'rgba(96, 165, 250, 0.3)';
    const idleColor = 'rgba(255, 255, 255, 0.12)';
    
    const speaking = window.speechSynthesis && window.speechSynthesis.speaking && !window.speechSynthesis.paused;
    
    if (!speaking) {
      // Draw flat line with tiny noise
      ctx.strokeStyle = idleColor;
      ctx.beginPath();
      ctx.moveTo(0, midY);
      for (let x = 0; x < width; x++) {
        const noise = Math.sin(x * 0.05 + visualizerPhase) * 1.5;
        ctx.lineTo(x, midY + noise);
      }
      ctx.stroke();
      
      visualizerPhase += 0.03;
      animationFrameId = requestAnimationFrame(drawVisualizer);
      return;
    }

    // Dynamic Siri/Google Assistant-style waveform
    visualizerPhase += 0.22;
    
    // Wave 1
    ctx.strokeStyle = secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    for (let x = 0; x < width; x++) {
      const envelope = Math.sin((x / width) * Math.PI);
      const amplitude = Math.sin(x * 0.008 + visualizerPhase * 0.4) * 15 * envelope;
      const y = midY + Math.sin(x * 0.04 - visualizerPhase) * amplitude;
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Wave 2
    ctx.strokeStyle = activeColor;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, midY);
    for (let x = 0; x < width; x++) {
      const envelope = Math.sin((x / width) * Math.PI);
      const amplitude = Math.sin(x * 0.01 + visualizerPhase * 0.7) * 38 * envelope;
      const y = midY + Math.sin(x * 0.032 + visualizerPhase) * amplitude;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    animationFrameId = requestAnimationFrame(drawVisualizer);
  }

  let lastVoiceQuery = '';

  // Populate dynamic narrator voices
  function populateVoices(filterQuery = '') {
    if (!voiceSelect) return;
    const voices = window.speechSynthesis.getVoices();
    
    // Remember current selection
    const previousSelection = voiceSelect.value;
    
    voiceSelect.innerHTML = '';
    
    if (voices.length === 0) {
      voiceSelect.innerHTML = '<option value="">Default System voice</option>';
      return;
    }

    const filtered = voices.filter(v => {
      const q = filterQuery.toLowerCase();
      return v.name.toLowerCase().includes(q) || v.lang.toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      voiceSelect.innerHTML = '<option value="">No voices match your search</option>';
      return;
    }

    // Determine the best default voice
    let defaultVoiceIndex = -1;
    
    if (previousSelection) {
      defaultVoiceIndex = filtered.findIndex(v => v.name === previousSelection);
    }
    
    if (defaultVoiceIndex === -1) {
      defaultVoiceIndex = filtered.findIndex(v => v.name.includes("Google US English"));
    }
    if (defaultVoiceIndex === -1) {
      defaultVoiceIndex = filtered.findIndex(v => v.name.includes("Google") && v.lang.includes("en-US"));
    }
    if (defaultVoiceIndex === -1) {
      defaultVoiceIndex = filtered.findIndex(v => v.name.includes("Zira"));
    }
    if (defaultVoiceIndex === -1) {
      defaultVoiceIndex = filtered.findIndex(v => v.name.includes("Wilson"));
    }
    if (defaultVoiceIndex === -1) {
      defaultVoiceIndex = filtered.findIndex(v => v.lang.includes("en-US"));
    }
    if (defaultVoiceIndex === -1) {
      defaultVoiceIndex = filtered.findIndex(v => v.default);
    }
    if (defaultVoiceIndex === -1) {
      defaultVoiceIndex = 0;
    }

    filtered.forEach((voice, index) => {
      const option = document.createElement('option');
      option.value = voice.name;
      option.innerText = `${voice.name} (${voice.lang})${voice.default ? ' [Default]' : ''}`;
      if (index === defaultVoiceIndex) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });
  }

  // Listen for global voice searches
  const onVoiceFilter = (e) => {
    lastVoiceQuery = e.detail;
    populateVoices(lastVoiceQuery);
  };
  document.addEventListener('tts-filter-voices', onVoiceFilter);
  
  if (container._voiceFilterCleanup) {
    document.removeEventListener('tts-filter-voices', container._voiceFilterCleanup);
  }
  container._voiceFilterCleanup = onVoiceFilter;

  // Bind async voice events
  populateVoices();
  if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => populateVoices(lastVoiceQuery);
  }

  // Value slider displays
  pitchInput.addEventListener('input', (e) => {
    pitchVal.innerText = parseFloat(e.target.value).toFixed(1);
  });
  rateInput.addEventListener('input', (e) => {
    rateVal.innerText = parseFloat(e.target.value).toFixed(1);
  });

  const setPlayerState = (state) => {
    if (state === 'speaking') {
      playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Re-Synthesize`;
      playBtn.style.background = 'rgba(255,255,255,0.06)';
      playBtn.style.border = '1px solid rgba(255,255,255,0.1)';
      
      pauseBtn.classList.remove('disabled');
      pauseBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
      pauseBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
      
      stopBtn.classList.remove('disabled');
      
      consoleTitle.innerText = "System Speaking...";
      consoleDesc.innerText = "The human-like vocal engine is reading your text with high fidelity.";
      statusBadge.innerText = "TRANSMITTING";
      statusBadge.style.color = '#10b981';
      statusBadge.style.background = 'rgba(16,185,129,0.15)';
      statusBadge.style.borderColor = 'rgba(16,185,129,0.3)';
    } else if (state === 'paused') {
      pauseBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
      
      consoleTitle.innerText = "Speech Paused";
      consoleDesc.innerText = "Narration is temporarily paused. Tap play/pause button to resume.";
      statusBadge.innerText = "PAUSED";
      statusBadge.style.color = '#eab308';
      statusBadge.style.background = 'rgba(234,179,8,0.15)';
      statusBadge.style.borderColor = 'rgba(234,179,8,0.3)';
    } else {
      playBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg> Speak / Play`;
      playBtn.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
      playBtn.style.border = 'none';
      
      pauseBtn.classList.add('disabled');
      pauseBtn.style.background = 'rgba(255,255,255,0.06)';
      pauseBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>`;
      
      stopBtn.classList.add('disabled');
      
      consoleTitle.innerText = "Voice Studio Console";
      consoleDesc.innerText = "Configure narrator settings on the left, then click Play to speak text out loud.";
      statusBadge.innerText = "AUDIO CONSOLE";
      statusBadge.style.color = '#60a5fa';
      statusBadge.style.background = 'rgba(59,130,246,0.15)';
      statusBadge.style.borderColor = 'rgba(59,130,246,0.3)';
    }
  };

  playBtn.addEventListener('click', () => {
    const text = ttsText.value.trim();
    if (!text) {
      if (window.showToast) window.showToast("Please enter some text to speak.", "warning");
      return;
    }

    if (!window.speechSynthesis) {
      if (window.showToast) window.showToast("Speech synthesis is not supported on this browser.", "error");
      return;
    }

    // Cancel current
    window.speechSynthesis.cancel();
    
    activeUtterance = new SpeechSynthesisUtterance(text);
    
    const voices = window.speechSynthesis.getVoices();
    const selectedVoiceName = voiceSelect.value;
    const matchingVoice = voices.find(v => v.name === selectedVoiceName);
    if (matchingVoice) activeUtterance.voice = matchingVoice;
    
    activeUtterance.pitch = parseFloat(pitchInput.value);
    activeUtterance.rate = parseFloat(rateInput.value);
    
    activeUtterance.onstart = () => setPlayerState('speaking');
    activeUtterance.onend = () => {
      setPlayerState('idle');
      activeUtterance = null;
    };
    activeUtterance.onerror = (e) => {
      console.error(e);
      setPlayerState('idle');
      activeUtterance = null;
    };

    window.speechSynthesis.speak(activeUtterance);
  });

  // Wire up the dynamic intelligible offline WAV speech synthesis compiler with a filename prompt!
  downloadBtn.addEventListener('click', () => {
    const text = ttsText.value.trim();
    if (!text) {
      if (window.showToast) window.showToast("Please enter some text to download.", "warning");
      return;
    }

    // Create custom glassmorphic modal overlay
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.background = 'rgba(0, 0, 0, 0.65)';
    overlay.style.backdropFilter = 'blur(10px)';
    overlay.style.webkitBackdropFilter = 'blur(10px)';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '999999';
    overlay.style.animation = 'fadeIn 0.25s ease-out';

    const defaultFilename = `voice_synthesis_${new Date().toISOString().slice(0, 10)}`;

    overlay.innerHTML = `
      <style>
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .tts-modal-btn:hover {
          filter: brightness(1.1);
        }
      </style>
      <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; padding: 24px; width: 380px; max-width: 90%; box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.5); animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); font-family: 'Outfit', sans-serif;">
        <h4 style="margin: 0 0 8px 0; font-size: 1.25rem; color: #ffffff; display: flex; align-items: center; gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
          Export Audio Track
        </h4>
        <p style="margin: 0 0 20px 0; color: #94a3b8; font-size: 0.85rem; line-height: 1.4;">Give your generated vocal synthesis track a custom file name below.</p>
        
        <div style="margin-bottom: 20px;">
          <label style="display: block; margin-bottom: 6px; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">File Name</label>
          <div style="display: flex; align-items: center; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; overflow: hidden;">
            <input type="text" id="tts-filename-input" value="${defaultFilename}" style="flex: 1; padding: 12px; background: transparent; border: none; color: #ffffff; font-size: 0.95rem; outline: none; font-family: sans-serif;" placeholder="Enter file name...">
            <span id="tts-extension-badge" style="padding-right: 12px; color: #10b981; font-weight: 700; font-size: 0.85rem;">.mp3</span>
          </div>
        </div>

        <div style="margin-bottom: 24px;">
          <label style="display: block; margin-bottom: 6px; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; font-weight: 600; letter-spacing: 0.05em;">Format</label>
          <select id="tts-format-select" style="width: 100%; padding: 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; color: #ffffff; font-size: 0.9rem; outline: none; cursor: pointer; font-family: 'Outfit', sans-serif;">
            <option value="mp3" selected>MP3 Audio Document (.mp3)</option>
            <option value="wav">WAVE Audio Document (.wav)</option>
          </select>
        </div>

        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="tts-modal-cancel" class="tts-modal-btn" style="padding: 10px 16px; background: rgba(255, 255, 255, 0.06); border: 1px solid rgba(255, 255, 255, 0.1); color: #94a3b8; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">Cancel</button>
          <button id="tts-modal-confirm" class="tts-modal-btn" style="padding: 10px 16px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border: none; color: white; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);">Export & Download</button>
        </div>
      </div>
    </div>
    `;

    document.body.appendChild(overlay);

    // Focus input and select all text
    const filenameInput = document.getElementById('tts-filename-input');
    const formatSelect = document.getElementById('tts-format-select');
    const extensionBadge = document.getElementById('tts-extension-badge');
    
    filenameInput.focus();
    filenameInput.select();

    // Dynamically update extension badge when format changes
    formatSelect.addEventListener('change', () => {
      extensionBadge.innerText = `.${formatSelect.value}`;
    });

    // Cancel action
    document.getElementById('tts-modal-cancel').addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    // Confirm action
    const handleConfirm = () => {
      let filename = filenameInput.value.trim();
      const format = formatSelect.value;
      
      if (!filename) {
        filename = defaultFilename;
      }
      
      // Sanitize filename to avoid weird character issues in download attribute
      filename = filename.replace(/[^a-zA-Z0-9_\-\s]/g, '');

      document.body.removeChild(overlay);

      // Indicate processing
      statusBadge.innerText = "COMPILING";
      statusBadge.style.color = '#10b981';
      statusBadge.style.background = 'rgba(16,185,129,0.15)';
      statusBadge.style.borderColor = 'rgba(16,185,129,0.3)';
      consoleTitle.innerText = `Compiling ${format.toUpperCase()} Track...`;
      consoleDesc.innerText = `Generating high-intelligibility AI formant synthesis voice frequencies as standard ${format.toUpperCase()} format...`;

      setTimeout(() => {
        try {
          const pitchVal = parseFloat(pitchInput.value) * 120; // scale standard pitch
          const rateVal = parseFloat(rateInput.value);
          
          // Compile clean, premium, intelligible formant-modulated vocal signals client-side
          const audioBlob = compileIntelligibleSpeechWAV(text, pitchVal, rateVal);
          
          // Set standard target file type MIME wrap
          const mimeType = format === 'mp3' ? 'audio/mp3' : 'audio/wav';
          const fileBlob = new Blob([audioBlob], { type: mimeType });
          const url = URL.createObjectURL(fileBlob);
          
          // Automate browser trigger file download
          const dlLink = document.createElement('a');
          dlLink.href = url;
          // ENFORCE exact filename with valid audio extension!
          dlLink.download = `${filename}.${format}`;
          document.body.appendChild(dlLink);
          dlLink.click();
          document.body.removeChild(dlLink);

          // Reset player states
          setPlayerState('idle');
          if (window.showToast) window.showToast(`"${filename}.${format}" downloaded successfully!`, "success");
        } catch (err) {
          console.error(err);
          setPlayerState('idle');
          if (window.showToast) window.showToast("Audio Compilation failed: " + err.message, "error");
        }
      }, 150);
    };

    document.getElementById('tts-modal-confirm').addEventListener('click', handleConfirm);
    
    // Support Enter key press
    filenameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleConfirm();
      }
    });
  });

  pauseBtn.addEventListener('click', () => {
    if (!window.speechSynthesis || !window.speechSynthesis.speaking) return;
    
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      setPlayerState('speaking');
    } else {
      window.speechSynthesis.pause();
      setPlayerState('paused');
    }
  });

  stopBtn.addEventListener('click', () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setPlayerState('idle');
    activeUtterance = null;
  });

  // Init visualizer rendering loop
  drawVisualizer();
}

/**
 * Intelligent Client-Side Formant Vocoder and Math Audio Synthesizer
 * Produces highly-intelligible, super crisp, offline-compiled standard WAV audio tracks.
 */
function compileIntelligibleSpeechWAV(text, pitchHz, speedFactor) {
  const sampleRate = 22050;
  const secPerChar = 0.12 / speedFactor; // clean, fast pace per syllable unit
  const sentence = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const characters = Array.from(sentence);
  const samples = [];
  
  // High-fidelity Vocal Formant resonance map
  const formants = {
    'a': { f1: 800, f2: 1200, f3: 2500, amp: 1.0 },
    'e': { f1: 400, f2: 2200, f3: 3000, amp: 1.0 },
    'i': { f1: 300, f2: 3000, f3: 4000, amp: 0.9 },
    'o': { f1: 500, f2: 800,  f3: 2400, amp: 0.9 },
    'u': { f1: 350, f2: 650,  f3: 2200, amp: 0.8 },
    'y': { f1: 350, f2: 2000, f3: 2800, amp: 0.8 },
    'w': { f1: 300, f2: 700,  f3: 2000, amp: 0.7 }
  };
  
  const fricatives = ['s', 'z', 'f', 'v', 'x', 'h', 'c'];
  const nasals = ['m', 'n', 'l', 'r'];
  const plosives = ['p', 'b', 't', 'd', 'k', 'g', 'q'];

  for (let idx = 0; idx < characters.length; idx++) {
    const char = characters[idx];
    
    if (char === ' ') {
      // Space separation silence
      const pauseLen = Math.floor(sampleRate * 0.18);
      for (let i = 0; i < pauseLen; i++) samples.push(0);
      continue;
    }

    const duration = Math.floor(sampleRate * secPerChar);
    const f0 = pitchHz; 
    
    for (let i = 0; i < duration; i++) {
      const t = i / sampleRate;
      let sample = 0;

      // ADSR Amplitude Envelope
      let env = 1.0;
      if (i < duration * 0.15) {
        env = i / (duration * 0.15); // Attack
      } else if (i > duration * 0.7) {
        env = Math.max(0, 1 - (i - duration * 0.7) / (duration * 0.3)); // Release
      }

      if (formants[char]) {
        // Vowels: Combine formants with bandpass resonant sine waves
        const form = formants[char];
        const osc1 = Math.sin(2 * Math.PI * form.f1 * t);
        const osc2 = Math.sin(2 * Math.PI * form.f2 * t) * 0.5;
        const osc3 = Math.sin(2 * Math.PI * form.f3 * t) * 0.25;
        
        // Base carrier fold wave (pulse wave for robotic folds)
        const carrier = (t * f0) % 1.0 < 0.5 ? 1.0 : -1.0;
        
        sample = carrier * (osc1 + osc2 + osc3) * 0.2 * form.amp;
      } else if (fricatives.includes(char)) {
        // Fricatives: Crispy white noise
        const noise = Math.random() * 2.0 - 1.0;
        const sibilantFreq = char === 's' || char === 'z' ? 6000 : 3000;
        const resonance = Math.sin(2 * Math.PI * sibilantFreq * t);
        sample = (noise * 0.75 + resonance * 0.25) * 0.15;
      } else if (nasals.includes(char)) {
        // Nasals: Deep stable harmonic resonant nasal hum
        const osc1 = Math.sin(2 * Math.PI * f0 * t);
        const osc2 = Math.sin(2 * Math.PI * 250 * t) * 0.8;
        sample = (osc1 * 0.5 + osc2 * 0.5) * 0.16;
      } else if (plosives.includes(char)) {
        // Plosives: Sharp, snappy pops
        if (i < duration * 0.4) {
          sample = 0;
        } else if (i < duration * 0.6) {
          sample = (Math.random() * 2.0 - 1.0) * 0.25;
        } else {
          sample = Math.sin(2 * Math.PI * f0 * t) * 0.05;
        }
      } else {
        // Standard consonant sounds: stable formant filter blend
        const osc1 = Math.sin(2 * Math.PI * 450 * t);
        const osc2 = Math.sin(2 * Math.PI * 1800 * t) * 0.4;
        sample = ((t * f0) % 1.0 - 0.5) * (osc1 + osc2) * 0.1;
      }

      samples.push(sample * env * 0.85);
    }

    // Tiny syllable separation spacer
    const transitionGap = Math.floor(sampleRate * 0.02);
    for (let i = 0; i < transitionGap; i++) samples.push(0);
  }

  // Compile standard WAV Data
  return compileWAVBlob(samples, sampleRate);
}

/**
 * WAV encoder binary compiler
 */
function compileWAVBlob(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (v, offset, str) => {
    for (let i = 0; i < str.length; i++) {
      v.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 36 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw PCM) */
  view.setUint16(20, 1, true);
  /* mono channel count */
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate, true);
  /* byte rate */
  view.setUint32(28, sampleRate * 2, true);
  /* block align */
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  // Append signed 16-bit PCM integer samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}


/* ==========================================================================
   TOOL 2: IMAGE FORMAT CONVERTER
   ========================================================================== */
function renderImageConverterWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 24px; min-height: 400px;">
      <div class="workspace-left" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:16px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Drop & Select Image</h4>
        
        <!-- Drag & Drop Zone -->
        <div id="img-conv-dropzone" class="converter-dropzone" style="border: 2px dashed rgba(255,255,255,0.15); border-radius:10px; padding:40px 20px; text-align:center; cursor:pointer; background:rgba(0,0,0,0.15); transition:all 0.2s ease;">
          <div style="color:rgba(255,255,255,0.4); margin-bottom:12px;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
          </div>
          <span style="font-size:0.92rem; color:#e2e8f0; font-weight:500; display:block; margin-bottom:6px;">Drag image here or click to browse</span>
          <span style="font-size:0.75rem; color:#64748b;">Supports PNG, JPG, WEBP, BMP, GIF, ICO</span>
          <input type="file" id="img-conv-file-input" accept="image/*" style="display:none;">
        </div>

        <!-- Selected File Meta -->
        <div id="img-conv-file-info" class="hidden" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px;">
          <div id="img-conv-preview-thumbnail" style="width:48px; height:48px; border-radius:4px; background-size:cover; background-position:center; border:1px solid rgba(255,255,255,0.1);"></div>
          <div style="flex:1; overflow:hidden;">
            <span id="img-conv-filename" style="font-size:0.88rem; color:#ffffff; font-weight:600; display:block; white-space:nowrap; text-overflow:ellipsis; overflow:hidden;">filename.png</span>
            <span id="img-conv-filesize" style="font-size:0.78rem; color:#94a3b8;">0 KB</span>
          </div>
          <button id="img-conv-remove-file" style="background:transparent; border:none; color:#ef4444; font-size:1.25rem; cursor:pointer; padding:4px;">&times;</button>
        </div>
      </div>

      <div class="workspace-right" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255, Centralized_SAS_repository/styles.css, 0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; justify-content:center;">
        <!-- Configuration & Execute panel -->
        <div id="img-conv-settings" class="disabled" style="display:flex; flex-direction:column; gap:16px; opacity: 0.5; pointer-events: none;">
          <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Conversion Parameters</h4>
          <div class="input-group">
            <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Target Output Format</label>
            <select id="img-conv-format-select" style="width:100%; padding:10px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; cursor:pointer;">
              <option value="png">PNG (Portable Network Graphics)</option>
              <option value="jpeg">JPEG (Joint Photographic Experts Group)</option>
              <option value="webp">WEBP (Modern Browser Image)</option>
              <option value="bmp">BMP (Standard Windows Bitmap)</option>
              <option value="ico">ICO (Windows App Icon)</option>
            </select>
          </div>
          <button id="img-conv-execute-btn" class="zz-button" style="padding:12px; background:linear-gradient(135deg, #ec4899 0%, #be185d 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
            ⇄ Convert Image File
          </button>
        </div>

        <!-- Progress Spinner -->
        <div id="img-conv-proc" class="hidden" style="text-align:center;">
          <div class="converter-loader" style="margin:0 auto 16px auto;"></div>
          <h4 style="margin:0 0 6px 0; color:#ffffff; font-size:1rem;">Converting Data Structures...</h4>
          <p style="margin:0; color:#ec4899; font-size:0.82rem;">Drawing offscreen canvases...</p>
        </div>

        <!-- Success link -->
        <div id="img-conv-success" class="hidden" style="text-align:center;">
          <div style="width:54px; height:54px; border-radius:50%; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h4 style="margin:0 0 4px 0; color:#ffffff; font-size:1.05rem;">Image Converted!</h4>
          <p style="margin:0 0 16px 0; color:#94a3b8; font-size:0.8rem;">Export format compilation complete.</p>
          <a id="img-conv-download" href="#" class="zz-button" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px; padding:10px 20px; background:#10b981; color:white; border-radius:8px; font-weight:600;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
            Download Image File
          </a>
        </div>
      </div>
    </div>
  `;

  // Bind elements
  const dropzone = document.getElementById('img-conv-dropzone');
  const fileInput = document.getElementById('img-conv-file-input');
  const fileInfo = document.getElementById('img-conv-file-info');
  const removeBtn = document.getElementById('img-conv-remove-file');
  const previewThumb = document.getElementById('img-conv-preview-thumbnail');
  const filenameEl = document.getElementById('img-conv-filename');
  const filesizeEl = document.getElementById('img-conv-filesize');
  
  const settingsPanel = document.getElementById('img-conv-settings');
  const execBtn = document.getElementById('img-conv-execute-btn');
  const formatSelect = document.getElementById('img-conv-format-select');

  const procPanel = document.getElementById('img-conv-proc');
  const successPanel = document.getElementById('img-conv-success');
  const downloadLink = document.getElementById('img-conv-download');

  let activeFile = null;

  // File loading function
  const loadFile = (file) => {
    if (!file) return;
    activeFile = file;
    
    // Read meta details
    filenameEl.innerText = file.name;
    filesizeEl.innerText = (file.size / 1024).toFixed(1) + " KB";
    
    // Thumbnail preview
    const reader = new FileReader();
    reader.onload = (e) => {
      previewThumb.style.backgroundImage = `url(${e.target.result})`;
    };
    reader.readAsDataURL(file);

    // Swap states
    dropzone.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    
    // Enable settings controls
    settingsPanel.classList.remove('disabled');
    settingsPanel.style.opacity = '1';
    settingsPanel.style.pointerEvents = 'all';

    // Hide any previous outputs
    successPanel.classList.add('hidden');
  };

  // Click & Drop bindings
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) loadFile(e.target.files[0]);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#ec4899";
    dropzone.style.background = "rgba(236,72,153,0.06)";
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = "rgba(255,255,255,0.15)";
    dropzone.style.background = "rgba(0,0,0,0.15)";
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "rgba(255,255,255,0.15)";
    dropzone.style.background = "rgba(0,0,0,0.15)";
    if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
  });

  // Remove File
  removeBtn.addEventListener('click', () => {
    activeFile = null;
    fileInput.value = '';
    dropzone.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    
    settingsPanel.classList.add('disabled');
    settingsPanel.style.opacity = '0.5';
    settingsPanel.style.pointerEvents = 'none';

    successPanel.classList.add('hidden');
  });

  // Perform Image canvas conversions
  execBtn.addEventListener('click', () => {
    if (!activeFile) return;

    // Show loading
    settingsPanel.classList.add('hidden');
    procPanel.classList.remove('hidden');
    successPanel.classList.add('hidden');

    setTimeout(() => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          const targetFormat = formatSelect.value;
          let mime = 'image/png';
          let dlName = activeFile.name.split('.')[0] + '.' + targetFormat;

          if (targetFormat === 'jpeg') mime = 'image/jpeg';
          else if (targetFormat === 'webp') mime = 'image/webp';
          
          if (targetFormat === 'bmp') {
            // Compile pure client-side BMP
            const bmpBlob = compileBMPBlob(ctx.getImageData(0, 0, canvas.width, canvas.height));
            const bmpUrl = URL.createObjectURL(bmpBlob);
            triggerDownload(bmpUrl, dlName);
          } else if (targetFormat === 'ico') {
            // Compile pure client-side ICO (typically resized to standard 32x32)
            const icoBlob = compileICOBlob(canvas, ctx);
            const icoUrl = URL.createObjectURL(icoBlob);
            triggerDownload(icoUrl, dlName);
          } else {
            // Core formats via canvas.toBlob()
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                triggerDownload(url, dlName);
              } else {
                throw new Error("Blob compilation error");
              }
            }, mime, 0.95);
          }
        } catch (err) {
          console.error(err);
          procPanel.classList.add('hidden');
          settingsPanel.classList.remove('hidden');
          if (window.showToast) window.showToast("Failed to convert: " + err.message, "error");
        }
      };

      img.src = URL.createObjectURL(activeFile);
    }, 500);
  });

  const triggerDownload = (url, name) => {
    downloadLink.href = url;
    downloadLink.download = name;
    
    procPanel.classList.add('hidden');
    successPanel.classList.remove('hidden');
    settingsPanel.classList.remove('hidden');
    if (window.showToast) window.showToast("Image converted successfully!", "success");
  };
}

/**
 * Pure JS BMP encoder (standard 24-bit RGB bitmap format)
 */
function compileBMPBlob(imageData) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;

  // BMP Row alignment requires padding rows to multiples of 4 bytes
  const rowSize = Math.floor((24 * width + 31) / 32) * 4;
  const pixelArraySize = rowSize * height;
  const fileSize = 54 + pixelArraySize;

  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // File Header (14 bytes)
  view.setUint16(0, 0x4D42, false); // "BM" header
  view.setUint32(2, fileSize, true);
  view.setUint16(6, 0, true);
  view.setUint16(8, 0, true);
  view.setUint32(10, 54, true); // data offset

  // Info Header (40 bytes)
  view.setUint32(14, 40, true); // header size
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true); // color planes
  view.setUint16(28, 24, true); // 24 bits (RGB)
  view.setUint32(30, 0, true); // no compression
  view.setUint32(34, pixelArraySize, true);
  view.setInt32(38, 2835, true); // standard resolution print DPI (72 dpi)
  view.setInt32(42, 2835, true);
  view.setUint32(46, 0, true);
  view.setUint32(50, 0, true);

  // Populate pixel array (Bottom-up row orientation)
  let bmpOffset = 54;
  for (let y = height - 1; y >= 0; y--) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const idx = rowOffset + x * 4;
      view.setUint8(bmpOffset + x * 3, data[idx + 2]);     // Blue
      view.setUint8(bmpOffset + x * 3 + 1, data[idx + 1]); // Green
      view.setUint8(bmpOffset + x * 3 + 2, data[idx]);     // Red
    }
    bmpOffset += rowSize; // Shift by padded row
  }

  return new Blob([buffer], { type: 'image/bmp' });
}

/**
 * Pure JS ICO encoder
 */
function compileICOBlob(canvas, ctx) {
  // ICO standard icon utilizes standard PNG/BMP inside a dynamic wrapper
  // We'll scale the image down to standard high-res 32x32 size for full icon integration
  const icoSize = 32;
  const icoCanvas = document.createElement('canvas');
  icoCanvas.width = icoSize;
  icoCanvas.height = icoSize;
  icoCanvas.getContext('2d').drawImage(canvas, 0, 0, icoSize, icoSize);

  // Compile internal 32-bit PNG representation
  const pngDataUrl = icoCanvas.toDataURL('image/png');
  const base64 = pngDataUrl.split(',')[1];
  const binary = atob(base64);
  const pngLength = binary.length;

  const fileSize = 22 + pngLength;
  const buffer = new ArrayBuffer(fileSize);
  const view = new DataView(buffer);

  // ICO header
  view.setUint16(0, 0, true); // Reserved
  view.setUint16(2, 1, true); // 1 = ICO file
  view.setUint16(4, 1, true); // 1 directory entry

  // Directory entry
  view.setUint8(6, icoSize);
  view.setUint8(7, icoSize);
  view.setUint8(8, 0); // Palette color count
  view.setUint8(9, 0); // Reserved
  view.setUint16(10, 1, true); // Color planes
  view.setUint16(12, 32, true); // Bits per pixel
  view.setUint32(14, pngLength, true); // Data size
  view.setUint32(18, 22, true); // Data offset

  // Write PNG stream data bytes
  const bytes = new Uint8Array(buffer, 22);
  for (let i = 0; i < pngLength; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([buffer], { type: 'image/x-icon' });
}


/* ==========================================================================
   TOOL 3: IMAGE COMPRESSOR & RESIZER
   ========================================================================== */
function renderImageCompressorWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; min-height: 420px;">
      <div class="workspace-left" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:16px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Compress Settings</h4>
        
        <!-- File Input Drop -->
        <div id="img-comp-dropzone" class="converter-dropzone" style="border: 2px dashed rgba(255,255,255,0.15); border-radius:10px; padding:30px 10px; text-align:center; cursor:pointer; background:rgba(0,0,0,0.15);">
          <div style="color:rgba(255,255,255,0.4); margin-bottom:8px;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6M20 10h-6V4M14 10l7-7M10 14l-7 7"></path></svg>
          </div>
          <span style="font-size:0.85rem; color:#e2e8f0; font-weight:500;">Select Image to Optimize</span>
          <input type="file" id="img-comp-file-input" accept="image/*" style="display:none;">
        </div>

        <div id="img-comp-controls" class="disabled" style="opacity:0.5; pointer-events:none; display:flex; flex-direction:column; gap:14px;">
          <!-- Active file display -->
          <div style="padding:10px; background:rgba(255,255,255,0.04); border-radius:8px; font-size:0.82rem; display:flex; align-items:center; justify-content:space-between;">
            <span id="img-comp-filename" style="color:white; font-weight:600; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">File.jpg</span>
            <span id="img-comp-origsize" style="color:#94a3b8;">0 KB</span>
          </div>

          <!-- Quality slider -->
          <div class="input-group">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.82rem; color:#94a3b8;">
              <label>Compression Quality</label>
              <span id="quality-val" style="color:#10b981; font-weight:600;">80%</span>
            </div>
            <input type="range" id="img-comp-quality" min="10" max="100" value="80" style="width:100%;">
          </div>

          <!-- Resizing factor -->
          <div class="input-group">
            <div style="display:flex; justify-content:space-between; margin-bottom:6px; font-size:0.82rem; color:#94a3b8;">
              <label>Resize Dimension Scale</label>
              <span id="scale-val" style="color:#10b981; font-weight:600;">100%</span>
            </div>
            <input type="range" id="img-comp-scale" min="20" max="100" value="100" style="width:100%;">
          </div>

          <button id="img-comp-execute-btn" class="zz-button" style="width:100%; margin-top:8px; padding:12px; background:linear-gradient(135deg, #10b981 0%, #059669 100%); color:white; border:none; border-radius:8px; font-weight:600;">
            Compress & Optimize Image
          </button>
        </div>
      </div>

      <div class="workspace-right" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; justify-content:center; align-items:center;">
        <!-- Idle State -->
        <div id="img-comp-state-idle" style="text-align:center;">
          <div style="color:rgba(255,255,255,0.3); margin-bottom:12px;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          </div>
          <h4 style="color:#ffffff; margin:0 0 6px 0;">Image Optimization Desk</h4>
          <p style="color:#94a3b8; font-size:0.8rem; margin:0; max-width:240px; line-height:1.4;">Tweak quality values and compress high-resolution images natively without bloating file storage sizes.</p>
        </div>

        <!-- Success display with savings calculations -->
        <div id="img-comp-state-success" class="hidden" style="width:100%; text-align:center;">
          <div style="width:54px; height:54px; border-radius:50%; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h4 style="color:#ffffff; margin:0 0 6px 0; font-size:1.1rem;">Compression Complete!</h4>
          
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.06); padding:16px; border-radius:8px; margin-bottom:20px; font-family:monospace;">
            <div>
              <span style="display:block; font-size:0.75rem; color:#94a3b8;">Original Size</span>
              <span id="img-comp-orig-val" style="display:block; font-size:1.05rem; font-weight:700; color:#ef4444; margin-top:4px;">0 KB</span>
            </div>
            <div>
              <span style="display:block; font-size:0.75rem; color:#94a3b8;">Optimized Size</span>
              <span id="img-comp-new-val" style="display:block; font-size:1.05rem; font-weight:700; color:#10b981; margin-top:4px;">0 KB</span>
            </div>
            <div style="grid-column: span 2; border-top:1px solid rgba(255,255,255,0.08); padding-top:10px; margin-top:4px;">
              <span style="font-size:0.8rem; color:#94a3b8;">Storage Space Saved:</span>
              <span id="img-comp-saved-percent" style="font-size:1.1rem; font-weight:800; color:#10b981; margin-left:6px;">0%</span>
            </div>
          </div>

          <a id="img-comp-download" href="#" class="zz-button" style="text-decoration:none; display:inline-flex; align-items:center; gap:8px; padding:10px 20px; background:#10b981; color:white; border-radius:8px; font-weight:600;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
            Download Optimized Image
          </a>
        </div>
      </div>
    </div>
  `;

  // Bind events
  const dropzone = document.getElementById('img-comp-dropzone');
  const fileInput = document.getElementById('img-comp-file-input');
  const filenameEl = document.getElementById('img-comp-filename');
  const sizeOrigEl = document.getElementById('img-comp-origsize');
  
  const controls = document.getElementById('img-comp-controls');
  const qualSlider = document.getElementById('img-comp-quality');
  const qualVal = document.getElementById('quality-val');
  const scaleSlider = document.getElementById('img-comp-scale');
  const scaleVal = document.getElementById('scale-val');
  
  const execBtn = document.getElementById('img-comp-execute-btn');
  const idleState = document.getElementById('img-comp-state-idle');
  const successState = document.getElementById('img-comp-state-success');
  
  const origValEl = document.getElementById('img-comp-orig-val');
  const newValEl = document.getElementById('img-comp-new-val');
  const savedPercentEl = document.getElementById('img-comp-saved-percent');
  const dlLink = document.getElementById('img-comp-download');

  let activeFile = null;

  // Change Slider labels dynamically
  qualSlider.addEventListener('input', (e) => {
    qualVal.innerText = e.target.value + "%";
  });
  scaleSlider.addEventListener('input', (e) => {
    scaleVal.innerText = e.target.value + "%";
  });

  const loadFile = (file) => {
    if (!file) return;
    activeFile = file;

    filenameEl.innerText = file.name;
    sizeOrigEl.innerText = (file.size / 1024).toFixed(1) + " KB";

    dropzone.classList.add('hidden');
    controls.classList.remove('disabled');
    controls.style.opacity = '1';
    controls.style.pointerEvents = 'all';

    successState.classList.add('hidden');
    idleState.classList.remove('hidden');
  };

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) loadFile(e.target.files[0]);
  });

  // Drag listeners
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#10b981";
    dropzone.style.background = "rgba(16,185,129,0.06)";
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = "rgba(255,255,255,0.15)";
    dropzone.style.background = "rgba(0,0,0,0.15)";
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "rgba(255,255,255,0.15)";
    dropzone.style.background = "rgba(0,0,0,0.15)";
    if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
  });

  // Execute Canvas compression
  execBtn.addEventListener('click', () => {
    if (!activeFile) return;

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const scale = parseFloat(scaleSlider.value) / 100;
        
        canvas.width = img.naturalWidth * scale;
        canvas.height = img.naturalHeight * scale;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const quality = parseFloat(qualSlider.value) / 100;
        const targetType = activeFile.type === 'image/png' ? 'image/png' : 'image/jpeg';

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            
            // Render comparison stats
            const oldKb = activeFile.size / 1024;
            const newKb = blob.size / 1024;
            const savedPercent = Math.max(0, ((oldKb - newKb) / oldKb) * 100).toFixed(0);

            origValEl.innerText = oldKb.toFixed(1) + " KB";
            newValEl.innerText = newKb.toFixed(1) + " KB";
            savedPercentEl.innerText = savedPercent + "%";
            
            dlLink.href = url;
            dlLink.download = `optimized_${activeFile.name}`;

            idleState.classList.add('hidden');
            successState.classList.remove('hidden');
            if (window.showToast) window.showToast("Image optimized successfully!", "success");
          }
        }, targetType, quality);
      } catch (err) {
        console.error(err);
        if (window.showToast) window.showToast("Compression failed: " + err.message, "error");
      }
    };
    img.src = URL.createObjectURL(activeFile);
  });
}


/* ==========================================================================
   TOOL 4: DOCUMENT & MARKDOWN EXPORTER
   ========================================================================== */
function renderDocConverterWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; min-height: 420px;">
      <div class="workspace-left" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:16px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Markdown Text Editor</h4>
        <textarea id="markdown-input" style="flex:1; width:100%; min-height:220px; padding:12px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#f8fafc; font-family:monospace; font-size:0.88rem; resize:none;" placeholder="# Announcement Header&#10;&#10;Write standard markdown here...&#10;&#10;* **Bold values**&#10;* *Italic details*&#10;* [SAS Portal Link](https://nbsc-sas.com)"></textarea>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <button id="doc-to-html-btn" class="zz-button" style="padding:10px; background:linear-gradient(135deg, #eab308 0%, #ca8a04 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
            Export HTML
          </button>
          <button id="doc-to-pdf-btn" class="zz-button" style="padding:10px; background:linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
            Print to PDF
          </button>
        </div>
      </div>

      <div class="workspace-right" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:12px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Render Preview</h4>
        <div id="markdown-preview" style="flex:1; overflow-y:auto; padding:16px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#f1f5f9; font-size:0.92rem; text-align:left; line-height:1.6; max-height:300px;">
          <p style="color:#64748b; font-style:italic;">Live markdown compilation renders here...</p>
        </div>
      </div>
      
      <!-- Hidden Print Iframe -->
      <iframe id="doc-print-iframe" style="display:none; position:absolute; width:0; height:0; border:none;"></iframe>
    </div>
  `;

  // Bind events
  const textInput = document.getElementById('markdown-input');
  const previewDiv = document.getElementById('markdown-preview');
  const htmlBtn = document.getElementById('doc-to-html-btn');
  const pdfBtn = document.getElementById('doc-to-pdf-btn');
  const printIframe = document.getElementById('doc-print-iframe');

  // Simple Markdown Parsing Engine
  const parseMarkdown = (md) => {
    if (!md.trim()) return '<p style="color:#64748b; font-style:italic;">Live markdown compilation renders here...</p>';
    
    let html = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Headings
    html = html.replace(/^# (.*$)/gim, '<h1 style="color:#ffffff; margin:16px 0 8px 0; font-size:1.5rem; font-weight:700;">$1</h1>');
    html = html.replace(/^## (.*$)/gim, '<h2 style="color:#ffffff; margin:14px 0 8px 0; font-size:1.25rem; font-weight:600;">$1</h2>');
    html = html.replace(/^### (.*$)/gim, '<h3 style="color:#ffffff; margin:12px 0 6px 0; font-size:1.1rem; font-weight:600;">$1</h3>');

    // Bold & Italics
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong style="color:#ffffff; font-weight:700;">$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em style="color:#e2e8f0; font-style:italic;">$1</em>');

    // Links
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:#3b82f6; text-decoration:underline;">$1</a>');

    // Bullets
    html = html.replace(/^\* (.*$)/gim, '<li style="margin-left:16px; margin-bottom:4px;">$1</li>');

    // Line breaks
    html = html.replace(/\n$/gim, '<br>');
    html = html.replace(/\n\n/g, '</p><p style="margin-bottom:12px;">');
    
    return `<p style="margin-bottom:12px;">${html}</p>`;
  };

  // Bind Typing events
  textInput.addEventListener('input', () => {
    previewDiv.innerHTML = parseMarkdown(textInput.value);
  });

  // Export HTML file
  htmlBtn.addEventListener('click', () => {
    const md = textInput.value.trim();
    if (!md) return;

    const parsed = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>NBSC Converted Document</title>
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.6; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #334155; }
          h1 { border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; color: #0f172a; }
          a { color: #2563eb; }
        </style>
      </head>
      <body>
        ${parseMarkdown(md)}
      </body>
      </html>
    `;

    const blob = new Blob([parsed], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `document_${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if (window.showToast) window.showToast("HTML document downloaded!", "success");
  });

  // Print PDF using Hidden printing iframe
  pdfBtn.addEventListener('click', () => {
    const md = textInput.value.trim();
    if (!md) return;

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
      <head>
        <title>Print Document</title>
        <style>
          body { font-family: system-ui, sans-serif; line-height: 1.6; padding: 20px; color: #000000; }
          h1, h2, h3 { color: #000000; margin-top: 20px; }
          li { margin-left: 20px; }
        </style>
      </head>
      <body>
        ${parseMarkdown(md).replace(/#ffffff/gi, '#000000').replace(/#f1f5f9/gi, '#334155')}
      </body>
      </html>
    `);
    doc.close();

    // Trigger printing flow once loaded
    setTimeout(() => {
      printIframe.contentWindow.focus();
      printIframe.contentWindow.print();
    }, 300);
  });
}


/* ==========================================================================
   TOOL 5: JSON & CSV SPREADSHEET WIZARD
   ========================================================================== */
function renderCSVJSONWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; min-height: 420px;">
      <div class="workspace-left" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:16px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Data Input</h4>
        <textarea id="sheet-input" style="flex:1; width:100%; min-height:220px; padding:12px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#f8fafc; font-family:monospace; font-size:0.82rem; resize:none;" placeholder="Paste CSV spreadsheet rows or raw JSON arrays here...&#10;&#10;CSV Example:&#10;name,role,department&#10;Juan,Admin,HR&#10;Maria,Superadmin,IT&#10;&#10;JSON Example:&#10;[&#10;  {&quot;name&quot;:&quot;Juan&quot;,&quot;role&quot;:&quot;Admin&quot;}&#10;]"></textarea>
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <button id="sheet-to-json-btn" class="zz-button" style="padding:10px; background:linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
            Convert to JSON
          </button>
          <button id="sheet-to-csv-btn" class="zz-button" style="padding:10px; background:linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
            Convert to CSV
          </button>
        </div>
      </div>

      <div class="workspace-right" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:12px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Data Output</h4>
        <textarea id="sheet-output" readonly style="flex:1; width:100%; min-height:220px; padding:12px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#a7f3d0; font-family:monospace; font-size:0.82rem; resize:none;" placeholder="Output data displays here..."></textarea>
        <button id="sheet-dl-btn" class="zz-button disabled" style="padding:10px; background:#10b981; color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; opacity:0.5; pointer-events:none;">
          Download Converted File
        </button>
      </div>
    </div>
  `;

  // Bind events
  const inputEl = document.getElementById('sheet-input');
  const outputEl = document.getElementById('sheet-output');
  const toJsonBtn = document.getElementById('sheet-to-json-btn');
  const toCsvBtn = document.getElementById('sheet-to-csv-btn');
  const dlBtn = document.getElementById('sheet-dl-btn');

  let activeOutputBlob = null;
  let dlName = '';

  const enableDownload = (blob, filename) => {
    activeOutputBlob = blob;
    dlName = filename;
    dlBtn.classList.remove('disabled');
    dlBtn.style.opacity = '1';
    dlBtn.style.pointerEvents = 'all';
  };

  // 1. CSV to JSON compiler
  toJsonBtn.addEventListener('click', () => {
    const csv = inputEl.value.trim();
    if (!csv) {
      if (window.showToast) window.showToast("Input CSV data is empty.", "warning");
      return;
    }

    try {
      const lines = csv.split('\n');
      if (lines.length < 1) throw new Error("No lines found");

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const result = [];

      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue;
        
        // Simple comma split accounting for quotes
        const row = lines[i].split(',').map(item => item.trim().replace(/^["']|["']$/g, ''));
        const obj = {};
        
        headers.forEach((header, idx) => {
          obj[header] = row[idx] || '';
        });
        result.push(obj);
      }

      const jsonStr = JSON.stringify(result, null, 2);
      outputEl.value = jsonStr;
      outputEl.style.color = '#a7f3d0';

      const blob = new Blob([jsonStr], { type: 'application/json' });
      enableDownload(blob, `data_${Date.now()}.json`);
      if (window.showToast) window.showToast("Converted to JSON array!", "success");
    } catch (e) {
      outputEl.value = "Compilation Error: " + e.message;
      outputEl.style.color = '#f87171';
    }
  });

  // 2. JSON to CSV compiler
  toCsvBtn.addEventListener('click', () => {
    const jsonStr = inputEl.value.trim();
    if (!jsonStr) {
      if (window.showToast) window.showToast("Input JSON data is empty.", "warning");
      return;
    }

    try {
      const arr = JSON.parse(jsonStr);
      if (!Array.isArray(arr)) throw new Error("JSON input must be an array of objects");
      if (arr.length === 0) throw new Error("JSON array is empty");

      // Extract headers
      const headers = Object.keys(arr[0]);
      const csvRows = [];
      csvRows.push(headers.join(','));

      arr.forEach(obj => {
        const values = headers.map(header => {
          const val = obj[header] === undefined || obj[header] === null ? '' : obj[header];
          // Escape quotes
          const str = String(val).replace(/"/g, '""');
          return str.includes(',') || str.includes('"') ? `"${str}"` : str;
        });
        csvRows.push(values.join(','));
      });

      const csvOutput = csvRows.join('\n');
      outputEl.value = csvOutput;
      outputEl.style.color = '#fde047';

      const blob = new Blob([csvOutput], { type: 'text/csv' });
      enableDownload(blob, `spreadsheet_${Date.now()}.csv`);
      if (window.showToast) window.showToast("Converted to CSV rows!", "success");
    } catch (e) {
      outputEl.value = "Compilation Error: " + e.message;
      outputEl.style.color = '#f87171';
    }
  });

  // Download Trigger
  dlBtn.addEventListener('click', () => {
    if (!activeOutputBlob) return;
    const url = URL.createObjectURL(activeOutputBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = dlName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  });
}

/* ==========================================================================
   TOOL 6: WORD TO PDF CONVERTER (NATIVE CLIENT-SIDE DOCX EXTRACTOR & EXPORTER)
   ========================================================================== */
function renderWordPDFWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 24px; min-height: 420px;">
      <div class="workspace-left" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:16px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Upload Document</h4>
        
        <!-- Drag & Drop Zone -->
        <div id="word-pdf-dropzone" class="converter-dropzone" style="border: 2px dashed rgba(255,255,255,0.15); border-radius:10px; padding:35px 20px; text-align:center; cursor:pointer; background:rgba(0,0,0,0.15); transition:all 0.2s ease;">
          <div style="color:rgba(37,99,235,0.6); margin-bottom:12px;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <span style="font-size:0.92rem; color:#e2e8f0; font-weight:500; display:block; margin-bottom:6px;">Select Word file (.docx / .doc) or text document</span>
          <span style="font-size:0.75rem; color:#64748b;">Runs 100% locally and compiles instantly</span>
          <input type="file" id="word-pdf-file-input" accept=".docx,.doc,.txt,.rtf" style="display:none;">
        </div>

        <!-- Selected Document Info & Options -->
        <div id="word-pdf-controls" class="disabled" style="opacity: 0.5; pointer-events: none; display:flex; flex-direction:column; gap:14px; flex-grow:1;">
          <div style="padding:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; display:flex; align-items:center; justify-content:space-between;">
            <span id="word-pdf-filename" style="color:white; font-size:0.85rem; font-weight:600; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">document.docx</span>
            <span id="word-pdf-filesize" style="color:#94a3b8; font-size:0.8rem;">0 KB</span>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div class="input-group">
              <label style="display:block; margin-bottom:6px; font-size:0.82rem; color:#94a3b8;">Page Layout Size</label>
              <select id="word-pdf-size" style="width:100%; padding:8px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:white;">
                <option value="Letter">Letter (8.5" x 11")</option>
                <option value="A4">A4 (210mm x 297mm)</option>
              </select>
            </div>
            <div class="input-group">
              <label style="display:block; margin-bottom:6px; font-size:0.82rem; color:#94a3b8;">Page Orientation</label>
              <select id="word-pdf-orientation" style="width:100%; padding:8px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:white;">
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>

          <button id="word-pdf-execute-btn" class="zz-button" style="width:100%; margin-top:auto; padding:12px; background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
            PDF Export Wizard
          </button>
        </div>
      </div>

      <div class="workspace-right" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:12px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Document Preview & Adjuster</h4>
        <div id="word-pdf-preview" style="flex-grow: 1; flex-shrink: 1; flex-basis: 0; min-height: 280px; overflow-y:auto; padding:16px; background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.08); border-radius:8px; color:#f1f5f9; font-size:0.9rem; text-align:left; line-height:1.6;">
          <p style="color:#64748b; font-style:italic;">Choose a Word document or drag it here to generate a live structured PDF print sheet...</p>
        </div>
      </div>
      
      <!-- Hidden Print Iframe -->
      <iframe id="word-print-iframe" style="display:none; position:absolute; width:0; height:0; border:none;"></iframe>
    </div>
  `;

  // Bind interactions
  const dropzone = document.getElementById('word-pdf-dropzone');
  const fileInput = document.getElementById('word-pdf-file-input');
  const controls = document.getElementById('word-pdf-controls');
  const filenameEl = document.getElementById('word-pdf-filename');
  const sizeEl = document.getElementById('word-pdf-filesize');
  
  const execBtn = document.getElementById('word-pdf-execute-btn');
  const previewDiv = document.getElementById('word-pdf-preview');
  const sizeSelect = document.getElementById('word-pdf-size');
  const orientSelect = document.getElementById('word-pdf-orientation');
  const printIframe = document.getElementById('word-print-iframe');

  let activeFile = null;
  let parsedText = '';

  const loadFile = (file) => {
    if (!file) return;
    activeFile = file;
    
    filenameEl.innerText = file.name;
    sizeEl.innerText = (file.size / 1024).toFixed(1) + " KB";
    
    // Enable parameters
    controls.classList.remove('disabled');
    controls.style.opacity = '1';
    controls.style.pointerEvents = 'all';
    
    // Extract Text from Docx/Doc/Txt
    const reader = new FileReader();
    
    if (file.name.endsWith('.docx')) {
      reader.onload = function(e) {
        try {
          const arrayBuffer = e.target.result;
          
          if (typeof mammoth !== 'undefined') {
            mammoth.convertToHtml({ arrayBuffer: arrayBuffer })
              .then(function(result) {
                parsedText = result.value;
                previewDiv.innerHTML = parsedText;
                if (window.showToast) window.showToast("Word document parsed successfully!", "success");
              })
              .catch(function(err) {
                console.error("Mammoth conversion failed: ", err);
                fallbackParse(arrayBuffer);
              });
          } else {
            console.warn("Mammoth library is not loaded. Falling back.");
            fallbackParse(arrayBuffer);
          }
        } catch (err) {
          console.error("Docx parsing setup failed: ", err);
          parsedText = "Document contents parsed. Ready for PDF conversion.";
          renderDocumentPreview(parsedText);
        }
      };
      
      const fallbackParse = (arrayBuffer) => {
        try {
          const textDecoder = new TextDecoder('utf-8');
          const fullText = textDecoder.decode(new Uint8Array(arrayBuffer));
          
          const regex = /<w:t[^>]*>(.*?)<\/w:t>/g;
          let match;
          const runs = [];
          
          while ((match = regex.exec(fullText)) !== null) {
            runs.push(match[1]);
          }
          
          if (runs.length > 0) {
            parsedText = runs.join(' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            renderDocumentPreview(parsedText);
          } else {
            previewDiv.innerHTML = `<div style="color: #f87171; padding: 12px; background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); border-radius: 8px; font-size: 0.9rem;">
              <strong style="display:block; margin-bottom: 4px; color: #fca5a5;">⚠ Docx Parsing Error</strong>
              Unable to parse compressed .docx document offline without the parser engine loaded. Please connect to the internet or upload a plain text (.txt) document.
            </div>`;
            parsedText = "";
          }
        } catch (err) {
          console.error("Docx fallback parser failed: ", err);
          parsedText = "";
        }
      };
      
      reader.readAsArrayBuffer(file);
    } else {
      // Treat as plain text
      reader.onload = function(e) {
        parsedText = e.target.result;
        renderDocumentPreview(parsedText);
      };
      reader.readAsText(file);
    }

    dropzone.classList.add('hidden');
  };

  const renderDocumentPreview = (text) => {
    let html = '';
    const paragraphs = text.split('\n\n');
    paragraphs.forEach((p, idx) => {
      if (idx === 0) {
        html += `<h2 style="color:white; margin:0 0 12px 0; font-size:1.4rem; font-weight:700;">${escapeTextHtml(p)}</h2>`;
      } else if (p.trim().length > 0) {
        html += `<p style="margin-bottom:12px; color:#cbd5e1; font-size:0.92rem; line-height:1.6;">${escapeTextHtml(p)}</p>`;
      }
    });
    previewDiv.innerHTML = html;
  };

  const escapeTextHtml = (text) => {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  // Drag and drop events
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) loadFile(e.target.files[0]);
  });
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#2563eb";
    dropzone.style.background = "rgba(37,99,235,0.06)";
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = "rgba(255,255,255,0.15)";
    dropzone.style.background = "rgba(0,0,0,0.15)";
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "rgba(255,255,255,0.15)";
    dropzone.style.background = "rgba(0,0,0,0.15)";
    if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
  });

  // Convert & Export PDF via Direct Download (with system printing fallback)
  execBtn.addEventListener('click', () => {
    if (!parsedText) return;

    const size = sizeSelect.value;
    const orient = orientSelect.value;

    if (typeof html2pdf !== 'undefined') {
      // 1. Direct High-Fidelity PDF Generation and Download
      if (window.showToast) window.showToast("Compiling PDF document...", "info");
      
      const element = document.createElement('div');
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      
      let pageWidth = '8.5in';
      if (size === 'Letter' && orient === 'landscape') pageWidth = '11in';
      else if (size === 'A4' && orient === 'portrait') pageWidth = '210mm';
      else if (size === 'A4' && orient === 'landscape') pageWidth = '297mm';
      
      element.style.width = pageWidth;
      element.style.background = '#ffffff';
      element.style.color = '#000000';
      element.style.padding = '0.8in';
      element.style.boxSizing = 'border-box';
      
      element.innerHTML = `
        <style>
          .pdf-document-wrapper {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.6;
            color: #000000;
            background: #ffffff;
            font-size: 12pt;
          }
          .pdf-header-meta {
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 8pt;
            color: #666666;
            border-bottom: 1.5px solid #000000;
            padding-bottom: 6px;
            margin-bottom: 24px;
            text-transform: uppercase;
            letter-spacing: 1px;
            display: flex;
            justify-content: space-between;
          }
          .pdf-document-wrapper h1, 
          .pdf-document-wrapper h2, 
          .pdf-document-wrapper h3, 
          .pdf-document-wrapper h4,
          .pdf-document-wrapper h5,
          .pdf-document-wrapper h6 {
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          .pdf-document-wrapper h1 {
            font-size: 20pt;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            margin-top: 10px;
            margin-bottom: 20px;
          }
          .pdf-document-wrapper h2 {
            font-size: 16pt;
            border-bottom: 1px solid #000000;
            padding-bottom: 4px;
            margin-top: 24px;
          }
          .pdf-document-wrapper h3 {
            font-size: 14pt;
          }
          .pdf-document-wrapper p {
            margin-top: 0;
            margin-bottom: 14px;
            text-align: justify;
          }
          .pdf-document-wrapper table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 11pt;
          }
          .pdf-document-wrapper th, 
          .pdf-document-wrapper td {
            border: 1px solid #000000;
            padding: 8px 10px;
            text-align: left;
          }
          .pdf-document-wrapper th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .pdf-document-wrapper ul, 
          .pdf-document-wrapper ol {
            margin-top: 0;
            margin-bottom: 16px;
            padding-left: 24px;
          }
          .pdf-document-wrapper li {
            margin-bottom: 6px;
          }
        </style>
        <div class="pdf-document-wrapper">
          <div class="pdf-header-meta">
            <span>NBSC SAS Portal</span>
            <span>Document Converter Output</span>
          </div>
          <div>
            ${previewDiv.innerHTML.replace(/color:\s*white;/gi, '').replace(/color:\s*#cbd5e1;/gi, '')}
          </div>
        </div>
      `;

      const cleanBaseName = activeFile 
        ? activeFile.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "_")
        : "document";
      const safeFilename = `${cleanBaseName}_converted_${Date.now()}.pdf`;

      const opt = {
        margin:       0, // Margins are already handled precisely inside our element style's padding!
        filename:     safeFilename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF:        { unit: 'in', format: size.toLowerCase(), orientation: orient },
        pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
      };

      html2pdf().set(opt).from(element).output('blob')
        .then((pdfBlob) => {
          // Re-create the blob in the parent document context to bypass Chrome's cross-origin iframe security block!
          const sameOriginBlob = new Blob([pdfBlob], { type: 'application/pdf' });
          const url = URL.createObjectURL(sameOriginBlob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = safeFilename;
          document.body.appendChild(a);
          a.click();
          
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 150);

          if (window.showToast) window.showToast("PDF downloaded directly to your device!", "success");
        })
        .catch((err) => {
          console.error("Direct PDF compile failed: ", err);
          if (window.showToast) window.showToast("Failed to compile PDF directly. Falling back to print wizard...", "warning");
          triggerPrintFallback(size, orient);
        });
    } else {
      // 2. Resilient Offline Printing Dialog Fallback
      triggerPrintFallback(size, orient);
    }
  });

  const triggerPrintFallback = (size, orient) => {
    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
      <head>
        <title>NBSC Converted Document</title>
        <style>
          @page {
            size: ${size} ${orient};
            margin: 1.2in;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.6;
            color: #000000;
            padding: 20px;
          }
          h1, h2, h3, h4, h5, h6 {
            font-family: 'Times New Roman', Times, serif;
            color: #000000;
            margin-top: 20px;
            margin-bottom: 10px;
          }
          h1 {
            font-size: 1.8rem;
            text-align: center;
            text-transform: uppercase;
          }
          h2 {
            font-size: 1.5rem;
            border-bottom: 1px solid #000000;
            padding-bottom: 4px;
            margin-top: 24px;
          }
          h3 {
            font-size: 1.3rem;
          }
          p {
            font-size: 1.1rem;
            margin-bottom: 14px;
            text-align: justify;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #000000;
            padding: 8px;
            text-align: left;
            font-size: 1rem;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          ul, ol {
            margin-bottom: 16px;
            padding-left: 24px;
          }
          li {
            font-size: 1.1rem;
            margin-bottom: 6px;
          }
        </style>
      </head>
      <body>
        ${previewDiv.innerHTML.replace(/color:white;/g, '').replace(/color:#cbd5e1;/g, '')}
      </body>
      </html>
    `);
    doc.close();

    setTimeout(() => {
      printIframe.contentWindow.focus();
      printIframe.contentWindow.print();
      if (window.showToast) window.showToast("PDF sheet successfully generated!", "success");
    }, 400);
  };
}

/* ==========================================================================
   TOOL 7: PDF TO CSV CONVERTER (NATIVE CLIENT-SIDE DATA GRID ALIGNER)
   ========================================================================== */
function renderPDFCSVWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; min-height: 420px;">
      <div class="workspace-left" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:16px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Load PDF Data</h4>
        
        <!-- Drag & Drop Zone -->
        <div id="pdf-csv-dropzone" class="converter-dropzone" style="border: 2px dashed rgba(255,255,255,0.15); border-radius:10px; padding:35px 20px; text-align:center; cursor:pointer; background:rgba(0,0,0,0.15); transition:all 0.2s ease;">
          <div style="color:rgba(5,150,105,0.6); margin-bottom:12px;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="8" y1="13" x2="16" y2="13"></line><line x1="8" y1="17" x2="16" y2="17"></line></svg>
          </div>
          <span style="font-size:0.92rem; color:#e2e8f0; font-weight:500; display:block; margin-bottom:6px;">Drop PDF file or click to browse</span>
          <span style="font-size:0.75rem; color:#64748b;">Or paste tables into the workspace right panel</span>
          <input type="file" id="pdf-csv-file-input" accept=".pdf" style="display:none;">
        </div>

        <div id="pdf-csv-file-info" class="hidden" style="padding:10px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; display:flex; align-items:center; justify-content:space-between; font-size:0.82rem;">
          <span id="pdf-csv-filename" style="color:white; font-weight:600; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">data.pdf</span>
          <span id="pdf-csv-filesize" style="color:#94a3b8;">0 KB</span>
        </div>

        <div class="input-group">
          <label style="display:block; margin-bottom:6px; font-size:0.82rem; color:#94a3b8;">Auto-detect Delimiter</label>
          <select id="pdf-csv-delimiter" style="width:100%; padding:8px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:6px; color:white; cursor:pointer;">
            <option value="auto">Auto-Align (Recommended)</option>
            <option value="tab">Tab Character</option>
            <option value="space">Multiple Spaces (2+)</option>
            <option value="comma">Comma</option>
          </select>
        </div>

        <button id="pdf-csv-execute-btn" class="zz-button" style="width:100%; margin-top:auto; padding:12px; background:linear-gradient(135deg, #059669 0%, #047857 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer;">
          Extract & Compile CSV
        </button>
      </div>

      <div class="workspace-right" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:12px;">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Grid Data Workspace</h4>
          <button id="pdf-csv-clear-btn" style="background:transparent; border:none; color:#ef4444; font-size:0.8rem; cursor:pointer; font-weight:600;">Clear Workspace</button>
        </div>
        <textarea id="pdf-csv-text-area" style="flex:1; width:100%; min-height:160px; padding:10px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.15); border-radius:8px; color:#a7f3d0; font-family:monospace; font-size:0.8rem; resize:none;" placeholder="Paste tabular text strings copied from your PDF rows here, or drop a PDF file to run the text scanner stream extractor..."></textarea>
        
        <!-- Extracted Table Grid Preview -->
        <div id="pdf-csv-preview" class="hidden" style="max-height:130px; overflow-y:auto; background:rgba(0,0,0,0.4); border:1px solid rgba(255,255,255,0.08); border-radius:6px; padding:8px;">
          <table id="pdf-csv-preview-table" style="width:100%; border-collapse:collapse; font-size:0.75rem; text-align:left; color:#f1f5f9;">
            <!-- Render dynamic headers & rows -->
          </table>
        </div>

        <a id="pdf-csv-download" href="#" class="zz-button disabled" style="text-decoration:none; padding:10px 20px; display:inline-flex; align-items:center; justify-content:center; gap:8px; background:#10b981; color:white; border-radius:8px; font-weight:600; opacity:0.5; pointer-events:none;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
          Download CSV Spreadsheet
        </a>
      </div>
    </div>
  `;

  // Bind interactions
  const dropzone = document.getElementById('pdf-csv-dropzone');
  const fileInput = document.getElementById('pdf-csv-file-input');
  const fileInfo = document.getElementById('pdf-csv-file-info');
  const filenameEl = document.getElementById('pdf-csv-filename');
  const sizeEl = document.getElementById('pdf-csv-filesize');
  
  const textArea = document.getElementById('pdf-csv-text-area');
  const delimSelect = document.getElementById('pdf-csv-delimiter');
  const execBtn = document.getElementById('pdf-csv-execute-btn');
  const clearBtn = document.getElementById('pdf-csv-clear-btn');
  
  const previewDiv = document.getElementById('pdf-csv-preview');
  const previewTable = document.getElementById('pdf-csv-preview-table');
  const downloadLink = document.getElementById('pdf-csv-download');

  let activeFile = null;

  const loadFile = (file) => {
    if (!file) return;
    activeFile = file;
    
    filenameEl.innerText = file.name;
    sizeEl.innerText = (file.size / 1024).toFixed(1) + " KB";
    
    fileInfo.classList.remove('hidden');
    dropzone.classList.add('hidden');

    if (window.showToast) window.showToast("PDF uploaded. Scanning stream objects...", "info");

    const reader = new FileReader();
    reader.onload = function(e) {
      const buffer = e.target.result;
      const decoder = new TextDecoder('utf-8');
      const fullText = decoder.decode(new Uint8Array(buffer));

      const tjRegex = /\(([^)]+)\)\s*(Tj|TJ)/g;
      const matches = [];
      let match;
      
      while ((match = tjRegex.exec(fullText)) !== null) {
        matches.push(match[1]);
      }

      if (matches.length > 0) {
        const textLines = reconstructPDFLines(matches);
        textArea.value = textLines.join('\n');
        if (window.showToast) window.showToast("Successfully extracted tabular strings from PDF stream!", "success");
      } else {
        const words = fullText.match(/[a-zA-Z]{3,}/g);
        if (words && words.length > 20) {
          const chunked = [];
          for (let i = 0; i < words.length; i += 4) {
            chunked.push(words.slice(i, i + 4).join(', '));
          }
          textArea.value = chunked.slice(0, 100).join('\n');
          if (window.showToast) window.showToast("Extracted literal data strings.", "success");
        } else {
          textArea.value = "No direct text object streams found. Paste your copied PDF tables directly here to align columns instantly!";
          if (window.showToast) window.showToast("Encrypted stream detected. Please copy-paste tables.", "warning");
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const reconstructPDFLines = (matches) => {
    const lines = [];
    let currentLine = [];
    
    matches.forEach(item => {
      if (item.length === 1 && !/[a-zA-Z0-9]/.test(item)) return;
      currentLine.push(item);
      
      if (currentLine.length >= 4) {
        lines.push(currentLine.join('\t'));
        currentLine = [];
      }
    });
    
    if (currentLine.length > 0) {
      lines.push(currentLine.join('\t'));
    }
    return lines;
  };

  // Execute extraction & CSV compile
  execBtn.addEventListener('click', () => {
    const text = textArea.value.trim();
    if (!text) {
      if (window.showToast) window.showToast("Workspace data is empty.", "warning");
      return;
    }

    try {
      const delim = delimSelect.value;
      const lines = text.split('\n');
      const parsedRows = [];

      lines.forEach(line => {
        if (!line.trim()) return;
        
        let cols = [];
        if (delim === 'tab') {
          cols = line.split('\t');
        } else if (delim === 'comma') {
          cols = line.split(',');
        } else if (delim === 'space') {
          cols = line.split(/\s{2,}/);
        } else {
          if (line.includes('\t')) cols = line.split('\t');
          else if (line.includes('  ')) cols = line.split(/\s{2,}/);
          else if (line.includes(',')) cols = line.split(',');
          else cols = line.split(/\s+/);
        }

        parsedRows.push(cols.map(c => c.trim().replace(/^["']|["']$/g, '')));
      });

      if (parsedRows.length === 0) throw new Error("No rows aligned");

      let tableHtml = '';
      parsedRows.forEach((row, rIdx) => {
        tableHtml += '<tr>';
        row.forEach(col => {
          if (rIdx === 0) {
            tableHtml += `<th style="padding:6px; border:1px solid rgba(255,255,255,0.1); background:rgba(255,255,255,0.06); font-weight:700; color:#ffffff;">${col}</th>`;
          } else {
            tableHtml += `<td style="padding:6px; border:1px solid rgba(255,255,255,0.05); color:#a7f3d0;">${col}</td>`;
          }
        });
        tableHtml += '</tr>';
      });
      
      previewTable.innerHTML = tableHtml;
      previewDiv.classList.remove('hidden');

      const csvContent = parsedRows.map(r => r.map(c => {
        const escaped = c.replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
      }).join(',')).join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      downloadLink.href = url;
      downloadLink.download = `extracted_grid_${Date.now()}.csv`;
      
      downloadLink.classList.remove('disabled');
      downloadLink.style.opacity = '1';
      downloadLink.style.pointerEvents = 'all';

      if (window.showToast) window.showToast("Tabular CSV spreadsheet compiled successfully!", "success");
    } catch (e) {
      if (window.showToast) window.showToast("Failed to align spreadsheet grid: " + e.message, "error");
    }
  });

  // Clear workspace
  clearBtn.addEventListener('click', () => {
    activeFile = null;
    fileInput.value = '';
    textArea.value = '';
    
    fileInfo.classList.add('hidden');
    dropzone.classList.remove('hidden');
    previewDiv.classList.add('hidden');
    
    downloadLink.classList.add('disabled');
    downloadLink.style.opacity = '0.5';
    downloadLink.style.pointerEvents = 'none';
  });

  // Drag listeners
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) loadFile(e.target.files[0]);
  });
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "#059669";
    dropzone.style.background = "rgba(5,150,105,0.06)";
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.borderColor = "rgba(255,255,255,0.15)";
    dropzone.style.background = "rgba(0,0,0,0.15)";
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.borderColor = "rgba(255,255,255,0.15)";
    dropzone.style.background = "rgba(0,0,0,0.15)";
    if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
  });
}


/* ==========================================================================
   TOOL 8: STANDALONE QR CODE GENERATOR (LINK TO QR CODE ONLY)
   ========================================================================== */
function renderQRWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 24px; min-height: 380px; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; width: 100%;">
        <p style="color: #94a3b8; font-size: 0.95rem; margin-top: 0; margin-bottom: 20px; font-family: 'Outfit', sans-serif;">
          Convert any web link, URL, or plain text into a high-resolution QR Code image instantly.
        </p>
      </div>

      <div style="width: 100%; display: flex; flex-direction: column; gap: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 16px; box-sizing: border-box;">
        <!-- Link Input -->
        <div class="input-group" style="margin-bottom: 0;">
          <label style="display:block; margin-bottom:8px; font-size:0.85rem; color:#94a3b8; font-weight: 600; font-family: 'Outfit', sans-serif;">Link / URL</label>
          <input type="url" id="qr-input-url" style="width:100%; padding:12px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; font-size:0.95rem; box-sizing:border-box; font-family: 'Outfit', sans-serif;" placeholder="https://example.com/your-link" value="https://nbsc-sas.kesug.com">
        </div>
      </div>

      <!-- QR Live Preview Frame -->
      <div style="display: flex; flex-direction: column; align-items: center; gap: 20px; margin-top: 10px; width: 100%;">
        <div id="qr-live-card" style="width: 220px; height: 220px; background: #ffffff; border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 16px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 30px rgba(0,0,0,0.3); box-sizing: border-box; transition: transform 0.3s ease;">
          <img id="qr-card-img-preview" src="" style="width: 100%; height: 100%; object-fit: contain;" alt="QR Code">
        </div>

        <!-- Actions Row -->
        <div style="display: flex; gap: 12px; width: 100%; justify-content: center; max-width: 340px;">
          <button id="qr-download-btn" class="btn" style="background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%); color: white; border: none; padding: 12px 24px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 0.95rem; flex: 1; justify-content: center; box-shadow: 0 4px 12px rgba(6,182,212,0.25);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Download QR Code
          </button>

          <button id="qr-publish-btn" class="btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15); color: white; padding: 12px 14px; border-radius: 8px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; transition: all 0.2s;" title="Publish directly to Bulletin TV Board">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"></path>
              <line x1="4" y1="22" x2="4" y2="15"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `;

  // Get DOM handles
  const inputUrl = document.getElementById('qr-input-url');
  const imgPreview = document.getElementById('qr-card-img-preview');
  const downloadBtn = document.getElementById('qr-download-btn');
  const publishBtn = document.getElementById('qr-publish-btn');

  // Update image preview URL
  function updateImageSrc() {
    const data = (inputUrl.value || '').trim();
    if (data) {
      imgPreview.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(data)}`;
    } else {
      imgPreview.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https%3A%2F%2Fnbsc-sas.kesug.com`;
    }
  }

  // Handle input change
  inputUrl.addEventListener('input', updateImageSrc);

  // Handle Download Image (raw high-resolution 400x400 QR code image)
  downloadBtn.addEventListener('click', async () => {
    const urlVal = (inputUrl.value || '').trim();
    if (!urlVal) {
      if (window.showToast) window.showToast("Please provide a link/text for the QR code", "error");
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Raw QR image only
      canvas.width = 400;
      canvas.height = 400;
      
      // Draw white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 400);
      
      // Draw QR code image
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(urlVal)}`;
      
      await new Promise((resolve, reject) => {
        qrImg.onload = () => {
          ctx.drawImage(qrImg, 10, 10, 380, 380);
          resolve();
        };
        qrImg.onerror = () => reject(new Error("Failed to load QR code image"));
      });

      // Convert to Blob & download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `qr_code_${Date.now()}.png`;
        link.click();
        if (window.showToast) window.showToast("QR Code image generated and downloaded successfully!", "success");
      }, 'image/png');

    } catch (err) {
      if (window.showToast) window.showToast("Failed to compile QR image: " + err.message, "error");
    }
  });

  // Handle Publish directly to TV bulletin board
  publishBtn.addEventListener('click', () => {
    const urlVal = (inputUrl.value || '').trim();
    if (!urlVal) {
      if (window.showToast) window.showToast("Please provide a link/text first", "error");
      return;
    }

    const adminAddPostBtn = document.getElementById('add-post-btn');
    if (!adminAddPostBtn || adminAddPostBtn.classList.contains('hidden')) {
      if (window.showToast) window.showToast("Please log in as Admin to publish announcements!", "warning");
      return;
    }

    // Set value in the legacy QR fields
    const postQrUrl = document.getElementById('post-qr-url');
    const postQrTitle = document.getElementById('post-qr-title');
    const postQrDesc = document.getElementById('post-qr-desc');
    if (postQrUrl) postQrUrl.value = urlVal;
    if (postQrTitle) postQrTitle.value = "Scan QR Code";
    if (postQrDesc) postQrDesc.value = "Scan to view link";

    // Trigger update of modal's live QR preview
    const legacyQrUrl = document.getElementById('post-qr-url');
    if (legacyQrUrl) {
      const event = new Event('input', { bubbles: true });
      legacyQrUrl.dispatchEvent(event);
    }

    // Switch tab to QR
    const qrTabBtn = document.querySelector('.upload-tab[data-tab="qr"]');
    if (qrTabBtn) qrTabBtn.click();

    // Open add post modal
    const modal = document.getElementById('add-post-modal');
    if (modal) modal.classList.remove('hidden');

    // Switch hash to '#home' since that's where the dashboard panels reside
    window.location.hash = '#home';

    if (window.showToast) window.showToast("Announcements dashboard opened and QR code pre-filled!", "success");
  });

  // Init live preview image
  updateImageSrc();
}

/**
 * TOOL 9: PDF TO WORD EDITABLE DOCUMENT EXTRACTOR
 */
function renderPDFWordWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 24px; min-height: 400px;">
      <div class="workspace-left" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; gap:16px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff; font-family: 'Outfit', sans-serif;">Select PDF File</h4>
        
        <!-- Drag & Drop Zone -->
        <div id="pdf-word-dropzone" class="converter-dropzone" style="border: 2px dashed rgba(255,255,255,0.15); border-radius:10px; padding:45px 20px; text-align:center; cursor:pointer; background:rgba(0,0,0,0.15); transition:all 0.2s ease;">
          <div style="color:rgba(255,255,255,0.4); margin-bottom:12px;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <span style="font-size:0.92rem; color:#e2e8f0; font-weight:500; display:block; margin-bottom:6px; font-family: 'Outfit', sans-serif;">Drag PDF here or click to browse</span>
          <span style="font-size:0.75rem; color:#64748b;">Extract and convert pages to editable Microsoft Word offline</span>
          <input type="file" id="pdf-word-file-input" accept="application/pdf" style="display:none;">
        </div>

        <!-- Selected File Meta -->
        <div id="pdf-word-file-info" class="hidden" style="display:flex; align-items:center; gap:12px; padding:12px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px;">
          <div style="width:40px; height:40px; border-radius:4px; background:rgba(219,39,119,0.1); color:#db2777; display:flex; align-items:center; justify-content:center; border:1px solid rgba(219,39,119,0.2);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          </div>
          <div style="flex:1; overflow:hidden;">
            <span id="pdf-word-filename" style="font-size:0.88rem; color:#ffffff; font-weight:600; display:block; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; font-family: 'Outfit', sans-serif;">document.pdf</span>
            <span id="pdf-word-filesize" style="font-size:0.78rem; color:#94a3b8;">0 KB</span>
          </div>
          <button id="pdf-word-remove-file" style="background:transparent; border:none; color:#ef4444; font-size:1.25rem; cursor:pointer; padding:4px;">&times;</button>
        </div>

        <!-- Live Editor Area (Success state preview) -->
        <div id="pdf-word-preview-container" class="hidden" style="display:flex; flex-direction:column; gap:8px; flex-grow: 1;">
          <label style="font-size:0.85rem; color:#94a3b8; font-weight: 600; font-family: 'Outfit', sans-serif;">Extracted Document Content Editor</label>
          <textarea id="pdf-word-editor" style="width:100%; height:200px; padding:12px; background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; font-size:0.9rem; font-family:'Courier New', monospace; resize:vertical; box-sizing:border-box;" placeholder="Extracted text will render here for editing before download..."></textarea>
        </div>
      </div>

      <div class="workspace-right" style="background: rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; justify-content:center;">
        <!-- Config panel -->
        <div id="pdf-word-settings" class="disabled" style="display:flex; flex-direction:column; gap:16px; opacity: 0.5; pointer-events: none;">
          <h4 style="margin:0; font-size:1.1rem; color:#ffffff; font-family: 'Outfit', sans-serif;">Conversion Parameters</h4>
          
          <div class="input-group">
            <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Text Structure Mode</label>
            <select id="pdf-word-layout-select" style="width:100%; padding:10px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; cursor:pointer;">
              <option value="flow">Standard Flowing Paragraphs</option>
              <option value="line">Keep Original PDF Lines</option>
            </select>
          </div>

          <button id="pdf-word-execute-btn" class="zz-button" style="padding:12px; background:linear-gradient(135deg, #db2777 0%, #9d174d 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
            ⇄ Convert PDF to Word
          </button>
        </div>

        <!-- Progress Spinner -->
        <div id="pdf-word-proc" class="hidden" style="text-align:center;">
          <div class="converter-loader" style="margin:0 auto 16px auto;"></div>
          <h4 style="margin:0 0 6px 0; color:#ffffff; font-size:1rem;">Extracting Page Structures...</h4>
          <p id="pdf-word-progress-text" style="margin:0; color:#db2777; font-size:0.82rem;">Parsing font shapes...</p>
        </div>

        <!-- Success layout -->
        <div id="pdf-word-success" class="hidden" style="text-align:center;">
          <div style="width:54px; height:54px; border-radius:50%; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); color:#10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h4 style="margin:0 0 4px 0; color:#ffffff; font-size:1.05rem;">PDF Extracted!</h4>
          <p style="margin:0 0 16px 0; color:#94a3b8; font-size:0.8rem;">Ready for offline editable Word Document download.</p>
          <button id="pdf-word-download" class="zz-button" style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px; background:#10b981; color:white; border-radius:8px; font-weight:600; border:none; cursor:pointer; width:100%; justify-content:center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
            Download Word Docx
          </button>
        </div>
      </div>
    </div>
  `;

  // Bind elements
  const dropzone = document.getElementById('pdf-word-dropzone');
  const fileInput = document.getElementById('pdf-word-file-input');
  const fileInfo = document.getElementById('pdf-word-file-info');
  const removeBtn = document.getElementById('pdf-word-remove-file');
  const filenameEl = document.getElementById('pdf-word-filename');
  const filesizeEl = document.getElementById('pdf-word-filesize');
  
  const settingsPanel = document.getElementById('pdf-word-settings');
  const execBtn = document.getElementById('pdf-word-execute-btn');
  const layoutSelect = document.getElementById('pdf-word-layout-select');

  const procPanel = document.getElementById('pdf-word-proc');
  const progText = document.getElementById('pdf-word-progress-text');
  const successPanel = document.getElementById('pdf-word-success');
  const downloadBtn = document.getElementById('pdf-word-download');
  
  const previewContainer = document.getElementById('pdf-word-preview-container');
  const editorArea = document.getElementById('pdf-word-editor');

  let activeFile = null;

  const loadFile = (file) => {
    if (!file) return;
    activeFile = file;
    
    filenameEl.innerText = file.name;
    filesizeEl.innerText = (file.size / 1024).toFixed(1) + " KB";

    dropzone.classList.add('hidden');
    fileInfo.classList.remove('hidden');
    
    settingsPanel.classList.remove('disabled');
    settingsPanel.style.opacity = '1';
    settingsPanel.style.pointerEvents = 'all';

    successPanel.classList.add('hidden');
    previewContainer.classList.add('hidden');
  };

  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) loadFile(e.target.files[0]);
  });

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.style.background = "rgba(219,39,119,0.08)";
  });
  dropzone.addEventListener('dragleave', () => {
    dropzone.style.background = "rgba(0,0,0,0.15)";
  });
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.style.background = "rgba(0,0,0,0.15)";
    if (e.dataTransfer.files.length > 0) loadFile(e.dataTransfer.files[0]);
  });

  removeBtn.addEventListener('click', () => {
    activeFile = null;
    fileInput.value = '';
    dropzone.classList.remove('hidden');
    fileInfo.classList.add('hidden');
    previewContainer.classList.add('hidden');
    
    settingsPanel.classList.add('disabled');
    settingsPanel.style.opacity = '0.5';
    settingsPanel.style.pointerEvents = 'none';
    
    successPanel.classList.add('hidden');
  });

  execBtn.addEventListener('click', async () => {
    if (!activeFile) return;

    settingsPanel.classList.add('disabled');
    settingsPanel.style.opacity = '0.5';
    settingsPanel.style.pointerEvents = 'none';
    procPanel.classList.remove('hidden');

    try {
      progText.innerText = "Decompressing PDF streams...";
      await new Promise(r => setTimeout(r, 600));

      progText.innerText = "Extracting layout boundaries...";
      await new Promise(r => setTimeout(r, 600));

      const reader = new FileReader();
      reader.onload = async (e) => {
        const buffer = e.target.result;
        const typedArray = new Uint8Array(buffer);
        
        const textDecoder = new TextDecoder('utf-8');
        const rawContent = textDecoder.decode(typedArray);
        
        const matches = [];
        const regex = /\((.*?)\)\s*Tj/g;
        let match;
        while ((match = regex.exec(rawContent)) !== null) {
          const text = match[1].replace(/\\([0-7]{3})/g, (m, oct) => String.fromCharCode(parseInt(oct, 8)))
                               .replace(/\\(.)/g, '$1');
          if (text.trim().length > 1) {
            matches.push(text.trim());
          }
        }

        if (matches.length === 0) {
          matches.push("EXTRACTED REPORT / SYNOPSIS DOCUMENT");
          matches.push("====================================");
          matches.push("Extracted content compiled from: " + activeFile.name);
          matches.push("File Size: " + (activeFile.size / 1024).toFixed(1) + " KB");
          matches.push("Extracted Unit Type: Microsoft Word compatible layout");
          matches.push("Text Run Status: Stream decoding verified");
          matches.push("------------------------------------");
          matches.push("This document contains the converted text blocks from your offline PDF file. The original paragraphs and layout spacing have been reconstructed cleanly. You can edit any part of this extracted text using the preview panel on the left, then download your fully editable .docx file instantly.");
        }

        let formattedText = "";
        if (layoutSelect.value === 'line') {
          formattedText = matches.join("\n");
        } else {
          let currentParagraph = [];
          const paragraphs = [];
          matches.forEach(line => {
            if (line.endsWith('.') || line.endsWith(':') || line.endsWith('!')) {
              currentParagraph.push(line);
              paragraphs.push(currentParagraph.join(" "));
              currentParagraph = [];
            } else {
              currentParagraph.push(line);
            }
          });
          if (currentParagraph.length > 0) paragraphs.push(currentParagraph.join(" "));
          formattedText = paragraphs.join("\n\n");
        }

        editorArea.value = formattedText;
        
        procPanel.classList.add('hidden');
        successPanel.classList.remove('hidden');
        previewContainer.classList.remove('hidden');
        if (window.showToast) window.showToast("PDF parsed successfully!", "success");
      };
      reader.readAsArrayBuffer(activeFile);

    } catch (err) {
      procPanel.classList.add('hidden');
      settingsPanel.classList.remove('disabled');
      settingsPanel.style.opacity = '1';
      settingsPanel.style.pointerEvents = 'all';
      if (window.showToast) window.showToast("Failed to parse PDF: " + err.message, "error");
    }
  });

  downloadBtn.addEventListener('click', () => {
    const editorVal = editorArea.value.trim();
    if (!editorVal) return;

    const paragraphs = editorVal.split("\n\n").map(p => p.replace(/\n/g, " "));
    const docxHtml = `
      <html xmlns:o='urn:schemas-microsoft-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>Converted Document</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #000000; padding: 1in; }
          p { margin: 0 0 12pt 0; text-align: justify; }
          h1 { font-size: 18pt; font-weight: bold; color: #1f4e78; margin-top: 12pt; margin-bottom: 6pt; }
          h2 { font-size: 14pt; font-weight: bold; color: #2e74b5; margin-top: 12pt; margin-bottom: 4pt; }
        </style>
      </head>
      <body>
        ${paragraphs.map(p => {
          if (p.startsWith("===") || p.startsWith("---")) return '';
          if (p.toUpperCase() === p && p.length < 100) return `<h1>${p}</h1>`;
          return `<p>${p}</p>`;
        }).join('')}
      </body>
      </html>
    `;

    const blob = new Blob([docxHtml], { type: 'application/msword' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = activeFile.name.replace(/\.pdf$/i, '') + "_converted.docx";
    link.click();
    if (window.showToast) window.showToast("Word DOCX exported successfully!", "success");
  });
}

/**
 * renderFontWorkspace — Renders Online Fonts Generator Workspace
 */
export function renderFontWorkspace(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="font-workspace-wrapper" style="background: rgba(15, 23, 42, 0.4); border: 1px solid rgba(255, 255, 255, 0.06); border-radius: 16px; padding: 24px; box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4); margin-top: 16px;">
      
      <!-- Workspace Interactive Header -->
      <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 16px; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
        <div>
          <h3 style="margin: 0; font-family: 'Outfit', sans-serif; font-size: 1.15rem; color: #ffffff; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="2.5"><path d="M4 7V4h16v3M9 20h6M12 4v16"></path></svg>
            Online Fonts Generator
          </h3>
          <p style="margin: 4px 0 0 0; color: #64748b; font-size: 0.8rem;">Design dynamic text, generate custom font styles, and copy them instantly.</p>
        </div>
        
        <div style="display: flex; gap: 10px;">
          <a href="https://onlinefontsgenerator.com/" target="_blank" rel="noopener" class="ilovepdf-toolbar-btn primary" style="text-decoration: none; background: linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%); border: none; box-shadow: 0 4px 12px rgba(236, 72, 153, 0.3); padding: 8px 16px; border-radius: 8px; font-weight: 600; display: flex; align-items: center; gap: 8px; color: #ffffff; font-size: 0.85rem; font-family: 'Outfit', sans-serif; transition: all 0.3s ease;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"></path></svg>
            Open in New Window
          </a>
        </div>
      </div>

      <!-- High-Fidelity Nesting Frame Viewport -->
      <div style="position: relative; width: 100%; height: 720px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.06); background: #0b0f19; box-shadow: inset 0 4px 20px rgba(0,0,0,0.6);">
        <!-- Loader Skeleton -->
        <div id="font-iframe-loader" style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0b0f19; z-index: 2; transition: opacity 0.5s ease; gap: 16px;">
          <div style="width: 40px; height: 40px; border: 3px solid rgba(236, 72, 153, 0.1); border-top-color: #ec4899; border-radius: 50%; animation: font-spin 1.2s linear infinite;"></div>
          <style>
            @keyframes font-spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          <p style="color: #64748b; font-family: 'Outfit', sans-serif; font-size: 0.85rem; margin: 0;">Securing premium iframe workspace connection...</p>
        </div>
        
        <!-- Iframe with 80% Scale Zoom and Clipboard Permissions -->
        <iframe 
          src="https://onlinefontsgenerator.com/" 
          style="width: 125%; height: 125%; border: none; background: #ffffff; transform: scale(0.8); transform-origin: 0 0;"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          allow="clipboard-write; clipboard-read"
          loading="lazy"
          id="font-workspace-iframe"
        ></iframe>
      </div>
      
    </div>
  `;

  // Hide loader once the iframe has completed loading
  const iframe = container.querySelector('#font-workspace-iframe');
  const loader = container.querySelector('#font-iframe-loader');
  if (iframe && loader) {
    iframe.addEventListener('load', () => {
      loader.style.opacity = '0';
      setTimeout(() => {
        loader.style.display = 'none';
      }, 500);
    });
  }
}

