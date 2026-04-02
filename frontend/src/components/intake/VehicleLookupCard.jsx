import SectionCard from "../shared/SectionCard";

export default function VehicleLookupCard({ vehicle }) {
  if (!vehicle) return null;
  return (
    <SectionCard title="Customer & Vehicle Dashboard" subtitle="Immediate view after Suggested Match and odometer extraction">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Customer Details</p>
          <p className="mt-2 font-semibold text-slate-800">{vehicle.customer_name}</p>
          <p className="text-sm text-slate-500">{vehicle.customer_phone}</p>
          <p className="text-sm text-slate-500">{vehicle.customer_email}</p>
          <p className="text-sm text-slate-500">{vehicle.customer_address}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Vehicle Details</p>
          <p className="mt-2 font-semibold text-slate-800">{vehicle.make} {vehicle.model}</p>
          <p className="text-sm text-slate-500">{vehicle.variant}</p>
          <p className="text-sm text-slate-500">Reg No: {vehicle.reg_no}</p>
          <p className="text-sm text-slate-500">Odometer Ref: {vehicle.current_km} km</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Service Context</p>
          <p className="mt-2 text-2xl font-bold text-slate-800">{vehicle.serviceVisitCount}</p>
          <p className="text-sm text-slate-500">Service visit count</p>
          <p className={`mt-2 text-sm font-semibold ${vehicle.repeatComplaintIndicator ? "text-amber-700" : "text-emerald-700"}`}>
            {vehicle.repeatComplaintIndicator ? "Repeat complaint indicator present" : "No repeat complaint flagged"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Previous Complaints</p>
          <ul className="mt-2 space-y-2 text-sm text-slate-600">
            {(vehicle.previousComplaints || []).slice(0, 3).map((item) => (
              <li key={`${item.service_date}-${item.complaint_summary}`} className="rounded-xl bg-slate-50 px-3 py-2">{item.complaint_summary}</li>
            ))}
          </ul>
        </div>
      </div>
    </SectionCard>
  );
}
