import { formatCurrency } from "../../utils/formatCurrency";

export default function EstimatePanel({ estimate, showEta = true }) {
  if (!estimate) return null;
  return (
    <div className="rounded-3xl border border-slate-200 bg-white">
      <div className={`grid gap-4 border-b border-slate-200 bg-slate-50 p-5 ${showEta ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Labour</p><p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(estimate.laborTotal)}</p></div>
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Parts</p><p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(estimate.partsTotal)}</p></div>
        <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Add Services</p><p className="mt-2 text-xl font-bold text-slate-900">{formatCurrency(estimate.addonTotal)}</p></div>
        {showEta ? <div><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">ETA</p><p className="mt-2 text-xl font-bold text-slate-900">{estimate.etaMins} mins</p></div> : null}
      </div>
      <div className="space-y-3 p-5 text-sm">
        <div className="flex items-center justify-between text-slate-600"><span>Discount</span><span className="font-semibold text-emerald-700">{formatCurrency(estimate.discount)}</span></div>
        <div className="flex items-center justify-between text-slate-600"><span>GST</span><span className="font-semibold text-slate-900">{formatCurrency(estimate.gstAmount)}</span></div>
        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-bold text-primary-700"><span>Grand Total</span><span>{formatCurrency(estimate.grandTotal)}</span></div>
      </div>
    </div>
  );
}
