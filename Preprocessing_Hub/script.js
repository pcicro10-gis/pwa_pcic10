/**
 * AgriData Hub - CSV Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const csvInput = document.getElementById('csv-input');
    const dropZone = document.getElementById('drop-zone');
    const dashboard = document.getElementById('dashboard');
    const tableHead = document.getElementById('table-head');
    const tableBody = document.getElementById('table-body');
    const summaryCards = document.getElementById('summary-cards');
    const rowCountBadge = document.getElementById('row-count');
    const tableSearch = document.getElementById('table-search');
    // Central Filter
    const insuranceFilter = document.getElementById('insurance-filter');

    // Filter Containers
    const cropFiltersContainer = document.getElementById('crop-filters-container');
    const livestockFiltersContainer = document.getElementById('livestock-filters-container');
    const bancaFiltersContainer = document.getElementById('banca-filters-container');

    // Crop Filters
    const cropFilter = document.getElementById('crop-filter');
    const dateFromFilter = document.getElementById('date-from-filter');
    const dateToFilter = document.getElementById('date-to-filter');

    // Livestock Filters
    const animalTypeFilter = document.getElementById('animal-type-filter');
    const classificationFilter = document.getElementById('classification-filter');

    // Sort State
    let currentSort = { col: null, dir: 'asc' };

    // Banca Filters
    const boatTypeFilter = document.getElementById('boat-type-filter');
    const boatMaterialFilter = document.getElementById('boat-material-filter');

    const sortFilter = document.getElementById('sort-filter');
    const resetFiltersBtn = document.getElementById('reset-filters-btn');
    const printBtn = document.getElementById('print-btn');
    const clearDataBtn = document.getElementById('clear-data-btn');
    const reportTypeSelector = document.getElementById('report-type-selector');
    const exportSummaryBtn = document.getElementById('export-summary-btn');

    let csvData = [];
    let headers = [];
    let selectedRowIds = [];

    function calculateAge(birthdate) {
        if (!birthdate) return '';
        const birthDate = new Date(birthdate);
        if (isNaN(birthDate.getTime())) return '';
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    // Initialize IDB Storage and check for pending transfers
    loadFromStorage().then(() => {
        const pendingTransfer = localStorage.getItem('pendingCsvTransfer');
        if (pendingTransfer) {
            localStorage.removeItem('pendingCsvTransfer');
            const transferFile = new File([pendingTransfer], "Transfer.csv", { type: "text/csv" });
            handleFiles([transferFile]);
        }
    });

    // Make empty activity table cells editable for UI functionality
    document.querySelectorAll('.hvc-activity-table tbody td:not(:first-child)').forEach(td => {
        if (td.id && td.id.endsWith('-date')) return; // Skip auto-filled date cells
        td.setAttribute('contenteditable', 'true');
        td.style.outline = 'none';
        td.style.cursor = 'text';
    });

    // Drag and Drop Handlers
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    csvInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
    });

    clearDataBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
            clearStorage();
        }
    });

    exportSummaryBtn.addEventListener('click', () => {
        exportSummaryCSV();
    });

    function handleFiles(files) {
        if (!files.length) return;

        const fileList = Array.from(files).filter(file => file.type === 'text/csv' || file.name.endsWith('.csv'));

        if (fileList.length === 0) {
            alert('Please upload valid CSV files.');
            return;
        }

        processFiles(fileList);
    }

    async function processFiles(files) {
        dropZone.classList.remove('hidden');
        dashboard.classList.add('hidden');

        let processedCount = 0;
        let newRecords = [];
        let newHeaders = [];

        // Show progress UI container
        dropZone.innerHTML = `
            <div class="upload-content" style="width: 100%; max-width: 400px; margin: 0 auto;">
                <h3 style="margin-bottom: 15px;">Processing Files...</h3>
                <div style="background: var(--border); border-radius: 8px; height: 20px; width: 100%; overflow: hidden;">
                    <div id="import-progress-bar" style="background: var(--primary); width: 0%; height: 100%; transition: width 0.3s ease;"></div>
                </div>
                <p id="import-progress-text" style="margin-top: 10px; font-size: 0.9em; color: var(--text-muted);">0 / ${files.length} files (0%)</p>
            </div>
        `;
        const progressBar = document.getElementById('import-progress-bar');
        const progressText = document.getElementById('import-progress-text');

        // Calculate starting index based on existing data
        let currentIndex = csvData.length + 1;

        for (const file of files) {
            await new Promise((resolve) => {
                Papa.parse(file, {
                    header: true,
                    dynamicTyping: true,
                    skipEmptyLines: true,
                    complete: function (results) {
                        const rawData = results.data;
                        const rawHeaders = results.meta.fields;

                        if (!headers.length) headers = rawHeaders; // Set headers from first file if empty
                        // Ideally we should check if headers match, but for now we assume they are similar or at least we stick to the first file's structure.

                        // Normalization Logic
                        const normalize = (h) => h.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
                        const headerMap = {};
                        rawHeaders.forEach(h => {
                            const norm = normalize(h);
                            if (norm === 'farmersid') headerMap['FarmersID'] = h;
                            else if (norm === 'farmid') headerMap['FarmID'] = h;
                            else if (norm === 'area') headerMap['Area'] = h;
                            else if (norm === 'amountcover') headerMap['AmountCover'] = h;
                            else if (norm === 'animaltype') headerMap['AnimalType'] = h;
                            else if (norm === 'boattype') headerMap['BoatType'] = h;
                            else if (norm === 'boatmaterial') headerMap['BoatMaterial'] = h;
                            else if (norm === 'insuranceline') headerMap['InsuranceLine'] = h;
                            else if (norm === 'rsbsaid') headerMap['RSBSAID'] = h;
                            else if (norm === 'lastname') headerMap['LastName'] = h;
                            else if (norm === 'firstname') headerMap['FirstName'] = h;
                            else if (norm === 'middlname') headerMap['MiddlName'] = h;
                            else if (norm === 'extname') headerMap['ExtName'] = h;
                            else if (norm === 'munfarmer') headerMap['MunFarmer'] = h;
                            else if (norm === 'brgyfarmer') headerMap['BrgyFarmer'] = h;
                            else if (norm === 'stfarmer') headerMap['StFarmer'] = h;
                            else if (norm === 'provfarm') headerMap['ProvFarm'] = h;
                            else if (norm === 'munfarm') headerMap['MunFarm'] = h;
                            else if (norm === 'brgyfarm') headerMap['BrgyFarm'] = h;
                            else if (norm === 'stfarm') headerMap['StFarm'] = h;
                            else if (norm === 'croptype' || norm === 'sector') headerMap['CropType'] = h;
                            else if (norm === 'animaltype') headerMap['AnimalType'] = h;
                            else if (norm === 'classification') headerMap['Classification'] = h;
                            else if (norm === 'boattype') headerMap['BoatType'] = h;
                            else if (norm === 'boatmaterial') headerMap['BoatMaterial'] = h;
                            else if (norm === 'farmershare') headerMap['FarmerShare'] = h;
                            else if (norm === 'governmentshare') headerMap['GovernmentShare'] = h;
                            else if (norm === 'lender' || norm === 'lendername') headerMap['Lender'] = h;
                            else if (norm === 'groupname' || norm === 'group') headerMap['GroupName'] = h;
                            else if (norm === 'birthday' || norm === 'birthdate') headerMap['Birthdate'] = h;
                            else if (norm === 'relationship' || norm === 'benerelationship') headerMap['BeneRelationship'] = h;
                            else if (norm === 'beneficiary') headerMap['Beneficiary'] = h;
                            else if (norm === 'premium') headerMap['Premium'] = h;
                            else if (norm === 'planting' || norm === 'dateplanted' || norm === 'plantingdate') headerMap['Planting'] = h;
                        });

                        const transformedData = rawData.map(row => {
                            // Clone original row to preserve all background CSV data
                            const newRow = { ...row };

                            // Add Row Number
                            newRow['No.'] = currentIndex++;

                            if (headerMap['FarmersID']) newRow.FarmersID = row[headerMap['FarmersID']];
                            if (headerMap['FarmID']) newRow.FarmID = row[headerMap['FarmID']];
                            else newRow.FarmID = row['FarmID'] || ''; // Fallback

                            if (headerMap['Area']) newRow.Area = row[headerMap['Area']];
                            if (headerMap['AmountCover']) newRow.AmountCover = row[headerMap['AmountCover']];
                            if (headerMap['AnimalType']) newRow.AnimalType = row[headerMap['AnimalType']];
                            if (headerMap['Classification']) newRow.Classification = row[headerMap['Classification']];
                            if (headerMap['BoatType']) newRow.BoatType = row[headerMap['BoatType']];
                            if (headerMap['BoatMaterial']) newRow.BoatMaterial = row[headerMap['BoatMaterial']];
                            if (headerMap['InsuranceLine']) newRow.InsuranceLine = row[headerMap['InsuranceLine']];

                            if (headerMap['RSBSAID']) newRow.RSBSAID = row[headerMap['RSBSAID']];
                            if (headerMap['LastName']) newRow.LastName = row[headerMap['LastName']];
                            if (headerMap['FirstName']) newRow.FirstName = row[headerMap['FirstName']];
                            if (headerMap['MiddlName']) newRow.MiddlName = row[headerMap['MiddlName']];
                            if (headerMap['ExtName']) newRow.ExtName = row[headerMap['ExtName']];
                            if (headerMap['Lender']) newRow.Lender = row[headerMap['Lender']];
                            if (headerMap['GroupName']) newRow.GroupName = row[headerMap['GroupName']];

                            // Concatenate Farmer Name
                            const lName = newRow.LastName || '';
                            const fName = newRow.FirstName || '';
                            const mName = newRow.MiddlName || '';
                            const extName = newRow.ExtName || '';

                            // Build full name: LastName, FirstName MiddlName ExtName
                            let fullName = `${lName}`;
                            if (fullName && (fName || mName || extName)) fullName += ', ';

                            let givenNames = [fName, mName, extName].filter(n => n.trim() !== '').join(' ');
                            fullName += givenNames;

                            newRow['Farmer Name'] = fullName.trim();

                            if (headerMap['MunFarmer']) newRow.MunFarmer = row[headerMap['MunFarmer']];
                            if (headerMap['BrgyFarmer']) newRow.BrgyFarmer = row[headerMap['BrgyFarmer']];
                            if (headerMap['StFarmer']) newRow.StFarmer = row[headerMap['StFarmer']];

                            if (headerMap['ProvFarm']) newRow.ProvFarm = row[headerMap['ProvFarm']];
                            if (headerMap['MunFarm']) newRow.MunFarm = row[headerMap['MunFarm']];
                            if (headerMap['BrgyFarm']) newRow.BrgyFarm = row[headerMap['BrgyFarm']];
                            if (headerMap['StFarm']) newRow.StFarm = row[headerMap['StFarm']];

                            if (headerMap['Birthdate']) newRow.Birthdate = row[headerMap['Birthdate']];
                            if (headerMap['BeneRelationship']) newRow.BeneRelationship = row[headerMap['BeneRelationship']];
                            if (headerMap['Beneficiary']) newRow.Beneficiary = row[headerMap['Beneficiary']];
                            if (headerMap['Premium']) newRow.Premium = row[headerMap['Premium']];
                            if (headerMap['CropType']) newRow.CropType = row[headerMap['CropType']];
                            if (headerMap['FarmerShare']) newRow.FarmerShare = row[headerMap['FarmerShare']];
                            if (headerMap['GovernmentShare']) newRow.GovernmentShare = row[headerMap['GovernmentShare']];
                            if (headerMap['Planting']) newRow.Planting = row[headerMap['Planting']];

                            // Calculate AmountCover based on InsuranceLine
                            const insLine = String(newRow.InsuranceLine || '').toLowerCase();

                            // Amount Cover Logic - Reverted to strict checks as requested
                            if (insLine.includes('crop')) {
                                newRow.AmountCover = row['Crop AmountCover'] || row['AmountCover'] || '';
                            } else if (insLine.includes('livestock')) {
                                newRow.AmountCover = row['Livestock AmountCover'] || row['AmountCover'] || '';
                            } else if (insLine.includes('adss') || insLine.includes('fisheries')) {
                                newRow.AmountCover = row['ADSS AmountCover'] || row['AmountCover'] || '';
                            } else if (insLine.includes('banca')) {
                                newRow.AmountCover = row['Banca AmountCover'] || row['AmountCover'] || '';
                            } else {
                                // Fallback to generic AmountCover if available
                                newRow.AmountCover = row['AmountCover'] || '';
                            }

                            return newRow;
                        });

                        newRecords = [...newRecords, ...transformedData];
                        resolve();
                    },
                    error: function (err) {
                        console.error(`Error parsing ${file.name}:`, err);
                        resolve(); // Continue even if one fails
                    }
                });
            });

            // Update Progress UI After Each File
            processedCount++;
            const percent = Math.round((processedCount / files.length) * 100);
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (progressText) progressText.textContent = `${processedCount} / ${files.length} files (${percent}%)`;
        }

        // Append new records to existing data
        csvData = [...csvData, ...newRecords];

        // Show saving state
        if (progressText) {
            progressText.textContent = `Saving ${newRecords.length} records to local storage...`;
            progressBar.style.width = `100%`;
            progressBar.style.backgroundColor = `var(--accent)`; // Change color to indicate saving phase

            // Allow text to render before heavy IDB block
            await new Promise(r => setTimeout(r, 100));
        }

        // Save to IndexedDB
        await saveToStorage();

        // Restore Dropzone UI
        dropZone.innerHTML = `
            <div class="upload-content">
                <div class="upload-icon">📁</div>
                <h3>Upload CSV File(s)</h3>
                <p>Drag & drop your files here or click to browse</p>
                <input type="file" id="csv-input" accept=".csv" multiple hidden>
                <button class="btn btn-primary" onclick="document.getElementById('csv-input').click()">Select File(s)</button>
            </div>
        `;

        document.getElementById('csv-input').addEventListener('change', (e) => {
            handleFiles(e.target.files);
        });

        initializeDashboard();
    }

    async function saveToStorage() {
        try {
            await idbKeyval.set('agriData_csv', csvData);
            await idbKeyval.set('agriData_headers', headers);
        } catch (err) {
            console.error('Save failed:', err);
            alert('Failed to save data to storage. Quota might be exceeded.');
        }
    }

    async function loadFromStorage() {
        try {
            const storedData = await idbKeyval.get('agriData_csv');
            const storedHeaders = await idbKeyval.get('agriData_headers');

            if (storedData && storedData.length > 0) {
                csvData = storedData.map(row => {
                    if (row['Farmer Name'] === undefined) {
                        const lName = row.LastName || '';
                        const fName = row.FirstName || '';
                        const mName = row.MiddlName || '';
                        const extName = row.ExtName || '';

                        let fullName = `${lName}`;
                        if (fullName && (fName || mName || extName)) fullName += ', ';
                        let givenNames = [fName, mName, extName].filter(n => n.trim() !== '').join(' ');
                        fullName += givenNames;

                        row['Farmer Name'] = fullName.trim();
                    }
                    return row;
                });
                // Ensure Farmer Name is in headers if not present
                headers = storedHeaders || Object.keys(storedData[0]);
                if (!headers.includes('Farmer Name')) headers.push('Farmer Name');
                initializeDashboard();
            }
        } catch (err) {
            console.error('Load failed:', err);
        }
    }

    async function clearStorage() {
        await idbKeyval.clear();
        csvData = [];
        headers = [];
        selectedRowIds = [];
        dashboard.classList.add('hidden');
        dropZone.classList.remove('hidden');
        rowCountBadge.textContent = '0 Rows';
    }

    function initializeDashboard() {
        dashboard.classList.remove('hidden');
        dropZone.classList.add('hidden');

        // Generate Summary
        updateSummary();

        // Initial Filter & Render
        updateDashboard();
    }

    function updateSummary() {
        const totalFarmers = new Set(csvData.map(d => String(d.FarmersID || '').trim()).filter(Boolean)).size;

        // Count unique FarmIDs for Total Farms. Do not count blank FarmIDs.
        const totalFarms = new Set(csvData.map(d => String(d.FarmID || '').trim()).filter(Boolean)).size;

        const sumField = (field) => csvData.reduce((acc, curr) => {
            const val = parseFloat(curr[field]);
            return acc + (isNaN(val) ? 0 : val);
        }, 0);

        const totalArea = sumField('Area');


        const totalLivestock = csvData.filter(d => String(d.InsuranceLine).toLowerCase().includes('livestock')).length;
        const totalBoats = csvData.filter(d => String(d.InsuranceLine).toLowerCase().includes('banca')).length;
        const totalCrops = csvData.filter(d => String(d.InsuranceLine).toLowerCase().includes('crop')).length;
        const totalADSS = csvData.filter(d => String(d.InsuranceLine).toUpperCase().includes('ADSS')).length;

        const metrics = [
            { label: 'Unique Farmers', value: totalFarmers, icon: '👨‍🌾' },
            { label: 'Total Area (Ha)', value: totalArea.toFixed(2), icon: '🗺️' },
            { label: 'Total Crops', value: totalCrops, icon: '🌾' },
            { label: 'Total Livestock', value: totalLivestock, icon: '🐄' },
            { label: 'Total Boats', value: totalBoats, icon: '🚤' },
            { label: 'Total ADSS', value: totalADSS, icon: '📡' }
        ];

        summaryCards.innerHTML = metrics.map(m => `
            <div class="card">
                <div class="card-title">${m.icon} ${m.label}</div>
                <div class="card-value">${m.value}</div>
            </div>
        `).join('');
    }

    function renderTable(data, currentInsuranceFilter = '') {
        if (!headers.length) return;

        // Define exact columns to show based on context.
        let targetColumns = [
            'Checkbox', 'No.', 'FarmersID', 'RSBSAID', 'Farmer Name',
            'MunFarmer', 'BrgyFarmer', 'StFarmer', 'InsuranceLine'
        ];

        // Append context specific columns
        if (currentInsuranceFilter.includes('crop')) {
            targetColumns.push('CropType', 'Planting', 'AmountCover');
        } else if (currentInsuranceFilter.includes('livestock')) {
            targetColumns.push('AnimalType', 'Classification', 'AmountCover');
        } else if (currentInsuranceFilter.includes('banca')) {
            targetColumns.push('BoatType', 'BoatMaterial', 'AmountCover');
        } else {
            // Default fallback
            targetColumns.push('CropType', 'AmountCover');
        }

        // Filter headers to only include available target columns
        // This handles case-insensitive matching to find the actual header name in the CSV
        // For 'Checkbox', we just return it as is.
        const displayHeaders = targetColumns.map(target => {
            if (target === 'Checkbox') return 'Checkbox';
            return headers.find(h => h.toLowerCase().trim() === target.toLowerCase().trim()) || target;
        });

        tableHead.innerHTML = `<tr>${displayHeaders.map((h, colIdx) => {
            if (h === 'Checkbox') {
                return `<th style="width: 40px; text-align: center;"><input type="checkbox" id="select-all"></th>`;
            }
            const extraStyle = h === 'Farmer Name' ? 'style="min-width: 250px; width: 250px;"' : '';
            const isActive = currentSort.col === h;
            const arrow = isActive ? (currentSort.dir === 'asc' ? '▲' : '▼') : '⇅';
            const arrowColor = isActive ? '#ffd600' : 'rgba(255,255,255,0.5)';
            // Use backticks for col name parameter and escape single quotes just in case
            const escapedCol = h.replace(/'/g, "\\'");
            return `<th title="${h}" ${extraStyle} style="cursor:pointer; white-space:nowrap; user-select:none; transition: background 0.2s;" onclick="window._sortPreprocessTable('${escapedCol}')">
                <span style="display:inline-block; margin-right:5px;">${h}</span>
                <span style="font-size:10px; color:${arrowColor};">${arrow}</span>
            </th>`;
        }).join('')}</tr>`;

        if (data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="${displayHeaders.length}" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 2rem; font-weight: bold; font-size: 1.1rem;">No Commodity Insured</td></tr>`;
            return;
        }

        const displayData = data.slice(0, 500);
        tableBody.innerHTML = displayData.map((row, index) => `
            <tr>
                ${displayHeaders.map(h => {
            if (h === 'Checkbox') {
                return `<td style="text-align: center;"><input type="checkbox" class="row-checkbox" data-row-id="${row['No.']}" ${selectedRowIds.includes(String(row['No.'])) ? 'checked' : ''}></td>`;
            }

            let content = row[h] === null || row[h] === undefined ? '' : row[h];

            if (h === 'No.' || h === 'No') {
                content = index + 1;
            }

            // Format AmountCover with commas
            if (h === 'AmountCover' && content !== '') {
                const num = parseFloat(String(content).replace(/,/g, ''));
                if (!isNaN(num)) {
                    content = num.toLocaleString('en-US');
                }
            }

            // Format Dates to MM/DD/YYYY if they look like dates or are known date columns
            const dateColumns = ['Planting', 'Sowing', 'PeriodFrom', 'PeriodTo', 'Birthdate', 'BeneBirthdate', 'Dateofbirth', 'PurchaseDate', 'OR Date'];
            if (dateColumns.some(col => h.toLowerCase().includes(col.toLowerCase())) && content !== '') {
                content = formatDateToMMDDYYYY(content);
            }

            const extraStyle = h === 'Farmer Name' ? 'style="white-space: nowrap; min-width: 250px; width: 250px;"' : '';
            return `<td title="${content}" ${extraStyle}>${content}</td>`;
        }).join('')}
            </tr>
        `).join('');

        if (data.length > 500) {
            const infoRow = document.createElement('tr');
            infoRow.innerHTML = `<td colspan="${displayHeaders.length}" style="text-align: center; color: var(--text-muted); font-style: italic; padding: 2rem;">Showing first 500 rows. Use search to find specific records.</td>`;
            tableBody.appendChild(infoRow);
        }
    }

    // Expose sort trigger globally so inline onclick works inside the closure
    window._sortPreprocessTable = function(col) {
        if (currentSort.col === col) {
            currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
        } else {
            currentSort.col = col;
            currentSort.dir = 'asc';
        }
        if (sortFilter) sortFilter.value = 'default';
        updateDashboard();
    };

    // --- Dynamic Filter Logic ---

    function updateDashboard() {
        const searchTerm = tableSearch.value.toLowerCase();
        const insuranceValue = insuranceFilter.value.toLowerCase();

        // Context specific values
        const cropValue = cropFilter.value.toLowerCase();
        const dateFrom = dateFromFilter.value;
        const dateTo = dateToFilter.value;

        const animalTypeValue = animalTypeFilter.value.toLowerCase();
        const animalClassValue = classificationFilter.value.toLowerCase();

        const boatTypeValue = boatTypeFilter.value.toLowerCase();
        const boatMaterialValue = boatMaterialFilter.value.toLowerCase();

        const sortValue = sortFilter ? sortFilter.value : 'default';

        // Manage UI Visibility of Filter Containers
        cropFiltersContainer.style.display = 'none';
        livestockFiltersContainer.style.display = 'none';
        bancaFiltersContainer.style.display = 'none';

        const isCropSelected = insuranceValue.includes('crop') ||
            ['rice', 'corn', 'hvc', 'palay', 'coconut', 'cacao'].some(c => insuranceValue.includes(c));

        if (isCropSelected) {
            cropFiltersContainer.style.display = 'flex';
        } else if (insuranceValue.includes('livestock')) {
            livestockFiltersContainer.style.display = 'flex';
        } else if (insuranceValue.includes('banca')) {
            bancaFiltersContainer.style.display = 'flex';
        }

        // 1. Calculate Table Data
        let tableData = csvData.filter(row => {
            if (!matchesSearch(row, searchTerm)) return false;
            if (!matchesInsurance(row, insuranceValue)) return false;

            // Context-Specific Filtering
            if (isCropSelected) {
                return matchesCrop(row, cropValue) && matchesDate(row, dateFrom, dateTo);
            }
            else if (insuranceValue.includes('livestock')) {
                return matchesAnimalType(row, animalTypeValue) && matchesClassification(row, animalClassValue);
            }
            else if (insuranceValue.includes('banca')) {
                return matchesBoatType(row, boatTypeValue) && matchesBoatMaterial(row, boatMaterialValue);
            }

            return true; // e.g. for ADSS, only dependent on InsuranceLine
        });

        if (currentSort.col) {
            const col = currentSort.col;
            const dir = currentSort.dir === 'asc' ? 1 : -1;
            tableData.sort((a, b) => {
                let va = a[col] === null || a[col] === undefined ? '' : a[col];
                let vb = b[col] === null || b[col] === undefined ? '' : b[col];

                // 1. Numeric
                const na = parseFloat(String(va).replace(/,/g, ''));
                const nb = parseFloat(String(vb).replace(/,/g, ''));
                if (!isNaN(na) && !isNaN(nb)) return dir * (na - nb);

                // 2. Date
                const da = new Date(va), db = new Date(vb);
                if (!isNaN(da.getTime()) && !isNaN(db.getTime())) return dir * (da - db);

                // 3. String
                return dir * String(va).localeCompare(String(vb), undefined, { sensitivity: 'base' });
            });
        } else if (sortValue === 'lastname') {
            tableData.sort((a, b) => {
                const nameA = String(a['Farmer Name'] || '').toLowerCase();
                const nameB = String(b['Farmer Name'] || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        }

        // 2. Sequential Option Population
        const insuranceAvailableData = csvData.filter(row => matchesSearch(row, searchTerm));
        populateFilterOptions(insuranceFilter, 'InsuranceLine', 'All Insurance Lines', insuranceAvailableData);

        // A. Crop Path
        const cropAvailableData = csvData.filter(row => matchesSearch(row, searchTerm) && matchesInsurance(row, insuranceValue));
        populateFilterOptions(cropFilter, 'CropType', 'All Crop Types', cropAvailableData);

        // B. Livestock Path
        const animalLevelData = csvData.filter(row => matchesSearch(row, searchTerm) && matchesInsurance(row, insuranceValue));
        populateFilterOptions(animalTypeFilter, 'AnimalType', 'All Animal Types', animalLevelData);

        const classLevelData = animalLevelData.filter(row => matchesAnimalType(row, animalTypeValue));
        populateFilterOptions(classificationFilter, 'Classification', 'All Classifications', classLevelData);

        // C. Banca Path
        const boatLevelData = csvData.filter(row => matchesSearch(row, searchTerm) && matchesInsurance(row, insuranceValue));
        populateFilterOptions(boatTypeFilter, 'BoatType', 'All Boat Types', boatLevelData);

        const materialLevelData = boatLevelData.filter(row => matchesBoatType(row, boatTypeValue));
        populateFilterOptions(boatMaterialFilter, 'BoatMaterial', 'All Boat Materials', materialLevelData);


        // Render Table
        renderTable(tableData, insuranceValue);
        window.lastFilteredData = tableData;

        // Update bulk actions bar based on selected rows
        if (typeof updateBulkBar === 'function') {
            updateBulkBar();
        }

        rowCountBadge.textContent = `${tableData.length} Match(es)`;

        // Check if ANY filter is active
        const isSearchActive = searchTerm !== '';
        const isInsuranceActive = insuranceValue !== '' && insuranceValue !== 'all';
        const isDateActive = dateFrom !== '' || dateTo !== '';

        const noFiltersActive = !isSearchActive && !isInsuranceActive && !isDateActive;

        if (noFiltersActive) {
            reportTypeSelector.value = 'none';
        }
    }

    // Helper match functions to avoid repetition
    const matchesSearch = (row, term) => Object.values(row).some(val => String(val).toLowerCase().includes(term));
    const matchesInsurance = (row, val) => {
        if (val === '' || val === 'all') return true;

        const rowInsuranceLine = String(getRowValue(row, 'InsuranceLine')).toLowerCase();

        // Custom logic for broader crop matching
        if (val.includes('crop')) {
            return rowInsuranceLine.includes('crop') ||
                ['rice', 'corn', 'hvc', 'palay', 'coconut', 'cacao'].some(c => rowInsuranceLine.includes(c));
        }

        // Standard exact/includes matching for others (Livestock, Banca, ADSS)
        return rowInsuranceLine.includes(val);
    };

    // New specific matching functions
    const matchesCrop = (row, val) => val === '' || val === 'all' || String(getRowValue(row, 'CropType')).toLowerCase() === val;
    const matchesAnimalType = (row, val) => val === '' || val === 'all' || String(getRowValue(row, 'AnimalType')).toLowerCase() === val;
    const matchesClassification = (row, val) => val === '' || val === 'all' || String(getRowValue(row, 'Classification')).toLowerCase() === val;
    const matchesBoatType = (row, val) => val === '' || val === 'all' || String(getRowValue(row, 'BoatType')).toLowerCase() === val;
    const matchesBoatMaterial = (row, val) => val === '' || val === 'all' || String(getRowValue(row, 'BoatMaterial')).toLowerCase() === val;
    // Helper for case-insensitive and trimmed column access
    const getRowValue = (row, fieldName) => {
        if (!row || !fieldName) return '';
        const lowerField = fieldName.toLowerCase().trim();
        const actualKey = Object.keys(row).find(k => k.toLowerCase().trim() === lowerField);
        return actualKey ? row[actualKey] : '';
    };

    // Helper to parse date string strictly to local 00:00:00
    // Favors MM/DD/YYYY as default if ambiguous, based on user preview observation.
    const parseToLocalTime = (s) => {
        if (!s) return null;
        let str = String(s).trim();
        if (!str) return null;

        // Handle YYYY-MM-DD (from input[type=date])
        let m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
        if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3])).getTime();

        // Handle MM/DD/YYYY or DD/MM/YYYY
        m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
        if (m) {
            let p1 = parseInt(m[1]);
            let p2 = parseInt(m[2]);
            let p3 = parseInt(m[3]);
            if (p3 < 100) p3 += 2000; // 2-digit year

            // Logic: 
            // If p1 > 12, it MUST be DD/MM/YYYY.
            // If p2 > 12, it MUST be MM/DD/YYYY.
            // If both <= 12, we go by user observation: MM/DD/YYYY.
            if (p1 > 12) return new Date(p3, p2 - 1, p1).getTime(); // DD/MM/YYYY
            if (p2 > 12) return new Date(p3, p1 - 1, p2).getTime(); // MM/DD/YYYY

            // DEFAULT to MM/DD/YYYY per user's "preview" observation (failing the DD/MM default)
            return new Date(p3, p1 - 1, p2).getTime();
        }

        const d = new Date(str);
        if (isNaN(d.getTime())) return null;
        // Normalize to local date components to avoid UTC shift
        return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    };

    const formatDateToMMDDYYYY = (s) => {
        const t = parseToLocalTime(s);
        if (!t) return s;
        const d = new Date(t);
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
    };

    const matchesDate = (row, fromDateStr, toDateStr) => {
        if (!fromDateStr && !toDateStr) return true;

        const raw = getRowValue(row, 'Planting');
        const monthVal = String(getRowValue(row, 'Month') || '').toLowerCase().trim();

        const plantingTime = parseToLocalTime(raw);

        // Month fallback if Planting date is missing or unparseable
        if (!plantingTime && monthVal) {
            const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
            const mIndex = months.indexOf(monthVal);
            if (mIndex !== -1) {
                // If no specific date in range, check if the Month name overlaps with the year/month of fromDate/toDate
                if (fromDateStr) {
                    const fExtracted = new Date(parseToLocalTime(fromDateStr));
                    if (fExtracted.getMonth() === mIndex) return true;
                }
                if (toDateStr) {
                    const tExtracted = new Date(parseToLocalTime(toDateStr));
                    if (tExtracted.getMonth() === mIndex) return true;
                }
            }
        }

        if (!plantingTime) return false;

        if (fromDateStr) {
            const fromTime = parseToLocalTime(fromDateStr);
            if (fromTime && plantingTime < fromTime) return false;
        }

        if (toDateStr) {
            const toTime = parseToLocalTime(toDateStr);
            if (toTime && plantingTime > toTime) return false;
        }

        return true;
    };


    // Helper to populate select elements with dynamic data
    function populateFilterOptions(selectElement, fieldName, defaultMetadata, dataSubset) {
        // Get unique values from the SUBSET of data
        const values = new Set(dataSubset.map(d => String(d[fieldName] || '').trim()).filter(l => l));

        // Default alphabetical sort
        const sortedValues = Array.from(values).sort();

        // Save current selection (to try and preserve it)
        const currentSelection = selectElement.value;

        // Reset options
        selectElement.innerHTML = `<option value="all">${defaultMetadata}</option>`;

        sortedValues.forEach(val => {
            const option = document.createElement('option');
            option.value = val.toLowerCase();
            option.textContent = val;
            selectElement.appendChild(option);
        });

        // Try to restore previous selection
        const optionExists = Array.from(selectElement.options).some(opt => opt.value === currentSelection);
        if (optionExists) {
            selectElement.value = currentSelection;
        }
    }

    tableSearch.addEventListener('input', updateDashboard);
    insuranceFilter.addEventListener('change', updateDashboard);

    // Crop events
    cropFilter.addEventListener('change', updateDashboard);
    dateFromFilter.addEventListener('change', updateDashboard);
    dateToFilter.addEventListener('change', updateDashboard);

    // Livestock events
    animalTypeFilter.addEventListener('change', updateDashboard);
    classificationFilter.addEventListener('change', updateDashboard);

    // Banca events
    boatTypeFilter.addEventListener('change', updateDashboard);
    boatMaterialFilter.addEventListener('change', updateDashboard);

    if (sortFilter) {
        sortFilter.addEventListener('change', () => {
            currentSort.col = null;
            updateDashboard();
        });
    }

    // Checkbox Event Delegation for Bulk Actions
    const bulkActionsBar = document.getElementById('bulk-actions-bar');
    const selectedCount = document.getElementById('selected-count');

    function updateBulkBar() {
        if (selectedRowIds.length > 0) {
            bulkActionsBar.classList.remove('hidden');
            selectedCount.textContent = `${selectedRowIds.length} Row${selectedRowIds.length > 1 ? 's' : ''} Selected`;
        } else {
            bulkActionsBar.classList.add('hidden');
        }
    }

    tableHead.addEventListener('change', (e) => {
        if (e.target.id === 'select-all') {
            const isChecked = e.target.checked;
            const rowCheckboxes = document.querySelectorAll('.row-checkbox');
            rowCheckboxes.forEach(cb => {
                cb.checked = isChecked;
                const rowId = String(cb.dataset.rowId);
                if (isChecked) {
                    if (!selectedRowIds.includes(rowId)) selectedRowIds.push(rowId);
                } else {
                    selectedRowIds = selectedRowIds.filter(id => id !== rowId);
                }
            });
            updateBulkBar();
        }
    });

    tableBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox')) {
            const rowId = String(e.target.dataset.rowId);
            if (e.target.checked) {
                if (!selectedRowIds.includes(rowId)) selectedRowIds.push(rowId);
            } else {
                selectedRowIds = selectedRowIds.filter(id => id !== rowId);
            }

            const rowCheckboxes = document.querySelectorAll('.row-checkbox');
            const allChecked = rowCheckboxes.length > 0 && Array.from(rowCheckboxes).every(cb => cb.checked);
            const selectAllCb = document.getElementById('select-all');
            if (selectAllCb) selectAllCb.checked = allChecked;
            updateBulkBar();
        }
    });

    // Reset Filters Button
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            selectedRowIds = [];
            const selectAllCb = document.getElementById('select-all');
            if (selectAllCb) selectAllCb.checked = false;
            updateBulkBar(); // Call updateBulkBar here

            tableSearch.value = '';
            insuranceFilter.value = 'all';
            cropFilter.value = 'all';
            dateFromFilter.value = '';
            dateToFilter.value = '';

            animalTypeFilter.value = 'all';
            classificationFilter.value = 'all';

            boatTypeFilter.value = 'all';
            boatMaterialFilter.value = 'all';

            if (sortFilter) sortFilter.value = 'default';
            updateDashboard();
        });
    }

    // Print Report Button
    if (printBtn) {
        printBtn.addEventListener('click', () => generatePCICReport());
    }

    const printSelectedBtn = document.getElementById('print-selected-btn');
    if (printSelectedBtn) {
        printSelectedBtn.addEventListener('click', () => {
            generatePCICReport(selectedRowIds);
        });
    }

    const deselectAllBtn = document.getElementById('deselect-all-btn');
    if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', () => {
            selectedRowIds = [];
            document.querySelectorAll('.row-checkbox').forEach(cb => cb.checked = false);
            const selectAllCb = document.getElementById('select-all');
            if (selectAllCb) selectAllCb.checked = false;
            updateBulkBar();
        });
    }

    // --- MODAL & PREVIEW LOGIC ---
    const modalPrintBtn = document.getElementById('modal-print-btn');
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const printModal = document.getElementById('print-modal');

    if (modalPrintBtn) {
        modalPrintBtn.addEventListener('click', () => {
            window.print();
        });
    }

    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            if (printModal) printModal.classList.add('hidden');
        });
    }

    if (printModal) {
        printModal.addEventListener('click', (e) => {
            if (e.target === printModal) {
                printModal.classList.add('hidden');
            }
        });
    }

    function generatePCICReport(selectedIds = null) {
        // Helper to populate the new Farmers List tables
        const populateFarmersList = (tbodyId, data, mappingFunc) => {
            const tbody = document.getElementById(tbodyId);
            if (!tbody) return;
            tbody.innerHTML = '';
            data.forEach((row, idx) => {
                const tr = document.createElement('tr');
                tr.innerHTML = mappingFunc(row, idx);
                tbody.appendChild(tr);
            });
        };

        const searchTerm = tableSearch.value.toLowerCase();
        const insuranceValue = insuranceFilter.value.toLowerCase();
        const animalTypeValue = animalTypeFilter ? animalTypeFilter.value.toLowerCase() : 'all';
        const animalClassValue = classificationFilter ? classificationFilter.value.toLowerCase() : 'all';

        const boatTypeValue = boatTypeFilter ? boatTypeFilter.value.toLowerCase() : 'all';
        const boatMaterialValue = boatMaterialFilter ? boatMaterialFilter.value.toLowerCase() : 'all';

        const cropValue = cropFilter ? cropFilter.value.toLowerCase() : 'all';
        const dateFrom = dateFromFilter ? dateFromFilter.value : '';
        const dateTo = dateToFilter ? dateToFilter.value : '';

        const sortValue = sortFilter ? sortFilter.value : 'default';

        const isCropSelected = insuranceValue.includes('crop') ||
            ['rice', 'corn', 'hvc', 'palay', 'coconut', 'cacao'].some(c => insuranceValue.includes(c));

        // Strict Date Range Validation for Crops
        if (isCropSelected && (!dateFrom || !dateTo)) {
            alert('Please select a complete Date of Planting range (From and To) for Crop reports!');
            return;
        }

        let reportData = csvData.filter(row => {
            if (!matchesSearch(row, searchTerm)) return false;
            if (!matchesInsurance(row, insuranceValue)) return false;

            // Context-Specific Filtering
            if (isCropSelected) {
                return matchesCrop(row, cropValue) && matchesDate(row, dateFrom, dateTo);
            }
            else if (insuranceValue.includes('livestock')) {
                return matchesAnimalType(row, animalTypeValue) && matchesClassification(row, animalClassValue);
            }
            else if (insuranceValue.includes('banca')) {
                return matchesBoatType(row, boatTypeValue) && matchesBoatMaterial(row, boatMaterialValue);
            }

            return true;
        });

        if (sortValue === 'lastname') {
            reportData.sort((a, b) => {
                const nameA = String(a['Farmer Name'] || '').toLowerCase();
                const nameB = String(b['Farmer Name'] || '').toLowerCase();
                return nameA.localeCompare(nameB);
            });
        }

        if (selectedIds && selectedIds.length > 0) {
            reportData = reportData.filter(row => selectedIds.includes(String(row['No.'])));
        }

        if (reportData.length === 0) {
            alert('No data to print!');
            return;
        }

        // Calculate Totals using logic similar to updateSummary but on filtered data
        const totalFarmers = new Set(reportData.map(d => String(d.FarmersID || '').trim()).filter(Boolean)).size;

        // Count unique FarmIDs for Total Farms. Do not count blank FarmIDs.
        const farmIds = reportData.map(d => String(d.FarmID || '').trim()).filter(Boolean);
        const totalFarms = new Set(farmIds).size;

        const totalArea = reportData.reduce((acc, curr) => acc + (parseFloat(curr.Area) || 0), 0);

        // Financials (Summing mapped fields)
        const farmerShare = reportData.reduce((acc, curr) => {
            const val = String(curr.FarmerShare || 0).replace(/,/g, '');
            return acc + (parseFloat(val) || 0);
        }, 0);

        const govShare = reportData.reduce((acc, curr) => {
            const val = String(curr.GovernmentShare || 0).replace(/,/g, '');
            return acc + (parseFloat(val) || 0);
        }, 0);

        const totalAmountCover = reportData.reduce((acc, curr) => {
            const val = String(curr.AmountCover || 0).replace(/,/g, '');
            return acc + (parseFloat(val) || 0);
        }, 0);

        const totalGrossPremium = totalAmountCover * 0.10;

        // Populate Template (Values for Inputs)

        // Helper to set value safely to inputs or innerText
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
                    el.value = val;
                } else {
                    el.textContent = val;
                }
            }
        };

        // Handle Report Type Visibility
        const reportType = reportTypeSelector ? reportTypeSelector.value : 'rice-corn';

        if (reportType === 'none') {
            alert('Please select a Preprocessing Slip type first!');
            return;
        }

        const isTIR = reportType === 'tir';
        const isHVC = reportType === 'hvc';
        const isFisheries = reportType === 'fisheries';
        const isLivestock = reportType === 'livestock';
        const isNonCrop = reportType === 'noncrop';
        const ricencornTemplate = document.getElementById('ricencorn-preprocessing-slip');
        const tirTemplate = document.getElementById('tir-report-template');
        const adssTemplate = document.getElementById('adss-slip-template');
        const hvcTemplate = document.getElementById('hvc-preprocessing-slip');
        const fisheriesTemplate = document.getElementById('fisheries-preprocessing-slip');
        const livestockTemplate = document.getElementById('livestock-preprocessing-slip');
        const noncropTemplate = document.getElementById('noncrop-preprocessing-slip');

        // Hide all templates first
        if (ricencornTemplate) ricencornTemplate.classList.add('hidden');
        if (tirTemplate) tirTemplate.classList.add('hidden');
        if (adssTemplate) adssTemplate.classList.add('hidden');
        if (hvcTemplate) hvcTemplate.classList.add('hidden');
        if (fisheriesTemplate) fisheriesTemplate.classList.add('hidden');
        if (livestockTemplate) livestockTemplate.classList.add('hidden');
        if (noncropTemplate) noncropTemplate.classList.add('hidden');

        if (isTIR) {
            if (tirTemplate) tirTemplate.classList.remove('hidden');
            if (adssTemplate) adssTemplate.classList.remove('hidden');

            renderTIRReport(reportData);
            renderADSSReport(reportData);

            if (printModal) printModal.classList.remove('hidden');

        } else if (isHVC) {
            if (hvcTemplate) hvcTemplate.classList.remove('hidden');

            // Auto-populate Farmers Group from CSV
            const hvcFarmersGroup = document.getElementById('hvc-farmers-group');
            if (hvcFarmersGroup && reportData.length > 0) {
                const firstRow = reportData[0];
                hvcFarmersGroup.textContent = firstRow['FarmersGroup'] || firstRow['GroupName'] || '';
            }

            // Auto-populate Date Received
            const hvcDateReceived = document.getElementById('hvc-date-received');
            if (hvcDateReceived) {
                const today = new Date();
                hvcDateReceived.textContent = today.toLocaleDateString('en-US'); // Will show MM/DD/YYYY
            }

            // Auto-populate Crop/Variety
            const hvcCropVariety = document.getElementById('hvc-crop-variety');
            if (hvcCropVariety && reportData.length > 0) {
                const uniqueCropTypes = [...new Set(reportData.map(row => String(row['CropType'] || '')).filter(val => val.trim() !== ''))];
                hvcCropVariety.textContent = uniqueCropTypes.join(' & ');
            }

            // Calculate and populate As Submitted totals
            const uniqueFarmersHvc = new Set(reportData.map(row => String(row['FarmersID'] || '')).filter(val => val.trim() !== ''));
            const totalFarmsHvc = new Set(reportData.map(row => String(row['FarmID'] || '').trim()).filter(Boolean)).size;
            const totalAreaHvc = reportData.reduce((sum, row) => sum + (parseFloat(row['Area']) || 0), 0);

            setVal('hvc-as-sub-farmers', uniqueFarmersHvc.size);
            setVal('hvc-as-sub-farms', totalFarmsHvc);

            // Format Area as a locale string with 2 or 4 decimals based on values, but typically 2 is standard
            const formattedArea = totalAreaHvc.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
            setVal('hvc-as-sub-area', formattedArea);

            // Total Sum Insured (based on 'Crop AmountCover')
            const totalSumInsuredHvc = reportData.reduce((sum, row) => {
                const rawAmount = row['Crop AmountCover'];
                // Clean comma formatted strings if any, then parse
                const amount = parseFloat(String(rawAmount || 0).replace(/,/g, ''));
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
            setVal('hvc-total-sum-insured', totalSumInsuredHvc.toLocaleString('en-US', { minimumFractionDigits: 2 }));

            // Gov't Premium Subsidy (5% of Total Sum Insured)
            const hvcGovSubsidy = totalSumInsuredHvc * 0.05;
            setVal('hvc-gov-subsidy', hvcGovSubsidy.toLocaleString('en-US', { minimumFractionDigits: 2 }));


            // Activity Dates
            const hvcDateReceivedText = new Date().toLocaleDateString('en-US');
            setVal('hvc-act1-date', hvcDateReceivedText);
            setVal('hvc-act2-date', hvcDateReceivedText);

            // Populate HVC Farmers List
            populateFarmersList('hvc-farmers-list-body', reportData, (row, idx) => `
                <td class="col-center">${idx + 1}</td>
                <td>${getRowValue(row, 'Farmer Name') || (getRowValue(row, 'FirstName') + ' ' + getRowValue(row, 'LastName'))}</td>
                <td>${getRowValue(row, 'BrgyFarmer')}, ${getRowValue(row, 'MunFarmer')}</td>
                <td class="col-right">${getRowValue(row, 'Area') || getRowValue(row, 'TreesHills')}</td>
                <td class="col-right">${(parseFloat(String(getRowValue(row, 'AmountCover') || 0).replace(/,/g, '')) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="col-center">${formatDateToMMDDYYYY(getRowValue(row, 'Planting'))}</td>
            `);

            if (printModal) printModal.classList.remove('hidden');

        } else if (isFisheries) {
            if (fisheriesTemplate) fisheriesTemplate.classList.remove('hidden');

            // Auto-populate Farmers Group from CSV for Fisheries
            const fisheriesFarmersGroup = document.getElementById('fisheries-farmers-group');
            if (fisheriesFarmersGroup && reportData.length > 0) {
                const firstRow = reportData[0];
                fisheriesFarmersGroup.textContent = firstRow['FarmersGroup'] || firstRow['GroupName'] || '';
            }

            // Activity Dates for Fisheries
            const fishDateReceivedText = new Date().toLocaleDateString('en-US');
            setVal('fish-act1-date', fishDateReceivedText);
            setVal('fish-act2-date', fishDateReceivedText);

            // Populate Fisheries Farmers List
            populateFarmersList('fisheries-farmers-list-body', reportData, (row, idx) => `
                <td class="col-center">${idx + 1}</td>
                <td>${getRowValue(row, 'Farmer Name') || (getRowValue(row, 'FirstName') + ' ' + getRowValue(row, 'LastName'))}</td>
                <td>${getRowValue(row, 'BrgyFarmer')}, ${getRowValue(row, 'MunFarmer')}</td>
                <td>${getRowValue(row, 'BoatType')}</td>
                <td>${getRowValue(row, 'BoatMaterial')}</td>
                <td class="col-right">${(parseFloat(String(getRowValue(row, 'Banca AmountCover') || getRowValue(row, 'AmountCover') || 0).replace(/,/g, '')) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            `);

            if (printModal) printModal.classList.remove('hidden');

        } else if (isLivestock) {
            if (livestockTemplate) livestockTemplate.classList.remove('hidden');

            // Auto-populate Farmers Group from CSV for Livestock
            const livestockFarmersGroup = document.getElementById('livestock-farmers-group');
            if (livestockFarmersGroup && reportData.length > 0) {
                const firstRow = reportData[0];
                livestockFarmersGroup.textContent = firstRow['FarmersGroup'] || firstRow['GroupName'] || '';
            }

            // Total Sum Insured (based on 'Livestock AmountCover')
            const totalSumInsuredLivestock = reportData.reduce((sum, row) => {
                const rawAmount = row['Livestock AmountCover'];
                // Clean comma formatted strings if any, then parse
                const amount = parseFloat(String(rawAmount || 0).replace(/,/g, ''));
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
            setVal('livestock-total-sum-insured', totalSumInsuredLivestock.toLocaleString('en-US', { minimumFractionDigits: 2 }));

            // Number of Heads (Sum of MalePop and FemalePop per row)
            const totalHeads = reportData.reduce((sum, row) => {
                const male = parseInt(row.MalePop) || 0;
                const female = parseInt(row.FemalePop) || 0;
                return sum + male + female;
            }, 0);
            setVal('livestock-number-of-heads', totalHeads);

            // Number of Unique Farmers
            const uniqueFarmersLivestock = new Set(reportData.map(row => String(row['FarmersID'] || '')).filter(val => val.trim() !== ''));
            setVal('livestock-number-of-farmers', uniqueFarmersLivestock.size);

            // Animals/ Species (Majority CropType + Majority Class)
            const livestockCropCounts = {};
            let livestockMaxCropCount = 0;
            let livestockMajorityCrop = '';

            const livestockClassCounts = {};
            let livestockMaxClassCount = 0;
            let livestockMajorityClass = '';

            reportData.forEach(row => {
                const crop = String(row.CropType || '').trim();
                const cls = String(row.Class || '').trim();

                if (crop) {
                    livestockCropCounts[crop] = (livestockCropCounts[crop] || 0) + 1;
                    if (livestockCropCounts[crop] > livestockMaxCropCount) {
                        livestockMaxCropCount = livestockCropCounts[crop];
                        livestockMajorityCrop = crop;
                    }
                }

                if (cls) {
                    livestockClassCounts[cls] = (livestockClassCounts[cls] || 0) + 1;
                    if (livestockClassCounts[cls] > livestockMaxClassCount) {
                        livestockMaxClassCount = livestockClassCounts[cls];
                        livestockMajorityClass = cls;
                    }
                }
            });

            const speciesDisplay = livestockMajorityCrop && livestockMajorityClass ?
                `${livestockMajorityCrop} (${livestockMajorityClass})` :
                (livestockMajorityCrop || livestockMajorityClass || '');

            const speciesElement = document.getElementById('livestock-animal-species');
            if (speciesElement) speciesElement.textContent = speciesDisplay;

            // Auto-populate Date Received
            const livestockDateReceived = document.getElementById('livestock-date-received');
            const currentFormattedDate = new Date().toLocaleDateString('en-US');
            if (livestockDateReceived) {
                livestockDateReceived.textContent = currentFormattedDate;
            }

            // Activity Dates
            setVal('livestock-act1-date', currentFormattedDate);
            setVal('livestock-act2-date', currentFormattedDate);

            // Populate Livestock Farmers List
            populateFarmersList('livestock-farmers-list-body', reportData, (row, idx) => {
                const male = parseInt(getRowValue(row, 'MalePop')) || 0;
                const female = parseInt(getRowValue(row, 'FemalePop')) || 0;
                const heads = male + female;
                const si = (parseFloat(String(getRowValue(row, 'Livestock AmountCover') || getRowValue(row, 'AmountCover') || 0).replace(/,/g, '')) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
                const fullName = getRowValue(row, 'Farmer Name') ||
                    ((getRowValue(row, 'LastName') + ', ' + getRowValue(row, 'FirstName') + ' ' + (getRowValue(row, 'MiddlName') || '')).trim());
                return `
                <td class="col-center">${idx + 1}</td>
                <td>${fullName}</td>
                <td>${getRowValue(row, 'BrgyFarmer')}, ${getRowValue(row, 'MunFarmer')}</td>
                <td>${getRowValue(row, 'AnimalType') || getRowValue(row, 'CropType')}</td>
                <td>${getRowValue(row, 'Classification') || getRowValue(row, 'Class')}</td>
                <td class="col-center">${heads}</td>
                <td class="col-right">${si}</td>
                `;
            });

            if (printModal) printModal.classList.remove('hidden');

        } else if (isNonCrop) {
            if (noncropTemplate) noncropTemplate.classList.remove('hidden');

            // Auto-populate Farmers Group from CSV for Non-Crop
            const noncropFarmersGroup = document.getElementById('noncrop-farmers-group');
            if (noncropFarmersGroup && reportData.length > 0) {
                const firstRow = reportData[0];
                noncropFarmersGroup.textContent = firstRow['FarmersGroup'] || firstRow['GroupName'] || '';
            }

            // Total Sum Insured (based on 'Banca AmountCover')
            const totalSumInsuredNonCrop = reportData.reduce((sum, row) => {
                const rawAmount = row['Banca AmountCover'];
                // Clean comma formatted strings if any, then parse
                const amount = parseFloat(String(rawAmount || 0).replace(/,/g, ''));
                return sum + (isNaN(amount) ? 0 : amount);
            }, 0);
            setVal('noncrop-total-sum-insured', totalSumInsuredNonCrop.toLocaleString('en-US', { minimumFractionDigits: 2 }));

            // Number of Unique Farmers
            const uniqueFarmersNonCrop = new Set(reportData.map(row => String(row['FarmersID'] || '')).filter(val => val.trim() !== ''));
            setVal('noncrop-number-of-farmers', uniqueFarmersNonCrop.size);

            // Number of Units (total rows shown in the slip)
            setVal('noncrop-number-of-units', reportData.length);

            // NCAAI Unit (Majority CropType + Majority Class)
            const noncropCropCounts = {};
            let noncropMaxCropCount = 0;
            let noncropMajorityCrop = '';

            const noncropClassCounts = {};
            let noncropMaxClassCount = 0;
            let noncropMajorityClass = '';

            reportData.forEach(row => {
                const crop = String(row.CropType || '').trim();
                const cls = String(row.Class || '').trim();

                if (crop) {
                    noncropCropCounts[crop] = (noncropCropCounts[crop] || 0) + 1;
                    if (noncropCropCounts[crop] > noncropMaxCropCount) {
                        noncropMaxCropCount = noncropCropCounts[crop];
                        noncropMajorityCrop = crop;
                    }
                }

                if (cls) {
                    noncropClassCounts[cls] = (noncropClassCounts[cls] || 0) + 1;
                    if (noncropClassCounts[cls] > noncropMaxClassCount) {
                        noncropMaxClassCount = noncropClassCounts[cls];
                        noncropMajorityClass = cls;
                    }
                }
            });

            const noncropSpeciesDisplay = noncropMajorityCrop && noncropMajorityClass ?
                `${noncropMajorityCrop} (${noncropMajorityClass})` :
                (noncropMajorityCrop || noncropMajorityClass || '');

            const noncropSpeciesElement = document.getElementById('noncrop-ncaai-unit');
            if (noncropSpeciesElement) noncropSpeciesElement.textContent = noncropSpeciesDisplay;

            // Auto-populate Date Received
            const noncropDateReceived = document.getElementById('noncrop-date-received');
            const currentFormattedDate = new Date().toLocaleDateString('en-US');
            if (noncropDateReceived) {
                noncropDateReceived.textContent = currentFormattedDate; // Will show MM/DD/YYYY
            }

            // Activity Dates
            setVal('noncrop-act1-date', currentFormattedDate);
            setVal('noncrop-act2-date', currentFormattedDate);

            // Populate Fisheries/Non-Crop Farmers List
            populateFarmersList('noncrop-farmers-list-body', reportData, (row, idx) => `
                <td class="col-center">${idx + 1}</td>
                <td>${getRowValue(row, 'Farmer Name') || (getRowValue(row, 'FirstName') + ' ' + getRowValue(row, 'LastName'))}</td>
                <td>${getRowValue(row, 'BrgyFarmer')}, ${getRowValue(row, 'MunFarmer')}</td>
                <td>${getRowValue(row, 'BoatType')}</td>
                <td>${getRowValue(row, 'BoatMaterial')}</td>
                <td class="col-right">${(parseFloat(String(getRowValue(row, 'Banca AmountCover') || getRowValue(row, 'AmountCover') || 0).replace(/,/g, '')) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
            `);

            if (printModal) printModal.classList.remove('hidden');

        } else {
            if (ricencornTemplate) ricencornTemplate.classList.remove('hidden');

            // Populate Rice/Corn Template
            setVal('print-date-received', new Date().toLocaleDateString());

            // Rice/Corn Check Logic (Put '✔' centered on the line)
            // Use reportData to infer crop if insuranceValue is generic 'crop'
            let isRice = insuranceValue.includes('rice');
            let isCorn = insuranceValue.includes('corn');

            // If it's generic 'crop', detect from the data
            if (!isRice && !isCorn) {
                const crops = reportData.map(r => String(r.CropType || '').toLowerCase());
                const riceCount = crops.filter(c => c.includes('rice') || c.includes('palay')).length;
                const cornCount = crops.filter(c => c.includes('corn')).length;

                if (riceCount > cornCount) isRice = true;
                else if (cornCount > 0) isCorn = true;
            }

            const riceLine = document.getElementById('print-rice-line');
            const cornLine = document.getElementById('print-corn-line');

            // Reset check logic and ensure visual center alignment
            if (riceLine) {
                riceLine.value = isRice ? '✔' : '';
                riceLine.style.textAlign = 'center';
            }
            if (cornLine) {
                cornLine.value = isCorn ? '✔' : '';
                cornLine.style.textAlign = 'center';
            }

            // Clear/Reset Placeholders
            const fieldsToClear = [
                'print-logbook-no', 'print-phase', 'print-lender-name', 'print-group-name',
                'print-cic-no', 'print-cic-date', 'print-expiry', 'print-li-share',
                'print-or-no', 'print-or-amount', 'print-note',
                'print-farmer-li', 'print-service-fee', 'print-net-remittance',
                'print-over-under', 'print-or-date'
            ];

            fieldsToClear.forEach(id => setVal(id, ''));

            // Map Totals
            setVal('print-total-farmers', totalFarmers);
            setVal('print-total-farms', totalFarms);
            setVal('print-total-area', totalArea.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

            // Financials
            setVal('print-farmer-share', farmerShare.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            setVal('print-gov-share', govShare.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            setVal('print-total-amount-cover', totalAmountCover.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
            setVal('print-gross-premium', totalGrossPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

            // Populate Rice/Corn Farmers List
            populateFarmersList('ricencorn-farmers-list-body', reportData, (row, idx) => `
                <td class="col-center">${idx + 1}</td>
                <td>${getRowValue(row, 'Farmer Name') || (getRowValue(row, 'FirstName') + ' ' + getRowValue(row, 'LastName'))}</td>
                <td>${getRowValue(row, 'BrgyFarmer')}, ${getRowValue(row, 'MunFarmer')}</td>
                <td class="col-right">${getRowValue(row, 'Area')}</td>
                <td class="col-right">${(parseFloat(String(getRowValue(row, 'AmountCover') || 0).replace(/,/g, '')) || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                <td class="col-center">${formatDateToMMDDYYYY(getRowValue(row, 'Planting'))}</td>
            `);
        }

        // Show Modal
        if (printModal && !isTIR && !isHVC && !isFisheries && !isLivestock && !isNonCrop) {
            printModal.classList.remove('hidden');
        }
    }

    function renderTIRReport(reportData) {
        const tirTableBody = document.getElementById('tir-table-body');
        const tirTotalCover = document.getElementById('tir-total-cover');
        const tirTotalPremium = document.getElementById('tir-total-premium');
        const tirAddress = document.getElementById('tir-address');
        const tirDate = document.getElementById('tir-date');
        const tirGrossIncome = document.getElementById('tir-gross-income');
        const tirNetPremium = document.getElementById('tir-net-premium');

        // Clear existing rows
        if (tirTableBody) {
            tirTableBody.innerHTML = '';
        }

        const currentDate = new Date();
        const nextYearDate = new Date();
        nextYearDate.setFullYear(currentDate.getFullYear() + 1);

        const formatDate = (date) => {
            return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
        };

        const headerDateStr = formatDate(currentDate);
        const expiryDateStr = formatDate(nextYearDate);

        if (tirDate) tirDate.textContent = headerDateStr;

        // Extract address from first row if available (MunFarmer for header)
        if (tirAddress && reportData.length > 0) {
            const row = reportData[0];
            const address = row.MunFarmer || '';
            tirAddress.value = address;
        }

        let totalCover = 0;
        let totalPremium = 0;

        reportData.forEach((row, index) => {
            const name = row['Farmer Name'] || '';
            const address = [row.StFarmer, row.BrgyFarmer].filter(Boolean).join(', ');

            // Period of Cover (Automated: From = Today, To = 1 Year Later)
            const periodFrom = headerDateStr;
            const periodTo = expiryDateStr;

            // Age, Beneficiary, Birthday, Relationship (Placeholder if not in CSV)
            const birthday = row['Birthdate'] || '';
            const age = calculateAge(birthday);
            const beneficiary = row['Beneficiary'] || '';
            const relationship = row['BeneRelationship'] || '';

            let coverStr = String(row.AmountCover || 0).replace(/,/g, '');
            let coverNum = parseFloat(coverStr) || 0;

            let premiumNum = 0;
            if (row.Premium !== undefined && row.Premium !== null && row.Premium !== '') {
                premiumNum = parseFloat(String(row.Premium).replace(/,/g, '')) || 0;
            }

            totalCover += coverNum;
            totalPremium += premiumNum;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="col-num">${index + 1}</td>
                <td>${name}</td>
                <td>${address}</td>
                <td style="text-align: center;">${birthday}</td>
                <td style="text-align: center;">${age}</td>
                <td>${beneficiary}</td>
                <td style="text-align: center;">${relationship}</td>
                <td style="text-align:right;">${coverNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td style="text-align: center;">${periodFrom}</td>
                <td style="text-align: center;">${periodTo}</td>
                <td style="text-align:right;">${premiumNum > 0 ? premiumNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''}</td>
            `;
            tirTableBody.appendChild(tr);
        });

        if (tirTotalCover) tirTotalCover.textContent = totalCover > 0 ? totalCover.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        if (tirTotalPremium) tirTotalPremium.textContent = totalPremium > 0 ? totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';

        // Populate Summary of Premium Remittance
        if (tirGrossIncome) tirGrossIncome.textContent = totalPremium > 0 ? totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        if (tirNetPremium) tirNetPremium.textContent = totalPremium > 0 ? totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
    }

    function renderADSSReport(reportData) {
        if (reportData.length === 0) return;

        // Helper to set value safely
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };

        const totalFarmers = reportData.length;
        const totalSumInsured = reportData.reduce((acc, curr) => acc + (parseFloat(String(curr.AmountCover || 0).replace(/,/g, '')) || 0), 0);
        const totalPremium = reportData.reduce((acc, curr) => acc + (parseFloat(String(curr.Premium || 0).replace(/,/g, '')) || 0), 0);

        // Dates
        const today = new Date();
        const expiry = new Date();
        expiry.setFullYear(today.getFullYear() + 1);

        const formatDate = (date) => `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;

        // Populate Fields
        setVal('adss-date-received', formatDate(today));
        setVal('adss-agent-name', reportData[0].Lender || ''); // Mapping Lender to Agent as per usual practice
        setVal('adss-group-name', reportData[0].GroupName || '');
        setVal('adss-total-insured', totalFarmers);
        setVal('adss-total-sum', totalSumInsured.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setVal('adss-gross-premium', totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setVal('adss-net-premium', totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setVal('adss-remitted', totalPremium.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setVal('adss-effectivity', formatDate(today));
        setVal('adss-expiry', formatDate(expiry));
    }


    function exportSummaryCSV() {
        const insuranceValue = insuranceFilter.value.toLowerCase();
        const reportType = reportTypeSelector.value;

        if (reportType === 'none' || insuranceValue === 'all') {
            alert('Please select an Insurance Line and Preprocessing Slip type first!');
            return;
        }

        if (selectedRowIds.length === 0) {
            alert('Please select farmers in the table first before exporting!');
            return;
        }

        // Filter data based ONLY on selectedRowIds
        const filteredData = csvData.filter(row => selectedRowIds.includes(String(row['No.'])));

        if (filteredData.length === 0) {
            alert('No data to export!');
            return;
        }

        // Define headers for each summary type
        const summaryHeaders = {
            'rice-corn': 'FarmersID,RSBSAID,LastName,FirstName,MiddlName,ExtName,Birthdate,Sex,CivilStatus,ProvFarmer,MunFarmer,BrgyFarmer,StFarmer,Mobile,Spouse,Sector,Beneficiary,BeneRelationship,BeneBirthdate,PaymentMethod,Account,InsuranceLine,FarmID,Georef,FarmName,ProvFarm,MunFarm,BrgyFarm,StFarm,North,South,East,West,Area,CropType,Month,Variety,TypePlanting,Sowing,Planting,Crop AmountCover,TreesHills,timestamp',
            'hvc': 'FarmersID,RSBSAID,LastName,FirstName,MiddlName,ExtName,Birthdate,Sex,CivilStatus,ProvFarmer,MunFarmer,BrgyFarmer,StFarmer,Mobile,Spouse,Sector,Beneficiary,BeneRelationship,BeneBirthdate,PaymentMethod,Account,InsuranceLine,FarmID,Georef,FarmName,ProvFarm,MunFarm,BrgyFarm,StFarm,North,South,East,West,Area,CropType,Month,Variety,TypePlanting,Sowing,Planting,Crop AmountCover,TreesHills,timestamp',
            'tir': 'FarmersID,RSBSAID,LastName,FirstName,MiddlName,ExtName,Birthdate,Sex,CivilStatus,ProvFarmer,MunFarmer,BrgyFarmer,StFarmer,Mobile,Spouse,Sector,Beneficiary,BeneRelationship,BeneBirthdate,PaymentMethod,Account,InsuranceLine,Guardian,GuardianRelationship,GuardianBirthdate,BeneSecondary,BeneSecondaryRel,BeneSecondaryBday,Premium,ADSS AmountCover,timestamp',
            'livestock': 'FarmersID,RSBSAID,LastName,FirstName,MiddlName,ExtName,Birthdate,Sex,CivilStatus,ProvFarmer,MunFarmer,BrgyFarmer,StFarmer,Mobile,Spouse,Sector,Beneficiary,BeneRelationship,BeneBirthdate,PaymentMethod,Account,InsuranceLine,Livestock_Street_Sitio,Livestock_Barangay,Livestock_Municipality,Livestock_Province,AnimalType,Classification,Eartag,MalePop,FemalePop,Age,Dateofbirth,Breed,Color,Price,TotalBirdsPop,PurchaseDate,Livestock AmountCover,PeriodFrom,PeriodTo,timestamp',
            'fisheries': 'FarmersID,RSBSAID,LastName,FirstName,MiddlName,ExtName,Birthdate,Sex,CivilStatus,ProvFarmer,MunFarmer,BrgyFarmer,StFarmer,Mobile,Spouse,Sector,Beneficiary,BeneRelationship,BeneBirthdate,PaymentMethod,Account,InsuranceLine,BoatType,BoatMaterial,HullNo,ChassisNo,Usage,Banca Color,BoatAge,Others,Height,Banca_Width,Banca_Length,BoatLocation,Banca AmountCover,timestamp',
            'noncrop': 'FarmersID,RSBSAID,LastName,FirstName,MiddlName,ExtName,Birthdate,Sex,CivilStatus,ProvFarmer,MunFarmer,BrgyFarmer,StFarmer,Mobile,Spouse,Sector,Beneficiary,BeneRelationship,BeneBirthdate,PaymentMethod,Account,InsuranceLine,BoatType,BoatMaterial,HullNo,ChassisNo,Usage,Banca Color,BoatAge,Others,Height,Banca_Width,Banca_Length,BoatLocation,Banca AmountCover,timestamp'
        };

        const currentHeaderString = summaryHeaders[reportType] || summaryHeaders['rice-corn'];
        const currentHeaders = currentHeaderString.split(',');

        // Map data to headers
        const csvRows = filteredData.map(row => {
            return currentHeaders.map(header => {
                let cellValue = row[header] !== undefined ? row[header] : '';

                // Handle special cases or alternative header names if needed
                if (cellValue === '' || cellValue === undefined) {
                    // Try case-insensitive search if direct lookup fails
                    const actualKey = Object.keys(row).find(k => k.toLowerCase().trim() === header.toLowerCase().trim());
                    if (actualKey) cellValue = row[actualKey];
                }

                // Auto-populate "Month" based on "Planting" if currently empty
                if (header.toLowerCase() === 'month' && (cellValue === '' || cellValue === undefined)) {
                    const plantingVal = row['Planting'] || row['planting'] || '';
                    if (plantingVal) {
                        const t = parseToLocalTime(plantingVal);
                        if (t) {
                            const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
                            cellValue = months[new Date(t).getMonth()];
                        }
                    }
                }

                // Format Dates for CSV Export
                const dateColumns = ['Planting', 'Sowing', 'PeriodFrom', 'PeriodTo', 'Birthdate', 'BeneBirthdate', 'Dateofbirth', 'PurchaseDate', 'timestamp'];
                if (dateColumns.some(col => header.toLowerCase().includes(col.toLowerCase())) && cellValue !== '') {
                    cellValue = formatDateToMMDDYYYY(cellValue);
                }

                // Escape commas and wrap in quotes
                const escaped = String(cellValue).replace(/"/g, '""');
                return `"${escaped}"`;
            }).join(',');
        });

        const csvContent = [currentHeaders.join(','), ...csvRows].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        const fileName = `${reportType}_summary_${new Date().toISOString().slice(0, 10)}.csv`;
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // --- BUNDLE VAULT LOGIC ---
    const saveBundleBtn = document.getElementById('save-bundle-btn');
    const openVaultBtn = document.getElementById('open-vault-btn');
    const vaultModal = document.getElementById('bundles-vault-modal');
    const progModal = document.getElementById('bundle-progress-modal');
    const progText = document.getElementById('bundle-progress-text');
    const progBar = document.getElementById('bundle-progress-bar');
    const closeVaultBtn = document.getElementById('close-bundles-modal');
    const bundlesTbody = document.getElementById('bundles-tbody');

    if (saveBundleBtn) saveBundleBtn.addEventListener('click', async () => {
        if (!window.lastFilteredData || window.lastFilteredData.length === 0) {
            alert("No farmers filtered to bundle."); return;
        }

        // 1. Show Progress
        progModal.style.display = 'flex';
        progText.innerText = 'Requesting PDFs from Main App...';
        progBar.style.width = '10%';

        // 2. Request PDFs
        const pdfs = await requestPDFsFromMainApp(window.lastFilteredData);
        if (!pdfs || pdfs.length === 0) {
            progModal.style.display = 'none';
            alert("Failed to generate PDFs. Bridge might be disconnected.");
            return;
        }

        progText.innerText = 'Compressing Bundle...';
        progBar.style.width = '60%';

        // 3. Zip it Setup
        const zip = new JSZip();
        
        // Add PDFs
        pdfs.forEach((pdfObj) => {
            zip.file(pdfObj.name, pdfObj.blob);
        });

        // Add CSV
        const csvContent = Papa.unparse(window.lastFilteredData);
        zip.file("Filtered_Farmers_List.csv", csvContent);
        
        // Add Preprocessing Report PDF
        const reportElement = document.querySelector('.modal-body');
        if (reportElement) {
            progText.innerText = 'Rendering Report PDF...';
            
            // Check orientation based on report type
            const reportTypeSelector = document.getElementById('report-type-selector');
            const isLandscape = reportTypeSelector && reportTypeSelector.value === 'rice-corn';
            const pdfOrientation = isLandscape ? 'landscape' : 'portrait';
            const winWidth = isLandscape ? 1122 : 794;

            try {
                // Temporarily force max-width to none so html2canvas doesn't truncate based on responsive CSS
                const originalMaxWidth = reportElement.style.maxWidth;
                reportElement.style.maxWidth = 'none';

                const pdfBlob = await html2pdf().from(document.body).set({
                    margin: [10, 5, 10, 5],
                    filename: 'Preprocessing_Report.pdf',
                    image: { type: 'jpeg', quality: 1.0 },
                    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
                    html2canvas: { 
                        scale: 2,
                        windowWidth: winWidth,
                        useCORS: true,
                        onclone: function(clonedDoc) {
                            // Hide everything except the modal body
                            clonedDoc.querySelector('.app-container').style.display = 'none';
                            clonedDoc.querySelector('.modal-actions').style.display = 'none';
                            
                            // Re-enforce the modal layout
                            const printModal = clonedDoc.getElementById('print-modal');
                            printModal.style.position = 'static';
                            printModal.style.width = '100%';
                            printModal.style.background = 'white';
                            printModal.classList.remove('hidden');

                            // Find and extract `@media print` CSS and inject it as standard CSS inside the clone
                            let printStyles = '';
                            for (let i = 0; i < document.styleSheets.length; i++) {
                                try {
                                    const rules = document.styleSheets[i].cssRules;
                                    for (let j = 0; j < rules.length; j++) {
                                        if (rules[j].conditionText === 'print') {
                                            for (let k = 0; k < rules[j].cssRules.length; k++) {
                                                printStyles += rules[j].cssRules[k].cssText + '\\n';
                                            }
                                        }
                                    }
                                } catch(e) { /* CORS cross-domain stylesheet exception handler */ }
                            }
                            const styleTag = clonedDoc.createElement('style');
                            styleTag.innerHTML = printStyles;
                            clonedDoc.head.appendChild(styleTag);
                        }
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: pdfOrientation }
                }).output('blob');
                
                reportElement.style.maxWidth = originalMaxWidth;
                
                zip.file("Preprocessing_Report.pdf", pdfBlob);
            } catch (e) {
                console.error("HTML2PDF Error:", e);
                // Fallback to HTML if generation completely fails
                zip.file("Preprocessing_Report.html", reportElement.innerHTML);
            }
        }

        progBar.style.width = '90%';
        progText.innerText = 'Saving to Offline Vault...';

        // 4. Zip compilation
        const zipBlob = await zip.generateAsync({type:"blob"});

        // 5. Store to IDB
        let bundles = await idbKeyval.get('agriData_bundles') || [];
        const defaultName = "Bundle_" + new Date().toISOString().slice(0, 10).replace(/-/g,'');
        
        // Ensure UI doesn't block if prompt is backgrounded
        setTimeout(async () => {
            const bundleName = prompt("Enter a name for this Bundle:", defaultName);
            if (!bundleName) {
                progModal.style.display = 'none';
                return; // Cancelled
            }

            bundles.push({
                id: "bundle_" + Date.now(),
                timestamp: Date.now(),
                name: bundleName,
                farmerCount: window.lastFilteredData.length,
                sizeBytes: zipBlob.size,
                zipBlob: zipBlob
            });

            await idbKeyval.set('agriData_bundles', bundles);

            progBar.style.width = '100%';
            setTimeout(() => {
                progModal.style.display = 'none';
                alert("Bundle saved successfully to the Offline Vault!");
            }, 300);
        }, 100);
    });

    function requestPDFsFromMainApp(farmersData) {
        return new Promise((resolve) => {
            const listener = (event) => {
                if (event.data && event.data.action === 'BUNDLE_PDFS_READY') {
                    window.removeEventListener('message', listener);
                    resolve(event.data.pdfs);
                }
            };
            window.addEventListener('message', listener);
            window.parent.postMessage({
                action: 'GENERATE_PWA_BUNDLE',
                farmersData: farmersData
            }, '*');
        });
    }

    if (openVaultBtn) openVaultBtn.addEventListener('click', async () => {
        vaultModal.style.display = 'block';
        let bundles = await idbKeyval.get('agriData_bundles') || [];
        
        bundlesTbody.innerHTML = '';
        if (bundles.length === 0) {
            bundlesTbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">No bundles found.</td></tr>';
            return;
        }

        bundles.sort((a,b) => b.timestamp - a.timestamp).forEach(b => {
            const tr = document.createElement('tr');
            const dateStr = new Date(b.timestamp).toLocaleString();
            const sizeMB = (b.sizeBytes / 1024 / 1024).toFixed(2) + ' MB';
            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${b.name}</strong></td>
                <td>${b.farmerCount}</td>
                <td>${sizeMB}</td>
                <td>
                    <button class="btn btn-primary btn-sm dl-btn" data-id="${b.id}" style="padding:4px 8px; font-size:12px;">Download</button>
                    <button class="btn btn-danger btn-sm del-btn" data-id="${b.id}" style="padding:4px 8px; font-size:12px; margin-left:5px;">Delete</button>
                </td>
            `;
            bundlesTbody.appendChild(tr);
        });

        // Attach listeners
        document.querySelectorAll('.dl-btn').forEach(btn => btn.addEventListener('click', (e) => downloadBundle(e.target.dataset.id)));
        document.querySelectorAll('.del-btn').forEach(btn => btn.addEventListener('click', (e) => deleteBundle(e.target.dataset.id)));
    });

    if (closeVaultBtn) closeVaultBtn.addEventListener('click', () => {
        vaultModal.style.display = 'none';
    });

    async function downloadBundle(id) {
        let bundles = await idbKeyval.get('agriData_bundles') || [];
        const bundle = bundles.find(b => b.id === id);
        if(!bundle) return;

        const url = URL.createObjectURL(bundle.zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = bundle.name + ".zip";
        a.click();
        URL.revokeObjectURL(url);
    }

    async function deleteBundle(id) {
        if(!confirm("Are you sure you want to permanently delete this bundle?")) return;
        let bundles = await idbKeyval.get('agriData_bundles') || [];
        bundles = bundles.filter(b => b.id !== id);
        await idbKeyval.set('agriData_bundles', bundles);
        openVaultBtn.click(); // refresh modal
    }

});
