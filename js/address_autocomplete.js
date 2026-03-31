// Target Datalist IDs
const PROVINCE_DATALIST_IDS = ['dl_f_prov_farmer', 'dl_f_farm_prov', 'dl_live_prov'];
const MUNICIPALITY_DATALIST_IDS = ['dl_f_mun_farmer', 'dl_f_farm_mun', 'dl_live_mun'];
const BARANGAY_DATALIST_IDS = ['dl_f_brgy_farmer', 'dl_f_farm_bgy', 'dl_live_bgy'];

// Holds the currently loaded hierarchy: { "MUN_NAME": ["BGY1", "BGY2"] }
window.CURRENT_MUNICIPALITIES_MAP = {};

// ==========================================
// Settings Initializers
// ==========================================

function loadAgentConfig() {
    const pType = localStorage.getItem('agent_user_type');
    const pName = localStorage.getItem('pcic_agent_name');
    const pProv = localStorage.getItem('agent_province');
    const pMun = localStorage.getItem('agent_municipality');

    if (pType) safeSet('user_type', pType);
    if (pName) safeSet('agent_name', pName);
    if (pProv) {
        safeSet('user_province', pProv);
        applyDefaultProvince(pProv);
    }
    if (pMun) safeSet('user_municipality', pMun);
}

function saveAgentConfig() {
    const pType = document.getElementById('user_type')?.value || '';
    const pName = document.getElementById('agent_name')?.value || '';
    const pProv = document.getElementById('user_province')?.value || '';
    const pMun = document.getElementById('user_municipality')?.value || '';

    localStorage.setItem('agent_user_type', pType);
    localStorage.setItem('pcic_agent_name', pName);
    localStorage.setItem('agent_province', pProv);
    localStorage.setItem('agent_municipality', pMun);

    applyDefaultProvince(pProv);
    
    // As part of save from Settings, refresh the active context
    loadAgentProvinceList(pProv);
}

function applyDefaultProvince(provinceName) {
    if (!provinceName) return;
    
    // Globally set all available province fields
    const provInputs = ['f_prov_farmer', 'f_farm_prov', 'live_prov'];
    provInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.value = provinceName;
            // Optionally trigger the downstream update immediately
            el.dispatchEvent(new Event('change'));
        }
    });
}

// ==========================================
// Synchronous Cascading Filtering Logic
// ==========================================

/**
 * Invoked on initialize or Settings load to cache global map
 */
function loadAgentProvinceList(forceProvince = null) {
    const targetProvince = forceProvince || localStorage.getItem('agent_province');
    if (!targetProvince) return;
    
    filterMunicipalities(targetProvince, MUNICIPALITY_DATALIST_IDS, BARANGAY_DATALIST_IDS);
}

/**
 * Dynamically updates the targeted municipality lists natively from ADDRESS_DATA
 */
function filterMunicipalities(provinceName, munDatalistIds, bgyDatalistIds) {
    const targetsMun = Array.isArray(munDatalistIds) ? munDatalistIds : [munDatalistIds];
    const targetsBgy = Array.isArray(bgyDatalistIds) ? bgyDatalistIds : [bgyDatalistIds];

    if (!provinceName || typeof window.ADDRESS_DATA === 'undefined') {
        populateSelects(targetsMun, []);
        populateSelects(targetsBgy, []);
        window.CURRENT_MUNICIPALITIES_MAP = {};
        return;
    }

    // Identify standard keys regardless of casing differences
    const searchString = provinceName.trim().toUpperCase();
    
    // Safety check map scope
    if (!window.ADDRESS_DATA[searchString]) {
        console.warn("No static province dictionary matched for:", searchString);
        populateSelects(targetsMun, []);
        populateSelects(targetsBgy, []);
        window.CURRENT_MUNICIPALITIES_MAP = {};
        return;
    }

    // Copy over the map directory directly into current mappings
    window.CURRENT_MUNICIPALITIES_MAP = window.ADDRESS_DATA[searchString];
    
    // Push the keys into the element dropdown
    const munNames = Object.keys(window.CURRENT_MUNICIPALITIES_MAP).sort();
    populateSelects(targetsMun, munNames);
    
    // Clear barangay fields strictly (new scope selected)
    populateSelects(targetsBgy, []);
}

/**
 * Extracts Barangays from memory map for chosen municipality
 */
function filterBarangays(municipalityName, bgyDatalistIds) {
    const targetsBgy = Array.isArray(bgyDatalistIds) ? bgyDatalistIds : [bgyDatalistIds];
    
    if (!municipalityName || !window.CURRENT_MUNICIPALITIES_MAP) {
        populateSelects(targetsBgy, []);
        return;
    }
    
    const munUpper = municipalityName.trim().toUpperCase();
    const bgys = window.CURRENT_MUNICIPALITIES_MAP[munUpper] || [];
    
    populateSelects(targetsBgy, bgys);
}

// ==========================================
// Datalist Dom Mappers
// ==========================================

function populateSelects(datalistIds, optionsArray) {
    datalistIds.forEach(dlId => {
        if (!dlId) return;
        const dlEl = document.getElementById(dlId);
        if (dlEl) {
            dlEl.innerHTML = ''; // Notice: We only wipe the background datalist option elements
            optionsArray.forEach(val => {
                const opt = document.createElement('option');
                opt.value = val;
                dlEl.appendChild(opt);
            });
        }
    });
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    // Populate the base Province lists securely utilizing loaded dictionary hooks
    if (typeof window.ADDRESS_DATA !== 'undefined') {
        const provNames = Object.keys(window.ADDRESS_DATA).sort();
        populateSelects(PROVINCE_DATALIST_IDS, provNames);
    }

    loadAgentConfig();
});

// Stubs for legacy integrations to prevent UI Reference errors
function onMunicipalityChange() {}
function onLiveMunicipalityChange() {}
function handleProvSelect() {}
function handleMunSelect() {}
