export default function Sidebar({ context, setContext }) {
  const update = (key) => (e) =>
    setContext((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="logo-text">Cura<span>link</span></span>
      </div>

      <div>
        <p className="sidebar-section-label">Patient context</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field">
            <label>Patient name</label>
            <input
              placeholder="e.g. John Smith"
              value={context.patientName}
              onChange={update('patientName')}
            />
          </div>
          <div className="field">
            <label>Disease / condition</label>
            <input
              placeholder="e.g. Parkinson's disease"
              value={context.disease}
              onChange={update('disease')}
            />
          </div>
          <div className="field">
            <label>Location (optional)</label>
            <input
              placeholder="e.g. Toronto, Canada"
              value={context.location}
              onChange={update('location')}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <p className="sidebar-section-label">How it works</p>
        {[
          { icon: '⬡', text: 'Searches PubMed, OpenAlex & ClinicalTrials.gov' },
          { icon: '⬡', text: 'Retrieves 100–200 results, re-ranks to top 8' },
          { icon: '⬡', text: 'AI synthesizes research into structured answers' },
          { icon: '⬡', text: 'Maintains context across follow-up questions' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--accent)', fontSize: 12, marginTop: 2 }}>⬡</span>
            <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <p style={{ marginBottom: 8 }}>
          <span className="status-dot" />
          Backend connected · Mistral 7B
        </p>
        <p>Not a substitute for professional medical advice. Always consult your physician.</p>
      </div>
    </aside>
  );
}