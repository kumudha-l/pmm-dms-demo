export default function ImageUploadZone({ label, file, onChange, helper, disabled = false }) {
  return (
    <label className={`block rounded-3xl border-2 border-dashed p-5 transition ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 opacity-70" : file ? "border-emerald-300 bg-emerald-50" : "border-slate-300 bg-slate-50 hover:border-primary-400 hover:bg-primary-50"}`}>
      <span className="field-label">{label}</span>
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-lg text-slate-500">+</div>
      <input type="file" accept="image/*" disabled={disabled} onChange={(event) => onChange(event.target.files?.[0] || null)} className="field-input cursor-pointer bg-white disabled:cursor-not-allowed disabled:bg-slate-100" />
      <p className="mt-3 text-xs text-slate-500">{helper}</p>
      {file ? <p className="mt-2 text-sm font-medium text-emerald-700">{file.name} uploaded</p> : <p className="mt-2 text-sm text-slate-500">Choose an image to continue.</p>}
    </label>
  );
}
