import { useRef } from "react";
import SignatureCanvas from "react-signature-canvas";

export default function SignaturePadField({ onChange }) {
  const ref = useRef(null);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl border border-slate-200">
        <SignatureCanvas ref={ref} penColor="#1e293b" canvasProps={{ className: "h-36 w-full bg-white" }} onEnd={() => onChange(ref.current?.toDataURL() || "")} />
      </div>
      <button type="button" onClick={() => { ref.current?.clear(); onChange(""); }} className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">
        Clear Signature
      </button>
    </div>
  );
}
