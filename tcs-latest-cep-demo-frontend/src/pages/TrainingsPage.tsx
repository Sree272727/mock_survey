import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Clock,
  Layers,
  CheckCircle2,
  Sparkles,
  PlayCircle,
  Award,
  BookOpen,
  Loader2,
} from "lucide-react";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { getLmsTrainings, type LmsTraining } from "../api";

const REGISTERED_KEY = "cms-lms-registered";

function loadRegistered(): string[] {
  try {
    const raw = localStorage.getItem(REGISTERED_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

type TabKey = "my" | "recommended" | "all";

const categoryColor: Record<string, string> = {
  "Quality of Care": "bg-blue-50 text-blue-700",
  Assessment: "bg-emerald-50 text-emerald-700",
  "Care Planning": "bg-violet-50 text-violet-700",
  "Abuse / Neglect": "bg-rose-50 text-rose-700",
  "Infection Control": "bg-cyan-50 text-cyan-700",
  Training: "bg-amber-50 text-amber-700",
};

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<LmsTraining[]>([]);
  const [registered, setRegistered] = useState<string[]>(loadRegistered);
  const [tab, setTab] = useState<TabKey>("recommended");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getLmsTrainings()
      .then(setTrainings)
      .catch((e) => setError((e as Error).message))
      .finally(() => setIsLoading(false));
  }, []);

  const isRegistered = (tag: string) => registered.includes(tag);

  function register(tag: string, title: string) {
    setRegistered((prev) => {
      if (prev.includes(tag)) return prev;
      const next = [...prev, tag];
      localStorage.setItem(REGISTERED_KEY, JSON.stringify(next));
      return next;
    });
    setToast(`Registered for "${title}" — added to My Training`);
    setTimeout(() => setToast(null), 3000);
  }

  const recommended = useMemo(
    () => trainings.filter((t) => t.recommended && !isRegistered(t.f_tag)),
    [trainings, registered],
  );
  const mine = useMemo(
    () => trainings.filter((t) => isRegistered(t.f_tag)),
    [trainings, registered],
  );

  const list = tab === "my" ? mine : tab === "recommended" ? recommended : trainings;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "my", label: "My Training", count: mine.length },
    { key: "recommended", label: "Recommended", count: recommended.length },
    { key: "all", label: "All Training", count: trainings.length },
  ];

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-[#1a2d3e] text-white text-sm px-5 py-3 rounded-lg shadow-lg flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-[#0077b6]" />
            Learning Management System
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Targeted training to prevent repeat deficiencies — recommendations are driven by the F-tags cited in your surveys
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-4">
        <Kpi label="Catalog" value={trainings.length} icon={<BookOpen className="h-4 w-4" />} />
        <Kpi label="Recommended" value={trainings.filter((t) => t.recommended).length} icon={<Sparkles className="h-4 w-4" />} accent="text-[#0077b6]" />
        <Kpi label="Registered" value={mine.length} icon={<Award className="h-4 w-4" />} accent="text-emerald-600" />
        <Kpi label="Completed" value={0} icon={<CheckCircle2 className="h-4 w-4" />} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              tab === t.key
                ? "border-[#0077b6] text-[#0077b6]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {t.label}
            <span
              className={`text-[11px] rounded-full px-1.5 py-0.5 ${
                tab === t.key ? "bg-[#0077b6]/10 text-[#0077b6]" : "bg-gray-100 text-gray-500"
              }`}
            >
              {t.count}
            </span>
          </button>
        ))}
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-16 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading catalog…
        </div>
      ) : error ? (
        <p className="text-sm text-red-600 py-8 text-center">{error}</p>
      ) : list.length === 0 ? (
        <EmptyState tab={tab} hasCatalog={trainings.length > 0} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {list.map((t) => (
            <TrainingCard
              key={t.f_tag}
              t={t}
              registered={isRegistered(t.f_tag)}
              showProgress={tab === "my"}
              onRegister={() => register(t.f_tag, t.title)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, icon, accent }: { label: string; value: number; icon: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-gray-400 mb-1 flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className={`text-2xl font-semibold ${accent || "text-gray-900"}`}>{value}</p>
    </div>
  );
}

function TrainingCard({
  t,
  registered,
  showProgress,
  onRegister,
}: {
  t: LmsTraining;
  registered: boolean;
  showProgress: boolean;
  onRegister: () => void;
}) {
  const isHarm = t.severity.startsWith("G") || t.severity.startsWith("H") || t.severity.startsWith("I") || t.severity.startsWith("J");
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col shadow-sm">
      {/* Top badges */}
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-[11px] font-mono font-semibold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">{t.f_tag}</span>
        <Badge variant="secondary" className={`border-0 text-[11px] ${categoryColor[t.category] || "bg-gray-100 text-gray-600"}`}>
          {t.category}
        </Badge>
        {t.recommended && (
          <Badge className="border-0 text-[11px] bg-[#0077b6]/10 text-[#0077b6] gap-1">
            <Sparkles className="h-3 w-3" /> Recommended
          </Badge>
        )}
        {isHarm && (
          <Badge className="border-0 text-[11px] bg-rose-50 text-rose-700">Harm-level</Badge>
        )}
      </div>

      {/* Title + reg/description */}
      <h3 className="text-[15px] font-semibold text-gray-900 leading-snug">{t.title}</h3>
      <p className="text-[11px] text-gray-400 mt-0.5">{t.regulation}</p>
      <p className="text-[13px] text-gray-600 mt-2 leading-relaxed flex-1">{t.description}</p>

      {/* Meta chips */}
      <div className="flex items-center gap-4 mt-3 text-[12px] text-gray-500">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {t.duration_min} min</span>
        <span className="flex items-center gap-1"><Layers className="h-3.5 w-3.5" /> {t.modules} modules</span>
        <span className="flex items-center gap-1"><BookOpen className="h-3.5 w-3.5" /> {t.level}</span>
      </div>
      <p className="text-[11px] text-gray-400 mt-1">{t.format}</p>

      {/* Progress (My Training only) */}
      {showProgress && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
            <span>Not started</span>
            <span>0%</span>
          </div>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full bg-[#0077b6]" style={{ width: "0%" }} />
          </div>
        </div>
      )}

      {/* Action */}
      <div className="mt-4">
        {registered ? (
          <div className="flex items-center gap-2">
            <Badge className="border-0 bg-emerald-50 text-emerald-700 gap-1 text-xs py-1">
              <CheckCircle2 className="h-3.5 w-3.5" /> Registered
            </Badge>
            <Button variant="outline" size="sm" className="gap-1.5 ml-auto" disabled title="Content coming soon">
              <PlayCircle className="h-4 w-4" /> Start
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5 w-full"
            onClick={onRegister}
          >
            <GraduationCap className="h-4 w-4" /> Register
          </Button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ tab, hasCatalog }: { tab: TabKey; hasCatalog: boolean }) {
  const msg =
    tab === "my"
      ? "You haven't registered for any training yet. Check the Recommended tab."
      : tab === "recommended"
        ? hasCatalog
          ? "No recommendations yet. Run a survey — the F-tags cited there will surface matching training here."
          : "No trainings in the catalog yet. Create or upload a pathway first."
        : "No trainings in the catalog yet. Create or upload a pathway with citation rules first.";
  return (
    <div className="rounded-xl border border-dashed border-gray-200 bg-white py-16 text-center">
      <GraduationCap className="h-8 w-8 text-gray-300 mx-auto mb-3" />
      <p className="text-sm text-gray-500 max-w-md mx-auto">{msg}</p>
    </div>
  );
}
