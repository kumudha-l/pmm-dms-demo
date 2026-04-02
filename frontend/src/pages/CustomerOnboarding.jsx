import { useEffect, useMemo, useState } from "react";
import EmptyState from "../components/shared/EmptyState";
import LoadingSpinner from "../components/shared/LoadingSpinner";
import NotifToast from "../components/shared/NotifToast";
import SectionCard from "../components/shared/SectionCard";
import {
  createSalesLead,
  getSalesLead,
  getSalesAvailability,
  getSalesLeads,
  saveSalesBooking,
  saveSalesEstimate,
  saveSalesFeedback,
  saveSalesTestDrive,
  updateSalesLead,
} from "../services/salesService";

const SHOWROOMS = ["Kochi Showroom", "Ernakulam Branch", "Thrissur Branch"];
const ENQUIRY_SOURCES = ["Walk-in", "Website", "Phone Call", "Referral", "Social Media"];
const ENQUIRY_STATUSES = ["Enquired", "Follow-up Needed", "Test Drive Scheduled", "Customer Left"];
const TEST_DRIVE_STATUSES = ["Scheduled", "Done", "Cancelled"];
const NEXT_INTENT_OPTIONS = ["Wants to Book", "Needs Time to Decide", "Not Proceeding", "Will Visit Again"];
const FINANCE_OPTIONS = ["Cash Purchase", "Finance / Loan", "Exchange / Trade-in"];
const PAYMENT_MODES = ["Cash", "UPI", "Debit / Credit Card", "Bank Transfer / NEFT"];
const FILTERS = ["All", "Enquired", "Test Drive", "Wants to Book", "Soft Booked", "Not Proceeding"];
const STAGES = [
  { key: "enquiry", title: "Enquiry", short: "Basic details" },
  { key: "testDrive", title: "Test Drive", short: "Schedule and status" },
  { key: "feedback", title: "Feedback", short: "Customer response" },
  { key: "estimate", title: "Car Availability & Estimate", short: "Stock and pricing" },
  { key: "booking", title: "Soft Booking / 30,000", short: "Advance and delivery" },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateLabel(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function getPillClasses(status) {
  if (status === "Soft Booked") return "bg-emerald-50 text-emerald-700";
  if (status === "Wants to Book" || status === "Estimate Shared") return "bg-primary-50 text-primary-700";
  if (String(status).includes("Test Drive")) return "bg-sky-50 text-sky-700";
  if (status === "Not Proceeding" || status === "Customer Left") return "bg-slate-100 text-slate-500";
  if (status === "Needs Time to Decide" || status === "Will Visit Again" || status === "Follow-up Needed") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function initialLead(models = []) {
  const firstModel = models[0]?.model || "Tata Nexon";
  const firstVariant = models[0]?.variants?.[0]?.variant || "";
  return {
    customer_name: "",
    phone: "",
    email: "",
    interested_model: firstModel,
    interested_variant: firstVariant,
    showroom_location: SHOWROOMS[0],
    enquiry_source: ENQUIRY_SOURCES[0],
    lead_status: "Enquired",
    notes: "",
    follow_up_date: "",
  };
}

function initialTestDrive(model = "Tata Nexon") {
  return { model, scheduled_date: todayValue(), scheduled_time: "11:00", status: "Scheduled", notes: "" };
}

function initialFeedback() {
  return { rating_experience: 0, rating_comfort: 0, rating_advisor: 0, next_intent: "", follow_up_date: "", notes: "" };
}

function initialBooking(model = "Tata Nexon", variant = "") {
  return {
    model,
    variant,
    color_preference: "",
    finance_type: FINANCE_OPTIONS[0],
    booking_date: todayValue(),
    advance_amount: 30000,
    payment_mode: PAYMENT_MODES[0],
    payment_ref: "",
    payment_received: false,
    expected_delivery_date: "",
    delivery_location: SHOWROOMS[0],
    special_requests: "",
  };
}

function StageProgress({ currentLead }) {
  const stageState = [
    !!currentLead,
    !!currentLead?.test_drive,
    currentLead?.test_drive?.status === "Done" || !!currentLead?.feedback,
    currentLead?.feedback?.next_intent === "Wants to Book" || !!currentLead?.estimate,
    !!currentLead?.booking,
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5 shadow-panel">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Onboarding Progress</p>
      <div className="mt-4 flex flex-wrap gap-3 lg:flex-nowrap">
        {STAGES.map((stage, index) => {
          const done = stageState[index];
          const active = !done && (index === 0 || stageState[index - 1]);
          return (
            <div key={stage.key} className="flex min-w-[11rem] flex-1 items-center gap-3 rounded-2xl border px-4 py-3">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  done ? "bg-emerald-500 text-white" : active ? "bg-primary-500 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {done ? "✓" : index + 1}
              </div>
              <div>
                <p className={`text-sm font-semibold ${done ? "text-emerald-700" : active ? "text-primary-700" : "text-slate-500"}`}>{stage.title}</p>
                <p className="text-xs text-slate-500">{stage.short}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StageSection({ title, subtitle, badge, icon, collapsed, onToggle, locked, children }) {
  return (
    <section className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-panel ${locked ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary-50 text-lg text-primary-600">{icon}</div>
          <div>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-700">{title}</h3>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badge.tone}`}>{badge.label}</span>
          <button type="button" onClick={onToggle} className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500">
            {collapsed ? "▾" : "▴"}
          </button>
        </div>
      </div>
      {!collapsed ? <div className="p-5 md:p-6">{children}</div> : null}
    </section>
  );
}

function RatingRow({ label, value, onChange }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-sm font-medium text-slate-700">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`h-10 w-10 rounded-full border text-sm font-semibold ${
              value >= rating ? "border-amber-300 bg-amber-100 text-amber-700" : "border-slate-200 bg-white text-slate-500"
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function CustomerOnboarding() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [tab, setTab] = useState("new");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState({ models: [], locations: [] });
  const [leads, setLeads] = useState([]);
  const [currentLead, setCurrentLead] = useState(null);
  const [leadForm, setLeadForm] = useState(initialLead());
  const [testDriveForm, setTestDriveForm] = useState(initialTestDrive());
  const [feedbackForm, setFeedbackForm] = useState(initialFeedback());
  const [availability, setAvailability] = useState({ model: "", stock: [], variants: [] });
  const [estimateVariant, setEstimateVariant] = useState("");
  const [bookingForm, setBookingForm] = useState(initialBooking());
  const [collapsed, setCollapsed] = useState({ enquiry: false, testDrive: false, feedback: false, estimate: false, booking: false });

  useEffect(() => {
    let timeoutId;
    if (toast) {
      timeoutId = window.setTimeout(() => setToast(null), 3200);
    }
    return () => window.clearTimeout(timeoutId);
  }, [toast]);

  const modelMap = useMemo(
    () =>
      (catalog.models || []).reduce((acc, item) => {
        acc[item.model] = item.variants || [];
        return acc;
      }, {}),
    [catalog.models],
  );

  const variantOptions = modelMap[leadForm.interested_model] || [];
  const estimateVariantOptions = modelMap[availability.model || leadForm.interested_model] || [];

  const filteredLeads = useMemo(() => {
    return leads.filter((lead) => {
      const query = search.trim().toLowerCase();
      const matchesSearch = !query || [lead.customer_name, lead.phone, lead.interested_model, lead.interested_variant].join(" ").toLowerCase().includes(query);
      if (!matchesSearch) return false;
      if (filter === "All") return true;
      if (filter === "Test Drive") return String(lead.lead_status).includes("Test Drive");
      return lead.lead_status === filter;
    });
  }, [filter, leads, search]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await getSalesLeads();
        setCatalog(response.catalog);
        setLeads(response.items);
        setLeadForm(initialLead(response.catalog.models));
        setTestDriveForm(initialTestDrive(response.catalog.models?.[0]?.model || "Tata Nexon"));
        setBookingForm(initialBooking(response.catalog.models?.[0]?.model || "Tata Nexon", response.catalog.models?.[0]?.variants?.[0]?.variant || ""));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function syncLeadState(lead) {
    setCurrentLead(lead);
    setLeadForm({
      customer_name: lead.customer_name || "",
      phone: lead.phone || "",
      email: lead.email || "",
      interested_model: lead.interested_model || catalog.models?.[0]?.model || "Tata Nexon",
      interested_variant: lead.interested_variant || modelMap[lead.interested_model]?.[0]?.variant || "",
      showroom_location: lead.showroom_location || SHOWROOMS[0],
      enquiry_source: lead.enquiry_source || ENQUIRY_SOURCES[0],
      lead_status: lead.lead_status || "Enquired",
      notes: lead.notes || "",
      follow_up_date: lead.follow_up_date || "",
    });
    setTestDriveForm({
      model: lead.test_drive?.model || lead.interested_model || "Tata Nexon",
      scheduled_date: lead.test_drive?.scheduled_date || todayValue(),
      scheduled_time: lead.test_drive?.scheduled_time || "11:00",
      status: lead.test_drive?.status || "Scheduled",
      notes: lead.test_drive?.notes || "",
    });
    setFeedbackForm({
      rating_experience: lead.feedback?.rating_experience || 0,
      rating_comfort: lead.feedback?.rating_comfort || 0,
      rating_advisor: lead.feedback?.rating_advisor || 0,
      next_intent: lead.feedback?.next_intent || lead.next_intent || "",
      follow_up_date: lead.feedback?.follow_up_date || lead.follow_up_date || "",
      notes: lead.feedback?.notes || "",
    });
    const availabilityModel = lead.estimate?.model || lead.interested_model || "Tata Nexon";
    setAvailability({ model: availabilityModel, stock: lead.availability || [], variants: modelMap[availabilityModel] || [] });
    setEstimateVariant(lead.estimate?.variant || lead.interested_variant || modelMap[availabilityModel]?.[0]?.variant || "");
    setBookingForm({
      model: lead.booking?.model || lead.estimate?.model || lead.interested_model || "Tata Nexon",
      variant: lead.booking?.variant || lead.estimate?.variant || lead.interested_variant || "",
      color_preference: lead.booking?.color_preference || "",
      finance_type: lead.booking?.finance_type || FINANCE_OPTIONS[0],
      booking_date: lead.booking?.booking_date || todayValue(),
      advance_amount: lead.booking?.advance_amount || 30000,
      payment_mode: lead.booking?.payment_mode || PAYMENT_MODES[0],
      payment_ref: lead.booking?.payment_ref || "",
      payment_received: Boolean(lead.booking?.payment_received),
      expected_delivery_date: lead.booking?.expected_delivery_date || "",
      delivery_location: lead.booking?.delivery_location || SHOWROOMS[0],
      special_requests: lead.booking?.special_requests || "",
    });
    setTab("new");
  }

  function resetToNew() {
    setCurrentLead(null);
    const firstModel = catalog.models?.[0]?.model || "Tata Nexon";
    const firstVariant = catalog.models?.[0]?.variants?.[0]?.variant || "";
    setLeadForm(initialLead(catalog.models));
    setTestDriveForm(initialTestDrive(firstModel));
    setFeedbackForm(initialFeedback());
    setAvailability({ model: firstModel, stock: [], variants: modelMap[firstModel] || [] });
    setEstimateVariant(firstVariant);
    setBookingForm(initialBooking(firstModel, firstVariant));
    setCollapsed({ enquiry: false, testDrive: false, feedback: false, estimate: false, booking: false });
    setTab("new");
  }

  async function importLead(leadId) {
    const lead = await getSalesLead(leadId);
    syncLeadState(lead);
    return lead;
  }

  async function refreshLeads(selectLeadId = currentLead?.id) {
    const response = await getSalesLeads();
    setCatalog(response.catalog);
    setLeads(response.items);
    if (selectLeadId) {
      const existing = response.items.find((item) => item.id === selectLeadId);
      if (existing) {
        return importLead(selectLeadId);
      }
    }
    return null;
  }

  async function withSaving(action, successMessage) {
    setSaving(true);
    try {
      const lead = await action();
      await refreshLeads(lead?.id);
      if (lead) syncLeadState(lead);
      if (successMessage) setToast({ message: successMessage, tone: "success" });
      return lead;
    } catch (error) {
      setToast({ message: error?.response?.data?.detail || error.message || "Something went wrong.", tone: "error" });
      return null;
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveLead() {
    const payload = {
      ...leadForm,
      interested_variant: leadForm.interested_variant || variantOptions[0]?.variant || "",
      follow_up_date: leadForm.follow_up_date || null,
    };
    const action = currentLead ? () => updateSalesLead(currentLead.id, payload) : () => createSalesLead(payload);
    const successMessage = currentLead ? "Customer enquiry updated." : "Customer enquiry saved.";
    const lead = await withSaving(action, successMessage);
    if (lead) {
      setTestDriveForm((prev) => ({ ...prev, model: lead.interested_model }));
      setBookingForm((prev) => ({ ...prev, model: lead.interested_model, variant: lead.interested_variant || prev.variant }));
      setAvailability((prev) => ({ ...prev, model: lead.interested_model }));
    }
  }

  async function handleEnquiryStatusSave() {
    if (!currentLead) return;
    await withSaving(
      () =>
        updateSalesLead(currentLead.id, {
          lead_status: leadForm.lead_status,
          current_stage: leadForm.lead_status === "Test Drive Scheduled" ? "Test Drive" : currentLead.current_stage,
          follow_up_date: leadForm.follow_up_date || null,
          notes: leadForm.notes,
        }),
      "Lead status updated.",
    );
  }

  async function handleSaveTestDrive() {
    if (!currentLead) return;
    await withSaving(
      () => saveSalesTestDrive(currentLead.id, { ...testDriveForm }),
      testDriveForm.status === "Done" ? "Test drive marked completed." : "Test drive saved.",
    );
  }

  async function handleSaveFeedback() {
    if (!currentLead) return;
    if (!feedbackForm.rating_experience || !feedbackForm.rating_comfort || !feedbackForm.rating_advisor || !feedbackForm.next_intent) {
      setToast({ message: "Complete all three ratings and select the next intent.", tone: "error" });
      return;
    }
    const lead = await withSaving(
      () =>
        saveSalesFeedback(currentLead.id, {
          ...feedbackForm,
          follow_up_date: feedbackForm.follow_up_date || null,
        }),
      "Feedback saved.",
    );
    if (lead?.feedback?.next_intent === "Wants to Book") {
      const model = lead.interested_model;
      const stock = await getSalesAvailability(model);
      setAvailability(stock);
      setEstimateVariant(lead.interested_variant || stock.variants?.[0]?.variant || "");
    }
  }

  async function handleCheckAvailability() {
    const model = availability.model || leadForm.interested_model;
    if (!model) return;
    try {
      const stock = await getSalesAvailability(model);
      setAvailability(stock);
      setEstimateVariant((prev) => prev || stock.variants?.[0]?.variant || "");
      setToast({ message: `Availability loaded for ${model}.`, tone: "success" });
    } catch (error) {
      setToast({ message: error?.response?.data?.detail || "Unable to load availability.", tone: "error" });
    }
  }

  async function handleReviewEstimate() {
    if (!currentLead || !estimateVariant) return;
    const lead = await withSaving(
      () => saveSalesEstimate(currentLead.id, { model: availability.model || leadForm.interested_model, variant: estimateVariant }),
      "Estimate reviewed and soft booking unlocked.",
    );
    if (lead?.estimate) {
      setBookingForm((prev) => ({
        ...prev,
        model: lead.estimate.model,
        variant: lead.estimate.variant,
      }));
    }
  }

  async function handleSaveBooking() {
    if (!currentLead) return;
    await withSaving(
      () =>
        saveSalesBooking(currentLead.id, {
          ...bookingForm,
          expected_delivery_date: bookingForm.expected_delivery_date || null,
        }),
      bookingForm.payment_received ? "Soft booking confirmed." : "Booking draft saved.",
    );
  }

  const selectedVariantEstimate = useMemo(() => {
    const variants = availability.variants?.length ? availability.variants : estimateVariantOptions;
    const selected = variants.find((item) => item.variant === estimateVariant) || variants[0];
    if (!selected) return null;
    const exShowroom = Number(selected.ex_showroom_price || 0);
    const roadTax = Math.round(exShowroom * Number(selected.road_tax_rate || 0.1));
    const insurance = Math.round(exShowroom * Number(selected.insurance_rate || 0.035));
    const addons = Number(selected.addons_cost || 15000);
    const handling = Number(selected.handling_cost || 8000);
    return {
      model: availability.model || leadForm.interested_model,
      variant: selected.variant,
      exShowroom,
      roadTax,
      insurance,
      addons,
      handling,
      total: exShowroom + roadTax + insurance + addons + handling,
    };
  }, [availability.model, availability.variants, estimateVariant, estimateVariantOptions, leadForm.interested_model]);

  if (loading) {
    return (
      <main className="app-shell">
        <LoadingSpinner label="Loading customer onboarding..." />
      </main>
    );
  }

  const testDriveUnlocked = !!currentLead;
  const feedbackUnlocked = currentLead?.test_drive?.status === "Done" || !!currentLead?.feedback;
  const estimateUnlocked = currentLead?.feedback?.next_intent === "Wants to Book" || !!currentLead?.estimate;
  const bookingUnlocked = !!currentLead?.estimate || !!currentLead?.booking;

  return (
    <main className="app-shell space-y-6">
      {toast ? <NotifToast message={toast.message} tone={toast.tone === "error" ? "error" : "info"} /> : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Sales Workflow</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">Customer Onboarding</h1>
          <p className="mt-1 text-sm text-slate-500">
            {formatDateLabel(todayValue())} · Kochi Showroom · Capture enquiry, test drive, estimate, and soft booking in one place.
          </p>
        </div>
        <button type="button" onClick={resetToNew} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white">
          + New Customer
        </button>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: "new", label: "New Enquiry" },
          { key: "all", label: `All Customers (${leads.length})` },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold ${tab === item.key ? "border-primary-500 text-primary-600" : "border-transparent text-slate-500"}`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "new" ? (
        <div className="space-y-6">
          <StageProgress currentLead={currentLead} />

          <StageSection
            title="Section 1 · Enquiry"
            subtitle="Capture customer details, interested car, and initial lead status."
            badge={{ label: currentLead ? "Saved" : "Active", tone: currentLead ? "bg-emerald-50 text-emerald-700" : "bg-primary-50 text-primary-700" }}
            icon=""
            collapsed={collapsed.enquiry}
            onToggle={() => setCollapsed((prev) => ({ ...prev, enquiry: !prev.enquiry }))}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="field-label">Customer Name</label>
                <input className="field-input" value={leadForm.customer_name} onChange={(event) => setLeadForm((prev) => ({ ...prev, customer_name: event.target.value }))} />
              </div>
              <div>
                <label className="field-label">Phone Number</label>
                <input className="field-input" value={leadForm.phone} onChange={(event) => setLeadForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="field-input" value={leadForm.email} onChange={(event) => setLeadForm((prev) => ({ ...prev, email: event.target.value }))} />
              </div>
              <div>
                <label className="field-label">Interested Model</label>
                <select
                  className="field-input"
                  value={leadForm.interested_model}
                  onChange={(event) =>
                    setLeadForm((prev) => ({
                      ...prev,
                      interested_model: event.target.value,
                      interested_variant: modelMap[event.target.value]?.[0]?.variant || "",
                    }))
                  }
                >
                  {catalog.models.map((model) => (
                    <option key={model.model} value={model.model}>
                      {model.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Interested Variant</label>
                <select className="field-input" value={leadForm.interested_variant} onChange={(event) => setLeadForm((prev) => ({ ...prev, interested_variant: event.target.value }))}>
                  {variantOptions.map((variant) => (
                    <option key={variant.variant} value={variant.variant}>
                      {variant.variant}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Showroom Location</label>
                <select className="field-input" value={leadForm.showroom_location} onChange={(event) => setLeadForm((prev) => ({ ...prev, showroom_location: event.target.value }))}>
                  {SHOWROOMS.map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Enquiry Source</label>
                <select className="field-input" value={leadForm.enquiry_source} onChange={(event) => setLeadForm((prev) => ({ ...prev, enquiry_source: event.target.value }))}>
                  {ENQUIRY_SOURCES.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Lead Status</label>
                <select className="field-input" value={leadForm.lead_status} onChange={(event) => setLeadForm((prev) => ({ ...prev, lead_status: event.target.value }))}>
                  {ENQUIRY_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Follow-up Date</label>
                <input className="field-input" type="date" value={leadForm.follow_up_date} onChange={(event) => setLeadForm((prev) => ({ ...prev, follow_up_date: event.target.value }))} />
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <label className="field-label">Notes</label>
                <textarea className="field-input min-h-28" value={leadForm.notes} onChange={(event) => setLeadForm((prev) => ({ ...prev, notes: event.target.value }))} />
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={handleSaveLead} disabled={saving || !leadForm.customer_name || !leadForm.phone || !leadForm.interested_model} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {currentLead ? "Update Enquiry" : "Save Enquiry"}
              </button>
              {currentLead ? (
                <button type="button" onClick={handleEnquiryStatusSave} disabled={saving} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
                  Save Status
                </button>
              ) : null}
            </div>
          </StageSection>

          <StageSection
            title="Section 2 · Test Drive"
            subtitle="Schedule the drive, track completion, and keep the selected model in sync."
            badge={{ label: testDriveUnlocked ? currentLead?.test_drive?.status || "Active" : "Locked", tone: testDriveUnlocked ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-500" }}
            icon=""
            collapsed={collapsed.testDrive}
            onToggle={() => setCollapsed((prev) => ({ ...prev, testDrive: !prev.testDrive }))}
            locked={!testDriveUnlocked}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="field-label">Car Model</label>
                <select className="field-input" value={testDriveForm.model} onChange={(event) => setTestDriveForm((prev) => ({ ...prev, model: event.target.value }))} disabled={!testDriveUnlocked}>
                  {catalog.models.map((model) => (
                    <option key={model.model} value={model.model}>
                      {model.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Test Drive Date</label>
                <input className="field-input" type="date" value={testDriveForm.scheduled_date} onChange={(event) => setTestDriveForm((prev) => ({ ...prev, scheduled_date: event.target.value }))} disabled={!testDriveUnlocked} />
              </div>
              <div>
                <label className="field-label">Test Drive Time</label>
                <input className="field-input" type="time" value={testDriveForm.scheduled_time} onChange={(event) => setTestDriveForm((prev) => ({ ...prev, scheduled_time: event.target.value }))} disabled={!testDriveUnlocked} />
              </div>
              <div>
                <label className="field-label">Status</label>
                <select className="field-input" value={testDriveForm.status} onChange={(event) => setTestDriveForm((prev) => ({ ...prev, status: event.target.value }))} disabled={!testDriveUnlocked}>
                  {TEST_DRIVE_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <label className="field-label">Notes</label>
                <textarea className="field-input min-h-24" value={testDriveForm.notes} onChange={(event) => setTestDriveForm((prev) => ({ ...prev, notes: event.target.value }))} disabled={!testDriveUnlocked} />
              </div>
            </div>
            {currentLead?.test_drive ? (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                Scheduled for {formatDateLabel(currentLead.test_drive.scheduled_date)} at {currentLead.test_drive.scheduled_time}. Status: {currentLead.test_drive.status}.
              </div>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={handleSaveTestDrive} disabled={!testDriveUnlocked || saving} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                Save Test Drive
              </button>
            </div>
          </StageSection>

          <StageSection
            title="Section 3 · Feedback"
            subtitle="Capture customer response after the drive and decide the next intent."
            badge={{ label: feedbackUnlocked ? currentLead?.feedback?.next_intent || "Active" : "Locked", tone: feedbackUnlocked ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-500" }}
            icon=""
            collapsed={collapsed.feedback}
            onToggle={() => setCollapsed((prev) => ({ ...prev, feedback: !prev.feedback }))}
            locked={!feedbackUnlocked}
          >
            <div className="space-y-4">
              <RatingRow label="How was the overall drive experience?" value={feedbackForm.rating_experience} onChange={(rating) => setFeedbackForm((prev) => ({ ...prev, rating_experience: rating }))} />
              <RatingRow label="How comfortable did the car feel to the customer?" value={feedbackForm.rating_comfort} onChange={(rating) => setFeedbackForm((prev) => ({ ...prev, rating_comfort: rating }))} />
              <RatingRow label="How helpful was the sales advisor explanation?" value={feedbackForm.rating_advisor} onChange={(rating) => setFeedbackForm((prev) => ({ ...prev, rating_advisor: rating }))} />
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div>
                <label className="field-label">Next Intent</label>
                <select className="field-input" value={feedbackForm.next_intent} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, next_intent: event.target.value }))} disabled={!feedbackUnlocked}>
                  <option value="">Select intent...</option>
                  {NEXT_INTENT_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Follow-up Date</label>
                <input className="field-input" type="date" value={feedbackForm.follow_up_date} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, follow_up_date: event.target.value }))} disabled={!feedbackUnlocked} />
              </div>
            </div>
            <div className="mt-4">
              <label className="field-label">Notes</label>
              <textarea className="field-input min-h-24" value={feedbackForm.notes} onChange={(event) => setFeedbackForm((prev) => ({ ...prev, notes: event.target.value }))} disabled={!feedbackUnlocked} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={handleSaveFeedback} disabled={!feedbackUnlocked || saving} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                Submit Feedback
              </button>
            </div>
          </StageSection>

          <StageSection
            title="Section 4 · Car Availability & Estimate"
            subtitle="Show showroom stock and build the estimate before soft booking."
            badge={{ label: estimateUnlocked ? currentLead?.estimate ? "Reviewed" : "Active" : "Locked", tone: estimateUnlocked ? "bg-primary-50 text-primary-700" : "bg-slate-100 text-slate-500" }}
            icon=""
            collapsed={collapsed.estimate}
            onToggle={() => setCollapsed((prev) => ({ ...prev, estimate: !prev.estimate }))}
            locked={!estimateUnlocked}
          >
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="field-label">Model</label>
                <select
                  className="field-input"
                  value={availability.model || leadForm.interested_model}
                  onChange={(event) => {
                    const nextModel = event.target.value;
                    setAvailability({ model: nextModel, stock: [], variants: modelMap[nextModel] || [] });
                    setEstimateVariant(modelMap[nextModel]?.[0]?.variant || "");
                  }}
                  disabled={!estimateUnlocked}
                >
                  {catalog.models.map((model) => (
                    <option key={model.model} value={model.model}>
                      {model.model}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Variant</label>
                <select className="field-input" value={estimateVariant} onChange={(event) => setEstimateVariant(event.target.value)} disabled={!estimateUnlocked}>
                  {estimateVariantOptions.map((variant) => (
                    <option key={variant.variant} value={variant.variant}>
                      {variant.variant}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button type="button" onClick={handleCheckAvailability} disabled={!estimateUnlocked} className="w-full rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700">
                  Check Availability
                </button>
              </div>
            </div>

            {availability.stock?.length ? (
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-emerald-700">Total Units Available</p>
                    <p className="mt-2 text-3xl font-bold text-emerald-700">{availability.stock.reduce((sum, row) => sum + Number(row.units_available || 0), 0)}</p>
                  </div>
                  <div className="rounded-2xl border border-primary-200 bg-primary-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary-700">Variants</p>
                    <p className="mt-2 text-3xl font-bold text-primary-700">{availability.variants.length || estimateVariantOptions.length}</p>
                  </div>
                  <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sky-700">Locations</p>
                    <p className="mt-2 text-3xl font-bold text-sky-700">{new Set(availability.stock.map((row) => row.location)).size}</p>
                  </div>
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">On-road Total</p>
                    <p className="mt-2 text-2xl font-bold text-amber-700">{selectedVariantEstimate ? formatCurrency(selectedVariantEstimate.total) : "-"}</p>
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                      <tr>
                        <th className="px-4 py-3">Colour</th>
                        <th className="px-4 py-3">Variant</th>
                        <th className="px-4 py-3">Units</th>
                        <th className="px-4 py-3">Location</th>
                        <th className="px-4 py-3">ETA</th>
                      </tr>
                    </thead>
                    <tbody>
                      {availability.stock.map((row) => (
                        <tr key={`${row.color}-${row.variant}-${row.location}`} className="border-t border-slate-100">
                          <td className="px-4 py-3 font-medium text-slate-700">{row.color}</td>
                          <td className="px-4 py-3 text-slate-600">{row.variant}</td>
                          <td className="px-4 py-3">
                            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${Number(row.units_available) > 0 ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                              {Number(row.units_available) > 0 ? `${row.units_available} available` : "Out of stock"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{row.location}</td>
                          <td className="px-4 py-3 text-slate-600">{row.eta_label}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {selectedVariantEstimate ? (
                  <div className="grid gap-5 xl:grid-cols-[1fr,0.9fr]">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Estimate Breakdown</p>
                      <div className="mt-4 space-y-3 text-sm">
                        <div className="flex items-center justify-between"><span>Ex-showroom Price</span><strong>{formatCurrency(selectedVariantEstimate.exShowroom)}</strong></div>
                        <div className="flex items-center justify-between"><span>Road Tax & Registration</span><strong>{formatCurrency(selectedVariantEstimate.roadTax)}</strong></div>
                        <div className="flex items-center justify-between"><span>Insurance</span><strong>{formatCurrency(selectedVariantEstimate.insurance)}</strong></div>
                        <div className="flex items-center justify-between"><span>Accessories / Add-ons</span><strong>{formatCurrency(selectedVariantEstimate.addons)}</strong></div>
                        <div className="flex items-center justify-between"><span>Handling & Logistics</span><strong>{formatCurrency(selectedVariantEstimate.handling)}</strong></div>
                        <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base text-primary-700"><span>On-road Total</span><strong>{formatCurrency(selectedVariantEstimate.total)}</strong></div>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-700">Review Summary</p>
                      <p className="mt-3 text-lg font-semibold text-slate-900">{selectedVariantEstimate.model}</p>
                      <p className="text-sm text-slate-600">{selectedVariantEstimate.variant}</p>
                      <p className="mt-4 text-sm text-slate-600">Once the advisor confirms this estimate, soft booking opens with the selected car details carried forward automatically.</p>
                      <button type="button" onClick={handleReviewEstimate} disabled={!estimateUnlocked || saving} className="mt-5 rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                        Review Estimate & Continue
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-500">
                Load model availability to show stock and estimate details here.
              </div>
            )}
          </StageSection>

          <StageSection
            title="Section 5 · Soft Booking / 30,000"
            subtitle="Capture advance payment and delivery details after estimate review."
            badge={{ label: bookingUnlocked ? currentLead?.booking?.status || "Active" : "Locked", tone: bookingUnlocked ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500" }}
            icon="📋"
            collapsed={collapsed.booking}
            onToggle={() => setCollapsed((prev) => ({ ...prev, booking: !prev.booking }))}
            locked={!bookingUnlocked}
          >
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
              Advance payment: {formatCurrency(30000)} required to confirm soft booking.
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div>
                <label className="field-label">Customer Name</label>
                <input className="field-input bg-slate-50" value={leadForm.customer_name} readOnly />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input className="field-input bg-slate-50" value={leadForm.phone} readOnly />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input className="field-input bg-slate-50" value={leadForm.email} readOnly />
              </div>
              <div>
                <label className="field-label">Model</label>
                <input className="field-input bg-slate-50" value={bookingForm.model} readOnly />
              </div>
              <div>
                <label className="field-label">Variant</label>
                <input className="field-input bg-slate-50" value={bookingForm.variant} readOnly />
              </div>
              <div>
                <label className="field-label">Color Preference</label>
                <input className="field-input" value={bookingForm.color_preference} onChange={(event) => setBookingForm((prev) => ({ ...prev, color_preference: event.target.value }))} disabled={!bookingUnlocked} />
              </div>
              <div>
                <label className="field-label">Finance / Cash</label>
                <select className="field-input" value={bookingForm.finance_type} onChange={(event) => setBookingForm((prev) => ({ ...prev, finance_type: event.target.value }))} disabled={!bookingUnlocked}>
                  {FINANCE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Booking Date</label>
                <input className="field-input" type="date" value={bookingForm.booking_date} onChange={(event) => setBookingForm((prev) => ({ ...prev, booking_date: event.target.value }))} disabled={!bookingUnlocked} />
              </div>
              <div>
                <label className="field-label">Advance Amount</label>
                <input className="field-input bg-slate-50" value={formatCurrency(bookingForm.advance_amount)} readOnly />
              </div>
              <div>
                <label className="field-label">Payment Mode</label>
                <select className="field-input" value={bookingForm.payment_mode} onChange={(event) => setBookingForm((prev) => ({ ...prev, payment_mode: event.target.value }))} disabled={!bookingUnlocked}>
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Transaction / Ref ID</label>
                <input className="field-input" value={bookingForm.payment_ref} onChange={(event) => setBookingForm((prev) => ({ ...prev, payment_ref: event.target.value }))} disabled={!bookingUnlocked} />
              </div>
              <div>
                <label className="field-label">Expected Delivery Date</label>
                <input className="field-input" type="date" value={bookingForm.expected_delivery_date} onChange={(event) => setBookingForm((prev) => ({ ...prev, expected_delivery_date: event.target.value }))} disabled={!bookingUnlocked} />
              </div>
              <div>
                <label className="field-label">Delivery Location</label>
                <select className="field-input" value={bookingForm.delivery_location} onChange={(event) => setBookingForm((prev) => ({ ...prev, delivery_location: event.target.value }))} disabled={!bookingUnlocked}>
                  {SHOWROOMS.concat("Customer Address").map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2 xl:col-span-3">
                <label className="field-label">Special Requests</label>
                <textarea className="field-input min-h-24" value={bookingForm.special_requests} onChange={(event) => setBookingForm((prev) => ({ ...prev, special_requests: event.target.value }))} disabled={!bookingUnlocked} />
              </div>
            </div>
            <label className="mt-5 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm font-medium text-emerald-700">
              <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={bookingForm.payment_received} onChange={(event) => setBookingForm((prev) => ({ ...prev, payment_received: event.target.checked }))} disabled={!bookingUnlocked} />
              I confirm that {formatCurrency(30000)} advance has been received from the customer.
            </label>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="button" onClick={handleSaveBooking} disabled={!bookingUnlocked || saving} className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {bookingForm.payment_received ? "Confirm Soft Booking" : "Save Booking Draft"}
              </button>
            </div>
          </StageSection>
        </div>
      ) : (
        <SectionCard title="All Customers" subtitle="Track new enquiries, test drives, estimate reviews, and soft bookings.">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <input className="field-input max-w-md" placeholder="Search by name, phone, model, or variant..." value={search} onChange={(event) => setSearch(event.target.value)} />
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] ${filter === item ? "border-primary-300 bg-primary-50 text-primary-700" : "border-slate-200 bg-white text-slate-500"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          {filteredLeads.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Car Interest</th>
                    <th className="px-4 py-3">Current Status</th>
                    <th className="px-4 py-3">Last Updated</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead) => (
                    <tr key={lead.id} className="border-t border-slate-100">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{lead.customer_name}</p>
                        <p className="text-sm text-slate-500">{lead.interested_model} · {lead.interested_variant || "Variant pending"}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{lead.phone}</td>
                      <td className="px-4 py-3 text-slate-600">{lead.interested_model}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getPillClasses(lead.lead_status)}`}>{lead.lead_status}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDateLabel(lead.updated_at)}</td>
                      <td className="px-4 py-3">
                        <button type="button" onClick={() => importLead(lead.id)} className="text-sm font-semibold text-primary-600">
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="No matching leads" description="Try a different search or filter." />
          )}
        </SectionCard>
      )}
    </main>
  );
}
