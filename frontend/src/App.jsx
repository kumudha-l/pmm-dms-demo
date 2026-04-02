import { Navigate, Route, Routes } from "react-router-dom";
import Header from "./components/layout/Header";
import Dashboard from "./pages/Dashboard";
import WorkflowJobCard from "./pages/WorkflowJobCard";
import TechnicianWorkbench from "./pages/TechnicianWorkbench";
import Billing from "./pages/Billing";
import Delivery from "./pages/Delivery";
import Inventory from "./pages/Inventory";
import CustomerOnboarding from "./pages/CustomerOnboarding";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <Header />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/job-cards/new" element={<WorkflowJobCard />} />
        <Route path="/job-cards/:jobCardId" element={<WorkflowJobCard />} />
        <Route path="/technician" element={<TechnicianWorkbench />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/customer-onboarding" element={<CustomerOnboarding />} />
        <Route path="/billing/:jobCardId" element={<Billing />} />
        <Route path="/delivery/:jobCardId" element={<Delivery />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
