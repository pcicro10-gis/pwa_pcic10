import os
import csv
import json

def build_address_data():
    # Adjusted for root execution
    base_dir = "."
    input_dir = os.path.join(base_dir, "asset", "AOI_LIST", "csv")
    output_file = os.path.join(base_dir, "js", "address_data.js")
    
    ADDRESS_DATA = {}
    
    # 1. Iterate through every CSV file in the directory
    if not os.path.exists(input_dir):
        print(f"Error: Input directory {input_dir} not found.")
        return

    for filename in os.listdir(input_dir):
        if filename.endswith(".csv"):
            filepath = os.path.join(input_dir, filename)
            with open(filepath, mode="r", encoding="latin-1") as f:
                reader = csv.DictReader(f)
                
                # Check for standard column names dynamically based on headers
                if not reader.fieldnames:
                    continue

                prov_key_cand = [k for k in reader.fieldnames if 'provname' in k.lower().replace(" ", "")]
                mun_key_cand = [k for k in reader.fieldnames if 'munname' in k.lower().replace(" ", "")]
                brgy_key_cand = [k for k in reader.fieldnames if 'brgyname' in k.lower().replace(" ", "")]
                
                if not (prov_key_cand and mun_key_cand and brgy_key_cand):
                    print(f"Skipping {filename}: Headers do not match target identifiers (ProvName, MunName, BrgyName). Found: {reader.fieldnames}")
                    continue
                
                prov_col = prov_key_cand[0]
                mun_col = mun_key_cand[0]
                brgy_col = brgy_key_cand[0]
                
                # Iterate rows
                for row in reader:
                    prov_val = row.get(prov_col, "").strip().upper()
                    mun_val = row.get(mun_col, "").strip().upper()
                    brgy_val = row.get(brgy_col, "").strip().upper()
                    
                    if not prov_val: continue
                    
                    if prov_val not in ADDRESS_DATA:
                        ADDRESS_DATA[prov_val] = {}
                        
                    if mun_val:
                        if mun_val not in ADDRESS_DATA[prov_val]:
                            ADDRESS_DATA[prov_val][mun_val] = set()
                        if brgy_val:
                            ADDRESS_DATA[prov_val][mun_val].add(brgy_val)

    # 2. Sort all maps and convert sets to lists for JSON compatibility
    FINAL_DATA = {}
    for prov in sorted(ADDRESS_DATA.keys()):
        FINAL_DATA[prov] = {}
        for mun in sorted(ADDRESS_DATA[prov].keys()):
            FINAL_DATA[prov][mun] = sorted(list(ADDRESS_DATA[prov][mun]))

    # 3. Write Javascript window variable syntax natively
    js_content = f"// AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.\n// Run `python tools/build_address_data.py` from the root directory to rebuild this array when updating your CSVs.\nwindow.ADDRESS_DATA = {json.dumps(FINAL_DATA)};\n"
    
    os.makedirs(os.path.dirname(output_file), exist_ok=True)
    with open(output_file, mode="w", encoding="utf-8") as f:
        f.write(js_content)
        
    print(f"Successfully compiled {len(FINAL_DATA.keys())} Provinces into {output_file}")

if __name__ == "__main__":
    build_address_data()
