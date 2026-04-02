const styles = {
  Paid: "bg-emerald-100 text-emerald-700",
  Closed: "bg-emerald-100 text-emerald-700",
  Available: "bg-emerald-100 text-emerald-700",
  "In Stock": "bg-emerald-100 text-emerald-700",
  "Approved by Customer": "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  "Re-approval Required": "bg-amber-100 text-amber-700",
  "Low Stock": "bg-amber-100 text-amber-700",
  Busy: "bg-amber-100 text-amber-700",
  Unpaid: "bg-rose-100 text-rose-700",
  "Not Available": "bg-rose-100 text-rose-700",
  Leave: "bg-slate-200 text-slate-700",
};

export default function StatusBadge({ value }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[value] || "bg-slate-100 text-slate-700"}`}>
      {value}
    </span>
  );
}
