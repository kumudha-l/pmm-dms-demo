export default function TaskList({ tasks = [], onToggle, title = "Checklist", subtitle = "" }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
      </div>
      <div className="space-y-3 p-4">
        {tasks.map((task, index) => (
          <label key={`${task.label}-${index}`} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
            <input type="checkbox" checked={Boolean(task.done)} onChange={() => onToggle(index)} className="h-4 w-4 rounded border-slate-300" />
            <span className="text-sm text-slate-700">{task.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
