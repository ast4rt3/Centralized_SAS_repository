document.addEventListener('DOMContentLoaded', () => {
  // IMPORTANT: Replace this with your newly deployed Mailer Google Apps Script URL
  const GAS_URL = "YOUR_NEW_GAS_WEB_APP_URL_HERE"; 

  const modeSingle = document.getElementById('mode-single');
  const modeBatch = document.getElementById('mode-batch');
  const recipientGroup = document.getElementById('recipient-group');
  const toEmailInput = document.getElementById('toEmail');
  const batchGroup = document.getElementById('batch-group');
  const mailerForm = document.getElementById('mailerForm');
  const statusMessage = document.getElementById('statusMessage');
  const sendBtn = document.getElementById('sendBtn');
  const sendIcon = document.querySelector('.send-icon');
  const sendText = document.getElementById('sendText');

  // Toggle Single vs Batch Mode
  function updateMode() {
    if (modeSingle.checked) {
      recipientGroup.classList.remove('hidden');
      toEmailInput.required = true;
      batchGroup.classList.add('hidden');
    } else {
      recipientGroup.classList.add('hidden');
      toEmailInput.required = false;
      toEmailInput.value = ''; // clear out
      batchGroup.classList.remove('hidden');
    }
    
    // Reset status
    statusMessage.className = 'status-message hidden';
    statusMessage.textContent = '';
  }

  modeSingle.addEventListener('change', updateMode);
  modeBatch.addEventListener('change', updateMode);

  mailerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Require URL to be set
    if (GAS_URL === "YOUR_NEW_GAS_WEB_APP_URL_HERE" || GAS_URL.trim() === "") {
      showStatus("Please update app.js with your Google Apps Script URL first.", "error");
      return;
    }

    const payload = {
      action: modeSingle.checked ? "sendSingleEmail" : "sendBatchEmail",
      subject: document.getElementById('subject').value,
      body: document.getElementById('body').value
    };

    if (modeSingle.checked) {
      payload.toEmail = toEmailInput.value;
    }

    setLoading(true);

    try {
      // POST to Google Apps Script
      const response = await fetch(GAS_URL, {
        method: "POST",
        mode: "cors", // no-cors does not let us read JSON response, Google allows 'cors' if code handles it or uses redirect trick
        // Actually, direct POST to GAS web app works if the web app returns CORS headers (we'll assume the Apps Script handles it via redirect)
        // Wait: The easiest way to receive complex JSON back from Apps Script safely is passing data as text/plain.
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload)
      });

      const res = await response.json();
      
      if (res.success) {
        showStatus(res.message + " (Quota remaining: " + res.remainingQuota + ")", "success");
        mailerForm.reset();
        updateMode();
      } else {
        showStatus(res.message || "Failed to send email.", "error");
      }
    } catch (err) {
      showStatus("Network Error: " + err.message + ". Check console for details.", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  });

  function showStatus(text, type) {
    statusMessage.textContent = text;
    statusMessage.className = `status-message status-${type}`;
  }

  function setLoading(isLoading) {
    if (isLoading) {
      sendBtn.disabled = true;
      sendIcon.textContent = "⏳";
      sendIcon.classList.add('spin');
      sendText.textContent = "Sending...";
      statusMessage.className = 'status-message hidden';
    } else {
      sendBtn.disabled = false;
      sendIcon.textContent = "✉️";
      sendIcon.classList.remove('spin');
      sendText.textContent = "Send Email";
    }
  }
});
