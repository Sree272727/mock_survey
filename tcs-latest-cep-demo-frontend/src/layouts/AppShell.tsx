import { type ComponentType, useState, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useMode, type Mode } from "../context/ModeContext";
import { getCasePathways, type CasePathwayItem } from "../api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import Footer from "../components/Footer";
import DemoChatbot from "../components/chat/DemoChatbot";
import {
  ClipboardList,
  Building2,
  Users,
  LayoutDashboard,
  FileCheck2,
  ShieldAlert,
  Microscope,
  BarChart3,
  ScrollText,
  BookOpen,
  Layers,
  GitBranch,
  ChevronDown,
  ArrowLeft,
  Wrench,
  FileCode2,
  Lock,
  CheckCircle2,
  GraduationCap,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & constants                                                  */
/* ------------------------------------------------------------------ */

const CASE_ID_KEY = "cms-demo-case-id";
const SURVEY_META_KEY = "cms-demo-survey-meta";

type NavItem = {
  label: string;
  to: string;
  end?: boolean;
  icon: ComponentType<{ className?: string }>;
};

const customerTopItems: NavItem[] = [
  { label: "Compliance Dashboard", to: "/app/dashboard-overview", icon: BarChart3 },
  { label: "Surveys", to: "/app", end: true, icon: ClipboardList },
  { label: "Trainings", to: "/app/trainings", icon: GraduationCap },
  { label: "Facilities", to: "/app/admin/facilities", icon: Building2 },
  { label: "Users", to: "/app/admin/users", icon: Users },
];

const surveyItems: NavItem[] = [
  { label: "Survey Overview", to: "/app/dashboard", icon: LayoutDashboard },
  { label: "General CEP", to: "/app/general", icon: FileCheck2 },
  { label: "Neglect CEP", to: "/app/neglect", icon: ShieldAlert },
  { label: "Infection Control", to: "/app/infection", icon: Microscope },
  { label: "Findings Summary", to: "/app/summary", icon: BarChart3 },
  { label: "Audit Trail", to: "/app/audit", icon: ScrollText },
];

const platformAnalyticsItems: NavItem[] = [
  { label: "Compliance Dashboard", to: "/app/dashboard-overview", icon: BarChart3 },
];

const platformItems: NavItem[] = [
  { label: "Question Library", to: "/app/admin/questions", icon: BookOpen },
  { label: "Templates", to: "/app/admin/templates", icon: Layers },
  { label: "Pathways", to: "/app/admin/pathways", icon: GitBranch },
];

const platformAdvancedItems: NavItem[] = [
  { label: "Workflow Builder", to: "/app/admin/workflows", icon: Wrench },
];

const platformHelpItems: NavItem[] = [
  { label: "Admin Guide", to: "/app/admin/guide", icon: FileCode2 },
];

const surveyWorkspaceRoutes = [
  "/app/dashboard",
  "/app/general",
  "/app/neglect",
  "/app/infection",
  "/app/summary",
  "/app/audit",
];

// Routes that belong exclusively to Platform Admin. Visiting one of these
// (directly or via refresh) should force the app into "platform" mode so the
// header label and sidebar stay consistent with the page being shown.
// NOTE: /app/admin/facilities and /app/admin/users are CUSTOMER routes, and
// /app/dashboard-overview is shared — so we match these prefixes explicitly.
const platformOnlyRoutePrefixes = [
  "/app/admin/questions",
  "/app/admin/templates",
  "/app/admin/pathways",
  "/app/admin/workflows",
  "/app/admin/guide",
];

/* ------------------------------------------------------------------ */
/*  Reusable sidebar nav section                                       */
/* ------------------------------------------------------------------ */

function NavSection({
  items,
  label,
}: {
  items: NavItem[];
  label?: string;
}) {
  return (
    <div className="px-4">
      {label && (
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
          {label}
        </p>
      )}
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#edf5fc] text-[#0077b6] shadow-[0_1px_3px_rgba(0,119,182,0.1)]"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/60"
                }`
              }
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Survey workspace nav with conditional enabling                      */
/* ------------------------------------------------------------------ */

function SurveyWorkspaceNav({ surveyLabel }: { surveyLabel: string }) {
  const location = useLocation();
  const navigate = useNavigate();

  // The pathways chosen for THIS survey, in order, with live status.
  const [pathways, setPathways] = useState<CasePathwayItem[]>([]);

  useEffect(() => {
    const caseId = localStorage.getItem(CASE_ID_KEY);
    if (!caseId) {
      setPathways([]);
      return;
    }
    let active = true;
    const load = () =>
      getCasePathways(caseId)
        .then((p) => active && setPathways(p))
        .catch(() => {});
    load();
    // Poll so the nav reflects status changes as the surveyor answers.
    const interval = setInterval(load, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  // Sequential gating: a pathway unlocks when the previous one is completed
  // (or once it has been started/completed itself).
  const navItems: { label: string; to: string; icon: ComponentType<{ className?: string }>; enabled: boolean; status?: string }[] = [
    { label: "Survey Overview", to: "/app/dashboard", icon: LayoutDashboard, enabled: true },
    ...pathways.map((p, i) => ({
      label: p.title,
      to: `/app/pathway/${p.slug}`,
      icon: FileCheck2,
      enabled:
        i === 0 ||
        pathways[i - 1].status === "completed" ||
        p.status === "in_progress" ||
        p.status === "completed",
      status: p.status,
    })),
    { label: "Findings Summary", to: "/app/summary", icon: BarChart3, enabled: true },
    { label: "Audit Trail", to: "/app/audit", icon: ScrollText, enabled: true },
  ];

  return (
    <>
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => navigate("/app")}
          className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-700 transition-colors rounded-md hover:bg-gray-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Surveys
        </button>
      </div>

      {surveyLabel && (
        <div className="mx-3 mb-3 px-3 py-2.5 bg-gradient-to-br from-[#edf5fc] to-[#e0eefa] rounded-lg border border-[#c7ddf0]">
          <p className="text-[12px] font-semibold text-[#0077b6]">{surveyLabel}</p>
        </div>
      )}

      <div className="px-4">
        <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-gray-400">
          Survey Navigation
        </p>
        <div className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            const completed = item.status === "completed";
            const disabled = !item.enabled;

            if (disabled) {
              return (
                <div
                  key={item.to}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-gray-300 cursor-not-allowed"
                  title="Complete previous section first"
                >
                  <Lock className="h-[18px] w-[18px] shrink-0 text-gray-300" />
                  {item.label}
                </div>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[#edf5fc] text-[#0077b6] shadow-[0_1px_3px_rgba(0,119,182,0.1)]"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/60"
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="h-[18px] w-[18px] shrink-0 text-emerald-500" />
                ) : (
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                )}
                <span className="flex-1">{item.label}</span>
                {completed && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Done</span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
      <div className="pb-3" />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  AppShell                                                           */
/* ------------------------------------------------------------------ */

export default function AppShell() {
  const { mode, setMode } = useMode();
  const location = useLocation();
  const navigate = useNavigate();

  // Keep the mode consistent with the route: platform-admin-only pages always
  // render in "platform" mode, even on direct navigation or refresh.
  const isPlatformOnlyRoute = platformOnlyRoutePrefixes.some((prefix) =>
    location.pathname.startsWith(prefix),
  );
  useEffect(() => {
    if (isPlatformOnlyRoute && mode !== "platform") {
      setMode("platform");
    }
  }, [isPlatformOnlyRoute, mode, setMode]);

  const caseId = localStorage.getItem(CASE_ID_KEY);

  // Effective mode used for rendering — reflects the route immediately so a
  // platform-only page never flashes the "LTC Customer" label/sidebar before
  // the persisting effect above runs.
  const effectiveMode: Mode = isPlatformOnlyRoute ? "platform" : mode;

  const isInSurveyWorkspace =
    effectiveMode === "customer" &&
    !!caseId &&
    (surveyWorkspaceRoutes.includes(location.pathname) ||
      location.pathname.startsWith("/app/pathway/"));

  const modeLabel = effectiveMode === "customer" ? "LTC Customer" : "Platform Admin";

  let surveyLabel = "";
  if (caseId) {
    try {
      const store = JSON.parse(localStorage.getItem(SURVEY_META_KEY) || "{}");
      const meta = store[caseId];
      if (meta?.surveyType === "annual_recertification") surveyLabel = "Annual Recertification";
      else if (meta?.surveyType === "complaint") surveyLabel = "Complaint Investigation";
      else if (meta?.surveyType === "revisit") surveyLabel = "Focused Revisit";
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f0f2f5]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="shrink-0 bg-gradient-to-r from-[#1a2d3e] to-[#2c4356] z-20 shadow-lg">
        <div className="max-w-[1360px] mx-auto h-[72px] flex items-center justify-between px-8 relative">
          <img
            src="/tcs-logo.png"
            alt="The Compliance Store"
            className="h-10 w-auto brightness-0 invert opacity-90"
          />

          <div className="absolute left-1/2 -translate-x-1/2 text-center">
            <h1 className="text-[20px] font-bold text-white tracking-wide">
              Survey Readiness Tool
            </h1>
            <p className="text-[10px] text-white/40 tracking-[0.2em] uppercase font-medium -mt-0.5">
              TCS Compliance Platform
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 h-8 px-4 text-[12px] font-semibold text-white/90 hover:text-white rounded-md border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 transition-all">
                {modeLabel}
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onSelect={() => { setMode("customer"); navigate("/app"); }}
              >
                LTC Customer
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => { setMode("platform"); navigate("/app/admin/questions"); }}
              >
                Platform Admin
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* ── Accent strip ─────────────────────────────────────────── */}
      <div
        className="h-1 shrink-0 z-10"
        style={{
          background:
            "linear-gradient(to right, #009eda 20%, #f5921e 20% 40%, #6abf4b 40% 60%, #8b5dbf 60% 80%, #b0b0b0 80%)",
        }}
      />

      {/* ── Body ────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[1360px] mx-auto flex min-h-full">
          {/* Sidebar area */}
          <aside className="w-[240px] shrink-0 pl-4 pt-[104px]">
            <div className="sticky top-6">
              {/* Floating nav card */}
              <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
                {isInSurveyWorkspace ? (
                  <SurveyWorkspaceNav surveyLabel={surveyLabel} />
                ) : effectiveMode === "customer" ? (
                  <div className="py-4">
                    <NavSection items={customerTopItems} label="Management" />
                  </div>
                ) : (
                  <div className="py-4 flex flex-col gap-5">
                    <NavSection items={platformAnalyticsItems} label="Analytics" />
                    <NavSection items={platformItems} label="Content Management" />
                    <NavSection items={platformAdvancedItems} label="Advanced Tools" />
                    <NavSection items={platformHelpItems} label="Help" />
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 px-8 py-6">
            <Outlet />
          </main>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <Footer />

      {/* ── Demo Chatbot ───────────────────────────────────────── */}
      <DemoChatbot />
    </div>
  );
}
