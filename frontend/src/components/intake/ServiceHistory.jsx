import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/formatDate";
import SectionCard from "../shared/SectionCard";

function ordinal(value) {
  const number = Number(value);
  if (!number) return "";
  const mod10 = number % 10;
  const mod100 = number % 100;
  if (mod10 === 1 && mod100 !== 11) return `${number}st`;
  if (mod10 === 2 && mod100 !== 12) return `${number}nd`;
  if (mod10 === 3 && mod100 !== 13) return `${number}rd`;
  return `${number}th`;
}

function displayServiceType(item) {
  const label = String(item.service_type || "").trim();
  if (/\bservice\b/i.test(label) && item.service_number) {
    return `${ordinal(item.service_number)} Service`;
  }
  return label || `Visit ${item.service_number || "-"}`;
}

export default function ServiceHistory({ history = [], paymentHistory = [] }) {
  return (
    <SectionCard title="Previous Service & Payment History" subtitle="Timeline of prior visits, complaints, work done, and payment references">
      <div className="grid gap-5 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-3">
          {history.map((item) => (
            <div key={`${item.service_date}-${item.service_number}`} className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-slate-800">{displayServiceType(item)}</p>
                <p className="text-sm text-slate-500">{formatDate(item.service_date)}</p>
              </div>
              <p className="mt-2 text-sm text-slate-600"><span className="font-semibold">Complaint:</span> {item.complaint_summary}</p>
              <p className="mt-1 text-sm text-slate-600"><span className="font-semibold">Work done:</span> {item.work_done}</p>
              <p className="mt-1 text-sm text-slate-600"><span className="font-semibold">Amount paid:</span> {formatCurrency(item.amount_paid)}</p>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {paymentHistory.map((item) => (
            <div key={`${item.payment_ref}-${item.paid_at}`} className="rounded-2xl bg-slate-50 p-4">
              <p className="font-semibold text-slate-800">{item.payment_ref}</p>
              <p className="text-sm text-slate-500">{item.payment_method}</p>
              <p className="mt-2 text-sm text-slate-600">{formatCurrency(item.amount)}</p>
            </div>
          ))}
        </div>
      </div>
    </SectionCard>
  );
}
