export default function NotifToast({ message, tone = "info" }) {
  const toneClass = tone === "error" ? "border-rose-200 bg-rose-50 text-rose-700" : "border-emerald-200 bg-emerald-50 text-emerald-700";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${toneClass}`}>{message}</div>;
}
