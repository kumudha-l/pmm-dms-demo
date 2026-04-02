import StatusBadge from "../shared/StatusBadge";

const CODE_TO_SERVICE = {
  "FS-02": "LAB-FREE-2",
  "BR-INSP": "LAB-BRAKE-INSPECT",
  "BR-PAD": "LAB-BRAKE-PAD",
  "AC-CHK": "LAB-AC-DIAG",
  "AC-SRV": "LAB-AC-SERVICE",
  "WA-CHK": "LAB-ALIGNMENT",
  "WB-CHK": "LAB-BALANCING",
  "EL-DIAG": "LAB-ELEC-DIAG",
  SCAN: "LAB-DIAG-SCAN",
  "BD-REP": "LAB-BODY-REPAIR",
  "POL-EXT": "LAB-POLISH",
};

function severityClass(value) {
  if (value.includes("High")) return "border border-rose-200 bg-rose-50 text-rose-700";
  if (value.includes("Routine")) return "border border-sky-200 bg-sky-50 text-sky-700";
  return "border border-amber-200 bg-amber-50 text-amber-700";
}

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
};

export default function ComplaintParsedPanel({ analysis, onApplyService }) {
  if (!analysis) return null;

  const displayIssues = asArray(analysis.displayIssues);
  const severity = asArray(analysis.severity);
  const serviceCodes = asArray(analysis.serviceCodes);
  const recommendedServices = asArray(analysis.recommendedServices);
  const priority = typeof analysis.priority === "string" ? analysis.priority : "P3 - Standard";
  const jobType = typeof analysis.jobType === "string" ? analysis.jobType : "Running Repair";
  const displayTime = typeof analysis.displayTime === "string" ? analysis.displayTime : `~${analysis.estTimeMins || 0} mins`;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">Complaint Analysis Output</div>
        <div className="flex flex-wrap gap-2">
          <StatusBadge value={priority} />
          <span className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">System Suggestion</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="grid gap-2 md:grid-cols-[110px,1fr]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">job_type</div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">{jobType}</span>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[110px,1fr]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">issues</div>
          <div className="flex flex-wrap gap-2">
            {displayIssues.map((issue) => (
              <span key={issue} className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700">{issue}</span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[110px,1fr]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">severity</div>
          <div className="flex flex-wrap gap-2">
            {severity.map((item) => (
              <span key={item} className={`rounded-md px-3 py-1 text-xs font-semibold ${severityClass(item)}`}>{item}</span>
            ))}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[110px,1fr]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">priority</div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md border border-fuchsia-200 bg-fuchsia-50 px-3 py-1 text-xs font-semibold text-fuchsia-700">{priority}</span>
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[110px,1fr]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">service codes</div>
          <div className="flex flex-wrap gap-2">
            {serviceCodes.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => onApplyService?.(CODE_TO_SERVICE[code] || recommendedServices[0])}
                className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700"
              >
                {code}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-[110px,1fr]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">est. time</div>
          <div className="text-sm font-mono text-slate-700">{displayTime}</div>
        </div>
      </div>
    </div>
  );
}
