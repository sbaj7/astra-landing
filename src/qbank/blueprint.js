// USMLE content blueprint — derived from official USMLE specifications.
// See qbank/RESEARCH.md for sources. `weight` is the midpoint of the official
// percentage range and is used as the planner's base sampling probability.
// Each item is classified on three axes: system, discipline (clinical science),
// and physician task. The user picks Step + topic (system/specialty).

export const STEPS = [
  { key: 'step1', label: 'Step 1', blurb: 'Foundational science & mechanism' },
  { key: 'step2', label: 'Step 2 CK', blurb: 'Diagnosis & management' },
  { key: 'step3', label: 'Step 3', blurb: 'Independent practice & management' },
];

export const DIFFICULTIES = [
  { key: 'easy', label: 'Easy' },
  { key: 'medium', label: 'Medium' },
  { key: 'hard', label: 'Hard' },
  { key: 'mixed', label: 'Mixed' },
];

export const MODES = [
  { key: 'tutor', label: 'Tutor', blurb: 'Explanation after each question' },
  { key: 'timed', label: 'Timed', blurb: 'Explanations at the end' },
];

// ---- Systems (the "topic" axis the user picks from) ----
const STEP1_SYSTEMS = [
  { key: 'repro-endo', label: 'Reproductive & Endocrine', weight: 14 },
  { key: 'resp-renal', label: 'Respiratory & Renal/Urinary', weight: 13 },
  { key: 'behavioral-nervous', label: 'Behavioral & Nervous/Special Senses', weight: 12 },
  { key: 'blood-immune', label: 'Blood, Lymphoreticular & Immune', weight: 11 },
  { key: 'msk-skin', label: 'Musculoskeletal & Skin', weight: 10 },
  { key: 'multisystem', label: 'Multisystem Processes', weight: 10 },
  { key: 'cardiovascular', label: 'Cardiovascular', weight: 9 },
  { key: 'gastrointestinal', label: 'Gastrointestinal', weight: 8 },
  { key: 'biostats', label: 'Biostatistics & Epidemiology', weight: 5 },
  { key: 'human-development', label: 'Human Development', weight: 2 },
];

const STEP2_SYSTEMS = [
  { key: 'renal-repro', label: 'Renal/Urinary & Reproductive', weight: 10 },
  { key: 'cardiovascular', label: 'Cardiovascular', weight: 9 },
  { key: 'msk-skin', label: 'Musculoskeletal & Skin', weight: 9 },
  { key: 'behavioral', label: 'Behavioral Health', weight: 7 },
  { key: 'blood-immune', label: 'Blood & Immune', weight: 7 },
  { key: 'gastrointestinal', label: 'Gastrointestinal', weight: 7 },
  { key: 'nervous', label: 'Nervous System & Special Senses', weight: 7 },
  { key: 'respiratory', label: 'Respiratory', weight: 7 },
  { key: 'multisystem', label: 'Multisystem Processes', weight: 6 },
  { key: 'endocrine', label: 'Endocrine', weight: 5 },
  { key: 'pregnancy', label: 'Pregnancy & Childbirth', weight: 5 },
  { key: 'social-sciences', label: 'Ethics, Safety & Professionalism', weight: 12 },
  { key: 'biostats', label: 'Biostatistics & Epidemiology', weight: 4 },
];

const STEP3_SYSTEMS = [
  { key: 'biostats', label: 'Biostats, Epi & Literature', weight: 12 },
  { key: 'cardiovascular', label: 'Cardiovascular', weight: 10 },
  { key: 'respiratory', label: 'Respiratory', weight: 9 },
  { key: 'nervous', label: 'Nervous System & Special Senses', weight: 9 },
  { key: 'pregnancy-repro', label: 'Pregnancy & Reproductive', weight: 8 },
  { key: 'social-sciences', label: 'Communication, Ethics & Safety', weight: 8 },
  { key: 'gastrointestinal', label: 'Gastrointestinal', weight: 7 },
  { key: 'immune-blood', label: 'Immune, Blood & Multisystem', weight: 7 },
  { key: 'endocrine', label: 'Endocrine', weight: 6 },
  { key: 'msk', label: 'Musculoskeletal', weight: 6 },
  { key: 'skin', label: 'Skin & Subcutaneous', weight: 5 },
  { key: 'renal-male-repro', label: 'Renal/Urinary & Male Reproductive', weight: 5 },
  { key: 'behavioral', label: 'Behavioral Health', weight: 5 },
  { key: 'human-development', label: 'Human Development', weight: 2 },
];

// ---- Disciplines / Clinical Sciences (the "specialty" axis) ----
const STEP1_DISCIPLINES = [
  { key: 'pathology', label: 'Pathology', weight: 50 },
  { key: 'physiology', label: 'Physiology', weight: 35 },
  { key: 'pharmacology', label: 'Pharmacology', weight: 15 },
  { key: 'microbiology', label: 'Microbiology', weight: 15 },
  { key: 'anatomy', label: 'Anatomy & Embryology', weight: 15 },
  { key: 'biochemistry', label: 'Biochemistry', weight: 10 },
  { key: 'immunology', label: 'Immunology', weight: 10 },
  { key: 'behavioral', label: 'Behavioral Sciences', weight: 12 },
  { key: 'genetics', label: 'Genetics', weight: 7 },
];

const CLINICAL_SPECIALTIES = [
  { key: 'medicine', label: 'Internal Medicine', weight: 60 },
  { key: 'pediatrics', label: 'Pediatrics', weight: 22 },
  { key: 'obgyn', label: 'Obstetrics & Gynecology', weight: 15 },
  { key: 'psychiatry', label: 'Psychiatry', weight: 12 },
  { key: 'surgery', label: 'Surgery', weight: 10 },
];

// ---- Physician tasks (cognitive level) ----
const STEP1_TASKS = [
  { key: 'foundational', label: 'Foundational Science', weight: 65 },
  { key: 'diagnosis', label: 'Diagnosis', weight: 22 },
  { key: 'communication', label: 'Communication', weight: 8 },
  { key: 'pbli', label: 'Practice-based Learning', weight: 5 },
];

const STEP2_TASKS = [
  { key: 'diagnosis', label: 'Diagnosis', weight: 18 },
  { key: 'labs', label: 'Lab/Diagnostic Studies', weight: 15 },
  { key: 'management', label: 'Mixed Management', weight: 14 },
  { key: 'pharmacotherapy', label: 'Pharmacotherapy', weight: 10 },
  { key: 'interventions', label: 'Clinical Interventions', weight: 8 },
  { key: 'prevention', label: 'Health Maintenance', weight: 7 },
  { key: 'prognosis', label: 'Prognosis/Outcome', weight: 7 },
  { key: 'safety', label: 'Systems & Patient Safety', weight: 6 },
  { key: 'professionalism', label: 'Professionalism', weight: 6 },
  { key: 'pbli', label: 'Practice-based Learning', weight: 4 },
];

const STEP3_TASKS = [
  { key: 'diagnosis', label: 'Diagnosis', weight: 34 },
  { key: 'management', label: 'Management', weight: 33 },
  { key: 'pbli', label: 'Practice-based Learning', weight: 12 },
  { key: 'foundational', label: 'Foundational Science', weight: 11 },
  { key: 'communication', label: 'Communication & Safety', weight: 8 },
];

export const BLUEPRINT = {
  step1: { systems: STEP1_SYSTEMS, specialties: STEP1_DISCIPLINES, specialtyLabel: 'Discipline', tasks: STEP1_TASKS },
  step2: { systems: STEP2_SYSTEMS, specialties: CLINICAL_SPECIALTIES, specialtyLabel: 'Specialty', tasks: STEP2_TASKS },
  step3: { systems: STEP3_SYSTEMS, specialties: CLINICAL_SPECIALTIES, specialtyLabel: 'Specialty', tasks: STEP3_TASKS },
};

export const labelFor = (step, axis, key) => {
  const list = BLUEPRINT[step]?.[axis] || [];
  return list.find((x) => x.key === key)?.label ?? key;
};
