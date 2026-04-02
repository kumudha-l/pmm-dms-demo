const STEP_STYLES = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  current: "border-primary-300 bg-primary-50 text-primary-700",
  upcoming: "border-slate-200 bg-white text-slate-500",
};

export default function WorkflowStepper({ steps = [], activeStep, onSelect }) {
  const activeIndex = steps.findIndex((step) => step.key === activeStep);

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-panel">
      <div className="flex min-w-max gap-0 px-2">
        {steps.map((step, index) => {
          const state = index < activeIndex ? "complete" : index === activeIndex ? "current" : "upcoming";

          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onSelect(step.key)}
              className={`min-w-[11.5rem] border-b-2 px-4 py-4 text-left transition ${STEP_STYLES[state]} ${index === 0 ? "rounded-l-3xl" : ""} ${index === steps.length - 1 ? "rounded-r-3xl" : ""}`}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">Step {index + 1}</p>
              <p className="mt-2 text-sm font-semibold">{step.title}</p>
              <p className="mt-1 text-xs opacity-80">{step.short}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
