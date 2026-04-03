import { useMemo, useState } from "react";
import BottomBar from "../components/layout/BottomBar";
import ImageUploadZone from "../components/intake/ImageUploadZone";
import VehicleLookupCard from "../components/intake/VehicleLookupCard";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import NotifToast from "../components/shared/NotifToast";
import SectionCard from "../components/shared/SectionCard";
import { useExtraction } from "../hooks/useExtraction";
import { createCheckIn, getCheckInEntryPassUrl } from "../services/checkInService";
import { getVehicleByRegNo, getVehicleHistory } from "../services/vehicleService";

const ADVISORS = ["Rupesh CN", "Arjun", "Rohan"];
const PURPOSE_OPTIONS = ["Service Appointment", "Walk-in Service", "General Enquiry", "Vehicle Pickup", "Sales Enquiry"];

const todayDate = () => new Date().toISOString().slice(0, 10);

export default function CheckIn() {
  const [plateFile, setPlateFile] = useState(null);
  const [odometerFile, setOdometerFile] = useState(null);
  const [regNo, setRegNo] = useState("");
  const [openingKm, setOpeningKm] = useState("0");
  const [vehicle, setVehicle] = useState(null);
  const [history, setHistory] = useState([]);
  const [appointmentStatus, setAppointmentStatus] = useState("Appointment Confirmed");
  const [appointmentDate, setAppointmentDate] = useState(todayDate());
  const [appointmentTime, setAppointmentTime] = useState("10:30");
  const [purposeOfVisit, setPurposeOfVisit] = useState("Service Appointment");
  const [advisorName, setAdvisorName] = useState("Rupesh CN");
  const [notes, setNotes] = useState("");
  const [savedCheckIn, setSavedCheckIn] = useState(null);
  const [toast, setToast] = useState("");
  const [error, setError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { loading: extractionLoading, runPlateExtraction, runOdometerExtraction } = useExtraction();

  const handlePlateUpload = async (file) => {
    setPlateFile(file);
    setError("");
    setSavedCheckIn(null);
    if (!file) return;
    try {
      setLookupLoading(true);
      const extracted = await runPlateExtraction(file);
      const extractedRegNo = extracted?.regNo?.toUpperCase();
      if (!extractedRegNo || extractedRegNo === "UNKNOWN") {
        setError("Unable to extract a valid registration number from the uploaded image.");
        return;
      }
      setRegNo(extractedRegNo);
      const [vehicleData, historyData] = await Promise.all([getVehicleByRegNo(extractedRegNo), getVehicleHistory(extractedRegNo)]);
      setVehicle(vehicleData);
      setHistory(historyData.serviceHistory || []);
      setToast("Customer and vehicle details loaded from number plate scan.");
    } catch (err) {
      setVehicle(null);
      setHistory([]);
      setError(err.response?.data?.detail || "Unable to load customer and vehicle details.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleOdometerUpload = async (file) => {
    setOdometerFile(file);
    setError("");
    if (!file) return;
    try {
      const extracted = await runOdometerExtraction(file);
      if (!extracted?.km) {
        setError("Unable to extract odometer reading from the uploaded image.");
        return;
      }
      setOpeningKm(String(extracted.km));
      setToast(`Odometer updated to ${extracted.km} km.`);
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to extract odometer value.");
    }
  };

  const appointmentMessage = useMemo(() => {
    if (!vehicle) return "";
    return appointmentStatus === "Appointment Confirmed"
      ? `This customer has taken an appointment for service on ${appointmentDate} at ${appointmentTime}.`
      : "This vehicle is marked as a walk-in visit at the security gate.";
  }, [appointmentDate, appointmentStatus, appointmentTime, vehicle]);

  const createEntryPass = async () => {
    if (!vehicle || !regNo) {
      setError("Scan the number plate first so customer and vehicle details can load.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const result = await createCheckIn({
        reg_no: regNo,
        opening_km: Number(openingKm || 0),
        appointment_status: appointmentStatus,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        purpose_of_visit: purposeOfVisit,
        advisor_name: advisorName,
        notes,
      });
      setSavedCheckIn(result.checkIn);
      setToast(`Entry pass ${result.checkIn.check_in_no} generated successfully.`);
      window.open(getCheckInEntryPassUrl(result.checkIn.id), "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to generate the entry pass.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="app-shell space-y-6">
      {toast ? <NotifToast message={toast} /> : null}

      <SectionCard title="Security Check-in" subtitle="Create a service-center entry pass by scanning the vehicle and confirming the visit details.">
        <div className="grid gap-4 lg:grid-cols-2">
          <ImageUploadZone
            label="Number Plate Image"
            file={plateFile}
            onChange={handlePlateUpload}
            helper="Upload the number plate image to auto-load customer and vehicle details."
          />
          <ImageUploadZone
            label="Odometer Image"
            file={odometerFile}
            onChange={handleOdometerUpload}
            helper="Upload the odometer image to auto-fill the entry reading."
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          {extractionLoading || lookupLoading ? <LoadingSpinner label={lookupLoading ? "Loading customer and vehicle details..." : "Extracting scan details..."} /> : null}
          {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="field-label">Reg No</label>
            <input className="field-input bg-slate-50" value={regNo} onChange={(event) => setRegNo(event.target.value.toUpperCase())} />
          </div>
          <div>
            <label className="field-label">Entry Odometer</label>
            <input className="field-input" value={openingKm} onChange={(event) => setOpeningKm(event.target.value)} />
          </div>
        </div>
      </SectionCard>

      {vehicle ? (
        <>
          <VehicleLookupCard vehicle={vehicle} />
          <SectionCard title="Appointment & Visit Details" subtitle="Confirm appointment, visit purpose, advisor, and gate-side notes before generating the pass.">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="field-label">Appointment Status</label>
                <select className="field-input" value={appointmentStatus} onChange={(event) => setAppointmentStatus(event.target.value)}>
                  <option>Appointment Confirmed</option>
                  <option>Walk-in</option>
                </select>
              </div>
              <div>
                <label className="field-label">Appointment Date</label>
                <input className="field-input" type="date" value={appointmentDate} onChange={(event) => setAppointmentDate(event.target.value)} />
              </div>
              <div>
                <label className="field-label">Appointment Time</label>
                <input className="field-input" type="time" value={appointmentTime} onChange={(event) => setAppointmentTime(event.target.value)} />
              </div>
              <div>
                <label className="field-label">Purpose of Visit</label>
                <select className="field-input" value={purposeOfVisit} onChange={(event) => setPurposeOfVisit(event.target.value)}>
                  {PURPOSE_OPTIONS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">Advisor</label>
                <select className="field-input" value={advisorName} onChange={(event) => setAdvisorName(event.target.value)}>
                  {ADVISORS.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Security Notes</label>
                <textarea className="field-input min-h-28" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Visitor instructions, token details, special gate notes..." />
              </div>
            </div>
            <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {appointmentMessage}
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Previous Service Visits</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{history.length}</p>
                <p className="text-sm text-slate-500">Useful for security/advisor handoff at the gate.</p>
              </div>
              {savedCheckIn ? (
                <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">Latest Entry Pass</p>
                  <p className="mt-2 text-lg font-semibold text-primary-700">{savedCheckIn.check_in_no}</p>
                  <p className="mt-1 text-sm text-primary-700">{savedCheckIn.purpose_of_visit} - {savedCheckIn.advisor_name}</p>
                </div>
              ) : null}
            </div>
          </SectionCard>
        </>
      ) : null}

      <BottomBar>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm text-slate-600">
            Scan the number plate and odometer, confirm the visit details, then generate the security entry pass.
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" onClick={createEntryPass} disabled={!vehicle || saving} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Generating..." : "Generate Entry Pass"}
            </button>
            {savedCheckIn ? (
              <a href={getCheckInEntryPassUrl(savedCheckIn.id)} target="_blank" rel="noreferrer" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
                Download Entry Pass
              </a>
            ) : null}
          </div>
        </div>
      </BottomBar>
    </main>
  );
}
