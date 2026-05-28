# SAS Portal

The **Student Affairs and Services (SAS) Portal** is the centralized web application used by Northern Bukidnon State College. It provides a single unified interface for managing student data, attendance, scheduling, file distribution, and messaging. 

The portal is designed for administrative staff, but it also features a dedicated TV Display Mode for broadcasting announcements on campus televisions.

---

## Included Modules

The portal consists of several integrated applications located in the `apps/` directory:

- **Account Manager:** Provisions user accounts and manages administrative roles.
- **Analytics:** Generates utilization reports and visual analytics for SAS services.
- **Attendance Scanner:** A mobile-friendly PWA for entrance points to scan student IDs.
- **Attendance Viewer:** An interface for staff to browse, search, and export attendance logs.
- **Docs:** Centralized documentation and user guides for the system.
- **File Hub:** A document management system integrating with Google Drive and Firebase Storage.
- **Mailer:** A tool for composing and sending administrative emails.
- **Masterlist Manager:** Handles bulk imports (CSV, JSON, PDF) to update the student database.
- **Schedule Manager:** Configures the active "check-in windows" used by the Attendance Scanner.
- **Service Manager:** Configures and administers various SAS services.
- **Service Viewer:** Provides a read-only view of active services and their status.

### Module Dependency Map

```mermaid
graph LR
    GAS[backend.gs<br/>GAS API]

    FH[File Hub] -->|upload / getFiles| GAS
    FH -->|file bytes| GDrive[Google Drive API]
    FH -->|file bytes| FBStorage[Firebase Storage]

    Scanner[Attendance Scanner] -->|validation| GAS
    GAS -->|lookup| Supabase[(Supabase)]

    Viewer[Attendance Viewer] -->|getLogs| GAS
    ScheduleMgr[Schedule Manager] -->|direct| Supabase
    MasterlistMgr[Masterlist Manager] -->|upsert| Supabase

    Messaging[Messaging] -->|read/write| FBRTDB[Firebase RTDB]

    TV[TV Mode] -->|fetch items| GAS
    TV -->|weather| OpenMeteo[Open-Meteo API]
    
    Analytics[Analytics] -->|utilization data| GAS
    ServiceMgr[Service Manager] -->|config| GAS
    ServiceViewer[Service Viewer] -->|read| GAS
    Docs[Docs] -->|static| Client[PWA Client]
    AccountMgr[Account Manager] -->|provision| GAS
    Mailer[Mailer] -->|send| GAS
```

## System Architecture

The project is structured as a client-side web application supported by centralized APIs.

```mermaid
graph TD
    A[Browser / PWA Shell<br/>index.html + serviceWorker.js] --> B[src/ Runtime Layer]
    B --> C[apps/ Sub-Applications]
    C --> D[backend.gs<br/>Google Apps Script API]
    D --> E[Supabase<br/>PostgreSQL Database]
    D --> F[Firebase RTDB<br/>Real-time Messaging]
    D --> G[Google Drive & Firebase Storage<br/>File Hub]
    B --> F
```

### Technology Stack
- **Frontend Core:** HTML5, CSS (Vanilla), JavaScript
- **Offline Support:** Progressive Web App (PWA) with Service Worker caching
- **Backend API:** Google Apps Script (`backend.gs`) acting as the REST API
- **Database:** Supabase (PostgreSQL) for student records, schedules, and attendance logs
- **Real-time Services:** Firebase Realtime Database for the internal messaging system
- **File Storage:** Google Drive and Firebase Storage
- **Hosting:** Configured for Vercel deployment (`vercel.json`)

## Codebase Statistics

Based on the latest GitNexus index scan (May 2026):
- **Files:** 78
- **Symbols/Nodes:** 3,147 tracked components
- **Execution Flows:** 200 traced workflows

## Repository Structure

```text
Centralized_SAS_repository/
├── index.html                  # Main portal shell, TV mode, and navigation host
├── styles.css                  # Global design system and layout styles
├── manifest.webmanifest        # PWA configuration
├── serviceWorker.js            # Offline caching logic
├── systems.json                # Defines the routing and URLs for all modules
├── env.example.js              # Environment variables template
├── backend.gs                  # Google Apps Script API source
│
├── src/                        # Shared runtime scripts
│   ├── main.js                 # Bootstraps authentication and UI
│   ├── core/                   # Firebase and session management
│   ├── features/               # TV clock and Messaging logic
│   └── utils/                  # Cross-frame communication bridges
│
└── apps/                       # Individual sub-applications
    ├── account-manager/
    ├── analytics/
    ├── attendance-scanner/
    ├── attendance-viewer/
    ├── docs/
    ├── file-hub/
    ├── mailer/
    ├── masterlist-manager/
    ├── schedule-manager/
    ├── service-manager/
    └── service-viewer/
```

## Setup & Configuration

1. **Environment Variables:** 
   Copy `env.example.js` to `env.js` and fill in the required keys (`BACKEND_GAS_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and Firebase configurations).
2. **Local Development:**
   Run the setup script to initialize the environment:
   ```bash
   node scripts/dev-setup.js
   ```
   Start your preferred local server (e.g., `npx serve`) in the repository root.
3. **Diagnostics:**
   To verify that the backend API and database connections are working:
   ```bash
   node scripts/ci-connection-check.js
   ```
