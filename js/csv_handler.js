/**
 * PCIC CSV Handler
 * Handles CSV export and import for all insurance types
 * Version: 1.0.0
 */

/**
 * Export applications to CSV
 */
async function exportToCSV(insuranceType = 'All', selectedIds = null) {
    try {
        // Get applications
        const filter = insuranceType !== 'All' ? { insuranceType } : {};
        let applications = await getApplications(filter);

        // If specific IDs selected, filter to those
        if (selectedIds && selectedIds.length > 0) {
            applications = applications.filter(app => selectedIds.includes(app.id));
        }

        if (applications.length === 0) {
            alert('No applications to export');
            return;
        }

        // Generate CSV based on type
        let csv = '';
        if (insuranceType === 'All') {
            csv = generateMixedCSV(applications);
        } else {
            csv = generateTypeSpecificCSV(applications, insuranceType);
        }

        // Download CSV
        downloadCSV(csv, `PCIC_${insuranceType}_${new Date().toISOString().split('T')[0]}.csv`);

        return true;
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export CSV: ' + error.message);
        return false;
    }
}

/**
 * Generate CSV for mixed insurance types
 */
function generateMixedCSV(applications) {
    const headers = [
        'Application ID', 'Farmer ID', 'Farmer Name', 'Middle Name',
        'Province', 'Municipality', 'Barangay', 'Contact Number',
        'Insurance Type', 'Policy Number', 'Coverage Amount', 'Premium',
        'Application Date', 'Status', 'Type-Specific Data'
    ];

    let csv = headers.join(',') + '\n';

    applications.forEach(app => {
        const row = [
            escapeCSV(app.id),
            escapeCSV(app.FarmersID || app.farmerId),
            escapeCSV(app.farmerName || (app.FirstName ? `${app.FirstName} ${app.LastName}` : '') || ''),
            escapeCSV(app.MiddlName || app.farmerMiddleName || ''),
            escapeCSV(app.ProvFarmer || app.province || ''),
            escapeCSV(app.MunFarmer || app.municipality || ''),
            escapeCSV(app.BrgyFarmer || app.barangay || ''),
            escapeCSV(app.Mobile || app.contactNumber || ''),
            escapeCSV(app.InsuranceLine || app.insuranceType),
            escapeCSV(app.policyNumber || ''),
            app.AmountCover || app.coverageAmount || 0,
            app.Premium || app.premium || 0,
            formatDate(app.timestamp || app.applicationDate),
            escapeCSV(app.status || 'Pending'),
            escapeCSV(JSON.stringify(getTypeSpecificData(app)))
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

/**
 * Generate type-specific CSV
 */
function generateTypeSpecificCSV(applications, type) {
    switch (type) {
        case 'Crop':
            return generateCropCSV(applications);
        case 'ADSS':
            return generateADSSCSV(applications);
        case 'Livestock':
            return generateLivestockCSV(applications);
        case 'Banca':
            return generateBancaCSV(applications);
        default:
            return generateMixedCSV(applications);
    }
}

/**
 * Generate Crop Insurance CSV
 */
function generateCropCSV(applications) {
    const headers = [
        'Application ID', 'Farmer ID', 'Farmer Name', 'Middle Name',
        'Province', 'Municipality', 'Barangay', 'Contact Number',
        'Policy Number', 'Farm Area (ha)', 'Crop Type', 'Variety',
        'Planting Date', 'Expected Harvest', 'Crop Amount cover', 'Premium',
        'Application Date', 'Status'
    ];

    let csv = headers.join(',') + '\n';

    applications.forEach(app => {
        const cropData = app.cropData || {};
        const row = [
            escapeCSV(app.id),
            escapeCSV(app.FarmersID || app.farmerId),
            escapeCSV(app.farmerName || (app.FirstName ? `${app.FirstName} ${app.LastName}` : '') || ''),
            escapeCSV(app.MiddlName || app.farmerMiddleName || ''),
            escapeCSV(app.ProvFarmer || app.province || ''),
            escapeCSV(app.MunFarmer || app.municipality || ''),
            escapeCSV(app.BrgyFarmer || app.barangay || ''),
            escapeCSV(app.Mobile || app.contactNumber || ''),
            escapeCSV(app.policyNumber || ''),
            app.Area || cropData.farmArea || 0,
            escapeCSV(app.CropType || cropData.cropType || ''),
            escapeCSV(app.Variety || cropData.variety || ''),
            formatDate(app.Planting || cropData.plantingDate),
            formatDate(app.Harvest || cropData.expectedHarvest),
            app.AmountCover || app.coverageAmount || 0,
            app.Premium || app.premium || 0,
            formatDate(app.timestamp || app.applicationDate),
            escapeCSV(app.status || 'Pending')
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

/**
 * Generate ADSS CSV
 */
function generateADSSCSV(applications) {
    const headers = [
        'Application ID', 'Farmer ID', 'Farmer Name', 'Middle Name',
        'Province', 'Municipality', 'Barangay', 'Contact Number',
        'Policy Number', 'Occupation', 'Plan Type', 'ADSS Amount cover',
        'Premium', 'Application Date', 'Status'
    ];

    let csv = headers.join(',') + '\n';

    applications.forEach(app => {
        const adssData = app.adssData || {};
        const row = [
            escapeCSV(app.id),
            escapeCSV(app.FarmersID || app.farmerId),
            escapeCSV(app.farmerName || (app.FirstName ? `${app.FirstName} ${app.LastName}` : '') || ''),
            escapeCSV(app.MiddlName || app.farmerMiddleName || ''),
            escapeCSV(app.ProvFarmer || app.province || ''),
            escapeCSV(app.MunFarmer || app.municipality || ''),
            escapeCSV(app.BrgyFarmer || app.barangay || ''),
            escapeCSV(app.Mobile || app.contactNumber || ''),
            escapeCSV(app.policyNumber || ''),
            escapeCSV(app.Occupation || adssData.occupation || ''),
            escapeCSV(app.PlanType || adssData.planType || 'ADSS'),
            app.AmountCover || app.coverageAmount || 0,
            app.Premium || app.premium || 0,
            formatDate(app.timestamp || app.applicationDate),
            escapeCSV(app.status || 'Pending')
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

/**
 * Generate Livestock CSV
 */
function generateLivestockCSV(applications) {
    const headers = [
        'Application ID', 'Farmer ID', 'Farmer Name', 'Middle Name',
        'Province', 'Municipality', 'Barangay', 'Contact Number',
        'Policy Number', 'Animals (JSON)', 'Livestock Amount cover', 'Premium',
        'Application Date', 'Status'
    ];

    let csv = headers.join(',') + '\n';

    applications.forEach(app => {
        const livestockData = app.livestockData || {};
        const row = [
            escapeCSV(app.id),
            escapeCSV(app.FarmersID || app.farmerId),
            escapeCSV(app.farmerName || (app.FirstName ? `${app.FirstName} ${app.LastName}` : '') || ''),
            escapeCSV(app.MiddlName || app.farmerMiddleName || ''),
            escapeCSV(app.ProvFarmer || app.province || ''),
            escapeCSV(app.MunFarmer || app.municipality || ''),
            escapeCSV(app.BrgyFarmer || app.barangay || ''),
            escapeCSV(app.Mobile || app.contactNumber || ''),
            escapeCSV(app.policyNumber || ''),
            escapeCSV(app.Animals || JSON.stringify(livestockData.animals || [])),
            app.AmountCover || app.coverageAmount || 0,
            app.Premium || app.premium || 0,
            formatDate(app.timestamp || app.applicationDate),
            escapeCSV(app.status || 'Pending')
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

/**
 * Generate Banca CSV
 */
function generateBancaCSV(applications) {
    const headers = [
        'Application ID', 'Farmer ID', 'Farmer Name', 'Middle Name',
        'Province', 'Municipality', 'Barangay', 'Contact Number',
        'Policy Number', 'Vessel Name', 'Vessel Type', 'Gross Tonnage (MT)',
        'GPS Latitude', 'GPS Longitude', 'Banca Amount cover', 'Premium',
        'Application Date', 'Status'
    ];

    let csv = headers.join(',') + '\n';

    applications.forEach(app => {
        const bancaData = app.bancaData || {};
        const row = [
            escapeCSV(app.id),
            escapeCSV(app.FarmersID || app.farmerId),
            escapeCSV(app.farmerName || (app.FirstName ? `${app.FirstName} ${app.LastName}` : '') || ''),
            escapeCSV(app.MiddlName || app.farmerMiddleName || ''),
            escapeCSV(app.ProvFarmer || app.province || ''),
            escapeCSV(app.MunFarmer || app.municipality || ''),
            escapeCSV(app.BrgyFarmer || app.barangay || ''),
            escapeCSV(app.Mobile || app.contactNumber || ''),
            escapeCSV(app.policyNumber || ''),
            escapeCSV(app.VesselName || bancaData.vesselName || ''),
            escapeCSV(app.BoatType || bancaData.vesselType || ''),
            app.GrossTonnage || bancaData.grossTonnage || 0,
            app.gpsLatitude || bancaData.gpsLatitude || '',
            app.gpsLongitude || bancaData.gpsLongitude || '',
            app.AmountCover || app.coverageAmount || 0,
            app.Premium || app.premium || 0,
            formatDate(app.timestamp || app.applicationDate),
            escapeCSV(app.status || 'Pending')
        ];
        csv += row.join(',') + '\n';
    });

    return csv;
}

/**
 * Import CSV file
 */
async function importFromCSV(file, insuranceType) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const csv = e.target.result;
                const results = parseCSV(csv, insuranceType);

                if (results.errors.length > 0) {
                    showImportPreview(results);
                    resolve(results);
                } else {
                    // Auto-import if no errors
                    const imported = await processImport(results.data, insuranceType);
                    alert(`Successfully imported ${imported} records`);
                    resolve({ success: true, count: imported });
                }
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsText(file);
    });
}

/**
 * Parse CSV content
 */
function parseCSV(csv, insuranceType) {
    const lines = csv.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];
    const errors = [];

    for (let i = 1; i < lines.length; i++) {
        try {
            const values = parseCSVLine(lines[i]);
            const record = {};

            headers.forEach((header, index) => {
                record[header] = values[index] || '';
            });

            // Validate record
            const validation = validateImportRecord(record, insuranceType);
            if (validation.valid) {
                data.push(record);
            } else {
                errors.push({ line: i + 1, errors: validation.errors, data: record });
            }
        } catch (error) {
            errors.push({ line: i + 1, errors: [error.message], data: null });
        }
    }

    return { data, errors, headers };
}

/**
 * Parse CSV line (handles quoted fields with commas)
 */
function parseCSVLine(line) {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    values.push(current.trim());
    return values;
}

/**
 * Validate import record
 */
function validateImportRecord(record, insuranceType) {
    const errors = [];

    // Required fields
    if (!record['Farmer ID']) errors.push('Farmer ID is required');
    if (!record['Farmer Name']) errors.push('Farmer Name is required');
    if (!record['Insurance Type'] && insuranceType === 'All') {
        errors.push('Insurance Type is required');
    }

    // Type-specific validation
    const type = record['Insurance Type'] || insuranceType;
    if (type === 'Crop' && !record['Crop Type']) {
        errors.push('Crop Type is required for Crop insurance');
    }
    if (type === 'ADSS' && !record['Occupation']) {
        errors.push('Occupation is required for ADSS');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Process import data
 */
async function processImport(data, insuranceType) {
    let count = 0;

    for (const record of data) {
        try {
            // Convert CSV record to application format
            const appData = convertCSVToApplication(record, insuranceType);
            await saveApplication(appData);
            count++;
        } catch (error) {
            console.error('Failed to import record:', error, record);
        }
    }

    return count;
}

/**
 * Convert CSV record to application object
 */
function convertCSVToApplication(record, insuranceType) {
    const type = record['Insurance Line'] || record['Insurance Type'] || insuranceType;

    const appData = {
        id: record['Application ID'] || generateApplicationId(),
        FarmersID: record['Farmer ID'],
        farmerName: record['Farmer Name'],
        MiddlName: record['Middle Name'],
        ProvFarmer: record['Province'],
        MunFarmer: record['Municipality'],
        BrgyFarmer: record['Barangay'],
        Mobile: record['Contact Number'],
        InsuranceLine: type,
        policyNumber: record['Policy Number'],
        AmountCover: parseFloat(record['ADSS Amount cover']) ||
            parseFloat(record['Livestock Amount cover']) ||
            parseFloat(record['Crop Amount cover']) ||
            parseFloat(record['Banca Amount cover']) ||
            parseFloat(record['Coverage Amount']) ||
            parseFloat(record['Total Coverage']) || 0,
        Premium: parseFloat(record['Premium']) || 0,
        applicationDate: record['Application Date'] || new Date().toISOString(),
        status: record['Status'] || 'Pending'
    };

    // Add type-specific data
    switch (type) {
        case 'Crop':
            appData.CropType = record['Crop Type'];
            appData.Variety = record['Variety'];
            appData.Planting = record['Planting Date'];
            appData.Harvest = record['Expected Harvest'];
            appData.Area = parseFloat(record['Farm Area (ha)']) || 0;
            break;
        case 'ADSS':
            appData.CropType = 'ADSS';
            appData.Occupation = record['Occupation'];
            appData.PlanType = record['Plan Type'];
            break;
        case 'Livestock':
            appData.CropType = 'LIVESTOCK';
            appData.Animals = record['Animals (JSON)'];
            break;
        case 'Banca':
            appData.CropType = 'BANCA';
            appData.VesselName = record['Vessel Name'];
            appData.BoatType = record['Vessel Type'];
            appData.GrossTonnage = parseFloat(record['Gross Tonnage (MT)']) || 0;
            appData.gpsLatitude = record['GPS Latitude'];
            appData.gpsLongitude = record['GPS Longitude'];
            break;
    }

    return appData;
}

/**
 * Helper: Escape CSV field
 */
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

/**
 * Helper: Format date
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().split('T')[0];
}

/**
 * Helper: Get type-specific data
 */
function getTypeSpecificData(app) {
    switch (app.insuranceType) {
        case 'Crop': return app.cropData || {};
        case 'ADSS': return app.adssData || {};
        case 'Livestock': return app.livestockData || {};
        case 'Banca': return app.bancaData || {};
        default: return {};
    }
}

/**
 * Helper: Download CSV file
 */
function downloadCSV(csv, filename) {
    // Add BOM for Excel UTF-8 compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}

/**
 * Helper: Generate application ID
 */
function generateApplicationId() {
    const date = new Date();
    const year = date.getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    return `APP-${year}-${timestamp}`;
}

/**
 * Show import preview dialog
 */
function showImportPreview(results) {
    const modal = document.getElementById('import-preview-modal');
    const tbody = document.getElementById('import-preview-body');
    const errorList = document.getElementById('import-errors');

    // Show valid records
    tbody.innerHTML = '';
    results.data.slice(0, 10).forEach(record => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${escapeHTML(record['Farmer ID'])}</td>
            <td>${escapeHTML(record['Farmer Name'])}</td>
            <td>${escapeHTML(record['Insurance Type'])}</td>
            <td><span class="badge badge-success">Valid</span></td>
        `;
    });

    // Show errors
    errorList.innerHTML = '';
    results.errors.forEach(error => {
        const li = document.createElement('li');
        li.textContent = `Line ${error.line}: ${error.errors.join(', ')}`;
        li.className = 'error-item';
        errorList.appendChild(li);
    });

    document.getElementById('import-valid-count').textContent = results.data.length;
    document.getElementById('import-error-count').textContent = results.errors.length;

    modal.style.display = 'block';
}

/**
 * Helper: Escape HTML
 */
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
