const https = require('https');

const url = "https://wdesptodbtoibkxirveb.supabase.co/rest/v1/sas_accounts?select=username,role,status";
const key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndkZXNwdG9kYnRvaWJreGlydmViIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY0NTU1NCwiZXhwIjoyMDkyMjIxNTU0fQ.bvRMkV_NE2XQUktJUrKll22Utoh06034HsWZcneTQK0";

const req = https.get(url, {
  headers: {
    "apikey": key,
    "Authorization": "Bearer " + key
  }
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    try {
      const data = JSON.parse(body);
      console.log("Accounts:", data);
    } catch(e) {
      console.log("Response:", body);
    }
  });
});
req.on('error', (err) => console.error(err));
