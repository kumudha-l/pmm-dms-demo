import StatusBadge from "../shared/StatusBadge";

export default function LifecycleBar({ status, approvalStatus, paymentStatus, bayNo }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3 rounded-3xl border border-slate-200 bg-white px-5 py-3 shadow-panel">
      <StatusBadge value={status} />
      <StatusBadge value={approvalStatus} />
      <StatusBadge value={paymentStatus} />
      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-700">{bayNo || "Bay pending"}</span>
    </div>
  );
}
