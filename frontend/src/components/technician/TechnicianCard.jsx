import StatusBadge from "../shared/StatusBadge";

export default function TechnicianCard({ technician, selected, onSelect, disabled = false }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(technician)}
      disabled={disabled}
      className={`rounded-2xl border p-4 text-left transition ${selected ? "border-primary-500 bg-primary-50" : "border-slate-200 bg-white"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-slate-800">{technician.name}</p>
        <StatusBadge value={technician.availability_status} />
      </div>
      <p className="mt-2 text-sm text-slate-500">{technician.specialization}</p>
      <p className="text-sm text-slate-500">{technician.bay_no}</p>
    </button>
  );
}
