export default function DiscountRow({ value, onChange }) {
  return (
    <div>
      <label className="field-label">Discount Percentage</label>
      <div className="relative">
        <input
          className="field-input pr-10"
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={value}
          onChange={(event) => onChange(Math.min(100, Math.max(0, Number(event.target.value || 0))))}
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-500">%</span>
      </div>
      <p className="mt-2 text-xs text-slate-500">The system still saves the computed discount amount in rupees.</p>
    </div>
  );
}
