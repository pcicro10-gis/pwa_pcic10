function toggleSidebar() {
    document.body.classList.toggle('sidebar-open');
}

// === VERSION CONTROL ===
const APP_VERSION = "1.4.3"; // Single source of truth
// =======================

const getDeviceID = () => {
    let id = localStorage.getItem('pcic_device_id');
    if (!id) {
        id = 'D' + Math.random().toString(36).substring(2, 6).toUpperCase();
        localStorage.setItem('pcic_device_id', id);
    }
    return id;
};

// === DATA HIERARCHY ===
// Defines the 3-level hierarchy: Insurance Line → Type → Classification
const INSURANCE_HIERARCHY = {
    Crop: {
        'Rice': ['Irrigated', 'Rainfed', 'Upland'],
        'Corn': ['Yellow Corn', 'White Corn'],
        // All other crops from db.hvc_rates are HVC (no sub-classification)
    },
    Livestock: {
        'Swine': ['Fattening', 'Breeding'],
        'Goat': ['Fattening', 'Breeding'],
        'Sheep': ['Fattening', 'Breeding'],
        'Poultry': ['I. Grower', 'C. Grower', 'Integrator', 'Pullet', 'Chicken Layer', 'Duck Layer', 'Quail Layer'],
        'Cattle': ['Draft', 'Dairy', 'Fattening', 'Breeding'],
        'Carabao': ['Draft', 'Dairy', 'Fattening', 'Breeding'],
        'Horse': ['Draft'],
        'Others': [] // Free-text input
    },
    ADSS: {},
    Banca: {
        'Motorized': ['Wood', 'Fiberglass'],
        'Non-Motorized': ['Wood', 'Fiberglass']
    }
};
// ======================


function initVersionDisplay() {
    // 1. Update Browser Tab Title
    document.title = `PCIC Ro10 Digital Insurance Application v${APP_VERSION}`;

    // 2. Update Sidebar
    const sidebarLabel = document.getElementById('lbl_version_sidebar');
    if (sidebarLabel) sidebarLabel.innerText = `v${APP_VERSION}`;

    // 3. Update Footer
    const footerLabel = document.getElementById('lbl_version_footer');
    if (footerLabel) footerLabel.innerText = APP_VERSION;

    // 4. Update Banner Version Text
    const bannerVersionText = document.getElementById('banner-version');
    if (bannerVersionText) bannerVersionText.innerText = APP_VERSION;

    // 5. Check if user has seen this version yet
    const lastSeenVersion = localStorage.getItem('pcic_last_seen_version');
    const updateBanner = document.getElementById('update-banner');

    if (updateBanner && (!lastSeenVersion || lastSeenVersion !== APP_VERSION)) {
        updateBanner.style.display = 'block';
    }

    console.log(`App Initialized: v${APP_VERSION}`);
}

function showReleaseNotes() {
    const modal = document.getElementById('release-notes-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeReleaseNotesModal() {
    const modal = document.getElementById('release-notes-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';

        // Acknowledge version so banner hides
        localStorage.setItem('pcic_last_seen_version', APP_VERSION);
        const banner = document.getElementById('update-banner');
        if (banner) banner.style.display = 'none';
    }
}

function handleRNOverlayClick(event) {
    if (event.target.id === 'release-notes-modal') {
        closeReleaseNotesModal();
    }
}

function dismissUpdateBanner(event) {
    event.stopPropagation(); // Prevents clicking the banner from opening the modal
    localStorage.setItem('pcic_last_seen_version', APP_VERSION);
    const banner = document.getElementById('update-banner');
    if (banner) banner.style.display = 'none';
}
function normalizeKey(key) { return key.trim().replace(/[\s\.]+/g, ''); }

// Global auto-uppercase: converts text/tel input values to uppercase as user types
document.addEventListener('input', function (e) {
    const el = e.target;
    if ((el.tagName === 'INPUT') &&
        (el.type === 'text' || el.type === 'tel') &&
        !el.dataset.noUpper) {
        const start = el.selectionStart;
        const end = el.selectionEnd;
        el.value = el.value.toUpperCase();
        el.setSelectionRange(start, end); // preserve cursor position
    }
});
// ADSS: "Same as Home Address" checkbox handler
function fillSameAsHome(checkbox) {
    const workAddrEl = document.getElementById('adss_work_addr');
    if (!workAddrEl) return;
    if (checkbox.checked) {
        const st = (document.getElementById('f_st_farmer')?.value || '').trim();
        const brgy = (document.getElementById('f_brgy_farmer')?.value || '').trim();
        const mun = (document.getElementById('f_mun_farmer')?.value || '').trim();
        const prov = (document.getElementById('f_prov_farmer')?.value || '').trim();
        workAddrEl.value = [st, brgy, mun, prov].filter(Boolean).join(', ').toUpperCase();
        workAddrEl.readOnly = true;
        workAddrEl.style.background = '#f1f8e9';
    } else {
        workAddrEl.value = '';
        workAddrEl.readOnly = false;
        workAddrEl.style.background = '';
    }
}

function calculateAge(birthDateString) {
    if (!birthDateString) return 0;
    const birthDate = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}

function checkGuardianRequirement() {
    const bdayVal = document.getElementById('f_bday').value;
    if (!bdayVal) return;
    const age = calculateAge(bdayVal);
    const isMinor = age > 15 && age < 18;

    const adssMinor = document.getElementById('adss_is_minor');
    if (adssMinor) {
        adssMinor.checked = isMinor;
    }

    const guardianSection = document.getElementById('guardian-sig-section');
    const farmerLabel = document.getElementById('farmer-sig-label');

    if (guardianSection) {
        const isCurrentlyVisible = guardianSection.style.display === 'block';
        guardianSection.style.display = isMinor ? 'block' : 'none';
        if (farmerLabel) farmerLabel.innerText = isMinor ? "Farmer Signature (Minor)" : "Farmer Signature";

        // Only resize if visibility changed to visible
        if (isMinor && !isCurrentlyVisible) {
            setTimeout(resizeCanvas, 100);
        }
    }
}

const db = new Dexie("PCIC_Offline_DB_V6");
db.version(2).stores({
    profiles: "FarmersID, LastName, FirstName, RSBSAID, Municipality, Province, Barangay",
    records: "++id, FARMERSID, FarmersID, CICNO, PROGRAMTYPE",
    apps: "++id, FarmersID, LastName, CropType, Month",
    settings: "key",
    hvc_rates: "name"
});

const indicator = document.getElementById('db-indicator');


// Robust global safeSet function to be used by all restoration logic
const safeSet = (id, val) => {
    const el = document.getElementById(id);
    if (el) {
        el.value = (val === undefined || val === null) ? '' : val;
        el.dispatchEvent(new Event('input', { bubbles: true }));

        if (id.includes('prov')) {
            let munDatalistId = '';
            let bgyDatalistId = '';
            if (id === 'f_prov_farmer') { munDatalistId = 'dl_f_mun_farmer'; bgyDatalistId = 'dl_f_brgy_farmer'; }
            else if (id === 'f_farm_prov') { munDatalistId = 'dl_f_farm_mun'; bgyDatalistId = 'dl_f_farm_bgy'; }
            else if (id === 'live_prov') { munDatalistId = 'dl_live_mun'; bgyDatalistId = 'dl_live_bgy'; }

            if (munDatalistId && typeof filterMunicipalities === 'function') {
                filterMunicipalities(el.value, munDatalistId, bgyDatalistId);
            }
        }
        else if (id.includes('mun')) {
            let bgyDatalistId = '';
            if (id === 'f_mun_farmer') bgyDatalistId = 'dl_f_brgy_farmer';
            else if (id === 'f_farm_mun') bgyDatalistId = 'dl_f_farm_bgy';
            else if (id === 'live_mun') bgyDatalistId = 'dl_live_bgy';

            if (bgyDatalistId && typeof filterBarangays === 'function') {
                filterBarangays(el.value, bgyDatalistId);
            }
        }
        return true;
    }
    return false;
};

let signaturePad;
let guardianSignaturePad;
let currentFarmer = null;
let currentFarmerHistory = []; // NEW: Store history for farm selection

window.onload = async () => {
    try {
        console.log("Starting Initialization...");
        initVersionDisplay();
        const canvas = document.getElementById('sig-canvas');
        if (canvas) signaturePad = new SignaturePad(canvas);

        const gCanvas = document.getElementById('guardian-sig-canvas');
        if (gCanvas) guardianSignaturePad = new SignaturePad(gCanvas);

        // Set initial status
        if (indicator) indicator.innerText = "Connecting to DB...";

        await updateStatus();
        refreshLog();
        // updateBatchStats(); // Initial stats check - Removed for lazy load
        renderLineStats(); // Global Dashboard - Enabled for startup

        console.log("Ensuring default rates...");
        await ensureDefaultRates(); // Init Rice/Corn if missing (Wait for completion)

        refreshHVCRateList();
        populateUnifiedCropDropdown();
        updateTemplateStatus(); // Refresh template status

        // Load Persisted Agent Name
        const savedAgent = localStorage.getItem('pcic_agent_name');
        const agentInput = document.getElementById('agent_name');
        if (savedAgent && agentInput) {
            agentInput.value = savedAgent;
        }
        // Save Agent Name on Change
        if (agentInput) {
            agentInput.addEventListener('input', (e) => {
                localStorage.setItem('pcic_agent_name', e.target.value);
            });
        }

        window.addEventListener('resize', resizeCanvas);

        const bdayInput = document.getElementById('f_bday');
        if (bdayInput) {
            bdayInput.addEventListener('change', checkGuardianRequirement);
            bdayInput.addEventListener('input', checkGuardianRequirement);
            // Trigger check on load in case data exists
            checkGuardianRequirement();
        }

        resizeCanvas();

        // Force 'welcome' dashboard on startup instead of restoring last view
        // This ensures the user always sees the welcome screen first
        showView('welcome');
        console.log("Initialization Complete.");
    } catch (err) {
        console.error("CRITICAL: Initialization failed!", err);
        if (indicator) {
            indicator.innerText = "Error: " + err.message;
            indicator.style.color = "#ff5252";
        }
        // Fallback to show at least something
        showView('welcome');
    }
};


// ============================================================
// FEEDBACK MODAL
// ============================================================
function closeFeedbackModal() {
    const modal = document.getElementById('feedback-modal');
    if (modal) modal.style.display = 'none';
}

function handleFeedbackOverlayClick(event) {
    if (event.target === document.getElementById('feedback-modal')) {
        closeFeedbackModal();
    }
}

function sendFeedback() {
    const name = (document.getElementById('fb_name') || {}).value?.trim() || '';
    const issues = (document.getElementById('fb_issues') || {}).value?.trim() || '';
    const suggestions = (document.getElementById('fb_suggestions') || {}).value?.trim() || '';

    if (!name) { alert('Please enter your name before sending.'); return; }
    if (!issues) { alert('Please describe the issue or problem encountered.'); return; }

    const to = 'ro10msd@pcicgov.onmicrosoft.com';
    const subject = `[App Feedback] ${name} — PCIC Digital Insurance App`;
    const body = [
        `PCIC Digital Insurance App — User Feedback`,
        `==========================================`,
        ``,
        `Underwriter / Agent Name:`,
        name,
        ``,
        `Issues / Problems Encountered:`,
        issues,
        ``,
        `Suggestions:`,
        suggestions || '(none)',
        ``,
        `--`,
        `Sent from PCIC Digital Insurance App v${typeof APP_VERSION !== 'undefined' ? APP_VERSION : ''}`,
        `Device: ${navigator.userAgent}`,
    ].join('\n');

    const mailto = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;

    // Clear form and close after a short delay (so email app can open)
    setTimeout(() => {
        const nameEl = document.getElementById('fb_name');
        const issuesEl = document.getElementById('fb_issues');
        const suggestionsEl = document.getElementById('fb_suggestions');
        if (nameEl) nameEl.value = '';
        if (issuesEl) issuesEl.value = '';
        if (suggestionsEl) suggestionsEl.value = '';
        closeFeedbackModal();
    }, 800);
}
// ============================================================

// ============================================================
// SERVICE WORKER REGISTRATION & UPDATE HANDLER
// ============================================================
// This fixes the PWA caching problem:
//   - Without this, a new SW installs but stays in "waiting"
//     state — so old files keep being served until the user
//     manually closes ALL tabs and reopens.
//   - With this, the new SW skips waiting immediately and
//     reloads the page so users see the latest version.
// ============================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js')
            .then(registration => {
                console.log('[SW] Registered:', registration.scope);

                // Check if there is already a waiting SW on load
                // (happens when user opens the app after a new version was cached)
                if (registration.waiting) {
                    handleSwUpdate(registration.waiting);
                    return;
                }

                // Listen for a NEW SW being found (update available)
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    console.log('[SW] Update found — new worker installing...');

                    newWorker.addEventListener('statechange', () => {
                        // When new SW has finished installing and is waiting
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            console.log('[SW] New version ready — activating...');
                            handleSwUpdate(newWorker);
                        }
                    });
                });
            })
            .catch(err => console.error('[SW] Registration failed:', err));

        // When the SW controller changes (i.e. new SW has taken over),
        // reload the page so the fresh cached assets are served.
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
                refreshing = true;
                console.log('[SW] Controller changed — reloading for fresh assets.');
                window.location.reload();
            }
        });
    });
}

/**
 * Called when a new Service Worker is waiting to activate.
 * Shows the tablet-optimised update toast card with a 30-second
 * auto-update countdown. The agent can tap the button at any time,
 * or it will auto-apply after the countdown expires.
 */
function handleSwUpdate(worker) {
    const banner = document.getElementById('update-banner');
    const countdownEl = document.getElementById('update-countdown');
    if (!banner) return;

    // Show the toast card
    banner.style.display = 'block';

    // ── 30-second auto-update countdown ─────────────────────────
    let secondsLeft = 30;
    let countdownTimer = null;

    function applyUpdate() {
        if (countdownTimer) clearInterval(countdownTimer);
        banner.style.display = 'none';
        worker.postMessage({ type: 'SKIP_WAITING' });
        // page reloads via the 'controllerchange' listener registered above
    }

    function tickCountdown() {
        secondsLeft--;
        if (countdownEl) countdownEl.innerText = `(auto in ${secondsLeft}s)`;
        if (secondsLeft <= 0) applyUpdate();
    }

    if (countdownEl) countdownEl.innerText = `(auto in ${secondsLeft}s)`;
    countdownTimer = setInterval(tickCountdown, 1000);

    // ── Wire all user-triggered paths to apply the update ────────

    // 1. "Tap to Update Now" button (and the whole banner area)
    window.dismissUpdateBanner = function (event) {
        if (event) event.stopPropagation();
        applyUpdate();
    };

    // 2. Closing the release notes modal should also apply update
    const originalClose = window.closeReleaseNotesModal;
    window.closeReleaseNotesModal = function () {
        if (originalClose) originalClose();
        applyUpdate();
    };
}
// ============================================================

function resizeCanvas() {
    const sigs = [
        { id: 'sig-canvas', pad: typeof signaturePad !== 'undefined' ? signaturePad : null },
        { id: 'guardian-sig-canvas', pad: typeof guardianSignaturePad !== 'undefined' ? guardianSignaturePad : null }
    ];

    sigs.forEach(item => {
        const canvas = document.getElementById(item.id);
        if (!canvas) return;

        // If the canvas is hidden (e.g. guardian sig not active), offsetWidth/Height will be 0
        if (canvas.offsetWidth === 0) return;

        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        const oldWidth = canvas.width / ratio;
        const oldHeight = canvas.height / ratio;
        const newWidth = canvas.offsetWidth;
        const newHeight = canvas.offsetHeight;

        // Save signature data before resizing to avoid losing it if possible
        let data = null;
        if (item.pad && !item.pad.isEmpty()) {
            data = item.pad.toData();
        }

        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").setTransform(ratio, 0, 0, ratio, 0, 0);

        if (item.pad) {
            item.pad.clear(); // Clear to reset internal state
            if (data && oldWidth > 0 && oldHeight > 0) {
                // Calculate scale factors for both axes
                const scaleX = newWidth / oldWidth;
                const scaleY = newHeight / oldHeight;

                // Scale signature data points
                const scaledData = data.map(stroke => ({
                    ...stroke,
                    points: stroke.points.map(point => ({
                        ...point,
                        x: point.x * scaleX,
                        y: point.y * scaleY
                    }))
                }));

                // Restore scaled signature data
                item.pad.fromData(scaledData);
            }
        }
    });
}

function toggleFullScreenSig(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const container = canvas.closest('.sig-container');
    if (!container) return;

    const isFullScreen = container.classList.toggle('fullscreen');

    // Toggle Body Overflow to prevent background scrolling
    document.body.style.overflow = isFullScreen ? 'hidden' : '';

    // Change icon
    const btnIcon = container.querySelector('.fullscreen-btn i');
    if (btnIcon) {
        btnIcon.className = isFullScreen ? 'fas fa-compress' : 'fas fa-expand';
    }

    // Important: Delay resize to allow CSS transition/rendering to complete
    setTimeout(resizeCanvas, 50);
}

// Global Esc Key Listener for Full Screen Signatures
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const fsContainer = document.querySelector('.sig-container.fullscreen');
        if (fsContainer) {
            const canvas = fsContainer.querySelector('canvas');
            if (canvas) toggleFullScreenSig(canvas.id);
        }
    }
});

async function updateStatus() {
    const pCount = await db.profiles.count();
    const rCount = await db.records.count();
    if (indicator) {
        if (pCount === 0 && rCount === 0) {
            indicator.innerText = "NO DATA";
        } else {
            indicator.innerText = `${pCount.toLocaleString()} FARMERS | ${rCount.toLocaleString()} RECORDS OFFLINE`;
        }
    }
}

// --- USER GUIDE MODAL LOGIC ---
function showUserGuide() {
    const modal = document.getElementById('user-guide-modal');
    const iframe = document.getElementById('user-guide-iframe');
    if (modal && iframe) {
        // Set source if not already set to prevent unnecessary reloads, 
        // or keep it dynamic to ensure it always loads fresh.
        iframe.src = "asset/PCIC RO10 User Guide.pdf";
        modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }
}

function closeUserGuideModal() {
    const modal = document.getElementById('user-guide-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
        // Optional: Clear iframe src to stop background loading
        // document.getElementById('user-guide-iframe').src = "";
    }
}

function handleUGOverlayClick(event) {
    // Close if clicking the overlay itself (not the panel)
    if (event.target.id === 'user-guide-modal') {
        closeUserGuideModal();
    }
}
// ------------------------------

function showView(v) {
    saveEnrollmentState(); // Save any unsaved data if an enrollment is active
    console.log('=== showView called with:', v);
    localStorage.setItem('pcic_last_view', v);

    // Conditional Dashboard Visibility
    const globalDash = document.getElementById('global-dashboard');
    if (globalDash) {
        globalDash.style.setProperty('display', (v === 'welcome' || v === 'preprocessing') ? 'none' : 'flex', 'important');
    }

    document.querySelectorAll('.content-area').forEach(e => e.style.display = 'none');
    document.querySelectorAll('.nav-btn').forEach(e => e.classList.remove('active'));
    const targetView = document.getElementById(`view-${v}`);
    console.log('Target view element:', targetView);
    if (targetView) {
        targetView.style.display = (v === 'welcome') ? 'flex' : 'block';
        console.log('Set display to ' + targetView.style.display + ' for view-' + v);
    } else {
        console.error('ERROR: Could not find element with ID: view-' + v);
    }

    // Set active button via ID
    const btn = document.getElementById(`nav-${v}`);
    if (btn) btn.classList.add('active');

    const titleMap = {
        'welcome': 'Dashboard',
        'enrollment': 'Enrollment Form',
        'summary': 'Batch Summary',
        'settings': 'App Settings',
        'database': 'Application Database',
        'about': 'Help & About',
        'preprocessing': '🌾 Preprocessing Hub'
    };
    const viewTitle = document.getElementById('view-title');
    if (viewTitle) viewTitle.innerText = titleMap[v] || v;

    if (v === 'welcome') {
        if (typeof updateWelcomeStats === 'function') {
            updateWelcomeStats();
        }
    }

    if (v === 'database') {
        // Only initialize once, not every time the view is shown
        if (typeof initializeDatabaseView === 'function' && !window.databaseInitialized) {
            window.databaseInitialized = true;
            initializeDatabaseView();
        }
    }

    if (v === 'enrollment' || v === 'enrollment-form') {
        const el = document.getElementById('view-enrollment');
        el.style.display = 'block';
        // Force width if it seems collapsed
        if (el.offsetWidth === 0) el.style.width = '100%';
    } else {
        const target = document.getElementById(`view-${v}`);
        if (target) {
            target.style.display = (v === 'welcome') ? 'flex' : 'block';
            // Force width/layout
            if (target.offsetWidth === 0) target.style.width = '100%';
            console.log('Double-check: Set display to ' + target.style.display + ' again for view-' + v);
        }
    }

    if (v === 'enrollment') {
        // Force Search View
        document.getElementById('search-card').style.display = 'block';
        document.getElementById('view-enrollment-form').style.display = 'none';
    } else if (v === 'enrollment-form') {
        // Check if we have an active enrollment session
        const enrollmentActive = localStorage.getItem('pcic_enrollment_active');

        if (enrollmentActive === 'true') {
            // Restore state
            restoreEnrollmentState();
        } else {
            // No active state? Start a blank/walk-in enrollment
            startBlankEnrollment();
        }
        setTimeout(resizeCanvas, 50);
    } else if (v === 'summary') {
        populateSummaryCropDropdown();
        updateBatchStats();
        renderLineStats();
    }
    console.log('=== showView completed for:', v);

    // DIAGNOSTIC LOGGING
    ['view-enrollment', 'view-enrollment-form', 'view-about', 'view-summary', 'view-settings', 'view-preprocessing'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const style = window.getComputedStyle(el);
            console.log(`[DIAGNOSTIC] ${id}: display=${el.style.display} (computed=${style.display}), visibility=${style.visibility}, height=${el.offsetHeight}, width=${el.offsetWidth}`);
            console.log(`[DIAGNOSTIC] ${id} innerHTML length: ${el.innerHTML.length}`);
        } else {
            console.log(`[DIAGNOSTIC] ${id}: NOT FOUND`);
        }
    });
}

function confirmNewApplicant() {
    if (confirm("Are you sure you want to clear all data and start a new application?")) {
        startBlankEnrollment();
    }
}

function startBlankEnrollment() {
    // Auto-generate a Farmer ID for new/walk-in applicants
    const now = new Date();
    const timestamp = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0') + '-' +
        String(now.getHours()).padStart(2, '0') +
        String(now.getMinutes()).padStart(2, '0') +
        String(now.getSeconds()).padStart(2, '0');
    const autoFarmerID = `WALK-IN-${getDeviceID()}-${timestamp}`;

    // Initialize a blank farmer object with the pre-generated ID
    currentFarmer = {
        FarmersID: autoFarmerID, RSBSAID: "", RSBSANO: "", NCFRSID: "",
        LastName: "", FirstName: "", MiddlName: "", ExtName: "",
        Birthdate: "", Sex: "", CivilStatus: "",
        Province: "", Municipality: "", Barangay: "", Street: "",
        Mobile: "", Spouse: "", Sector: "",
        Benefeciary: "", BeneficiaryRelationship: "", BeneficiaryBirthdate: "", Guardian: "", GuardianRelationship: "", GuardianBirthdate: "",
        Account: "", PaymentMethod: ""
    };

    // Clear any lingering history keys or steps
    localStorage.removeItem('pcic_current_history');
    localStorage.removeItem('pcic_farmer_history');
    localStorage.removeItem('pcic_last_step');
    currentFarmerHistory = [];

    // Load form with blank data (auto-ID will be pre-filled)
    resetEnrollmentFields();
    loadEnrollmentForm(null);
}

// New: Dedicated function to clear all enrollment fields for a fresh start
function resetEnrollmentFields() {
    const fieldsToClear = [
        'f_id', 'f_rsbsa', 'f_ncfrs', 'f_extname', 'f_lname', 'f_fname', 'f_midname',
        'f_sex', 'f_civil', 'f_bday', 'f_prov_farmer', 'f_mun_farmer', 'f_brgy_farmer', 'f_st_farmer',
        'f_bene', 'f_bene_rel', 'f_bene_bday', 'f_mobile', 'f_spouse', 'f_sector', 'f_guardian', 'f_guardian_rel', 'f_guardian_bday',
        'f_acc', 'f_mop', 'f_north', 'f_south', 'f_east', 'f_west', 'f_area', 'f_farmid',
        'f_variety', 'f_georef', 'f_farm_bgy', 'f_farm_mun', 'f_farm_prov', 'f_st_farm',
        'f_amount_cover', 'f_plant', 'f_trees', 'f_crop_unified'
    ];
    fieldsToClear.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = '';
            el.dispatchEvent(new Event('input', { bubbles: true }));
        }
    });

    // Reset dropdowns explicitly
    const topEl = document.getElementById('f_top');
    if (topEl) topEl.selectedIndex = 0;

    const insLine = document.getElementById('f_insurance_line');
    if (insLine) insLine.value = 'Crop';

    // Reset Photo
    const photoInput = document.getElementById('f_photo_data');
    const photoPrev = document.getElementById('farmer-photo-preview');
    if (photoInput) photoInput.value = '';
    if (photoPrev) photoPrev.innerHTML = `<i class="fas fa-user"></i>`;

    if (typeof handleCropUnified === 'function') handleCropUnified();
    if (typeof toggleInsuranceView === 'function') toggleInsuranceView();
}

async function restoreEnrollmentState() {
    const storedFarmer = localStorage.getItem('pcic_current_farmer');
    const storedHistory = localStorage.getItem('pcic_current_history');
    const lastStep = localStorage.getItem('pcic_last_step');

    console.log('--- restoreEnrollmentState CALLED ---');
    console.log('storedFarmer in LS:', storedFarmer ? 'EXISTS' : 'MISSING');

    if (storedFarmer) {
        try {
            // Always re-parse from storage to ensure we have the latest/intended one
            currentFarmer = JSON.parse(storedFarmer);
            console.log('Restored currentFarmer object:', currentFarmer);

            // RE-FETCH HISTORY if possible to ensure fresh state for Farm Selector
            // Consistency: Fetch from both CSV imports (db.records) and saved apps (db.apps)
            let historyData = [];
            if (currentFarmer && (currentFarmer.FarmersID || currentFarmer.FARMERSID)) {
                const fid = currentFarmer.FarmersID || currentFarmer.FARMERSID;
                try {
                    console.log('Re-fetching history for ID:', fid);
                    const csvHistory = await db.records.where("FARMERSID").equals(fid).toArray() || [];
                    const appsHistory = await db.apps.where("FarmersID").equals(fid).toArray() || [];
                    historyData = [...appsHistory, ...csvHistory];
                    console.log('Refetched history count:', historyData.length);
                } catch (err) {
                    console.warn("Error re-fetching history:", err);
                }
            }

            // Update global state - Crucial for Farm Selector
            currentFarmerHistory = historyData || [];

            const history = storedHistory ? JSON.parse(storedHistory) : null;
            console.log('Restored specific selected history object:', history);

            // Use separated UI logic to avoid recursion
            displayEnrollmentFormUI(history); // Restored to pass single record, relies on global currentFarmerHistory for dropdown
            if (lastStep) {
                goToStep(lastStep);
            } else {
                goToStep('farmer-info');
            }
        } catch (e) {
            console.error("Error restoring enrollment state:", e);
            // Fallback to fresh start if error
            localStorage.setItem('pcic_enrollment_active', 'false');
            showView('enrollment');
        }
    } else {
        // State says active but no data? Reset.
        console.warn('RESTORING: No stored farmer found.');
        localStorage.setItem('pcic_enrollment_active', 'false');
        showView('enrollment');
    }
}

// --- Navigation Helpers ---

function saveEnrollmentState() {
    const active = localStorage.getItem('pcic_enrollment_active');
    if (active !== 'true') return;

    console.log("=== SAVING ENROLLMENT STATE ===");

    // 1. Capture Universal Farmer Info from DOM
    if (!currentFarmer) currentFarmer = {};

    const fieldMap = {
        'f_id': 'FarmersID',
        'f_rsbsa': 'RSBSAID',
        'f_ncfrs': 'NCFRSID',
        'f_lname': 'LastName',
        'f_fname': 'FirstName',
        'f_midname': 'MiddlName',
        'f_extname': 'ExtName',
        'f_sex': 'Sex',
        'f_civil': 'CivilStatus',
        'f_prov_farmer': 'Province',
        'f_mun_farmer': 'Municipality',
        'f_brgy_farmer': 'Barangay',
        'f_st_farmer': 'Street',
        'f_mobile': 'Mobile',
        'f_spouse': 'Spouse',
        'f_sector': 'Sector',
        'f_bene': 'Benefeciary',
        'f_bene_rel': 'BeneficiaryRelationship',
        'f_bene_bday': 'BeneficiaryBirthdate',
        'f_guardian': 'Guardian',
        'f_acc': 'Account',
        'f_mop': 'PaymentMethod',
        'f_photo_data': 'Photo'
    };

    for (let id in fieldMap) {
        const el = document.getElementById(id);
        if (el) currentFarmer[fieldMap[id]] = el.value;
    }

    // 2. Capture Line-specific / Farm Details (History Object)
    let history = JSON.parse(localStorage.getItem('pcic_current_history') || '{}') || {};

    const farmFieldMap = {
        'f_north': 'NORTH',
        'f_south': 'SOUTH',
        'f_east': 'EAST',
        'f_west': 'WEST',
        'f_farm_bgy': 'FarmBarangay',
        'f_farm_mun': 'FarmMunicipality',
        'f_farm_prov': 'FarmProvince',
        'f_farmid': 'FARMID',
        'f_area': 'AREA',
        'f_georef': 'GEOTAG',
        'f_variety': 'VARIETYNAME',
        'f_top': 'TOP',
        'f_farm_purok': 'FarmPurok'
    };

    for (let id in farmFieldMap) {
        const el = document.getElementById(id);
        if (el) history[farmFieldMap[id]] = el.value;
    }

    // Capture Insurance Line
    const lineEl = document.getElementById('f_insurance_line');
    if (lineEl) history.InsuranceLine = lineEl.value;

    // Capture ADSS-specific fields
    const adssOcc = document.getElementById('adss_occupation');
    if (adssOcc) history.Occupation = adssOcc.value;
    const adssAddr = document.getElementById('adss_work_addr');
    if (adssAddr) history.Address = adssAddr.value;
    const adssPrem = document.getElementById('adss_premium');
    if (adssPrem) history.Premium = adssPrem.value;
    const adssCover = document.getElementById('adss_cover');
    if (adssCover) history.AmountCover = adssCover.value;
    const adssMinor = document.getElementById('adss_is_minor');
    if (adssMinor) history.IsMinor = adssMinor.checked;

    const adssBen1 = document.getElementById('adss_ben1_name');
    if (adssBen1) history.BeneSecondary = adssBen1.value;
    const adssBen1Rel = document.getElementById('adss_ben1_rel');
    if (adssBen1Rel) history.BeneSecondaryRel = adssBen1Rel.value;
    const adssBen1Bday = document.getElementById('adss_ben1_bday');
    if (adssBen1Bday) history.BeneSecondaryBday = adssBen1Bday.value;

    const adssBen2 = document.getElementById('adss_ben2_name');
    if (adssBen2) history.BeneSecondary2 = adssBen2.value;
    const adssBen2Rel = document.getElementById('adss_ben2_rel');
    if (adssBen2Rel) history.BeneSecondary2Rel = adssBen2Rel.value;
    const adssBen2Bday = document.getElementById('adss_ben2_bday');
    if (adssBen2Bday) history.BeneSecondary2Bday = adssBen2Bday.value;

    // Capture Banca-specific fields
    const bancaPort = document.getElementById('banca_port');
    if (bancaPort && bancaPort.value) history.Address = bancaPort.value;
    const bancaUsage = document.getElementById('banca_usage');
    if (bancaUsage && bancaUsage.value) history.Usage = bancaUsage.value;
    const bancaCrew = document.getElementById('banca_crew');
    if (bancaCrew && bancaCrew.value) history.Manning = bancaCrew.value;
    const bancaMat = document.getElementById('banca_material');
    if (bancaMat && bancaMat.value) history.BoatMaterial = bancaMat.value;
    const bancaType = document.getElementById('banca_type');
    if (bancaType && bancaType.value) history.BoatType = bancaType.value;
    const bancaHp = document.getElementById('banca_hp');
    if (bancaHp && bancaHp.value) history.HullNo = bancaHp.value;
    const bancaChassis = document.getElementById('banca_chassis');
    if (bancaChassis && bancaChassis.value) history.ChassisNo = bancaChassis.value;
    const bancaAge = document.getElementById('banca_age');
    if (bancaAge && bancaAge.value) history.BoatAge = bancaAge.value;
    const bancaColor = document.getElementById('banca_color');
    if (bancaColor && bancaColor.value) history.Color = bancaColor.value;
    const bancaLen = document.getElementById('banca_length');
    if (bancaLen && bancaLen.value) history.BancaLength = bancaLen.value;
    const bancaWid = document.getElementById('banca_width');
    if (bancaWid && bancaWid.value) history.BancaWidth = bancaWid.value;
    const bancaDep = document.getElementById('banca_depth');
    if (bancaDep && bancaDep.value) history.BancaDepth = bancaDep.value;
    const bancaOthers = document.getElementById('banca_others');
    if (bancaOthers && bancaOthers.value) history.Others = bancaOthers.value;
    const bancaCover = document.getElementById('banca_cover');
    if (bancaCover && bancaCover.value) history.AmountCover = bancaCover.value;
    const bancaFrom = document.getElementById('banca_period_from');
    if (bancaFrom && bancaFrom.value) history.PeriodFrom = bancaFrom.value;
    const bancaTo = document.getElementById('banca_period_to');
    if (bancaTo && bancaTo.value) history.PeriodTo = bancaTo.value;
    const bancaBene = document.getElementById('banca_bene_primary');
    if (bancaBene && bancaBene.value) history.Beneficiary = bancaBene.value;
    const bancaBeneRel = document.getElementById('banca_bene_rel');
    if (bancaBeneRel && bancaBeneRel.value) history.BeneRelationship = bancaBeneRel.value;
    const bancaMortTo = document.getElementById('banca_mortgage_to');
    if (bancaMortTo && bancaMortTo.value) history.MortgageTo = bancaMortTo.value;
    const bancaMortBr = document.getElementById('banca_mortgage_branch');
    if (bancaMortBr && bancaMortBr.value) history.MortgageBranch = bancaMortBr.value;
    const bancaMortAddr = document.getElementById('banca_mortgage_addr');
    if (bancaMortAddr && bancaMortAddr.value) history.MortgageAddr = bancaMortAddr.value;

    // Persist to LocalStorage
    localStorage.setItem('pcic_current_farmer', JSON.stringify(currentFarmer));
    localStorage.setItem('pcic_current_history', JSON.stringify(history));
}

function backToSearchInput() {
    saveEnrollmentState();
    document.getElementById('search-results-panel').style.display = 'none';
}

function backToResults() {
    saveEnrollmentState();
    localStorage.setItem('pcic_enrollment_active', 'false');
    document.getElementById('view-enrollment-form').style.display = 'none';
    document.getElementById('search-card').style.display = 'block';
    document.getElementById('search-results-panel').style.display = 'block';
}

// --- Rate Management ---

async function saveBaseSettings() {
    await db.settings.put({ id: 'RICE', value: document.getElementById('set_rice_amount').value });
    await db.settings.put({ id: 'CORN', value: document.getElementById('set_corn_amount').value });
    alert("Rates saved.");
    calculateTotalCover();
}

async function ensureDefaultRates() {
    const defaults = [
        { name: 'Rice', rate: 25000 },
        { name: 'Corn', rate: 25000 },
        { name: 'Abaca', rate: 50000 },
        { name: 'Acacia', rate: 50000 },
        { name: 'Ampalaya', rate: 50000 },
        { name: 'Adlai', rate: 30000 },
        { name: 'Avocado', rate: 45000 },
        { name: 'Bamboo', rate: 50000 },
        { name: 'Banana (Lakatan)', rate: 100000 },
        { name: 'Banana (Cardava)', rate: 50000 },
        { name: 'Baguio Beans', rate: 50000 },
        { name: 'Bell Pepper', rate: 50000 },
        { name: 'Cabbage', rate: 50000 },
        { name: 'Cacao', rate: 50000 },
        { name: 'Calamansi', rate: 46000 },
        { name: 'Carrot', rate: 50000 },
        { name: 'Casava', rate: 50000 },
        { name: 'Chayote', rate: 50000 },
        { name: 'Coconut', rate: 70000 },
        { name: 'Coffee', rate: 50000 },
        { name: 'Cucumber', rate: 50000 },
        { name: 'Dragon Fruit', rate: 50000 },
        { name: 'Durian', rate: 50000 },
        { name: 'Eggplant', rate: 50000 },
        { name: 'Falcata', rate: 50000 },
        { name: 'Gabi-Taro', rate: 45000 },
        { name: 'Gemelina', rate: 50000 },
        { name: 'Ginger', rate: 50000 },
        { name: 'Guyabano', rate: 50000 },
        { name: 'Hot Pepper', rate: 50000 },
        { name: 'Jackfruit', rate: 45000 },
        { name: 'Lanzones', rate: 50000 },
        { name: 'Mahogani', rate: 50000 },
        { name: 'Mango', rate: 50000 },
        { name: 'Mangosteen', rate: 50000 },
        { name: 'Marang', rate: 45000 },
        { name: 'Mongo', rate: 25000 },
        { name: 'Okra', rate: 50000 },
        { name: 'Onion', rate: 50000 },
        { name: 'Papaya', rate: 50000 },
        { name: 'Peanut', rate: 30000 },
        { name: 'Pineapple', rate: 50000 },
        { name: 'Rambutan', rate: 50000 },
        { name: 'Rubber', rate: 50000 },
        { name: 'Squash', rate: 50000 },
        { name: 'String Beans', rate: 50000 },
        { name: 'Sugarcane', rate: 50000 },
        { name: 'Sweet Potato', rate: 40000 },
        { name: 'Tiger Grass', rate: 35000 },
        { name: 'Tomato', rate: 50000 },
        { name: 'Tobacco', rate: 50000 },
        { name: 'Watermelon', rate: 45000 }
    ];

    // Fast path: if rates already exist, skip entirely (no DB writes needed)
    const existingCount = await db.hvc_rates.count();
    if (existingCount >= defaults.length) return;

    // First run only: bulk-insert all defaults in a single transaction
    // This replaces 50 sequential await calls with one fast operation
    await db.hvc_rates.bulkPut(defaults);
}

async function addCropRate() {
    const name = document.getElementById('new_hvc_name').value.trim();
    const rate = parseFloat(document.getElementById('new_hvc_rate').value);
    if (!name || isNaN(rate)) return alert("Invalid inputs.");
    // Capitalize first letter strictly? No, let user type.
    await db.hvc_rates.put({ name: name, rate: rate });
    document.getElementById('new_hvc_name').value = '';
    document.getElementById('new_hvc_rate').value = '';
    refreshHVCRateList();
    populateUnifiedCropDropdown();
}

async function refreshHVCRateList() {
    const list = await db.hvc_rates.toArray();
    const container = document.getElementById('hvc_rate_list');
    if (!container) return;
    container.innerHTML = list.length === 0 ? '<p style="font-size:11px; color:#999">None.</p>' :
        list.map(item => `
                <div style="display:flex; justify-content:space-between; padding:8px; border-bottom:1px solid #f0f0f0; font-size:12px;">
                    <span><b>${item.name}</b>: PHP ${item.rate.toLocaleString()} / Ha</span>
                    <button class="delete-btn" onclick="deleteCropRate('${item.name}')">Remove</button>
                </div>
            `).join('');
}

async function deleteCropRate(name) {
    if (confirm("Remove " + name + "?")) {
        await db.hvc_rates.delete(name);
        refreshHVCRateList();
        populateUnifiedCropDropdown();
    }
}

async function handleTemplateUpload(line = 'Crop') {
    const elId = `tpl_${line.toLowerCase()}`;
    const file = document.getElementById(elId).files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        const storageKey = line === 'Crop' ? 'pdf_template' : `pdf_template_${line.toLowerCase()}`;
        await db.settings.put({ key: storageKey, value: base64, name: file.name });

        // Update local cache if currently calibrating this line
        if (currentCalibLine === line) {
            bgDefaults[line] = 'data:image/jpeg;base64,' + base64;
            renderCalibration();
        }

        updateTemplateStatus();
        alert(`${line} PDF template saved successfully.`);
    };
    reader.readAsDataURL(file);
}

async function updateTemplateStatus() {
    const lines = ['Crop', 'ADSS', 'Livestock', 'Banca'];
    for (const line of lines) {
        const storageKey = line === 'Crop' ? 'pdf_template' : `pdf_template_${line.toLowerCase()}`;
        const template = await db.settings.get(storageKey);
        const statusEl = document.getElementById(`tpl_status_${line}`);
        if (statusEl) {
            if (template) {
                statusEl.innerHTML = `Loaded <i class="fas fa-check-circle" style="color:var(--primary)"></i>`;
                statusEl.title = template.name;
            } else {
                statusEl.innerHTML = `Not Loaded`;
                statusEl.style.color = '#888';
            }
        }
    }
}

async function populateUnifiedCropDropdown() {
    const list = await db.hvc_rates.toArray();
    list.sort((a, b) => a.name.localeCompare(b.name));
    const select = document.getElementById('f_crop_unified');
    if (!select) return;
    const currentVal = select.value;

    // Standard crops defined in INSURANCE_HIERARCHY
    const standardCropNames = Object.keys(INSURANCE_HIERARCHY.Crop);

    // Separate standard from HVC
    const standardCrops = list.filter(item => standardCropNames.includes(item.name));
    const hvcCrops = list.filter(item => !standardCropNames.includes(item.name));

    let html = '<option value="">-- Choose Crop --</option>';

    if (standardCrops.length > 0) {
        html += '<optgroup label="Standard Crops">';
        html += standardCrops.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
        html += '</optgroup>';
    }

    if (hvcCrops.length > 0) {
        html += '<optgroup label="High Value Crops">';
        html += hvcCrops.map(item => `<option value="${item.name}">${item.name}</option>`).join('');
        html += '</optgroup>';
    }

    select.innerHTML = html;
    if (currentVal) select.value = currentVal;
}

// --- Calculation Logic ---

async function calculateTotalCover() {
    const area = parseFloat(document.getElementById('f_area').value) || 0;
    const cropName = document.getElementById('f_crop_unified').value;
    let rate = 0;

    if (cropName) {
        const record = await db.hvc_rates.get(cropName);
        if (record) rate = record.rate;
    }

    const total = area * rate;
    document.getElementById('f_amount_cover').value = total.toFixed(2);
}

function syncPlantingDate() {
    const pType = document.getElementById('f_top');
    const dSow = document.getElementById('sow_date');
    const dPlant = document.getElementById('f_plant');

    if (pType && dSow && dPlant) {
        if (pType.value === 'Direct Seeding' && dSow.value) {
            dPlant.value = dSow.value;
        }
    }
}

function handleCropUnified() {
    const cropName = document.getElementById('f_crop_unified').value;
    document.getElementById('hidden_crop_type').value = cropName; // Sync for any legacy submit logic

    // Show/hide Trees/Hills based on crop name
    const isRiceOrCorn = (cropName.toUpperCase() === 'RICE' || cropName.toUpperCase() === 'CORN');
    const treesWrap = document.getElementById('trees_wrap');
    if (treesWrap) {
        treesWrap.style.display = (!isRiceOrCorn && cropName !== "") ? 'block' : 'none';
    }

    // --- Hierarchy: Show/hide Crop Sub-Type dropdown ---
    const subTypeWrap = document.getElementById('crop_subtype_wrap');
    const subTypeSelect = document.getElementById('crop_subtype');
    if (subTypeWrap && subTypeSelect) {
        const subTypes = INSURANCE_HIERARCHY.Crop[cropName];
        if (subTypes && subTypes.length > 0) {
            // Populate and show sub-type dropdown
            subTypeSelect.innerHTML = '<option value="">-- Select Type --</option>' +
                subTypes.map(t => `<option value="${t}">${t}</option>`).join('');
            subTypeWrap.style.display = 'block';
        } else {
            subTypeSelect.innerHTML = '';
            subTypeWrap.style.display = 'none';
        }
    }

    calculateTotalCover();
}

function handleCivilStatus() {
    const civilStatus = document.getElementById('f_civil').value;
    const spouseWrap = document.getElementById('spouse_wrap');
    if (spouseWrap) {
        spouseWrap.style.display = (civilStatus === 'Married') ? 'block' : 'none';
    }
}

// --- ADSS Logic ---

function calculateADSSCover() {
    const premium = parseFloat(document.getElementById('adss_premium').value) || 0;
    const cover = premium * 1000;
    document.getElementById('adss_cover').value = cover.toFixed(2);
}

function toggleParentSignature() {
    const isMinor = document.getElementById('adss_is_minor').checked;
    const guardianSection = document.getElementById('guardian-sig-section');
    const farmerLabel = document.getElementById('farmer-sig-label');

    if (guardianSection) {
        guardianSection.style.display = isMinor ? 'block' : 'none';
        if (farmerLabel) farmerLabel.innerText = isMinor ? "Farmer Signature (Minor)" : "Farmer Signature";
        if (isMinor) setTimeout(resizeCanvas, 100);
    }
}

// --- Livestock Logic ---



function refreshAnimalClassifications() {
    const type = document.getElementById('live_animal_type').value;
    const cells = document.querySelectorAll('#animal_list_body td:first-child');

    // Get classifications from hierarchy (data-driven)
    const classifications = INSURANCE_HIERARCHY.Livestock[type] || [];
    const isOthers = (type === 'Others');

    cells.forEach(cell => {
        if (isOthers) {
            // Replace select with free-text input for 'Others'
            if (!cell.querySelector('input')) {
                cell.innerHTML = '<input type="text" class="l-class" placeholder="Specify..." style="width:90%">';
            }
        } else {
            // Ensure it's a select element
            if (!cell.querySelector('select')) {
                cell.innerHTML = '<select class="l-class" style="width:90%"></select>';
            }
            const sel = cell.querySelector('select');
            const currentVal = sel.value;
            sel.innerHTML = '<option value="">-- Select --</option>' +
                classifications.map(c => `<option value="${c}">${c}</option>`).join('');
            if (currentVal) sel.value = currentVal;
        }
    });
}

function addAnimalRow() {
    const tbody = document.getElementById('animal_list_body');

    // ENFORCING ONE ROW ONLY (User Request)
    if (tbody.getElementsByTagName('tr').length >= 1) {
        alert("Only one animal entry is allowed per application currently.");
        return;
    }

    const rowId = 'row_' + new Date().getTime();
    const tr = document.createElement('tr');
    tr.id = rowId;
    tr.innerHTML = `
                        <td><select class="l-class" style="width:90%"></select></td>
                        <td><input type="text" class="l-tag" placeholder="Tag/Bldg#" style="width:90%"></td>
                        <td><input type="number" class="l-male" placeholder="M" style="width:45px"></td>
                        <td><input type="number" class="l-female" placeholder="F" style="width:45px"></td>
                        <td><input type="text" class="l-age" placeholder="Age" style="width:90%"></td>
                        <td><input type="date" class="l-dob" style="width:95%"></td>
                        <td><input type="text" class="l-breed" placeholder="Breed" style="width:90%"></td>
                        <td><input type="text" class="l-color" placeholder="Color" style="width:90%"></td>
                        <td><input type="number" class="l-value" placeholder="Price" style="width:90%"></td>
                        <td><button onclick="removeAnimalRow('${rowId}')" style="color:red; background:none; border:none; cursor:pointer;">&times;</button></td>
                    `;
    tbody.appendChild(tr);
    refreshAnimalClassifications(); // Populate the new row's select
}

function removeAnimalRow(id) {
    const row = document.getElementById(id);
    if (row) row.remove();
}

// --- Banca Logic ---

function calculateBancaCover() {
    const material = document.getElementById('banca_material').value;
    const type = document.getElementById('banca_type').value;
    const coverInput = document.getElementById('banca_cover');

    if (type === 'Motorized') {
        coverInput.value = 40000;
    } else {
        // Non-Motorized
        if (material === 'Wood') {
            coverInput.value = 10000;
        } else if (material === 'Fiberglass') {
            coverInput.value = 15000;
        }
    }
}


function convertFeetToMeters() {
    const ft = parseFloat(document.getElementById('util_feet').value) || 0;
    const meters = ft * 0.3048;
    document.getElementById('util_meters').value = meters.toFixed(2);
}

function goToStep(stepId) {
    saveEnrollmentState(); // Capture manual inputs before navigation
    localStorage.setItem('pcic_last_step', stepId);

    // ALL possible main containers
    const sections = [
        'farmer-info',
        'farm-details',
        'policy-details',
        'signature',
        'adss-details',
        'livestock-details',
        'banca-details'
    ];

    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const target = document.getElementById(stepId);
    if (target) {
        target.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (stepId === 'signature') {
            setTimeout(() => resizeCanvas(), 100);
        }
    }

    // Update Stepper UI (Map new views to "Step 3: Policy")
    document.querySelectorAll('.step-item').forEach(item => item.classList.remove('active'));

    let mapId = stepId;
    // Map sub-modules to the main "Policy" step indicator
    if (stepId === 'adss-details' || stepId === 'livestock-details' || stepId === 'banca-details') {
        mapId = 'policy-details';
    }

    const stepMap = { 'farmer-info': 0, 'policy-details': 1, 'farm-details': 2, 'signature': 3 };
    const idx = stepMap[mapId];
    if (idx !== undefined) {
        const items = document.querySelectorAll('.step-item');
        if (items[idx]) items[idx].classList.add('active');
    }
}

function backFromSignature() {
    const line = document.getElementById('f_insurance_line').value;
    if (line === 'Crop' || line === '') {
        goToStep('farm-details');
    } else if (line === 'ADSS') {
        goToStep('adss-details');
    } else if (line === 'Livestock') {
        goToStep('livestock-details');
    } else if (line === 'Banca') {
        goToStep('banca-details');
    } else {
        goToStep('policy-details'); // Fallback
    }
}

function toggleInsuranceView() {
    const line = document.getElementById('f_insurance_line').value;

    // HIDE ALL INTRA-POLICY SECTIONS FIRST
    document.getElementById('crop-section').style.display = 'none';

    // RESET EXTERNAL VIEWS (Safety)
    document.getElementById('adss-details').style.display = 'none';
    document.getElementById('livestock-details').style.display = 'none';
    document.getElementById('banca-details').style.display = 'none';
    document.getElementById('policy-details').style.display = 'none'; // Hide parent by default

    if (line === 'Crop' || line === '') {
        document.getElementById('policy-details').style.display = 'block';
        if (line === 'Crop') {
            document.getElementById('crop-section').style.display = 'block';
            // Show Farm Selector only for Crop
            const fs = document.getElementById('farm_selector_container');
            if (fs) fs.style.display = 'block';
        } else {
            // Hide for empty/default if needed, or keep? Usually empty means nothing selected.
            const fs = document.getElementById('farm_selector_container');
            if (fs) fs.style.display = 'none';
        }
    } else if (line === 'ADSS') {
        const fs = document.getElementById('farm_selector_container');
        if (fs) fs.style.display = 'none';
        goToStep('adss-details');
    } else if (line === 'Livestock') {
        goToStep('livestock-details');
    } else if (line === 'Banca') {
        goToStep('banca-details');
        calculateBancaCover(); // Auto-calc on entry
    }
}

// --- Step 1: Search & Results Selection ---

async function searchFarmer() {
    const idVal = document.getElementById('s_id').value.trim();
    const lnVal = document.getElementById('s_lname').value.trim();
    const fnVal = document.getElementById('s_fname').value.trim();
    const provVal = document.getElementById('s_prov').value.trim();
    const munVal = document.getElementById('s_mun').value.trim();
    const bgyVal = document.getElementById('s_bgy').value.trim();

    if (!idVal && !lnVal && !fnVal && !provVal && !munVal && !bgyVal) {
        return alert("Enter at least one criteria.");
    }

    let collection = db.profiles;

    if (idVal) {
        collection = collection.where("FarmersID").startsWithIgnoreCase(idVal).or("RSBSAID").startsWithIgnoreCase(idVal);
    } else if (lnVal) {
        collection = collection.where("LastName").startsWithIgnoreCase(lnVal);
    } else if (munVal) {
        collection = collection.where("Municipality").startsWithIgnoreCase(munVal);
    }

    let results = await collection.toArray();

    // Apply wildcards (includes)
    results = results.filter(f => {
        let match = true;
        if (idVal) match = match && ((f.FarmersID && f.FarmersID.toLowerCase().includes(idVal.toLowerCase())) || (f.RSBSAID && f.RSBSAID.toLowerCase().includes(idVal.toLowerCase())));
        if (lnVal) match = match && (f.LastName && f.LastName.toLowerCase().includes(lnVal.toLowerCase()));
        if (fnVal) match = match && (f.FirstName && f.FirstName.toLowerCase().includes(fnVal.toLowerCase()));
        if (provVal) match = match && (f.Province && f.Province.toLowerCase().includes(provVal.toLowerCase()));
        if (munVal) match = match && (f.Municipality && f.Municipality.toLowerCase().includes(munVal.toLowerCase()));
        if (bgyVal) match = match && (f.Barangay && f.Barangay.toLowerCase().includes(bgyVal.toLowerCase()));
        return match;
    });

    if (results.length === 0) {
        document.getElementById('search-results-panel').style.display = 'none';
        return alert("No matches found.");
    }

    displaySearchResults(results);
}

function displaySearchResults(farmers) {
    const panel = document.getElementById('search-results-panel');
    const list = document.getElementById('search-results-list');
    panel.style.display = 'block';

    list.innerHTML = farmers.map(f => `
            <div class="item-row" onclick="pickFarmer('${f.FarmersID}')">
                <div style="display:flex; justify-content:space-between">
                    <strong>${f.LastName}, ${f.FirstName}</strong>
                    <span style="font-size:11px; color:var(--primary)">Farmer ID: ${f.FarmersID}</span>
                </div>
                <div style="font-size:11px; color:#666; margin-top:4px;">
                    Location: ${f.Barangay || ''}, ${f.Municipality || ''}
                </div>
            </div>
        `).join('');
}

async function pickFarmer(id) {
    try {
        currentFarmer = await db.profiles.get(id);
        if (!currentFarmer) {
            alert("Error: Farmer profile not found.");
            return;
        }

        // Fetch history from CSV imports (db.records)
        let csvHistory = [];
        try {
            csvHistory = await db.records.where("FARMERSID").equals(id).toArray();
            if (!csvHistory || csvHistory.length === 0) {
                csvHistory = await db.records.where("FarmersID").equals(id).toArray();
            }
        } catch (e) { console.warn("db.records fetch error:", e); }

        // Also fetch saved applications from db.apps (ADSS, Banca, Livestock, Crop)
        let appsHistory = [];
        try {
            appsHistory = await db.apps.where("FarmersID").equals(id).toArray();
        } catch (e) { console.warn("db.apps fetch error:", e); }

        // Merge both sources — apps first so they appear at top of dropdown
        currentFarmerHistory = [...appsHistory, ...csvHistory];

        // Save state to persist across reloads
        localStorage.setItem('pcic_enrollment_active', 'true');
        localStorage.setItem('pcic_current_farmer', JSON.stringify(currentFarmer));
        localStorage.setItem('pcic_farmer_history', JSON.stringify(currentFarmerHistory));
        localStorage.setItem('pcic_current_history', 'null'); // No specific history record selected yet

        // Direct to Form
        document.getElementById('search-results-panel').style.display = 'none';

        // Load Form UI
        // We pass the history array so the dropdown can be populated immediately
        displayEnrollmentFormUI(currentFarmerHistory);

        // Ensure we start at the top
        goToStep('farmer-info');

    } catch (e) {
        console.error("Error picking farmer:", e);
        alert("An error occurred while selecting the farmer.");
    }
}

// --- Step 2: History Modal ---

// --- Step 2: History Modal (Legacy - Removed in Simplified Flow) ---

/*
function showHistoryModal(farmer, history) {
    document.getElementById('modal-title').innerText = `Insurance History: ${farmer.LastName}`;
    const content = document.getElementById('modal-content-list');
 
    content.innerHTML = history.length > 0 ? '' : '<p style="text-align:center; padding:15px; color:#888">No previous records. Proceed to new enrollment.</p>';
 
    // Sort history by production date (newest to oldest)
    // Remove duplicates based on Farm ID and Production Date
    const uniqueHistory = [];
    const seen = new Set();
 
    history.forEach(r => {
        const farmID = r.FARMID || r.FarmID || '';
        const prodDate = r.PRODUCTIONDATE || r.ProductionDate || r.DATEOFPLANTING || '';
        const key = `${farmID}_${prodDate}_${r.AREA}`;
 
        if (!seen.has(key)) {
            seen.add(key);
            uniqueHistory.push(r);
        }
    });
 
    const sortedHistory = uniqueHistory.sort((a, b) => {
        const getDate = (item) => {
            const dStr = item.PRODUCTIONDATE || item.ProductionDate || item.DATEOFPLANTING || '';
            const d = new Date(dStr);
            // Return huge negative number if invalid so it goes to bottom, or 0
            return isNaN(d.getTime()) ? 0 : d.getTime();
        };
        // Descending: Newest first
        return getDate(b) - getDate(a);
    });
 
    sortedHistory.forEach(r => {
        const div = document.createElement('div');
        div.className = 'item-row';
 
        const farmID = r.FARMID || r.FarmID || 'N/A';
        const farmName = r.FARMNAME || r.FarmName || 'N/A';
        const productionDate = r.PRODUCTIONDATE || r.ProductionDate || r.DATEOFPLANTING || 'N/A';
 
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between">
                <strong>${farmID}</strong>
                <span style="font-size:11px; font-weight:bold; color:var(--primary)">RENEW THIS &rarr;</span>
            </div>
            <div style="font-size:11px; margin-top:3px;">${r.PROGRAMTYPE || 'CROP'} | Farm: ${farmName}</div>
            <div style="font-size:11px; margin-top:2px;">Area: ${r.AREA || '0'} ha | Production Date: ${productionDate}</div>
            <div style="font-size:10px; color:#888; font-style:italic">Boundaries: N:${r.NORTH} S:${r.SOUTH} E:${r.EAST} W:${r.WEST}</div>
        `;
        div.onclick = () => loadEnrollmentForm(r);
        content.appendChild(div);
    });
 
    const newBtn = document.createElement('button');
    newBtn.className = 'btn-submit';
    newBtn.innerText = "START NEW ENROLLMENT (NO RENEWAL)";
    newBtn.onclick = () => loadEnrollmentForm();
    content.appendChild(newBtn);
 
    document.getElementById('modal-overlay').style.display = 'flex';
}
*/

function loadEnrollmentForm(history = null) {
    closeModal();

    // Save State
    localStorage.setItem('pcic_enrollment_active', 'true');
    if (currentFarmer) localStorage.setItem('pcic_current_farmer', JSON.stringify(currentFarmer));
    localStorage.setItem('pcic_current_history', JSON.stringify(history));

    // Switch View Logic to "Enrollment Form"
    showView('enrollment-form');
}

// Separated UI logic from State Saving logic
// --- 3. FARM SELECTOR & MAPPING LOGIC ---

// Centralized function to map ANY history record (from Profile or Dropdown) to the Form
// Moved to global scope for consistency and input event dispatching.
// Scope: 'all' (default) = fill everything; 'farm' = fill only farm details (Area, Location, Boundaries)
function fillPolicyFromRecord(history, scope = 'all') {
    console.log(`fillPolicyFromRecord (scope=${scope}):`, history);
    if (!history) return;

    // --- POLICY DETAILS (Only if scope is 'all') ---
    if (scope === 'all') {
        // Amount of Cover
        let cover = history.AmountCover || history.AMOUNT_OF_COVER || history["AMOUNT OF COVER"];
        if (cover) {
            cover = String(cover).replace(/,/g, '');
            safeSet('f_amount_cover', cover);
        }

        // Variety (Crop)
        const variety = history.Variety || history.VarietyName || history.VARIETYNAME || history.VARIETY_NAME || history["VARIETY NAME"] || history.VARIETY || '';
        safeSet('f_variety', variety);

        // Type of Planting
        const top = history.TypePlanting || history.TYPE_OF_PLANTING || history["TYPE OF PLANTING"] || history.TYPEOFPLANTING || '';
        safeSet('f_top', top);

        // Planting Date
        let plantDate = history.Planting || history.PRODUCTIONDATE || history.ProductionDate || history.PRODUCTION_DATE || history["PRODUCTION DATE"] || history.DATE_OF_TRANSPLANT || history["DATE OF TRANSPLANT"] || history.DATEOFTRANSPLANT || '';
        if (!plantDate || plantDate === '-') plantDate = history.DATE_OF_SOWING || history["DATE OF SOWING"] || history.DATEOFSOWING || '';

        // Date Normalization (MM/DD/YYYY -> YYYY-MM-DD)
        if (plantDate && plantDate.includes('/')) {
            const parts = plantDate.split('/');
            if (parts.length === 3) {
                const mm = parts[0].padStart(2, '0');
                const dd = parts[1].padStart(2, '0');
                const yyyy = parts[2];
                plantDate = `${yyyy}-${mm}-${dd}`;
            }
        }
        safeSet('f_plant', plantDate);
        safeSet('sow_date', plantDate);

        // Harvest Date (Optional but good to have)
        let harvDate = history.ExpectedHarvest || history.DATE_OF_HARVEST || history["DATE OF HARVEST"];
        if (harvDate && harvDate.includes('/')) {
            const parts = harvDate.split('/');
            if (parts.length === 3) {
                const mm = parts[0].padStart(2, '0');
                const dd = parts[1].padStart(2, '0');
                const yyyy = parts[2];
                harvDate = `${yyyy}-${mm}-${dd}`;
            }
        }
        // safeSet('f_harvest', harvDate); 

        // Insurance Line Detection (with fallbacks for older/imported records)
        let line = history.InsuranceLine || history.INSURANCELINE || '';
        const cropType = (history.CropType || history.CROPTYPE || '').toUpperCase();

        if (!line) {
            if (cropType === 'ADSS') line = 'ADSS';
            else if (cropType === 'LIVESTOCK') line = 'Livestock';
            else if (cropType === 'BANCA') line = 'Banca';
            else line = 'Crop'; // Default
        }

        // Normalize
        if (line.toUpperCase() === 'CROP') line = 'Crop';
        else if (line.toUpperCase() === 'LIVESTOCK') line = 'Livestock';
        else if (line.toUpperCase() === 'ADSS') line = 'ADSS';
        else if (line.toUpperCase() === 'BANCA') line = 'Banca';

        safeSet('f_insurance_line', line);
        if (typeof toggleInsuranceView === 'function') toggleInsuranceView();

        // Crop Type Intelligence — only run for Crop line
        if (line === 'Crop') {
            let cropType = history.CropType || history.CROPTYPE || history["CROP TYPE"];
            if (!cropType) {
                if (variety && (variety.toUpperCase().includes('RC') || variety.toUpperCase().includes('RICE'))) {
                    cropType = 'Rice';
                } else if (variety && (variety.toUpperCase().includes('CORN'))) {
                    cropType = 'Corn';
                } else {
                    cropType = 'Rice'; // Default fallback
                }
            }
            if (cropType) {
                const cropSelect = document.getElementById('f_crop_unified');
                if (cropSelect) {
                    for (let i = 0; i < cropSelect.options.length; i++) {
                        if (cropSelect.options[i].value.toLowerCase() === cropType.toLowerCase()) {
                            cropSelect.value = cropSelect.options[i].value;
                            break;
                        }
                    }
                }
            }
            if (typeof handleCropUnified === 'function') handleCropUnified();
            // Restore CropSubType after handleCropUnified populates the sub-type dropdown
            const savedSubType = history.CropSubType || '';
            if (savedSubType) {
                const subTypeEl = document.getElementById('crop_subtype');
                if (subTypeEl) subTypeEl.value = savedSubType;
            }

            // Restore Farm Name
            const farmName = history.FARMNAME || history.FarmName || history.farmName || '';
            safeSet('f_farm_name_hidden', farmName);
        }

        // --- ADSS-Specific Field Restore ---
        // Use setTimeout to ensure fields are set AFTER toggleInsuranceView/goToStep finishes
        if (line === 'ADSS') {
            console.log('=== ADSS RESTORE: history object keys:', Object.keys(history));
            setTimeout(() => {
                console.log('=== ADSS RESTORE setTimeout firing ===');
                // Robust key detection for various source formats
                const occ = history.Occupation || history.OCCUPATION || '';
                const addr = history.Address || history.Sitio || history.WORKADDR || history.WORK_ADDR || '';
                const prem = history.Premium || history.PREMIUM || '';
                const cover = history.AmountCover || history.AMOUNT_COVER || history.AMOUNTCOVER || '';
                const isMinor = history.IsMinor || history.ISMINOR || history.Is_Minor || false;

                safeSet('adss_occupation', occ);
                safeSet('adss_work_addr', addr);
                safeSet('adss_premium', prem);
                safeSet('adss_cover', cover);

                const minorEl = document.getElementById('adss_is_minor');
                if (minorEl) {
                    minorEl.checked = !!isMinor;
                    minorEl.dispatchEvent(new Event('change', { bubbles: true }));
                }

                // Primary Beneficiary (stored as BeneSecondary due to legacy naming)
                const b1name = history.BeneSecondary || history.BENESECONDARY || history.BENE_SECONDARY || '';
                const b1rel = history.BeneSecondaryRel || history.BENESECONDARYREL || history.BENE_SECONDARY_REL || '';
                const b1bday = history.BeneSecondaryBday || history.BENESECONDARYBDAY || history.BENE_SECONDARY_BDAY || '';

                safeSet('adss_ben1_name', b1name);
                safeSet('adss_ben1_rel', b1rel);
                safeSet('adss_ben1_bday', b1bday);

                // Secondary Beneficiary
                const b2name = history.BeneSecondary2 || history.BENESECONDARY2 || '';
                const b2rel = history.BeneSecondary2Rel || history.BENESECONDARY2REL || '';
                const b2bday = history.BeneSecondary2Bday || history.BENESECONDARY2BDAY || '';

                safeSet('adss_ben2_name', b2name);
                safeSet('adss_ben2_rel', b2rel);
                safeSet('adss_ben2_bday', b2bday);

                console.log('=== ADSS RESTORE COMPLETED ===');
                // CRITICAL: Save the state now that we've filled the fields
                if (typeof saveEnrollmentState === 'function') saveEnrollmentState();
            }, 300);
        }

        // --- Livestock-Specific Field Restore ---
        if (line === 'Livestock') {
            setTimeout(() => {
                console.log('=== LIVESTOCK RESTORE: Parsing animals... ===');
                const tbody = document.getElementById('animal_list_body');
                if (tbody) tbody.innerHTML = ''; // Clear existing rows

                try {
                    const animalsArr = history.Animals ? JSON.parse(history.Animals) : [];
                    if (Array.isArray(animalsArr)) {
                        animalsArr.forEach(ani => {
                            // Dynamic row creation
                            const rowId = 'row_' + Math.random().toString(36).substr(2, 9);
                            const tr = document.createElement('tr');
                            tr.id = rowId;
                            tr.innerHTML = `
                                        <td><select class="l-class" style="width:90%"></select></td>
                                        <td><input type="text" class="l-tag" placeholder="Tag/Bldg#" style="width:90%" value="${ani.tag || ''}"></td>
                                        <td><input type="number" class="l-male" placeholder="M" style="width:45px" value="${ani.m || ''}"></td>
                                        <td><input type="number" class="l-female" placeholder="F" style="width:45px" value="${ani.f || ''}"></td>
                                        <td><input type="text" class="l-age" placeholder="Age" style="width:90%" value="${ani.age || ''}"></td>
                                        <td><input type="date" class="l-dob" style="width:95%" value="${ani.dob || ''}"></td>
                                        <td><input type="text" class="l-breed" placeholder="Breed" style="width:90%" value="${ani.breed || ''}"></td>
                                        <td><input type="text" class="l-color" placeholder="Color" style="width:90%" value="${ani.color || ''}"></td>
                                        <td><input type="number" class="l-value" placeholder="Price" style="width:90%" value="${ani.price || ''}"></td>
                                        <td><button onclick="removeAnimalRow('${rowId}')" style="color:red; background:none; border:none; cursor:pointer;">&times;</button></td>
                                    `;
                            tbody.appendChild(tr);
                            if (typeof refreshAnimalClassifications === 'function') refreshAnimalClassifications();
                            // Set the select value after refresh
                            const sel = tr.querySelector('.l-class');
                            if (sel) sel.value = ani.class || '';
                        });
                    }
                } catch (e) {
                    console.error('Error parsing Livestock history.Animals:', e);
                }

                // Common fields
                safeSet('livestock_location', history.Sitio || history.Address || '');
                safeSet('livestock_premium', history.Premium || '');
                safeSet('livestock_cover', history.AmountCover || '');
                safeSet('livestock_bene', history.Beneficiary || '');
                safeSet('livestock_bene_rel', history.BeneRelationship || '');

                if (typeof saveEnrollmentState === 'function') saveEnrollmentState();
                console.log('=== LIVESTOCK RESTORE COMPLETED ===');
            }, 300);
        }

        // --- Banca-Specific Field Restore ---
        if (line === 'Banca') {
            setTimeout(() => {
                safeSet('banca_port', history.Address || '');
                safeSet('banca_usage', history.Usage || 'Fishing');
                const chk = document.getElementById('chk_banca_same_addr');
                if (chk) chk.checked = false;
                safeSet('banca_crew', history.Manning || '');
                safeSet('banca_material', history.BoatMaterial || 'Wood');
                safeSet('banca_type', history.BoatType || 'Motorized');
                safeSet('banca_hp', history.HullNo || '');
                safeSet('banca_chassis', history.ChassisNo || '');
                safeSet('banca_age', history.BoatAge || '');
                safeSet('banca_color', history.Color || '');
                safeSet('banca_length', history.BancaLength || '');
                safeSet('banca_width', history.BancaWidth || '');
                safeSet('banca_depth', history.BancaDepth || '');
                safeSet('banca_others', history.Others || '');
                safeSet('banca_cover', history.AmountCover || '');
                safeSet('banca_period_from', history.PeriodFrom || '');
                safeSet('banca_period_to', history.PeriodTo || '');
                safeSet('banca_bene_primary', history.Beneficiary || '');
                safeSet('banca_bene_rel', history.BeneRelationship || '');
                safeSet('banca_mortgage_to', history.MortgageTo || '');
                safeSet('banca_mortgage_branch', history.MortgageBranch || '');
                safeSet('banca_mortgage_addr', history.MortgageAddr || '');

                // CRITICAL: Save state
                if (typeof saveEnrollmentState === 'function') saveEnrollmentState();
            }, 300);
        }
    } // End if scope === 'all'

    // --- FARM DETAILS (Run if scope is 'all' OR 'farm') ---
    if (scope === 'all' || scope === 'farm') {
        // Farm ID
        safeSet('f_farmid', history.FARMID || history.FarmID || history.FarmId || history.farmid);

        // Area
        safeSet('f_area', history.Area || history.AREA || history.area);

        // Location
        safeSet('f_farm_prov', history.ProvFarm || history.PROVINCE || history.Province || history.province);
        safeSet('f_farm_mun', history.MUNICIPALITY || history.Municipality || history.municipality);
        safeSet('f_farm_bgy', history.BrgyFarm || history.BARANGAY || history.Barangay || history.barangay);
        safeSet('f_farm_purok', history.FarmPurok || history.Sitio || history.StFarm || '');

        // Boundaries
        safeSet('f_north', history.North || history.NORTH || history.north);
        safeSet('f_south', history.South || history.SOUTH || history.south);
        safeSet('f_east', history.East || history.EAST || history.east);
        safeSet('f_west', history.West || history.WEST || history.west);

        // Georef
        const geo = history.Georef || history.GEOREF_ID || history["GEOREF ID"];
        if (geo && geo !== '-') safeSet('f_georef', geo);

        // Recalculate cover if Area changed (logic inside calculateTotalCover reads f_area and f_crop_unified)
        // We use setTimeout to allow value propagation
        setTimeout(() => {
            if (typeof calculateTotalCover === 'function') calculateTotalCover();
        }, 100);
    }
}



function onFarmSelect() {
    const select = document.getElementById('f_farm_select');
    const indexVal = select.value;
    const history = currentFarmerHistory; // Global variable

    if (indexVal === "" || !history) {
        safeSet('f_farmid', '');
        localStorage.setItem('pcic_current_history', 'null');
        return;
    }

    const rec = history[indexVal];
    if (rec) {
        // CRITICAL: Update localStorage BASE object before filling.
        // This prevents saveEnrollmentState (triggered by goToStep inside fillPolicyFromRecord)
        // from overwriting the fields with blank/stale data.
        localStorage.setItem('pcic_current_history', JSON.stringify(rec));

        // Use our centralized function!
        fillPolicyFromRecord(rec, 'farm');
    }
}

// --- END FARM SELECTOR LOGIC ---

// --- Farm Selector Population Logic ---
function populateFarmDropdown(historyArray) {
    const container = document.getElementById('farm_selector_container');
    const select = document.getElementById('f_farm_select');

    if (!container || !select) {
        // console.warn('Farm selector elements not found in DOM.');
        return;
    }

    // Safety check: ensure historyArray is actually an array with items
    if (!historyArray || !Array.isArray(historyArray) || historyArray.length === 0) {
        console.log('No history to populate farm dropdown.');
        container.style.display = 'none';
        return;
    }

    console.log(`Populating farm dropdown with ${historyArray.length} records.`);
    container.style.display = 'block';

    // Clear existing options, keeping the default placeholder
    select.innerHTML = '<option value="">-- Select a Farm to Auto-fill --</option>';

    historyArray.forEach((farm, index) => {
        const option = document.createElement('option');
        option.value = index; // The index in the history array

        // Detect if this is a db.apps record (saved application) vs db.records (CSV import)
        const insuranceLine = farm.InsuranceLine || farm.INSURANCELINE || '';
        if (insuranceLine && insuranceLine.toUpperCase() !== 'CROP') {
            // db.apps record (ADSS, Banca, Livestock)
            const policy = farm.PolicyNumber || farm.POLICYNUMBER || farm.policyNumber || 'No Policy';
            const dateSaved = farm.DateSaved || farm.dateSaved || farm.DATESAVED || '';
            const dateStr = dateSaved ? ` | Saved: ${dateSaved.substring(0, 10)}` : '';
            option.textContent = `[${insuranceLine}] Policy: ${policy}${dateStr}`;
        } else {
            // db.records record (CSV import — Crop)
            const farmId = farm.FARMID || farm.FarmID || farm.FarmId || farm.farmid || 'No ID';
            const area = farm.AREA || farm.Area || farm.area || '0';
            const variety = farm.VARIETYNAME || farm.VarietyName || farm['VARIETY NAME'] || farm['Variety Name'] || farm.Variety || farm.variety || farm.VARIETY || '-';
            const farmName = farm.FARMNAME || farm.FarmName || farm.farmName || '-';
            const prodDate = farm.PRODUCTIONDATE || farm.ProductionDate || farm.PRODUCTION_DATE || farm['PRODUCTION DATE'] || farm.Planting || farm.DATEOFTRANSPLANT || farm['DATE OF TRANSPLANT'] || farm.DATEOFSOWING || farm['DATE OF SOWING'] || '-';
            const n = farm.NORTH || farm.North || farm.north || '—';
            const s = farm.SOUTH || farm.South || farm.south || '—';
            const e = farm.EAST || farm.East || farm.east || '—';
            const w = farm.WEST || farm.West || farm.west || '—';
            option.textContent = `ID: ${farmId} | Area: ${area} Ha | Farm: ${farmName} | N:${n} S:${s} E:${e} W:${w} | Var: ${variety} | Date: ${prodDate}`;
        }

        select.appendChild(option);
    });
}

async function displayEnrollmentFormUI(history) {
    // safeSet logic now handled by global robust version.
    console.log('=== displayEnrollmentFormUI CALLED ===');
    console.log('History parameter:', history);

    // Populate farm dropdown if history exists
    populateFarmDropdown(history);

    document.getElementById('search-card').style.display = 'none';
    document.getElementById('view-enrollment-form').style.display = 'block';

    // Ensure currentFarmer exists (safety)
    const cf = currentFarmer || {};
    console.log('currentFarmer status:', cf.LastName ? 'Populated' : 'Empty');
    if (cf.LastName) console.table(cf);

    // Auto-fill identification


    safeSet('f_id', cf.FarmersID);

    // Handle ReadOnly State for Walk-In vs Profile
    // Walk-ins are identified by an auto-generated WALK-IN- prefix or empty ID.
    // Profile farmers have real externally-assigned IDs and their fields are locked.
    const isWalkIn = !cf.FarmersID || cf.FarmersID.startsWith('WALK-IN-');
    const idEl = document.getElementById('f_id');
    if (idEl) idEl.readOnly = !isWalkIn;

    safeSet('f_rsbsa', cf.RSBSAID || cf.RSBSANO);
    safeSet('f_ncfrs', cf.NCFRSID);
    safeSet('f_extname', cf.ExtName);
    safeSet('f_lname', cf.LastName);
    safeSet('f_fname', cf.FirstName);
    safeSet('f_midname', cf.MiddlName || cf.Middlename || cf.middlename);
    // Normalize Sex: match select options (Male / Female) regardless of CSV casing
    const rawSex = (cf.Sex || cf.sex || '').trim().toUpperCase();
    const normalizedSex = rawSex === 'MALE' || rawSex === 'M' ? 'Male'
        : rawSex === 'FEMALE' || rawSex === 'F' ? 'Female' : '';
    safeSet('f_sex', normalizedSex);

    // Normalize Civil Status: match select options regardless of CSV casing
    const rawCivil = (cf.CivilStatus || cf.civilstatus || '').trim().toUpperCase();
    const normalizedCivil = rawCivil === 'SINGLE' ? 'Single'
        : rawCivil === 'MARRIED' ? 'Married'
            : (rawCivil === 'WIDOW' || rawCivil === 'WIDOWER' || rawCivil === 'WIDOW/ER' || rawCivil === 'WIDOW/WIDOWER') ? 'Widow/er'
                : rawCivil === 'SEPARATED' ? 'Separated' : '';
    safeSet('f_civil', normalizedCivil);

    // Robust Birthdate Mapping & Normalization
    let bday = cf.Birthdate || cf.birthdate || cf.BIRTHDATE;
    if (bday && bday.includes('/')) {
        const parts = bday.split('/');
        if (parts.length === 3) {
            const mm = parts[0].padStart(2, '0');
            const dd = parts[1].padStart(2, '0');
            const yyyy = parts[2];
            bday = `${yyyy}-${mm}-${dd}`;
        }
    }
    safeSet('f_bday', bday);

    // Auto-fill address fields
    safeSet('f_prov_farmer', cf.Province);
    safeSet('f_mun_farmer', cf.Municipality);
    safeSet('f_brgy_farmer', cf.Barangay);
    safeSet('f_st_farmer', cf.Street);

    ['f_id', 'f_lname', 'f_fname'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.readOnly = !isWalkIn;
    });

    // Load Farmer Photo if exists
    if (cf.Photo) {
        const photoInput = document.getElementById('f_photo_data');
        const photoPrev = document.getElementById('farmer-photo-preview');
        if (photoInput) photoInput.value = cf.Photo;
        if (photoPrev) photoPrev.innerHTML = `<img src="${cf.Photo}" alt="Farmer Photo">`;
    } else {
        const photoInput = document.getElementById('f_photo_data');
        const photoPrev = document.getElementById('farmer-photo-preview');
        if (photoInput) photoInput.value = '';
        if (photoPrev) photoPrev.innerHTML = `<i class="fas fa-user"></i>`;
    }

    safeSet('f_bene', cf.Benefeciary);
    safeSet('f_bene_rel', cf.BeneficiaryRelationship);
    safeSet('f_bene_bday', cf.BeneficiaryBirthdate);
    // SecondBenefeciary is ADSS-only — maps to the ADSS Primary Beneficiary input
    safeSet('adss_ben1_name', cf.SecondBenefeciary);
    safeSet('f_mobile', cf.Mobile || cf.mobile || cf.MOBILE || cf.ContactNumber);
    safeSet('f_spouse', cf.Spouse);
    safeSet('f_sector', cf.Sector || 'N/A');
    safeSet('f_guardian', cf.Guardian);
    safeSet('f_guardian_rel', cf.GuardianRelationship);
    safeSet('f_guardian_bday', cf.GuardianBirthdate);

    // Auto-fill payment details
    const hist = history || {};
    safeSet('f_acc', hist.Account || cf.Account);
    safeSet('f_mop', hist.PaymentMethod || cf.PaymentMethod || 'Palawan Express');

    if (typeof handleCivilStatus === 'function') handleCivilStatus();

    // Auto-fill details from history if available
    // FIX: Only fill if history is a specific record object, NOT the history array.
    if (history && !Array.isArray(history)) {
        console.log('--- Loading history details via fillPolicyFromRecord ---');
        fillPolicyFromRecord(history);
    } else if (!history) {
        // Auto delete the previous farm details when new policy is clicked
        if (typeof onFarmSelect === 'function') {
            onFarmSelect("");
        }
    }

    // Populate Farm Selector (Crucial for "Select from Existing" feature)
    // functionality now relies on global currentFarmerHistory
    if (typeof currentFarmerHistory !== 'undefined') {
        populateFarmDropdown(currentFarmerHistory);
    }

    setTimeout(() => {
        const areaEl = document.getElementById('f_area');
        if (areaEl && areaEl.value && typeof calculateTotalCover === 'function') {
            calculateTotalCover();
        }
    }, 300);

    setTimeout(() => {
        if (typeof resizeCanvas === 'function') resizeCanvas();
        if (window.signaturePad) signaturePad.clear();
    }, 50);
}

// --- Farm Selector Logic ---




// --- Farm Selector Logic (Legacy Removed) ---
// The robust onFarmSelect is defined above and uses fillPolicyFromRecord.


function closeModal() { document.getElementById('modal-overlay').style.display = 'none'; }

// --- Finalization ---

async function finalizeApplication(mode = 'complete') {
    const line = document.getElementById('f_insurance_line').value || 'Crop';

    // --- FORM VALIDATION ENGINE START ---
    const requiredFields = {
        'FarmDetails': [
            { id: 'f_north', name: 'North Boundary (Farm Details)' },
            { id: 'f_south', name: 'South Boundary (Farm Details)' },
            { id: 'f_east', name: 'East Boundary (Farm Details)' },
            { id: 'f_west', name: 'West Boundary (Farm Details)' },
            { id: 'f_farm_prov', name: 'Farm Province' },
            { id: 'f_farm_mun', name: 'Farm Municipality' },
            { id: 'f_farm_bgy', name: 'Farm Barangay' },
            { id: 'f_farm_purok', name: 'Farm Purok/Sitio' },
            { id: 'f_area', name: 'Area (ha)' }
        ],
        'Crop': [
            { id: 'f_crop_unified', name: 'Crop Type' },
            { id: 'f_top', name: 'Planting Type' },
            { id: 'f_variety', name: 'Variety' },
            { id: 'sow_date', name: 'Date Sowing' },
            { id: 'f_plant', name: 'Date Planting' }
        ],
        'Livestock': [
            { id: 'live_prov', name: 'Province (Livestock)' },
            { id: 'live_mun', name: 'Municipality (Livestock)' },
            { id: 'live_bgy', name: 'Barangay (Livestock)' },
            { id: 'live_sitio', name: 'Sitio/Purok (Livestock)' },
            { id: 'live_animal_type', name: 'Animal Type' }
        ],
        'Banca': [
            { id: 'banca_port', name: 'Home Port / Fishing Area' },
            { id: 'banca_usage', name: 'Usage' },
            { id: 'banca_crew', name: 'Tonnage' },
            { id: 'banca_material', name: 'Material' },
            { id: 'banca_type', name: 'Type of Boat' },
            { id: 'banca_hp', name: 'Motor No' },
            { id: 'banca_chassis', name: 'Chassis No' },
            { id: 'banca_age', name: 'Age of Boat' },
            { id: 'banca_color', name: 'Boat Color' },
            { id: 'banca_length', name: 'Length (m)' },
            { id: 'banca_width', name: 'Width (m)' },
            { id: 'banca_depth', name: 'Depth (m)' },
            { id: 'banca_cover', name: 'Amount Cover (Banca)' },
            { id: 'banca_period_from', name: 'Period From' },
            { id: 'banca_period_to', name: 'Period To' },
            { id: 'banca_bene_primary', name: 'Primary Beneficiary (Banca)' },
            { id: 'banca_bene_rel', name: 'Beneficiary Relationship (Banca)' }
        ],
        'ADSS': [
            { id: 'adss_occupation', name: 'Occupation' },
            { id: 'adss_work_addr', name: 'Work Address' },
            { id: 'adss_premium', name: 'Premium Amount' },
            { id: 'adss_ben1_name', name: 'Primary Beneficiary Name' },
            { id: 'adss_ben1_rel', name: 'Primary Beneficiary Relationship' },
            { id: 'adss_ben1_bday', name: 'Primary Beneficiary Birthdate' }
        ]
    };

    let allMissingFields = [];
    let firstElementToFocus = null;

    // Helper to check fields
    const checkFields = (fields) => {
        for (let field of fields) {
            const el = document.getElementById(field.id);
            if (!el || el.value.trim() === '') {
                allMissingFields.push(field.name);
                if (!firstElementToFocus && el) firstElementToFocus = el;
            }
        }
    };

    // 1. Validate Farm Details (Only Required for Crop)
    if (line === 'Crop') {
        checkFields(requiredFields['FarmDetails']);
    }

    // 2. Validate Specific Insurance Line
    if (requiredFields[line]) {
        checkFields(requiredFields[line]);

        // Special Checks
        if (line === 'Livestock') {
            const tbody = document.getElementById('animal_list_body');
            const rowCount = tbody ? tbody.getElementsByTagName('tr').length : 0;
            if (rowCount !== 1) { // User requested STRICTLY ONE row limit
                allMissingFields.push(`Livestock requires exactly 1 animal row (Currently has ${rowCount})`);
            }
        }
    }

    if (allMissingFields.length > 0) {
        alert("Please fill in the following required fields:\n\n- " + allMissingFields.join('\n- '));
        if (firstElementToFocus) firstElementToFocus.focus();
        return; // Halt submission
    }
    // --- FORM VALIDATION ENGINE END ---

    if (signaturePad.isEmpty()) return alert("Signature required.");
    if (!document.getElementById('consent_certify').checked) return alert("Please certify that the information provided is correct.");
    if (!document.getElementById('consent_privacy').checked) return alert("Please agree to the Data Privacy Consent terms.");

    // Ensure currentFarmer is populated for saving
    if (!currentFarmer) currentFarmer = {}; // Safety init

    // Always sync FarmersID from the f_id field in case agent edited it
    const fidEl = document.getElementById('f_id');
    if (fidEl && fidEl.value) {
        currentFarmer.FarmersID = fidEl.value;
    }
    // Fallback: generate an ID if somehow still blank
    if (!currentFarmer.FarmersID) {
        const now = new Date();
        const timestamp = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '-' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        currentFarmer.FarmersID = `WALK-IN-${getDeviceID()}-${timestamp}`;
        if (fidEl) fidEl.value = currentFarmer.FarmersID;
    }
    // Sync name fields for walk-ins
    if (!currentFarmer.LastName) {
        currentFarmer.LastName = document.getElementById('f_lname').value;
        currentFarmer.FirstName = document.getElementById('f_fname').value;
    }

    // Auto-generate Farm ID if blank for walk-ins
    let farmID = document.getElementById('f_farmid') ? document.getElementById('f_farmid').value : '';
    if (!farmID) {
        const now = new Date();
        const timestamp = now.getFullYear() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '-' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
        farmID = `F-${getDeviceID()}-${timestamp}`;
        if (document.getElementById('f_farmid')) {
            document.getElementById('f_farmid').value = farmID;
        }
    }
    let data = {};

    // Common Farmer Info
    const photoData = document.getElementById('f_photo_data').value;

    // Update the profile object as well
    if (currentFarmer) {
        currentFarmer.Photo = photoData;
        currentFarmer.Guardian = document.getElementById('f_guardian') ? document.getElementById('f_guardian').value : '';
        currentFarmer.GuardianRelationship = document.getElementById('f_guardian_rel') ? document.getElementById('f_guardian_rel').value : '';
        currentFarmer.GuardianBirthdate = document.getElementById('f_guardian_bday') ? document.getElementById('f_guardian_bday').value : '';
    }

    const isMinor = document.getElementById('adss_is_minor')?.checked || false;
    if (isMinor && guardianSignaturePad.isEmpty()) {
        return alert("Guardian signature required for minor applicants.");
    }

    const commonData = {
        FarmersID: currentFarmer.FarmersID,
        FarmID: farmID,
        RSBSAID: document.getElementById('f_rsbsa') ? document.getElementById('f_rsbsa').value : '',
        NCFRSID: document.getElementById('f_ncfrs') ? document.getElementById('f_ncfrs').value : '',
        LastName: document.getElementById('f_lname').value,
        FirstName: document.getElementById('f_fname').value,
        MiddlName: document.getElementById('f_midname').value,
        ExtName: document.getElementById('f_extname') ? document.getElementById('f_extname').value : '',
        Birthdate: document.getElementById('f_bday').value,
        Sex: document.getElementById('f_sex').value,
        CivilStatus: document.getElementById('f_civil') ? document.getElementById('f_civil').value : '',
        ProvFarmer: document.getElementById('f_prov_farmer') ? document.getElementById('f_prov_farmer').value : '',
        MunFarmer: document.getElementById('f_mun_farmer') ? document.getElementById('f_mun_farmer').value : '',
        BrgyFarmer: document.getElementById('f_brgy_farmer') ? document.getElementById('f_brgy_farmer').value : '',
        StFarmer: document.getElementById('f_st_farmer') ? document.getElementById('f_st_farmer').value : '',
        Mobile: document.getElementById('f_mobile').value,
        Spouse: document.getElementById('f_spouse').value,
        Sector: document.getElementById('f_sector') ? document.getElementById('f_sector').value : '',
        Beneficiary: document.getElementById('f_bene') ? document.getElementById('f_bene').value : '',
        BeneRelationship: document.getElementById('f_bene_rel') ? document.getElementById('f_bene_rel').value : '',
        BeneBirthdate: document.getElementById('f_bene_bday') ? document.getElementById('f_bene_bday').value : '',
        Guardian: document.getElementById('f_guardian') ? document.getElementById('f_guardian').value : '',
        GuardianRelationship: document.getElementById('f_guardian_rel') ? document.getElementById('f_guardian_rel').value : '',
        GuardianBirthdate: document.getElementById('f_guardian_bday') ? document.getElementById('f_guardian_bday').value : '',
        Region: '10',
        Photo: photoData,

        InsuranceLine: line,
        PaymentMethod: document.getElementById('f_mop').value,
        Account: document.getElementById('f_acc').value,
        Signature: signaturePad.toDataURL('image/png'),
        GuardianSignature: isMinor ? guardianSignaturePad.toDataURL('image/png') : '',
        timestamp: new Date().toISOString()
    };

    if (line === 'ADSS') {
        data = {
            ...commonData,
            CropType: 'ADSS',
            CivilStatus: document.getElementById('adss_civil_status')?.value || document.getElementById('f_civil')?.value || '', // Use ADSS-specific or fallback to common civil status
            Occupation: document.getElementById('adss_occupation').value,
            Address: document.getElementById('adss_work_addr').value,
            BeneSecondary: document.getElementById('adss_ben1_name').value, // Primary in UI is Secondary in System
            BeneSecondaryRel: document.getElementById('adss_ben1_rel').value,
            BeneSecondaryBday: document.getElementById('adss_ben1_bday').value,
            BeneSecondary2: document.getElementById('adss_ben2_name').value,
            BeneSecondary2Rel: document.getElementById('adss_ben2_rel').value,
            BeneSecondary2Bday: document.getElementById('adss_ben2_bday').value,
            Premium: document.getElementById('adss_premium').value,
            AmountCover: document.getElementById('adss_cover').value,
            Guardian: document.getElementById('f_guardian') ? document.getElementById('f_guardian').value : '',
            IsMinor: document.getElementById('adss_is_minor')?.checked || false,
            Sitio: document.getElementById('adss_work_addr').value,
            Month: new Date().toISOString().substring(0, 7)
        };
    }
    else if (line === 'Livestock') {
        // Gather Animals
        const animals = [];
        let totalValue = 0;
        document.querySelectorAll('#animal_list_body tr').forEach(tr => {
            const classVal = tr.querySelector('.l-class').value;
            if (classVal) {
                const val = parseFloat(tr.querySelector('.l-value').value) || 0;
                totalValue += val;
                animals.push({
                    Class: classVal,
                    Tag: tr.querySelector('.l-tag').value,
                    Male: tr.querySelector('.l-male').value,
                    Female: tr.querySelector('.l-female').value,
                    Age: tr.querySelector('.l-age').value,
                    DOB: tr.querySelector('.l-dob').value,
                    Breed: tr.querySelector('.l-breed').value,
                    Color: tr.querySelector('.l-color').value,
                    Value: val
                });
            }
        });

        if (animals.length === 0) return alert("Please add at least one animal.");

        data = {
            ...commonData,
            CropType: 'LIVESTOCK',
            CivilStatus: document.getElementById('f_civil').value,
            ProvFarm: document.getElementById('live_prov').value,
            MunFarm: document.getElementById('live_mun').value,
            BrgyFarm: document.getElementById('live_bgy').value,
            StFarm: document.getElementById('live_sitio').value,
            AnimalType: document.getElementById('live_animal_type').value,
            Animals: JSON.stringify(animals),
            Heads: animals.length,
            AmountCover: totalValue.toFixed(2),
            Variety: (animals[0] ? animals[0].Class : '') + (animals.length > 1 ? ' +' + (animals.length - 1) : ''), // Summary
            Month: new Date().toISOString().substring(0, 7)
        };
    }
    else if (line === 'Banca') {
        data = {
            ...commonData,
            CropType: 'BANCA',
            CivilStatus: document.getElementById('f_civil').value,
            Address: document.getElementById('banca_port').value,
            Sitio: document.getElementById('banca_port').value,
            FarmName: 'Boat: ' + (document.getElementById('banca_color').value || 'Unspecified'),
            BoatColor: document.getElementById('banca_color').value, // Fix: Use BoatColor explicitly
            // Specifics
            Usage: document.getElementById('banca_usage').value,
            Manning: document.getElementById('banca_crew').value,
            BoatMaterial: document.getElementById('banca_material').value,
            BoatType: document.getElementById('banca_type').value,
            HullNo: document.getElementById('banca_hp').value, // Motor No
            ChassisNo: document.getElementById('banca_chassis').value,
            BoatAge: document.getElementById('banca_age').value,
            Dimensions: `${document.getElementById('banca_length').value}x${document.getElementById('banca_width').value}x${document.getElementById('banca_depth').value}m`,
            BancaLength: document.getElementById('banca_length').value,
            BancaWidth: document.getElementById('banca_width').value,
            BancaDepth: document.getElementById('banca_depth').value,
            PeriodFrom: document.getElementById('banca_period_from').value,
            PeriodTo: document.getElementById('banca_period_to').value,
            Others: document.getElementById('banca_others').value,

            Beneficiary: document.getElementById('banca_bene_primary').value,
            BeneRelationship: document.getElementById('banca_bene_rel').value,
            BeneSecondary: document.getElementById('banca_bene_secondary')?.value || '', // Optional field

            MortgageTo: document.getElementById('banca_mortgage_to').value,
            MortgageBranch: document.getElementById('banca_mortgage_branch').value,
            MortgageAddr: document.getElementById('banca_mortgage_addr').value,

            AmountCover: document.getElementById('banca_cover').value,
            Month: new Date().toISOString().substring(0, 7)
        };
    }
    else {
        // DEFAULT: CROP
        const finalCrop = document.getElementById('f_crop_unified').value;
        if (!finalCrop) return alert("Select a Crop.");
        const d_plant = document.getElementById('f_plant').value;

        data = {
            ...commonData,
            CivilStatus: document.getElementById('f_civil').value,
            ProvFarmer: document.getElementById('f_prov_farmer').value,
            MunFarmer: document.getElementById('f_mun_farmer').value,
            BrgyFarmer: document.getElementById('f_brgy_farmer').value,
            StFarmer: document.getElementById('f_st_farmer').value,
            Beneficiary: document.getElementById('f_bene').value,
            BeneRelationship: document.getElementById('f_bene_rel').value,
            BeneBirthdate: document.getElementById('f_bene_bday').value,
            Guardian: document.getElementById('f_guardian').value,
            Sector: document.getElementById('f_sector').value,
            ExtName: document.getElementById('f_extname') ? document.getElementById('f_extname').value : '',
            RSBSAID: document.getElementById('f_rsbsa').value,
            NCFRSID: document.getElementById('f_ncfrs') ? document.getElementById('f_ncfrs').value : '',
            FarmID: document.getElementById('f_farmid').value,
            Georef: document.getElementById('f_georef').value,
            FarmName: document.getElementById('f_farm_name_hidden').value,
            ProvFarm: document.getElementById('f_farm_prov').value,
            MunFarm: document.getElementById('f_farm_mun').value,
            BrgyFarm: document.getElementById('f_farm_bgy').value,
            StFarm: document.getElementById('f_farm_purok').value, // For Livestock/Banca compatibility
            FarmPurok: document.getElementById('f_farm_purok').value,
            North: document.getElementById('f_north').value,
            South: document.getElementById('f_south').value,
            East: document.getElementById('f_east').value,
            West: document.getElementById('f_west').value,
            Area: document.getElementById('f_area').value,
            CropType: finalCrop,
            Month: d_plant ? d_plant.substring(0, 7) : 'Unknown',
            Variety: document.getElementById('f_variety').value,
            TypePlanting: document.getElementById('f_top').value,
            Sowing: document.getElementById('sow_date').value,
            Planting: d_plant,
            AmountCover: document.getElementById('f_amount_cover').value,
            TreesHills: document.getElementById('f_trees') ? document.getElementById('f_trees').value || 'N/A' : 'N/A',
            CropSubType: document.getElementById('crop_subtype') ? document.getElementById('crop_subtype').value : '',

            // Mapped Keys for PDF Generation (Matching DEFAULT_CONFIGS)
            amount_cover: document.getElementById('f_amount_cover').value,
            l1_area: document.getElementById('f_area').value,
            l1_var: document.getElementById('f_variety').value,
            l1_meth_ds: document.getElementById('f_top').value === 'Direct Seeding' ? '/' : '',
            l1_meth_tp: document.getElementById('f_top').value === 'Transplanting' ? '/' : '',
            l1_sow: document.getElementById('sow_date').value,
            l1_harv: '', // No input field for harvest date currently
            date_planting: d_plant,
            l1_trees: document.getElementById('f_trees') ? document.getElementById('f_trees').value || '' : '',
            farm_purok: document.getElementById('f_farm_purok').value,
            farm_prov: document.getElementById('f_farm_prov').value,
            farm_mun: document.getElementById('f_farm_mun').value,
            farm_brgy: document.getElementById('f_farm_bgy').value,
            georef_id: document.getElementById('f_georef').value,
            farm_id: document.getElementById('f_farmid').value,
            bound_north: document.getElementById('f_north').value,
            bound_south: document.getElementById('f_south').value,
            bound_east: document.getElementById('f_east').value,
            bound_west: document.getElementById('f_west').value
        };
    }

    await db.apps.add(data);

    // --- User Guide Update ---
    /* Document update process for guide handled in index.html */

    // --- Global App Fullscreen Toggle ---
    function toggleAppFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
                alert("This device or browser does not support fullscreen mode.");
            });
        } else {
            document.exitFullscreen();
        }
    }

    // Listen for fullscreen changes to update the icon
    document.addEventListener('fullscreenchange', () => {
        const icon = document.getElementById('fullscreen-icon');
        if (icon) {
            if (document.fullscreenElement) {
                icon.className = 'fas fa-compress';
            } else {
                icon.className = 'fas fa-expand';
            }
        }
    });


    // Also update the profile in the profiles table to persist the photo for future use
    if (currentFarmer && currentFarmer.FarmersID) {
        await db.profiles.put(currentFarmer);
    }

    // Refresh Dashboards
    renderLineStats();
    updateBatchStats();

    try {
        await generateIndividualPDF(data);
    } catch (pdfErr) {
        console.error("Direct PDF trigger failed:", pdfErr);
    }

    // Use a slight delay before alert to ensure download triggers first
    setTimeout(() => {
        if (mode === 'next_farm') {
            // PARTIAL RESET: Keep Farmer Info, Clear Farm/Policy for next entry
            alert("Application Saved! Please enter details for the NEXT policy.");

            // 1. Clear Farm Location Details
            document.getElementById('f_farm_select').value = ""; // Reset selector
            document.getElementById('f_north').value = '';
            document.getElementById('f_south').value = '';
            document.getElementById('f_east').value = '';
            document.getElementById('f_west').value = '';
            document.getElementById('f_farm_bgy').value = '';
            document.getElementById('f_farm_mun').value = '';
            document.getElementById('f_farm_prov').value = '';
            document.getElementById('f_farm_purok').value = '';
            document.getElementById('f_st_farm').value = '';
            document.getElementById('f_area').value = '';
            document.getElementById('f_georef').value = '';

            // 2. Clear Crop Details
            document.getElementById('f_crop_unified').value = '';
            handleCropUnified();
            document.getElementById('f_top').selectedIndex = 0;
            document.getElementById('f_variety').value = '';
            document.getElementById('f_amount_cover').value = '';
            if (document.getElementById('sow_date')) document.getElementById('sow_date').value = '';
            document.getElementById('f_plant').value = '';
            document.getElementById('f_trees').value = ''; // Clear trees if HVC

            // 3. Clear Livestock Details
            document.getElementById('live_prov').value = '';
            document.getElementById('live_mun').value = '';
            document.getElementById('live_bgy').value = '';
            document.getElementById('live_sitio').value = '';
            document.getElementById('live_animal_type').value = '';
            document.getElementById('animal_list_body').innerHTML = ''; // Wipe animal table

            // 4. Clear Banca Details
            document.getElementById('banca_port').value = '';
            document.getElementById('banca_usage').value = 'Fishing';
            const chk = document.getElementById('chk_banca_same_addr');
            if (chk) chk.checked = false;
            document.getElementById('banca_crew').value = ''; // Serves as tonnage
            document.getElementById('banca_material').value = '';
            document.getElementById('banca_type').value = '';
            document.getElementById('banca_hp').value = '';
            if (document.getElementById('banca_chassis')) document.getElementById('banca_chassis').value = '';
            if (document.getElementById('banca_age')) document.getElementById('banca_age').value = '';
            if (document.getElementById('banca_color')) document.getElementById('banca_color').value = '';
            if (document.getElementById('banca_length')) document.getElementById('banca_length').value = '';
            if (document.getElementById('banca_width')) document.getElementById('banca_width').value = '';
            if (document.getElementById('banca_depth')) document.getElementById('banca_depth').value = '';
            if (document.getElementById('banca_others')) document.getElementById('banca_others').value = '';

            // 5. Clear ADSS Details
            document.getElementById('adss_occupation').value = '';
            document.getElementById('adss_premium').value = '';

            // Hide the alternative line containers
            document.getElementById('adss-details').style.display = 'none';
            document.getElementById('banca-details').style.display = 'none';
            document.getElementById('livestock-details').style.display = 'none';

            // 6. Regenerate Farm ID explicitly for the new application
            const now = new Date();
            const timestamp = now.getFullYear() +
                String(now.getMonth() + 1).padStart(2, '0') +
                String(now.getDate()).padStart(2, '0') + '-' +
                String(now.getHours()).padStart(2, '0') +
                String(now.getMinutes()).padStart(2, '0') +
                String(now.getSeconds()).padStart(2, '0');
            document.getElementById('f_farmid').value = `F-${getDeviceID()}-${timestamp}`;

            // Prevent caching from reverting forms
            localStorage.removeItem('pcic_last_step');

            // Clear signatures
            if (signaturePad) signaturePad.clear();
            if (guardianSignaturePad) guardianSignaturePad.clear();

            // Navigate to Step 2 (Policy Details)
            goToStep('policy-details');

        } else {
            // FULL RESET (Default)
            alert("Enrollment Completed Successfully.");

            // Clear persistence for new application
            localStorage.setItem('pcic_enrollment_active', 'false');
            localStorage.removeItem('pcic_current_farmer');
            localStorage.removeItem('pcic_current_history');
            localStorage.removeItem('pcic_last_step');

            document.getElementById('view-enrollment-form').style.display = 'none';
            document.getElementById('search-card').style.display = 'block';
            document.getElementById('search-results-panel').style.display = 'none';
            document.getElementById('adss-details').style.display = 'none';
            document.getElementById('banca-details').style.display = 'none';
            document.getElementById('livestock-details').style.display = 'none';
            if (signaturePad) signaturePad.clear();
            if (guardianSignaturePad) guardianSignaturePad.clear();
            refreshLog();
        }
    }, 500);
}

async function generateIndividualPDF(data, returnBlob = false) {
    console.log("Generating Individual PDF for:", data.LastName);
    const line = data.InsuranceLine || 'Crop';
    const { jsPDF } = window.jspdf; // CRITICAL: Ensure constructor via window.jspdf
    const agentEl = document.getElementById('agent_name');
    const agent = agentEl ? agentEl.value : "Agent";
    let suggestedName = "";
    const tsYM = new Date().toISOString().substring(0, 7);

    if (line === 'Crop') {
        const commodity = data.CropType || 'UnknownCrop';
        const farmId = data.FarmID || 'APP';
        const plantingYM = data.Planting ? data.Planting.substring(0, 7) : tsYM;
        // Format: LastName_FirstName_InsuranceLine_Commodity_FarmID_Planting Year-Month
        suggestedName = `${data.LastName}_${data.FirstName}_${line}_${commodity}_${farmId}_${plantingYM}.pdf`;
    } else if (line === 'ADSS') {
        // Format: LastName_FirstName_InsuranceLine_Timestamp Year-Month
        suggestedName = `${data.LastName}_${data.FirstName}_${line}_${tsYM}.pdf`;
    } else if (line === 'Livestock') {
        const type = data.AnimalType || 'UnknownType';
        const animalClass = data.Variety ? data.Variety.split(' ')[0] : 'UnknownClass';
        // Format: LastName_FirstName_InsuranceLine_Type_Class_Timestamp Year-Month
        suggestedName = `${data.LastName}_${data.FirstName}_${line}_${type}_${animalClass}_${tsYM}.pdf`;
    } else if (line === 'Banca') {
        const type = data.BoatType || 'UnknownType';
        const boatClass = data.BoatMaterial || 'UnknownClass';
        // Format: LastName_FirstName_InsuranceLine_Type_Class_Timestamp Year-Month
        suggestedName = `${data.LastName}_${data.FirstName}_${line}_${type}_${boatClass}_${tsYM}.pdf`;
    } else {
        suggestedName = `${data.LastName}_${data.FirstName}_${line}_${tsYM}.pdf`;
    }

    try {
        // Load line-specific layout and template
        const storageKey = line === 'Crop' ? 'pdf_layout' : `pdf_layout_${line.toLowerCase()}`;
        const savedLayout = await db.settings.get(storageKey);
        const layout = savedLayout ? JSON.parse(savedLayout.value) : DEFAULT_CONFIGS[line];

        const tplKey = line === 'Crop' ? 'pdf_template' : `pdf_template_${line.toLowerCase()}`;
        let tplData = await db.settings.get(tplKey);

        let bg;
        if (tplData && tplData.value) {
            bg = 'data:image/jpeg;base64,' + tplData.value;
        } else {
            console.warn(`Custom template missing for ${line}. Auto-restoring from permanent bundled defaults.`);
            bg = bgDefaults[line] || bgData;

            // Auto-restore into database for permanence
            const rawBase64 = bg.split(',')[1];
            try {
                await db.settings.put({ key: tplKey, value: rawBase64, name: 'Default Restored' });
                if (typeof updateTemplateStatus === 'function') updateTemplateStatus();
            } catch (err) {
                console.error("Failed to auto-restore template to IndexedDB:", err);
            }
        }

        const doc = new jsPDF({
            orientation: 'p',
            unit: 'mm',
            format: 'a4'
        });

        // 0. Draw Background Template First
        try {
            doc.addImage(bg, 'JPEG', 0, 0, 210, 297);
        } catch (e) {
            console.error("Template add error:", e);
        }

        // Helper: Draw Text based on calibrated points (Stored as 0-100%, convert to mm for jsPDF)
        const txt = (key, val, size = 10, style = 'normal') => {
            const cfg = layout[key];
            if (!cfg || val === undefined || val === null || val === '') return;
            doc.setFontSize(size);
            doc.setFont(undefined, style);
            // Conversion: (pct / 100) * A4Dimension (210mm width, 297mm height)
            const xMM = (cfg.x / 100) * 210;
            const yMM = (cfg.y / 100) * 297;
            doc.text(val.toString(), xMM, yMM);
        };

        // Helper: Format Date to mm/dd/yyyy
        const formatDate = (val) => {
            if (!val) return '';
            // If it's a date object
            if (val instanceof Date) {
                const mm = String(val.getMonth() + 1).padStart(2, '0');
                const dd = String(val.getDate()).padStart(2, '0');
                const yyyy = val.getFullYear();
                return `${mm}/${dd}/${yyyy}`;
            }
            // If it's a string yyyy-mm-dd
            if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [y, m, d] = val.split('-');
                return `${m}/${d}/${y}`;
            }
            return val; // Fallback
        };

        // Helper: Draw Checkmark
        const check = (key, condition) => {
            if (condition) {
                const cfg = layout[key];
                if (!cfg) return;
                const xMM = (cfg.x / 100) * 210;
                const yMM = (cfg.y / 100) * 297;
                doc.setFont('zapfdingbats');
                doc.setFontSize(12);
                doc.text('3', xMM, yMM);
                doc.setFont('helvetica', 'normal'); // Reset font
            }
        };

        // 1. App Type & Crop
        check('crop_rice', data.CropType === 'RICE');
        check('crop_corn', data.CropType === 'CORN');
        check('crop_high', !['RICE', 'CORN'].includes(data.CropType));
        if (!['RICE', 'CORN'].includes(data.CropType)) txt('crop_high_txt', data.CropType);

        check('type_new', true); // Default new
        check('cat_self_financed', true); // Default
        txt('date_app', formatDate(new Date().toISOString().split('T')[0]));
        txt('farmer_id', data.FarmersID);
        txt('ncfrs_id', data.NCFRSID);

        // 2. Personal Info
        txt('last_name', data.LastName);
        txt('first_name', data.FirstName);
        txt('mid_name', data.MiddlName);
        txt('suffix', data.ExtName); // New mapped
        txt('guardian', data.Guardian); // New mapped
        txt('guardian_rel', data.GuardianRelationship);
        txt('guardian_birth', formatDate(data.GuardianBirthdate));
        const address = `${data.BrgyFarmer || ''}, ${data.MunFarmer || ''}`;
        txt('addr_street', data.StFarmer);
        txt('addr_brgy', data.BrgyFarmer);
        txt('addr_muni', data.MunFarmer);
        txt('addr_prov', data.ProvFarmer);
        txt('contact', data.Mobile || '');
        txt('birthday', formatDate(data.Birthdate));
        txt('account_no', data.Account);
        txt('rsbsa_id', data.RSBSAID);

        // Normalize Sex value for checking (handle 'Male', 'MALE', 'male')
        const sex = (data.Sex || '').toUpperCase();
        check('sex_male', sex === 'MALE');
        check('sex_female', sex === 'FEMALE');

        const civ = (data.CivilStatus || '').toUpperCase();
        check('civ_single', civ === 'SINGLE');
        check('civ_married', civ === 'MARRIED');
        check('civ_widow', civ === 'WIDOW' || civ === 'WIDOW/ER');
        check('civ_sep', civ === 'SEPARATED');
        check('civ_common', civ === 'COMMON LAW');
        txt('spouse', data.Spouse);
        check('sec_ip', data.Sector === 'IP'); // New
        check('sec_pwd', data.Sector === 'PWD'); // New
        check('sec_sc', data.Sector === 'SC'); // New
        check('sec_youth', data.Sector === 'YOUTH'); // New

        // Consent Checks (Always true if validation passed)
        check('consent_certify_check', true);
        check('consent_privacy_check', true);

        // Deed of Assignment Check (Optional on form, but if checked in UI, we check here? Or just always check as acknowledgment? 
        // Usually deed is only for borrowers. Let's make it conditional or just standard check if we assume borrowing.)
        // Simplification: Check "consent_assign_check" if the UI checkbox was checked. 
        // BUT generateIndividualPDF receives 'data' which is from 'finalizeApplication'. 'data' doesn't explicitly store the consent checkboxes in DB 'apps' table yet.
        // However, we did verify they are checked before saving. 
        // Let's assume validation ensures they agreed.
        // For Deed, since it says "if applicable", maybe we should only check it if the user actually clicked it?
        // The 'data' object being passed here doesn't have the consent booleans. 
        // For now, I'll default certify and privacy to true (validation passed).
        // I will add a check for Assign too.
        check('consent_assign_check', document.getElementById('consent_assignment') && document.getElementById('consent_assignment').checked);

        // Payment Mode Checks
        check('mop_palawan', data.PaymentMethod === 'Palawan Express');
        check('mop_gcash', data.PaymentMethod === 'GCash');
        check('mop_landbank', data.PaymentMethod === 'Landbank');
        check('mop_others', data.PaymentMethod === 'Others');



        // 3. Beneficiary
        txt('bene_name', data.Beneficiary);
        txt('bene_rel', data.BeneRelationship);
        txt('bene_birth', formatDate(data.BeneBirthdate));

        if (line === 'Crop') {
            // 4. Farm Details (Lot 1)
            txt('l1_area', data.Area);
            txt('amount_cover', data.AmountCover);
            txt('l1_loc', `${data.BrgyFarm}, ${data.MunFarm}`);
            txt('farm_prov', data.ProvFarm);
            txt('farm_mun', data.MunFarm);
            txt('farm_brgy', data.BrgyFarm);
            txt('farm_purok', data.FarmPurok);
            txt('georef_id', data.Georef);
            txt('date_planting', formatDate(data.Planting));
            txt('farm_id', data.FarmID);
            txt('bound_north', data.North);
            txt('bound_south', data.South);
            txt('bound_east', data.East);
            txt('bound_west', data.West);
            txt('l1_var', data.Variety);
            check('l1_meth_ds', data.TypePlanting === 'DIRECT');
            check('l1_meth_tp', data.TypePlanting === 'TRANSPLANTED');
            txt('l1_sow', formatDate(data.Sowing));
            txt('l1_harv', formatDate(data.Harvest));
            txt('l1_trees', data.TreesHills);

        } else if (line === 'Livestock') {
            txt('live_prov', data.ProvFarm);
            txt('live_mun', data.MunFarm);
            txt('live_bgy', data.BrgyFarm);
            txt('live_sitio', data.StFarm);
            txt('live_animal_type', data.AnimalType);

            if (data.Animals) {
                try {
                    const animals = JSON.parse(data.Animals);
                    animals.forEach((ani, idx) => {
                        const n = idx + 1;
                        if (n > 6) return;
                        txt(`ls_class_${n}`, ani.Class);
                        txt(`ls_tag_${n}`, ani.Tag);
                        txt(`ls_male_${n}`, ani.Male);
                        txt(`ls_female_${n}`, ani.Female);
                        txt(`ls_age_${n}`, ani.Age);
                        txt(`ls_dob_${n}`, formatDate(ani.DOB));
                        txt(`ls_breed_${n}`, ani.Breed);
                        txt(`ls_color_${n}`, ani.Color);
                        txt(`ls_val_${n}`, ani.Value);
                    });
                } catch (e) {
                    console.error("Animal parse error:", e);
                }
            }
            txt('amount_cover', data.AmountCover); // Total Value

        } else if (line === 'Banca') {
            txt('bn_home_port', data.Address);
            txt('bn_usage', data.Usage);
            txt('bn_manning', data.Manning);
            txt('bn_boat_material', data.BoatMaterial);
            txt('bn_boat_type', data.BoatType);
            txt('bn_motor_no', data.HullNo);
            txt('bn_chassis_no', data.ChassisNo);
            txt('bn_boat_age', data.BoatAge);
            txt('bn_boat_color', data.BoatColor);

            const dims = (data.Dimensions || '').split('x');
            txt('bn_dim_length', dims[0]);
            txt('bn_dim_width', dims[1]);
            txt('bn_dim_depth', dims[2]);

            txt('amount_cover', data.AmountCover);
            txt('bn_period_from', formatDate(data.PeriodFrom));
            txt('bn_period_to', formatDate(data.PeriodTo));

            txt('bn_mortgage_to', data.MortgageTo);
            txt('bn_mortgage_branch', data.MortgageBranch);
            txt('bn_mortgage_addr', data.MortgageAddr);
            txt('bn_others', data.Others);

        } else if (line === 'ADSS') {
            txt('adss_occupation', data.Occupation);
            txt('adss_work_addr', data.Address || data.Sitio);
            txt('adss_premium', data.Premium);
            txt('adss_cover', data.AmountCover);
            txt('adss_ben1_name', data.BeneSecondary);
            txt('adss_ben1_rel', data.BeneSecondaryRel);
            txt('adss_ben1_bday', formatDate(data.BeneSecondaryBday));
            /*
            txt('adss_ben2_name', data.BeneSecondary2);
            txt('adss_ben2_rel', data.BeneSecondary2Rel);
            txt('adss_ben2_bday', formatDate(data.BeneSecondary2Bday));
            check('adss_is_minor', data.IsMinor);
            */
        }

        txt('sign_name', `${data.FirstName} ${data.LastName}`, 10, 'bold');
        txt('sign_date', formatDate(new Date()));

        // Add Signature Image
        if (data.Signature) {
            try {
                // Use distinct "signature_img" config; callback to "sign_name" if missing for backward compatibility
                const sPos = layout['signature_img'] || layout['sign_name'];
                if (sPos) {
                    const sigX = (sPos.x / 100) * 210 - 20;
                    const sigY = (sPos.y / 100) * 297 - 15;
                    doc.addImage(data.Signature, 'PNG', sigX, sigY, 40, 15);
                }
            } catch (e) { console.error("Sig error:", e); }
        }

        // Add Guardian Signature Image
        if (data.GuardianSignature) {
            try {
                const gsPos = layout['guardian_signature_img'];
                if (gsPos) {
                    const gSigX = (gsPos.x / 100) * 210 - 20;
                    const gSigY = (gsPos.y / 100) * 297 - 15;
                    doc.addImage(data.GuardianSignature, 'PNG', gSigX, gSigY, 40, 15);
                }
            } catch (e) { console.error("Guardian Sig error:", e); }
        }

        // Guardian Signature Name and Date (ADSS specifically requested, but safe to add generally if config exists)
        if (layout['guardian_sign_name']) {
            txt('guardian_sign_name', data.Guardian, 10, 'bold');
        }
        if (layout['guardian_sign_date']) {
            txt('guardian_sign_date', formatDate(new Date()));
        }

        // Add Farmer Photo Image
        if (data.Photo) {
            try {
                const pPos = layout['farmer_photo'];
                if (pPos) {
                    const photoX = (pPos.x / 100) * 210;
                    const photoY = (pPos.y / 100) * 297;
                    doc.addImage(data.Photo, 'JPEG', photoX, photoY, 25, 25);
                }
            } catch (e) { console.error("Photo rendering error:", e); }
        }

        // Reset text color


        const pdfBlob = doc.output('blob');
        if (returnBlob) return { blob: pdfBlob, name: suggestedName };
        await saveBlob(pdfBlob, suggestedName);

    } catch (err) {
        console.error("PDF generation error:", err);
        alert("Error generating PDF.");
    }
}

async function saveBlob(blob, suggestedName) {
    console.log("SaveBlob trigger:", suggestedName, blob.type);

    // 1. Modern File System Access API (Recommended for HTTPS/Localhost)
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: suggestedName,
                types: [{
                    description: 'Downloadable Files',
                    accept: { [blob.type]: [blob.type === 'application/pdf' ? '.pdf' : '.csv'] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
            console.log("File saved via showSaveFilePicker");
            return true;
        } catch (err) {
            if (err.name === 'AbortError') {
                console.log("User cancelled save prompt");
                return false;
            }
            console.warn('SaveFilePicker error, falling back to <a> click:', err);
        }
    }

    // 2. Fallback to traditional anchor download (highly compatible)
    try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        console.log("File triggered via anchor click fallback");
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 5000);
        return true;
    } catch (e) {
        console.error("Critical download failure:", e);
        alert("Download failed. Please check browser permissions.");
        return false;
    }
}

async function saveIndividualPDF(data) {
    await generateIndividualPDF(data);
}

async function hardRefreshApp() {
    if (confirm("Are you sure you want to hard refresh? This will clear the app cache and reload the latest version.")) {
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            } catch (err) {
                console.error("Service Worker unregistration failed:", err);
            }
        }
        window.location.reload(true);
    }
}

async function refreshLog() {
    const list = await db.apps.reverse().toArray();
    const body = document.getElementById('log-body');
    if (!body) return;
    body.innerHTML = list.map(a => `
                <tr>
                    <td>${a.FarmersID}</td>
                    <td>${a.LastName}, ${a.FirstName}</td>
                    <td>${a.FarmID || 'N/A'}</td>
                    <td>${a.CropType}</td>
                    <td>${a.Planting || 'N/A'}</td>
                    <td>PHP ${parseFloat(a.AmountCover || 0).toLocaleString()}</td>
                    <td>
                        <button onclick='generateIndividualPDF(${JSON.stringify(a).replace(/'/g, "&apos;")})' 
                                style="padding:4px 8px; font-size:10px; background:var(--primary); color:white; border:none; border-radius:3px; cursor:pointer;">
                            PDF
                        </button>
                    </td>
                </tr>`).join('');
}

// --- Summary Logic Refined ---

async function renderLineStats() {
    const dashboard = document.getElementById('global-dashboard');
    if (!dashboard) return;

    const all = await db.apps.toArray();
    const lines = ["Crop", "Livestock", "Banca", "ADSS"];

    // Initialize counters
    const stats = {};
    lines.forEach(l => stats[l.toUpperCase()] = {
        farmers: new Set(),
        farms: new Set(),
        area: 0,
        cover: 0,
        heads: 0
    });

    all.forEach(a => {
        const l = (a.InsuranceLine || a.CropType || 'Crop').toUpperCase();
        if (stats[l]) {
            stats[l].farmers.add(a.FarmersID);
            if (l === 'CROP') {
                // Use FarmID if exists, otherwise combination of FarmerID and FarmName/Location
                const farmKey = a.FarmID || `${a.FarmersID}-${a.BrgyFarm || ''}-${a.MunFarm || ''}`;
                stats[l].farms.add(farmKey);
                stats[l].area += parseFloat(a.Area) || 0;
            }
            if (l === 'LIVESTOCK') {
                try {
                    const animals = JSON.parse(a.Animals || '[]');
                    stats[l].heads += animals.length;
                } catch (e) {
                    console.error("Error parsing animals for stats", e);
                }
            }
            stats[l].cover += parseFloat(a.AmountCover) || 0;
        }
    });

    // Build HTML
    const formatAmt = (num) => parseFloat(num || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    let html = ``;

    lines.forEach(l => {
        const s = stats[l.toUpperCase()];
        let metrics = '';
        if (l === 'Crop') {
            metrics = `
                        <div>Farmers: <b>${s.farmers.size}</b> | Farms: <b>${s.farms.size}</b></div>
                        <div>Area: <b>${s.area.toFixed(2)} ha</b> | Cover: <b>${formatAmt(s.cover)}</b></div>`;
        } else if (l === 'Livestock') {
            metrics = `
                        <div>Farmers: <b>${s.farmers.size}</b> | Heads: <b>${s.heads}</b></div>
                        <div>Total Price: <b>${formatAmt(s.cover)}</b></div>`;
        } else {
            metrics = `
                        <div>Farmers: <b>${s.farmers.size}</b></div>
                        <div>Amount Cover: <b>${formatAmt(s.cover)}</b></div>`;
        }

        html += `
                    <div class="dash-item" style="border-left:4px solid ${getLineColor(l)};">
                        <strong style="color:${getLineColor(l)}">${l.toUpperCase()}</strong>
                        <div style="font-size:10px; line-height:1.2; margin-top:4px;">${metrics}</div>
                    </div>`;
    });

    dashboard.innerHTML = html;
}

function getLineColor(line) {
    const colors = {
        'Crop': '#2e7d32',    // Green
        'Livestock': '#ef6c00', // Orange
        'Banca': '#0277bd',    // Blue
        'ADSS': '#c62828'      // Red
    };
    return colors[line] || '#666';
}


async function populateSummaryCropDropdown() {
    const select = document.getElementById('sum_crop');
    const currentVal = select.value;

    // Get unique crops from actual data
    const allApps = await db.apps.toArray();
    const uniqueCrops = [...new Set(allApps.map(a => a.CropType))].filter(Boolean);

    // Normalization (UPPERCASE for sorting consistency if desired, but let's keep original format case-insensitive unique)
    // Actually, let's normalize to Title Case or unique strings. 
    // Since we used case-insensitive matching in fix, let's just show unique values found.
    // Better: Normalize to UPPERCASE for deduplication set, but display Title Case? 
    // Simplest: Just unique string set from DB.
    uniqueCrops.sort();

    // Build Options
    let html = '<option value="ALL">ALL</option>';
    uniqueCrops.forEach(c => {
        html += `<option value="${c}">${c}</option>`;
    });

    select.innerHTML = html;

    // Try to restore selection
    if (currentVal && (currentVal === 'ALL' || uniqueCrops.includes(currentVal))) {
        select.value = currentVal;
    } else {
        select.value = 'ALL';
    }
}

async function updateBatchStats() {
    const c = document.getElementById('sum_crop').value;
    const dStart = document.getElementById('sum_date_start').value;
    const dEnd = document.getElementById('sum_date_end').value;

    let all = await db.apps.toArray();
    let filtered = all.filter(a => {
        let match = true;
        if (c !== 'ALL') match = match && (a.CropType || '').toLowerCase() === c.toLowerCase();
        if (dStart) match = match && (a.Planting || '').slice(0, 10) >= dStart;
        if (dEnd) match = match && (a.Planting || '').slice(0, 10) <= dEnd;
        return match;
    });

    const count = filtered.length;
    const totalArea = filtered.reduce((sum, item) => sum + (parseFloat(item.Area) || 0), 0);

    const statsBox = document.getElementById('sum_stats');
    if (statsBox) statsBox.innerText = `Farmers: ${count} | Total Area: ${totalArea.toFixed(2)} ha`;

    // Limit Warning Logic REMOVED as requested
}

function toggleSelectAllPreview() {
    const selectAll = document.getElementById('selectAllPreview');
    const checkboxes = document.querySelectorAll('.preview-checkbox');
    checkboxes.forEach(cb => cb.checked = selectAll.checked);
}

async function deleteSelectedPreviewItems() {
    const checkboxes = document.querySelectorAll('.preview-checkbox:checked');
    if (checkboxes.length === 0) {
        alert("Please select at least one record to delete.");
        return;
    }

    if (!confirm(`Are you sure you want to delete ${checkboxes.length} selected record(s)? This action cannot be undone.`)) {
        return;
    }

    const idsToDelete = Array.from(checkboxes).map(cb => parseInt(cb.value));

    try {
        await db.apps.bulkDelete(idsToDelete);
        alert("Selected records deleted successfully.");
        // Refresh views
        updateBatchStats();
        previewSummary(); // Refresh the preview table
        renderLineStats(); // Refresh dashboard if needed
        refreshLog(); // Refresh recent history
    } catch (e) {
        console.error("Error deleting records:", e);
        alert("An error occurred while deleting records.");
    }
}

async function previewSummary() {
    const previewSection = document.getElementById('preview-section');
    const previewBody = document.getElementById('preview-body');
    const previewCount = document.getElementById('preview-count');

    const c = document.getElementById('sum_crop').value;
    const dStart = document.getElementById('sum_date_start').value;
    const dEnd = document.getElementById('sum_date_end').value;

    let all = await db.apps.toArray();
    let filtered = all.filter(a => {
        let match = true;
        if (c !== 'ALL') match = match && (a.CropType || '').toLowerCase() === c.toLowerCase();
        if (dStart) match = match && (a.Planting || '').slice(0, 10) >= dStart;
        if (dEnd) match = match && (a.Planting || '').slice(0, 10) <= dEnd;
        return match;
    });

    if (!filtered.length) {
        previewSection.style.display = 'none';
        return alert("No records found for the selected filters.");
    }

    previewCount.innerText = `Filtered Records (${filtered.length})`;
    previewBody.innerHTML = filtered.map((a, i) => `
                    <tr>
                        <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">
                            <input type="checkbox" class="preview-checkbox" value="${a.id}">
                        </td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${i + 1}</td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${a.FarmersID || 'N/A'}</td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${a.LastName}, ${a.FirstName}</td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${a.FarmID || 'N/A'}</td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${(a.InsuranceLine !== 'Crop')
            ? `${a.StFarmer || ''}, ${a.BrgyFarmer || ''}, ${a.MunFarmer || ''}, ${a.ProvFarmer || ''}`
            : `${a.StFarm || ''}, ${a.BrgyFarm || ''}, ${a.MunFarm || ''}, ${a.ProvFarm || ''}`}
                            </td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${a.InsuranceLine || 'N/A'}</td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${a.CropType || 'N/A'}</td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${a.Area || ''}</td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${a.premium || 'N/A'}</td>
                        <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">PHP ${parseFloat(a.AmountCover || 0).toLocaleString()}</td>
                        <td style="padding:8px; border-bottom:1px solid #eee;">${(a.timestamp || '').slice(0, 10)}</td>
                    </tr>
                    `).join('');
    previewSection.style.display = 'block';
    makeTableResizable('preview-table');
}

async function generateSummary(fmt) {
    const agentName = document.getElementById('agent_name').value.trim();
    if (!agentName) {
        alert("Please enter the AGENT NAME in the Settings before generating summary.");
        document.getElementById('agent_name').focus();
        return;
    }

    const c = document.getElementById('sum_crop').value;
    const dStart = document.getElementById('sum_date_start').value;
    const dEnd = document.getElementById('sum_date_end').value;
    const cic = document.getElementById('sum_cic').value || "NA";

    let all = await db.apps.toArray();
    let filtered = all.filter(a => {
        let match = true;
        if (c !== 'ALL') match = match && (a.CropType || '').toLowerCase() === c.toLowerCase();
        if (dStart) match = match && (a.Planting || '').slice(0, 10) >= dStart;
        if (dEnd) match = match && (a.Planting || '').slice(0, 10) <= dEnd;
        return match;
    });

    if (!filtered.length) return alert("No records found for the selected criteria.");

    const uniqueFarmers = new Set(filtered.map(a => a.FarmersID)).size;
    const totalFarms = filtered.length;
    const totalArea = filtered.reduce((sum, item) => sum + (parseFloat(item.Area) || 0), 0).toFixed(2);
    const totalCover = filtered.reduce((sum, item) => sum + (parseFloat(item.AmountCover) || 0), 0);

    const fname = `SUMMARY_${c}_${filtered.length}_${new Date().toISOString().slice(0, 10)}_${cic}`;

    if (fmt === 'csv' || fmt === 'transfer') {
        // UNIFIED CSV Generation (Reverted & Enhanced per User Request)

        // Comprehensive Master Header List
        const headers = [
            // --- Common Farmer Info ---
            "FarmersID", "RSBSAID", "LastName", "FirstName", "MiddlName", "ExtName", "Birthdate", "Sex", "CivilStatus",
            "ProvFarmer", "MunFarmer", "BrgyFarmer", "StFarmer", "Mobile", "Spouse",
            "Sector", "Beneficiary", "BeneRelationship", "BeneBirthdate",
            "PaymentMethod", "Account", "InsuranceLine",

            // --- Crop Details ---
            "FarmID", "Georef", "FarmName", "ProvFarm", "MunFarm", "BrgyFarm", "StFarm",
            "North", "South", "East", "West", "Area",
            "CropType", "Month", "Variety", "TypePlanting", "Sowing", "Planting", "Crop AmountCover", "TreesHills",

            // --- ADSS Details ---
            "Guardian", "GuardianRelationship", "GuardianBirthdate",
            "BeneSecondary", "BeneSecondaryRel", "BeneSecondaryBday", "Premium", // [NEW]
            "ADSS AmountCover", // [ADDED]

            // --- Banca Details (STRICT USER ORDER) ---
            "BoatType",
            "BoatMaterial",
            "HullNo",
            "ChassisNo",
            "Usage",
            "Banca Color", // [MODIFIED] Renamed to avoid collision with Livestock color
            "BoatAge",
            "Others",
            "Height", // Maps to Depth
            "Banca_Width",
            "Banca_Length",
            "BoatLocation", // Maps to Address (Home Port)
            "Banca AmountCover", // Maps to AmountCover

            // --- Livestock Details (STRICTLY FROM IMAGE) ---
            "Livestock_Street_Sitio", "Livestock_Barangay", "Livestock_Municipality", "Livestock_Province",
            "AnimalType", "Classification", "Eartag",
            "MalePop", "FemalePop", "Age", "Dateofbirth",
            "Breed",
            "Color", // [RESTORED] Livestock Color
            "Price",
            "TotalBirdsPop", "PurchaseDate",
            "Livestock AmountCover",

            // --- Metadata ---
            "PeriodFrom", "PeriodTo", "timestamp"
        ];
        
        if (fmt === 'transfer') {
            headers.push("Signature", "GuardianSignature", "Photo");
        }

        const csvRows = [headers.join(",")];

        filtered.forEach(row => {
            const rowsToProcess = [];

            // Handle Livestock Multi-Row
            if (row.InsuranceLine === 'Livestock' && row.Animals) {
                try {
                    const animals = JSON.parse(row.Animals);
                    if (animals.length > 0) {
                        animals.forEach(animal => {
                            rowsToProcess.push({
                                ...row,
                                // Map Animal Specifics to row root for easier access below
                                _Class: animal.Class || "",
                                _Age: animal.Age || "",
                                _Tag: animal.Tag || "",
                                _Male: animal.Male || "",
                                _Female: animal.Female || "",
                                _DOB: animal.DOB || "",
                                _Breed: animal.Breed || "",
                                _Color: animal.Color || "",
                                _Price: animal.Value || "",
                                // Override Variety/CropType for summary clarity?
                                Variety: animal.Class || ""
                            });
                        });
                    } else { rowsToProcess.push(row); }
                } catch (e) { rowsToProcess.push(row); }
            } else {
                rowsToProcess.push(row);
            }

            let counts = { Crop: 0, Livestock: 0, ADSS: 0, Banca: 0, LegacyDefaulted: 0 };

            rowsToProcess.forEach(procRow => {
                let iLine = procRow.InsuranceLine;
                if (!iLine) {
                    iLine = 'Crop';
                    counts.LegacyDefaulted++;
                }
                counts[iLine] = (counts[iLine] || 0) + 1;

                const values = headers.map(header => {
                    let val = "";

                    // --- MAPPING LOGIC ---

                    // 0. EXPLICIT AMOUNT COVERS (Split by Line)
                    if (header === "Crop AmountCover") val = (iLine === 'Crop') ? procRow.AmountCover : "";
                    else if (header === "ADSS AmountCover") val = (iLine === 'ADSS') ? procRow.AmountCover : "";
                    else if (header === "Banca AmountCover") val = (iLine === 'Banca') ? procRow.AmountCover : "";
                    else if (header === "Livestock AmountCover") val = (iLine === 'Livestock') ? procRow.AmountCover : "";

                    // 1. Livestock Specifics (Using _prefixed keys from above or strict checks)
                    else if (header === "Classification") val = procRow._Class || "";
                    else if (header === "Age") val = procRow._Age || ""; // Note: Banca also has 'BoatAge', ensure no collision. Header is 'Age' vs 'BoatAge'.
                    else if (header === "Eartag") val = procRow._Tag || "";
                    else if (header === "MalePop") val = procRow._Male || "";
                    else if (header === "FemalePop") val = procRow._Female || "";
                    else if (header === "Dateofbirth") val = procRow._DOB || "";
                    else if (header === "Breed") val = procRow._Breed || "";
                    else if (header === "Price") val = procRow._Price || "";
                    else if (header === "Color") val = procRow._Color || "";


                    // Livestock Location Map
                    else if (header === "Livestock_Street_Sitio") val = (procRow.InsuranceLine === 'Livestock') ? procRow.StFarm : "";
                    else if (header === "Livestock_Barangay") val = (procRow.InsuranceLine === 'Livestock') ? procRow.BrgyFarm : "";
                    else if (header === "Livestock_Municipality") val = (procRow.InsuranceLine === 'Livestock') ? procRow.MunFarm : "";
                    else if (header === "Livestock_Province") val = (procRow.InsuranceLine === 'Livestock') ? procRow.ProvFarm : "";

                    // 2. Banca Specifics (User List)
                    else if (header === "BoatType") val = procRow.BoatType || "";
                    else if (header === "BoatMaterial") val = procRow.BoatMaterial || "";
                    else if (header === "HullNo") val = procRow.HullNo || "";
                    else if (header === "ChassisNo") val = procRow.ChassisNo || "";
                    else if (header === "Usage") val = procRow.Usage || "";
                    else if (header === "Banca Color") val = procRow.Color || procRow.BoatColor || ""; // Banca Color Explicit Map
                    // Color handled above
                    else if (header === "BoatAge") val = procRow.BoatAge || "";
                    else if (header === "Others") val = procRow.Others || "";
                    else if (header === "Height") val = procRow.BancaDepth || ""; // Map Height to Depth
                    else if (header === "Banca_Width") val = procRow.BancaWidth || "";
                    else if (header === "Banca_Length") val = procRow.BancaLength || "";
                    else if (header === "BoatLocation") val = procRow.Address || ""; // Home Port stored in Address/Sitio


                    // 3. ADSS Specifics
                    else if (header === "Premium") val = procRow.Premium || "";
                    // AmountCover is already a root field, mapped by Default Fallback

                    // 4. Beneficiary Routing
                    else if (header === "BenePrimary") val = procRow.Beneficiary || "";
                    else if (header === "BenePrimaryRel") val = procRow.BeneRelationship || "";
                    else if (header === "BenePrimaryBday") val = procRow.BeneBirthdate || "";

                    else if (header === "BeneSecondary") val = procRow.BeneSecondary || ((procRow.InsuranceLine === 'ADSS') ? procRow.BenePrimary : ""); // Fallback logic

                    else if (header === "BeneSecondaryRel") val = procRow.BeneSecondaryRel || "";
                    else if (header === "BeneSecondaryBday") val = procRow.BeneSecondaryBday || "";

                    // 5. Exclusions/Blanks
                    else if (header === "TotalBirdsPop" || header === "PurchaseDate") val = "";

                    // 6. Default Fallback
                    else val = procRow[header] || "";

                    val = String(val).replace(/"/g, '""').replace(/\n/g, ' ');
                    return `"${val}"`;
                });
                csvRows.push(values.join(","));
            });
        });

        const csvContent = csvRows.join("\n");
        if (fmt === 'transfer') {
            try {
                localStorage.setItem('pendingCsvTransfer', csvContent);
            } catch (e) {
                console.error("localStorage quota exceeded for transfer", e);
                alert("Data is too large for fast transfer. Please Export CSV instead.");
            }
            const hubIframe = document.querySelector('#view-preprocessing iframe');
            if (hubIframe) hubIframe.src = hubIframe.src; // Safer reload without CORS/file:// blocks
            showView('preprocessing');
            return;
        }

        const blob = new Blob([csvContent], { type: 'text/csv' });
        await saveBlob(blob, fname + ".csv");

        alert(`Export Complete!\n
Crop Records: ${counts.Crop || 0}
Livestock Records: ${counts.Livestock || 0}
ADSS Records: ${counts.ADSS || 0}
Banca Records: ${counts.Banca || 0}

(Note: ${counts.LegacyDefaulted} older records were defaulted to Crop)`);

    } else {
        const uniqueFarmers = new Set(filtered.map(a => a.FarmersID)).size;
        const totalFarms = filtered.length;
        const totalArea = filtered.reduce((sum, item) => sum + (parseFloat(item.Area) || 0), 0).toFixed(2);
        const totalCover = filtered.reduce((sum, item) => sum + (parseFloat(item.AmountCover) || 0), 0);

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'landscape',
            unit: 'mm',
            format: 'a4'
        });

        doc.text("Application Summary", 148, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`CIC: ${cic}`, 148, 20, { align: 'center' });
        doc.setFontSize(9);
        doc.text(`Total Unique Farmers: ${uniqueFarmers} | Total Farms: ${totalFarms} | Total Area: ${totalArea} ha | Total Amount Ver: PHP ${totalCover.toLocaleString()}`, 148, 25, { align: 'center' });

        doc.autoTable({
            startY: 28,
            head: [['#', 'ID', 'Name', 'Farm ID', 'Georef', 'Address', 'Insursance Lines', 'Commodities', 'Area', 'Premium', 'Amount Cover', 'App.Date']],
            body: filtered.map((a, i) => [
                i + 1,
                a.FarmersID || '',
                a.LastName + ", " + a.FirstName, +" " + a.MiddlName,
                a.FarmID || '',
                a.Georef || '',
                [a.Sitio, a.BrgyFarm, a.MunFarm, a.ProvFarm].filter(Boolean).join(', '),
                a.INSURANCELINE || '',
                a.CROPTYPE || '',
                a.Area || '',
                a.premium || '',
                a.AmountCover || '',
                (a.timestamp || '').slice(0, 10),
                parseFloat(a.Area || 0).toFixed(2),
                parseFloat(a.AmountCover || 0).toLocaleString()
            ]),
            headStyles: { fillColor: [27, 94, 32] }
        });

        const pages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pages; i++) {
            doc.setPage(i); doc.setFontSize(8);
            doc.text(new Date().toLocaleDateString(), 15, 200);
            doc.text(`Prepared by: ${agentName}`, 148, 200, { align: 'center' });
            doc.text(`Page ${i} of ${pages}`, 280, 200, { align: 'right' });
        }

        const pdfBlob = doc.output('blob');
        await saveBlob(pdfBlob, fname + ".pdf");
    }
}

/**
 * Fast row-counter: reads the file in 64KB chunks and counts newlines.
 * Uses max 64KB of RAM regardless of file size. Subtracts 1 for the header.
 */
function countCSVLines(file) {
    return new Promise((resolve) => {
        const SCAN = 65536; // 64 KB per chunk
        let offset = 0;
        let newlines = 0;
        const reader = new FileReader();

        reader.onload = (e) => {
            const text = e.target.result;
            for (let i = 0; i < text.length; i++) {
                if (text[i] === '\n') newlines++;
            }
            offset += SCAN;
            if (offset < file.size) {
                reader.readAsText(file.slice(offset, offset + SCAN));
            } else {
                // subtract 1 for the header row; ensure non-negative
                resolve(Math.max(0, newlines - 1));
            }
        };

        reader.onerror = () => resolve(0); // fallback: unknown total
        reader.readAsText(file.slice(0, SCAN));
    });
}

function importData(type, input) {
    if (!input.files.length) return;

    // Status label next to the import button
    let statusEl = input.parentNode.parentNode.querySelector('.import-status');
    if (!statusEl && input.parentNode.className === 'import-status') statusEl = input.parentNode;
    if (!statusEl) statusEl = input.nextElementSibling;
    if (statusEl && !statusEl.classList.contains('import-status')) statusEl = null;
    if (!statusEl) statusEl = input.parentNode.parentNode.querySelector('.import-status');

    if (statusEl) { statusEl.style.color = '#f57c00'; statusEl.innerText = 'Starting import...'; }
    input.disabled = true;

    // Progress bar elements
    const progressModal = document.getElementById('csv-import-progress-modal');
    const progressBar = document.getElementById('csv-import-progress-bar');
    const progressPct = document.getElementById('csv-import-pct-label');
    const progressCount = document.getElementById('csv-import-count-label');
    const progressStatus = document.getElementById('csv-import-status-label');

    function showProgress(written, total, label) {
        if (!progressModal) return;
        progressModal.style.display = 'flex';
        const pct = total > 0 ? Math.round((written / total) * 100) : 0;
        const barW = total > 0 ? pct + '%' : '100%'; // pulsing full bar when total unknown
        if (progressBar) progressBar.style.width = barW;
        if (progressPct) progressPct.innerText = total > 0 ? pct + '%' : '—';
        if (progressCount) progressCount.innerText = total > 0
            ? `${written.toLocaleString()} / ${total.toLocaleString()} rows`
            : `${written.toLocaleString()} rows written`;
        if (progressStatus) progressStatus.innerText = label || 'Writing to database...';
    }

    function hideProgress() {
        if (progressModal) progressModal.style.display = 'none';
        if (progressBar) progressBar.style.width = '0%';
        if (progressPct) progressPct.innerText = '0%';
    }

    // Yield to browser so the UI can repaint
    const yieldToUI = () => new Promise(resolve => setTimeout(resolve, 0));

    // ── Key normaliser (same as the original) ────────────────────
    function normaliseRow(r) {
        const n = {};
        Object.keys(r).forEach(k => {
            let nk = normalizeKey(k);
            if (type === 'records') {
                if (nk.toUpperCase() === 'FARMERSID') nk = 'FARMERSID';
                if (nk.toUpperCase() === 'CICNO') nk = 'CICNO';
                if (nk.toUpperCase() === 'PROGRAMTYPE') nk = 'PROGRAMTYPE';
            } else if (type === 'profiles') {
                if (nk.toUpperCase() === 'FARMERSID') nk = 'FarmersID';
                if (nk.toUpperCase() === 'RSBSAID') nk = 'RSBSAID';
                if (nk.toUpperCase() === 'NCFRSID') nk = 'NCFRSID'; // handles 'NCFRS ID' (space stripped by normalizeKey)
                if (nk.toUpperCase() === 'SECONDBENEFECIARY') nk = 'SecondBenefeciary'; // preserve casing
            }
            n[nk] = r[k];
        });
        return n;
    }

    setTimeout(async () => {
        try {
            const CHUNK_SIZE = 500;         // rows held in RAM at once
            const table = type === 'profiles' ? db.profiles : db.records;

            // ── Step 1: Fast pre-scan to count total rows (64KB chunks, ~50ms) ──
            showProgress(0, 0, 'Counting rows...');
            await yieldToUI();
            const totalRows = await countCSVLines(input.files[0]);

            // ── Step 2: Clear existing data BEFORE parsing ────────
            showProgress(0, totalRows, 'Clearing old data...');
            await yieldToUI();
            await table.clear();

            showProgress(0, totalRows, 'Starting import...');
            await yieldToUI();

            // ── Step 2: Stream-parse + chunk-write ────────────────
            let rowBuffer = [];
            let written = 0;
            let parseError = null;

            await new Promise((resolve, reject) => {
                Papa.parse(input.files[0], {
                    header: true,
                    skipEmptyLines: true,

                    // ─ step: called once per row (streaming) ─────────
                    // Only CHUNK_SIZE rows ever live in memory at once.
                    step: (result, parser) => {
                        rowBuffer.push(normaliseRow(result.data));

                        if (rowBuffer.length >= CHUNK_SIZE) {
                            // Pause the parser while we flush to IndexedDB
                            parser.pause();

                            const chunk = rowBuffer.splice(0);   // drain buffer
                            table.bulkPut(chunk)
                                .then(() => {
                                    written += chunk.length;
                                    showProgress(written, totalRows,
                                        `Writing — ${written.toLocaleString()} of ${totalRows.toLocaleString()} rows...`);
                                    parser.resume();
                                })
                                .catch(err => {
                                    parseError = err;
                                    parser.abort();
                                    reject(err);
                                });
                        }
                    },

                    // ─ complete: flush any remaining rows ─────────────
                    complete: () => {
                        if (parseError) return;          // already rejected above

                        const flushRemaining = async () => {
                            if (rowBuffer.length > 0) {
                                const last = rowBuffer.splice(0);
                                await table.bulkPut(last);
                                written += last.length;
                                showProgress(written, totalRows, 'Finalising...');
                                await yieldToUI();
                            }
                            resolve(written);
                        };
                        flushRemaining().catch(reject);
                    },

                    error: (err) => reject(err)
                });
            });

            // ── Step 3: Success ───────────────────────────────────
            hideProgress();

            let finalCountMsg = `${written.toLocaleString()} rows written`;
            let finalStatusMsg = `✅ Imported ${written.toLocaleString()} records`;
            let finalAlertMsg = `✅ Import complete!\n${written.toLocaleString()} ${type} records imported.`;

            if (type === 'profiles') {
                const finalDbCount = await table.count();
                finalCountMsg = `${finalDbCount.toLocaleString()} unique records in DB`;
                finalStatusMsg = `✅ Database now has ${finalDbCount.toLocaleString()} records`;
                finalAlertMsg = `✅ Import complete!\nParsed ${written.toLocaleString()} rows from CSV.\nDatabase now contains ${finalDbCount.toLocaleString()} unique ${type} records.`;
            }

            // Update progress bar to 100% on success
            if (progressBar) progressBar.style.width = '100%';
            if (progressPct) progressPct.innerText = '100%';
            if (progressCount) progressCount.innerText = finalCountMsg;

            if (typeof updateStatus === 'function') updateStatus();

            if (statusEl) {
                statusEl.innerText = finalStatusMsg;
                statusEl.style.color = 'green';
                setTimeout(() => { statusEl.innerText = '', 4000 });
            }

            alert(finalAlertMsg);

        } catch (e) {
            hideProgress();
            console.error('Import error:', e);
            if (statusEl) { statusEl.innerText = 'Error: ' + e.message; statusEl.style.color = 'red'; }
            alert('Error importing data: ' + e.message);
        } finally {
            input.disabled = false;
            input.value = '';
        }
    }, 50);
}

async function clearProfiles() {
    if (confirm("Clear all FARMER PROFILES? This action cannot be undone.")) {
        await db.profiles.clear();
        updateStatus();
        alert("Farmer Profiles cleared.");
    }
}

async function clearHistory() {
    if (confirm("Clear imported INSURANCE HISTORY? This action cannot be undone.")) {
        await db.records.clear();
        alert("History cleared.");
    }
}

async function clearSummary() {
    if (confirm("Clear the SUMMARY LIST (New Applications)? This action cannot be undone.\n\nNote: This will NOT delete imported History/Profiles.")) {
        await db.apps.clear();
        alert("Summary list cleared.");
        refreshLog();
        updateBatchStats();
        renderLineStats();
    }
}

async function clearProfiles() {
    if (confirm("Clear all FARMER PROFILES? This action cannot be undone.")) {
        await db.profiles.clear();
        updateStatus();
        alert("Farmer Profiles cleared.");
    }
}

async function clearHistory() {
    if (confirm("Clear imported INSURANCE HISTORY? This action cannot be undone.")) {
        await db.records.clear();
        alert("History cleared.");
    }
}

// --- PDF Calibration Logic ---
const FARMER_PROFILE_FIELDS = [
    'date_app', 'farmer_id', 'last_name', 'first_name', 'mid_name', 'suffix',
    'addr_street', 'addr_brgy', 'addr_muni', 'addr_prov', 'contact', 'birthday',
    'sex_male', 'sex_female', 'civ_single', 'civ_married', 'civ_widow', 'civ_sep',
    'spouse', 'sec_ip', 'sec_pwd', 'sec_sc', 'sec_youth', 'bene_name', 'bene_rel',
    'bene_birth', 'guardian', 'guardian_rel', 'guardian_birth', 'sign_name', 'sign_date', 'account_no', 'rsbsa_id',
    'signature_img', 'guardian_signature_img', 'farmer_photo', 'mop_palawan', 'mop_gcash', 'mop_landbank', 'mop_others',
    /*
    'guardian_sign_name', 'guardian_sign_date', 'l1_meth_ds', 'l1_meth_tp',
    'l1_area', 'amount_cover', 'l1_loc', 'farm_prov', 'farm_mun', 'farm_brgy', 'georef_id', 'date_planting',
    'farm_id', 'bound_north', 'bound_south', 'bound_east', 'bound_west', 'l1_trees', 'l1_var', 'l1_sow', 'l1_harv',
    'consent_certify_check', 'consent_privacy_check', 'consent_assign_check', 'farm_purok'
    */
];

const DEFAULT_CONFIGS = {
    'Crop': {
        'crop_high_txt': { x: 10.02657899804349, y: 15.664397061829593, label: 'High Value Details' },
        'date_app': { x: 83.60443208012889, y: 13.914358205936232, label: 'Date of Application' },
        'farmer_id': { x: 31.01564644582508, y: 15.350183513110016, label: 'Farmer ID' },
        'ncfrs_id': { x: 70.06182329708955, y: 94.35843290754752, label: 'NCFRS ID' },
        'last_name': { x: 18.493074739408627, y: 19.64340417433283, label: 'Last Name' },
        'first_name': { x: 31.897506872372617, y: 19.643403800750356, label: 'First Name' },
        'mid_name': { x: 46.44044316046126, y: 19.643403800750356, label: 'Middle Name' },
        'suffix': { x: 60.35639816401922, y: 19.648850254977358, label: 'Name Suffix' },
        'addr_street': { x: 17.677562274034646, y: 23.22207208922321, label: 'Street/Purok' },
        'addr_brgy': { x: 29.7975068723726, y: 23.22207208922321, label: 'Barangay' },
        'addr_muni': { x: 49.77091407458867, y: 23.224139405706204, label: 'Municipality' },
        'addr_prov': { x: 63.905817121680094, y: 23.2669030975486, label: 'Province' },
        'contact': { x: 74.10681540828324, y: 20.26734742919647, label: 'Contact' },
        'birthday': { x: 82.32686975325903, y: 22.924139312310583, label: 'Birthday' },
        'sex_male': { x: 9.889196623065134, y: 26.93936822242945, label: 'Male Check' },
        'sex_female': { x: 15.775623215862918, y: 26.841435819099292, label: 'Female Check' },
        'civ_single': { x: 18.684210473480647, y: 28.506286675711944, label: 'Single Check' },
        'civ_married': { x: 24.501384988716104, y: 28.457320474046867, label: 'Married Check' },
        'civ_widow': { x: 32.880886373757654, y: 28.653185280707177, label: 'Widow Check' },
        'civ_sep': { x: 43.337950085669014, y: 28.496492837646976, label: 'Separated Check' },
        'spouse': { x: 65.75581367137275, y: 28.72296754479259, label: 'Spouse Name' },
        'sec_ip': { x: 58.0060840595198, y: 26.833443355676867, label: 'IP Sector' },
        'sec_pwd': { x: 28.94459801507128, y: 26.786205250948967, label: 'PWD Sector' },
        'sec_sc': { x: 35.35816734901854, y: 26.88068146040476, label: 'SC Sector' },
        'bene_name': { x: 22.493074739408627, y: 31.982886993932482, label: 'Beneficiary Name' },
        'bene_rel': { x: 86.0664819416247, y: 31.483431139216734, label: 'Relationship' },
        'bene_birth': { x: 78.17174509951943, y: 32.60965452467847, label: 'Beneficiary Birthday' },
        'guardian': { x: 21.261676417113616, y: 34.38713893007999, label: 'Guardian Name' },
        'guardian_rel': { x: 84.79609763152868, y: 34.34430200741186, label: 'Guardian Relationship' },
        'guardian_birth': { x: 77.58083213083802, y: 35.4780165208813, label: 'Guardian Birthday' },
        // Crop Only
        'l1_area': { x: 34.68144039037816, y: 42.70855424958429, label: 'Lot 1 Area' },
        'amount_cover': { x: 24.393905764339365, y: 78.21318266144574, label: 'Amount Cover' },
        'farm_purok': { x: 24.20122902850611, y: 45.964875770473554, label: 'Farm Purok' }, // New Field
        'farm_prov': { x: 24.155124600904472, y: 51.544122833438344, label: 'Farm Province' },
        'farm_mun': { x: 24.155124600904472, y: 49.681339573495535, label: 'Farm Municipality' },
        'farm_brgy': { x: 24.155124600904472, y: 47.96752251521781, label: 'Farm Barangay' },
        'georef_id': { x: 60.07713249027361, y: 61.50621222595037, label: 'Georef ID' },
        'date_planting': { x: 24.293628756029122, y: 69.90231326450291, label: 'Date Planting' },
        'farm_id': { x: 24.293628756029122, y: 63.03725418198679, label: 'Farm ID' },
        'bound_north': { x: 24.293628756029122, y: 54.62485834499857, label: 'North Boundary' },
        'bound_south': { x: 24.293628756029122, y: 58.15042486488419, label: 'South Boundary' },
        'bound_east': { x: 24.501384988716104, y: 56.534540209936615, label: 'East Boundary' },
        'bound_west': { x: 24.43213291115378, y: 59.96217432649207, label: 'West Boundary' },
        'l1_trees': { x: 24.388919614754876, y: 74.2407175365649, label: 'Trees/Hills' },
        'l1_var': { x: 24.411911304505573, y: 64.84127441353982, label: 'Lot 1 Variety' },
        'l1_meth_ds': { x: 24.134421014610826, y: 66.11090102302327, label: 'Lot 1 Direct Check' },
        'l1_meth_tp': { x: 33.71191130450558, y: 65.91646325350165, label: 'Lot 1 Trans Check' },
        'l1_sow': { x: 24.404155071818593, y: 68.1220099251, label: 'Lot 1 Sowing' },
        'l1_harv': { x: 24.38132018531721, y: 71.5963884531435, label: 'Lot 1 Harvest' },
        'sign_name': { x: 77.22645917648684, y: 83.68934326348413, label: 'Signature Name' },
        'sign_date': { x: 81.56509690007344, y: 88.80533470389285, label: 'Sign Date' },
        'sec_youth': { x: 45.42584456233166, y: 26.819654522921667, label: 'Youth Sector' },
        'consent_certify_check': { x: 8.501345763114376, y: 80.87383804757164, label: 'Certify Check' },
        'consent_privacy_check': { x: 8.501345763114376, y: 84.51117211161939, label: 'Privacy Check' },
        'consent_assign_check': { x: 8.501345763114376, y: 88.33745859457873, label: 'Assign Check' },
        'mop_palawan': { x: 48.36539717372416, y: 38.388000829434695, label: 'MoP Palawan' },
        'mop_gcash': { x: 8.701769804800227, y: 39.63496973693588, label: 'MoP GCash' },
        'mop_landbank': { x: 8.815052947716042, y: 38.38800227102725, label: 'MoP Landbank' },
        'mop_others': { x: 48.432205187619445, y: 39.7106677618157, label: 'MoP Others' },
        'account_no': { x: 75.44297568618893, y: 37.13135018635755, label: 'Account No' },
        'rsbsa_id': { x: 24.668885125773098, y: 96.50965071250424, label: 'RSBSA ID' },
        'signature_img': { x: 84.39524954815698, y: 84.74736263525887, label: 'Signature Image' },
        'farmer_photo': { x: 6.796777562155583, y: 0.5687696456898335, label: 'Farmer Photo' }
    },
    'ADSS': {
        'date_app': { x: 81.0627329656283, y: 8.149746882296622, label: 'Date of Application' },
        'farmer_id': { x: 12.963789031452613, y: 9.425175709949734, label: 'Farmer ID' },
        'last_name': { x: 13.044290707993685, y: 11.692604736888601, label: 'Last Name' },
        'first_name': { x: 30.61479836245337, y: 11.692604376490461, label: 'First Name' },
        'mid_name': { x: 45.85490964281363, y: 11.83431905107228, label: 'Middle Name' },
        'suffix': { x: 60.35224865809026, y: 11.550890242505853, label: 'Name Suffix' },
        'addr_street': { x: 12.843866666307836, y: 16.74708158237502, label: 'Street/Purok' },
        'addr_brgy': { x: 25.53738930641179, y: 16.841557972029875, label: 'Barangay' },
        'addr_muni': { x: 41.7796207952013, y: 16.841557791830805, label: 'Municipality' },
        'addr_prov': { x: 56.0097277548968, y: 16.74708158237502, label: 'Province' },
        'contact': { x: 77.98956432644523, y: 12.1177473190415, label: 'Contact' },
        'birthday': { x: 76.45298000685369, y: 16.369176744551876, label: 'Birthday' },
        'sex_male': { x: 7.833265624161536, y: 20.76232048424593, label: 'Male Check' },
        'sex_female': { x: 14.447258999794652, y: 20.76232048424593, label: 'Female Check' },
        'civ_single': { x: 17.45361962508243, y: 24.872035595572626, label: 'Single Check' },
        'civ_married': { x: 22.397412653333447, y: 24.919273700300522, label: 'Married Check' },
        'civ_widow': { x: 32.35180672373076, y: 24.824797490844734, label: 'Widow Check' },
        'civ_sep': { x: 44.17682518319602, y: 24.925141702781442, label: 'Separated Check' },
        'spouse': { x: 69.17090649226773, y: 24.872035595572626, label: 'Spouse Name' },
        'sec_ip': { x: 53.136983157399584, y: 20.856796693701718, label: 'IP Sector' },
        'sec_pwd': { x: 23.273800946207643, y: 20.856796693701718, label: 'PWD Sector' },
        'sec_sc': { x: 29.820986307945475, y: 20.76818920752313, label: 'SC Sector' },
        'sec_youth': { x: 40.2816274923948, y: 20.72095038199896, label: 'Youth Sector' },
        'bene_name': { x: 20.393172236474925, y: 39.23241943285212, label: 'Beneficiary Name' },
        'bene_rel': { x: 77.36007520427741, y: 39.173151238281875, label: 'Relationship' },
        'bene_birth': { x: 78.4725737485608, y: 40.74990606582934, label: 'Beneficiary Birthday' },
        'guardian': { x: 20.12594018089379, y: 48.18506669268453, label: 'Guardian Name' },
        'guardian_rel': { x: 77.71444815862858, y: 47.61820943594981, label: 'Guardian Relationship' },
        'guardian_birth': { x: 78.98380042263898, y: 49.12982878724239, label: 'Guardian Birthday' },
        'sign_name': { x: 69.67715360631975, y: 69.99029289239515, label: 'Signature Name' },
        'sign_date': { x: 75.42264280131418, y: 75.0920082030076, label: 'Sign Date' },
        'account_no': { x: 75.1089356167125, y: 53.073184118124786, label: 'Account No' },
        'rsbsa_id': { x: 28.189376977348395, y: 8.344567191064698, label: 'RSBSA ID' },
        'signature_img': { x: 80.87060742609567, y: 71.78534087205509, label: 'Signature Image' },
        'farmer_photo': { x: 5.027329040559608, y: 0.4971739163779445, label: 'Farmer Photo' },
        'guardian_signature_img': { x: 79.25103247822011, y: 83.33021949342208, label: 'Guardian Signature Image' },
        'guardian_sign_name': { x: 70.83322272741434, y: 81.58240961849003, label: 'Guardian Sig Name' },
        'guardian_sign_date': { x: 75.71020774177006, y: 85.8810771487283, label: 'Guardian Sign Date' },
        'adss_occupation': { x: 23.53314888955327, y: 27.258586298227904, label: 'Occupation' },
        'adss_work_addr': { x: 60.47798057364532, y: 27.305824402955796, label: 'Work Address' },
        'adss_premium': { x: 39.366648182735574, y: 29.667729639350448, label: 'Premium Amount' },
        'adss_cover': { x: 39.166224141049724, y: 94.7146027328443, label: 'Amount Cover' },
        'adss_ben1_name': { x: 20.12594018089379, y: 43.76727748672985, label: 'Primary Bene Name' },
        'adss_ben1_rel': { x: 77.71444815862858, y: 43.436610753634604, label: 'Primary Bene Relationship' },
        'adss_ben1_bday': { x: 78.9169924087437, y: 44.90099200019929, label: 'Primary Bene Birthday' },
        'adss_is_minor': { x: 6.6307213740464235, y: 84.59126699378132, label: 'Is Minor Check' },
        'mop_palawan': { x: 45.78021751668284, y: 53.1923057938412, label: 'MoP Palawan' },
        'mop_gcash': { x: 6.58715079723523, y: 55.15752800783673, label: 'MoP GCash' },
        'mop_landbank': { x: 6.497105346255856, y: 53.23954389856909, label: 'MoP Landbank' },
        'mop_others': { x: 45.759884631808085, y: 55.15752800783673, label: 'MoP Others' },
        'consent_certify_check': { x: 6.497105346255856, y: 68.07231166631261, label: 'Certify Check' },
        'consent_privacy_check': { x: 6.831145415732276, y: 74.54393201403397, label: 'Privacy Check' },

    },
    'Livestock': {
        'date_app': { x: 78.99168453487448, y: 10.74784246213167, label: 'Date of Application' },
        'farmer_id': { x: 12.643442624621985, y: 11.928795080328996, label: 'Farmer ID' },
        'last_name': { x: 15.382571194328627, y: 16.186092575894946, label: 'Last Name' },
        'first_name': { x: 29.278638084547694, y: 16.180224505839373, label: 'First Name' },
        'mid_name': { x: 44.243633197091306, y: 16.180224505839373, label: 'Middle Name' },
        'suffix': { x: 59.876708448587756, y: 16.227462610567265, label: 'Name Suffix' },
        'addr_street': { x: 16.384691402757888, y: 20.50353804293547, label: 'Street/Purok' },
        'addr_brgy': { x: 29.946718223500536, y: 20.50353804293547, label: 'Barangay' },
        'addr_muni': { x: 45.91383354447341, y: 20.50353804293547, label: 'Municipality' },
        'addr_prov': { x: 58.740972212367936, y: 20.645252357119148, label: 'Province' },
        'contact': { x: 73.50554328322569, y: 16.841557791830805, label: 'Contact' },
        'birthday': { x: 73.50554328322569, y: 20.43165375115068, label: 'Birthday' },
        'sex_male': { x: 7.900073638056821, y: 24.541368862477377, label: 'Male Check' },
        'sex_female': { x: 13.645562833051242, y: 24.49413075774948, label: 'Female Check' },
        'civ_single': { x: 17.520427638977715, y: 26.005750109042058, label: 'Single Check' },
        'civ_married': { x: 23.733572931239124, y: 26.005750109042058, label: 'Married Check' },
        'civ_widow': { x: 32.08457466814962, y: 25.911273899586273, label: 'Widow Check' },
        'civ_sep': { x: 42.306200794128074, y: 25.911273899586273, label: 'Separated Check' },
        'spouse': { x: 65.22134956021047, y: 25.633713994496116, label: 'Spouse Name' },
        'sec_ip': { x: 58.0728920734151, y: 24.068987815198444, label: 'IP Sector' },
        'sec_pwd': { x: 25.871429375888212, y: 24.16933274793143, label: 'PWD Sector' },
        'sec_sc': { x: 32.75265480710246, y: 24.216570852659324, label: 'SC Sector' },
        'sec_youth': { x: 44.31044121098659, y: 24.216570852659324, label: 'Youth Sector' },
        'bene_name': { x: 19.19062798635981, y: 29.507238582183348, label: 'Beneficiary Name' },
        'bene_rel': { x: 84.2616335203664, y: 29.03485753490442, label: 'Relationship' },
        'bene_birth': { x: 76.91275199188517, y: 30.074095838918062, label: 'Beneficiary Birthday' },
        'guardian': { x: 18.522547847406972, y: 32.62495349422429, label: 'Guardian Name' },
        'guardian_rel': { x: 83.72716940920414, y: 32.596492132479824, label: 'Guardian Relationship' },
        'guardian_birth': { x: 76.91275199188517, y: 33.63573043649347, label: 'Guardian Birthday' },
        'sign_name': { x: 78.24891226979086, y: 78.9843138584559, label: 'Signature Name' },
        'sign_date': { x: 79.38464850601068, y: 84.79460073998676, label: 'Sign Date' },
        'account_no': { x: 75.37616767229365, y: 35.553715987353655, label: 'Account No' },
        'rsbsa_id': { x: 42.50662483581392, y: 93.76984063828644, label: 'RSBSA ID' },
        'signature_img': { x: 84.2616335203664, y: 80.4014570002927, label: 'Signature Image' },
        'farmer_photo': { x: 6.6307213740464235, y: 0.5444120211058376, label: 'Farmer Photo' },
        'mop_palawan': { x: 44.77809730825358, y: 36.753445348534406, label: 'MoP Palawan' },
        'mop_gcash': { x: 7.632841582475685, y: 38.382133547750044, label: 'MoP GCash' },
        'mop_landbank': { x: 7.5660335685804, y: 36.870514196457464, label: 'MoP Landbank' },
        'mop_others': { x: 44.711289294358295, y: 38.21782659509909, label: 'MoP Others' },
        'consent_certify_check': { x: 8.501345763114376, y: 76.38621809842179, label: 'Certify Check' },
        'consent_privacy_check': { x: 8.367729735323808, y: 80.07079026719744, label: 'Privacy Check' },
        'consent_assign_check': { x: 8.768577818695512, y: 83.42469570287786, label: 'Assign Check' },

        // Form Specifics: Location & Animal Type
        'live_prov': { x: 76.05628142941096, y: 42.26651332735015, label: 'Livestock Prov' },
        'live_mun': { x: 58.08492569157957, y: 42.26651332735015, label: 'Livestock Mun' },
        'live_bgy': { x: 38.431335988201596, y: 42.18582739224211, label: 'Livestock Brgy' },
        'live_sitio': { x: 21.107727504448295, y: 42.07257299821035, label: 'Livestock Sitio' },
        'live_animal_type': { x: 56.949189455359736, y: 44.722894773200586, label: 'Animal Type' },

        // Animal Table (Row 1)
        'ls_class_1': { x: 7.165185485208696, y: 58.48297352336521, label: 'R1 Class' },
        'ls_tag_1': { x: 16.196300979236504, y: 58.658135667929045, label: 'R1 Tag' },
        'ls_male_1': { x: 25.549422924576266, y: 58.61089756320115, label: 'R1 Male' },
        'ls_female_1': { x: 31.428528147361256, y: 58.658135667929045, label: 'R1 Female' },
        'ls_age_1': { x: 37.84209748130852, y: 58.46918324901746, label: 'R1 Age' },
        'ls_dob_1': { x: 47.63050902087604, y: 58.27524291987767, label: 'R1 DOB' },
        'ls_breed_1': { x: 61.125727827723395, y: 58.369719129333454, label: 'R1 Breed' },
        'ls_color_1': { x: 72.75032224550282, y: 58.46419533878924, label: 'R1 Color' },
        'ls_val_1': { x: 82.77152432979541, y: 58.511433443517134, label: 'R1 Value' },

        // Animal Table (Row 2)
        'ls_class_2': { x: 7.5660335685804, y: 60.797640655031984, label: 'R2 Class' },
        'ls_tag_2': { x: 16.062684951445938, y: 60.972802799595804, label: 'R2 Tag' },
        'ls_male_2': { x: 25.616230938471546, y: 60.78385038068422, label: 'R2 Male' },
        'ls_female_2': { x: 31.562144175151825, y: 60.831088485412124, label: 'R2 Female' },
        'ls_age_2': { x: 37.84209748130852, y: 60.78385038068422, label: 'R2 Age' },
        'ls_dob_2': { x: 47.63050902087604, y: 60.68438626100021, label: 'R2 DOB' },
        'ls_breed_2': { x: 61.05891981382812, y: 60.637148156272325, label: 'R2 Breed' },
        'ls_color_2': { x: 72.54989820381697, y: 60.68438626100021, label: 'R2 Color' },
        'ls_val_2': { x: 82.70471631590013, y: 60.73162436572811, label: 'R2 Value' },

        // Animal Table (Row 3)
        'ls_class_3': { x: 7.499225554685116, y: 62.92335536778716, label: 'R3 Class' },
        'ls_tag_3': { x: 16.263108993131787, y: 63.098517512350995, label: 'R3 Tag' },
        'ls_male_3': { x: 25.616230938471546, y: 63.0512794076231, label: 'R3 Male' },
        'ls_female_3': { x: 31.628952189047105, y: 62.90956509343941, label: 'R3 Female' },
        'ls_age_3': { x: 37.641673439622664, y: 63.004041302895196, label: 'R3 Age' },
        'ls_dob_3': { x: 47.496892993085474, y: 62.99905339266698, label: 'R3 DOB' },
        'ls_breed_3': { x: 61.05891981382812, y: 62.99905339266698, label: 'R3 Breed' },
        'ls_color_3': { x: 72.48309018992167, y: 62.951815287939084, label: 'R3 Color' },
        'ls_val_3': { x: 82.70471631590013, y: 63.04629149739487, label: 'R3 Value' },

        // Animal Table (Row 4)
        'ls_class_4': { x: 7.632841582475685, y: 65.09630818527025, label: 'R4 Class' },
        'ls_tag_4': { x: 16.329917007027074, y: 65.41318464401775, label: 'R4 Tag' },
        'ls_male_4': { x: 25.415806896785696, y: 65.41318464401775, label: 'R4 Male' },
        'ls_female_4': { x: 31.562144175151825, y: 65.22423222510618, label: 'R4 Female' },
        'ls_age_4': { x: 37.70848145351795, y: 65.27147032983407, label: 'R4 Age' },
        'ls_dob_4': { x: 47.496892993085474, y: 65.36095862906163, label: 'R4 DOB' },
        'ls_breed_4': { x: 60.992111799932836, y: 65.36095862906163, label: 'R4 Breed' },
        'ls_color_4': { x: 72.54989820381697, y: 65.26648241960584, label: 'R4 Color' },
        'ls_val_4': { x: 82.70471631590013, y: 65.26648241960584, label: 'R4 Value' },

        // Animal Table (Row 5)
        'ls_class_5': { x: 7.432417540789832, y: 67.26926100275332, label: 'R5 Class' },
        'ls_tag_5': { x: 16.196300979236504, y: 67.58613746150083, label: 'R5 Tag' },
        'ls_male_5': { x: 25.415806896785696, y: 67.58613746150083, label: 'R5 Male' },
        'ls_female_5': { x: 31.562144175151825, y: 67.49166125204505, label: 'R5 Female' },
        'ls_age_5': { x: 37.70848145351795, y: 67.44442314731714, label: 'R5 Age' },
        'ls_dob_5': { x: 47.496892993085474, y: 67.34495902763314, label: 'R5 DOB' },
        'ls_breed_5': { x: 60.992111799932836, y: 67.43943523708893, label: 'R5 Breed' },
        'ls_color_5': { x: 72.48309018992167, y: 67.48667334181681, label: 'R5 Color' },
        'ls_val_5': { x: 82.70471631590013, y: 67.48667334181681, label: 'R5 Value' },

        // Animal Table (Row 6)
        'ls_class_6': { x: 7.766457610266252, y: 69.58392813442008, label: 'R6 Class' },
        'ls_tag_6': { x: 16.196300979236504, y: 69.94804269789549, label: 'R6 Tag' },
        'ls_male_6': { x: 25.549422924576266, y: 69.71185217425602, label: 'R6 Male' },
        'ls_female_6': { x: 31.562144175151825, y: 69.75909027898392, label: 'R6 Female' },
        'ls_age_6': { x: 37.77528946741323, y: 69.66461406952811, label: 'R6 Age' },
        'ls_dob_6': { x: 47.63050902087604, y: 69.56514994984411, label: 'R6 DOB' },
        'ls_breed_6': { x: 61.125727827723395, y: 69.6596261592999, label: 'R6 Breed' },
        'ls_color_6': { x: 72.54989820381697, y: 69.61238805457201, label: 'R6 Color' },
        'ls_val_6': { x: 82.77152432979541, y: 69.56514994984411, label: 'R6 Value' }
    },
    'Banca': {
        'date_app': { x: 81.85654502013618, y: 11.314699899065456, label: 'Date of Application' },
        'farmer_id': { x: 8.56815377700966, y: 19.156224923497568, label: 'Farmer ID' },
        'last_name': { x: 29.21183007065241, y: 17.502891258021307, label: 'Last Name' },
        'first_name': { x: 50.1227384198763, y: 17.455653153293415, label: 'First Name' },
        'mid_name': { x: 76.57871192240876, y: 17.644605572204988, label: 'Middle Name' },
        'suffix': { x: 66.49070182422088, y: 17.550129362749203, label: 'Name Suffix' },
        'addr_street': { x: 16.585115444443737, y: 24.116225919926336, label: 'Street/Purok' },
        'addr_brgy': { x: 27.20758965379389, y: 24.16346402465423, label: 'Barangay' },
        'addr_muni': { x: 41.838544696861085, y: 24.16346402465423, label: 'Municipality' },
        'addr_prov': { x: 58.40693214289151, y: 24.068987815198444, label: 'Province' },
        'contact': { x: 18.856587916883395, y: 27.98975050761357, label: 'Contact' },
        'birthday': { x: 76.71232795019932, y: 22.368416044994294, label: 'Birthday' },
        'sex_male': { x: 13.311522763574823, y: 31.349524666571178, label: 'Male Check' },
        'sex_female': { x: 21.862948542171175, y: 31.444000876026962, label: 'Female Check' },
        'civ_single': { x: 46.91595375290267, y: 31.538477085482747, label: 'Single Check' },
        'civ_married': { x: 56.80353980940469, y: 31.491238980754854, label: 'Married Check' },
        'civ_widow': { x: 68.69536628276525, y: 31.444000876026962, label: 'Widow Check' },
        'civ_sep': { x: 81.85654502013618, y: 31.438132152749766, label: 'Separated Check' },
        'spouse': { x: 23.13230080618157, y: 26.10022631849785, label: 'Spouse Name' },
        'bene_name': { x: 19.45786004194095, y: 33.8945135986002, label: 'Beneficiary Name' },
        'bene_rel': { x: 80.60835569509776, y: 34.29266272062421, label: 'Relationship' },
        'bene_birth': { x: 64.50762434633431, y: 34.13070412223967, label: 'Beneficiary Birthday' },
        'guardian': { x: 19.19062798635981, y: 35.83127589244382, label: 'Guardian Name' },
        'guardian_rel': { x: 50.00, y: 33.67, label: 'Guardian Relationship' },
        'guardian_birth': { x: 80.95, y: 33.67, label: 'Guardian Birthday' },
        'sign_name': { x: 67.76005408823127, y: 87.48276720263924, label: 'Signature Name' },
        'sign_date': { x: 69.43025443561336, y: 91.20020191521914, label: 'Sign Date' },
        'account_no': { x: 42.50662483581392, y: 28.084226717069356, label: 'Account No' },
        'rsbsa_id': { x: 8.56815377700966, y: 20.957141266036565, label: 'RSBSA ID' },
        'signature_img': { x: 78.81989213506897, y: 88.31867752681765, label: 'Signature Image' },
        'farmer_photo': { x: 3.2235126653869406, y: 3.095269676412063, label: 'Farmer Photo' },
        'bn_home_port': { x: 34.6900872100657, y: 64.43497471907975, label: 'Home Port' },
        'bn_usage': { x: 26.405893487050484, y: 51.50669775432172, label: 'Usage' },
        'bn_boat_material': { x: 32.953078848788316, y: 43.021737716420525, label: 'Boat Material' },
        'bn_boat_type': { x: 25.80462136199293, y: 38.563457058879024, label: 'Boat Type' },
        'bn_motor_no': { x: 26.606317528736334, y: 47.22592903720301, label: 'Motor No' },
        'bn_chassis_no': { x: 26.472701500945767, y: 49.3516437499582, label: 'Chassis No' },
        'bn_boat_age': { x: 45.24575340552057, y: 55.72878788822375, label: 'Boat Age' },
        'bn_boat_color': { x: 26.3390854731552, y: 53.60307317546857, label: 'Boat Color' },
        'bn_dim_length': { x: 62.14818092102742, y: 61.633548096025294, label: 'Length' },
        'bn_dim_width': { x: 41.97216072465165, y: 61.633548096025294, label: 'Width' },
        'bn_dim_depth': { x: 23.265916833972135, y: 61.633548096025294, label: 'Depth' },
        'amount_cover': { x: 32.48542275152133, y: 67.86897792010717, label: 'Amount Cover' },
        'bn_period_from': { x: 34.89051125175155, y: 70.84497851796444, label: 'Period From' },
        'bn_period_to': { x: 54.799299392546175, y: 70.84497851796444, label: 'Period To' },
        'bn_mortgage_to': { x: 20.259556208684355, y: 73.8682172205496, label: 'Mortgage To' },
        'bn_mortgage_branch': { x: 40.569192432850684, y: 75.33259846711428, label: 'Mortgage Branch' },
        'bn_mortgage_addr': { x: 40.569192432850684, y: 76.93869402786264, label: 'Mortgage Address' },
        'bn_others': { x: 26.405893487050484, y: 58.04345501989052, label: 'Specifications' }
    }
};




let currentCalibLine = 'Crop';
let currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIGS[currentCalibLine]));
let isCalibrating = false;
let selectedKeys = new Set();
let showLabels = false;


async function initCalibration() {
    try {
        const saved = await db.settings.get('pdf_layout');
        if (saved && saved.value) {
            const parsed = JSON.parse(saved.value);
            // Safe merge: preserve DEFAULT_CONFIG labels, only update coordinates
            Object.keys(parsed).forEach(k => {
                if (currentConfig[k]) {
                    currentConfig[k].x = parsed[k].x;
                    currentConfig[k].y = parsed[k].y;
                }
            });
            console.log("Calibration layout loaded from DB (Safe Merge)");
        }
    } catch (err) {
        console.error("Failed to load calibration:", err);
    }
    const calBgImage = document.getElementById('calBgImage');
    if (calBgImage) calBgImage.src = bgData;
}

async function toggleCalibration() {
    isCalibrating = !isCalibrating;
    const overlay = document.getElementById('calibrationOverlay');
    overlay.style.display = isCalibrating ? 'block' : 'none';
    if (isCalibrating) {
        // Reset section to profile when opening
        const sectionSel = document.getElementById('calibSectionSelect');
        if (sectionSel) sectionSel.value = 'profile';

        // Default to Crop or keep current
        if (!currentCalibLine) currentCalibLine = 'Crop';

        const storageKey = currentCalibLine === 'Crop' ? 'pdf_layout' : `pdf_layout_${currentCalibLine.toLowerCase()}`;
        const savedLayout = await db.settings.get(storageKey);
        currentConfig = savedLayout ? JSON.parse(savedLayout.value) : { ...DEFAULT_CONFIGS[currentCalibLine] };

        renderCalibration();
    }
}

function toggleLabels(cb) {
    showLabels = cb.checked;
    document.querySelectorAll('.cal-dot').forEach(dot => {
        dot.classList.toggle('force-show', showLabels);
    });
}

function renderCalibration() {
    const wrapper = document.getElementById('calWrapper');
    // Keep background image
    const bgSource = bgDefaults[currentCalibLine] || bgData;
    if (!bgSource) {
        wrapper.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:100%; color:#555; text-align:center;">
                    <p>No background image loaded for ${currentCalibLine}.<br>Please try "Import Template" to upload a form image.</p>
                </div>`;
    } else {
        wrapper.innerHTML = `<img id="calBgImage" class="cal-bg-img" src="${bgSource}">`;
    }

    const sectionSel = document.getElementById('calibSectionSelect');
    const currentSection = sectionSel ? sectionSel.value : 'profile';

    Object.keys(currentConfig).forEach(key => {
        // Section Filtering Logic
        if (currentSection !== 'all') {
            // Normalize key for comparison (strip prefixes like adss_)
            const normalizedKey = key.replace(/^(adss|crop|live|bn)_/, '');
            const isProfile = FARMER_PROFILE_FIELDS.includes(key) || FARMER_PROFILE_FIELDS.includes(normalizedKey);

            if (currentSection === 'profile' && !isProfile) return;
            if (currentSection === 'form' && isProfile) return;
        }

        const cfg = currentConfig[key];
        const dot = document.createElement('div');
        dot.className = 'cal-dot' + (selectedKeys.has(key) ? ' selected' : '');
        if (showLabels) dot.classList.add('force-show');

        dot.style.left = cfg.x + '%';
        dot.style.top = cfg.y + '%';
        dot.dataset.key = key;
        dot.dataset.label = cfg.label;
        dot.dataset.coord = `${cfg.x},${cfg.y}`;

        dot.onclick = (e) => {
            e.stopPropagation();
            if (e.shiftKey) {
                if (selectedKeys.has(key)) selectedKeys.delete(key);
                else selectedKeys.add(key);
            } else {
                selectedKeys.clear();
                selectedKeys.add(key);
            }
            renderCalibration();
        };

        makeDraggable(dot, key);
        wrapper.appendChild(dot);
    });
}

function makeDraggable(el, key) {
    let isDragging = false;
    el.onmousedown = (e) => {
        if (e.shiftKey) return;
        isDragging = true;
        const wrapper = document.getElementById('calWrapper');
        const rect = wrapper.getBoundingClientRect();

        const move = (e) => {
            if (!isDragging) return;
            let x = ((e.clientX - rect.left) / rect.width) * 100;
            let y = ((e.clientY - rect.top) / rect.height) * 100;
            x = Math.max(0, Math.min(100, x));
            y = Math.max(0, Math.min(100, y));

            const dx = x - currentConfig[key].x;
            const dy = y - currentConfig[key].y;

            if (selectedKeys.has(key)) {
                selectedKeys.forEach(k => {
                    currentConfig[k].x += dx;
                    currentConfig[k].y += dy;
                });
            } else {
                currentConfig[key].x = x;
                currentConfig[key].y = y;
            }
            renderCalibration();
        };

        const up = () => {
            isDragging = false;
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
        };

        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
    };
}

function alignSelectedX() {
    if (selectedKeys.size < 2) return;
    const keys = Array.from(selectedKeys);
    const firstX = currentConfig[keys[0]].x;
    keys.forEach(k => currentConfig[k].x = firstX);
    renderCalibration();
}

function alignSelectedY() {
    if (selectedKeys.size < 2) return;
    const keys = Array.from(selectedKeys);
    const firstY = currentConfig[keys[0]].y;
    keys.forEach(k => currentConfig[k].y = firstY);
    renderCalibration();
}

function clearSelection() {
    selectedKeys.clear();
    renderCalibration();
}

async function resetCalibration() {
    if (confirm(`Reset ${currentCalibLine} to defaults?`)) {
        currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIGS[currentCalibLine]));
        const storageKey = currentCalibLine === 'Crop' ? 'pdf_layout' : `pdf_layout_${currentCalibLine.toLowerCase()}`;
        await db.settings.where('key').equals(storageKey).delete();
        renderCalibration();
    }
}

async function saveCalibration() {
    const clean = {};
    Object.keys(currentConfig).forEach(k => {
        clean[k] = { x: currentConfig[k].x, y: currentConfig[k].y };
    });
    const storageKey = currentCalibLine === 'Crop' ? 'pdf_layout' : `pdf_layout_${currentCalibLine.toLowerCase()}`;
    await db.settings.put({ key: storageKey, value: JSON.stringify(clean) });
    alert(`${currentCalibLine} layout saved!`);
}

function exportLayout() {
    const clean = {};
    Object.keys(currentConfig).forEach(k => {
        clean[k] = { x: currentConfig[k].x, y: currentConfig[k].y };
    });
    const blob = new Blob([JSON.stringify(clean, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_layout_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function triggerImportLayout() {
    document.getElementById('importLayoutInput').click();
}

async function importLayout(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const parsed = JSON.parse(e.target.result);
            Object.keys(parsed).forEach(k => {
                if (currentConfig[k]) {
                    currentConfig[k].x = parsed[k].x;
                    currentConfig[k].y = parsed[k].y;
                }
            });
            renderCalibration();
            const clean = {};
            Object.keys(currentConfig).forEach(k => {
                clean[k] = { x: currentConfig[k].x, y: currentConfig[k].y };
            });
            const storageKey = currentCalibLine === 'Crop' ? 'pdf_layout' : `pdf_layout_${currentCalibLine.toLowerCase()}`;
            await db.settings.put({ key: storageKey, value: JSON.stringify(clean) });
            alert(`${currentCalibLine} layout imported and saved successfully!`);
        } catch (err) {
            alert("Failed to import layout: Invalid JSON file.");
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = '';
}


function triggerImportTemplate() {
    document.getElementById('importTemplateInput').click();
}

async function importTemplate(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result.split(',')[1];
        const templateKey = currentCalibLine === 'Crop' ? 'pdf_template' : `pdf_template_${currentCalibLine.toLowerCase()}`;

        // Save to DB
        await db.settings.put({ key: templateKey, value: base64 });

        // Update current view
        bgDefaults[currentCalibLine] = e.target.result;
        renderCalibration();
        alert(`${currentCalibLine} template updated!`);
    };
    reader.readAsDataURL(file);
}

async function onCalibLineChange() {
    const selectEl = document.getElementById('calibLineSelect');
    if (!selectEl) return;
    currentCalibLine = selectEl.value;

    // Reset section to "All Fields" when switching forms
    const sectionSel = document.getElementById('calibSectionSelect');
    if (sectionSel) sectionSel.value = 'all';

    // Load appropriate background
    const templateKey = currentCalibLine === 'Crop' ? 'pdf_template' : `pdf_template_${currentCalibLine.toLowerCase()}`;
    const template = await db.settings.get(templateKey);
    if (template) {
        bgDefaults[currentCalibLine] = 'data:image/jpeg;base64,' + template.value;
    }

    // Load custom layout for this line if it exists
    const storageKey = currentCalibLine === 'Crop' ? 'pdf_layout' : `pdf_layout_${currentCalibLine.toLowerCase()}`;
    const customLayout = await db.settings.get(storageKey);
    currentConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIGS[currentCalibLine]));
    if (customLayout) {
        const parsed = JSON.parse(customLayout.value);
        Object.keys(parsed).forEach(k => {
            if (currentConfig[k]) {
                currentConfig[k].x = parsed[k].x;
                currentConfig[k].y = parsed[k].y;
            }
        });
    }
    selectedKeys.clear();
    renderCalibration();
}

// Keyboard Nudges
document.addEventListener('keydown', (e) => {
    if (!isCalibrating || selectedKeys.size === 0) return;
    const step = e.ctrlKey ? 0.1 : 1;
    let moved = false;

    if (e.key === 'ArrowUp') { selectedKeys.forEach(k => currentConfig[k].y -= step); moved = true; }
    if (e.key === 'ArrowDown') { selectedKeys.forEach(k => currentConfig[k].y += step); moved = true; }
    if (e.key === 'ArrowLeft') { selectedKeys.forEach(k => currentConfig[k].x -= step); moved = true; }
    if (e.key === 'ArrowRight') { selectedKeys.forEach(k => currentConfig[k].x += step); moved = true; }

    if (moved) {
        e.preventDefault();
        renderCalibration();
    }
});


if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCalibration);
} else {
    initCalibration();
}

// Location Data for Region 10 (Northern Mindanao) and Caraga Region
const locationData = {
    "Agusan del Norte": ["Buenavista", "Carmen", "Jabonga", "Kitcharao", "Las Nieves", "Magallanes", "Nasipit", "Remedios T. Romualdez", "Santiago", "Tubay"],
    "Agusan del Sur": ["Bunawan", "Esperanza", "La Paz", "Loreto", "Prosperidad", "Rosario", "San Francisco", "San Luis", "Santa Josefa", "Sibagat", "Talacogon", "Trento", "Veruela"],
    "Camiguin": ["Catarman", "Guinsiliban", "Mahinog", "Mambajao", "Sagay"],
    "Dinagat Islands": ["Basilisa", "Cagdianao", "Dinagat", "Libjo", "Loreto", "San Jose", "Tubajon"],
    "Bukidnon": ["Baungon", "Cabanglasan", "Damulog", "Dangcagan", "Don Carlos", "Impasug-ong", "Kadingilan", "Kalilangan", "Kibawe", "Kitaotao", "Lantapan", "Libona", "Malitbog", "Manolo Fortich", "Maramag", "Pangantucan", "Quezon", "San Fernando", "Sumilao", "Talakag"],
    "Misamis Oriental": ["Alubijid", "Balingasag", "Balingoan", "Binuangan", "Claveria", "Gitagum", "Initao", "Jasaan", "Kinoguitan", "Lagonglong", "Laguindingan", "Libertad", "Lugait", "Magsaysay", "Manticao", "Medina", "Naawan", "Opol", "Salay", "Sugbongcogon", "Tagoloan", "Talisayan", "Villanueva"],
    "Surigao del Norte": ["Alegria", "Bacuag", "Burgos", "Claver", "Dapa", "Del Carmen", "General Luna", "Gigaquit", "Mainit", "Malimono", "Pilar", "Placer", "San Benito", "San Francisco", "San Isidro", "Santa Monica", "Sison", "Socorro", "Tagana-an", "Tubod"],
    "Surigao del Sur": ["Barobo", "Bayabas", "Cagwait", "Cantilan", "Carmen", "Carrascal", "Cortes", "Hinatuan", "Lanuza", "Lianga", "Lingig", "Madrid", "Marihatag", "San Agustin", "San Miguel", "Tagbina", "Tago"]
};

// Function to populate province autocomplete
function populateProvinceList() {
    const provinceList = document.getElementById('province-list');
    if (!provinceList) return; // Prevent crash if not in main DOM (e.g. Preprocessing Hub)

    provinceList.innerHTML = '';

    Object.keys(locationData).sort().forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        provinceList.appendChild(option);
    });
}

// Function called when province changes
function onProvinceChange() {
    const provinceInput = document.getElementById('f_prov_farmer');
    const municipalityInput = document.getElementById('f_mun_farmer');
    const barangayInput = document.getElementById('f_brgy_farmer');
    const selectedProvince = provinceInput.value;

    // Clear municipality and barangay
    municipalityInput.value = '';
    barangayInput.value = '';

    // Populate municipality list based on selected province
    const municipalityList = document.getElementById('municipality-list');
    municipalityList.innerHTML = '';

    if (selectedProvince && locationData[selectedProvince]) {
        locationData[selectedProvince].forEach(municipality => {
            const option = document.createElement('option');
            option.value = municipality;
            municipalityList.appendChild(option);
        });
    }
}

// Function called when live province changes
function onLiveProvinceChange() {
    const provinceInput = document.getElementById('live_prov');
    const municipalityInput = document.getElementById('live_mun');
    const barangayInput = document.getElementById('live_bgy');
    const selectedProvince = provinceInput.value;

    // Clear municipality and barangay
    municipalityInput.value = '';
    barangayInput.value = '';

    // Populate municipality list based on selected province
    const municipalityList = document.getElementById('municipality-list');
    municipalityList.innerHTML = '';

    if (selectedProvince && locationData[selectedProvince]) {
        locationData[selectedProvince].forEach(municipality => {
            const option = document.createElement('option');
            option.value = municipality;
            municipalityList.appendChild(option);
        });
    }
}

// Function called when live municipality changes
function onLiveMunicipalityChange() {
    const barangayInput = document.getElementById('live_bgy');
    barangayInput.value = '';
    // Handle barangay population here if data exists
}

// Initialize province list when page loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', populateProvinceList);
} else {
    populateProvinceList();
}

// ========================================
// DATABASE VIEW FUNCTIONS
// ========================================

// Database View is removed.

// Helper to get all applications (missing in some versions)
async function getApplications() {
    try {
        if (typeof db !== 'undefined' && db.apps) {
            return await db.apps.toArray();
        }
        return [];
    } catch (e) {
        console.error("Error fetching applications:", e);
        return [];
    }
}

// Update Welcome Dashboard Statistics
async function updateWelcomeStats() {
    try {
        if (typeof db === 'undefined') return;

        // 1. Total Farmers
        const farmerCount = await db.profiles.count();
        const farmerEl = document.getElementById('stat-farmers');
        if (farmerEl) {
            // Animate or just set
            farmerEl.textContent = farmerCount.toLocaleString();
        }

        // 2. Active Policies and Total Premium
        const apps = await getApplications();
        const policyCount = apps.length;
        let totalPremium = 0;

        apps.forEach(app => {
            // Try to find premium in various possible field names
            const p = parseFloat(app.premium || app.Premium || app.TotalPremium || 0);
            if (!isNaN(p)) totalPremium += p;
        });

        const policyEl = document.getElementById('stat-policies');
        if (policyEl) policyEl.textContent = policyCount.toLocaleString();

        const premiumEl = document.getElementById('stat-premium');
        if (premiumEl) premiumEl.textContent = totalPremium.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

        console.log("Welcome Stats Updated:", { farmerCount, policyCount, totalPremium });

    } catch (e) {
        console.error("Error updating welcome stats:", e);
    }
}

// (Database helpers removed)

// Helper function to format date
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// CSV importing logic has been moved to settings view.

// --- Farmer Photo Capture Logic ---
let cameraStream = null;

async function openCamera() {
    // Check for Secure ContextFallback trigger for insecure origins
    if (!window.isSecureContext) {
        // If not HTTPS or localhost, trigger the native file/camera capture
        document.getElementById('f_photo_fallback').click();
        return;
    }

    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');

    modal.style.display = 'flex';

    try {
        // Prefer 'environment' for tablets if available, fallback to 'user'
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: 'environment' } },
            audio: false
        });
        video.srcObject = cameraStream;
    } catch (err) {
        console.error("Error accessing camera:", err);
        // Graceful fallback to file input if MediaDevices fails
        modal.style.display = 'none';
        document.getElementById('f_photo_fallback').click();
    }
}

// New: Handle photo taken via native device camera fallback
function handleFallbackPhoto(input) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const photoData = e.target.result;
            document.getElementById('f_photo_data').value = photoData;
            document.getElementById('farmer-photo-preview').innerHTML = `<img src="${photoData}" alt="Farmer Photo">`;
        };
        reader.readAsDataURL(input.files[0]);
    }
}

function closeCamera() {
    const modal = document.getElementById('camera-modal');
    const video = document.getElementById('camera-video');

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    video.srcObject = null;
    modal.style.display = 'none';
}



function capturePhoto() {
    const video = document.getElementById('camera-video');
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to Base64 (JPEG for smaller size)
    const photoData = canvas.toDataURL('image/jpeg', 0.8);

    // Update preview and hidden input
    document.getElementById('f_photo_data').value = photoData;
    document.getElementById('farmer-photo-preview').innerHTML = `<img src="${photoData}" alt="Farmer Photo">`;

    closeCamera();
}

// --- Global App Fullscreen Toggle ---
function toggleAppFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch((err) => {
            console.error(`Error attempting to enable fullscreen: ${err.message} (${err.name})`);
            alert("This device or browser does not support fullscreen mode.");
        });
    } else {
        document.exitFullscreen();
    }
}

// Listen for fullscreen changes to update the icon
document.addEventListener('fullscreenchange', () => {
    const icon = document.getElementById('fullscreen-icon');
    if (icon) {
        if (document.fullscreenElement) {
            icon.className = 'fas fa-compress';
        } else {
            icon.className = 'fas fa-expand';
        }
    }
});

// --- Preprocessing Hub Bundle Bridge ---
window.addEventListener('message', async (event) => {
    if (event.data && event.data.action === 'GENERATE_PWA_BUNDLE') {
        const farmersData = event.data.farmersData;
        const results = [];
        // Generate PDFs in background
        for (let i = 0; i < farmersData.length; i++) {
            try {
                // Return Blob Instead of Downloading
                const res = await generateIndividualPDF(farmersData[i], true);
                if (res) results.push(res);
            } catch (e) {
                console.error("Bundle PDF Generation Error:", e);
            }
        }

        // Send generated Blobs back to the Hub
        event.source.postMessage({
            action: 'BUNDLE_PDFS_READY',
            pdfs: results
        }, '*');
    }
});

// ── Resizable Table Columns ───────────────────────────────────────────────────
function makeTableResizable(tableId) {
    const table = document.getElementById(tableId);
    if (!table) return;

    const ths = table.querySelectorAll('thead th');
    ths.forEach(th => {
        // Skip if resizer already added
        if (th.querySelector('.col-resizer')) return;

        const resizer = document.createElement('div');
        resizer.className = 'col-resizer';
        th.appendChild(resizer);

        let startX, startWidth;

        resizer.addEventListener('mousedown', function (e) {
            startX = e.pageX;
            startWidth = th.offsetWidth;
            resizer.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            const onMouseMove = (e) => {
                const newWidth = Math.max(40, startWidth + (e.pageX - startX));
                th.style.width = newWidth + 'px';
                th.style.minWidth = newWidth + 'px';
            };

            const onMouseUp = () => {
                resizer.classList.remove('dragging');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            };

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
            e.preventDefault();
        });
    });
}
