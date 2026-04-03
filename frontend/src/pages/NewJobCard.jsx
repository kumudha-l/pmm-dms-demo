import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import BottomBar from "../components/layout/BottomBar";
import LifecycleBar from "../components/layout/LifecycleBar";
import ImageUploadZone from "../components/intake/ImageUploadZone";
import ServiceHistory from "../components/intake/ServiceHistory";
import VehicleLookupCard from "../components/intake/VehicleLookupCard";
import AddonServices from "../components/jobcard/AddonServices";
import CustomerVoicePanel from "../components/jobcard/CustomerVoicePanel";
import DiscountRow from "../components/jobcard/DiscountRow";
import EstimatePanel from "../components/jobcard/EstimatePanel";
import InventoryTable from "../components/jobcard/InventoryTable";
import ParsedIssueCards from "../components/jobcard/ParsedIssueCards";
import SignaturePadField from "../components/jobcard/SignaturePad";
import TechnicianCard from "../components/technician/TechnicianCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import NotifToast from "../components/shared/NotifToast";
import SectionCard from "../components/shared/SectionCard";
import { useExtraction } from "../hooks/useExtraction";
import { assignTechnicians, createJobCard, getJobCard, updateJobCard } from "../services/jobCardService";
import { getInventory } from "../services/inventoryService";
import { parseComplaint } from "../services/mockAiService";
import { getTechnicians } from "../services/technicianService";
import { getVehicleByRegNo, getVehicleHistory } from "../services/vehicleService";
import { APPROVAL_STATUSES, COMPLAINT_SOURCES, JOB_STATUSES, SERVICE_CATALOG, SERVICE_TYPES } from "../utils/constants";

function useQuery() {
  return new URLSearchParams(useLocation().search);
}

function enrichService(serviceCode) {
  const service = SERVICE_CATALOG[serviceCode];
  return service ? { ...service, quantity: 1, total_cost: service.unit_cost, source_type: "Suggested Services" } : null;
}

export default function NewJobCard() {
  const { jobCardId: pathJobCardId } = useParams();
  const query = useQuery();
  const navigate = useNavigate();
  const initialJobCardId = pathJobCardId || query.get("jobCardId") || "";
  const [jobCard, setJobCard] = useState(null);
  const [plateFile, setPlateFile] = useState(null);
  const [odometerFile, setOdometerFile] = useState(null);
  const [regNo, setRegNo] = useState(query.get("regNo") || "");
  const [openingKm, setOpeningKm] = useState("0");
  const [vehicle, setVehicle] = useState(null);
  const [history, setHistory] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [complaintText, setComplaintText] = useState(query.get("complaint") || "");
  const [advisorObservations, setAdvisorObservations] = useState("");
  const [suggestedRepairs, setSuggestedRepairs] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [services, setServices] = useState([]);
  const [parts, setParts] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [selectedTechIds, setSelectedTechIds] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [serviceType, setServiceType] = useState("Running Repair");
  const [complaintSource, setComplaintSource] = useState("Walk-in");
  const [approvalStatus, setApprovalStatus] = useState("Pending");
  const [typedAck, setTypedAck] = useState("");
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState("Draft");
  const [toast, setToast] = useState("");
  const [loadingPage, setLoadingPage] = useState(false);
  const { loading: extractionLoading, runExtraction } = useExtraction();

  useEffect(() => {
    getInventory().then((data) => setInventory(data.items));
    getTechnicians().then((data) => setTechnicians(data.items));
  }, []);

  useEffect(() => {
    if (!initialJobCardId) return;
    setLoadingPage(true);
    getJobCard(initialJobCardId)
      .then((data) => {
        setJobCard(data);
        setRegNo(data.reg_no);
        setOpeningKm(data.opening_km);
        setComplaintText(data.complaint_text);
        setAdvisorObservations(data.advisor_observations || "");
        setSuggestedRepairs(data.suggested_repairs || "");
        setServices(data.services || []);
        setParts(data.parts || []);
        setApprovalStatus(data.approval_status);
        setStatus(data.status);
        setTypedAck(data.typed_acknowledgement || "");
        setSignature(data.signature_data_url || "");
        setVehicle({
          customer_name: data.customer_name,
          customer_phone: data.phone,
          customer_email: data.email,
          customer_address: data.address,
          reg_no: data.reg_no,
          make: data.make,
          model: data.model,
          variant: data.variant,
          current_km: data.current_km,
          serviceVisitCount: data.serviceHistory?.length || 0,
          repeatComplaintIndicator: Boolean(data.repeat_complaint),
          previousComplaints: (data.serviceHistory || []).map((item) => ({ complaint_summary: item.complaint_summary, service_date: item.service_date })),
        });
        setHistory(data.serviceHistory || []);
        setPaymentHistory(data.payments || []);
        setSelectedTechIds((data.technicians || []).map((tech) => tech.technician_id));
      })
      .finally(() => setLoadingPage(false));
  }, [initialJobCardId]);

  const estimate = useMemo(() => {
    const laborTotal = services.reduce((sum, item) => sum + Number(item.total_cost || item.unit_cost || 0), 0);
    const partsTotal = parts.reduce((sum, item) => sum + Number(item.total_price || item.unit_price || 0), 0);
    const addonTotal = services.filter((service) => service.source_type === "ADD SERVICES").reduce((sum, item) => sum + Number(item.total_cost || item.unit_cost || 0), 0);
    const taxable = Math.max(laborTotal + partsTotal - discountAmount, 0);
    return {
      laborTotal,
      partsTotal,
      addonTotal,
      discount: discountAmount,
      gstAmount: Math.round(taxable * 0.18),
      grandTotal: taxable + Math.round(taxable * 0.18),
      etaMins: services.reduce((sum, item) => sum + Number(item.estimated_time_mins || 0), 30),
    };
  }, [discountAmount, parts, services]);

  const runLookup = async (regNoToUse = regNo) => {
    const [vehicleData, historyData] = await Promise.all([getVehicleByRegNo(regNoToUse), getVehicleHistory(regNoToUse)]);
    setVehicle(vehicleData);
    setHistory(historyData.serviceHistory);
    setPaymentHistory(historyData.paymentHistory);
    setOpeningKm((current) => current || vehicleData.current_km || "");
  };

  const handleExtraction = async () => {
    const extracted = await runExtraction(plateFile, odometerFile);
    if (extracted.plate?.regNo && extracted.plate.regNo !== "UNKNOWN") setRegNo(extracted.plate.regNo);
    if (extracted.odometer?.km) setOpeningKm(extracted.odometer.km);
    setToast(`Suggested Match: ${extracted.plate?.regNo || "Unknown"} · Odometer ${extracted.odometer?.km || 0} km`);
    if (extracted.plate?.regNo && extracted.plate.regNo !== "UNKNOWN") {
      await runLookup(extracted.plate.regNo);
    }
  };

  const analyzeComplaint = async () => {
    const parsed = await parseComplaint(complaintText);
    setAnalysis(parsed);
    setToast("System Suggestion prepared from customer complaint.");
  };

  const addRecommendedService = (serviceCode) => {
    const service = enrichService(serviceCode);
    if (!service) return;
    setServices((current) => (current.some((item) => item.service_catalog_id === service.service_catalog_id) ? current : [...current, service]));
  };

  const addPart = (item) => {
    setParts((current) => [...current, { inventory_id: item.id, part_name: item.part_name, quantity: 1, unit_price: item.unit_price, total_price: item.unit_price, availability_status: item.availability_status, source_location: item.source_location }]);
  };

  const addAddon = (addon) => {
    setServices((current) => [...current, { service_name: addon.service_name, quantity: 1, unit_cost: addon.unit_cost, total_cost: addon.unit_cost, source_type: addon.source_type, estimated_time_mins: 35 }]);
  };

  const persistJobCard = async () => {
    const payload = {
      reg_no: regNo,
      advisor_name: "Rupesh CN",
      opening_km: Number(openingKm || 0),
      complaint_text: complaintText,
      service_type: serviceType,
      complaint_source: complaintSource,
      repeat_complaint: Boolean(vehicle?.repeatComplaintIndicator),
      ai_parsed_issues: analysis?.issues || jobCard?.ai_parsed_issues || [],
      advisor_observations: advisorObservations,
      suggested_repairs: suggestedRepairs,
      selected_services: services,
      selected_parts: parts,
      discount_amount: discountAmount,
      addon_total: services.filter((item) => item.source_type === "ADD SERVICES").reduce((sum, item) => sum + Number(item.total_cost || 0), 0),
      approval_status: approvalStatus,
      typed_acknowledgement: typedAck,
      signature_data_url: signature,
      status,
    };
    const saved = jobCard ? await updateJobCard(jobCard.id, payload) : await createJobCard(payload);
    setJobCard(saved);
    setStatus(saved.status);
    setApprovalStatus(saved.approval_status);
    setToast(`Job card ${saved.job_card_no} saved successfully.`);
    if (!pathJobCardId) navigate(`/job-cards/${saved.id}`, { replace: true });
  };

  const saveAssignments = async () => {
    let activeJobCard = jobCard;
    if (!activeJobCard) {
      const payload = {
        reg_no: regNo,
        advisor_name: "Rupesh CN",
        opening_km: Number(openingKm || 0),
        complaint_text: complaintText,
        service_type: serviceType,
        complaint_source: complaintSource,
        repeat_complaint: Boolean(vehicle?.repeatComplaintIndicator),
        ai_parsed_issues: analysis?.issues || [],
        advisor_observations: advisorObservations,
        suggested_repairs: suggestedRepairs,
        selected_services: services,
        selected_parts: parts,
        discount_amount: discountAmount,
        addon_total: services.filter((item) => item.source_type === "ADD SERVICES").reduce((sum, item) => sum + Number(item.total_cost || 0), 0),
        approval_status: approvalStatus,
        typed_acknowledgement: typedAck,
        signature_data_url: signature,
        status,
      };
      activeJobCard = await createJobCard(payload);
      setJobCard(activeJobCard);
      navigate(`/job-cards/${activeJobCard.id}`, { replace: true });
    }
    const assignments = selectedTechIds.map((technicianId) => {
      const tech = technicians.find((item) => item.id === technicianId);
      return {
        technician_id: technicianId,
        assignment_type: tech?.specialization === "General Service" ? "General" : "Specialist",
        assigned_task: analysis?.jobType || "Workshop task",
        task_status: "Pending",
        checklist: [{ label: "Start job", done: false }, { label: "Update work status", done: false }],
      };
    });
    const assigned = await assignTechnicians(activeJobCard.id, { assignments, bay_no: technicians.find((item) => item.id === selectedTechIds[0])?.bay_no || "Bay 3" });
    setJobCard(assigned);
    setStatus(assigned.status);
    setToast("Technician assignment saved.");
  };

  const toggleTech = (technician) => {
    setSelectedTechIds((current) => (current.includes(technician.id) ? current.filter((id) => id !== technician.id) : [...current, technician.id]));
  };

  return (
    <main className="app-shell space-y-6">
      {toast ? <NotifToast message={toast} /> : null}
      {loadingPage ? <LoadingSpinner label="Loading job card..." /> : null}
      {jobCard ? <LifecycleBar status={jobCard.status} approvalStatus={jobCard.approval_status} paymentStatus={jobCard.payment_status} bayNo={jobCard.bay_no} /> : null}

      <SectionCard title="Vehicle Intake" subtitle="Upload number plate and odometer images, then verify editable extracted values">
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageUploadZone label="Number Plate Image" file={plateFile} onChange={setPlateFile} helper="Use seeded filenames like plate_kl07ab1234.jpg for deterministic extraction." />
          <ImageUploadZone label="Odometer Image" file={odometerFile} onChange={setOdometerFile} helper="Use seeded filenames like odometer_15823km.jpg for deterministic extraction." />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={handleExtraction} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white">Run Suggested Match</button>
          {extractionLoading ? <LoadingSpinner label="Extracting registration and odometer..." /> : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="field-label">Reg No</label>
            <input className="field-input" value={regNo} onChange={(event) => setRegNo(event.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="field-label">Odometer</label>
            <input className="field-input" value={openingKm} onChange={(event) => setOpeningKm(event.target.value)} />
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={() => runLookup()} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Lookup Vehicle</button>
        </div>
      </SectionCard>

      <SectionCard title="Job Card Core Details" subtitle="Clear separation of customer issues, advisor observations, and suggested repairs">
        <div className="mb-4 grid gap-4 md:grid-cols-3">
          <div><label className="field-label">Service Type</label><select className="field-input" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>{SERVICE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="field-label">Complaint Source</label><select className="field-input" value={complaintSource} onChange={(event) => setComplaintSource(event.target.value)}>{COMPLAINT_SOURCES.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="field-label">Job Status</label><select className="field-input" value={status} onChange={(event) => setStatus(event.target.value)}>{JOB_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
        </div>
        <CustomerVoicePanel complaintText={complaintText} onComplaintChange={setComplaintText} advisorObservations={advisorObservations} onAdvisorChange={setAdvisorObservations} suggestedRepairs={suggestedRepairs} onRepairsChange={setSuggestedRepairs} />
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={analyzeComplaint} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Analyze Complaint</button>
        </div>
        {analysis ? <div className="mt-5"><ParsedIssueCards analysis={analysis} onApplyService={addRecommendedService} /></div> : null}
      </SectionCard>

      <SectionCard title="Inventory Availability" subtitle="Parts, stock, unit price, source / godown, and availability color coding">
        <InventoryTable items={inventory} onAddPart={addPart} />
      </SectionCard>

      <SectionCard title="ADD SERVICES" subtitle="Value-added services and workshop extras">
        <AddonServices onAdd={addAddon} />
      </SectionCard>

      <SectionCard title="Estimate & Approval" subtitle="Backend-driven estimate, customer approval, typed acknowledgement, and e-signature">
        <div className="grid gap-4 md:grid-cols-2">
          <DiscountRow value={discountAmount} onChange={setDiscountAmount} />
          <div>
            <label className="field-label">Approval Status</label>
            <select className="field-input" value={approvalStatus} onChange={(event) => setApprovalStatus(event.target.value)}>
              {APPROVAL_STATUSES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-5"><EstimatePanel estimate={estimate} /></div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div>
            <label className="field-label">Typed Acknowledgement</label>
            <textarea className="field-input min-h-36" value={typedAck} onChange={(event) => setTypedAck(event.target.value)} placeholder="Customer approval acknowledgement..." />
          </div>
          <div>
            <label className="field-label">E-Signature</label>
            <SignaturePadField onChange={setSignature} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Technician Assignment" subtitle="One general mechanic is mandatory. Assign specialists based on issue type and availability.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {technicians.map((technician) => (
            <TechnicianCard key={technician.id} technician={technician} selected={selectedTechIds.includes(technician.id)} onSelect={toggleTech} />
          ))}
        </div>
      </SectionCard>

      <BottomBar>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">{jobCard ? `Editing ${jobCard.job_card_no}` : "Create draft and continue to billing or technician view once saved."}</div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={persistJobCard} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Save Job Card</button>
            <button type="button" onClick={saveAssignments} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white">Save Assignment</button>
            {jobCard ? <Link to={`/billing/${jobCard.id}`} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Go To Billing</Link> : null}
          </div>
        </div>
      </BottomBar>
    </main>
  );
}
