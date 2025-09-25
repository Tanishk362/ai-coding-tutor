import Link from "next/link";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-white">
      {/* Navbar */}
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/60 border-b border-white/10">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-blue-600/90 shadow-lg shadow-blue-600/30">
              {/* Chat/AI icon */}
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M7 8h10M7 12h7" strokeLinecap="round"/>
                <path d="M4 5h16a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-6l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" strokeLinecap="round"/>
              </svg>
            </span>
            <span className="font-semibold tracking-tight">Institute AI Chatbots</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-300">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#testimonials" className="hover:text-white">Testimonials</a>
            <a href="#cta" className="hover:text-white">Get Started</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="inline-flex items-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/5">
              Sign in
            </Link>
            <Link href="/admin/chatbots" className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium shadow-lg shadow-blue-600/30 hover:bg-blue-500">
              Add & Customize Chatbot
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,white,transparent_75%)]">
          <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute top-40 right-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <h1 className="text-4xl md:text-5xl font-semibold leading-tight">
                Build your institute’s AI Assistant in minutes
              </h1>
              <p className="mt-4 text-slate-300 md:text-lg">
                Create custom AI chatbots for admissions, student helpdesk, course queries, and more — all without code.
              </p>
              <ul className="mt-6 space-y-2 text-slate-300">
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Create Custom AI Chatbots</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Engage Students 24/7</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> No Coding Required</li>
                <li className="flex items-center gap-2"><span className="text-blue-400">✓</span> Personalized for Each Institution</li>
              </ul>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/admin/chatbots" className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold shadow-lg shadow-blue-600/30 hover:bg-blue-500">
                  Add & Customize Chatbot
                </Link>
                <a href="#features" className="inline-flex items-center rounded-md border border-white/10 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
                  See features
                </a>
                <Link href="/login" className="inline-flex items-center rounded-md border border-white/10 px-6 py-3 text-sm font-semibold text-white/80 hover:bg-white/5">
                  Sign in
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 shadow-2xl">
                <div className="mb-4 flex items-center gap-3 text-sm text-slate-300">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded bg-blue-600/80">
                    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <circle cx="12" cy="12" r="4"/>
                      <path d="M2 12h4m12 0h4M12 2v4m0 12v4"/>
                    </svg>
                  </span>
                  <span>Designed for schools, colleges, coaching & tuition centers</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { title: "Admissions", desc: "Answer program, fees & eligibility." },
                    { title: "Helpdesk", desc: "Resolve common queries 24/7." },
                    { title: "Courses", desc: "Syllabus, schedules, resources." },
                    { title: "Placements", desc: "Guidance & FAQs for students." },
                    { title: "Library", desc: "Rules, catalog, access hours." },
                    { title: "Payments", desc: "Fees, invoices, receipts." },
                  ].map((f, i) => (
                    <div key={i} className="rounded-lg border border-white/10 bg-black/30 p-4">
                      <div className="text-sm font-medium">{f.title}</div>
                      <div className="mt-1 text-xs text-slate-400">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold">Everything you need to launch</h2>
        <p className="mt-2 text-slate-300">Clean, modern tools built for education teams.</p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 7h18M3 12h12M3 17h18"/></svg>
              ),
              title: "No-code Builder",
              desc: "Customize tone, rules, style and brand in minutes.",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20a8 8 0 1 0-8-8"/><path d="M12 4v8l4 2"/></svg>
              ),
              title: "24/7 Engagement",
              desc: "Always-on help for students, parents and prospects.",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2l4 4-4 4-4-4 4-4z"/><path d="M6 18h12"/></svg>
              ),
              title: "Education-ready",
              desc: "Templates for admissions, academics, fees, library & more.",
            },
            {
              icon: (
                <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M7 8h10M7 12h6"/></svg>
              ),
              title: "Website Embed",
              desc: "Add to your site with a simple copy-paste snippet.",
            },
          ].map((f, i) => (
            <div key={i} className="group rounded-xl border border-white/10 bg-white/[0.03] p-5 hover:bg-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/20 text-blue-300 group-hover:bg-blue-600/30">
                  {f.icon}
                </span>
                <div className="font-medium">{f.title}</div>
              </div>
              <div className="mt-2 text-sm text-slate-300">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials (placeholder) */}
      <section id="testimonials" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-2xl md:text-3xl font-semibold">Trusted by forward-thinking institutes</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1,2,3].map((i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
              <div className="text-sm text-slate-300">“This AI assistant reduced routine queries drastically and improved student satisfaction.”</div>
              <div className="mt-4 text-xs text-slate-400">— Principal, Premier Institute</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA bottom */}
      <section id="cta" className="mx-auto max-w-7xl px-6 py-16">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-blue-700/30 to-indigo-700/30 p-8 text-center shadow-xl">
          <h3 className="text-2xl font-semibold">Ready to build your institute’s chatbot?</h3>
          <p className="mt-2 text-slate-300">Launch in minutes. No coding required.</p>
          <div className="mt-6">
            <Link href="/admin/chatbots" className="inline-flex items-center rounded-md bg-blue-600 px-6 py-3 text-sm font-semibold shadow-lg shadow-blue-600/30 hover:bg-blue-500">
              Add & Customize Chatbot
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 py-6 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Institute AI Chatbots. All rights reserved.
      </footer>
    </div>
  );
}
