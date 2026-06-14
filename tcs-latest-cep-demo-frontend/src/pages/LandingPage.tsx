import { useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Shield,
  Zap,
  FileSearch,
  BarChart3,
  ClipboardList,
  AlertTriangle,
  Link2,
  Clock,
  Route,
  Paperclip,
  GitBranch,
  FileText,
  ScrollText,
  Building2,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

/* ── Scroll-reveal hook ── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("lp-visible"); io.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ── Animated counter ── */
function AnimatedCounter({ target, duration = 1800 }: { target: number; duration?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const start = performance.now();
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          const val = Math.round(ease * target);
          el.textContent = target >= 1000 ? val.toLocaleString() : String(val);
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [target, duration]);
  return <span ref={ref}>0</span>;
}

/* ── Reveal wrapper components ── */
function Reveal({ children, className = "", direction = "up", delay = 0 }: {
  children: React.ReactNode; className?: string; direction?: "up" | "left" | "right" | "scale"; delay?: number;
}) {
  const ref = useReveal();
  const base = direction === "left" ? "lp-reveal-left" : direction === "right" ? "lp-reveal-right" : direction === "scale" ? "lp-reveal-scale" : "lp-reveal";
  return <div ref={ref} className={`${base} ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</div>;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const goApp = () => navigate("/app");
  const goCreate = () => navigate("/app/create-survey");
  const scrollTo = useCallback((id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#1a1a2e] font-['Inter',-apple-system,sans-serif]">
      {/* ── Brand Stripe ── */}
      <div className="h-1 shrink-0 z-50 fixed top-0 left-0 right-0" style={{ background: "linear-gradient(to right, #009eda 20%, #f5921e 20%, #f5921e 40%, #8dc63f 40%, #8dc63f 60%, #c1272d 60%, #c1272d 80%, #662d91 80%)" }} />

      {/* ── Navigation (frosted glass, fixed) ── */}
      <nav className="lp-nav-blur fixed top-1 left-0 right-0 z-40 bg-[#1a2d3e]/90 px-6 lg:px-12 h-[64px] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#009eda] to-[#0077b6] flex items-center justify-center">
            <Shield size={14} className="text-white" />
          </div>
          <div>
            <div className="text-white text-[14px] font-bold tracking-tight leading-none">The Compliance Store</div>
            <div className="text-white/40 text-[9px] font-medium tracking-[0.08em] uppercase">Because Getting It Right Matters</div>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={() => scrollTo("features")} className="text-white/50 hover:text-white text-[13px] font-medium transition-colors hidden md:block bg-transparent border-none cursor-pointer">Platform</button>
          <button onClick={() => scrollTo("solutions")} className="text-white/50 hover:text-white text-[13px] font-medium transition-colors hidden md:block bg-transparent border-none cursor-pointer">Solutions</button>
          <button onClick={() => scrollTo("capabilities")} className="text-white/50 hover:text-white text-[13px] font-medium transition-colors hidden md:block bg-transparent border-none cursor-pointer">Capabilities</button>
          <button
            onClick={goCreate}
            className="lp-btn-shine bg-[#009eda] hover:bg-[#0087c1] text-white px-5 py-2 rounded-lg text-[13px] font-semibold transition-colors flex items-center gap-2"
          >
            Start Survey <ArrowRight size={14} />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-[92vh] flex items-center px-6 lg:px-12 pt-20 overflow-hidden lp-hero-grid">
        {/* Animated orbs */}
        <div className="lp-orb-1 absolute -top-[10%] -right-[5%] w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(0,158,218,0.12)_0%,transparent_70%)] pointer-events-none" />
        <div className="lp-orb-2 absolute -bottom-[15%] -left-[8%] w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle,rgba(102,45,145,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/4 left-1/3 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(245,146,30,0.06)_0%,transparent_70%)] pointer-events-none" />

        <div className="max-w-[1140px] mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center relative z-10">
          {/* Left: Copy */}
          <div>
            <span className="lp-glow-badge inline-block bg-[rgba(0,158,218,0.12)] text-[#56baed] text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-1.5 rounded-full mb-6 border border-[rgba(0,158,218,0.15)]">
              Survey Readiness Platform
            </span>
            <h1 className="text-[40px] lg:text-[52px] font-extrabold text-white leading-[1.08] mb-5 tracking-tight">
              Be Ready Before the<br />
              <span className="bg-gradient-to-r from-[#009eda] to-[#56baed] bg-clip-text text-transparent">Surveyor Arrives</span>
            </h1>
            <p className="text-[16px] lg:text-[17px] text-white/50 leading-relaxed mb-9 max-w-[440px] font-light">
              Identify compliance gaps and preview CMS-2567 deficiencies — before the surveyor does.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={goApp}
                className="lp-btn-shine bg-gradient-to-r from-[#009eda] to-[#0088c2] hover:from-[#0088c2] hover:to-[#0077aa] text-white px-8 py-3.5 rounded-xl text-[14px] font-semibold transition-all flex items-center gap-2.5 shadow-[0_8px_32px_rgba(0,158,218,0.3)]"
              >
                Launch Survey Tool <ArrowRight size={16} />
              </button>
              <button
                onClick={() => scrollTo("solutions")}
                className="border border-white/20 hover:border-white/40 hover:bg-white/[0.04] text-white px-8 py-3.5 rounded-xl text-[14px] font-semibold transition-all"
              >
                See How It Works
              </button>
            </div>
          </div>

          {/* Right: Platform pillars (glass card) */}
          <Reveal direction="right" className="lp-glass rounded-2xl p-1.5">
            <div className="space-y-1.5">
              {[
                { icon: Shield, gradient: "from-[rgba(0,158,218,0.2)] to-[rgba(0,158,218,0.05)]", iconColor: "text-[#56baed]", title: "40+ Critical Element Pathways", sub: "Every CMS regulatory pathway, ready to assess" },
                { icon: Zap, gradient: "from-[rgba(245,146,30,0.2)] to-[rgba(245,146,30,0.05)]", iconColor: "text-[#f5921e]", title: "Intelligent Branching Logic", sub: "Adaptive questions driven by real-time responses" },
                { icon: FileSearch, gradient: "from-[rgba(141,198,63,0.2)] to-[rgba(141,198,63,0.05)]", iconColor: "text-[#8dc63f]", title: "Automated Citation Detection", sub: "F-Tag deficiencies flagged as you go" },
                { icon: BarChart3, gradient: "from-[rgba(102,45,145,0.2)] to-[rgba(102,45,145,0.05)]", iconColor: "text-[#9b6dcd]", title: "Compliance Scorecard", sub: "Risk scoring across all regulatory categories" },
              ].map((item, i) => (
                <div key={i} className="lp-pillar-card flex items-center gap-4 bg-white/[0.05] rounded-xl px-5 py-4 border border-white/[0.04]">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${item.gradient}`}>
                    <item.icon size={20} className={item.iconColor} />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold text-white">{item.title}</div>
                    <div className="text-[11px] text-white/35 mt-0.5 font-light">{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40">
          <div className="text-white/50 text-[10px] uppercase tracking-[0.15em] font-medium">Scroll</div>
          <div className="w-[1px] h-8 bg-gradient-to-b from-white/40 to-transparent animate-pulse" />
        </div>
      </section>

      {/* ── Stats Bar ── */}
      <div className="bg-white border-b border-[#e8ecf1] px-6 lg:px-12 py-14">
        <div className="max-w-[1140px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-10 text-center">
          {[
            { target: 42, suffix: "%", label: "Fewer deficiencies" },
            { target: 3, suffix: "x", label: "Faster preparation" },
            { target: 85, suffix: "%", label: "Improved readiness" },
            { target: 2400, suffix: "+", label: "Surveys completed" },
          ].map((s, i) => (
            <Reveal key={i} delay={i * 100}>
              <div className="text-[42px] font-extrabold text-[#1a2d3e] tracking-tight">
                <AnimatedCounter target={s.target} />
                <span className="text-[#009eda]">{s.suffix}</span>
              </div>
              <div className="text-[12px] text-[#94a3b8] mt-1 font-medium uppercase tracking-wider">{s.label}</div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* ── The Challenge ── */}
      <section id="features" className="px-6 lg:px-12 py-20 lg:py-28 bg-[#fafbfc]">
        <div className="max-w-[1140px] mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block bg-gradient-to-r from-[#e8f4fd] to-[#dceefb] text-[#009eda] text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-1.5 rounded-full mb-4">
              The Challenge
            </span>
            <h2 className="text-[30px] lg:text-[38px] font-extrabold text-[#1a2d3e] mb-3 tracking-tight">
              Survey Prep Shouldn't Be <span className="text-[#009eda]">This Hard</span>
            </h2>
            <p className="text-[15px] text-[#94a3b8] max-w-[500px] mx-auto font-light">
              Manual, disconnected processes leave facilities vulnerable on survey day.
            </p>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: ClipboardList, bg: "from-[#fef3c7] to-[#fde68a]", title: "Paper-Based Checklists", desc: "Compliance data buried in spreadsheets and binders — no real-time readiness picture." },
              { icon: AlertTriangle, bg: "from-[#fce4ec] to-[#f8bbd0]", title: "Reactive, Not Proactive", desc: "Gaps discovered only after the surveyor writes them on the CMS-2567." },
              { icon: Link2, bg: "from-[#e8f5e9] to-[#c8e6c9]", title: "Disconnected Workflows", desc: "Observations, records, and corrective actions scattered across separate systems." },
              { icon: Clock, bg: "from-[#e3f2fd] to-[#bbdefb]", title: "Weeks of Manual Prep", desc: "Staff pull records and conduct mock rounds with no standardized process." },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 100}>
                <div className="lp-feature-card bg-white border border-[#e8ecf1] rounded-2xl p-8">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br ${c.bg}`}>
                    <c.icon size={22} className="text-[#1a2d3e]/70" />
                  </div>
                  <h3 className="text-[16px] font-bold text-[#1a2d3e] mb-1.5">{c.title}</h3>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed font-light">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Solution ── */}
      <section id="solutions" className="px-6 lg:px-12 py-20 lg:py-28 bg-white">
        <div className="max-w-[1140px] mx-auto">
          <Reveal className="text-center mb-16">
            <span className="inline-block bg-gradient-to-r from-[#e8f4fd] to-[#dceefb] text-[#009eda] text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-1.5 rounded-full mb-4">
              The Solution
            </span>
            <h2 className="text-[30px] lg:text-[38px] font-extrabold text-[#1a2d3e] mb-3 tracking-tight">
              One Platform for Complete <span className="text-[#009eda]">Survey Readiness</span>
            </h2>
            <p className="text-[15px] text-[#94a3b8] max-w-[520px] mx-auto font-light">
              Walk CMS pathways step-by-step, catch deficiencies early, and build a documented evidence trail.
            </p>
          </Reveal>

          {/* Feature 1: Guided Pathways */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
            <Reveal direction="left">
              <div className="inline-block bg-[#e8f4fd] text-[#009eda] text-[10px] font-bold tracking-[0.12em] uppercase px-3 py-1 rounded-md mb-4">01</div>
              <h3 className="text-[24px] font-bold text-[#1a2d3e] mb-3 tracking-tight">Guided Pathway Workflows</h3>
              <p className="text-[14px] text-[#94a3b8] leading-relaxed mb-6 font-light">
                The same Critical Element Pathways CMS surveyors use — with branching logic that adapts in real-time.
              </p>
              <ul className="space-y-3">
                {["40+ pathways across every regulatory domain", "Conditional sections triggered by your answers", "Surveyor notes and evidence attached inline"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] text-[#475569]">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#009eda] to-[#0077b6] flex items-center justify-center shrink-0">
                      <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal direction="right">
              <div className="bg-gradient-to-br from-[#0d1b2a] to-[#1b4a5e] rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
                <div className="lp-glass rounded-xl p-6">
                  <div className="text-[10px] text-white/30 uppercase tracking-[0.12em] font-semibold mb-4">Section Progress</div>
                  <div className="space-y-3">
                    {[
                      { label: "Observations", pct: 100, color: "from-[#009eda] to-[#56baed]" },
                      { label: "Records", pct: 75, color: "from-[#009eda] to-[#56baed]" },
                      { label: "Harm", pct: 30, color: "from-[#f59e0b] to-[#fbbf24]" },
                      { label: "Decisions", pct: 0, color: "" },
                    ].map((row, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${row.pct > 0 ? "" : "bg-white/20"}`} style={row.pct > 0 ? { background: row.pct === 30 ? "#f59e0b" : "#009eda" } : {}} />
                        <span className={`text-[11px] w-[80px] shrink-0 ${row.pct === 0 ? "text-white/30" : "text-white/50"}`}>{row.label}</span>
                        <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`lp-progress-fill h-full rounded-full ${row.color ? `bg-gradient-to-r ${row.color}` : "bg-white/20"}`} data-width={`${row.pct}%`} style={{ width: `${row.pct}%` }} />
                        </div>
                        <span className={`text-[10px] w-[32px] text-right ${row.pct === 0 ? "text-white/20" : "text-white/30"}`}>{row.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Feature 2: Citation Detection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center mb-24">
            <Reveal direction="left" className="order-2 lg:order-1">
              <div className="bg-gradient-to-br from-[#0d1b2a] to-[#1b4a5e] rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
                <div className="lp-glass rounded-xl px-6 py-4">
                  <div className="text-[10px] text-white/30 uppercase tracking-[0.12em] font-semibold mb-3">Detected Citations</div>
                  {[
                    { tag: "F684", title: "Professional Standards", severity: "D — Isolated", color: "#ef4444" },
                    { tag: "F609", title: "Reporting Violations", severity: "D — Isolated", color: "#f59e0b" },
                    { tag: "F600", title: "Abuse & Neglect", severity: "G — Actual Harm", color: "#ef4444" },
                  ].map((row, i) => (
                    <div key={i} className={`flex justify-between items-center py-3 ${i < 2 ? "border-b border-white/[0.05]" : ""}`}>
                      <span className="text-[13px] font-bold" style={{ color: row.color }}>{row.tag}</span>
                      <span className="text-[11px] text-white/40 font-light">{row.title}</span>
                      <span className="text-[9px] font-semibold px-2.5 py-1 rounded-full" style={{ background: `${row.color}15`, color: row.color }}>{row.severity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal direction="right" className="order-1 lg:order-2">
              <div className="inline-block bg-[#e8f4fd] text-[#009eda] text-[10px] font-bold tracking-[0.12em] uppercase px-3 py-1 rounded-md mb-4">02</div>
              <h3 className="text-[24px] font-bold text-[#1a2d3e] mb-3 tracking-tight">Automatic Citation Detection</h3>
              <p className="text-[14px] text-[#94a3b8] leading-relaxed mb-6 font-light">
                Potential CMS-2567 citations surface automatically as you answer — before a surveyor writes them up.
              </p>
              <ul className="space-y-3">
                {["F-Tag citations generated from your answers", "Scope & severity per CMS-2567 standards", "Preview potential 2567 findings before survey day"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] text-[#475569]">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#009eda] to-[#0077b6] flex items-center justify-center shrink-0">
                      <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* Feature 3: Compliance Scorecard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Reveal direction="left">
              <div className="inline-block bg-[#e8f4fd] text-[#009eda] text-[10px] font-bold tracking-[0.12em] uppercase px-3 py-1 rounded-md mb-4">03</div>
              <h3 className="text-[24px] font-bold text-[#1a2d3e] mb-3 tracking-tight">Compliance Scorecard & Risk Assessment</h3>
              <p className="text-[14px] text-[#94a3b8] leading-relaxed mb-6 font-light">
                Instant compliance posture across all CMS regulatory categories — one visual risk score.
              </p>
              <ul className="space-y-3">
                {["Scoring across 6 CMS regulatory categories", "Low / Moderate / High risk classification", "Drill-down by category with F-Tag breakdown"].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-[13px] text-[#475569]">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#009eda] to-[#0077b6] flex items-center justify-center shrink-0">
                      <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>
            <Reveal direction="right">
              <div className="bg-gradient-to-br from-[#0d1b2a] to-[#1b4a5e] rounded-2xl p-8 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
                <div className="lp-glass rounded-xl p-6 text-center">
                  {/* Score ring */}
                  <div className="relative inline-block mb-2">
                    <svg width="120" height="120" viewBox="0 0 100 100" className="transform -rotate-90">
                      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
                      <circle cx="50" cy="50" r="45" fill="none" stroke="url(#scoreGrad)" strokeWidth="6" strokeLinecap="round"
                        strokeDasharray="283" strokeDashoffset="45" className="transition-all duration-[1.8s] ease-out" />
                      <defs><linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#10b981" /><stop offset="100%" stopColor="#34d399" /></linearGradient></defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div>
                        <div className="text-[32px] font-extrabold text-emerald-400 leading-none"><AnimatedCounter target={84} /></div>
                        <div className="text-[8px] text-white/25 uppercase tracking-[0.12em] font-semibold">of 100</div>
                      </div>
                    </div>
                  </div>
                  <div className="mb-5">
                    <span className="bg-amber-500/10 text-amber-400 text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">Moderate Risk</span>
                  </div>
                  <div className="text-left space-y-3">
                    {[
                      { label: "Quality of Care", pct: 92, color: "from-[#10b981] to-[#34d399]", textColor: "text-emerald-400" },
                      { label: "Infection Control", pct: 60, color: "from-[#f59e0b] to-[#fbbf24]", textColor: "text-amber-400" },
                      { label: "Abuse & Neglect", pct: 85, color: "from-[#10b981] to-[#34d399]", textColor: "text-emerald-400" },
                    ].map((row, i) => (
                      <div key={i}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-white/40 font-light">{row.label}</span>
                          <span className={`${row.textColor} font-semibold`}>{row.pct}%</span>
                        </div>
                        <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full bg-gradient-to-r ${row.color}`} style={{ width: `${row.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Platform Capabilities ── */}
      <section id="capabilities" className="px-6 lg:px-12 py-20 lg:py-28 bg-[#fafbfc]">
        <div className="max-w-[1140px] mx-auto">
          <Reveal className="text-center mb-14">
            <span className="inline-block bg-gradient-to-r from-[#e8f4fd] to-[#dceefb] text-[#009eda] text-[10px] font-bold tracking-[0.14em] uppercase px-4 py-1.5 rounded-full mb-4">
              Platform Capabilities
            </span>
            <h2 className="text-[30px] lg:text-[38px] font-extrabold text-[#1a2d3e] tracking-tight">
              Everything You Need for <span className="text-[#009eda]">Survey Day</span>
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Route, title: "Multi-Pathway Surveys", desc: "Run any combination of CMS pathways — independently or as a unified assessment." },
              { icon: Paperclip, title: "Evidence Management", desc: "Attach docs, photos, and records directly to each question." },
              { icon: GitBranch, title: "Smart Branching", desc: "Conditional questions adapt the flow — harm assessments appear only when needed." },
              { icon: FileText, title: "CMS-2567 Reports", desc: "Survey-ready reports with F-Tags, scope/severity, and corrective actions." },
              { icon: ScrollText, title: "Full Audit Trail", desc: "Every answer, flag, and status change logged with timestamps." },
              { icon: Building2, title: "Multi-Facility", desc: "Manage readiness across all facilities from one dashboard." },
            ].map((c, i) => (
              <Reveal key={i} delay={i * 80}>
                <div className="lp-feature-card bg-white border border-[#e8ecf1] rounded-2xl p-8 text-center h-full">
                  <div className="lp-cap-icon inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e8f4fd] to-[#d0eaf8] mb-5">
                    <c.icon size={24} className="text-[#009eda]" />
                  </div>
                  <h3 className="text-[15px] font-bold text-[#1a2d3e] mb-1.5">{c.title}</h3>
                  <p className="text-[13px] text-[#94a3b8] leading-relaxed font-light">{c.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="relative px-6 lg:px-12 py-24 lg:py-32 text-center overflow-hidden bg-gradient-to-br from-[#0d1b2a] via-[#132f42] to-[#1b4a5e]">
        <div className="lp-orb-1 absolute -top-[20%] -right-[10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(0,158,218,0.1)_0%,transparent_70%)] pointer-events-none" />
        <div className="lp-orb-2 absolute -bottom-[20%] -left-[10%] w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(102,45,145,0.08)_0%,transparent_70%)] pointer-events-none" />
        <Reveal className="relative z-10">
          <h2 className="text-[30px] lg:text-[40px] font-extrabold text-white mb-4 tracking-tight">
            Ready to Transform Your<br />Survey Preparation?
          </h2>
          <p className="text-[15px] text-white/40 max-w-[460px] mx-auto leading-relaxed mb-10 font-light">
            Move from reactive compliance to proactive readiness. Start your first assessment today.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={goApp}
              className="lp-btn-shine bg-gradient-to-r from-[#009eda] to-[#0088c2] text-white px-10 py-4 rounded-xl text-[15px] font-semibold transition-all flex items-center gap-2.5 shadow-[0_8px_32px_rgba(0,158,218,0.35)] hover:shadow-[0_12px_40px_rgba(0,158,218,0.45)] hover:scale-[1.02]"
            >
              Get Started — It's Free <ArrowRight size={16} />
            </button>
            <a
              href="mailto:demo@thecompliancestore.com?subject=Survey%20Readiness%20Tool%20Demo%20Request"
              className="border border-white/15 hover:border-white/30 hover:bg-white/[0.04] text-white px-10 py-4 rounded-xl text-[15px] font-semibold transition-all inline-block"
            >
              Schedule a Demo
            </a>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-[#080f18] px-6 lg:px-12 py-10">
        <div className="max-w-[1140px] mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#009eda] to-[#0077b6] flex items-center justify-center">
              <Shield size={12} className="text-white" />
            </div>
            <div className="text-white/30 text-[12px] font-light">
              &copy; {new Date().getFullYear()} The Compliance Store. All rights reserved.
            </div>
          </div>
          <div className="flex gap-8">
            {["Privacy", "Terms", "Support", "Contact"].map((link) => (
              <a key={link} href="#" className="text-white/25 hover:text-white/50 text-[12px] transition-colors font-light">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
