function StatusBadge({ status }) {
  const s = (status || '').toUpperCase();
  let cls = 'unknown';
  let label = status || 'Unknown';

  if (s === 'RECRUITING') { cls = 'recruiting'; label = 'Recruiting'; }
  else if (s === 'COMPLETED') { cls = 'completed'; label = 'Completed'; }
  else if (s === 'ACTIVE_NOT_RECRUITING') { cls = 'active'; label = 'Active'; }
  else if (s === 'NOT_YET_RECRUITING') { cls = 'active'; label = 'Not yet recruiting'; }

  return <span className={`trial-status ${cls}`}>{label}</span>;
}

function PublicationCard({ pub, index }) {
  return (
    <div className="pub-card">
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--accent)',
          background: 'rgba(59,158,255,0.1)', padding: '2px 6px',
          borderRadius: 4, flexShrink: 0, marginTop: 1
        }}>
          P{index + 1}
        </span>
        <p className="pub-card-title">{pub.title}</p>
      </div>

      <div className="pub-card-meta">
        <span className={`source-badge ${pub.source === 'PubMed' ? 'pubmed' : 'openalex'}`}>
          {pub.source}
        </span>
        {pub.year && <span>{pub.year}</span>}
        {pub.authors && pub.authors.length > 0 && (
          <span style={{ color: 'var(--text3)' }}>
            {pub.authors[0]}{pub.authors.length > 1 ? ` +${pub.authors.length - 1}` : ''}
          </span>
        )}
      </div>

      {pub.snippet && (
        <p className="pub-card-snippet">{pub.snippet}...</p>
      )}

      {pub.url && (
        <a href={pub.url} target="_blank" rel="noopener noreferrer" className="pub-link">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Read paper
        </a>
      )}
    </div>
  );
}

function TrialCard({ trial, index }) {
  return (
    <div className="trial-card">
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: 'var(--teal)',
          background: 'rgba(45,212,180,0.1)', padding: '2px 6px',
          borderRadius: 4, flexShrink: 0, marginTop: 1
        }}>
          T{index + 1}
        </span>
        <p className="trial-card-title">{trial.title}</p>
      </div>

      <StatusBadge status={trial.recruitingStatus} />

      <div className="trial-meta" style={{ marginTop: 8 }}>
        {trial.phase && trial.phase !== 'N/A' && (
          <p><strong>Phase:</strong> {trial.phase}</p>
        )}
        {trial.sponsor && (
          <p><strong>Sponsor:</strong> {trial.sponsor}</p>
        )}
        {trial.eligibility && (
          <p>
            <strong>Eligibility:</strong>{' '}
            {[
              trial.eligibility.sex && trial.eligibility.sex !== 'ALL' ? trial.eligibility.sex : null,
              trial.eligibility.minAge ? `Age ${trial.eligibility.minAge}` : null,
              trial.eligibility.maxAge ? `– ${trial.eligibility.maxAge}` : null,
            ].filter(Boolean).join(' ') || 'All eligible'}
          </p>
        )}
        {trial.locations && trial.locations.length > 0 && (
          <p>
            <strong>Location:</strong>{' '}
            {trial.locations[0].city}{trial.locations[0].country ? `, ${trial.locations[0].country}` : ''}
          </p>
        )}
        {trial.contact && trial.contact.email && (
          <p><strong>Contact:</strong> {trial.contact.email}</p>
        )}
      </div>

      {trial.nctId && (
        <a
          href={trial.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pub-link"
          style={{ marginTop: 8, display: 'inline-flex', color: 'var(--teal)' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/>
            <line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          {trial.nctId} →
        </a>
      )}
    </div>
  );
}

export default function SourcesPanel({ sources }) {
  const pubs = sources?.publications || [];
  const trials = sources?.clinicalTrials || [];
  const total = pubs.length + trials.length;

  return (
    <div className="sources-panel">
      <div className="sources-header">
        {total > 0 ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2" style={{ marginRight: 8, verticalAlign: 'middle' }}>
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {total} sources retrieved
          </>
        ) : (
          'Sources'
        )}
      </div>

      {total === 0 ? (
        <div className="sources-empty">
          <svg className="sources-empty-icon" viewBox="0 0 24 24" fill="none" stroke="var(--text3)" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          <p>Sources will appear here after you send a message. Each response pulls from PubMed, OpenAlex, and ClinicalTrials.gov.</p>
        </div>
      ) : (
        <div className="sources-content">
          {pubs.length > 0 && (
            <div>
              <p className="sources-section-title">
                Publications ({pubs.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pubs.map((pub, i) => (
                  <PublicationCard key={i} pub={pub} index={i} />
                ))}
              </div>
            </div>
          )}

          {trials.length > 0 && (
            <div>
              <p className="sources-section-title" style={{ marginTop: pubs.length > 0 ? 8 : 0 }}>
                Clinical trials ({trials.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trials.map((trial, i) => (
                  <TrialCard key={i} trial={trial} index={i} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}