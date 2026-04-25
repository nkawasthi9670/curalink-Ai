export default function Sidebar({ context, setContext, user, onLogout }) {
  const update = (key) => (e) =>
    setContext((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <aside className="bg-[#111827] border-r border-blue-900/20 flex flex-col p-6 gap-5 overflow-y-auto">

      {/* Logo */}
      <div className="flex items-center gap-2.5 pb-5 border-b border-blue-900/20">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-teal-400 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="text-xl text-white font-serif">
          Cura<span className="text-blue-400">link</span>
        </span>
      </div>

      {/* Patient Context */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Patient Context
        </p>
        <div className="flex flex-col gap-3">
          {[
            { label: 'Patient Name', key: 'patientName', placeholder: 'Enter Your Name' },
            { label: 'Disease / Condition', key: 'disease', placeholder: "Enter Disease Name" },
            { label: 'Location (Optional)', key: 'location', placeholder: 'Enter Your Location' },
          ].map(({ label, key, placeholder }) => (
            <div key={key} className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {label}
              </label>
              <input
                placeholder={placeholder}
                value={context[key]}
                onChange={update(key)}
                className="bg-[#1a2235] border border-blue-900/20 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
              />
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          How It Works
        </p>
        <div className="flex flex-col gap-2">
          {[
            'Searches PubMed, OpenAlex & ClinicalTrials.gov',
            'Retrieves 100–200 results, re-ranks to top 8',
            'AI synthesizes research into structured answers',
            'Maintains context across follow-up questions',
          ].map((text, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <span className="text-blue-500 text-xs mt-0.5">⬡</span>
              <span className="text-xs text-slate-400 leading-relaxed">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-auto pt-4 border-t border-blue-900/20">
        <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"/>
          {user?.name} · Backend connected
        </p>
        <button
          onClick={onLogout}
          className="w-full text-xs text-red-400 border border-red-400/20 bg-red-400/10 hover:bg-red-400/20 rounded-lg py-2 transition-colors cursor-pointer mb-2"
        >
          Logout
        </button>
        <p className="text-xs text-slate-600 leading-relaxed">
          Not a substitute for professional medical advice.
        </p>
      </div>
    </aside>
  );
}