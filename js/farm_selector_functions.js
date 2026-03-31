function populateFarmDropdown(history) {
    const select = document.getElementById('f_farm_select');
    if (!select) return;

    select.innerHTML = '';

    // Default Option
    const defaultOption = document.createElement('option');
    defaultOption.value = "";
    defaultOption.text = "-- Select Farm from History or Add New --";
    select.appendChild(defaultOption);

    if (history && history.length > 0) {
        history.forEach((rec, index) => {
            const opt = document.createElement('option');
            opt.value = index; // Use index to retrieve from history array
            const farmId = rec.FARMID || rec.FarmID || '';
            const area = rec.AREA ? `${rec.AREA}ha` : '';
            const variety = rec.VARIETY || rec.Variety || rec.CROPTYPE || rec.Crop || '';
            const n = rec.NORTH || '—';
            const s = rec.SOUTH || '—';
            const e = rec.EAST || '—';
            const w = rec.WEST || '—';
            const bounds = `N:${n} S:${s} E:${e} W:${w}`;
            opt.text = [farmId, area, variety, bounds].filter(Boolean).join(' | ');
            select.appendChild(opt);
        });
    }
}

function onFarmSelect(indexVal) {
    // accessing the global history variable
    const history = currentFarmerHistory;

    if (indexVal === "") {
        // CLEAR FARM DETAILS (New Farm Entry)
        document.getElementById('f_north').value = '';
        document.getElementById('f_south').value = '';
        document.getElementById('f_east').value = '';
        document.getElementById('f_west').value = '';
        document.getElementById('f_farm_bgy').value = '';
        document.getElementById('f_farm_mun').value = '';
        document.getElementById('f_farm_prov').value = '';
        document.getElementById('f_farmid').value = '';
        document.getElementById('f_area').value = '';
        document.getElementById('f_georef').value = '';
        document.getElementById('f_farm_name_hidden').value = '';
        document.getElementById('f_st_farm').value = '';
        document.getElementById('f_trees').value = '';

        // Reset calculation
        calculateTotalCover();
        return;
    }

    // If valid index, populate
    const rec = history[indexVal];
    if (rec) {
        document.getElementById('f_north').value = rec.NORTH || '';
        document.getElementById('f_south').value = rec.SOUTH || '';
        document.getElementById('f_east').value = rec.EAST || '';
        document.getElementById('f_west').value = rec.WEST || '';

        document.getElementById('f_farm_bgy').value = rec.BARANGAY || '';
        document.getElementById('f_farm_mun').value = rec.MUNICIPALITY || '';
        document.getElementById('f_farm_prov').value = rec.PROVINCE || '';

        document.getElementById('f_farmid').value = rec.FARMID || rec.FarmID || '';
        document.getElementById('f_area').value = rec.AREA || '';
        document.getElementById('f_georef').value = rec.GEOREFID || '';

        // Extra metadata
        document.getElementById('f_farm_name_hidden').value = rec.FARMNAME || rec.FarmName || '';
        document.getElementById('f_st_farm').value = rec.STREET || '';

        // Trigger calculation for the populated area
        calculateTotalCover();
    }
}
