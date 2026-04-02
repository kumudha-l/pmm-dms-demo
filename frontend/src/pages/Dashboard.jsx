import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SectionCard from "../components/shared/SectionCard";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import StatusBadge from "../components/shared/StatusBadge";
import { getDashboardSummary } from "../services/dashboardService";

function stepForStatus(status) {
  if (["Paid", "Closed", "Billing In Progress", "Work Completed"].includes(status)) return "approval";
  if (["Assigned", "In Progress", "Approved", "Awaiting Approval"].includes(status)) return "approval";
  if (status === "Estimate Prepared") return "estimate";
  if (status === "Draft") return "complaint";
  return "history";
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    getDashboardSummary().then(setData);
  }, []);

  if (!data) {
    return <main className="app-shell"><LoadingSpinner label="Loading workshop dashboard..." /></main>;
  }

  return (
    <main className="app-shell space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(data.kpis).map(([key, value]) => (
          <div key={key} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-panel">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{key.replace(/([A-Z])/g, " $1")}</p>
            <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <SectionCard title="Scenario Shortcuts" subtitle="Presentation-ready flows mapped to seeded data">
        <div className="grid gap-4 lg:grid-cols-4">
          {data.scenarios.map((scenario) => (
            <button
              key={scenario.label}
              type="button"
              onClick={() => navigate(`/job-cards/${scenario.jobCardId}?step=history`)}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-primary-300 hover:bg-primary-50"
            >
              <p className="font-semibold text-slate-800">{scenario.label}</p>
              <p className="mt-2 text-sm text-slate-500">{scenario.regNo}</p>
              <p className="mt-2 text-sm text-slate-600">{scenario.complaintText}</p>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Recent Job Cards" subtitle="Advisor queue, approvals, and progress snapshot" actions={<Link to="/job-cards/new?step=intake" className="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white">Quick Create</Link>}>
        {data.recentJobCards?.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-3 py-3">Job Card No</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Vehicle</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Payment</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.recentJobCards.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-3 py-3 font-semibold text-slate-800">{item.job_card_no}</td>
                    <td className="px-3 py-3 text-slate-600">{item.customer_name}</td>
                    <td className="px-3 py-3 text-slate-600">{item.make} {item.model} · {item.reg_no}</td>
                    <td className="px-3 py-3"><StatusBadge value={item.status} /></td>
                    <td className="px-3 py-3"><StatusBadge value={item.payment_status} /></td>
                    <td className="px-3 py-3"><Link to={`/job-cards/${item.id}?step=${stepForStatus(item.status)}`} className="text-sm font-semibold text-primary-600">Open</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="No job cards yet" description="Seeded dashboard items will appear here once the backend is running." />
        )}
      </SectionCard>
    </main>
  );
}
