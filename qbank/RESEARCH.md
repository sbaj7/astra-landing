# USMLE Adaptive Q-Bank — Research Foundation

> Primary-source research backing the dynamic, AI-generated USMLE question bank.
> Sources are official USMLE/NBME documents (links at bottom). Percentages are
> "subject to change" per USMLE — re-verify against the live content outline before launch.

## Product summary (what we're building)

A medical Q-bank where **questions are generated live every session** (not served from a
static bank), the user **picks the Step (1 / 2 / 3) and topic (by specialty/system)** and a
session length (1–40, user's choice), and a **user dashboard** shows content-based
strengths/weaknesses so the engine can adapt (weakness-weighted generation) over time.

---

## 1. The three Steps

| | Step 1 | Step 2 CK | Step 3 |
|---|---|---|---|
| Tests | Foundational science applied to mechanism | Clinical knowledge: diagnosis + management | Independent practice: management over time |
| Cognitive core | "why" / mechanism | "next best step" / "most likely Dx" | initial vs subsequent management, across settings |
| Format | One-best-answer MCQ | One-best-answer MCQ | MCQ (FIP + ACM) **+ CCS interactive sims** |
| Scoring | Pass/Fail | 3-digit score | Pass/Fail |

## 2. Classification system (the spine of dynamic targeting)

USMLE classifies **every item on three independent dimensions at once** ("items are
deliberately designed to be integrative; many items are classified to more than one
discipline"). These three axes are our mastery taxonomy:

1. **System** (organ system / topic)
2. **Discipline / Clinical Science** (Step 1: path/physio/pharm…; Step 2–3: Medicine/Peds/OB-Gyn/Psych/Surgery)
3. **Physician Task / Competency** (Dx, management, pharmacotherapy, foundational-science, biostats, patient safety)

Track the user's hit-rate on **each axis-value independently** → true content-based
strengths/weaknesses, not one global score.

## 3. Blueprint weightings (planner sampling distribution)

### Step 1 — Systems
Repro & Endocrine 12–16% · Respiratory & Renal/Urinary 11–15% · Behavioral & Nervous/Special Senses 10–14% · Blood/Lymph/Immune 9–13% · MSK/Skin 8–12% · Multisystem 8–12% · Cardiovascular 7–11% · GI 6–10% · Biostats/Epi 4–6% · Human Development 1–3%
### Step 1 — Disciplines
Pathology 45–55% · Physiology 30–40% · Nutrition 15–20% · Anatomy/Embryo 10–20% · Micro 10–20% · Pharm 10–20% · Behavioral 10–15% · Biochem 5–15% · Histo 5–15% · Immuno 5–15% · Genetics 5–10%
### Step 1 — Physician Tasks
Applying Foundational Science 60–70% · Diagnosis 20–25% · Communication 6–9% · Practice-based Learning 4–6%

### Step 2 CK — Clinical Sciences
Medicine 55–65% · Pediatrics 17–27% · OB-Gyn 10–20% · Psychiatry 10–15% · Surgery 5–15%
### Step 2 CK — Physician Tasks
Diagnosis 16–20% · Lab/Diagnostic Studies 13–17% · Mixed Management 12–16% · Pharmacotherapy 8–12% · Clinical Interventions 6–10% · Health Maintenance/Prevention 5–10% · Prognosis 5–9% · Systems-based Practice & Patient Safety 5–7% · Professionalism 5–7% · Practice-based Learning 3–5%
### Step 2 CK — notable
Social Sciences (ethics/safety) 10–15% · Biostats 3–5%

### Step 3 — Physician Tasks
Diagnosis 33–36% · Management 32–35% · Practice-based Learning 11–13% · Applying Foundational Science 11–12% · Communication/Professionalism/Safety 7–9%
### Step 3 — Systems
Biostats/Epi/Lit Interpretation **11–13%** (highest of any Step) · Cardiovascular 9–11% · Respiratory 8–10% · Nervous & Special Senses 8–10% · Pregnancy/Repro 7–9% · Social Sciences 7–9% · GI 6–8% · Endocrine 5–7% · MSK 5–7% · Skin 4–6% · Renal/Urinary & Male Repro 4–6% · Behavioral 4–6% · Immune/Blood/Multisystem 6–8% · Human Development 1–3%

## 4. Question formats

**One-best-answer (all Steps).** Anatomy: **stem** (clinical vignette) → **lead-in** (one
focused question) → **3–7 options**, one best answer. Vignette order is fixed:
**demographics → history → physical exam → labs/imaging**; bulk of text precedes the lead-in.

**Step 3 FIP special formats:** items built on **scientific abstracts**, **pharmaceutical
advertisements**, and **biostatistics / medical-literature** interpretation (drives Step 3's
11–13% biostats weight). Each needs its own generator template (synthesize the abstract/ad as stem).

**Step 3 CCS (Day 2 — separate module).** Interactive, time-advancing patient sim:
- Free-text **order entry** (system matches first 3 chars of order name).
- User must **advance the simulated clock** to see results / observe treatment effects.
- **Patient state evolves** from disease course + management.
- User can **change setting**: office / ED / inpatient / ICU / home.
- Scoring spans **diagnosis, therapy, monitoring, timing, sequencing, location** — beneficial
  actions credit; unnecessary/harmful actions penalize.
- It's a stateful patient-engine, not a question. **V2 module.**

## 5. NBME item-writing rules (the author prompt)

- **Cover-the-options rule:** a competent test-taker should answer from vignette + lead-in
  *without seeing the options*. Automated gate: a fresh model attempts the item with options hidden.
- **Distractors:** **homogeneous** with the answer (same category), **plausible** to someone
  with partial knowledge, on a **single continuum**. NBME example: answer = community-acquired
  pneumonia; good distractors = PE, lung cancer, pneumothorax.
- **Tests application, not recall** — the vignette forces reasoning.

## 6. Technical-flaw taxonomy (critic / fact-check rejection rubric)

**Testwiseness flaws (cue the answer):** grammatical cues, absolute terms ("always/never") in
distractors, longest-option-correct, convergence (answer shares words with several options),
specific determiners.
**Irrelevant-difficulty flaws (hard for the wrong reason):** vague terms, "none/all of the
above," negatively-phrased stems ("except/not"), unfamiliar synonyms/obscure vocabulary,
implausibly-wrong distractors.

This list is the literal rubric for the distractor-critic and flaw-screen stages.

## 7. Architecture (live generation + dynamic targeting)

**Generation pipeline** (per item, runs ahead of the user via a prefetch buffer):
1. Retrieve grounding passages (Astra RAG) weighted by Step (Step 1 → mechanism/textbook;
   Step 2–3 → guidelines/trials).
2. **Author** (Opus 4.8, structured output) → item JSON grounded only on retrieved passages.
3. **Distractor critic** (fresh context) → homogeneous, plausible distractors + per-option reason.
4. **Fact-check / flaw gate** (cheaper model + retrieval) → cite-or-reject every clinical claim;
   reject on any §6 flaw; run cover-the-options check.
5. **Pre-screen** → difficulty estimate + semantic dedupe vs session + persisted bank.

**Latency:** generate N+1/N+2 while the user answers N (prefetch buffer 2–3). Cache the
invariant prefix (NBME ruleset + style guide + schema). Tier models (Opus author/critic,
Sonnet/Haiku gate). Batch / fan-out for timed mode.

**Persist anyway:** save every generated item + responses keyed by content hash — gives a
calibration flywheel (Elo/IRT on re-seen items), an instant-serve fallback, and "harder
variant of the one you missed."

**Dynamic targeting:**
- Tag every item on all three axes + Step + difficulty.
- `user_skill = (user_id, step, axis, axis_value) → mastery`. Three running estimates per item.
- Planner samples weak cells **constrained to the blueprint**: `P(cell) ∝ blueprint_weight × (1 − mastery)`,
  so a Step 2 set still looks like Step 2 while over-weighting the user's weak areas.
- Difficulty calibrated per Step ("hard Step 1" ≠ "hard Step 3").

## 8. Data model

- `items`: step, vignette, lead_in, options[], answer_index, per_option_rationale[],
  teaching_point, citations[], system, discipline, task, difficulty, content_hash, generator_version, status.
- `responses`: user_id, item_id, step, chosen_index, correct, latency_ms, confidence, ts.
- `user_skill`: user_id, step, axis, axis_value, mastery, attempts, last_seen, due_at.
- `item_stats`: exposure, p_correct, option_distribution, point_biserial, elo/irt_b.

## Sources

- USMLE Step 1 Content Outline & Specifications — https://www.usmle.org/exam-resources/step-1-materials/step-1-content-outline-and-specifications
- USMLE Step 2 CK Content Outline & Specifications — https://www.usmle.org/exam-resources/step-2-ck-materials/step-2-ck-content-outline-specifications
- USMLE Step 3 Content Outline & Specifications — https://www.usmle.org/exam-resources/step-3-materials/step-3-content-outline-and-specifications
- USMLE Step 3 Exam Content (FIP/ACM) — https://www.usmle.org/step-exams/step-3/step-3-exam-content
- USMLE Computer-based Case Simulations (CCS) — https://www.usmle.org/exam-resources/step-3-materials/step-3-test-question-formats/computer-based-case-simulations
- NBME Item-Writing Guide — https://www.nbme.org/sites/default/files/2021-02/NBME_Item%20Writing%20Guide_R_6.pdf
- Public USMLE Content Outline (PDF) — https://www.usmle.org/sites/default/files/2022-01/USMLE_Content_Outline_0.pdf
- USMLE Physician Tasks/Competencies (PDF) — https://www.usmle.org/sites/default/files/2022-01/USMLE_Physician_Tasks_Competencies_2.pdf
