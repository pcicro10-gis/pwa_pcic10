# PCIC RO10 Digital Insurance Application
## Technical Documentation

**Version:** 1.4.1
**Last Updated:** March 18, 2026
**Prepared by:** PCIC RO10 Management Systems Division (MSD)
**Maintained at:** [davegepalago02-ai/pwa_pcic10](https://github.com/davegepalago02-ai/pwa_pcic10)
**Live URL:** [https://davegepalago02-ai.github.io/pwa_pcic10/](https://davegepalago02-ai.github.io/pwa_pcic10/)

---

## Table of Contents
1. [Project Overview](#1-project-overview)
2. [Technology Stack](#2-technology-stack)
3. [Project File Structure](#3-project-file-structure)
4. [Database Architecture (IndexedDB)](#4-database-architecture-indexeddb)
5. [Application Architecture & Views](#5-application-architecture--views)
6. [Core Function Reference](#6-core-function-reference)
7. [Service Worker & PWA Caching](#7-service-worker--pwa-caching)
8. [How to Update the Application](#8-how-to-update-the-application)
9. [How to Import & Manage Data](#9-how-to-import--manage-data)
10. [Version History & Changelog](#10-version-history--changelog)
11. [Known Limitations & Future Work](#11-known-limitations--future-work)
12. [Troubleshooting Guide](#12-troubleshooting-guide)

---

## 1. Project Overview

The **PCIC RO10 Digital Insurance Application** is an offline-capable Progressive Web App (PWA) designed for field use by PCIC Regional Office X (Cagayan de Oro) Underwriters and partner agents. It digitizes the insurance application process across four insurance lines — Crop, ADSS, Livestock, and Banca — enabling agents to complete, generate, and download PDF application forms directly on their devices without requiring a constant internet connection.

### Key Characteristics
| Property | Value |
|---|---|
| Application Type | Progressive Web App (PWA) |
| Architecture | Single-Page Application (SPA), offline-first |
| Target Users | PCIC Underwriters and Partner Agents, RO10 |
| Data Storage | 100% local (IndexedDB on the device) |
| Internet Required | Only for initial install and updates |
| Platform | Works on Android tablets, iOS, and Desktop Chrome |
| Institution | Philippine Crop Insurance Corporation, Regional Office X |

---

## 2. Technology Stack

| Category | Technology | Purpose |
|---|---|---|
| Structure | HTML5 | Application shell and all view layouts |
| Logic | JavaScript (ES6+) | All application logic and state management |
| Styling | CSS3 | Layout, themes, responsive design |
| Database | IndexedDB via **Dexie.js** | Local offline data storage |
| PDF Export | **jsPDF** + **jsPDF-AutoTable** | Generating application form PDFs |
| PWA | Web App Manifest + Service Worker | Offline caching and installation |
| CSV Parsing | **PapaParse** | Parsing imported CSV data |
| Signature | **signature_pad.js** | Digital signature capture |
| QR Scanner | **qr-scanner.umd.min.js** | QR code scanning for farmer lookup |
| Icons | **Font Awesome 6** (self-hosted) | UI icons throughout the app |
| Hosting | **GitHub Pages** | Free static site deployment |

> All third-party libraries are **bundled locally** in the `lib/` folder. The app does not depend on any external CDNs, ensuring it works offline after first load.

---

## 3. Project File Structure

```
pwa_pcic10/
├── index.html                  # Main app shell — all views and modals in one file
├── script.js                   # Core application logic (~4,600 lines)
├── style.css                   # All visual styling (~64KB)
├── manifest.json               # PWA installation configuration
├── service-worker.js           # Offline caching (Cache-first strategy)
│
├── app_updates.js              # ⭐ EDIT THIS to update announcements & release notes
├── pdf_templates.js            # All PDF form layout definitions (~2.2MB)
│
├── asset/
│   ├── logo.png                # Main app logo (192x192 & 512x512 for PWA icons)
│   ├── sidebar_logo.png        # Sidebar logo
│   └── PCIC RO10 User Guide.pdf  # User guide (accessible from app)
│
├── lib/
│   ├── dexie.min.js            # Dexie.js (IndexedDB wrapper)
│   ├── jspdf.umd.min.js        # jsPDF library
│   ├── jspdf.plugin.autotable.min.js  # jsPDF table plugin
│   ├── papaparse.min.js        # CSV parser
│   ├── signature_pad.js        # Digital signature pad
│   ├── qr-scanner.umd.min.js  # QR code scanner
│   └── font-awesome/           # Font Awesome icons (self-hosted)
│
└── Preprocessing_Hub/          # Separate batch pre-processing sub-module
```

### Key File Descriptions

| File | Description |
|---|---|
| `index.html` | Single HTML file containing all 7 main views, all modals, and the sidebar. Views are shown/hidden by JavaScript. |
| `script.js` | The heart of the application. Contains all business logic: farmer search, form submission, PDF generation triggering, history management, settings, addresses, and UI event handlers. |
| `style.css` | All CSS including the dashboard glassmorphism design, satellite hero background, responsive layouts, and modals. |
| `app_updates.js` | Contains two JavaScript constants: `APP_ANNOUNCEMENT` and `APP_RELEASE_NOTES`. Edit these when publishing a new version. |
| `pdf_templates.js` | Stores all the base64-encoded image data and layout definitions needed to generate the official PDF forms. |
| `service-worker.js` | Registers a cache and stores all app assets for offline use. Uses Cache-first strategy. |

---

## 4. Database Architecture (IndexedDB)

The app uses **Dexie.js** as its primary library to manage the client-side database. All application data is stored locally on the device.

### 4.1 Primary Database — Dexie.js (`PCIC_Offline_DB_V6`)

Initialized in `script.js`:

```javascript
const db = new Dexie("PCIC_Offline_DB_V6");
db.version(2).stores({
    profiles: "FarmersID, LastName, FirstName, RSBSAID, Municipality, Province, Barangay",
    records:  "++id, FARMERSID, FarmersID, CICNO, PROGRAMTYPE",
    apps:     "++id, FarmersID, LastName, CropType, Month",
    settings: "key",
    hvc_rates: "name"
});
```

| Store | Primary Key | Indexed Fields | Purpose |
|---|---|---|---|
| `profiles` | `FarmersID` | LastName, FirstName, RSBSAID, Municipality, Province, Barangay | All imported farmer profile records |
| `records` | auto-increment `id` | FARMERSID, FarmersID, CICNO, PROGRAMTYPE | Historical insurance records (from PCIC main database) |
| `apps` | auto-increment `id` | FarmersID, LastName, CropType, Month | New insurance applications created in-app |
| `settings` | `key` | — | App settings (e.g., underwriter name, last version seen, PDF layouts) |
| `hvc_rates` | `name` | — | High Value Crop insurance rates (seeded with 40+ defaults) |

#### Important `apps` Store Schema
Each record in `db.apps` stores the full application form data. Key fields include:

| Field | Type | Description |
|---|---|---|
| `id` | Integer (auto) | Unique application ID |
| `FarmersID` | String | Farmer's RSBSA/National ID |
| `InsuranceLine` | String | One of: `Crop`, `ADSS`, `Livestock`, `Banca` |
| `CropType` | String | Crop name or insurance sub-type |
| `AmountCover` | Number | Insurance coverage amount in PHP |
| `timestamp` | ISO Date String | Date/time of application creation |
| `Signature` | Base64 String | Farmer's digital signature image (PNG) |
| `Photo` | Base64 String | Farmer's portrait photo (JPEG) |

### 4.2 localStorage Keys

Small configuration values are stored in `localStorage` (not IndexedDB):

| Key | Purpose |
|---|---|
| `pcic_device_id` | Unique identifier for the device (auto-generated on first run) |
| `pcic_agent_name` | Saved underwriter/agent name (persists across sessions) |
| `pcic_last_seen_version` | Last app version the user acknowledged (to control update banner) |

---

## 5. Application Architecture & Views

### 5.1 Single-Page Application Structure
The entire application is contained in **one HTML file** (`index.html`). All six "pages" are `<div>` elements with `class="content-area"`. The function `showView(viewId)` in `script.js` toggles their visibility by adding/removing the `active` CSS class.

**Navigation:** The sidebar on the left lists all views. On mobile/tablet, the sidebar collapses and is toggled via the hamburger icon (`toggleSidebar()`).

### 5.2 Available Views

| View ID | Sidebar Label | Description |
|---|---|---|
| `welcome` | 🏠 Home | Landing page with satellite hero, announcement banner, 3-column footer, brochure and user guide access |
| `enrollment` | 📝 Search Farmer | Farmer search by RSBSA ID, name, and address. Displays results and history before opening a form. |
| `enrollment-form` | 📋 Enrollment Form | The actual insurance application form. Filled after selecting a farmer from the Search view. Includes signature capture and PDF generation. |
| `summary` | 📊 Summary | Monthly performance dashboard, insurance line stats, CSV export of applications |
| `settings` | ⚙️ Settings | Underwriter name, CSV import (profiles and records), crop rates management, system tools (Hard Refresh) |
| `preprocessing` | 🗂️ Preprocessing Hub | Batch CSV generation for pre-processing slips and transmittal lists across all insurance lines |
| `about` | ℹ️ Help / About | App info, update release notes log |

### 5.3 Insurance Line Hierarchy

The app supports **4 insurance lines**, each with sub-types. This hierarchy is defined by the `INSURANCE_HIERARCHY` constant in `script.js`:

```
Crop
├── Rice: Irrigated, Rainfed, Upland
├── Corn: Yellow Corn, White Corn
└── [All other crops from db.hvc_rates] → High Value Crops (HVC)

Livestock
├── Swine: Fattening, Breeding
├── Goat: Fattening, Breeding
├── Sheep: Fattening, Breeding
├── Poultry: I. Grower, C. Grower, Integrator, Pullet, Chicken Layer, Duck Layer, Quail Layer
├── Cattle: Draft, Dairy, Fattening, Breeding
├── Carabao: Draft, Dairy, Fattening, Breeding
├── Horse: Draft
└── Others (Free text)

ADSS (Agricultural Data Steward System)

Banca (Fisheries)
├── Motorized: Wood, Fiberglass
└── Non-Motorized: Wood, Fiberglass
```

### 5.4 Enrollment Workflow

### 5.4 Enrollment Workflow (Simplified Flow)

The application uses a **Simplified Flow** where picking a farmer goes straight to the enrollment form, removing legacy popups and redundant confirmation steps.

1.  **Search** — Underwriter searches for a farmer by RSBSA ID, Name, or Address in the `enrollment` (Search Farmer) view.
2.  **Pick Farmer** — Select a farmer from the results. This triggers `pickFarmer(id)`, which fetches both historical records from CSV imports and previous in-app applications.
3.  **Auto-Load Form** — The view switches automatically to `enrollment-form`. 
    -   **Farmer Info (Step 1)** is pre-filled. Profile farmers have locked IDs, while "Walk-In" applicants have editable IDs.
4.  **Policy Selection (Step 2)** — The underwriter selects the **Insurance Line** (Crop, ADSS, Livestock, or Banca).
5.  **Farm/Details (Step 3)** —
    -   **For Crop:** A "Farm Selector" dropdown appears if the farmer has history. Selecting a previous farm automatically fills the Location, Area, and Boundaries.
    -   **For other lines:** Specific detail sections (e.g., Vessel details for Banca) are filled.
6.  **Signature (Step 4)** — The farmer reviews the summary and signs on the digital signature pad. A "Full Screen" mode is available for better capture on small devices.
7.  **Finalize** — Click "FINALIZE & DOWNLOAD FORM (PDF)". The app validates inputs, saves the record to `db.apps` for history, and generates the finalized PDF form.

---

## 6. Core Function Reference

### 6.1 Initialization Functions (`script.js`)

| Function | Description |
|---|---|
| `window.onload` (async) | Main entry point. Runs on page load. Initializes Dexie DB, signature pads, default crop rates, version display, and sets starting view to `welcome`. |
| `initVersionDisplay()` | Updates all version labels (browser tab title, sidebar, footer, update banner) using the `APP_VERSION` constant. Also controls the update banner visibility. |
| `ensureDefaultRates()` | Seeds `db.hvc_rates` with 40+ default High Value Crops (including Rice, Corn, Coconut, etc.) on first run. Safe to call repeatedly — only inserts if missing. |

### 6.2 View & Navigation Functions

| Function | Description |
|---|---|
| `showView(id)` | Toggles the visible content area. Hides all views; shows only the one with the matching `id`. |
| `toggleSidebar()` | Toggles the `sidebar-open` CSS class on `<body>` to show/hide the mobile sidebar. |
| `goToStep(stepId)` | Manages the multi-step navigation (Stepper) within the enrollment form. |
| `toggleAppFullscreen()` | Requests or exits browser fullscreen mode for the entire application. |

### 6.3 Farmer Search & Enrollment

| Function | Description |
|---|---|
| `searchFarmer()` | Queries `db.profiles` based on RSBSA ID, Name, or Address and displays results. |
| `pickFarmer(id)` | Fetches a farmer's profile and history, saves to local state, and loads the enrollment form. |
| `displayEnrollmentFormUI(history)` | Renders the enrollment form with pre-filled farmer data and populates the Farm Selector. |
| `fillPolicyFromRecord(history)` | Auto-fills policy, location, and farm details from a selected historical record. |
| `onFarmSelect(farmId)` | Event handler for the Farm Selector dropdown. Triggers `fillPolicyFromRecord`. |
| `finalizeApplication(mode)` | Validates the form, saves the application to `db.apps`, and triggers PDF generation. |
| `generateIndividualPDF(data)` | The core PDF engine. Uses **jsPDF** to draw data onto a template based on the calibrated layout. |
| `checkGuardianRequirement()` | Automatically toggles the guardian signature section based on the farmer's calculated age. |

### 6.4 History & Log Functions

| Function | Description |
|---|---|
| `refreshLog()` | Fetches applications from `db.apps` and renders the "Recent History" table. |
| `previewSummary()` | Filters applications in the Summary view according to user-selected criteria. |
| `deleteSelectedPreviewItems()` | Bulk deletes selected application records from `db.apps`. |

### 6.5 Summary & Statistics

| Function | Description |
|---|---|
| `renderLineStats()` | Queries `db.apps` and displays insurance line counts (Crop, ADSS, Livestock, Banca) on the Summary dashboard. |
| `refreshHVCRateList()` | Populates the HVC rate management table in Settings from `db.hvc_rates`. |
| `populateUnifiedCropDropdown()` | Builds the unified crop selection dropdown combining the fixed hierarchy and all HVC rates. |

### 6.6 Update & Settings Functions

| Function | Description |
|---|---|
| `showReleaseNotes()` | Shows the release notes popup modal. |
| `closeReleaseNotesModal()` | Closes the release notes modal and marks the current version as seen in `localStorage`. |
| `dismissUpdateBanner(event)` | Dismisses the yellow update banner without opening the modal. |
| `hardRefreshApp()` | **Hard Refresh:** Unregisters all service workers, clears all service worker caches, then calls `window.location.reload(true)`. Use when the app is stuck on an old version. |
| `sendFeedback()` | Opens the user's email app pre-filled with an issue report addressed to `ro10msd@pcicgov.onmicrosoft.com`. |

### 6.7 Data Import & Management

| Function | Description |
|---|---|
| `importData(type, input)` | The primary CSV import engine. Parses headers, validates rows, and writes to IndexedDB with a progress bar. |
| `generateSummary(fmt)` | Exports filtered applications from the Summary view to either CSV or PDF format. |

---

## 7. Service Worker & PWA Caching

### 7.1 Cache Strategy: Cache-First
When a resource is requested, the service worker checks the cache first. If found, it serves the cached version immediately (fast, works offline). If not in cache, it tries to fetch from the network.

### 7.2 Cached Resources
All of the following are cached on first install (`service-worker.js` lines 2-35):
- `index.html`, `style.css`, `script.js`, `manifest.json`
- `pdf_templates.js`, `app_updates.js`
- `asset/logo.png`, `asset/sidebar_logo.png`, `asset/PCIC RO10 User Guide.pdf`
- Font Awesome CSS and all font files (self-hosted)
- All third-party libraries in `lib/`

### 7.3 Service Worker Update Lifecycle
The app uses an **automatic update mechanism** in `script.js` (lines 308-347):
1. On page load, the app registers `service-worker.js`
2. If a new SW is detected (from a recent `git push`), it sends a `SKIP_WAITING` message to the new worker
3. The new SW skips the waiting phase immediately
4. The page reloads automatically so fresh files are served

### 7.4 How to Deploy an Update (Summary)
```
Step 1: Edit your code files
Step 2: Update APP_VERSION in script.js (e.g., "1.4.1" → "1.5.0")
Step 3: Update CACHE_NAME in service-worker.js (e.g., 'pcic-app-v1.3.3' → 'pcic-app-v1.5.0')
Step 4: Update APP_RELEASE_NOTES in app_updates.js
Step 5: git add . → git commit → git push origin main
Step 6: GitHub Pages auto-deploys within ~60 seconds
```
Users will see the app auto-refresh on their next visit, or they can use **Hard Refresh** in Settings.

---

## 8. How to Update the Application

This section is a practical guide for the next developer or maintainer.

### 8.1 Update the Announcement Banner
Open `app_updates.js` and edit the `APP_ANNOUNCEMENT` variable:
```javascript
const APP_ANNOUNCEMENT = `⚠️ <strong>Your new message here.</strong> Additional details.`;
```

### 8.2 Add a Release Note Entry
Open `app_updates.js` and prepend a new version block at the top of `APP_RELEASE_NOTES`:
```javascript
const APP_RELEASE_NOTES = `
<strong>v1.5.0 (YYYY-MM-DD)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>[FEAT] Description of new feature.</li>
    <li>[FIX] Description of bug fix.</li>
</ul>

<strong>v1.4.1 (2026-03-17)</strong>
... (previous notes remain below)
```

### 8.3 Add a New High Value Crop
Open `script.js` and find the `ensureDefaultRates()` function. Add a new entry to the `defaults` array:
```javascript
{ name: 'YourCropName', rate: 75000 }
```
The rate is the default **Amount of Cover** in Philippine Peso (PHP).

### 8.4 Change Insurance Rates
The HVC rates can also be directly edited through the app's **Settings → Crop Rates** section without touching the code.

### 8.5 Bump the Version Number
Update in **two places**:
1. `script.js` line 6: `const APP_VERSION = "1.5.0";`
2. `service-worker.js` line 1: `const CACHE_NAME = 'pcic-app-v1.5.0';`

### 8.6 Add a New Service Worker Cached File
If you add a new `.js` file to the project, add it to the `urlsToCache` array in `service-worker.js`:
```javascript
const urlsToCache = [
    'index.html',
    'your-new-file.js',   // ← Add here
    ...
];
```

### 8.7 Deploy to GitHub Pages
```bash
git add .
git commit -m "feat: Description of changes"
git push origin main
```
GitHub Actions automatically deploys commits to `main` branch to the live URL.

---

## 9. How to Import & Manage Data

### 9.1 Importing Farmer Profiles
1. Go to **Settings** in the app
2. Under "Import Data", click **"Choose File"** next to "Import Profiles"
3. Select your `.csv` file
4. The app will validate the records and show an import summary

**Required CSV columns for Profiles:**
| Column | Required | Description |
|---|---|---|
| `FarmersID` | ✅ | Unique RSBSA or Farmer ID |
| `LastName` | ✅ | Farmer's last name |
| `FirstName` | ✅ | Farmer's first name |
| `MiddlName` | | Middle name |
| `ProvFarmer` | | Province |
| `MunFarmer` | | Municipality |
| `BrgyFarmer` | | Barangay |
| `Mobile` | | Contact number |
| `Birthday` | | Date of birth (YYYY-MM-DD format) |

### 9.2 Importing Insurance History Records
1. Go to **Settings** in the app
2. Under "Import Data", click **"Choose File"** next to "Import Insurance Records"
3. Select your `.csv` file with historical insurance data

**Required CSV columns for Records:**
| Column | Required | Description |
|---|---|---|
| `FarmersID` | ✅ | Farmer ID (must match a profile) |
| `Farmer Name` | ✅ | Full name |
| `Insurance Type` | ✅ | `Crop`, `ADSS`, `Livestock`, or `Banca` |
| `Coverage Amount` | | Amount of insurance cover in PHP |
| `Premium` | | Premium amount in PHP |
| `Application Date` | | Date (YYYY-MM-DD) |
| `Status` | | `Pending` or `Approved` |

### 9.3 Exporting Data
Go to **Summary** → click the export button for the desired insurance type. Exported CSV files are named `PCIC_[type]_[date].csv`.

### 9.4 Clearing Data
In **Settings**, individual data stores can be cleared with the 🗑️ buttons next to each import section. Note: this is irreversible.

---

## 10. Version History & Changelog

| Version | Release Date | Changes |
|---|---|---|
| **v1.4.1** | 2026-03-17 | History redownload limit removed. Hard Refresh button in Settings. Coconut added to HVC. Separated announcements/release notes to `app_updates.js`. |
| **v1.4.0** | 2026-03-10 | Pre-processing Hub integrated. NCFRS input field added. Editable farmer address. Auto-clear farm details on new policy. Full-screen signature support. Required field prompt before saving. |
| **v1.3.4** | 2026-02-27 | Replaced individual brochure modals with a unified folder view. |
| **v1.3.0** | 2026-02-25 | Full Home Dashboard UI redesign: satellite background, glassmorphism hero card, SVG sidebar icons, announcement banner, 3-column footer. |
| **v1.2.6** | 2026-02-24 | Relocated brochure access to Home Dashboard; added brochure modal. |
| **v1.2.3** | 2026-02-24 | Updated dynamic PDF generation filename logic per insurance line. |
| **v1.2.2** | 2026-02-24 | Added Update Banner and Release Notes Modal. |
| **v1.1.2** | 2026-01-30 | Embedded the PCIC RO10 logo to the script. |
| **v1.0.2** | 2026-01-29 | Replaced 'Suffix' with 'Middle Name' field. Fixed Save bugs. |
| **v1.0.1** | 2026-01-28 | Added Farm Selector. Fixed blank PDF generation issues. |
| **v1.0.0** | 2026-01-01 | Initial public release. |

---

## 11. Known Limitations & Future Work

### 11.1 Current Limitations

| Limitation | Detail |
|---|---|
| **Local-only data** | All farmer profiles and application records are stored **per device**. There is no central server; each tablet/phone has its own separate database. |
| **Manual CSV distribution** | Currently, DB updates (new farmer profiles) must be manually imported per device via CSV file. |
| **SharePoint embedding blocked** | The brochure viewer attempts to embed a SharePoint URL in an iframe, but SharePoint's `X-Frame-Options: SAMEORIGIN` policy blocks external embedding. The brochure must currently be opened in a new tab. |
| **No server backend** | The app is a pure frontend PWA. There is no server, no authentication, no user accounts, and no real-time sync. |

### 11.2 Planned Future Enhancements

| Feature | Description | Priority |
|---|---|---|
| **Automated DB Sync via Google Drive** | Use Google Apps Script as a free API to distribute farmer CSVs to specific users based on their name, eliminating manual CSV imports. | High |
| **Brochure Curated List** | Replace the iframe-embedded SharePoint folder with a manually managed list of individually shared PDF links in `app_updates.js` (an `APP_BROCHURES` constant). | Medium |
| **Automated DB Sync via OneDrive** | Use Microsoft Power Automate (requires Premium license) as an alternative to Google Apps Script for OneDrive-based CSV distribution. | Medium |
| **User login/assignment** | When the DB sync feature is implemented, add a simple name/ID prompt on first launch to determine which user's data to download. | Medium |

---

## 12. Troubleshooting Guide

### The app is not updating to the latest version
**Cause:** The service worker has cached the old version.
**Fix:**
1. Open the app → **Settings** → tap **"Hard Refresh / Force Update"**
2. The app will clear all service worker caches and reload
3. Alternatively: In the browser, open DevTools → Application → Service Workers → click **"Unregister"**, then hard refresh (`Ctrl+Shift+R`)

### The data (farmers/records) are not showing after CSV import
**Cause:** The CSV file likely has incorrect column headers, or rows failed validation.
**Fix:**
1. Check that your CSV uses the exact column names listed in Section 9
2. Ensure `FarmersID`, `LastName`, and `FirstName` columns are present and not empty
3. Remove any BOM character or special encoding before importing
4. Check the import status message shown below the import button after selection

### The PDF is blank or shows no data
**Cause:** The PDF uses the application data stored at the moment of saving. If the form was incomplete when saved, the PDF will be blank in those fields.
**Fix:**
1. Ensure all required fields are filled before saving (the app will prompt you)
2. To regenerate: go to **History/Log** → find the entry → click the **PDF** button to redownload
3. If still blank, the record may be corrupted. Delete and re-enter the application

### The signature box is not appearing / is too small
**Cause:** The canvas size is set on page load. If the panel was not visible at load time, the canvas may have zero dimensions.
**Fix:**
1. Call `resizeCanvas()` from the browser console, or
2. Navigate away from the Enrollment view and back again—the canvas will resize on re-render

### The app is showing "Database failed to open"
**Cause:** The browser's IndexedDB storage may be full or corrupted, or private/incognito mode may be restricting storage.
**Fix:**
1. Do not use private/incognito mode
2. Clear browser data for the site: Settings → Site Data → Clear for this site
3. Reinstall the PWA (uninstall from Home Screen → reinstall from browser)

### The announcement or release notes are not showing
**Cause:** `app_updates.js` may have a syntax error, preventing the DOM injection from running.
**Fix:**
1. Open `app_updates.js` and check for any unmatched backticks (`` ` ``) or quotes
2. Open the browser console and look for JavaScript errors on the page
3. Ensure `app_updates.js` is included in `index.html` before `script.js`

---

## Appendix: Developer Environment Setup

To make local changes and test before pushing:

### Prerequisites
- **Git** installed and configured
- A code editor (VS Code recommended)
- Any web server for local testing (e.g., VS Code Live Server extension)
- GitHub access to the `davegepalago02-ai/pwa_pcic10` repository

### Clone & Run Locally
```bash
git clone https://github.com/davegepalago02-ai/pwa_pcic10.git
cd pwa_pcic10
# Open with VS Code Live Server or any static web server
# DO NOT open index.html directly as a file:// URL — PWA features require a server
```

### File Editing Workflow
```bash
# 1. Make changes to your files
# 2. Test locally using VS Code Live Server
# 3. Stage and commit
git add .
git commit -m "type(scope): short description"
# e.g.: git commit -m "feat(hvc): Add Durian crop with 80000 cover"
# e.g.: git commit -m "fix(pdf): Fix blank signature in Banca PDF"
# 4. Push to deploy
git push origin main
```

### Commit Message Convention
| Prefix | Use for |
|---|---|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation changes |
| `style:` | CSS/UI changes |
| `refactor:` | Code cleanup without behavior change |
| `chore:` | Dependency updates, config changes |

---

*This document was generated based on the codebase as of version 1.4.1 (March 18, 2026). Update this document whenever significant architectural changes are made.*
