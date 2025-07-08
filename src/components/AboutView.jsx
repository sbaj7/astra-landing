import React from 'react';
import { X } from 'lucide-react';

// Markdown parser for basic formatting
const parseMarkdown = (text) => {
  let html = text;
  
  // Headers
  html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');
  html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
  html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
  
  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  
  // Code
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
};

const AboutView = ({ isPresented, onDismiss, theme }) => {
  const aboutMarkdown = `# About **Astra**
*A unified medical intelligence workspace for bedside decision‑making*

---

## Clinical Rationale
Busy clinicians encounter four persistent pain‑points at the bedside:
1. **Evidence retrieval** — "What does the most relevant guideline or RCT say for *this* patient?"
2. **Diagnostic reasoning** — weighing pre‑test probability, likelihood ratios, and competing differentials in real time.
3. **Therapeutic planning** — translating evidence into concise, actionable orders the team can follow.
4. **Documentation** — producing a note that stands up to attending‑level scrutiny.

Astra brings these steps together in a HIPAA‑aligned interface backed by retrieval‑augmented language models and structured citation checks.

## What You Can Do Today

**Search** — Pose PICO‑style questions like *"For septic shock in adults, does early vasopressin improve mortality?"*  
Astra returns a succinct synthesis of landmark trials and systematic reviews with inline PubMed IDs.

**Reason** — Feed an undifferentiated presentation (e.g., dyspnea in the ED). Astra outputs a Bayesian differential with pre‑/post‑test probabilities, recommended next tests, and a problem‑oriented Plan referencing seminal studies (ARDSnet, PROSEVA).

**Write** — Convert a bedside impression—such as a post‑op Day 2 update—into a structured Assessment & Plan that includes suggested orders, monitoring parameters, and follow‑up labs.

## Under the Hood

* **Retrieval‑augmented reasoning** — Queries are decomposed into PICO elements, matched against ~500 embedded landmark trials using cosine similarity, then fed into transformer models tuned for clinical tasks.
* **Evidence linker** — Every recommendation must cite a verifiable PMID or DOI; responses fail validation if a citation cannot be matched.
* **Bayesian engine** — Likelihood ratios and prevalence estimates are converted into post‑test probabilities inline.
* **Data & auth** — Chat history and embeddings reside in an encrypted relational store with row‑level security; all API calls are gated by OpenID‑Connect SSO tokens.

## Security & Compliance

**Transport** — TLS 1.3 on every hop  
**Storage** — AES‑256 encryption at rest; daily encrypted backups  
**Access** — role‑based policies, row‑level security  
**Runtime** — isolated server‑side execution; secrets never leave the server  
**Audit** — immutable logs retained ≥ 30 days

## Current Limitations

* Ultra‑rare adverse effects and local formulary nuances may be missing—**verify critical orders**.
* The literature index refreshes every few hours; very recent pre‑prints may not appear immediately.
* Astra supplements clinical judgment; it does not override institutional policy.

## Roadmap

* Bidirectional EHR connector for one‑click note insertion and order drafts.
* Real‑time drug–drug interaction checker within the Plan.
* Practice‑gap analytics derived from de‑identified usage trends.

---
Astra exists to lighten cognitive load: faster evidence, clearer reasoning, and notes that withstand peer review.

---

## Business & Contact
**Astraeus Intelligence LLC**  
254 Chapman Rd, Ste 208 #22873  
Newark, Delaware 19702  

**Email:** support@astramd.org`;

  if (!isPresented) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onDismiss}
    >
      <div 
        className="w-full max-w-4xl h-5/6 rounded-xl overflow-hidden shadow-2xl"
        style={{ backgroundColor: theme.backgroundSurface }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: `${theme.textSecondary}20` }}
        >
          <h1 
            className="text-lg font-semibold"
            style={{ color: theme.textPrimary }}
          >
            About
          </h1>
          <button
            onClick={onDismiss}
            className="p-2 rounded-lg hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
          >
            <X size={20} color={theme.textPrimary} />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto h-full p-6">
          <div 
            className="prose max-w-none"
            style={{ color: theme.textPrimary }}
            dangerouslySetInnerHTML={{ 
              __html: parseMarkdown(aboutMarkdown) 
            }}
          />
        </div>

        {/* Custom styles for markdown content */}
        <style jsx>{`
          .prose h1 {
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 0.5rem;
            color: ${theme.textPrimary};
          }
          
          .prose h2 {
            font-size: 1.5rem;
            font-weight: 600;
            margin-top: 2rem;
            margin-bottom: 1rem;
            color: ${theme.textPrimary};
          }
          
          .prose h3 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            color: ${theme.textPrimary};
          }
          
          .prose p {
            margin-bottom: 1rem;
            line-height: 1.6;
            color: ${theme.textPrimary};
          }
          
          .prose strong {
            font-weight: 600;
            color: ${theme.textPrimary};
          }
          
          .prose em {
            font-style: italic;
            color: ${theme.textSecondary};
          }
          
          .prose code {
            background-color: ${theme.textSecondary}20;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: monospace;
            font-size: 0.875rem;
            color: ${theme.textPrimary};
          }
          
          .prose hr {
            border: none;
            border-top: 1px solid ${theme.textSecondary}30;
            margin: 2rem 0;
          }
          
          .prose ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin-bottom: 1rem;
          }
          
          .prose ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin-bottom: 1rem;
          }
          
          .prose li {
            margin-bottom: 0.5rem;
            line-height: 1.6;
            color: ${theme.textPrimary};
          }
          
          .prose br {
            line-height: 1.6;
          }
          
          /* Custom spacing */
          .prose > * {
            margin-bottom: 1rem;
          }
          
          .prose > h1:first-child {
            margin-top: 0;
          }
        `}</style>
      </div>
    </div>
  );
};

export default AboutView;