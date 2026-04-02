import { Link, NavLink } from "react-router-dom";

export default function Header() {
  return (
    <>
      <div className="bg-slate-950 px-4 py-1.5 text-[11px] text-slate-400 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <span>Popular Mega Motors, Kochi</span>
          <span>Workshop operations demo</span>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b-[3px] border-primary-500 bg-white shadow-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link to="/" className="flex shrink-0 items-center" aria-label="Popular Mega Motors home">
            <img
              src="/popular-mega-motors-logo.jpg"
              alt="Popular Mega Motors"
              className="h-14 w-auto max-w-[240px] object-contain sm:h-16 sm:max-w-[280px]"
            />
          </Link>
          <nav className="flex flex-1 items-center justify-center gap-1 text-sm">
            <NavLink to="/" className={({ isActive }) => `border-b-2 px-4 py-2 font-medium ${isActive ? "border-primary-500 text-primary-600" : "border-transparent text-slate-500 hover:text-primary-600"}`}>Dashboard</NavLink>
            <NavLink to="/job-cards/new?step=intake" className={({ isActive }) => `border-b-2 px-4 py-2 font-medium ${isActive ? "border-primary-500 text-primary-600" : "border-transparent text-slate-500 hover:text-primary-600"}`}>New Job Card</NavLink>
            <NavLink to="/technician" className={({ isActive }) => `border-b-2 px-4 py-2 font-medium ${isActive ? "border-primary-500 text-primary-600" : "border-transparent text-slate-500 hover:text-primary-600"}`}>Technician View</NavLink>
            <NavLink to="/inventory" className={({ isActive }) => `border-b-2 px-4 py-2 font-medium ${isActive ? "border-primary-500 text-primary-600" : "border-transparent text-slate-500 hover:text-primary-600"}`}>Inventory</NavLink>
            <NavLink to="/customer-onboarding" className={({ isActive }) => `border-b-2 px-4 py-2 font-medium ${isActive ? "border-primary-500 text-primary-600" : "border-transparent text-slate-500 hover:text-primary-600"}`}>Customer Onboarding</NavLink>
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            <button type="button" className="relative flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500">i<span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary-500" /></button>
            <div className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-600">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500 text-[11px] font-semibold text-white">RC</span>
              <span>Rupesh CN</span>
            </div>
          </div>
        </div>
      </header>
    </>
  );
}
