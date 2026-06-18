// NBME-style laboratory reference values (conventional units), grouped as on the
// official NBME lab values sheet. Used by the in-exam Lab Values panel.

export const LAB_SECTIONS = [
  {
    group: 'Serum',
    subs: [
      {
        title: 'Electrolytes & general chemistry',
        rows: [
          ['Sodium (Na⁺)', '136–146 mEq/L'],
          ['Potassium (K⁺)', '3.5–5.0 mEq/L'],
          ['Chloride (Cl⁻)', '95–105 mEq/L'],
          ['Bicarbonate (HCO₃⁻)', '22–28 mEq/L'],
          ['Urea nitrogen (BUN)', '7–18 mg/dL'],
          ['Creatinine', '0.6–1.2 mg/dL'],
          ['Glucose', 'Fasting 70–100; random <140 mg/dL'],
          ['Calcium', '8.4–10.2 mg/dL'],
          ['Magnesium (Mg²⁺)', '1.5–2.0 mg/dL'],
          ['Phosphorus (inorganic)', '3.0–4.5 mg/dL'],
          ['Osmolality', '275–295 mOsmol/kg'],
          ['Uric acid', '3.0–8.2 mg/dL'],
        ],
      },
      {
        title: 'Hepatic',
        rows: [
          ['ALT', '10–40 U/L'],
          ['AST', '12–38 U/L'],
          ['Alkaline phosphatase', '25–100 U/L'],
          ['Bilirubin, total / direct', '0.1–1.0 / 0.0–0.3 mg/dL'],
          ['Protein, total', '6.0–7.8 g/dL'],
          ['Albumin', '3.5–5.5 g/dL'],
          ['Globulin', '2.3–3.5 g/dL'],
          ['Amylase', '25–125 U/L'],
          ['Lipase', '13–60 U/L'],
        ],
      },
      {
        title: 'Cardiac / other',
        rows: [
          ['Troponin I', '≤0.04 ng/mL'],
          ['Creatine kinase', 'M 25–90; F 10–70 U/L'],
          ['Lactate dehydrogenase', '45–200 U/L'],
          ['Creatinine clearance', 'M 97–137; F 88–128 mL/min'],
        ],
      },
      {
        title: 'Lipids',
        rows: [
          ['Cholesterol, total', '<200 mg/dL (high >240)'],
          ['HDL', '40–60 mg/dL'],
          ['LDL', '<160 mg/dL'],
          ['Triglycerides', '<150 mg/dL'],
        ],
      },
      {
        title: 'Iron studies',
        rows: [
          ['Ferritin', 'M 20–250; F 10–120 ng/mL'],
          ['Iron', 'M 65–175; F 50–170 µg/dL'],
          ['TIBC', '250–400 µg/dL'],
          ['Transferrin', '200–360 mg/dL'],
        ],
      },
      {
        title: 'Endocrine',
        rows: [
          ['TSH', '0.4–4.0 µU/mL'],
          ['Thyroxine (T4)', '5–12 µg/dL'],
          ['Free T4', '0.9–1.7 ng/dL'],
          ['Triiodothyronine (T3)', '100–200 ng/dL'],
          ['Cortisol', '0800 h: 5–23 µg/dL'],
          ['Prolactin', 'M <17; F <25 ng/mL'],
          ['Intact PTH', '10–60 pg/mL'],
          ['Hemoglobin A1c', '≤6%'],
        ],
      },
      {
        title: 'Immunoglobulins',
        rows: [
          ['IgA', '76–390 mg/dL'],
          ['IgE', '0–380 IU/mL'],
          ['IgG', '650–1500 mg/dL'],
          ['IgM', '50–300 mg/dL'],
        ],
      },
    ],
  },
  {
    group: 'Arterial blood gas (room air)',
    subs: [
      {
        title: '',
        rows: [
          ['pH', '7.35–7.45'],
          ['PaO₂', '75–105 mm Hg'],
          ['PaCO₂', '33–45 mm Hg'],
        ],
      },
    ],
  },
  {
    group: 'Hematologic',
    subs: [
      {
        title: 'Complete blood count',
        rows: [
          ['Hematocrit', 'M 41–53%; F 36–46%'],
          ['Hemoglobin', 'M 13.5–17.5; F 12.0–16.0 g/dL'],
          ['Leukocyte count (WBC)', '4500–11,000/mm³'],
          ['Platelet count', '150,000–400,000/mm³'],
          ['MCV', '80–100 µm³'],
          ['MCH', '25–35 pg/cell'],
          ['MCHC', '31–36% Hb/cell'],
          ['Reticulocyte count', '0.5–1.5%'],
          ['RBC count', 'M 4.3–5.9; F 3.5–5.5 ×10⁶/mm³'],
          ['ESR (Westergren)', 'M 0–15; F 0–20 mm/h'],
          ['CD4⁺ count', '≥500/mm³'],
        ],
      },
      {
        title: 'WBC differential',
        rows: [
          ['Segmented neutrophils', '54–62%'],
          ['Bands', '3–5%'],
          ['Lymphocytes', '25–33%'],
          ['Monocytes', '3–7%'],
          ['Eosinophils', '1–3%'],
          ['Basophils', '0–0.75%'],
        ],
      },
      {
        title: 'Coagulation',
        rows: [
          ['PTT (activated)', '25–40 seconds'],
          ['Prothrombin time (PT)', '11–15 seconds'],
          ['D-dimer', '≤250 ng/mL'],
        ],
      },
    ],
  },
  {
    group: 'Cerebrospinal fluid',
    subs: [
      {
        title: '',
        rows: [
          ['Cell count', '0–5/mm³'],
          ['Glucose', '40–70 mg/dL'],
          ['Protein, total', '<40 mg/dL'],
          ['Pressure', '70–180 mm H₂O'],
          ['Chloride', '118–132 mEq/L'],
        ],
      },
    ],
  },
  {
    group: 'Urine & other',
    subs: [
      {
        title: '',
        rows: [
          ['Calcium', '100–300 mg/24 h'],
          ['Osmolality', '50–1200 mOsmol/kg'],
          ['Protein, total', '<150 mg/24 h'],
          ['Body mass index (BMI)', 'Adult 19–25 kg/m²'],
        ],
      },
    ],
  },
];
