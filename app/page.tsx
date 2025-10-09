import Link from "next/link";
import { motion } from "framer-motion";
import {
  Bot,
  GraduationCap,
  HelpCircle,
  BookOpen,
  Briefcase,
  Library,
  CreditCard,
  Wrench,
  Clock,
  Layers,
  Monitor,
  Quote,
} from "lucide-react";

export default function Landing() {
  return (
    <main className="min-h-screen">
      {/* Hero: deep navy gradient with glow */}
      <section
        aria-labelledby="hero-title"
        className="relative overflow-hidden text-white"
      >
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(59,130,246,0.15),transparent_60%)]" />
        <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#0B1220] via-[#0A0F1A] to-[#05070B]" />
        {/* animated gradient ribbon */}
        <div className="pointer-events-none absolute inset-x-0 top-[-30%] -z-10 h-[60vh] opacity-60 [mask-image:radial-gradient(60%_60%_at_50%_40%,#000_40%,transparent_70%)]">
          <div className="mx-auto h-full w-[140%] -rotate-6 bg-[linear-gradient(90deg,rgba(59,130,246,0.3),rgba(147,51,234,0.25),rgba(16,185,129,0.25))] animate-gradient-x" />
        </div>
        {/* floating shapes */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-[-6rem] top-[-6rem] h-72 w-72 rounded-full bg-blue-600/20 blur-3xl animate-pulse-glow" />
          <div className="absolute bottom-[-5rem] right-[-4rem] h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl animate-pulse-glow" />
        </div>

        <div className="mx-auto max-w-7xl px-6 py-20 md:py-28">
          <div className="grid items-center gap-12 md:grid-cols-2">
            {/* Copy */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <h1 id="hero-title" className="text-4xl font-semibold leading-tight md:text-5xl">
                Build your institute’s AI Assistant in minutes
              </h1>
              <p className="mt-4 max-w-xl text-slate-300 md:text-lg">
                Launch custom chatbots for admissions, helpdesk, courses and more — no code required. 24/7 student engagement and instant answers.
              </p>

              {/* quick badges */}
              <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-300">
                {["No-code setup", "24/7 support", "Education-ready"].map((t) => (
                  <motion.span
                    key={t}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  >
                    {t}
                  </motion.span>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <motion.div initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4, delay: 0.1 }}>
                  <Link
                    href="/admin/chatbots"
                    className="group relative inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 hover:bg-blue-500"
                    aria-label="Add and customize chatbot"
                  >
                    {/* glow ring */}
                    <span className="absolute inset-0 -z-10 rounded-full bg-blue-600/60 blur-md transition-opacity duration-300 group-hover:opacity-80" />
                    Add & Customize Chatbot
                  </Link>
                </motion.div>
                <motion.a
                  href="#features"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.15 }}
                >
                  See Features
                </motion.a>
              </div>
            </motion.div>

            {/* Illustration / use-cases */}
            <motion.div aria-hidden className="relative"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
                <div className="mb-4 flex items-center gap-3 text-sm text-slate-300">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/80">
                    <Bot className="h-5 w-5" />
                  </span>
                  <span>Designed for schools, colleges, coaching & tuition centers</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[
                    { Icon: GraduationCap, title: "Admissions", desc: "Programs, fees, eligibility." },
                    { Icon: HelpCircle, title: "Helpdesk", desc: "24/7 student support." },
                    { Icon: BookOpen, title: "Courses", desc: "Syllabus & schedules." },
                    { Icon: Briefcase, title: "Placements", desc: "Guidance & FAQs." },
                    { Icon: Library, title: "Library", desc: "Rules & catalog." },
                    { Icon: CreditCard, title: "Payments", desc: "Fees & invoices." },
                  ].map(({ Icon, title, desc }, i) => (
                    <motion.div
                      key={i}
                      className="group rounded-xl border border-white/10 bg-black/30 p-4"
                      whileHover={{ y: -4 }}
                      transition={{ type: "spring", stiffness: 260, damping: 18 }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600/20 text-blue-300">
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="text-sm font-medium">{title}</div>
                      </div>
                      <div className="mt-1 text-xs text-slate-400">{desc}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
              {/* floating accent */}
              <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-sky-400/20 blur-2xl animate-float-slow" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Highlights: six use-case cards */}
      <section id="highlights" aria-labelledby="highlights-title" className="bg-white text-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <motion.h2 id="highlights-title" className="text-2xl font-semibold md:text-3xl" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
            Built for every team across your campus
          </motion.h2>
          <p className="mt-2 text-slate-600">
            Admissions, Helpdesk, Courses, Placements, Library and Payments—streamlined.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {[
              { Icon: GraduationCap, title: "Admissions", desc: "Instant answers about programs, fees and eligibility." },
              { Icon: HelpCircle, title: "Helpdesk", desc: "Resolve common queries automatically, 24/7." },
              { Icon: BookOpen, title: "Courses", desc: "Share syllabus, schedules and resources." },
              { Icon: Briefcase, title: "Placements", desc: "Guide students on internships and jobs." },
              { Icon: Library, title: "Library", desc: "Rules, catalog and access hours on demand." },
              { Icon: CreditCard, title: "Payments", desc: "Fees, invoices and receipts in one place." },
            ].map(({ Icon, title, desc }, i) => (
              <motion.div
                key={i}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                whileHover={{ y: -6, boxShadow: "0 10px 30px rgba(2,6,23,0.08)" as any }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Value Proposition */}
      <section id="features" aria-labelledby="features-title" className="bg-gradient-to-b from-white to-slate-50 text-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <motion.h2 id="features-title" className="text-2xl font-semibold md:text-3xl" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
            Everything you need to launch
          </motion.h2>
          <p className="mt-2 text-slate-600">Modern, education-first tooling to go live quickly.</p>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { Icon: Wrench, title: "No-code Builder", desc: "Customize tone, rules and branding—no engineers needed." },
              { Icon: Clock, title: "24/7 Engagement", desc: "Always-on answers for students, parents and prospects." },
              { Icon: Layers, title: "Education-Ready Templates", desc: "Best-practice flows for admissions, academics and more." },
              { Icon: Monitor, title: "Website Embed", desc: "Add to your site with a simple copy-paste snippet." },
            ].map(({ Icon, title, desc }, i) => (
              <motion.div
                key={i}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                whileHover={{ y: -6, boxShadow: "0 10px 30px rgba(2,6,23,0.08)" as any }}
                transition={{ type: "spring", stiffness: 280, damping: 20 }}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="text-base font-semibold">{title}</div>
                </div>
                <p className="mt-2 text-sm text-slate-600">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" aria-labelledby="testimonials-title" className="bg-white text-slate-900">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <motion.h2 id="testimonials-title" className="text-2xl font-semibold md:text-3xl" initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.45 }}>
            Trusted by forward-thinking institutes
          </motion.h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                quote:
                  "This AI assistant reduced routine queries by 60% and boosted student satisfaction instantly.",
                name: "Principal, Premier Institute",
              },
              {
                quote:
                  "Setup was unbelievably fast. Our admissions team finally gets time for high-value conversations.",
                name: "Admissions Head, City College",
              },
              {
                quote:
                  "Students love it. Answers in seconds—anytime, from anywhere.",
                name: "Dean of Academics, Tech University",
              },
            ].map((t, i) => (
              <motion.figure
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 280, damping: 22 }}
              >
                <Quote className="h-6 w-6 text-blue-600" />
                <blockquote className="mt-3 text-sm text-slate-700">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-xs text-slate-500">— {t.name}</figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section id="cta" aria-labelledby="cta-title" className="relative overflow-hidden text-white">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(900px_400px_at_50%_-10%,rgba(99,102,241,0.18),transparent_60%)]" />
        <div className="absolute inset-0 -z-20 bg-gradient-to-b from-[#0B1220] via-[#0A0F1A] to-[#05070B]" />
        <div className="mx-auto max-w-7xl px-6 py-16">
          <motion.div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center shadow-2xl backdrop-blur" initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}>
            <h3 id="cta-title" className="text-2xl font-semibold md:text-3xl">
              Ready to build your institute’s chatbot?
            </h3>
            <p className="mx-auto mt-2 max-w-xl text-slate-300">
              Launch in minutes. No coding required.
            </p>
            <div className="mt-6">
              <Link
                href="/admin/chatbots"
                className="group relative inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-600 hover:bg-blue-500"
              >
                <span className="absolute inset-0 -z-10 rounded-full bg-blue-600/60 blur-md transition-opacity duration-300 group-hover:opacity-80" />
                Add & Customize Chatbot
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Institute AI Chatbots. All rights reserved.
      </footer>
    </main>
  );
}
