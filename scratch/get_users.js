const https = require('https');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables must be set.");
  process.exit(1);
}

const url = `${supabaseUrl}/rest/v1/sas_accounts?select=username,role,status`;
const key = supabaseKey;

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
