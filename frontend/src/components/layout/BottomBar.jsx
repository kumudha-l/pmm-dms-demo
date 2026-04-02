export default function BottomBar({ children }) {
  return <div className="sticky bottom-0 z-20 mt-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-panel backdrop-blur">{children}</div>;
}
