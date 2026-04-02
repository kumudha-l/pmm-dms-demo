import { ADD_ON_SERVICES } from "../../utils/constants";

export default function AddonServices({ onToggle, selectedServices = [] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ADD_ON_SERVICES.map((service) => (
        <button
          key={service.service_name}
          type="button"
          onClick={() => onToggle(service)}
          className={`min-w-0 rounded-2xl border px-3 py-3 text-left transition ${
            selectedServices.includes(service.service_name)
              ? "border-primary-400 bg-primary-50"
              : "border-slate-200 bg-slate-50 hover:border-primary-300 hover:bg-primary-50"
          }`}
        >
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0 pr-1">
              <p className="text-sm font-semibold leading-5 text-slate-800">{service.service_name}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.12em] text-slate-500">Add Services</p>
            </div>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${selectedServices.includes(service.service_name) ? "bg-primary-500 text-white" : "bg-white text-slate-500"}`}>
              {selectedServices.includes(service.service_name) ? "Added" : "Optional"}
            </span>
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">Rs {Math.round(service.unit_cost).toLocaleString("en-IN")}</p>
        </button>
      ))}
    </div>
  );
}
