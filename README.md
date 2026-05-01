# SAS Portal — Centralized Repository

The **SAS Portal** is a centralized, high-performance gateway that unifies access to the entire ecosystem of SAS systems. It serves as a secure and interactive hub where data management, reporting, scheduling, file management, and real-time announcements converge into a single cohesive interface.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Application Modules](#application-modules)
- [Codebase Composition](#codebase-composition)
- [Key Execution Flows](#key-execution-flows)
- [Technology Stack](#technology-stack)
- [Configuration](#configuration)
- [Scripts](#scripts)

---

## Overview

The portal is designed for dual-environment deployment: an administrative dashboard for staff use and an immersive 1080p display mode for common-area TV screens. All data operations are routed through a centralized Google Apps Script (GAS) backend, with Firebase providing real-time capabilities for messaging and scanner synchronization.

---

## Architecture

The system follows a layered architecture separating frontend presentation, feature modules, core services, and the backend API.

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client (Browser)                         │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ index.html│  │  styles.css  │  │      manifest.json       │  │
│  │ (PWA Host)│  │  (Global UI) │  │  (PWA + Offline Config)  │  │
│  └────┬─────┘  └──────────────┘  └──────────────────────────┘  │
│       │                                                         │
│  ┌────▼──────────────────────────────────────────────────────┐  │
│  │                     src/ (Core Runtime)                    │  │
│  │                                                           │  │
│  │  ┌─────────────┐  ┌──────────────────┐  ┌─────────────┐  │  │
│  │  │  core/      │  │  features/       │  │  utils/     │  │  │
│  │  │  auth.js    │  │  messaging/      │  │  app-bridge │  │  │
│  │  │  firebase.js│  │  tv/             │  │  cloudinary │  │  │
│  │  └─────────────┘  └──────────────────┘  │  dom.js     │  │  │
│  │                                         └─────────────┘  │  │
│  │  ┌─────────────┐  ┌──────────────────┐                   │  │
│  │  │  ui/        │  │  main.js         │                   │  │
│  │  │ navigation  │  │  legacy.js       │                   │  │
│  │  └─────────────┘  └──────────────────┘                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    apps/ (Sub-applications)                │ │
│  │  attendance-viewer  |  file-hub  |  schedule-manager       │ │
│  │  masterlist-manager |  mailer    |  attendance-scanner     │ │
│  │  account-manager    |  landing-template                    │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   Google Apps Script │
                    │     Backend.gs       │
                    │  (REST API + Sheets) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
   ┌──────────▼───┐  ┌─────────▼──────┐  ┌─────▼──────────┐
   │ Google Sheets │  │ Firebase RTDB  │  │ Google Drive   │
   │ (Data Store)  │  │ (Realtime Sync)│  │ (File Storage) │
   └───────────────┘  └────────────────┘  └────────────────┘
```

---

## Repository Structure

```
Centralized_SAS_repository/
│
├── index.html                  # Portal shell and PWA host
├── styles.css                  # Global stylesheet
├── manifest.json               # PWA manifest
├── serviceWorker.js            # Service worker for offline caching
├── systems.json                # Navigation and module configuration
├── version.json                # Build version tracking
├── vercel.json                 # Deployment routing rules
├── env.js                      # Runtime environment variables
├── env.example.js              # Environment template
├── Backend.gs                  # Google Apps Script backend (centralized API)
│
├── src/                        # Core shared runtime
│   ├── main.js                 # Application bootstrap
│   ├── legacy.js               # Monolith feature code (being modularized)
│   ├── core/
│   │   ├── auth.js             # Authentication logic
│   │   └── firebase.js         # Firebase initialization
│   ├── features/
│   │   ├── messaging/          # Shared messenger (logic, state, UI)
│   │   └── tv/                 # TV immersive mode (clock, polling)
│   ├── ui/
│   │   └── navigation.js       # Nav rendering and routing
│   └── utils/
│       ├── app-bridge.js       # Cross-frame communication bridge
│       ├── cloudinary.js       # Cloudinary media utilities
│       └── dom.js              # DOM helper utilities
│
├── apps/                       # Self-contained sub-applications
│   ├── attendance-viewer/      # Attendance log browsing and filtering
│   ├── attendance-scanner/     # Student scan interface (PWA)
│   ├── file-hub/               # File browsing, upload, and management
│   ├── schedule-manager/       # Event scheduling and calendar view
│   ├── masterlist-manager/     # Student masterlist CRUD
│   ├── mailer/                 # Email composition interface
│   ├── account-manager/        # User account administration
│   └── landing-template/       # Reusable landing page template
│
├── scripts/                    # Developer and CI utility scripts
│   ├── ci-connection-check.js
│   ├── ci-syntax-check.js
│   ├── dev-setup.js
│   ├── stress-test.js
│   └── system-diagnostic.js
│
└── .claude/                    # AI agent skill definitions (GitNexus)
```

---

## Application Modules

| Module                | Path                         | Description                                                                 | Backend-Routed |
|-----------------------|------------------------------|-----------------------------------------------------------------------------|----------------|
| **Attendance Viewer** | `apps/attendance-viewer/`    | Browses, filters, and exports attendance logs from Google Sheets            | Yes            |
| **Attendance Scanner**| `apps/attendance-scanner/`   | PWA scan interface; syncs to backend via GAS API; unknown students captured in `rejected_scans` | Yes |
| **File Hub**          | `apps/file-hub/`             | Full file management — Google Drive integration, Firebase drafts, Cloudinary media, legacy support | Yes |
| **Schedule Manager**  | `apps/schedule-manager/`     | Event scheduling, calendar display, and event CRUD                          | Yes            |
| **Masterlist Manager**| `apps/masterlist-manager/`   | Student record management; source of truth for scanner validation           | Yes            |
| **Mailer**            | `apps/mailer/`               | Compose and send administrative emails via GAS                              | Yes            |
| **Account Manager**   | `apps/account-manager/`      | User account provisioning and role assignment                               | Yes            |
| **Landing Template**  | `apps/landing-template/`     | Reusable base template for onboarding new sub-application UIs               | No             |

---

## Codebase Composition

Based on the current GitNexus index (as of 2026-05-01, commit `177bdf4c`):

| Metric             | Value   |
|--------------------|---------|
| Indexed files      | 53      |
| Symbol nodes       | 1,744   |
| Relationship edges | 2,538   |
| Functional clusters| 66      |
| Execution flows    | 102     |

### Named Functional Clusters

Clusters are auto-detected semantic groupings of tightly coupled symbols.

| Cluster               | Symbols | Cohesion | Description                                          |
|-----------------------|---------|----------|------------------------------------------------------|
| File-hub              | 45      | 100%     | File browsing, upload, Firebase drafts, Drive, Cloudinary |
| Attendance-viewer     | 11      | 100%     | Attendance log rendering and filtering               |
| Messaging             | 8       | 95%      | Shared and full messenger initialization and rendering |
| Tv                    | 7       | 92%      | TV immersive mode, media polling, clock display      |
| Schedule-manager      | 7       | 100%     | Event scheduling, calendar rendering, state management |
| Masterlist-manager    | 5       | 100%     | Student masterlist CRUD and validation               |

---

## Key Execution Flows

The following are the primary tracked execution flows across the codebase. Cross-community flows span multiple functional clusters; intra-community flows are self-contained.

```
Messaging Flows
───────────────
  InitSharedMessaging  ──(6 steps)──>  RenderFullContacts    [cross-community]
  InitUserMessaging    ──(6 steps)──>  RenderFullContacts    [cross-community]
  InitFullMessenger    ──(5 steps)──>  RenderFullContacts    [intra-community]
  InitSharedMessaging  ──(4 steps)──>  GetEl                 [cross-community]

TV / Media Flows
────────────────
  StartYTPolling       ──(5 steps)──>  EscapeHtml            [cross-community]
  StartYTPolling       ──(5 steps)──>  GetYouTubeVideoId     [cross-community]
  StartYTPolling       ──(5 steps)──>  GetFacebookVideoUrl   [cross-community]
  StartYTPolling       ──(5 steps)──>  GetDriveId            [cross-community]
  FinishInit           ──(4 steps)──>  GetYouTubeVideoId     [cross-community]
  FinishInit           ──(4 steps)──>  GetFacebookVideoUrl   [cross-community]

Schedule Flows
──────────────
  FetchEvents          ──(5 steps)──>  SetState              [intra-community]
  FetchEvents          ──(5 steps)──>  BuildHeaders          [intra-community]
  FetchEvents          ──(5 steps)──>  RenderTable           [intra-community]
  Init                 ──(4 steps)──>  RenderTable           [intra-community]

Application Init Flows
──────────────────────
  ShowAppUI            ──(4 steps)──>  Cleanup               [cross-community]
  ShowAppUI            ──(4 steps)──>  ShowToast             [cross-community]
  ShowAppUI            ──(4 steps)──>  SyncTvSettingsUI      [cross-community]
  ShowAppUI            ──(4 steps)──>  SetViewMode           [cross-community]
  RenderNav            ──(4 steps)──>  EscapeHtml            [cross-community]

File Hub Flows
──────────────
  HandleFileSelection  ──(4 steps)──>  StopPreviewCycling    [intra-community]
```

---

## Technology Stack

| Layer           | Technology                              | Purpose                                          |
|-----------------|-----------------------------------------|--------------------------------------------------|
| Frontend Shell  | HTML5, Vanilla CSS, Vanilla JS          | Portal host, navigation, PWA wrapper             |
| Backend API     | Google Apps Script (Backend.gs)         | Data access, validation, Sheets integration      |
| Realtime Layer  | Firebase Realtime Database              | Messaging sync, scanner event streaming          |
| File Storage    | Google Drive + Cloudinary               | Document storage and media asset delivery        |
| Offline Support | Service Worker + Cache API              | PWA caching and background update mechanism      |
| Deployment      | Vercel                                  | Static hosting with route configuration          |
| Code Intelligence | GitNexus                              | Symbol graph, impact analysis, execution flow tracking |

---

## Configuration

| File              | Purpose                                                                 |
|-------------------|-------------------------------------------------------------------------|
| `env.js`          | Runtime environment variables (API URLs, Firebase config, feature flags)|
| `env.example.js`  | Template — copy and populate before running locally                     |
| `systems.json`    | Defines portal navigation entries, module metadata, and iframe targets  |
| `version.json`    | Current build version used by the service worker for cache busting      |
| `vercel.json`     | URL rewrite rules for Vercel deployment routing                         |
| `manifest.json`   | PWA manifest — icons, display mode, theme color                         |

---

## Scripts

| Script                      | Purpose                                                        |
|-----------------------------|----------------------------------------------------------------|
| `scripts/dev-setup.js`      | Initializes local development environment                      |
| `scripts/ci-connection-check.js` | Validates backend API connectivity in CI                  |
| `scripts/ci-syntax-check.js`| Runs static syntax validation across JS files                  |
| `scripts/stress-test.js`    | Load and concurrency testing for the backend API               |
| `scripts/system-diagnostic.js` | End-to-end health check across all connected services       |

---

*SAS Portal — Centralized_SAS_repository*
