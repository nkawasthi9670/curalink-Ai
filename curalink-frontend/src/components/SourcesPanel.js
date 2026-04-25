const STATUS_CONFIG = {
  RECRUITING: { cls: 'bg-green-400/15 text-green-400', label: 'Recruiting' },
  COMPLETED: { cls: 'bg-amber-400/15 text-amber-400', label: 'Completed' },
  ACTIVE_NOT_RECRUITING: { cls: 'bg-blue-400/15 text-blue-400', label: 'Active' },
  NOT_YET_RECRUITING: { cls: 'bg-blue-400/15 text-blue-400', label: 'Not yet recruiting' },
};

function PubCard({ pub, index }) {
  return (
    <div className="bg-[#0a0e1a] border border-blue-900/20 rounded-lg p-3.5 hover:border-blue-900/40 transition-colors">
      <div className="flex gap-2 items-start mb-2">
        <span className="text-xs font-bold text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
          P{index + 1}
        </span>
        <p className="text-xs font-medium text-white leading-relaxed">{pub.title}</p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <span className={`text-xs font-semibold px-1.5 py-0.5 rounded
          ${pub.source === 'PubMed' ? 'bg-blue-400/15 text-blue-300' : 'bg-teal-400/15 text-teal-300'}`}>
          {pub.source}
        </span>
        {pub.year && <span className="text-xs text-slate-500">{pub.year}</span>}
        {pub.authors?.[0] && (
          <span className="text-xs text-slate-500">
            {pub.authors[0]}{pub.authors.length > 1 ? ` +${pub.authors.length - 1}` : ''}
          </span>
        )}
      </div>
      {pub.snippet && (
        <p className="text-xs text-slate-400 leading-relaxed mb-2 line-clamp-2">{pub.snippet}...</p>
      )}
      {pub.url && (
        <a href={pub.url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 transition-colors">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
          </svg>
          Read paper
        </a>
      )}
    </div>
  );
}

function TrialCard({ trial, index }) {
  const status = STATUS_CONFIG[trial.recruitingStatus] || { cls: 'bg-slate-400/15 text-slate-400', label: trial.recruitingStatus };
  return (
    <div className="bg-teal-400/5 border border-teal-400/20 rounded-lg p-3.5">
      <div className="flex gap-2 items-start mb-2">
        <span className="text-xs font-bold text-teal-400 bg-teal-400/10 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
          T{index + 1}
        </span>
        <p className="text-xs font-medium text-white leading-relaxed">{trial.title}</p>
      </div>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status.cls} mb-2 inline-block`}>
        {status.label}
      </span>
      <div className="text-xs text-slate-400 space-y-0.5 mt-2">
        {trial.phase && trial.phase !== 'N/A' && <p><span className="text-slate-300">Phase:</span> {trial.phase}</p>}
        {trial.sponsor && <p><span className="text-slate-300">Sponsor:</span> {trial.sponsor}</p>}
        {trial.locations?.[0] && (
          <p><span className="text-slate-300">Location:</span> {trial.locations[0].city}{trial.locations[0].country ? `, ${trial.locations[0].country}` : ''}</p>
        )}
      </div>
      {trial.nctId && (
        <a href={trial.url} target="_blank" rel="noopener noreferrer"
          className="text-xs text-teal-400 hover:text-teal-300 inline-flex items-center gap-1 mt-2 transition-colors">
          <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
            <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
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
    <div className="bg-[#111827] overflow-y-auto flex flex-col">
      <div className="px-5 py-4 border-b border-blue-900/20 text-sm font-medium text-white sticky top-0 bg-[#111827] z-10">
        {total > 0 ? (
          <span className="flex items-center gap-2">
            <svg className="w-3.5 h-3.5 text-teal-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            {total} sources retrieved
          </span>
        ) : 'Sources'}
      </div>

      {total === 0 ? (
        <div className="p-10 text-center">
          <svg className="w-10 h-10 mx-auto mb-3 text-slate-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
          <p className="text-sm text-slate-500 leading-relaxed">
            Sources will appear here after you send a message.
          </p>
        </div>
      ) : (
        <div className="p-5 flex flex-col gap-4">
          {pubs.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Publications ({pubs.length})
              </p>
              <div className="flex flex-col gap-2">
                {pubs.map((pub, i) => <PubCard key={i} pub={pub} index={i} />)}
              </div>
            </div>
          )}
          {trials.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                Clinical Trials ({trials.length})
              </p>
              <div className="flex flex-col gap-2">
                {trials.map((trial, i) => <TrialCard key={i} trial={trial} index={i} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}