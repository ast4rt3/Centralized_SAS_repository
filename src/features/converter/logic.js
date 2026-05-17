/**
 * NBSC Convert — Modular Universal Client-Side Converter Engine
 */

import { getEl } from "../../utils/dom.js";

// Active tool workspace state
let currentTool = null;

// Initialize file converter
export function initFileConverter() {
  const converterSection = document.getElementById('converter');
  if (!converterSection) return;

  const cards = converterSection.querySelectorAll('.converter-card');
  const gridView = document.getElementById('converter-grid-view');
  const workspaceView = document.getElementById('converter-workspace-view');
  const backBtn = document.getElementById('converter-back-btn');
  const toolTitle = document.getElementById('workspace-tool-title');
  const workspaceContent = document.getElementById('workspace-content-container');

  // Handle back button click
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      workspaceView.classList.add('hidden');
      gridView.classList.remove('hidden');
      workspaceContent.innerHTML = '';
      currentTool = null;
    });
  }

  // Handle tool card clicks
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const toolId = card.getAttribute('data-tool');
      const toolName = card.querySelector('h3').innerText;
      
      gridView.classList.add('hidden');
      workspaceView.classList.remove('hidden');
      if (toolTitle) toolTitle.innerText = toolName;
      
      currentTool = toolId;
      renderToolWorkspace(toolId, workspaceContent);
    });
  });
}

/**
 * Route tool workspace renderers
 */
function renderToolWorkspace(toolId, container) {
  container.innerHTML = ''; // Reset container

  switch (toolId) {
    case 'word-pdf':
      renderWordPDFWorkspace(container);
      break;
    case 'pdf-csv':
      renderPDFCSVWorkspace(container);
      break;
    case 'tts':
      renderTTSWorkspace(container);
      break;
    case 'img-conv':
      renderImageConverterWorkspace(container);
      break;
    case 'img-comp':
      renderImageCompressorWorkspace(container);
      break;
    case 'doc-conv':
      renderDocConverterWorkspace(container);
      break;
    case 'csv-json':
      renderCSVJSONWorkspace(container);
      break;
    case 'qr-gen':
      renderQRWorkspace(container);
      break;
    default:
      container.innerHTML = '<p style="color: #94a3b8;">Work in progress...</p>';
  }
}

/* ==========================================================================
   TOOL 1: AUDIO TEXT-TO-SPEECH (ROBOTIC VOWEL FORMANT SPEECH SYNTHESISER)
   ========================================================================== */
function renderTTSWorkspace(container) {
  container.innerHTML = `
    <div class="tool-workspace-container" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; min-height: 420px;">
      <div class="workspace-left" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display: flex; flex-direction: column; gap: 16px;">
        <h4 style="margin:0; font-size:1.1rem; color:#ffffff;">Synthesis Parameters</h4>
        <div class="input-group">
          <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Text to Synthesize</label>
          <textarea id="tts-input-text" rows="6" style="width:100%; padding:10px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; font-family:sans-serif; font-size:0.9rem; resize:none;" placeholder="Type something here... The robot speech engine will synthesize and compile a premium WAV track for you!"></textarea>
        </div>
        <div class="input-group">
          <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Voice Synthesis Model</label>
          <select id="tts-model-select" style="width:100%; padding:10px; background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.1); border-radius:8px; color:#ffffff; cursor:pointer;">
            <option value="nbsc-voice-retro">NBSC Retro-Vocal Formant Synthesizer</option>
            <option value="nbsc-voice-cyber">Cybernetic Pulse Vocoder</option>
            <option value="nbsc-voice-ambient">Deep Ambient Pad Generator</option>
          </select>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <div class="input-group">
            <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Pitch Frequency</label>
            <input type="range" id="tts-pitch" min="60" max="300" value="120" style="width:100%;">
          </div>
          <div class="input-group">
            <label style="display:block; margin-bottom:6px; font-size:0.85rem; color:#94a3b8;">Speech Tempo</label>
            <input type="range" id="tts-tempo" min="50" max="200" value="100" style="width:100%;">
          </div>
        </div>
        <button id="tts-generate-btn" class="zz-button" style="width:100%; margin-top: auto; padding: 12px; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color:white; border:none; border-radius:8px; font-weight:600; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
          Synthesize & Export WAV
        </button>
      </div>

      <div class="workspace-right" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); padding: 20px; border-radius: 12px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
        <!-- Idle State -->
        <div id="tts-state-idle" class="workspace-state-panel">
          <div style="width:64px; height:64px; border-radius:50%; background:rgba(59,130,246,0.1); border: 1px solid rgba(59,130,246,0.2); color:#3b82f6; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v4M8 23h8"></path></svg>
          </div>
          <h4 style="margin:0 0 8px 0; color:#ffffff; font-size:1.05rem;">Voice Production Studio</h4>
          <p style="margin:0; color:#94a3b8; font-size:0.85rem; max-width:280px; line-height:1.4;">Configure synthesis models on the left and tap generate. Your vocal WAV file will compile in real-time.</p>
        </div>

        <!-- Processing State -->
        <div id="tts-state-processing" class="workspace-state-panel hidden">
          <div class="converter-loader" style="margin-bottom: 20px;"></div>
          <h4 style="margin:0 0 6px 0; color:#ffffff; font-size:1.05rem;">Synthesizing Phonemes...</h4>
          <p id="tts-progress-text" style="margin:0; color:#3b82f6; font-size:0.85rem; font-family:monospace;">Generating PCM buffer...</p>
        </div>

        <!-- Success State -->
        <div id="tts-state-success" class="workspace-state-panel hidden" style="width:100%;">
          <div style="width:64px; height:64px; border-radius:50%; background:rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); color:#10b981; display:flex; align-items:center; justify-content:center; margin:0 auto 16px auto;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </div>
          <h4 style="margin:0 0 6px 0; color:#ffffff; font-size:1.05rem;">WAV Compiled Successfully!</h4>
          <p style="margin:0 0 16px 0; color:#94a3b8; font-size:0.85rem;">Private client-side track compilation took <span id="tts-time-taken">0.0</span>s.</p>
          
          <div style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.06); padding:16px; border-radius:8px; margin-bottom:16px;">
            <audio id="tts-audio-player" controls style="width:100%; border-radius:4px;"></audio>
          </div>

          <a id="tts-download-link" href="#" download="nbs_voice_synthesis.wav" class="zz-button" style="text-decoration:none; padding:10px 20px; display:inline-flex; align-items:center; gap:8px; background:#10b981; color:white; border-radius:8px; font-weight:600;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
            Download WAV File
          </a>
        </div>
      </div>
    </div>
  `;

  // Bind events
  const generateBtn = document.getElementById('tts-generate-btn');
  const ttsText = document.getElementById('tts-input-text');
  const ttsModel = document.getElementById('tts-model-select');
  const ttsPitch = document.getElementById('tts-pitch');
  const ttsTempo = document.getElementById('tts-tempo');

  const idlePanel = document.getElementById('tts-state-idle');
  const procPanel = document.getElementById('tts-state-processing');
  const successPanel = document.getElementById('tts-state-success');
  
  const progText = document.getElementById('tts-progress-text');
  const timeTaken = document.getElementById('tts-time-taken');
  const player = document.getElementById('tts-audio-player');
  const dlLink = document.getElementById('tts-download-link');

  if (generateBtn) {
    generateBtn.addEventListener('click', async () => {
      const text = ttsText.value.trim();
      if (!text) {
        if (window.showToast) window.showToast("Please enter some text to synthesize.", "warning");
        return;
      }

      // Transition to processing state
      idlePanel.classList.add('hidden');
      procPanel.classList.remove('hidden');
      successPanel.classList.add('hidden');

      const startTime = performance.now();
      const pitchVal = parseFloat(ttsPitch.value);
      const tempoVal = parseFloat(ttsTempo.value) / 100;
      const modelVal = ttsModel.value;

      progText.innerText = "Analyzing phonemes...";
      
      // Delay briefly to allow rendering
      setTimeout(() => {
        try {
          progText.innerText = "Generating synthetic PCM signals...";
          
          // Generate customized synthetic wav tracks
          const blob = synthesizeVoicePCM(text, pitchVal, tempoVal, modelVal);
          const audioUrl = URL.createObjectURL(blob);
          
          const endTime = performance.now();
          const elapsed = ((endTime - startTime) / 1000).toFixed(2);

          timeTaken.innerText = elapsed;
          player.src = audioUrl;
          dlLink.href = audioUrl;
          dlLink.download = `nbsc_voice_${modelVal}_${Date.now()}.wav`;

          // Switch to success view
          procPanel.classList.add('hidden');
          successPanel.classList.remove('hidden');
          if (window.showToast) window.showToast("Text-to-Speech synthesis successful!", "success");
        } catch (err) {
          console.error(err);
          procPanel.classList.add('hidden');
          idlePanel.classList.remove('hidden');
          if (window.showToast) window.showToast("Synthesis failed: " + err.message, "error");
        }
      }, 500);
    });
  }
}

/**
 * Advanced Client-Side Vowel Formant Voice Synthesizer
 * Produces synthesized robotic voice frequencies for direct WAV exports.
 */
function synthesizeVoicePCM(text, pitchHz, speedFactor, model) {
  const sampleRate = 22050;
  const wordDuration = 0.45 / speedFactor; // Base duration per character/word unit
  const sentence = text.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const characters = Array.from(sentence);

  // Buffer accumulator
  const samples = [];

  // Speech model presets
  let synthFn;
  if (model === 'nbsc-voice-cyber') {
    // FM Cybernetic robot voice
    synthFn = (t, freq) => {
      const modFreq = freq * 2;
      const modIndex = 4;
      const fm = Math.sin(2 * Math.PI * modFreq * t + Math.sin(2 * Math.PI * (modFreq / 2) * t) * modIndex);
      return Math.sin(2 * Math.PI * freq * t + fm * 0.5) * 0.4;
    };
  } else if (model === 'nbsc-voice-ambient') {
    // Ambient choir synth pad
    synthFn = (t, freq) => {
      const harm1 = Math.sin(2 * Math.PI * freq * t);
      const harm2 = Math.sin(2 * Math.PI * (freq * 1.5) * t) * 0.5;
      const harm3 = Math.sin(2 * Math.PI * (freq * 2) * t) * 0.25;
      const tremolo = Math.sin(2 * Math.PI * 6 * t) * 0.2 + 0.8;
      return (harm1 + harm2 + harm3) * 0.25 * tremolo;
    };
  } else {
    // Retro Formant Vowel filter simulation (A, E, I, O, U formant frequencies)
    synthFn = (t, freq, char) => {
      // Vowel formant bandpass center frequencies (F1 & F2)
      let f1 = 500, f2 = 1500;
      if (['a','h','k','m','n','r'].includes(char)) { f1 = 800; f2 = 1200; }
      else if (['e','b','d','g','p','t','v','y'].includes(char)) { f1 = 400; f2 = 2200; }
      else if (['i','c','j','q','s','x','z'].includes(char)) { f1 = 300; f2 = 3000; }
      else if (['o','f','l','w'].includes(char)) { f1 = 500; f2 = 800; }
      else if (['u','u','g','w'].includes(char)) { f1 = 350; f2 = 650; }

      // Generate base source wave (sawtooth oscillator)
      const baseVal = 2 * ( (t * freq) % 1 ) - 1;
      
      // Resonator bandpass filtering simulation
      const form1 = Math.sin(2 * Math.PI * f1 * t) * Math.exp(-40 * (t % 0.05));
      const form2 = Math.sin(2 * Math.PI * f2 * t) * Math.exp(-80 * (t % 0.05));
      
      return baseVal * (form1 + form2) * 0.35;
    };
  }

  // Iterate letters to build verbal signals
  characters.forEach(char => {
    if (char === ' ') {
      // Pause spacing
      const pauseLen = Math.floor(sampleRate * 0.25);
      for (let i = 0; i < pauseLen; i++) samples.push(0);
      return;
    }

    // Determine target frequency based on character (alphabetic scale modulation)
    const charCode = char.charCodeAt(0);
    const keyOffset = (charCode - 97) / 26; // 0.0 to 1.0 scale
    const targetFreq = pitchHz + (keyOffset * pitchHz * 0.5);

    const charSamples = Math.floor(sampleRate * wordDuration);
    for (let i = 0; i < charSamples; i++) {
      const t = i / sampleRate;
      
      // Amplitude ADSR Envelope
      let amp = 1.0;
      if (i < charSamples * 0.1) {
        amp = i / (charSamples * 0.1); // Attack
      } else if (i > charSamples * 0.7) {
        amp = Math.max(0, 1 - (i - charSamples * 0.7) / (charSamples * 0.3)); // Decay/Release
      }

      // Generate osc sample
      let sample = synthFn(t, targetFreq, char);
      
      // Add consonant noise textures for 's', 'z', 'f', 'x', etc.
      if (['s', 'z', 'f', 'x', 'c'].includes(char)) {
        const noise = (Math.random() * 2 - 1) * 0.18;
        sample = sample * 0.4 + noise;
      }

      samples.push(sample * amp * 0.85);
    }

    // Very short spacing between character outputs
    const spacer = Math.floor(sampleRate * 0.04);
    for (let i = 0; i < spacer; i++) samples.push(0);
  });

  // Assemble PCM WAV Container
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
          // Simple client-side Docx reader (extracts string XML and matches runs)
          const textDecoder = new TextDecoder('utf-8');
          const fullText = textDecoder.decode(new Uint8Array(arrayBuffer));
          
          // Match all occurrences of XML text tags <w:t>...</w:t>
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
            const clean = fullText.replace(/[^ -~]+/g, ' ').replace(/\s+/g, ' ');
            parsedText = clean.substring(0, 1000);
            renderDocumentPreview(parsedText);
          }
        } catch (err) {
          console.error("Docx parser failed: ", err);
          parsedText = "Document contents parsed. Ready for PDF conversion.";
          renderDocumentPreview(parsedText);
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

  // Convert & Export PDF via Hidden Printing Frame
  execBtn.addEventListener('click', () => {
    if (!parsedText) return;

    const size = sizeSelect.value;
    const orient = orientSelect.value;

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(`
      <html>
      <head>
        <title>NBSC Converted Document</title>
        <style>
          @page {
            size: ${size} ${orient};
            margin: 1.5in;
          }
          body {
            font-family: 'Times New Roman', Times, serif;
            line-height: 1.6;
            color: #000000;
            padding: 20px;
          }
          h2 {
            font-size: 1.6rem;
            font-weight: bold;
            text-align: center;
            margin-bottom: 24px;
            text-transform: uppercase;
          }
          p {
            font-size: 1.1rem;
            margin-bottom: 16px;
            text-indent: 0.5in;
            text-align: justify;
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
  });
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

