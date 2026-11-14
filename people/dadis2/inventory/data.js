// Sample data for the medical inventory prototype.
// Everything here is SAMPLE data for a demo: crew are fictional, quantities, lots and dates are made up.
// Pack names and colours follow the public NASA ISS medical kit checklist; the medicine list is modelled
// on publicly reported ISS medication classes. Tiers, dose limits and reserves are design assumptions,
// not medical advice. See spec.md.
//
// Relative times keep the demo current: dose log entries use daysAgo/hour, requests use minutesAgo,
// crew EVAs use nextEVAInDays. logic.js turns them into real timestamps on load.
//
// Lots are written as [lotNumber, quantity, labelledExpiry (YYYY-MM-DD or null)].
// Each lot's scan tag is "TAG-<lotNumber>".

window.INVENTORY_DATA = {
  mission: {
    name: "Long-duration mission (sample)",
    startDate: "2025-10-01",
    durationDays: 900,
    commDelayMin: 12
  },

  crew: [
    { id: "c1", name: "Mara Quinn", role: "Commander", pin: "1111", allergies: ["ketamine"], conditions: [],
      standingOrders: [{ itemId: "zolpidem-5", maxPerDay: 1 }], nextEVAInDays: null },
    { id: "c2", name: "Leo Haddad", role: "Crew Medical Officer", isCMO: true, pin: "2222", allergies: ["penicillin"], conditions: [],
      standingOrders: [{ itemId: "zaleplon-10", maxPerDay: 1 }], nextEVAInDays: null },
    { id: "c3", name: "Ines Sato", role: "Flight Engineer, backup CMO", isBackupCMO: true, pin: "3333", allergies: ["NSAID"], conditions: [],
      standingOrders: [], nextEVAInDays: 1 },
    { id: "c4", name: "Tomas Reyes", role: "Mission Specialist", pin: "4444", allergies: [], conditions: ["gi-bleed-risk"],
      standingOrders: [], nextEVAInDays: null }
  ],

  conditionLabels: {
    "gi-bleed-risk": "History of stomach ulcer / GI bleeding risk",
    "hypertension": "High blood pressure"
  },

  // The app runs on each crew member's own device. This is whose device it is in the demo
  // (override with ?user=c1 ... c4 in the address bar).
  currentUserId: "c4",

  // Three tall lockers side by side, three shelves each. Each shelf is one colour-coded medicine zone.
  // Layout is our design, not NASA's.
  lockers: [
    { id: "L1", label: "1", name: "Everyday" },
    { id: "L2", label: "2", name: "Prescription" },
    { id: "L3", label: "3", name: "Emergency", emergency: true }
  ],

  // level: 1 top, 2 middle, 3 bottom. cols: bins per row on the shelf.
  shelves: [
    { id: "L1-1", lockerId: "L1", level: 1, packId: "white", zone: "Pain, fever, colds", cols: 4 },
    { id: "L1-2", lockerId: "L1", level: 2, packId: "white", zone: "Stomach, sleep, eyes", cols: 4 },
    { id: "L1-3", lockerId: "L1", level: 3, packId: "grey", zone: "Personal", cols: 4 },
    { id: "L2-1", lockerId: "L2", level: 1, packId: "purple", zone: "Prescription tablets", cols: 4 },
    { id: "L2-2", lockerId: "L2", level: 2, packId: "brown", zone: "Creams and injections", cols: 4 },
    { id: "L2-3", lockerId: "L2", level: 3, packId: "blue", zone: "Check-up tools", cols: 4 },
    { id: "L3-1", lockerId: "L3", level: 1, packId: "red", zone: "Emergency medicines", cols: 4 },
    { id: "L3-2", lockerId: "L3", level: 2, packId: "red", zone: "Emergency equipment", cols: 4 },
    { id: "L3-3", lockerId: "L3", level: 3, packId: "green", zone: "Supplies", cols: 4 }
  ],

  // Where each item sits: [shelf, bin number]. Bins are numbered left to right, top row first.
  placement: {
    "acetaminophen-325": ["L1-1", 1], "ibuprofen-400": ["L1-1", 2], "aspirin-325": ["L1-1", 3], "loratadine-10": ["L1-1", 4],
    "diphenhydramine-25": ["L1-1", 5], "pseudoephedrine-30": ["L1-1", 6], "oxymetazoline": ["L1-1", 7], "guaifenesin-400": ["L1-1", 8],
    "loperamide-2": ["L1-2", 1], "docusate-100": ["L1-2", 2], "meclizine-25": ["L1-2", 3], "calcium-carbonate-500": ["L1-2", 4],
    "melatonin-3": ["L1-2", 5], "artificial-tears": ["L1-2", 6],
    "omeprazole-20": ["L1-3", 1], "fexofenadine-180": ["L1-3", 2],
    "zolpidem-5": ["L2-1", 1], "zaleplon-10": ["L2-1", 2], "modafinil-100": ["L2-1", 3], "lorazepam-1": ["L2-1", 4],
    "oxycodone-apap": ["L2-1", 5], "promethazine-25": ["L2-1", 6], "ondansetron-4": ["L2-1", 7], "amox-clav-875": ["L2-1", 8],
    "azithromycin-250": ["L2-1", 9], "ciprofloxacin-500": ["L2-1", 10], "prednisone-20": ["L2-1", 11], "acetazolamide-250": ["L2-1", 12],
    "hydrocortisone-cream": ["L2-2", 1], "clotrimazole-cream": ["L2-2", 2], "mupirocin-oint": ["L2-2", 3], "promethazine-inj": ["L2-2", 4],
    "ceftriaxone-1g": ["L2-2", 5], "ketorolac-inj": ["L2-2", 6], "lidocaine-inj": ["L2-2", 7], "tetracaine-eye": ["L2-2", 8],
    "thermometer": ["L2-3", 1], "bp-monitor": ["L2-3", 2], "stethoscope": ["L2-3", 3], "pulse-oximeter": ["L2-3", 4],
    "otoscope": ["L2-3", 5], "glucometer": ["L2-3", 6], "glucose-strips": ["L2-3", 7], "urine-strips": ["L2-3", 8], "fluorescein-strips": ["L2-3", 9],
    "epinephrine-1mg": ["L3-1", 1], "diphenhydramine-inj": ["L3-1", 2], "atropine-1mg": ["L3-1", 3], "naloxone-04": ["L3-1", 4],
    "amiodarone-150": ["L3-1", 5], "ketamine-50": ["L3-1", 6], "nitroglycerin-04": ["L3-1", 7], "dextrose-50": ["L3-1", 8],
    "aed": ["L3-2", 1], "bvm": ["L3-2", 2], "airway-kit": ["L3-2", 3],
    "gauze-4x4": ["L3-3", 1], "adhesive-bandages": ["L3-3", 2], "skin-closure-strips": ["L3-3", 3], "alcohol-pads": ["L3-3", 4],
    "nitrile-gloves": ["L3-3", 5], "syringe-3ml": ["L3-3", 6], "iv-catheter-18g": ["L3-3", 7], "medical-tape": ["L3-3", 8],
    "sam-splint": ["L3-3", 9], "sutures-4-0": ["L3-3", 10]
  },

  // Three-letter medicine codes used in grant codes (see CONTRACT.md)
  rxCodes: {
    APA: "acetaminophen-325", IBU: "ibuprofen-400", ASA: "aspirin-325", LOR: "loratadine-10", DPH: "diphenhydramine-25",
    PSE: "pseudoephedrine-30", OXY: "oxymetazoline", LOP: "loperamide-2", DOC: "docusate-100", MEC: "meclizine-25",
    CAL: "calcium-carbonate-500", MEL: "melatonin-3", GUA: "guaifenesin-400", ART: "artificial-tears", OME: "omeprazole-20",
    FEX: "fexofenadine-180", ZOL: "zolpidem-5", ZAL: "zaleplon-10", MOD: "modafinil-100", LZP: "lorazepam-1",
    OXA: "oxycodone-apap", PMZ: "promethazine-25", OND: "ondansetron-4", AMC: "amox-clav-875", AZI: "azithromycin-250",
    CIP: "ciprofloxacin-500", PRD: "prednisone-20", ACZ: "acetazolamide-250", HCC: "hydrocortisone-cream",
    CLO: "clotrimazole-cream", MUP: "mupirocin-oint", PMI: "promethazine-inj", CEF: "ceftriaxone-1g", KET: "ketorolac-inj",
    LID: "lidocaine-inj", TET: "tetracaine-eye"
  },

  // Demo only: the grant a flight surgeon on Earth sends in the test code (any crew member).
  demoPlan: [
    { itemId: "ondansetron-4", units: 1, perDay: 2, days: 3 },
    { itemId: "calcium-carbonate-500", units: 2, perDay: 3, days: 5 }
  ],

  packs: [
    { id: "red", name: "Emergency Medical Treatment", colour: "Red", hex: "#d64545", source: "NASA ISS checklist" },
    { id: "white", name: "Convenience Medication", colour: "White", hex: "#f4f4f2", source: "NASA ISS checklist" },
    { id: "grey", name: "Crew-specific", colour: "Grey", hex: "#8a8f98", source: "Our colour choice" },
    { id: "purple", name: "Oral Medication", colour: "Purple", hex: "#7b4fc9", source: "NASA ISS checklist" },
    { id: "brown", name: "Topical & Injectable Medication", colour: "Brown", hex: "#8b5a2b", source: "NASA ISS checklist" },
    { id: "blue", name: "Medical Diagnostic", colour: "Blue", hex: "#2f6fd6", source: "NASA ISS checklist" },
    { id: "green", name: "Medical Supply", colour: "Green", hex: "#2e9a5b", source: "NASA ISS checklist" }
  ],

  // Gamification: points for safe habits (right box first time, quick find, answering "did it help?"),
  // never for taking more medicine. Sample starting values.
  players: {
    c1: { xp: 420, streak: 6, retrievals: 14, firstTryScans: 12, followUps: 11, bestTimeSec: 16, badges: ["first-find", "sharp-eye", "good-reporter", "speedy"] },
    c2: { xp: 510, streak: 3, retrievals: 9, firstTryScans: 9, followUps: 8, bestTimeSec: 19, badges: ["first-find", "sharp-eye", "good-reporter", "speedy"] },
    c3: { xp: 260, streak: 2, retrievals: 6, firstTryScans: 5, followUps: 4, bestTimeSec: 27, badges: ["first-find", "sharp-eye"] },
    c4: { xp: 180, streak: 2, retrievals: 5, firstTryScans: 4, followUps: 5, bestTimeSec: 31, badges: ["first-find", "good-reporter"] }
  },

  symptoms: [
    { code: "headache", label: "Headache" },
    { code: "muscle-pain", label: "Muscle or back pain" },
    { code: "fever", label: "Fever or chills" },
    { code: "sore-throat", label: "Sore throat" },
    { code: "nasal-congestion", label: "Nasal congestion" },
    { code: "runny-nose", label: "Runny nose or sneezing" },
    { code: "cough", label: "Cough" },
    { code: "insomnia", label: "Trouble sleeping" },
    { code: "fatigue", label: "Fatigue (shift work)" },
    { code: "motion-sickness", label: "Space motion sickness" },
    { code: "nausea", label: "Nausea" },
    { code: "diarrhea", label: "Diarrhea" },
    { code: "constipation", label: "Constipation" },
    { code: "heartburn", label: "Heartburn or reflux" },
    { code: "dry-eyes", label: "Dry or irritated eyes" },
    { code: "itch-rash", label: "Itchy skin or rash" },
    { code: "fungal-skin", label: "Fungal skin infection" },
    { code: "minor-cut", label: "Minor cut or abrasion" },
    { code: "chest-pain", label: "Chest pain or pressure", redFlag: true },
    { code: "breathing", label: "Shortness of breath", redFlag: true },
    { code: "neuro-headache", label: "Severe headache with vision change, weakness or confusion", redFlag: true },
    { code: "eye-injury", label: "Eye injury or foreign body in eye", redFlag: true },
    { code: "unconscious", label: "Fainting or loss of consciousness", redFlag: true },
    { code: "throat-swelling", label: "Throat, lip or face swelling", redFlag: true },
    { code: "heavy-bleeding", label: "Heavy bleeding", redFlag: true },
    { code: "severe-abdominal", label: "Severe abdominal pain", redFlag: true }
  ],

  // Escalate to the CMO when a vital is outside these limits (sample thresholds).
  redFlagVitals: { tempCMin: null, tempCMax: 39.0, spo2Min: 92, heartRateMin: 45, heartRateMax: 120, systolicMin: 90, systolicMax: 180 },
  redFlagSeverity: 8,

  // Max mg per 24 h per ingredient, across all products (sample values, verify with a clinician).
  ingredientLimits: { acetaminophen: 3000, ibuprofen: 1200, aspirin: 4000, diphenhydramine: 300, pseudoephedrine: 240 },

  // Planning margin subtracted from labelled expiry, by stability class (assumption, months).
  stabilityMarginMonths: { stable: 0, moderate: 3, sensitive: 6 },

  // tier: "S" supply, "1" self-care, "2" prescription, "3" controlled, "4" emergency
  // kind: medication | supply | equipment
  items: [
    // White: Convenience Medication
    { id: "acetaminophen-325", name: "Acetaminophen", strength: "325 mg", form: "tablet", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "acetaminophen", mg: 325 }], doseUnits: 2, maxPerDay: 8, classes: ["analgesic"],
      indications: ["headache", "muscle-pain", "fever", "sore-throat"], stability: "moderate", reserve: 20, plannedUsePer30d: 12,
      lots: [["APA-2408", 60, "2027-09-30"], ["APA-2502", 100, "2028-12-31"]] },
    { id: "ibuprofen-400", name: "Ibuprofen", strength: "400 mg", form: "tablet", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "ibuprofen", mg: 400 }], doseUnits: 1, maxPerDay: 3, classes: ["NSAID", "analgesic"],
      indications: ["headache", "muscle-pain", "fever"], contraindications: ["gi-bleed-risk"], stability: "stable", reserve: 20, plannedUsePer30d: 20,
      lots: [["IBU-2407", 48, "2027-07-31"], ["IBU-2503", 100, "2028-09-30"]] },
    { id: "aspirin-325", name: "Aspirin", strength: "325 mg", form: "tablet", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "aspirin", mg: 325 }], doseUnits: 1, maxPerDay: 8, classes: ["NSAID", "analgesic"],
      indications: ["headache", "muscle-pain"], contraindications: ["gi-bleed-risk"], stability: "moderate", reserve: 12, plannedUsePer30d: 2,
      notes: "Reserve kept for suspected heart attack (CMO use).",
      lots: [["ASA-2406", 36, "2027-06-30"]] },
    { id: "loratadine-10", name: "Loratadine", strength: "10 mg", form: "tablet", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "loratadine", mg: 10 }], doseUnits: 1, maxPerDay: 1, classes: ["antihistamine"],
      indications: ["runny-nose", "itch-rash"], stability: "stable", reserve: 10, plannedUsePer30d: 10,
      lots: [["LOR-2409", 30, "2027-03-31"], ["LOR-2505", 60, "2028-06-30"]] },
    { id: "diphenhydramine-25", name: "Diphenhydramine", strength: "25 mg", form: "capsule", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "diphenhydramine", mg: 25 }], doseUnits: 1, maxPerDay: 8, classes: ["antihistamine"], sedating: true,
      indications: ["itch-rash", "runny-nose", "insomnia"], stability: "stable", reserve: 10, plannedUsePer30d: 4,
      lots: [["DPH-2410", 40, "2027-10-31"], ["DPH-2503", 40, "2028-09-30"]] },
    { id: "pseudoephedrine-30", name: "Pseudoephedrine", strength: "30 mg", form: "tablet", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "pseudoephedrine", mg: 30 }], doseUnits: 2, maxPerDay: 8, classes: ["decongestant"],
      indications: ["nasal-congestion"], contraindications: ["hypertension"], stability: "stable", reserve: 12, plannedUsePer30d: 14,
      lots: [["PSE-2405", 10, "2027-05-31"]] },
    { id: "oxymetazoline", name: "Oxymetazoline nasal spray", strength: "0.05%, 15 mL", form: "spray bottle", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "oxymetazoline", mg: 0 }], doseUnits: 1, maxPerDay: 1, classes: ["decongestant"],
      indications: ["nasal-congestion"], stability: "sensitive", reserve: 1, plannedUsePer30d: 0.3,
      notes: "One bottle per person. Use for 3 days at most (rebound congestion).",
      lots: [["OXY-2411", 3, "2027-02-28"]] },
    { id: "loperamide-2", name: "Loperamide", strength: "2 mg", form: "capsule", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "loperamide", mg: 2 }], doseUnits: 2, maxPerDay: 4, classes: ["antidiarrheal"],
      indications: ["diarrhea"], stability: "stable", reserve: 12, plannedUsePer30d: 2,
      lots: [["LOP-2406", 24, "2027-12-31"], ["LOP-2505", 24, "2029-03-31"]] },
    { id: "docusate-100", name: "Docusate sodium", strength: "100 mg", form: "capsule", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "docusate", mg: 100 }], doseUnits: 1, maxPerDay: 3, classes: ["stool-softener"],
      indications: ["constipation"], stability: "stable", reserve: 10, plannedUsePer30d: 6,
      lots: [["DOC-2408", 40, "2027-08-31"], ["DOC-2504", 60, "2029-01-31"]] },
    { id: "meclizine-25", name: "Meclizine", strength: "25 mg", form: "tablet", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "meclizine", mg: 25 }], doseUnits: 1, maxPerDay: 4, classes: ["antiemetic"], sedating: true,
      indications: ["motion-sickness", "nausea"], stability: "stable", reserve: 12, plannedUsePer30d: 3,
      lots: [["MEC-2403", 30, "2027-03-31"]] },
    { id: "calcium-carbonate-500", name: "Calcium carbonate (antacid)", strength: "500 mg", form: "chewable tablet", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "calcium carbonate", mg: 500 }], doseUnits: 2, maxPerDay: 10, classes: ["antacid"],
      indications: ["heartburn"], stability: "stable", reserve: 10, plannedUsePer30d: 6,
      lots: [["CAL-2407", 60, "2028-07-31"], ["CAL-2504", 60, "2029-04-30"]] },
    { id: "melatonin-3", name: "Melatonin", strength: "3 mg", form: "tablet", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "melatonin", mg: 3 }], doseUnits: 1, maxPerDay: 1, classes: ["sleep-aid"],
      indications: ["insomnia"], stability: "sensitive", reserve: 10, plannedUsePer30d: 15,
      notes: "Melatonin was the one medicine out of specification after 550 days on ISS (Wotring 2016).",
      lots: [["MEL-2312", 8, "2026-09-30"], ["MEL-2506", 60, "2027-12-31"]] },
    { id: "guaifenesin-400", name: "Guaifenesin", strength: "400 mg", form: "tablet", packId: "white", kind: "medication", tier: "1",
      ingredients: [{ name: "guaifenesin", mg: 400 }], doseUnits: 1, maxPerDay: 6, classes: ["expectorant"],
      indications: ["cough"], stability: "stable", reserve: 10, plannedUsePer30d: 3,
      lots: [["GUA-2409", 30, "2028-01-31"], ["GUA-2506", 30, "2029-06-30"]] },
    { id: "artificial-tears", name: "Lubricant eye drops", strength: "15 mL", form: "dropper bottle", packId: "white", kind: "medication", tier: "1",
      ingredients: [], doseUnits: 1, maxPerDay: 1, classes: ["eye-lubricant"],
      indications: ["dry-eyes"], stability: "sensitive", reserve: 2, plannedUsePer30d: 0.5,
      lots: [["ART-2401", 2, "2026-10-31"], ["ART-2504", 6, "2027-11-30"]] },

    // Grey: Crew-specific
    { id: "omeprazole-20", name: "Omeprazole", strength: "20 mg", form: "capsule", packId: "grey", kind: "medication", tier: "1", ownerCrewId: "c4",
      ingredients: [{ name: "omeprazole", mg: 20 }], doseUnits: 1, maxPerDay: 1, classes: ["PPI"],
      indications: ["heartburn"], stability: "stable", reserve: 30, plannedUsePer30d: 30,
      lots: [["OME-2408", 120, "2027-08-31"], ["OME-2504", 400, "2028-11-30"]] },
    { id: "fexofenadine-180", name: "Fexofenadine", strength: "180 mg", form: "tablet", packId: "grey", kind: "medication", tier: "1", ownerCrewId: "c3",
      ingredients: [{ name: "fexofenadine", mg: 180 }], doseUnits: 1, maxPerDay: 1, classes: ["antihistamine"],
      indications: ["runny-nose", "itch-rash"], stability: "stable", reserve: 20, plannedUsePer30d: 30,
      lots: [["FEX-2409", 90, "2027-09-30"], ["FEX-2505", 420, "2028-12-31"]] },

    // Purple: Oral Medication
    { id: "zolpidem-5", name: "Zolpidem", strength: "5 mg", form: "tablet", packId: "purple", kind: "medication", tier: "3", controlled: "C-IV",
      ingredients: [{ name: "zolpidem", mg: 5 }], doseUnits: 1, maxPerDay: 1, classes: ["sedative-hypnotic"], sedating: true,
      indications: ["insomnia"], stability: "moderate", reserve: 30, plannedUsePer30d: 25,
      lots: [["ZOL-2407", 34, "2027-07-31"], ["ZOL-2502", 60, "2028-04-30"]] },
    { id: "zaleplon-10", name: "Zaleplon", strength: "10 mg", form: "capsule", packId: "purple", kind: "medication", tier: "3", controlled: "C-IV",
      ingredients: [{ name: "zaleplon", mg: 10 }], doseUnits: 1, maxPerDay: 1, classes: ["sedative-hypnotic"], sedating: true,
      indications: ["insomnia"], stability: "moderate", reserve: 20, plannedUsePer30d: 10,
      lots: [["ZAL-2408", 40, "2027-08-31"]] },
    { id: "modafinil-100", name: "Modafinil", strength: "100 mg", form: "tablet", packId: "purple", kind: "medication", tier: "3", controlled: "C-IV",
      ingredients: [{ name: "modafinil", mg: 100 }], doseUnits: 1, maxPerDay: 2, classes: ["stimulant"],
      indications: ["fatigue"], stability: "moderate", reserve: 10, plannedUsePer30d: 0.5,
      lots: [["MOD-2406", 20, "2027-06-30"]] },
    { id: "lorazepam-1", name: "Lorazepam", strength: "1 mg", form: "tablet", packId: "purple", kind: "medication", tier: "3", controlled: "C-IV",
      ingredients: [{ name: "lorazepam", mg: 1 }], doseUnits: 1, maxPerDay: 4, classes: ["benzodiazepine"], sedating: true,
      indications: [], stability: "moderate", reserve: 10, plannedUsePer30d: 0.5,
      lots: [["LZP-2409", 20, "2027-09-30"]] },
    { id: "oxycodone-apap", name: "Oxycodone / acetaminophen", strength: "5 / 325 mg", form: "tablet", packId: "purple", kind: "medication", tier: "3", controlled: "C-II",
      ingredients: [{ name: "oxycodone", mg: 5 }, { name: "acetaminophen", mg: 325 }], doseUnits: 1, maxPerDay: 6, classes: ["opioid", "analgesic"], sedating: true,
      indications: ["muscle-pain"], stability: "moderate", reserve: 12, plannedUsePer30d: 0.5,
      lots: [["OXA-2408", 20, "2027-08-31"]] },
    { id: "promethazine-25", name: "Promethazine", strength: "25 mg", form: "tablet", packId: "purple", kind: "medication", tier: "2",
      ingredients: [{ name: "promethazine", mg: 25 }], doseUnits: 1, maxPerDay: 4, classes: ["antiemetic"], sedating: true,
      indications: ["motion-sickness", "nausea"], stability: "sensitive", reserve: 10, plannedUsePer30d: 0.5,
      lots: [["PMZ-2407", 20, "2027-07-31"]] },
    { id: "ondansetron-4", name: "Ondansetron", strength: "4 mg", form: "orally disintegrating tablet", packId: "purple", kind: "medication", tier: "2",
      ingredients: [{ name: "ondansetron", mg: 4 }], doseUnits: 1, maxPerDay: 3, classes: ["antiemetic"],
      indications: ["nausea"], stability: "stable", reserve: 10, plannedUsePer30d: 1,
      lots: [["OND-2410", 20, "2028-10-31"]] },
    { id: "amox-clav-875", name: "Amoxicillin / clavulanate", strength: "875 / 125 mg", form: "tablet", packId: "purple", kind: "medication", tier: "2",
      ingredients: [{ name: "amoxicillin", mg: 875 }], doseUnits: 1, maxPerDay: 2, classes: ["antibiotic", "penicillin"],
      indications: [], stability: "moderate", reserve: 20, plannedUsePer30d: 1,
      lots: [["AMC-2409", 28, "2027-03-31"]] },
    { id: "azithromycin-250", name: "Azithromycin", strength: "250 mg", form: "tablet", packId: "purple", kind: "medication", tier: "2",
      ingredients: [{ name: "azithromycin", mg: 250 }], doseUnits: 2, maxPerDay: 2, classes: ["antibiotic"],
      indications: [], stability: "stable", reserve: 12, plannedUsePer30d: 0.5,
      lots: [["AZI-2502", 18, "2028-02-29"]] },
    { id: "ciprofloxacin-500", name: "Ciprofloxacin", strength: "500 mg", form: "tablet", packId: "purple", kind: "medication", tier: "2",
      ingredients: [{ name: "ciprofloxacin", mg: 500 }], doseUnits: 1, maxPerDay: 2, classes: ["antibiotic"],
      indications: [], stability: "sensitive", reserve: 14, plannedUsePer30d: 0.5,
      notes: "Degraded in flight despite ground stability data (team research, section 4).",
      lots: [["CIP-2404", 20, "2027-04-30"]] },
    { id: "prednisone-20", name: "Prednisone", strength: "20 mg", form: "tablet", packId: "purple", kind: "medication", tier: "2",
      ingredients: [{ name: "prednisone", mg: 20 }], doseUnits: 1, maxPerDay: 3, classes: ["steroid"],
      indications: [], stability: "stable", reserve: 15, plannedUsePer30d: 0.3,
      lots: [["PRD-2410", 30, "2028-10-31"]] },
    { id: "acetazolamide-250", name: "Acetazolamide", strength: "250 mg", form: "tablet", packId: "purple", kind: "medication", tier: "2",
      ingredients: [{ name: "acetazolamide", mg: 250 }], doseUnits: 1, maxPerDay: 4, classes: ["diuretic"],
      indications: [], stability: "stable", reserve: 10, plannedUsePer30d: 0.3,
      lots: [["ACZ-2409", 20, "2028-09-30"]] },

    // Brown: Topical & Injectable Medication
    { id: "hydrocortisone-cream", name: "Hydrocortisone 1% cream", strength: "28 g tube", form: "cream", packId: "brown", kind: "medication", tier: "1",
      ingredients: [], doseUnits: 1, maxPerDay: 1, classes: ["topical-steroid"],
      indications: ["itch-rash"], stability: "moderate", reserve: 1, plannedUsePer30d: 0.5,
      lots: [["HCC-2408", 4, "2027-08-31"], ["HCC-2504", 14, "2028-10-31"]] },
    { id: "clotrimazole-cream", name: "Clotrimazole 1% cream", strength: "15 g tube", form: "cream", packId: "brown", kind: "medication", tier: "1",
      ingredients: [], doseUnits: 1, maxPerDay: 1, classes: ["antifungal"],
      indications: ["fungal-skin"], stability: "moderate", reserve: 1, plannedUsePer30d: 0.3,
      lots: [["CLO-2409", 3, "2027-09-30"], ["CLO-2505", 4, "2028-12-31"]] },
    { id: "mupirocin-oint", name: "Mupirocin 2% ointment", strength: "22 g tube", form: "ointment", packId: "brown", kind: "medication", tier: "2",
      ingredients: [], doseUnits: 1, maxPerDay: 1, classes: ["topical-antibiotic"],
      indications: [], stability: "moderate", reserve: 1, plannedUsePer30d: 0.2,
      lots: [["MUP-2410", 3, "2027-10-31"], ["MUP-2506", 3, "2029-01-31"]] },
    { id: "promethazine-inj", name: "Promethazine injection", strength: "25 mg/mL, 1 mL", form: "ampule", packId: "brown", kind: "medication", tier: "2",
      ingredients: [{ name: "promethazine", mg: 25 }], doseUnits: 1, maxPerDay: 4, classes: ["antiemetic"], sedating: true,
      indications: ["motion-sickness", "nausea"], stability: "sensitive", reserve: 6, plannedUsePer30d: 0.5,
      lots: [["PMI-2403", 10, "2027-03-31"]] },
    { id: "ceftriaxone-1g", name: "Ceftriaxone", strength: "1 g", form: "vial (powder)", packId: "brown", kind: "medication", tier: "2",
      ingredients: [{ name: "ceftriaxone", mg: 1000 }], doseUnits: 1, maxPerDay: 2, classes: ["antibiotic", "cephalosporin"],
      indications: [], stability: "moderate", reserve: 6, plannedUsePer30d: 0.1,
      lots: [["CEF-2501", 8, "2028-01-31"]] },
    { id: "ketorolac-inj", name: "Ketorolac injection", strength: "30 mg/mL, 1 mL", form: "vial", packId: "brown", kind: "medication", tier: "2",
      ingredients: [{ name: "ketorolac", mg: 30 }], doseUnits: 1, maxPerDay: 4, classes: ["NSAID", "analgesic"],
      indications: [], contraindications: ["gi-bleed-risk"], stability: "sensitive", reserve: 6, plannedUsePer30d: 0.1,
      lots: [["KET-2408", 8, "2027-08-31"]] },
    { id: "lidocaine-inj", name: "Lidocaine 1% injection", strength: "5 mL", form: "vial", packId: "brown", kind: "medication", tier: "2",
      ingredients: [{ name: "lidocaine", mg: 50 }], doseUnits: 1, maxPerDay: 2, classes: ["local-anesthetic"],
      indications: [], stability: "sensitive", reserve: 5, plannedUsePer30d: 0.2,
      lots: [["LID-2409", 6, "2028-09-30"]] },
    { id: "tetracaine-eye", name: "Tetracaine 0.5% eye drops", strength: "single-use", form: "dropper", packId: "brown", kind: "medication", tier: "2",
      ingredients: [], doseUnits: 1, maxPerDay: 2, classes: ["local-anesthetic"],
      indications: [], stability: "sensitive", reserve: 10, plannedUsePer30d: 0.1,
      lots: [["TET-2410", 12, "2027-10-31"]] },

    // Red: Emergency Medical Treatment
    { id: "epinephrine-1mg", name: "Epinephrine", strength: "1 mg/mL, 1 mL", form: "ampule", packId: "red", kind: "medication", tier: "4",
      ingredients: [{ name: "epinephrine", mg: 1 }], doseUnits: 1, classes: ["vasopressor"],
      indications: [], stability: "sensitive", reserve: 6, plannedUsePer30d: 0,
      lots: [["EPI-2410", 8, "2027-10-31"], ["EPI-2504", 6, "2028-04-30"]] },
    { id: "diphenhydramine-inj", name: "Diphenhydramine injection", strength: "50 mg/mL, 1 mL", form: "vial", packId: "red", kind: "medication", tier: "4",
      ingredients: [{ name: "diphenhydramine", mg: 50 }], doseUnits: 1, classes: ["antihistamine"], sedating: true,
      indications: [], stability: "sensitive", reserve: 4, plannedUsePer30d: 0,
      lots: [["DPI-2408", 5, "2027-08-31"]] },
    { id: "atropine-1mg", name: "Atropine", strength: "1 mg", form: "prefilled syringe", packId: "red", kind: "medication", tier: "4",
      ingredients: [{ name: "atropine", mg: 1 }], doseUnits: 1, classes: ["anticholinergic"],
      indications: [], stability: "moderate", reserve: 3, plannedUsePer30d: 0,
      lots: [["ATR-2409", 4, "2028-09-30"]] },
    { id: "naloxone-04", name: "Naloxone", strength: "0.4 mg/mL, 1 mL", form: "vial", packId: "red", kind: "medication", tier: "4",
      ingredients: [{ name: "naloxone", mg: 0.4 }], doseUnits: 1, classes: ["opioid-antagonist"],
      indications: [], stability: "moderate", reserve: 4, plannedUsePer30d: 0,
      lots: [["NLX-2410", 6, "2028-10-31"]] },
    { id: "amiodarone-150", name: "Amiodarone", strength: "150 mg / 3 mL", form: "vial", packId: "red", kind: "medication", tier: "4",
      ingredients: [{ name: "amiodarone", mg: 150 }], doseUnits: 1, classes: ["antiarrhythmic"],
      indications: [], stability: "moderate", reserve: 3, plannedUsePer30d: 0,
      lots: [["AMI-2409", 4, "2028-09-30"]] },
    { id: "ketamine-50", name: "Ketamine", strength: "50 mg/mL, 10 mL", form: "vial", packId: "red", kind: "medication", tier: "4", controlled: "C-III",
      ingredients: [{ name: "ketamine", mg: 500 }], doseUnits: 1, classes: ["anesthetic"], sedating: true,
      indications: [], stability: "moderate", reserve: 2, plannedUsePer30d: 0,
      lots: [["KTM-2408", 3, "2028-08-31"]] },
    { id: "nitroglycerin-04", name: "Nitroglycerin", strength: "0.4 mg", form: "sublingual tablet", packId: "red", kind: "medication", tier: "4",
      ingredients: [{ name: "nitroglycerin", mg: 0.4 }], doseUnits: 1, classes: ["nitrate"],
      indications: [], stability: "sensitive", reserve: 10, plannedUsePer30d: 0,
      lots: [["NTG-2411", 25, "2027-05-31"]] },
    { id: "dextrose-50", name: "Dextrose 50%", strength: "50 mL", form: "prefilled syringe", packId: "red", kind: "medication", tier: "4",
      ingredients: [], doseUnits: 1, classes: ["glucose"],
      indications: [], stability: "moderate", reserve: 2, plannedUsePer30d: 0,
      lots: [["D50-2406", 3, "2028-06-30"]] },
    { id: "aed", name: "AED (defibrillator)", strength: "", form: "device", packId: "red", kind: "equipment", tier: "4",
      lots: [["AED-SN4471", 1, null]] },
    { id: "bvm", name: "Bag-valve-mask resuscitator", strength: "adult", form: "device", packId: "red", kind: "equipment", tier: "4",
      lots: [["BVM-SN2290", 1, null]] },
    { id: "airway-kit", name: "Oropharyngeal airway set", strength: "sizes 3-5", form: "kit", packId: "red", kind: "equipment", tier: "4",
      lots: [["OPA-SET07", 1, null]] },

    // Blue: Medical Diagnostic
    { id: "thermometer", name: "Digital thermometer", strength: "", form: "device", packId: "blue", kind: "equipment", tier: "S", lots: [["THM-SN01", 2, null]] },
    { id: "bp-monitor", name: "Blood pressure monitor", strength: "", form: "device", packId: "blue", kind: "equipment", tier: "S", lots: [["BPM-SN12", 1, null]] },
    { id: "stethoscope", name: "Stethoscope", strength: "", form: "device", packId: "blue", kind: "equipment", tier: "S", lots: [["STH-SN03", 1, null]] },
    { id: "pulse-oximeter", name: "Pulse oximeter", strength: "", form: "device", packId: "blue", kind: "equipment", tier: "S", lots: [["POX-SN21", 2, null]] },
    { id: "otoscope", name: "Otoscope / ophthalmoscope", strength: "", form: "device", packId: "blue", kind: "equipment", tier: "S", lots: [["OTO-SN08", 1, null]] },
    { id: "glucometer", name: "Glucometer", strength: "", form: "device", packId: "blue", kind: "equipment", tier: "S", lots: [["GLU-SN05", 1, null]] },
    { id: "glucose-strips", name: "Glucose test strips", strength: "", form: "strip", packId: "blue", kind: "supply", tier: "S",
      stability: "moderate", reserve: 20, plannedUsePer30d: 2, lots: [["GST-2408", 100, "2027-08-31"]] },
    { id: "urine-strips", name: "Urine test strips", strength: "", form: "strip", packId: "blue", kind: "supply", tier: "S",
      stability: "moderate", reserve: 10, plannedUsePer30d: 1, lots: [["UST-2409", 50, "2027-09-30"]] },
    { id: "fluorescein-strips", name: "Fluorescein eye stain strips", strength: "", form: "strip", packId: "blue", kind: "supply", tier: "2",
      stability: "stable", reserve: 6, plannedUsePer30d: 0.2, lots: [["FLS-2410", 20, "2028-10-31"]] },

    // Green: Medical Supply
    { id: "gauze-4x4", name: "Gauze pads 4x4 in", strength: "", form: "pad", packId: "green", kind: "supply", tier: "S",
      indications: ["minor-cut"], stability: "stable", reserve: 60, plannedUsePer30d: 6, lots: [["GZ-2405", 200, "2029-05-31"]] },
    { id: "adhesive-bandages", name: "Adhesive bandages", strength: "", form: "bandage", packId: "green", kind: "supply", tier: "S",
      indications: ["minor-cut"], stability: "stable", reserve: 30, plannedUsePer30d: 8, doseUnits: 1, lots: [["BND-2406", 150, "2029-06-30"]] },
    { id: "skin-closure-strips", name: "Skin closure strips", strength: "", form: "strip", packId: "green", kind: "supply", tier: "S",
      indications: ["minor-cut"], stability: "stable", reserve: 10, plannedUsePer30d: 1, lots: [["SCS-2407", 40, "2028-07-31"]] },
    { id: "alcohol-pads", name: "Alcohol prep pads", strength: "", form: "pad", packId: "green", kind: "supply", tier: "S",
      indications: ["minor-cut"], stability: "stable", reserve: 60, plannedUsePer30d: 15, lots: [["ALC-2406", 300, "2028-06-30"]] },
    { id: "nitrile-gloves", name: "Nitrile gloves (pair)", strength: "M/L", form: "pair", packId: "green", kind: "supply", tier: "S",
      stability: "stable", reserve: 60, plannedUsePer30d: 20, lots: [["GLV-2405", 300, "2029-05-31"], ["GLV-2503", 120, "2029-12-31"]] },
    { id: "syringe-3ml", name: "Syringe 3 mL", strength: "", form: "syringe", packId: "green", kind: "supply", tier: "S",
      stability: "stable", reserve: 20, plannedUsePer30d: 1, lots: [["SYR-2406", 60, "2029-06-30"]] },
    { id: "iv-catheter-18g", name: "IV catheter 18G", strength: "", form: "catheter", packId: "green", kind: "supply", tier: "S",
      stability: "stable", reserve: 6, plannedUsePer30d: 0.1, lots: [["IVC-2407", 12, "2029-07-31"]] },
    { id: "medical-tape", name: "Medical tape", strength: "1 in roll", form: "roll", packId: "green", kind: "supply", tier: "S",
      stability: "stable", reserve: 3, plannedUsePer30d: 0.5, lots: [["TAP-2406", 10, "2029-06-30"]] },
    { id: "sam-splint", name: "Moldable splint", strength: "36 in", form: "splint", packId: "green", kind: "equipment", tier: "S",
      lots: [["SPL-2401", 2, null]] },
    { id: "sutures-4-0", name: "Sutures 4-0", strength: "", form: "pack", packId: "green", kind: "supply", tier: "2",
      stability: "stable", reserve: 6, plannedUsePer30d: 0.1, lots: [["SUT-2408", 12, "2028-08-31"]] }
  ],

  // Dose log from the last 30 days (sample). auth types: self, standing-order, cmo, cmo+witness, break-glass
  doseLog: [
    // Commander's standing order for zolpidem: the most-used controlled medicine
    ...[1, 2, 4, 5, 7, 9, 10, 12, 15, 17, 20, 23, 26, 28].map(function (d, i) {
      return { daysAgo: d, hour: 22, minute: 30, patientId: "c1", itemId: "zolpidem-5", lotNumber: "ZOL-2407", qty: 1, reason: "Trouble sleeping",
        auth: { type: "standing-order", signedBy: ["c1"] }, groundReview: d <= 5 ? "pending" : "done",
        countCheck: d === 4 ? { expected: 37, counted: 36 } : null,
        followUp: d <= 1 ? null : { effective: d !== 12, sideEffects: d === 17 ? "Groggy next morning" : "" } };
    }),
    ...[3, 11, 19, 27].map(function (d) {
      return { daysAgo: d, hour: 23, minute: 5, patientId: "c2", itemId: "zaleplon-10", lotNumber: "ZAL-2408", qty: 1, reason: "Trouble sleeping",
        auth: { type: "standing-order", signedBy: ["c2"] }, groundReview: "done", followUp: { effective: true, sideEffects: "" } };
    }),
    ...[2, 6, 13, 21].map(function (d) {
      return { daysAgo: d, hour: 22, minute: 10, patientId: "c3", itemId: "melatonin-3", lotNumber: "MEL-2506", qty: 1, reason: "Trouble sleeping",
        auth: { type: "self", signedBy: ["c3"] }, followUp: d <= 2 ? null : { effective: d !== 13, sideEffects: "" } };
    }),
    ...[1, 8, 16, 22].map(function (d) {
      return { daysAgo: d, hour: 13, minute: 0, patientId: "c1", itemId: "ibuprofen-400", lotNumber: "IBU-2407", qty: 1, reason: "Back pain after exercise",
        auth: { type: "self", signedBy: ["c1"] }, followUp: d <= 1 ? null : { effective: true, sideEffects: "" } };
    }),
    ...[3, 4, 5, 6, 7].map(function (d) {
      return { daysAgo: d, hour: 8, minute: 15, patientId: "c4", itemId: "loratadine-10", lotNumber: "LOR-2409", qty: 1, reason: "Runny nose, sneezing",
        auth: { type: "self", signedBy: ["c4"] }, followUp: { effective: d > 4, sideEffects: "" } };
    }),
    { daysAgo: 0, hour: 7, minute: 30, patientId: "c3", itemId: "acetaminophen-325", lotNumber: "APA-2408", qty: 2, reason: "Headache",
      auth: { type: "self", signedBy: ["c3"] }, followUp: null },
    { daysAgo: 5, hour: 15, minute: 0, patientId: "c3", itemId: "acetaminophen-325", lotNumber: "APA-2408", qty: 2, reason: "Headache",
      auth: { type: "self", signedBy: ["c3"] }, followUp: { effective: true, sideEffects: "" } },
    { daysAgo: 9, hour: 9, minute: 0, patientId: "c2", itemId: "pseudoephedrine-30", lotNumber: "PSE-2405", qty: 2, reason: "Nasal congestion",
      auth: { type: "self", signedBy: ["c2"] }, followUp: { effective: false, sideEffects: "" } },
    { daysAgo: 10, hour: 9, minute: 0, patientId: "c2", itemId: "pseudoephedrine-30", lotNumber: "PSE-2405", qty: 2, reason: "Nasal congestion",
      auth: { type: "self", signedBy: ["c2"] }, followUp: { effective: true, sideEffects: "" } },
    { daysAgo: 12, hour: 7, minute: 45, patientId: "c1", itemId: "docusate-100", lotNumber: "DOC-2408", qty: 1, reason: "Constipation",
      auth: { type: "self", signedBy: ["c1"] }, followUp: { effective: true, sideEffects: "" } },
    { daysAgo: 18, hour: 20, minute: 0, patientId: "c2", itemId: "hydrocortisone-cream", lotNumber: "HCC-2408", qty: 1, reason: "Itchy rash on forearm",
      auth: { type: "self", signedBy: ["c2"] }, followUp: { effective: true, sideEffects: "" } },
    { daysAgo: 6, hour: 11, minute: 20, patientId: "c4", itemId: "adhesive-bandages", lotNumber: "BND-2406", qty: 2, reason: "Minor cut on finger",
      auth: { type: "self", signedBy: ["c4"] }, followUp: null },
    { daysAgo: 1, hour: 21, minute: 0, patientId: "c4", itemId: "docusate-100", lotNumber: "DOC-2408", qty: 1, reason: "Constipation",
      auth: { type: "self", signedBy: ["c4"] }, followUp: null },
    { daysAgo: 25, hour: 10, minute: 0, patientId: "c4", itemId: "meclizine-25", lotNumber: "MEC-2403", qty: 1, reason: "Space motion sickness",
      auth: { type: "self", signedBy: ["c4"] }, followUp: { effective: true, sideEffects: "Drowsy" } },
    { daysAgo: 2, hour: 14, minute: 5, patientId: "c4", itemId: "diphenhydramine-inj", lotNumber: "DPI-2408", qty: 1, reason: "Hives and lip swelling after a new food item",
      auth: { type: "break-glass", signedBy: ["c2"] }, groundReview: "pending", docsDueHours: 2,
      documentation: "Given IM by CMO. Swelling settled within 40 minutes. No breathing difficulty. Observed for 4 hours.",
      followUp: { effective: true, sideEffects: "Drowsy" } }
  ],

  // Requests waiting for a grant (sample). Prescription → the onboard doctor; controlled → Earth.
  requests: [
    { minutesAgo: 40, patientId: "c4", itemId: "ondansetron-4", qty: 1, reason: "Nausea since this morning", status: "pending", signatures: [] },
    { minutesAgo: 15, patientId: "c1", itemId: "modafinil-100", qty: 1, reason: "Night shift for docking support", status: "pending", signatures: [] }
  ],

  // Demo only: symptom sets standing in for the symptom page (built elsewhere). The demo sends them
  // as a symptom report for the current user (format in spec.md, section 8).
  demoSymptoms: [
    { label: "Headache + stuffy nose", symptoms: [{ code: "nasal-congestion", severity: 4 }, { code: "headache", severity: 3 }],
      vitals: { heartRate: 74, spo2: 98, tempC: 36.9, systolic: 118, diastolic: 76 } },
    { label: "Motion sickness", symptoms: [{ code: "motion-sickness", severity: 6 }, { code: "nausea", severity: 5 }],
      vitals: { heartRate: 88, spo2: 98, tempC: 36.7 } },
    { label: "Can't sleep", symptoms: [{ code: "insomnia", severity: 5 }], vitals: {} },
    { label: "Fungal skin", symptoms: [{ code: "fungal-skin", severity: 2 }], vitals: {} },
    { label: "Chest pain", symptoms: [{ code: "chest-pain", severity: 6 }],
      vitals: { heartRate: 112, spo2: 95, tempC: 36.8, systolic: 150, diastolic: 95 } }
  ]
};
