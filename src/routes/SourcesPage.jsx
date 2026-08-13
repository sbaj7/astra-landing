import React, { useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../components/Themes+Styles.jsx';
import {
  RESEARCH_SOURCE_COUNT,
  RESEARCH_SOURCE_GROUPS,
  RESEARCH_SOURCE_SNAPSHOT,
} from '../data/researchSources.js';
import './SourcesPage.css';

const faviconUrl = (domain) => {
  const host = domain.split('/')[0];
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
};

const sourceHref = (domain) => `https://${domain}`;

const SourcesPage = () => {
  const navigate = useNavigate();
  const { colors: theme, isDark } = useTheme();
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    if (!normalizedQuery) return RESEARCH_SOURCE_GROUPS;

    return RESEARCH_SOURCE_GROUPS.map((group) => ({
      ...group,
      sources: group.sources.filter((entry) =>
        [entry.name, entry.domain, entry.reason, group.name]
          .some((value) => value.toLowerCase().includes(normalizedQuery))
      ),
    })).filter((group) => group.sources.length > 0);
  }, [normalizedQuery]);

  const visibleSourceCount = visibleGroups.reduce((total, group) => total + group.sources.length, 0);

  return (
    <div
      className="sources-page"
      data-theme={isDark ? 'dark' : 'light'}
      style={{
        '--sources-bg': theme.backgroundPrimary,
        '--sources-surface': theme.backgroundSurface,
        '--sources-text': theme.textPrimary,
        '--sources-muted': theme.textSecondary,
        '--sources-accent': theme.accentSoftBlue,
        '--sources-border': `${theme.textSecondary}1A`,
        '--sources-border-strong': `${theme.textSecondary}2E`,
        '--sources-accent-soft': `${theme.accentSoftBlue}12`,
      }}
    >
      <header className="sources-page__topbar">
        <button type="button" onClick={() => navigate('/')} aria-label="Back to Astra">
          <ArrowLeft size={16} />
          Astra
        </button>
        <span>Source catalog</span>
      </header>

      <main className="sources-page__main">
        <section className="sources-page__hero">
          <p className="sources-page__eyebrow">Research sources</p>
          <h1>Evidence begins with where you look.</h1>
          <p className="sources-page__lede">
            Astra Research searches a deliberately constrained set of peer-reviewed journals,
            professional societies, evidence databases, trial registries, and regulators. Every
            result must match this production allowlist before it can reach the answer.
          </p>

          <div className="sources-page__metrics" aria-label="Source catalog summary">
            <div>
              <strong>{RESEARCH_SOURCE_COUNT}</strong>
              <span>approved routes</span>
            </div>
            <div>
              <strong>{RESEARCH_SOURCE_GROUPS.length}</strong>
              <span>clinical categories</span>
            </div>
            <div>
              <strong>Strict</strong>
              <span>domain allowlist</span>
            </div>
          </div>
        </section>

        <section className="sources-page__method" aria-labelledby="sources-method-title">
          <div className="sources-page__method-mark">
            <ShieldCheck size={24} strokeWidth={1.6} />
          </div>
          <div>
            <p className="sources-page__eyebrow">How selection works</p>
            <h2 id="sources-method-title">Trusted by design, not by accident.</h2>
            <p>
              Search results outside this list are discarded. Within it, flagship journals receive
              higher retrieval priority, but inclusion never substitutes for appraisal: Astra still
              weighs study design, recency, relevance, and applicability, then attaches the underlying
              citation so you can inspect it yourself.
            </p>
          </div>
        </section>

        <section className="sources-page__directory" aria-labelledby="sources-directory-title">
          <div className="sources-page__directory-header">
            <div>
              <p className="sources-page__eyebrow">The directory</p>
              <h2 id="sources-directory-title">Every approved research source.</h2>
              <p>
                A source may be a journal, society, repository, regulator, or publishing host.
                Publisher-level routes are retained only to reach established medical journals.
              </p>
            </div>

            <label className="sources-page__search">
              <Search size={16} aria-hidden="true" />
              <span className="sources-page__sr-only">Search sources</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search journal, society, or specialty"
              />
              <span>{visibleSourceCount}</span>
            </label>
          </div>

          <div className="sources-page__groups">
            {visibleGroups.map((group, groupIndex) => (
              <section className="sources-page__group" key={group.id} aria-labelledby={`${group.id}-title`}>
                <div className="sources-page__group-heading">
                  <span>{String(groupIndex + 1).padStart(2, '0')}</span>
                  <div>
                    <h3 id={`${group.id}-title`}>{group.name}</h3>
                    <p>{group.description}</p>
                  </div>
                  <strong>{group.sources.length}</strong>
                </div>

                <div className="sources-page__source-list">
                  {group.sources.map((entry) => (
                    <article className="sources-page__source" key={entry.domain}>
                      <div className="sources-page__source-identity">
                        <img
                          src={faviconUrl(entry.domain)}
                          alt=""
                          width="32"
                          height="32"
                          loading="lazy"
                          onError={(event) => { event.currentTarget.style.visibility = 'hidden'; }}
                        />
                        <div>
                          <h4>{entry.name}</h4>
                          <a href={sourceHref(entry.domain)} target="_blank" rel="noreferrer">
                            {entry.domain}
                            <ArrowUpRight size={12} />
                          </a>
                        </div>
                      </div>
                      <p>{entry.reason}</p>
                    </article>
                  ))}
                </div>
              </section>
            ))}

            {visibleGroups.length === 0 && (
              <div className="sources-page__empty">
                <strong>No approved source matches “{query}”.</strong>
                <button type="button" onClick={() => setQuery('')}>Clear search</button>
              </div>
            )}
          </div>
        </section>

        <footer className="sources-page__footer">
          <div>
            <strong>Production source policy</strong>
            <span>
              Verified against Astra’s live Supabase {RESEARCH_SOURCE_SNAPSHOT.edgeFunction} function
              {' '}v{RESEARCH_SOURCE_SNAPSHOT.version} · {RESEARCH_SOURCE_SNAPSHOT.verifiedOn}
            </span>
          </div>
          <p>
            Inclusion means Astra may retrieve from this route. It does not mean every page is
            peer reviewed, every study is equally strong, or any source is accepted without citation-level review.
          </p>
        </footer>
      </main>
    </div>
  );
};

export default SourcesPage;
