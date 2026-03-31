/**
 * PCIC Database Manager
 * Handles IndexedDB operations for insurance applications
 * Version: 1.0.0
 */

const DB_NAME = 'PCICInsuranceDB';
const DB_VERSION = 1;
let appDB = null;

/**
 * Initialize IndexedDB
 */
async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => {
            console.error('Database failed to open');
            reject(request.error);
        };

        request.onsuccess = () => {
            appDB = request.result;
            console.log('Database opened successfully');
            resolve(appDB);
        };

        request.onupgradeneeded = (event) => {
            appDB = event.target.result;

            // Create object stores if they don't exist (Harmonized with main app)
            if (!appDB.objectStoreNames.contains('profiles')) {
                const farmerStore = appDB.createObjectStore('profiles', { keyPath: 'FarmersID' });
                farmerStore.createIndex('LastName', 'LastName', { unique: false });
                farmerStore.createIndex('ProvFarmer', 'ProvFarmer', { unique: false });
                farmerStore.createIndex('MunFarmer', 'MunFarmer', { unique: false });
            }

            if (!appDB.objectStoreNames.contains('apps')) {
                const appStore = appDB.createObjectStore('apps', { keyPath: 'id' });
                appStore.createIndex('FarmersID', 'FarmersID', { unique: false });
                appStore.createIndex('InsuranceLine', 'InsuranceLine', { unique: false });
                appStore.createIndex('status', 'status', { unique: false });
                appStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            if (!appDB.objectStoreNames.contains('settings')) {
                const calibStore = appDB.createObjectStore('settings', { keyPath: 'id' });
            }

            console.log('Database setup complete');
        };
    });
}

/**
 * Save farmer record
 */
async function saveFarmer(farmerData) {
    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['profiles'], 'readwrite');
        const store = transaction.objectStore('profiles');

        // Add timestamp if not exists
        if (!farmerData.createdDate) {
            farmerData.createdDate = new Date().toISOString();
        }
        farmerData.updatedDate = new Date().toISOString();

        const request = store.put(farmerData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Save application record
 */
async function saveApplication(appData) {
    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['apps'], 'readwrite');
        const store = transaction.objectStore('apps');

        // Add timestamp if not exists
        if (!appData.applicationDate) {
            appData.applicationDate = new Date().toISOString();
        }
        appData.updatedDate = new Date().toISOString();

        const request = store.put(appData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all applications with optional filter
 */
async function getApplications(filter = {}) {
    // Ensure database is initialized
    if (!appDB) {
        await initDB();
    }

    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['apps'], 'readonly');
        const store = transaction.objectStore('apps');
        const request = store.getAll();

        request.onsuccess = () => {
            let results = request.result;

            // Apply filters (Harmonized property names)
            if (filter.insuranceType && filter.insuranceType !== 'All') {
                results = results.filter(app => (app.InsuranceLine || app.insuranceType) === filter.insuranceType);
            }

            if (filter.status) {
                results = results.filter(app => app.status === filter.status);
            }

            if (filter.searchTerm) {
                const term = filter.searchTerm.toLowerCase();
                results = results.filter(app =>
                    (app.id && app.id.toLowerCase().includes(term)) ||
                    (app.FarmersID && app.FarmersID.toLowerCase().includes(term)) ||
                    (app.farmerName && app.farmerName.toLowerCase().includes(term))
                );
            }

            // Sort by date (newest first)
            results.sort((a, b) => new Date(b.timestamp || b.applicationDate) - new Date(a.timestamp || a.applicationDate));

            resolve(results);
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Get single application by ID
 */
async function getApplication(id) {
    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['apps'], 'readonly');
        const store = transaction.objectStore('apps');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get farmer by ID
 */
async function getFarmer(id) {
    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['profiles'], 'readonly');
        const store = transaction.objectStore('profiles');
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete application
 */
async function deleteApplication(id) {
    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['apps'], 'readwrite');
        const store = transaction.objectStore('apps');
        const request = store.delete(id);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Delete multiple applications
 */
async function deleteApplications(ids) {
    const promises = ids.map(id => deleteApplication(id));
    return Promise.all(promises);
}

/**
 * Get application count by type
 */
async function getApplicationStats() {
    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['apps'], 'readonly');
        const store = transaction.objectStore('apps');
        const request = store.getAll();

        request.onsuccess = () => {
            const apps = request.result;
            const stats = {
                total: apps.length,
                crop: apps.filter(a => (a.InsuranceLine || a.insuranceType) === 'Crop').length,
                adss: apps.filter(a => (a.InsuranceLine || a.insuranceType) === 'ADSS').length,
                livestock: apps.filter(a => (a.InsuranceLine || a.insuranceType) === 'Livestock').length,
                banca: apps.filter(a => (a.InsuranceLine || a.insuranceType) === 'Banca').length,
                pending: apps.filter(a => a.status === 'Pending').length,
                approved: apps.filter(a => a.status === 'Approved').length
            };
            resolve(stats);
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Save calibration data
 */
async function saveCalibration(calibData) {
    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');

        if (!calibData.date) {
            calibData.date = new Date().toISOString();
        }

        const request = store.put(calibData);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get calibration data
 */
async function getCalibrationData(filter = {}) {
    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        const request = store.getAll();

        request.onsuccess = () => {
            let results = request.result;

            if (filter.type) {
                results = results.filter(c => c.type === filter.type);
            }

            results.sort((a, b) => new Date(b.date) - new Date(a.date));
            resolve(results);
        };

        request.onerror = () => reject(request.error);
    });
}

/**
 * Clear all data (for testing/reset)
 */
async function clearAllData() {
    return new Promise((resolve, reject) => {
        const transaction = appDB.transaction(['profiles', 'apps', 'settings'], 'readwrite');

        const promises = [
            transaction.objectStore('profiles').clear(),
            transaction.objectStore('apps').clear(),
            transaction.objectStore('settings').clear()
        ];

        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
    });
}

// Initialize database when script loads
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        initDB().catch(err => {
            console.error('Failed to initialize database:', err);
            alert('Database initialization failed. Some features may not work correctly.');
        });
    });
}
