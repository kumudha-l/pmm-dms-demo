export default function SectionCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-panel ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div>
          <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {actions}
      </div>
      <div className="p-5 md:p-6">{children}</div>
    </section>
  );
}
