# Centralized SAS Repository

A single entry point to access all your SAS systems. Open `index.html` in a browser to use the dashboard.

## Features

- **Home** – Landing page with a short overview and system count.
- **Left navbar** – Lists all systems; click to open the system page or an external URL.
- **Systems** – Defined in `systems/config.json`; each system can have a description and a link (SAS Viya app, report, or local path).

## Adding systems

Edit `systems/config.json`. Each system is an object with:

| Field         | Required | Description |
|---------------|----------|-------------|
| `id`          | Yes      | Unique slug (used in URL hash, e.g. `#my-system`). |
| `name`        | Yes      | Label shown in the navbar. |
| `description` | No       | Shown on the system’s page. |
| `url`         | No       | Link to open (use `#` for no link). |
| `external`    | No       | If `true`, opens in a new tab. |

### Example

```json
[
  {
    "id": "viya-reporting",
    "name": "Viya Reporting",
    "description": "Main reporting app on SAS Viya.",
    "url": "https://your-viya-server/SASReportViewer",
    "external": true
  },
  {
    "id": "local-docs",
    "name": "Local Documentation",
    "description": "Docs for SAS programs in this repo.",
    "url": "docs/README.html",
    "external": false
  }
]
```

You can also use an object with a `systems` array:

```json
{
  "systems": [
    { "id": "my-system", "name": "My System", "url": "#" }
  ]
}
```

## Running locally

- **Option 1:** Open `index.html` directly in the browser.  
  Note: `fetch('systems/config.json')` may be blocked by some browsers when using `file://`. If the systems list doesn’t load, use Option 2.
- **Option 2:** Serve the folder with a local server, e.g.  
  `python -m http.server 8000` or `npx serve .`  
  Then open `http://localhost:8000`.

## Deploying to Vercel

This repo is a static site, so Vercel deployment is straightforward.

- **What gets deployed**: the dashboard at `/` (`index.html`), plus any apps under `/apps/` (like your PWA).
- **PWA shortcut route**: `vercel.json` adds rewrites so your Attendance Scanner is reachable at `/pwa/` and `/attendance-scanner/` (they map to `/apps/attendance-scanner/`).

### Steps

1. Push this repository to GitHub/GitLab/Bitbucket.
2. In Vercel, click **New Project** and import the repo.
3. Configure as:
   - **Framework Preset**: Other
   - **Build Command**: None
   - **Output Directory**: `.`
4. Deploy.

After deploy:

- **Dashboard**: `/`
- **PWA**:
  - `/apps/attendance-scanner/` (direct folder)
  - `/attendance-scanner/` (friendly shortcut)
  - `/pwa/` (legacy shortcut)

## Structure

```
Centralized_SAS_repository/
├── index.html      # Dashboard (home + navbar)
├── styles.css      # Layout and theme
├── app.js          # Loads config, renders nav and system pages
├── README.md
├── vercel.json     # Vercel rewrites + service-worker cache headers
└── systems/
    └── config.json # List of systems (edit this to add/change systems)
```
