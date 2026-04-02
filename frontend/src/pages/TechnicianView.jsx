import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SectionCard from "../components/shared/SectionCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import TaskList from "../components/technician/TaskList";
import AdditionalIssueForm from "../components/technician/AdditionalIssueForm";
import { getJobCard, updateJobCard } from "../services/jobCardService";
import { parseComplaint } from "../services/mockAiService";
import { SERVICE_CATALOG } from "../utils/constants";

export default function TechnicianView() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const requestedJobCardNo = query.get("jobCardNo") || "JC-2026-0005";
  const [search, setSearch] = useState(requestedJobCardNo);
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [additionalIssue, setAdditionalIssue] = useState("");

  const technicianGroups = useMemo(() => (jobCard?.technicians || []).map((tech) => {
    try {
      return { ...tech, tasks: JSON.parse(tech.checklist_json || "[]") };
    } catch {
      return { ...tech, tasks: [] };
    }
  }), [jobCard]);

  const loadJobCard = async () => {
    setLoading(true);
    try {
      setJobCard(await getJobCard(search));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch(requestedJobCardNo);
  }, [requestedJobCardNo]);

  useEffect(() => {
    if (!requestedJobCardNo) return;
    setLoading(true);
    getJobCard(requestedJobCardNo)
      .then(setJobCard)
      .finally(() => setLoading(false));
  }, [requestedJobCardNo]);

  const toggleTask = async (technicianId, index) => {
    const updatedGroups = technicianGroups.map((tech) => tech.technician_id === technicianId
      ? { ...tech, tasks: tech.tasks.map((task, taskIndex) => (taskIndex === index ? { ...task, done: !task.done } : task)) }
      : tech);
    const allTasks = updatedGroups.flatMap((tech) => tech.tasks);
    const nextStatus = allTasks.length && allTasks.every((task) => task.done) ? "Work Completed" : "In Progress";
    const updated = await updateJobCard(jobCard.id, { status: nextStatus });
    setJobCard({ ...updated, technicians: updatedGroups.map((tech) => ({ ...tech, checklist_json: JSON.stringify(tech.tasks) })) });
  };

  const submitAdditionalIssue = async () => {
    const analysis = await parseComplaint(additionalIssue);
    const mergedIssues = [...(jobCard.ai_parsed_issues || []), ...analysis.issues];
    const extraServices = analysis.recommendedServices
      .map((code) => SERVICE_CATALOG[code])
      .filter(Boolean)
      .map((service) => ({ ...service, quantity: 1, source_type: "Suggested Services" }));
    const updated = await updateJobCard(jobCard.id, {
      ai_parsed_issues: mergedIssues,
      suggested_repairs: `${jobCard.suggested_repairs}\nAdditional Issue: ${additionalIssue}`,
      selected_services: [...(jobCard.services || []), ...extraServices],
      approval_status: "Re-approval Required",
      status: "In Progress",
    });
    setJobCard(updated);
    setAdditionalIssue("");
  };

  return (
    <main className="app-shell space-y-6">
      <SectionCard title="Technician Work View" subtitle="Search by job card number or internal ID, update checklist items, and raise additional issues">
        <div className="flex flex-wrap gap-3">
          <input className="field-input max-w-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by job card number e.g. JC-2026-0005" />
          <button type="button" onClick={loadJobCard} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white">Load Job Card</button>
        </div>
      </SectionCard>

      {loading ? <LoadingSpinner label="Loading technician workbench..." /> : null}
      {!loading && !jobCard ? <EmptyState title="No job card loaded" description="Search a seeded job card like JC-2026-0005 to open technician tasks." /> : null}

      {jobCard ? (
        <>
          <SectionCard title={`${jobCard.job_card_no} · ${jobCard.reg_no}`} subtitle={`Bay ${jobCard.bay_no || "Pending"} · ${jobCard.customer_name}`}>
            <div className="grid gap-5 lg:grid-cols-2">
              <TaskList tasks={currentTasks} onToggle={toggleTask} />
              <div className="space-y-3 text-sm text-slate-600">
                <p><span className="font-semibold text-slate-800">Customer Reported Issues:</span> {jobCard.complaint_text}</p>
                <p><span className="font-semibold text-slate-800">Advisor Observations:</span> {jobCard.advisor_observations}</p>
                <p><span className="font-semibold text-slate-800">Suggested Repairs:</span> {jobCard.suggested_repairs}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Additional Issue Reporting" subtitle="Triggers revised estimate and re-approval flow when new work is identified">
            <AdditionalIssueForm value={additionalIssue} onChange={setAdditionalIssue} onSubmit={submitAdditionalIssue} />
          </SectionCard>
        </>
      ) : null}
    </main>
  );
}
