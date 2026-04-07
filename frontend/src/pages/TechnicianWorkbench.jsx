import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import SectionCard from "../components/shared/SectionCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import EmptyState from "../components/shared/EmptyState";
import TaskList from "../components/technician/TaskList";
import AdditionalIssueForm from "../components/technician/AdditionalIssueForm";
import { getJobCard, updateJobCard, updateTechnicianChecklist } from "../services/jobCardService";
import { parseComplaint } from "../services/mockAiService";
import { SERVICE_CATALOG } from "../utils/constants";

export default function TechnicianWorkbench() {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const requestedJobCardNo = query.get("jobCardNo") || "JC-2026-0005";
  const [search, setSearch] = useState(requestedJobCardNo);
  const [jobCard, setJobCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [additionalIssue, setAdditionalIssue] = useState("");

  const technicianGroups = useMemo(
    () => (jobCard?.technicians || []).map((tech) => {
      try {
        return { ...tech, tasks: JSON.parse(tech.checklist_json || "[]") };
      } catch {
        return { ...tech, tasks: [] };
      }
    }),
    [jobCard],
  );

  const loadJobCard = async (jobCardRef = search) => {
    setLoading(true);
    try {
      setJobCard(await getJobCard(jobCardRef));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSearch(requestedJobCardNo);
  }, [requestedJobCardNo]);

  useEffect(() => {
    if (!requestedJobCardNo) return;
    loadJobCard(requestedJobCardNo);
  }, [requestedJobCardNo]);

  const toggleTask = async (assignmentId, index) => {
    const updatedGroups = technicianGroups.map((tech) => tech.id === assignmentId
      ? { ...tech, tasks: tech.tasks.map((task, taskIndex) => (taskIndex === index ? { ...task, done: !task.done } : task)) }
      : tech);
    const assignment = updatedGroups.find((tech) => tech.id === assignmentId);
    if (!assignment) return;
    const updated = await updateTechnicianChecklist(jobCard.id, assignmentId, { tasks: assignment.tasks });
    setJobCard(updated);
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
          <button type="button" onClick={() => loadJobCard()} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white">Load Job Card</button>
        </div>
      </SectionCard>

      {loading ? <LoadingSpinner label="Loading technician workbench..." /> : null}
      {!loading && !jobCard ? <EmptyState title="No job card loaded" description="Search a seeded or newly assigned job card to open technician tasks." /> : null}

      {jobCard ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-panel">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Technician Job Card</p>
                <h1 className="mt-2 font-mono text-2xl font-semibold text-slate-900">{jobCard.job_card_no} - {jobCard.reg_no}</h1>
                <p className="mt-1 text-sm text-slate-500">Bay {jobCard.bay_no || "Pending"} - {jobCard.customer_name}</p>
              </div>
              <div className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">Assigned Team</p>
                <p className="mt-1 text-sm font-semibold text-primary-700">{technicianGroups.length ? technicianGroups.map((tech) => tech.name).join(", ") : "Assignment pending"}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-5 lg:grid-cols-[1.2fr,0.8fr]">
              <div className="space-y-4">
                {!technicianGroups.length ? <EmptyState title="No technician assignment yet" description="Assign the job card from the advisor workflow to populate task checklists here." /> : null}
                {technicianGroups.map((tech) => (
                  <TaskList
                    key={tech.id}
                    title={`${tech.name} - ${tech.assignment_type}`}
                    subtitle={`${tech.specialization} - ${tech.assigned_task}`}
                    tasks={tech.tasks}
                    onToggle={(taskIndex) => toggleTask(tech.id, taskIndex)}
                  />
                ))}
                {technicianGroups.length && !technicianGroups.some((tech) => tech.tasks.length) ? <EmptyState title="No checklist found" description="This job card has technicians assigned, but checklist tasks are not available yet." /> : null}
              </div>
              <div className="space-y-4">
                <SectionCard title="Job Card Detail" subtitle="Issue context for the assigned technician" className="shadow-none">
                  <div className="space-y-3 text-sm text-slate-600">
                    <p><span className="font-semibold text-slate-800">Customer Reported Issues:</span> {jobCard.complaint_text}</p>
                    <p><span className="font-semibold text-slate-800">Advisor Observations:</span> {jobCard.advisor_observations}</p>
                    <p><span className="font-semibold text-slate-800">Suggested Repairs:</span> {jobCard.suggested_repairs || "Not updated yet."}</p>
                  </div>
                </SectionCard>
                <SectionCard title="Assignment Summary" subtitle="Technician roles and current work status" className="shadow-none">
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">Common Bay Number</p>
                      <p className="mt-1 text-sm font-semibold text-primary-800">{jobCard.bay_no || "Bay pending"}</p>
                    </div>
                    {technicianGroups.map((tech) => (
                      <div key={tech.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-slate-800">{tech.name}</p>
                          <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">{tech.task_status}</span>
                        </div>
                        <p className="mt-1 text-sm text-slate-500">{tech.specialization} - {jobCard.bay_no || "Bay pending"}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              </div>
            </div>
          </section>

          <SectionCard title="Additional Issue Reporting" subtitle="Triggers revised estimate and re-approval flow when new work is identified">
            <AdditionalIssueForm value={additionalIssue} onChange={setAdditionalIssue} onSubmit={submitAdditionalIssue} />
          </SectionCard>
        </>
      ) : null}
    </main>
  );
}
