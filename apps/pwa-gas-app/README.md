# PWA + Google Apps Script app

Place your progressive web app here:

- **HTML** – e.g. `index.html` (main entry point)
- **CSS** – your stylesheets
- **GAS** – keep your Google Apps Script deployment URL in your HTML/JS (e.g. `google.script.run` or fetch to your published web app URL)

This app is linked from the Centralized SAS Repository navbar. The repo dashboard links to `index.html` in this folder.

## If your app is already in another folder

Either:
1. Copy or move your PWA files into this folder, or  
2. Edit `systems/config.json` in the repo root and set the system’s `url` to the path of your existing folder’s main HTML file (e.g. `../path/to/your-app/index.html`).
