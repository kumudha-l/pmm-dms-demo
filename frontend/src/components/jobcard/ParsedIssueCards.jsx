import StatusBadge from "../shared/StatusBadge";

export default function ParsedIssueCards({ analysis, onApplyService }) {
  if (!analysis) return null;
  return (
    <div className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge value={analysis.priority} />
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{analysis.jobType}</span>
        <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">System Suggestion · {analysis.estTimeMins} mins</span>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {analysis.issues.map((issue, index) => (
          <div key={`${issue.category}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="font-semibold text-slate-800">{issue.title}</p>
            <p className="mt-1 text-sm text-slate-500">{issue.category}</p>
            <p className="mt-3 text-sm font-medium text-slate-700">Recommended Technician: {analysis.recommendedSpecialists.join(", ")}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {analysis.recommendedServices.map((serviceCode) => (
          <button key={serviceCode} type="button" onClick={() => onApplyService(serviceCode)} className="rounded-full border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-700">
            Add {serviceCode}
          </button>
        ))}
      </div>
    </div>
  );
}
