export default function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex items-center gap-3 text-sm text-slate-500">
      <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-primary-500" />
      <span>{label}</span>
    </div>
  );
}
