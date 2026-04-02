export default function AdditionalIssueForm({ value, onChange, onSubmit }) {
  return (
    <div className="space-y-3">
      <textarea className="field-input min-h-32" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Report newly found issue..." />
      <button type="button" onClick={onSubmit} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white">
        Add Additional Issue
      </button>
    </div>
  );
}
