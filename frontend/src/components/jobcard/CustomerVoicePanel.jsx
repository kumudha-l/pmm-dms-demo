export default function CustomerVoicePanel({ complaintText, onComplaintChange, advisorObservations, onAdvisorChange, suggestedRepairs, onRepairsChange }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div>
        <label className="field-label">Customer Voice</label>
        <textarea className="field-input min-h-44" value={complaintText} onChange={(event) => onComplaintChange(event.target.value)} placeholder="Describe customer voice..." />
      </div>
      <div>
        <label className="field-label">Advisor Observations</label>
        <textarea className="field-input min-h-44" value={advisorObservations} onChange={(event) => onAdvisorChange(event.target.value)} placeholder="Visible inspection findings, warning lamps, noise notes..." />
      </div>
      <div>
        <label className="field-label">Suggested Repairs</label>
        <textarea className="field-input min-h-44" value={suggestedRepairs} onChange={(event) => onRepairsChange(event.target.value)} placeholder="Suggested repairs and workshop recommendation..." />
      </div>
    </div>
  );
}
