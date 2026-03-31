// app_updates.js
// Edit this file to quickly update the Announcement Bar and Release Notes

const APP_ANNOUNCEMENT = `⚠️ <strong>This application is under it's final pilot testing.
</strong> If you encountered issues in using the app, kindly report to the office
promptly. Thank you.`;

const APP_RELEASE_NOTES = `
<strong>v1.4.3 (2026-03-31)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>[FEAT] Completely rebuilt Address Autocomplete framework ensuring lightning fast, synchronous, and flawless offline integration natively from a global static index.</li>
    <li>[FEAT] Added "Same as Home Address" checkbox to Boat Insurance tabs for rapid port logging.</li>
    <li>[FEAT] Boat Insurance "Usage" defaults automatically to Fishing seamlessly.</li>
    <li>[FIX] Enforced proper case-insensitivity against corrupted legacy data restoring stable searches.</li>
</ul>

<strong>v1.4.2 (2026-03-25)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>[FIX] Added missing files for the Preprocessing Hub and other utility scripts to offline cache, allowing full offline usage of the Hub.</li>
</ul>

<strong>v1.4.1 (2026-03-17)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>[FEAT] History redownload limits removed. Download any past application PDF.</li>
    <li>[FEAT] Added 'Hard Refresh' button in settings for easy updates.</li>
    <li>[FEAT] Added 'Coconut' to the High Value Crop default list (PHP 70,000 cover).</li>
    <li>[FEAT] Separated announcement and release notes for easier maintenance.</li>
</ul>

<strong>v1.4.0 (2026-03-10)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>[FEAT] Incorporate the Pre-processing hub.</li>
    <li>[FEAT] Added NCFRS input field.</li>
    <li>[FEAT] Allowed edit for farmer's address manually.</li>
    <li>[FEAT] Auto delete the previous farm details when new policy.</li>
    <li>[FEAT] Supported full screen signature.</li>
    <li>[FEAT] Put required field prompt before saving the application form.</li>
</ul>

<strong>v1.3.4 (2026-02-27)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>[FEAT] Replaced individual brochure modals with a single unified Google Drive folder view.</li>
</ul>

<strong>v1.3.0 (2026-02-25)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>[FEAT] Full Home Dashboard UI redesign: satellite background, glassmorphism hero card, SVG
        sidebar icons, announcement banner, 3-column footer. New Geospatial Digital Insurance
        platform aesthetic.</li>
</ul>

<strong>v1.2.6 (2026-02-24)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>Relocated brochure access to Home Dashboard; added brochure modal.</li>
</ul>

<strong>v1.2.3 (2026-02-24)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>Updated dynamic PDF generation filename logic per line.</li>
</ul>

<strong>v1.2.2 (2026-02-24)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>Added Update Banner and Release Notes Modal.</li>
</ul>

<strong>v1.1.2 (2026-01-30)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>Embedded the PCIC RO10 logo to the script.</li>
</ul>

<strong>v1.0.2 (2026-01-29)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>[FIX] Replaced 'Suffix' with 'Middle Name'; Fixed Save bugs.</li>
</ul>

<strong>v1.0.1 (2026-01-28)</strong>
<ul style="margin-top: 5px; margin-bottom: 15px;">
    <li>[FEAT] Added Farm Selector; Fixed blank PDF issues.</li>
</ul>

<strong>v1.0.0 (2026-01-01)</strong>
<ul style="margin-top: 5px; margin-bottom: 5px;">
    <li>Initial Release.</li>
</ul>
`;

// Automatically inject content into DOM on page load
document.addEventListener('DOMContentLoaded', () => {
    // Inject Announcement
    const announcementEl = document.getElementById('announcement-text');
    if (announcementEl && APP_ANNOUNCEMENT) {
        announcementEl.innerHTML = APP_ANNOUNCEMENT;
    }

    // Inject Release Notes (About Page)
    const releaseNotesEl = document.getElementById('update-release-notes-content');
    if (releaseNotesEl && APP_RELEASE_NOTES) {
        releaseNotesEl.innerHTML = APP_RELEASE_NOTES;
    }

    // Inject Release Notes (Popup Modal)
    const modalNotesEl = document.getElementById('modal-release-notes-content');
    if (modalNotesEl && APP_RELEASE_NOTES) {
        modalNotesEl.innerHTML = APP_RELEASE_NOTES;
    }
});
