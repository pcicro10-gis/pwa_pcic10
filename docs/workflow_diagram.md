# PCIC RO10 Digital Insurance Application - Workflow Diagram

This document contains the complete workflow diagram of the application form based on `index.html` and the system's architecture.

## System Workflow Diagram

```mermaid
flowchart TD
    %% Main Navigation
    Start([App Launch]) --> Welcome[Welcome Dashboard]
    
    Welcome -->|Action: Proceed| Search[Search Farmer View]
    Welcome -->|Action: User Guide| Guide[User Guide Modal]
    
    %% Sidebar Global Navigation
    Sidebar{{Sidebar Navigation}} -.->|Search Farmer| Search
    Sidebar -.->|Summary| Summary[Summary View]
    Sidebar -.->|Database| Database[Database Database View]
    Sidebar -.->|Settings| Settings[Settings View]
    Sidebar -.->|Help / About| About[About View]

    %% Search to Enrollment
    Search -->|Search DB / New Applicant| Wizard[Enrollment Form Wizard]
    
    %% Wizard Flow
    subgraph WizardFlow [Enrollment Form Steps]
        direction TB
        Step1["Step 1: Farmer Information<br>- Profile details<br>- Photo capture<br>- Beneficiaries"]
        
        Step2[Step 2: Policy Details Selection]
        Step1 -->|Next| Step2
        
        %% Conditional Branches
        BranchCrop[Crop Section]
        BranchADSS[ADSS Details]
        BranchLivestock[Livestock Details]
        BranchBanca[Banca Details]
        
        Step2 -->|Select Insurance Line: Crop| BranchCrop
        Step2 -->|Select Insurance Line: ADSS| BranchADSS
        Step2 -->|Select Insurance Line: Livestock| BranchLivestock
        Step2 -->|Select Insurance Line: Banca| BranchBanca
        
        Step3["Step 3: Farm Details<br>- Location<br>- Area<br>- Boundaries"]
        BranchCrop -->|Next| Step3
        
        Step4["Step 4: Signature & Consent<br>- Certification<br>- Data Privacy<br>- Deed of Assignment<br>- E-Signature Canvas"]
        Step3 -->|Next| Step4
        BranchADSS -->|Next| Step4
        BranchLivestock -->|Next| Step4
        BranchBanca -->|Next| Step4
    end
    
    Wizard --> WizardFlow
    
    %% Finalization
    Finish1["Finalize Application<br>- Save to IndexedDB<br>- Overlay PDF Template<br>- Export PDF"]
    Finish2["Finalize Application<br>- Save to DB<br>- Export PDF<br>- Reset Form for Same Farmer"]

    Step4 -->|Download Application Form| Finish1
    Step4 -->|Download & Add Another Policy| Finish2
    
    Finish1 -->|Return| Search
    Finish2 -->|Loop| Step2
    
    %% Feature Detail Nodes
    subgraph Other_Features [Other Application Features]
        direction TB
        SumActions["Batch Export: CSV<br>Batch Export: PDF<br>Preview Current Filtered Stats"]
        Summary --> SumActions
        
        DbActions["Import Profiles (CSV)<br>Import History (CSV)<br>Export Database (CSV)"]
        Database --> DbActions
        
        SetActions["Manage Crop Rates<br>Form Template Manager<br>PDF Calibration Layout Tool"]
        Settings --> SetActions
    end
```

### Key Workflow Details:

1. **Routing and Navigation:**
   - The application acts as a Single Page Application (SPA). Switching tabs from the sidebar toggles the visibility of different core features (`view-welcome`, `view-enrollment`, `view-summary`, `view-database`, `view-settings`, `view-about`).

2. **The Enrollment Wizard:**
   - Driven under the `view-enrollment` container, it begins with searching for an existing farmer record from the local database or starting a blank application.
   - **Dynamic Routing:** Once in the "Policy Details Selection" step, the user must choose between **Crop**, **ADSS**, **Livestock**, or **Banca**. If **Crop** is selected, a specific **Step 3: Farm Details** prompts for location and area info. Conversely, ADSS, Livestock, and Banca bypass the farm details and proceed directly to **Step 4: Signature & Consent**.

3. **Finalization:**
   - Captures Farmer (and Guardian, if applicable) electronic signatures.
   - `jspdf` generates an offline PDF by drawing the captured input values onto an embedded or custom-uploaded form template.
   - Data is committed to the local `dexie.js` Database for offline storage.
