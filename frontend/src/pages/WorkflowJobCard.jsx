import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import BottomBar from "../components/layout/BottomBar";
import LifecycleBar from "../components/layout/LifecycleBar";
import WorkflowStepper from "../components/layout/WorkflowStepper";
import ImageUploadZone from "../components/intake/ImageUploadZone";
import ServiceHistory from "../components/intake/ServiceHistory";
import VehicleLookupCard from "../components/intake/VehicleLookupCard";
import AddonServices from "../components/jobcard/AddonServices";
import CustomerVoicePanel from "../components/jobcard/CustomerVoicePanel";
import DiscountRow from "../components/jobcard/DiscountRow";
import EstimatePanel from "../components/jobcard/EstimatePanel";
import InventoryTable from "../components/jobcard/InventoryTable";
import ComplaintParsedPanel from "../components/jobcard/ComplaintParsedPanel";
import SignaturePadField from "../components/jobcard/SignaturePad";
import TechnicianCard from "../components/technician/TechnicianCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import NotifToast from "../components/shared/NotifToast";
import SectionCard from "../components/shared/SectionCard";
import { useExtraction } from "../hooks/useExtraction";
import { assignTechnicians, createJobCard, getJobCard, recomputeEstimate, updateJobCard } from "../services/jobCardService";
import { getInventory } from "../services/inventoryService";
import { parseComplaint } from "../services/mockAiService";
import { getTechnicians } from "../services/technicianService";
import { getVehicleByRegNo, getVehicleHistory } from "../services/vehicleService";
import { APPROVAL_STATUSES, COMPLAINT_SOURCES, JOB_STATUSES, SERVICE_CATALOG, SERVICE_TYPES } from "../utils/constants";

const STEPS = [
  { key: "intake", title: "Vehicle Intake", short: "Images and extracted values" },
  { key: "history", title: "Vehicle & History", short: "Customer and prior visits" },
  { key: "complaint", title: "Complaint Analysis", short: "Issues and observations" },
  { key: "estimate", title: "Estimate", short: "Parts, add services, ETA" },
  { key: "approval", title: "Approval & Assignment", short: "Approval and technicians" },
];

const stepFromStatus = (status, requested) => requested && STEPS.some((s) => s.key === requested)
  ? requested
  : ["Paid", "Closed", "Billing In Progress", "Work Completed", "Assigned", "In Progress", "Approved", "Awaiting Approval"].includes(status)
    ? "approval"
    : status === "Estimate Prepared"
      ? "estimate"
      : status === "Draft"
        ? "complaint"
        : "intake";

const useQuery = () => new URLSearchParams(useLocation().search);
const enrichService = (code) => {
  const service = SERVICE_CATALOG[code];
  return service ? { ...service, quantity: 1, total_cost: service.unit_cost, source_type: "Suggested Services" } : null;
};

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined || value === "") return [];
  return [value];
};

const normalizeAnalysis = (analysis) => {
  if (!analysis || typeof analysis !== "object") return null;
  return {
    ...analysis,
    issues: asArray(analysis.issues),
    displayIssues: asArray(analysis.displayIssues),
    severity: asArray(analysis.severity),
    serviceCodes: asArray(analysis.serviceCodes),
    recommendedServices: asArray(analysis.recommendedServices),
    recommendedSpecialists: asArray(analysis.recommendedSpecialists),
  };
};

const MIN_LABOUR_TOTAL = 7000;

const mergeServices = (currentServices, recommendedServices) => {
  const next = [...currentServices];
  asArray(recommendedServices).forEach((serviceCode) => {
    const service = enrichService(serviceCode);
    if (service && !next.some((item) => item.service_catalog_id === service.service_catalog_id)) {
      next.push(service);
    }
  });
  return next;
};

const mergeParts = (currentParts, suggestedItems) => {
  const next = [...currentParts];
  asArray(suggestedItems).forEach((item) => {
    if (!item?.id || next.some((part) => part.inventory_id === item.id)) return;
    next.push({
      inventory_id: item.id,
      part_name: item.part_name,
      quantity: 1,
      unit_price: item.unit_price,
      total_price: item.unit_price,
      availability_status: item.availability_status,
      source_location: item.source_location,
      source_type: "Suggested Parts",
      auto_selected: true,
    });
  });
  return next;
};

export default function WorkflowJobCard() {
  const { jobCardId: pathJobCardId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const query = useQuery();
  const requestedStep = query.get("step");
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
  const [primaryTechnicianId, setPrimaryTechnicianId] = useState("");
  const [selectedSpecialistIds, setSelectedSpecialistIds] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [serviceType, setServiceType] = useState("Running Repair");
  const [complaintSource, setComplaintSource] = useState("Walk-in");
  const [approvalStatus, setApprovalStatus] = useState("Pending");
  const [typedAck, setTypedAck] = useState("");
  const [signature, setSignature] = useState("");
  const [status, setStatus] = useState("Draft");
  const [toast, setToast] = useState("");
  const [assignmentError, setAssignmentError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [loadingPage, setLoadingPage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [backendEstimate, setBackendEstimate] = useState(null);
  const [autoSelectedPartIds, setAutoSelectedPartIds] = useState([]);
  const [otpVerified, setOtpVerified] = useState(Boolean(initialJobCardId));
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [activeStep, setActiveStep] = useState(stepFromStatus("Draft", requestedStep));
  const { loading: extractionLoading, runPlateExtraction, runOdometerExtraction } = useExtraction();

  useEffect(() => { getTechnicians().then((d) => setTechnicians(d.items)); }, []);
  useEffect(() => { if (!pathJobCardId) setActiveStep(stepFromStatus(status, requestedStep)); }, [pathJobCardId, requestedStep, status]);
  useEffect(() => {
    if (!initialJobCardId) return;
    setLoadingPage(true);
    getJobCard(initialJobCardId).then((data) => {
      setJobCard(data); setRegNo(data.reg_no); setOpeningKm(data.opening_km); setComplaintText(data.complaint_text);
      setAdvisorObservations(data.advisor_observations || ""); setSuggestedRepairs(data.suggested_repairs || "");
      const loadedServices = data.services || [];
      const loadedParts = data.parts || [];
      setServices(loadedServices); setParts(loadedParts); setApprovalStatus(data.approval_status); setStatus(data.status);
      setTypedAck(data.typed_acknowledgement || ""); setSignature(data.signature_data_url || "");
      setVehicle({
        customer_name: data.customer_name, customer_phone: data.phone, customer_email: data.email, customer_address: data.address,
        reg_no: data.reg_no, make: data.make, model: data.model, variant: data.variant, current_km: data.current_km,
        serviceVisitCount: data.serviceHistory?.length || 0, repeatComplaintIndicator: Boolean(data.repeat_complaint),
        previousComplaints: (data.serviceHistory || []).map((item) => ({ complaint_summary: item.complaint_summary, service_date: item.service_date })),
      });
      setHistory(data.serviceHistory || []); setPaymentHistory(data.payments || []);
      if (Array.isArray(data.ai_parsed_issues) && data.ai_parsed_issues.length) {
        setAnalysis((current) => current || normalizeAnalysis({
          issues: data.ai_parsed_issues,
          displayIssues: data.ai_parsed_issues.map((item) => item.title || item.category || "Issue"),
          severity: [],
          serviceCodes: [],
          recommendedServices: [],
          recommendedSpecialists: [],
          priority: "P3 - Standard",
          estTimeMins: 60,
          displayTime: "~1.0 hrs",
          jobType: serviceType,
        }));
      }
      const assignedGeneral = (data.technicians || []).find((tech) => tech.assignment_type === "General" || tech.specialization === "General Service");
      setPrimaryTechnicianId(assignedGeneral?.technician_id || "");
      setSelectedSpecialistIds((data.technicians || []).filter((tech) => tech.technician_id !== assignedGeneral?.technician_id).map((tech) => tech.technician_id));
      setBackendEstimate({
        laborTotal: Number(data.labor_total || 0), partsTotal: Number(data.parts_total || 0), addonTotal: Number(data.addon_total || 0),
        discount: Number(data.discount_amount || 0), gstAmount: Number(data.gst_amount || 0),
        grandTotal: Number(data.final_cost || data.estimated_cost || 0), etaMins: Number(data.eta_mins || 0),
      });
      const rawLaborTotal = loadedServices.reduce((sum, item) => sum + Number(item.total_cost || item.unit_cost || 0), 0);
      const loadedLaborTotal = (loadedServices.length || loadedParts.length) ? Math.max(rawLaborTotal, MIN_LABOUR_TOTAL) : 0;
      const loadedPartsTotal = loadedParts.reduce((sum, item) => sum + Number(item.total_price || item.unit_price || 0), 0);
      const loadedAddonTotal = loadedServices.filter((item) => item.source_type === "ADD SERVICES").reduce((sum, item) => sum + Number(item.total_cost || item.unit_cost || 0), 0);
      const loadedSubtotal = loadedLaborTotal + loadedPartsTotal + loadedAddonTotal;
      setDiscountPercent(loadedSubtotal > 0 ? Number((((Number(data.discount_amount || 0) / loadedSubtotal) * 100) || 0).toFixed(2)) : 0);
      setOtpVerified(true);
      setActiveStep(stepFromStatus(data.status, requestedStep));
    }).finally(() => setLoadingPage(false));
  }, [initialJobCardId, requestedStep]);

  useEffect(() => {
    const issueLabels = analysis?.displayIssues?.length
      ? analysis.displayIssues
      : (jobCard?.ai_parsed_issues || []).map((item) => item.title || item.category || "Issue");
    const serviceCodes = analysis?.serviceCodes || [];
    const selectedServiceNames = services.map((item) => item.service_name);
    getInventory({
      workflow: true,
      issues: issueLabels.join("|"),
      service_codes: serviceCodes.join("|"),
      selected_services: selectedServiceNames.join("|"),
    }).then((data) => setInventory(data.items));
  }, [analysis, jobCard?.ai_parsed_issues, services]);

  const computedDiscountAmount = useMemo(() => {
    const rawLaborTotal = services.reduce((sum, item) => sum + Number(item.total_cost || item.unit_cost || 0), 0);
    const partsTotal = parts.reduce((sum, item) => sum + Number(item.total_price || item.unit_price || 0), 0);
    const addonTotal = services.filter((item) => item.source_type === "ADD SERVICES").reduce((sum, item) => sum + Number(item.total_cost || item.unit_cost || 0), 0);
    const laborTotal = (services.length || parts.length) ? Math.max(rawLaborTotal, MIN_LABOUR_TOTAL) : 0;
    const subtotal = laborTotal + partsTotal + addonTotal;
    return Number(((subtotal * discountPercent) / 100).toFixed(2));
  }, [discountPercent, parts, services]);

  const previewEstimate = useMemo(() => {
    const rawLaborTotal = services.reduce((sum, item) => sum + Number(item.total_cost || item.unit_cost || 0), 0);
    const partsTotal = parts.reduce((sum, item) => sum + Number(item.total_price || item.unit_price || 0), 0);
    const addonTotal = services.filter((item) => item.source_type === "ADD SERVICES").reduce((sum, item) => sum + Number(item.total_cost || item.unit_cost || 0), 0);
    const laborTotal = (services.length || parts.length) ? Math.max(rawLaborTotal, MIN_LABOUR_TOTAL) : 0;
    const taxable = Math.max(laborTotal + partsTotal + addonTotal - computedDiscountAmount, 0);
    return { laborTotal, partsTotal, addonTotal, discount: computedDiscountAmount, gstAmount: Math.round(taxable * 0.18), grandTotal: taxable + Math.round(taxable * 0.18), etaMins: services.reduce((sum, item) => sum + Number(item.estimated_time_mins || 0), 30) };
  }, [computedDiscountAmount, parts, services]);

  const estimate = previewEstimate;
  const activeIndex = STEPS.findIndex((step) => step.key === activeStep);
  const availableGeneralTechnicians = technicians.filter((item) => item.specialization === "General Service" && item.availability_status === "Available");
  const specialistTechnicians = technicians.filter((item) => item.specialization !== "General Service");
  const selectedTechnicians = technicians.filter((item) => [primaryTechnicianId, ...selectedSpecialistIds].includes(item.id));
  const recommendedSpecialists = analysis?.recommendedSpecialists || [];
  const selectedAddonNames = services.filter((item) => item.source_type === "ADD SERVICES").map((item) => item.service_name);
  const selectedPartIds = parts.map((item) => item.inventory_id).filter(Boolean);
  const addonTotal = services.filter((item) => item.source_type === "ADD SERVICES").reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
  const repeatComplaintFlag = vehicle?.repeatComplaintIndicator ? "Repeat complaint watchlist" : "No repeat complaint";
  const canPersistJobCard = Boolean(regNo.trim() && vehicle?.reg_no && vehicle.reg_no.toUpperCase() === regNo.trim().toUpperCase() && (jobCard || otpVerified));

  const syncStep = (step) => {
    setActiveStep(step);
    const nextQuery = new URLSearchParams(location.search);
    nextQuery.set("step", step);
    navigate(`${location.pathname}?${nextQuery.toString()}`, { replace: true });
  };

  const buildPayload = (overrides = {}) => ({
    reg_no: regNo, advisor_name: "Rupesh CN", opening_km: Number(openingKm || 0), complaint_text: complaintText, service_type: serviceType,
    complaint_source: complaintSource, repeat_complaint: Boolean(vehicle?.repeatComplaintIndicator), ai_parsed_issues: analysis?.issues || jobCard?.ai_parsed_issues || [],
    advisor_observations: advisorObservations, suggested_repairs: suggestedRepairs, selected_services: services, selected_parts: parts,
    discount_amount: computedDiscountAmount, addon_total: addonTotal, approval_status: approvalStatus, typed_acknowledgement: typedAck, signature_data_url: signature, status, ...overrides,
  });

  const refreshEstimate = async (jobCardIdToUse = jobCard?.id, estimateInputs = {}) => {
    if (!jobCardIdToUse) return previewEstimate;
    const selectedServices = estimateInputs.selected_services || services;
    const selectedParts = estimateInputs.selected_parts || parts;
    const selectedAddonTotal = estimateInputs.addon_total ?? selectedServices.filter((item) => item.source_type === "ADD SERVICES").reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
    const selectedDiscount = estimateInputs.discount_amount ?? computedDiscountAmount;
    const computed = await recomputeEstimate(jobCardIdToUse, { selected_services: selectedServices, selected_parts: selectedParts, addon_total: selectedAddonTotal, discount_amount: selectedDiscount });
    setBackendEstimate(computed);
    return computed;
  };

  const persistJobCard = async (overrides = {}, options = {}) => {
    if (!canPersistJobCard) {
      const message = "Run extraction or enter a valid Reg No and complete vehicle lookup before saving.";
      setLookupError(message);
      setToast(message);
      throw new Error(message);
    }
    setSaving(true);
    try {
      const saved = jobCard ? await updateJobCard(jobCard.id, buildPayload(overrides)) : await createJobCard(buildPayload(overrides));
      setJobCard(saved); setStatus(saved.status); setApprovalStatus(saved.approval_status); setToast(`Job card ${saved.job_card_no} saved successfully.`);
      if (!pathJobCardId) navigate(`/job-cards/${saved.id}?step=${activeStep}`, { replace: true });
      if (options.refreshEstimate !== false) await refreshEstimate(saved.id);
      return saved;
    } finally { setSaving(false); }
  };

  const runLookup = async (regNoToUse = regNo) => {
    try {
      const normalizedRegNo = regNoToUse.trim().toUpperCase();
      const [vehicleData, historyData] = await Promise.all([getVehicleByRegNo(normalizedRegNo), getVehicleHistory(normalizedRegNo)]);
      setRegNo(normalizedRegNo);
      setVehicle(vehicleData); setHistory(historyData.serviceHistory); setPaymentHistory(historyData.paymentHistory); setOpeningKm((current) => current || vehicleData.current_km || "");
      setLookupError("");
      setToast(`Vehicle lookup complete for ${normalizedRegNo}.`);
    } catch (error) {
      setVehicle(null);
      setHistory([]);
      setPaymentHistory([]);
      setLookupError(error?.response?.data?.detail || "Vehicle lookup failed. Enter a valid Reg No and try again.");
      throw error;
    }
  };

  const handlePlateSubmission = async () => {
    const extractedPlate = await runPlateExtraction(plateFile);
    if (extractedPlate?.regNo && extractedPlate.regNo !== "UNKNOWN") {
      setRegNo(extractedPlate.regNo);
      await runLookup(extractedPlate.regNo);
      setOtpVerified(false);
      setOtpValue("");
      setOtpModalOpen(true);
      setToast("OTP Sent");
      return;
    }
    setToast("Unable to extract a valid Reg No from the number plate image.");
  };

  const handleOdometerExtraction = async () => {
    const extractedOdometer = await runOdometerExtraction(odometerFile);
    if (extractedOdometer?.km) {
      setOpeningKm(extractedOdometer.km);
      setToast(`Odometer extracted: ${extractedOdometer.km} km`);
      return;
    }
    setToast("Unable to extract odometer value from the uploaded image.");
  };

  const submitOtp = () => {
    if (!/^\d{6}$/.test(otpValue.trim())) {
      setToast("Enter any 6-digit OTP to continue.");
      return;
    }
    setOtpVerified(true);
    setOtpModalOpen(false);
    setToast("OTP verified. Odometer upload is now enabled.");
  };

  const prepareComplaintEstimate = async ({ includeSuggestedParts = false } = {}) => {
    const parsed = normalizeAnalysis(await parseComplaint({ text: complaintText, advisorObservations: advisorObservations, suggestedRepairs: suggestedRepairs }));
    const nextServices = mergeServices(services, parsed?.recommendedServices);
    let suggestedInventoryItems = [];
    let nextParts = parts;
    if (includeSuggestedParts) {
      const inventoryData = await getInventory({
        workflow: true,
        issues: (parsed?.displayIssues || []).join("|"),
        service_codes: (parsed?.serviceCodes || []).join("|"),
        selected_services: nextServices.map((item) => item.service_name).join("|"),
      });
      suggestedInventoryItems = inventoryData.items || [];
      nextParts = mergeParts(parts, suggestedInventoryItems);
      setInventory(suggestedInventoryItems);
      setAutoSelectedPartIds(suggestedInventoryItems.map((item) => item.id).filter((id) => nextParts.some((part) => part.inventory_id === id)));
      setParts(nextParts);
    }
    setAnalysis(parsed);
    setServices(nextServices);
    return { parsed, nextServices, nextParts, suggestedInventoryItems };
  };

  const analyze = async () => {
    await prepareComplaintEstimate({ includeSuggestedParts: false });
    setToast("System Suggestion prepared from customer complaint.");
  };

  const addRecommendedService = (serviceCode) => {
    const service = enrichService(serviceCode);
    if (!service) return;
    setServices((current) => current.some((item) => item.service_catalog_id === service.service_catalog_id) ? current : [...current, service]);
  };

  const addPart = (item) => setParts((current) => current.some((part) => part.inventory_id === item.id) ? current : [...current, { inventory_id: item.id, part_name: item.part_name, quantity: 1, unit_price: item.unit_price, total_price: item.unit_price, availability_status: item.availability_status, source_location: item.source_location, source_type: "Suggested Parts" }]);
  const addAddon = (addon) => setServices((current) => current.some((item) => item.source_type === "ADD SERVICES" && item.service_name === addon.service_name)
    ? current.filter((item) => !(item.source_type === "ADD SERVICES" && item.service_name === addon.service_name))
    : [...current, { service_name: addon.service_name, quantity: 1, unit_cost: addon.unit_cost, total_cost: addon.unit_cost, source_type: addon.source_type, estimated_time_mins: 35 }]);
  const togglePrimaryTechnician = (technician) => {
    setPrimaryTechnicianId(technician.id);
    setAssignmentError("");
  };
  const toggleSpecialistTechnician = (technician) => {
    setSelectedSpecialistIds((current) => current.includes(technician.id) ? current.filter((id) => id !== technician.id) : [...current, technician.id]);
  };

  const saveAssignments = async () => {
    if (!primaryTechnicianId) {
      setAssignmentError("Select one available General Service technician before saving assignment.");
      throw new Error("General Service technician required.");
    }
    let activeJobCard = jobCard;
    if (!activeJobCard) activeJobCard = await persistJobCard({}, { refreshEstimate: false });
    const allSelectedIds = [primaryTechnicianId, ...selectedSpecialistIds];
    const assignments = allSelectedIds.map((technicianId) => {
      const tech = technicians.find((item) => item.id === technicianId);
      return {
        technician_id: technicianId,
        assignment_type: technicianId === primaryTechnicianId ? "General" : "Specialist",
        assigned_task: technicianId === primaryTechnicianId ? "Primary workshop execution" : (analysis?.jobType || "Issue-specific work"),
        task_status: "Pending",
      };
    });
    const assigned = await assignTechnicians(activeJobCard.id, { assignments, bay_no: technicians.find((item) => item.id === primaryTechnicianId)?.bay_no || "Bay 3" });
    setJobCard(assigned); setStatus(assigned.status); setToast("Technician assignment saved."); setAssignmentError("");
    return assigned;
  };

  const goNext = async () => {
    try {
      if (activeStep === "intake") { await persistJobCard({ status: "Draft" }, { refreshEstimate: false }); syncStep("history"); return; }
      if (activeStep === "history") { await persistJobCard({ status: "Draft" }, { refreshEstimate: false }); syncStep("complaint"); return; }
        if (activeStep === "complaint") {
          setToast("Preparing estimate from complaint analysis...");
          const { nextServices, nextParts } = await prepareComplaintEstimate({ includeSuggestedParts: true });
          const nextAddonTotal = nextServices.filter((item) => item.source_type === "ADD SERVICES").reduce((sum, item) => sum + Number(item.total_cost || 0), 0);
          const saved = await persistJobCard({ status: "Estimate Prepared", selected_services: nextServices, selected_parts: nextParts, addon_total: nextAddonTotal }, { refreshEstimate: false });
          await refreshEstimate(saved.id, { selected_services: nextServices, selected_parts: nextParts, addon_total: nextAddonTotal, discount_amount: computedDiscountAmount });
          syncStep("estimate");
          return;
        }
      if (activeStep === "estimate") { await persistJobCard({ status: "Awaiting Approval" }, { refreshEstimate: true }); syncStep("approval"); setToast("Estimate saved. Capture customer approval and assign technicians next."); return; }
      const assigned = await saveAssignments();
      if (assigned?.job_card_no) navigate(`/technician?jobCardNo=${assigned.job_card_no}`);
    } catch (error) {
      setToast(error?.response?.data?.detail || error.message || "Unable to save assignment.");
    }
  };

  const goBack = () => { if (activeIndex > 0) syncStep(STEPS[activeIndex - 1].key); };

  const renderMainStep = () => {
    if (activeStep === "intake") return (
      <SectionCard title="Vehicle Intake Screen" subtitle="Submit the number plate first, verify OTP, then upload the odometer image">
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageUploadZone label="Number Plate Image" file={plateFile} onChange={setPlateFile} helper="Use seeded filenames like plate_kl07ab1234.jpg for deterministic extraction." />
          <ImageUploadZone
            label="Odometer Image"
            file={odometerFile}
            onChange={setOdometerFile}
            helper={otpVerified ? "Use seeded filenames like odometer_15823km.jpg for deterministic extraction." : "Verify OTP after number plate lookup to enable odometer upload."}
            disabled={!otpVerified}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={handlePlateSubmission} disabled={!plateFile} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Submit Number Plate</button>
          <button type="button" onClick={handleOdometerExtraction} disabled={!otpVerified || !odometerFile} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Extract Odometer</button>
          {extractionLoading ? <LoadingSpinner label={otpVerified ? "Extracting odometer..." : "Extracting registration and loading customer details..."} /> : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div><label className="field-label">Reg No</label><input className="field-input" value={regNo} onChange={(event) => { setRegNo(event.target.value.toUpperCase()); setLookupError(""); }} /></div>
          <div><label className="field-label">Odometer</label><input className="field-input" value={openingKm} onChange={(event) => setOpeningKm(event.target.value)} disabled={!otpVerified} /></div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => runLookup().catch(() => {})} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Lookup Vehicle</button>
          {!otpVerified ? <p className="text-sm font-medium text-primary-600">Verify OTP after number plate lookup to enable odometer upload.</p> : null}
          {lookupError ? <p className="text-sm font-medium text-rose-600">{lookupError}</p> : null}
        </div>
        {vehicle ? <div className="mt-5"><VehicleLookupCard vehicle={vehicle} /></div> : null}
        {history.length ? <div className="mt-5"><ServiceHistory history={history} paymentHistory={paymentHistory} /></div> : null}
      </SectionCard>
    );

    if (activeStep === "history") return (
      <div className="space-y-5">
        <details open className="rounded-2xl border border-slate-200 bg-white shadow-panel">
          <summary className="cursor-pointer list-none border-b border-slate-100 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">Customer Context Dashboard</p><p className="mt-1 text-sm text-slate-500">Customer details, vehicle details, service count, previous services, complaints, and payment history</p></div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{repeatComplaintFlag}</span>
            </div>
          </summary>
          <div className="p-5">
            <VehicleLookupCard vehicle={vehicle} />
            {history.length ? <div className="mt-5"><ServiceHistory history={history} paymentHistory={paymentHistory} /></div> : null}
          </div>
        </details>
      </div>
    );

    if (activeStep === "complaint") return (
      <div className="space-y-5">
        {vehicle ? <VehicleLookupCard vehicle={vehicle} /> : null}
        <SectionCard title="Complaint Analysis Screen" subtitle="Capture customer voice, advisor observations, and structured workshop recommendations">
          <div className="mb-4 grid gap-4 md:grid-cols-3">
            <div><label className="field-label">Service Type</label><select className="field-input" value={serviceType} onChange={(event) => setServiceType(event.target.value)}>{SERVICE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label className="field-label">Complaint Source</label><select className="field-input" value={complaintSource} onChange={(event) => setComplaintSource(event.target.value)}>{COMPLAINT_SOURCES.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label className="field-label">Job Status</label><select className="field-input" value={status} onChange={(event) => setStatus(event.target.value)}>{JOB_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
          </div>
          <CustomerVoicePanel complaintText={complaintText} onComplaintChange={setComplaintText} advisorObservations={advisorObservations} onAdvisorChange={setAdvisorObservations} suggestedRepairs={suggestedRepairs} onRepairsChange={setSuggestedRepairs} />
          <div className="mt-4"><button type="button" onClick={analyze} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Analyze Complaint</button></div>
          {analysis ? <div className="mt-5"><ComplaintParsedPanel analysis={analysis} onApplyService={addRecommendedService} /></div> : null}
        </SectionCard>
      </div>
    );

    if (activeStep === "estimate") return (
      <SectionCard title="Estimate Screen" subtitle="Review selected services, parts availability, add services, discount, ETA, and running totals">
        <div className="grid gap-5 xl:grid-cols-[1.2fr,0.8fr]">
          <div className="space-y-5">
            <SectionCard title="Selected Services" subtitle="Suggested labor codes and applied workshop services" className="border-slate-100 shadow-none">
              <div className="space-y-3">{services.length ? services.map((service, index) => <div key={`${service.service_name}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold text-slate-800">{service.service_name}</p><p className="text-sm text-slate-500">{service.source_type || "Workshop Service"}</p></div><p className="text-sm font-semibold text-slate-700">Qty {service.quantity || 1}</p></div></div>) : <p className="text-sm text-slate-500">No services selected yet. Analyze complaint or add workshop services to continue.</p>}</div>
            </SectionCard>
            <SectionCard title="Inventory Availability" subtitle="Only issue-relevant parts are shown here. Full stock remains available from the Inventory page." className="border-slate-100 shadow-none"><InventoryTable items={inventory} onAddPart={addPart} selectedPartIds={selectedPartIds} autoSelectedPartIds={autoSelectedPartIds} /></SectionCard>
          </div>
          <div className="space-y-5">
            <SectionCard title="ADD SERVICES" subtitle="Value-added services and workshop extras" className="border-slate-100 shadow-none"><AddonServices onToggle={addAddon} selectedServices={selectedAddonNames} /></SectionCard>
              <SectionCard title="Estimate Controls" subtitle="Discount, live total, and delivery expectation" className="border-slate-100 shadow-none">
                <div className="space-y-4">
                <DiscountRow value={discountPercent} onChange={setDiscountPercent} />
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">Visible totals update from local selections immediately. Backend estimate sync stays available when the job card is saved.</div>
                  <EstimatePanel estimate={estimate} />
                </div>
            </SectionCard>
          </div>
        </div>
      </SectionCard>
    );

    return (
      <SectionCard title="Approval & Assignment Screen" subtitle="Capture customer approval, then assign one general mechanic and any issue-specific specialists">
          <div className="grid gap-5 xl:grid-cols-[0.9fr,1.1fr]">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="field-label">Approval Status</label><select className="field-input" value={approvalStatus} onChange={(event) => setApprovalStatus(event.target.value)}>{APPROVAL_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label className="field-label">Job Status</label><select className="field-input" value={status} onChange={(event) => setStatus(event.target.value)}>{JOB_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></div>
            </div>
            <EstimatePanel estimate={estimate} showEta={false} />
            <div><label className="field-label">Typed Acknowledgement</label><textarea className="field-input min-h-32" value={typedAck} onChange={(event) => setTypedAck(event.target.value)} placeholder="Customer approval acknowledgement..." /></div>
            <div><label className="field-label">E-Signature</label><SignaturePadField onChange={setSignature} /></div>
          </div>
          <div className="space-y-5">
            <div className="rounded-2xl border border-primary-100 bg-primary-50 px-4 py-4"><p className="text-sm font-semibold text-primary-800">Assignment rule</p><p className="mt-1 text-sm text-primary-700">Every job card must include one General Service mechanic. Add specialists based on issue type and availability before handing over to the bay.</p></div>
            {assignmentError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">{assignmentError}</div> : null}
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Primary Mechanic (General - Mandatory)</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2">
                  {availableGeneralTechnicians.map((technician) => (
                    <TechnicianCard key={technician.id} technician={technician} selected={primaryTechnicianId === technician.id} onSelect={togglePrimaryTechnician} />
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Issue-Specific Specialists</p>
                <div className="mt-3 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {specialistTechnicians.map((technician) => (
                    <TechnicianCard
                      key={technician.id}
                      technician={technician}
                      selected={selectedSpecialistIds.includes(technician.id)}
                      onSelect={toggleSpecialistTechnician}
                      disabled={technician.availability_status !== "Available"}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionCard>
    );
  };

  return (
    <main className="app-shell space-y-6">
      {toast ? <NotifToast message={toast} /> : null}
      {loadingPage ? <LoadingSpinner label="Loading job card..." /> : null}
      {jobCard ? <LifecycleBar status={jobCard.status} approvalStatus={jobCard.approval_status} paymentStatus={jobCard.payment_status} bayNo={jobCard.bay_no} /> : null}
      <section className="rounded-3xl border border-slate-200 bg-white px-6 py-5 shadow-panel">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Advisor Workflow</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900">{STEPS.find((step) => step.key === activeStep)?.title}</h1>
            <p className="mt-1 text-sm text-slate-500">Follow the intake-to-assignment flow with live estimates and cleaner stage-based review.</p>
          </div>
          <div className="rounded-2xl border border-primary-300 bg-primary-50 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">Job Card</p>
            <p className="mt-1 font-mono text-lg font-semibold text-primary-700">{jobCard?.job_card_no || "Draft"}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Customer / Vehicle</p><p className="mt-2 font-semibold text-slate-800">{vehicle?.customer_name || "Lookup pending"}</p><p className="text-sm text-slate-500">{vehicle ? `${vehicle.make} ${vehicle.model} - ${vehicle.reg_no}` : "Run Suggested Match and lookup"}</p></div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Service History</p><p className="mt-2 text-2xl font-bold text-slate-900">{history.length}</p><p className="text-sm text-slate-500">{repeatComplaintFlag}</p></div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Estimate</p><p className="mt-2 text-2xl font-bold text-slate-900">Rs {Math.round(estimate.grandTotal || 0).toLocaleString("en-IN")}</p><p className="text-sm text-slate-500">ETA {estimate.etaMins || 0} mins</p></div>
          <div className="rounded-2xl bg-slate-50 px-4 py-3"><p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Payment History</p><p className="mt-2 text-2xl font-bold text-slate-900">{paymentHistory.length}</p><p className="text-sm text-slate-500">{paymentHistory[0]?.payment_method || "No prior payments"}</p></div>
        </div>
        {(recommendedSpecialists.length || selectedTechnicians.length) ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {recommendedSpecialists.map((specialist) => <span key={specialist} className="rounded-full bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-700">{specialist}</span>)}
            {selectedTechnicians.map((technician) => <span key={technician.id} className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">{technician.name}</span>)}
          </div>
        ) : null}
      </section>
      <div className="space-y-6">
        <WorkflowStepper steps={STEPS} activeStep={activeStep} onSelect={syncStep} />
        {renderMainStep()}
        {(activeStep === "complaint" || activeStep === "estimate" || activeStep === "approval") && vehicle && history.length
          ? <ServiceHistory history={history.slice(0, 3)} paymentHistory={paymentHistory.slice(0, 3)} />
          : null}
      </div>
      <BottomBar>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">{jobCard ? `Editing ${jobCard.job_card_no}` : "Create a draft, move through the staged advisor flow, then continue to technician and billing screens."}{!otpVerified && !jobCard ? " Verify the demo OTP before saving." : ""}{!canPersistJobCard && (otpVerified || jobCard) ? " Complete registration lookup before saving." : ""}</div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={goBack} disabled={activeIndex <= 0} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Back</button>
            <button type="button" onClick={() => persistJobCard().catch(() => {})} disabled={saving || !canPersistJobCard} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Save Draft</button>
            <button type="button" onClick={goNext} disabled={saving || !canPersistJobCard} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{activeStep === "approval" ? "SAVE JOB CARD" : `Continue to ${STEPS[Math.min(activeIndex + 1, STEPS.length - 1)].title}`}</button>
            {jobCard ? <Link to={`/technician?jobCardNo=${jobCard.job_card_no}`} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">Technician View</Link> : null}
            {jobCard ? <Link to={`/billing/${jobCard.id}`} className="rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Billing & Closure</Link> : null}
          </div>
        </div>
      </BottomBar>
      {otpModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 px-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600">OTP Sent</p>
            <h2 className="mt-2 text-xl font-bold text-slate-900">Verify customer OTP</h2>
            <p className="mt-2 text-sm text-slate-500">This is a demo checkpoint. Enter any 6-digit number to continue with job card creation.</p>
            <input
              className="field-input mt-5 text-center tracking-[0.35em]"
              value={otpValue}
              maxLength={6}
              onChange={(event) => setOtpValue(event.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setOtpModalOpen(false)} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Close</button>
              <button type="button" onClick={submitOtp} className="rounded-full bg-primary-500 px-4 py-2 text-sm font-semibold text-white">Submit OTP</button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
