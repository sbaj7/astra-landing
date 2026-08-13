const source = (name, domain, reason) => ({ name, domain, reason });

export const RESEARCH_SOURCE_SNAPSHOT = Object.freeze({
  edgeFunction: 'quick-api',
  version: 539,
  verifiedOn: 'August 13, 2026',
});

export const RESEARCH_SOURCE_GROUPS = [
  {
    id: 'general-medicine',
    name: 'General medicine',
    description: 'Flagship journals and clinically focused reviews with broad relevance across specialties.',
    sources: [
      source('The New England Journal of Medicine', 'nejm.org', 'Selected for landmark trials, practice-changing original research, and authoritative clinical reviews.'),
      source('The Lancet', 'thelancet.com', 'Selected for high-impact international trials, systematic evidence, and global clinical perspective.'),
      source('JAMA Network', 'jamanetwork.com', 'Selected for rigorous clinical research, guidelines, and specialty journals across the full care continuum.'),
      source('The BMJ', 'bmj.com', 'Selected for clinically actionable research, evidence synthesis, and transparent reporting standards.'),
      source('Annals of Internal Medicine', 'annals.org', 'Selected for internal-medicine trials, systematic reviews, and evidence directly applicable to patient care.'),
      source('ACP Journals', 'acpjournals.org', 'Selected as the American College of Physicians publishing home for guidelines and general-medicine evidence.'),
      source('Cleveland Clinic Journal of Medicine', 'ccjm.org', 'Selected for concise, clinically oriented reviews that translate evidence into diagnostic and treatment decisions.'),
    ],
  },
  {
    id: 'cardiology',
    name: 'Cardiology',
    description: 'Major cardiovascular journals and professional societies used for trials, standards, and guidelines.',
    sources: [
      source('American Heart Association Journals', 'ahajournals.org', 'Selected for cardiovascular trials, scientific statements, and specialty evidence across heart and vascular disease.'),
      source('American College of Cardiology', 'acc.org', 'Selected for US cardiovascular guidelines, expert consensus pathways, and practice-focused clinical updates.'),
      source('European Society of Cardiology', 'escardio.org', 'Selected for European cardiovascular guidelines, consensus documents, and international standards of care.'),
      source('Journal of the American College of Cardiology', 'jacc.org', 'Selected for high-impact cardiovascular trials, imaging, prevention, heart failure, and interventional evidence.'),
    ],
  },
  {
    id: 'pulmonary-critical-care',
    name: 'Pulmonary & critical care',
    description: 'Specialty journals and societies covering respiratory disease, ventilation, and critical illness.',
    sources: [
      source('American Thoracic Society Journals', 'atsjournals.org', 'Selected for pulmonary and critical-care trials, official statements, and respiratory practice guidelines.'),
      source('Thorax', 'thorax.bmj.com', 'Selected for high-quality respiratory medicine research spanning airway disease, infection, sleep, and critical care.'),
      source('CHEST', 'chestnet.org', 'Selected for chest-medicine guidelines, expert panels, and clinically practical pulmonary and critical-care evidence.'),
    ],
  },
  {
    id: 'infectious-disease-public-health',
    name: 'Infectious disease & public health',
    description: 'Clinical society guidance and public-health authorities for infectious disease, surveillance, and prevention.',
    sources: [
      source('Infectious Diseases Society of America', 'idsociety.org', 'Selected for specialist-authored infectious-disease guidelines and antimicrobial treatment recommendations.'),
      source('Centers for Disease Control and Prevention', 'cdc.gov', 'Selected for US surveillance, prevention guidance, immunization recommendations, and public-health advisories.'),
      source('World Health Organization', 'who.int', 'Selected for global disease guidance, public-health standards, and evidence relevant across health systems.'),
      source('HIV.gov', 'hiv.gov', 'Selected for current US HIV prevention, testing, treatment, and federal guideline access.'),
    ],
  },
  {
    id: 'endocrinology-metabolism',
    name: 'Endocrinology & metabolism',
    description: 'Society journals and guidance for diabetes, endocrine disease, and thyroid care.',
    sources: [
      source('American Diabetes Association Journals', 'diabetesjournals.org', 'Selected for diabetes standards, major therapeutic trials, and metabolic outcomes research.'),
      source('Endocrine Society', 'endocrine.org', 'Selected for endocrine clinical-practice guidelines and expert recommendations across hormonal disorders.'),
      source('American Thyroid Association', 'thyroid.org', 'Selected for thyroid-disease guidelines, consensus statements, and specialist educational evidence.'),
    ],
  },
  {
    id: 'gastroenterology-hepatology',
    name: 'Gastroenterology & hepatology',
    description: 'Leading journals and societies for digestive disease, liver disease, and endoscopy.',
    sources: [
      source('Gastroenterology', 'gastrojournal.org', 'Selected for high-impact digestive-disease trials, translational research, and clinical reviews.'),
      source('Gut', 'gut.bmj.com', 'Selected for rigorous gastroenterology and hepatology research with strong clinical relevance.'),
      source('American Association for the Study of Liver Diseases', 'aasld.org', 'Selected for US hepatology practice guidance, consensus statements, and liver-disease standards.'),
      source('European Association for the Study of the Liver', 'easl.eu', 'Selected for European liver-disease guidelines and internationally used hepatology recommendations.'),
      source('American College of Gastroenterology', 'acg.gi.org', 'Selected for practical US gastroenterology guidelines and evidence-based clinical recommendations.'),
    ],
  },
  {
    id: 'nephrology',
    name: 'Nephrology',
    description: 'Kidney journals and professional-society guidance, including current and legacy publication routes.',
    sources: [
      source('Kidney International', 'kidney-international.org', 'Selected for major nephrology trials, kidney-disease reviews, and International Society of Nephrology research.'),
      source('Clinical Journal of the American Society of Nephrology', 'cjasn.asnjournals.org', 'Selected for clinically focused kidney research, outcomes evidence, and nephrology practice reviews.'),
      source('ASN Online — legacy route', 'asnonline.org', 'Retained to recognize older nephrology links while current American Society of Nephrology content is covered separately.'),
      source('American Society of Nephrology', 'asn-online.org', 'Selected for current kidney guidance, education, policy, and links to ASN peer-reviewed journals.'),
    ],
  },
  {
    id: 'neurology-stroke',
    name: 'Neurology & stroke',
    description: 'Specialty evidence for neurologic disease, cerebrovascular care, and neuroscience.',
    sources: [
      source('Neurology', 'neurology.org', 'Selected for American Academy of Neurology research, practice guidelines, and clinical neuroscience.'),
      source('Stroke', 'stroke.ahajournals.org', 'Selected for cerebrovascular trials, prevention evidence, acute stroke care, and recovery research.'),
      source('Brain — legacy Oxford route', 'brain.oxfordjournals.org', 'Retained for indexed legacy links to Brain and its peer-reviewed clinical neuroscience archive.'),
    ],
  },
  {
    id: 'hematology-oncology',
    name: 'Hematology & oncology',
    description: 'Professional societies and peer-reviewed journals for cancer care and blood disorders.',
    sources: [
      source('ASCO Publications', 'ascopubs.org', 'Selected for oncology trials, practice guidelines, and evidence shaping cancer treatment decisions.'),
      source('American Society of Hematology Publications', 'ashpublications.org', 'Selected for hematology trials, disease reviews, and evidence from the field’s leading professional society.'),
      source('European Society for Medical Oncology', 'esmo.org', 'Selected for European oncology guidelines, consensus recommendations, and international standards of cancer care.'),
    ],
  },
  {
    id: 'rheumatology',
    name: 'Rheumatology',
    description: 'Journals and society guidance for inflammatory, autoimmune, and musculoskeletal disease.',
    sources: [
      source('Annals of the Rheumatic Diseases', 'ard.bmj.com', 'Selected for high-impact rheumatology trials, recommendations, and inflammatory-disease outcomes.'),
      source('American College of Rheumatology', 'rheumatology.org', 'Selected for US rheumatology guidelines, classification criteria, and treatment recommendations.'),
      source('EULAR', 'eular.org', 'Selected for European rheumatology recommendations and internationally adopted disease-management standards.'),
    ],
  },
  {
    id: 'allergy-immunology',
    name: 'Allergy & immunology',
    description: 'Core journals for allergic disease, asthma, immune disorders, and practice implementation.',
    sources: [
      source('Journal of Allergy and Clinical Immunology', 'jacionline.org', 'Selected for foundational and clinical allergy-immunology research, mechanisms, and major trials.'),
      source('JACI: In Practice', 'jaci-inpractice.org', 'Selected for evidence focused on real-world allergy and immunology diagnosis, treatment, and implementation.'),
    ],
  },
  {
    id: 'obstetrics-gynecology',
    name: 'Obstetrics & gynecology',
    description: 'Journals and professional colleges covering maternal, fetal, and reproductive care.',
    sources: [
      source('American Journal of Obstetrics & Gynecology', 'ajog.org', 'Selected for maternal-fetal medicine, reproductive health, and practice-changing obstetric and gynecologic research.'),
      source('Wiley Obstetrics & Gynecology', 'obgyn.onlinelibrary.wiley.com', 'Selected for peer-reviewed obstetric and gynecologic journals hosted within Wiley’s specialty collection.'),
      source('Royal College of Obstetricians and Gynaecologists', 'rcog.org.uk', 'Selected for evidence-based UK guidance in pregnancy, childbirth, and gynecologic care.'),
      source('Society of Obstetricians and Gynaecologists of Canada', 'sogc.org', 'Selected for Canadian clinical-practice guidelines across obstetrics, gynecology, and reproductive health.'),
    ],
  },
  {
    id: 'pediatrics',
    name: 'Pediatrics',
    description: 'American Academy of Pediatrics publications across current and legacy journal hosts.',
    sources: [
      source('AAP Publications — legacy route', 'aappublications.org', 'Retained for older indexed links to American Academy of Pediatrics journals and policy statements.'),
      source('American Academy of Pediatrics Publications', 'publications.aap.org', 'Selected for current pediatric guidelines, policy statements, trials, and specialty journal content.'),
    ],
  },
  {
    id: 'emergency-medicine',
    name: 'Emergency medicine',
    description: 'Evidence and policy for acute evaluation, resuscitation, and emergency-department care.',
    sources: [
      source('Annals of Emergency Medicine', 'annemergmed.com', 'Selected for emergency-care trials, diagnostic strategies, policy research, and clinical reviews.'),
      source('American College of Emergency Physicians', 'acep.org', 'Selected for emergency-medicine clinical policies, consensus guidance, and bedside practice standards.'),
    ],
  },
  {
    id: 'surgery',
    name: 'Surgery',
    description: 'General and subspecialty surgical journals, societies, and standards of care.',
    sources: [
      source('Annals of Surgery', 'annalsofsurgery.com', 'Selected for high-impact surgical trials, outcomes research, and evidence shaping perioperative care.'),
      source('Journal of Thoracic and Cardiovascular Surgery', 'jtcvs.org', 'Selected for cardiothoracic surgical techniques, outcomes, trials, and consensus evidence.'),
      source('The Journal of Bone & Joint Surgery', 'jbjs.org', 'Selected for rigorous orthopedic trials, surgical outcomes, and musculoskeletal evidence.'),
      source('Arthroscopy Journal', 'arthroscopyjournal.org', 'Selected for minimally invasive orthopedic surgery, sports medicine, and procedural outcomes research.'),
      source('Neurosurgery', 'neurosurgery-online.com', 'Selected for neurosurgical trials, operative techniques, guidelines, and patient-outcomes evidence.'),
      source('American Society of Plastic Surgeons', 'plasticsurgery.org', 'Selected for specialty guidance, safety standards, and reconstructive and plastic-surgery evidence.'),
      source('American College of Surgeons', 'facs.org', 'Selected for surgical quality standards, trauma guidance, perioperative programs, and professional consensus.'),
    ],
  },
  {
    id: 'radiology',
    name: 'Radiology',
    description: 'Imaging journals and society publications for diagnostic interpretation and image-guided care.',
    sources: [
      source('RSNA Journals', 'pubs.rsna.org', 'Selected for peer-reviewed radiology research, imaging standards, and clinically relevant technical evidence.'),
      source('American Journal of Neuroradiology', 'ajnr.org', 'Selected for neuroimaging research, diagnostic performance, and image-guided neurologic care.'),
      source('RadioGraphics', 'radiographics.rsna.org', 'Selected for authoritative imaging reviews and pattern-based education with direct diagnostic utility.'),
    ],
  },
  {
    id: 'ophthalmology',
    name: 'Ophthalmology',
    description: 'Core clinical and vision-science journals for eye disease and ophthalmic care.',
    sources: [
      source('Ophthalmology', 'aaojournal.org', 'Selected as the American Academy of Ophthalmology’s flagship source for clinical eye research and reviews.'),
      source('Investigative Ophthalmology & Visual Science', 'iovs.arvojournals.org', 'Selected for foundational and translational vision science that informs ophthalmic disease mechanisms.'),
    ],
  },
  {
    id: 'otolaryngology',
    name: 'Otolaryngology',
    description: 'Peer-reviewed and society evidence for ear, nose, throat, and head-and-neck care.',
    sources: [
      source('JAMA Otolaryngology–Head & Neck Surgery', 'jamaotolaryngology.com', 'Selected for clinically important ENT and head-and-neck research from the JAMA specialty archive.'),
      source('The Triological Society', 'triological.org', 'Selected for academic otolaryngology research and society publications including The Laryngoscope.'),
    ],
  },
  {
    id: 'urology',
    name: 'Urology',
    description: 'US and European specialty evidence for urologic diagnosis, procedures, and treatment.',
    sources: [
      source('American Urological Association Journals', 'auajournals.org', 'Selected for urology trials, procedural outcomes, and peer-reviewed specialty research.'),
      source('European Association of Urology', 'uroweb.org', 'Selected for frequently updated evidence-based EAU guidelines and international urologic standards.'),
    ],
  },
  {
    id: 'anesthesiology',
    name: 'Anesthesiology',
    description: 'Professional standards and specialty research for anesthesia, perioperative medicine, and pain.',
    sources: [
      source('American Society of Anesthesiologists', 'asahq.org', 'Selected for anesthesia practice guidelines, safety standards, and perioperative recommendations.'),
      source('British Journal of Anaesthesia', 'bjanaesthesia.org', 'Selected for high-impact anesthesia, perioperative, critical-care, and pain research.'),
    ],
  },
  {
    id: 'dermatology',
    name: 'Dermatology',
    description: 'Specialty journal evidence and professional guidance for skin disease and dermatologic care.',
    sources: [
      source('JAMA Dermatology', 'jamanetwork.com/journals/jamadermatology', 'Selected for rigorous clinical dermatology research, comparative effectiveness, and treatment outcomes.'),
      source('American Academy of Dermatology', 'aad.org', 'Selected for dermatology guidelines, consensus recommendations, and standards of clinical practice.'),
    ],
  },
  {
    id: 'evidence-regulators',
    name: 'Evidence databases & regulators',
    description: 'Systematic reviews, literature indexes, trial registries, and primary regulatory records.',
    sources: [
      source('Cochrane Library', 'cochranelibrary.com', 'Selected for methodologically rigorous systematic reviews and evidence syntheses across clinical interventions.'),
      source('NCBI, PubMed & PubMed Central', 'ncbi.nlm.nih.gov', 'Selected as the principal biomedical literature index and an open full-text archive for primary evidence.'),
      source('ClinicalTrials.gov', 'clinicaltrials.gov', 'Selected to verify trial design, status, registration, and reported outcomes; registration is not treated as peer review.'),
      source('European Medicines Agency', 'ema.europa.eu', 'Selected for European drug approvals, product information, safety communications, and regulatory assessments.'),
      source('U.S. Food and Drug Administration', 'fda.gov', 'Selected for labels, approvals, safety warnings, device information, and primary US regulatory decisions.'),
    ],
  },
  {
    id: 'multidisciplinary-publishers',
    name: 'Multidisciplinary publishers',
    description: 'Selective publishing platforms retained so high-quality hosted journals and migrated archives remain reachable.',
    sources: [
      source('Nature Portfolio', 'nature.com', 'Selected for high-impact biomedical research, translational science, and specialty journals across medicine.'),
      source('Science & AAAS Journals', 'science.org', 'Selected for major biomedical discoveries, translational research, and cross-disciplinary scientific evidence.'),
      source('ScienceDirect', 'sciencedirect.com', 'Selected as a host for established Elsevier medical journals; results remain subject to Astra’s clinical ranking.'),
      source('Cell Press', 'cell.com', 'Selected for influential biomedical, translational, and specialty research across the Cell Press portfolio.'),
      source('Oxford Academic', 'academic.oup.com', 'Selected to preserve access to society journals and archives now hosted by Oxford University Press.'),
      source('Lippincott Williams & Wilkins Journals', 'journals.lww.com', 'Selected to preserve access to established medical and surgical journals hosted on the LWW platform.'),
      source('Wiley Online Library', 'onlinelibrary.wiley.com', 'Selected to preserve access to vetted society journals and migrated specialty publications hosted by Wiley.'),
    ],
  },
];

export const RESEARCH_SOURCES = RESEARCH_SOURCE_GROUPS.flatMap((group) =>
  group.sources.map((entry) => ({ ...entry, groupId: group.id, groupName: group.name }))
);

export const RESEARCH_SOURCE_DOMAINS = RESEARCH_SOURCES.map(({ domain }) => domain);
export const RESEARCH_SOURCE_COUNT = RESEARCH_SOURCES.length;
