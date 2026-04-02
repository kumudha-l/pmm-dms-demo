import { formatCurrency } from "../../utils/formatCurrency";

const colorClass = {
  "In Stock": "text-emerald-700",
  "Low Stock": "text-amber-700",
  "Available at Alternate Godown": "text-amber-700",
  "Not Available": "text-rose-700",
};

export default function InventoryTable({ items = [], onAddPart, selectedPartIds = [], autoSelectedPartIds = [] }) {
  if (!items.length) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">No mapped parts found for the current issue set. The backend is returning only the minimal common service items when no issue mapping exists.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            <th className="px-3 py-3">Part Name</th>
            <th className="px-3 py-3">Stock</th>
            <th className="px-3 py-3">Unit Price</th>
            <th className="px-3 py-3">Source / Godown</th>
            <th className="px-3 py-3">Availability</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <td className="px-3 py-3 font-medium text-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <span>{item.part_name}</span>
                  {autoSelectedPartIds.includes(item.id) ? <span className="rounded-full bg-primary-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary-700">Suggested</span> : null}
                </div>
              </td>
              <td className="px-3 py-3 text-slate-600">{item.stock_qty}</td>
              <td className="px-3 py-3 text-slate-600">{formatCurrency(item.unit_price)}</td>
              <td className="px-3 py-3 text-slate-600">{item.source_location}</td>
              <td className={`px-3 py-3 font-semibold ${colorClass[item.availability_status] || "text-slate-700"}`}>{item.availability_status}</td>
              <td className="px-3 py-3">
                {onAddPart ? (
                  <button
                    type="button"
                    onClick={() => onAddPart(item)}
                    className={`rounded-full px-3 py-2 text-xs font-semibold ${selectedPartIds.includes(item.id) ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "bg-slate-900 text-white"}`}
                  >
                    {selectedPartIds.includes(item.id) ? "Added" : "Add Part"}
                  </button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
