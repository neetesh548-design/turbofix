import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0f17] text-slate-100">
      <Navbar />
      <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-start justify-center px-6 py-16">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">404</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">Page not found</h1>
        <p className="mb-8 max-w-xl text-base leading-7 text-slate-300">
          This TurboFix page does not exist, or the link is out of date.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link className="rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-slate-950" to="/">
            Go home
          </Link>
          <Link className="rounded-lg border border-slate-700 px-4 py-3 text-sm font-bold text-slate-100" to="/login.html">
            Staff sign in
          </Link>
        </div>
      </main>
    </div>
  );
}
