import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import SectionCard from "../components/shared/SectionCard";
import StatusBadge from "../components/shared/StatusBadge";
import { formatCurrency } from "../utils/formatCurrency";
import { recordPayment, getJobCard, updateJobCard } from "../services/jobCardService";
import { PAYMENT_METHODS } from "../utils/constants";

export default function Billing() {
  const { jobCardId } = useParams();
  const [jobCard, setJobCard] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [paymentRef, setPaymentRef] = useState("UPI-DEMO-001");
  const [paymentRecorded, setPaymentRecorded] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedback, setFeedback] = useState({
    serviceQuality: "",
    timeliness: "",
    staffBehavior: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    getJobCard(jobCardId).then(setJobCard);
  }, [jobCardId]);

  if (!jobCard) {
    return <main className="app-shell">Loading billing summary...</main>;
  }

  const submitPayment = async () => {
    const paid = await recordPayment(jobCard.id, { amount: jobCard.final_cost || jobCard.estimated_cost, payment_method: paymentMethod, payment_ref: paymentRef, notes: "Demo cashier payment" });
    const updated = await updateJobCard(jobCard.id, { status: "Paid", payment_status: "Paid" });
    setJobCard({ ...paid, ...updated });
    setPaymentRecorded(true);
    setFeedbackSubmitted(false);
  };

  const submitFeedback = () => {
    if (!feedback.serviceQuality || !feedback.timeliness || !feedback.staffBehavior) return;
    setFeedbackSubmitted(true);
  };

  return (
    <main className="app-shell space-y-6">
      <SectionCard title={`Billing · ${jobCard.job_card_no}`} subtitle={`${jobCard.customer_name} · ${jobCard.reg_no}`}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-3 rounded-2xl bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-800">Final Cost Breakdown</p>
            <p className="text-sm text-slate-600">Labour + Parts + ADD SERVICES + GST - Discount</p>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex justify-between"><span>Estimated / Final</span><span>{formatCurrency(jobCard.final_cost || jobCard.estimated_cost)}</span></div>
              <div className="flex justify-between"><span>Discount</span><span>{formatCurrency(jobCard.discount_amount)}</span></div>
              <div className="flex justify-between"><span>GST</span><span>{formatCurrency(jobCard.gst_amount)}</span></div>
            </div>
            <div className="pt-3"><StatusBadge value={jobCard.payment_status} /></div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="field-label">Payment Method</label>
              <select className="field-input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Payment Reference</label>
              <input className="field-input" value={paymentRef} onChange={(event) => setPaymentRef(event.target.value)} />
            </div>
            <button type="button" onClick={submitPayment} className="rounded-full bg-primary-500 px-5 py-3 text-sm font-semibold text-white">Record Payment</button>
            {paymentRecorded ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-800">Quick Feedback</p>
                <div className="mt-4 space-y-4 text-sm text-slate-700">
                  <div>
                    <p className="font-medium text-slate-700">How was the overall service?</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {["Excellent", "Good", "Average"].map((option) => (
                        <label key={option} className="flex items-center gap-2">
                          <input type="checkbox" checked={feedback.serviceQuality === option} onChange={() => setFeedback((current) => ({ ...current, serviceQuality: option }))} />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">Was the delivery on time?</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {["Yes", "Mostly", "No"].map((option) => (
                        <label key={option} className="flex items-center gap-2">
                          <input type="checkbox" checked={feedback.timeliness === option} onChange={() => setFeedback((current) => ({ ...current, timeliness: option }))} />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">How was the staff behavior?</p>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {["Very Good", "Good", "Needs Improvement"].map((option) => (
                        <label key={option} className="flex items-center gap-2">
                          <input type="checkbox" checked={feedback.staffBehavior === option} onChange={() => setFeedback((current) => ({ ...current, staffBehavior: option }))} />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary-200 bg-primary-50 px-4 py-3">
                      <span className="text-sm font-medium text-primary-700"> Feedback Link</span>
                      <a
                        href="https://motivemindsandbox.qualtrics.com/jfe/form/SV_dg0JV9qYsKJVwAm"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-primary-300 bg-white px-4 py-2 text-sm font-semibold text-primary-700 transition hover:bg-primary-100"
                      >
                        Click Here
                      </a>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" onClick={submitFeedback} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Submit</button>
                  {feedbackSubmitted ? <span className="rounded-full bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">Feedback captured</span> : null}
                </div>
              </div>
            ) : null}
            <button type="button" onClick={() => navigate(`/delivery/${jobCard.id}`)} disabled={!feedbackSubmitted} className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-50">Go To Closure</button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Previous Payment History" subtitle="Existing vehicle-level payment references and prior extra charge examples">
        <div className="space-y-3">
          {jobCard.payments.map((payment) => (
            <div key={payment.id} className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
              {payment.payment_ref} · {payment.payment_method} · {formatCurrency(payment.amount)}
            </div>
          ))}
        </div>
      </SectionCard>
    </main>
  );
}
