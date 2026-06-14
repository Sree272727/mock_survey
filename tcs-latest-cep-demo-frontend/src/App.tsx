import React, { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";

import { PathwayTriggerModal } from "./components/PathwayTriggerModal";
import {
  API_BASE,
  addEvidence,
  createCase,
  deleteCase,
  downloadCaseReportPdf,
  getCase,
  getCaseEvents,
  getFindingsSummary,
  getCasePathwaySnapshot,
  getCaseState,
  getPathway,
  listCases,
  listPathways,
  getCasePathways,
  type CasePathwayItem,
  listPathwayValidationIssues,
  listEvidence,
  purgeAllCases,
  resetCase,
  resolveValidationIssue,
  submitAnswer,
  uploadEvidence,
  updateCase,
  updatePathwayStatus,
} from "./api";
import type {
  CaseEvent,
  CasePathwaySnapshot,
  CaseRecord,
  CaseState,
  EvidenceItem,
  FindingsSummary,
  NextStep,
  Node,
  PathwayDefinition,
  ValidationIssue,
} from "./types";
import AppShell from "./layouts/AppShell";
import FacilitiesPage from "./pages/FacilitiesPage";
import UsersPage from "./pages/UsersPage";
import QuestionLibraryPage from "./pages/QuestionLibraryPage";
import TemplatesPage from "./pages/TemplatesPage";
import PathwaysPage from "./pages/PathwaysPage";
import LandingPage from "./pages/LandingPage";
import WorkflowBuilderPage from "./pages/admin/workflows/WorkflowBuilderPage";
import DashboardOverviewPage from "./pages/DashboardOverviewPage";
import FacilityDashboardPage from "./pages/FacilityDashboardPage";
import AdminGuidePage from "./pages/AdminGuidePage";
import { PathwaysTable } from "./pages/admin/workflows/PathwaysTable";
import { SectionsTable } from "./pages/admin/workflows/SectionsTable";
import { QuestionsTable } from "./pages/admin/workflows/QuestionsTable";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Input } from "./components/ui/input";
import { Badge } from "./components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./components/ui/table";

const CASE_ID_KEY = "cms-demo-case-id";
const SURVEY_META_KEY = "cms-demo-survey-meta";
type SurveyType =
  | "annual_recertification"
  | "complaint"
  | "revisit";
type ComplaintFocus = "general_quality" | "neglect";
type RevisitFor = "general" | "neglect";
type PathwayFocus = "general" | "neglect" | "infection";
type SurveyMeta = {
  surveyType: SurveyType;
  complaintFocus: ComplaintFocus;
  revisitFor: RevisitFor;
  annualPathway: PathwayFocus;
};

const DEFAULT_SURVEY_META: SurveyMeta = {
  surveyType: "annual_recertification",
  complaintFocus: "general_quality",
  revisitFor: "general",
  annualPathway: "general",
};

function getTargetPathway(meta: SurveyMeta): "general" | "neglect" | "infection" {
  if (meta.surveyType === "annual_recertification") return meta.annualPathway;
  if (meta.surveyType === "complaint") return meta.complaintFocus === "neglect" ? "neglect" : "general";
  if (meta.surveyType === "revisit") return meta.revisitFor;
  return "general";
}

function getSurveyTypeLabel(value: SurveyType): string {
  if (value === "annual_recertification") return "Annual Recertification";
  if (value === "complaint") return "Complaint";
  return "Revisit";
}

function loadSurveyMetaStore(): Record<string, SurveyMeta> {
  try {
    const raw = localStorage.getItem(SURVEY_META_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, SurveyMeta>;
  } catch {
    return {};
  }
}

function saveSurveyMetaStore(store: Record<string, SurveyMeta>) {
  localStorage.setItem(SURVEY_META_KEY, JSON.stringify(store));
}

function formatStatus(value: string | null | undefined): string {
  if (!value) return "Not started";
  return value.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "N/A";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "N/A";
  return dt.toLocaleDateString();
}

function useActiveCase() {
  const [caseId, setCaseId] = useState<string | null>(() => localStorage.getItem(CASE_ID_KEY));

  function updateCaseId(id: string | null) {
    setCaseId(id);
    if (id) localStorage.setItem(CASE_ID_KEY, id);
    else localStorage.removeItem(CASE_ID_KEY);
  }

  return { caseId, updateCaseId };
}


function toUserFriendlyIssueMessage(message: string): string {
  return message
    .replace("Decision #1 marked No requires at least 2 supporting evidence items.", "Please add at least 2 evidence items before you continue.")
    .replace("Neglect Decision #1 marked No requires at least 2 supporting evidence items.", "Please add at least 2 evidence items for this Neglect decision.")
    .replace("Decision #1 marked No requires a detailed surveyor note (20+ characters).", "Please add a detailed note (at least 20 characters).")
    .replace("At least 2 evidence item(s) required", "Please add at least 2 evidence items.")
    .replace("Surveyor note is required", "Please add surveyor notes to proceed.");
}

function toUserFriendlyFlagMessage(flag: string): string {
  const withoutCode = flag.replace(/^[A-Z0-9_-]+\s*:\s*/i, "");
  return withoutCode
    .replace("Deficiency flagged", "Potential concern found")
    .replace("Potential neglect risk", "Possible neglect risk")
    .replace("Escalate to Neglect CEP", "Please review in Neglect CEP")
    .replace("Insufficient evidence", "More supporting evidence may be needed")
    .replace("Rationale missing", "Please add a clearer explanation")
    .replace(/\bCEP\b/g, "pathway");
}

const DEMO_FACILITIES = [
  { id: "fac-1", name: "Sunrise Senior Living", location: "Tampa, FL" },
  { id: "fac-2", name: "Oakwood Care Center", location: "Orlando, FL" },
  { id: "fac-3", name: "Palm Gardens Health & Rehab", location: "Miami, FL" },
  { id: "fac-4", name: "Riverside Health Center", location: "Jacksonville, FL" },
  { id: "fac-5", name: "Bayshore Nursing & Rehab", location: "St. Petersburg, FL" },
];

const DEMO_SURVEYORS = [
  { id: "usr-1", name: "Sarah Johnson", role: "Survey Director" },
  { id: "usr-2", name: "Michael Chen", role: "Lead Surveyor" },
  { id: "usr-3", name: "Emily Rodriguez", role: "Surveyor" },
  { id: "usr-4", name: "David Kim", role: "Surveyor" },
];

function Dashboard({
  caseId,
  setCaseId,
  caseState,
  evidence,
  events,
  refreshGlobal,
  showToast,
  globalLoading,
  onReset,
}: {
  caseId: string | null;
  setCaseId: (id: string | null) => void;
  caseState: CaseState | null;
  evidence: EvidenceItem[];
  events: CaseEvent[];
  refreshGlobal: () => Promise<void>;
  showToast: (msg: string) => void;
  globalLoading: boolean;
  onReset: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [caseRec, setCaseRec] = useState<CaseRecord | null>(null);
  const [caseList, setCaseList] = useState<CaseRecord[]>([]);
  const [editExternalCaseId, setEditExternalCaseId] = useState("");
  const [editResidentId, setEditResidentId] = useState("");
  const [editFacilityName, setEditFacilityName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [dismissedRecommend, setDismissedRecommend] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isAddingEvidence, setIsAddingEvidence] = useState(false);
  const [isSavingCaseDetails, setIsSavingCaseDetails] = useState(false);
  const [surveyMetaStore, setSurveyMetaStore] = useState<Record<string, SurveyMeta>>(() => loadSurveyMetaStore());
  const [surveyType, setSurveyType] = useState<SurveyType>(DEFAULT_SURVEY_META.surveyType);
  const [complaintFocus, setComplaintFocus] = useState<ComplaintFocus>(DEFAULT_SURVEY_META.complaintFocus);
  const [revisitFor, setRevisitFor] = useState<RevisitFor>(DEFAULT_SURVEY_META.revisitFor);
  const [annualPathway, setAnnualPathway] = useState<PathwayFocus>(DEFAULT_SURVEY_META.annualPathway);
  const [metaHydratedCaseId, setMetaHydratedCaseId] = useState<string | null>(null);
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [selectedSurveyor, setSelectedSurveyor] = useState<string>("");
  const [surveyName, setSurveyName] = useState<string>("");
  // Pathways available to include + the ones chosen for this survey
  const [availablePathways, setAvailablePathways] = useState<Array<{ slug: string; title: string }>>([]);
  const [selectedPathwaySlugs, setSelectedPathwaySlugs] = useState<string[]>([]);
  // Pathways actually attached to the current survey (drives milestones)
  const [casePathways, setCasePathways] = useState<CasePathwayItem[]>([]);

  const isNewSurvey = !caseId;

  useEffect(() => {
    if (!caseId) {
      setCasePathways([]);
      return;
    }
    getCasePathways(caseId).then(setCasePathways).catch(() => setCasePathways([]));
  }, [caseId, caseState]);

  // Load the active pathways from the DB to populate the multi-select
  useEffect(() => {
    if (!isNewSurvey) return;
    listPathways()
      .then((ps) => setAvailablePathways(ps.filter((p) => p.is_active).map((p) => ({ slug: p.slug, title: p.title }))))
      .catch(() => setAvailablePathways([]));
  }, [isNewSurvey]);

  const recommendation = useMemo(
    () => events.find((e) => e.event_type === "recommendation_generated"),
    [events],
  );
  const flagCount = caseState?.flags.length || 0;
  const citationCount = caseState?.citations.length || 0;
  const eventCount = events.length;

  useEffect(() => {
    void listCases()
      .then((rows) => setCaseList(rows))
      .catch(() => setCaseList([]));
  }, [caseId]);

  useEffect(() => {
    if (!caseId) {
      setCaseRec(null);
      setEditExternalCaseId("");
      setEditResidentId("");
      setEditFacilityName("");
      return;
    }
    void getCase(caseId)
      .then((c) => {
        setCaseRec(c);
        setEditExternalCaseId(c.external_case_id);
        setEditResidentId(c.resident_id);
        setEditFacilityName(c.facility_name);
      })
      .catch((e: Error) => setError(e.message));
  }, [caseId]);

  useEffect(() => {
    const meta = (caseId && surveyMetaStore[caseId]) || DEFAULT_SURVEY_META;
    setSurveyType(meta.surveyType);
    setComplaintFocus(meta.complaintFocus);
    setRevisitFor(meta.revisitFor);
    setAnnualPathway(meta.annualPathway || "general");
    setMetaHydratedCaseId(caseId || null);
  }, [caseId, surveyMetaStore]);

  function updateSurveyMeta(caseIdValue: string, next: SurveyMeta) {
    setSurveyMetaStore((prev) => {
      const existing = prev[caseIdValue];
      if (
        existing &&
        existing.surveyType === next.surveyType &&
        existing.complaintFocus === next.complaintFocus &&
        existing.revisitFor === next.revisitFor &&
        existing.annualPathway === next.annualPathway
      ) {
        return prev;
      }
      const merged = { ...prev, [caseIdValue]: next };
      saveSurveyMetaStore(merged);
      return merged;
    });
  }

  useEffect(() => {
    if (!caseId) return;
    if (metaHydratedCaseId !== caseId) return;
    updateSurveyMeta(caseId, { surveyType, complaintFocus, revisitFor, annualPathway });
  }, [caseId, metaHydratedCaseId, surveyType, complaintFocus, revisitFor, annualPathway]);

  async function createDemoCase() {
    try {
      setIsCreating(true);
      setError(null);
      setDismissedRecommend(false);
      const now = Date.now();
      const selectedMeta: SurveyMeta = { surveyType, complaintFocus, revisitFor, annualPathway };
      const targetPathway = getTargetPathway(selectedMeta);
      const facility = DEMO_FACILITIES.find((f) => f.id === selectedFacility);
      const facilityName = facility?.name || "Example Nursing Home";
      const caseName = surveyName.trim() || `${getSurveyTypeLabel(surveyType)} — ${facilityName}`;
      const created = await createCase({
        external_case_id: caseName,
        resident_id: "R-000184",
        facility_name: facilityName,
        pathway_slugs: selectedPathwaySlugs,
      });
      setCaseRec(created);
      setCaseId(created.id);
      updateSurveyMeta(created.id, selectedMeta);
      setCaseList((prev) => [created, ...prev]);
      await refreshGlobal();
      showToast(`${getSurveyTypeLabel(surveyType)} survey created`);
      navigate("/app");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsCreating(false);
    }
  }

  async function addEvidenceFromDashboard() {
    if (!caseId) return;
    try {
      setIsAddingEvidence(true);
      await addEvidence(caseId, "Dashboard evidence item");
      await refreshGlobal();
      showToast("Evidence added");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsAddingEvidence(false);
    }
  }

  async function saveCaseDetails() {
    if (!caseId) return;
    try {
      setIsSavingCaseDetails(true);
      setError(null);
      const updated = await updateCase(caseId, {
        external_case_id: editExternalCaseId.trim(),
        resident_id: editResidentId.trim(),
        facility_name: editFacilityName.trim(),
      });
      setCaseRec(updated);
      setCaseList((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      await refreshGlobal();
      showToast("Survey details updated");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSavingCaseDetails(false);
    }
  }

  const targetPathwayLabel = (() => {
    const t = getTargetPathway({ surveyType, complaintFocus, revisitFor, annualPathway });
    return t === "neglect" ? "Neglect CEP" : t === "infection" ? "Infection Control Pathway" : "General CEP";
  })();

  /* ── New Survey (Create) View ─────────────────────────────── */
  if (isNewSurvey) {
    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Create New Survey</h2>
          <p className="text-sm text-muted-foreground mt-1">Configure survey details and start the assessment</p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Survey Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Survey Name</label>
              <Input
                value={surveyName}
                onChange={(e) => setSurveyName(e.target.value)}
                placeholder="e.g., Q1 2026 Annual Recertification — Sunrise Senior Living"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Facility</label>
                <Select value={selectedFacility} onValueChange={setSelectedFacility}>
                  <SelectTrigger><SelectValue placeholder="Select a facility" /></SelectTrigger>
                  <SelectContent>
                    {DEMO_FACILITIES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name} — {f.location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Lead Surveyor</label>
                <Select value={selectedSurveyor} onValueChange={setSelectedSurveyor}>
                  <SelectTrigger><SelectValue placeholder="Select a surveyor" /></SelectTrigger>
                  <SelectContent>
                    {DEMO_SURVEYORS.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} — {u.role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Survey Type</label>
                <Select value={surveyType} onValueChange={(val) => setSurveyType(val as SurveyType)}>
                  <SelectTrigger><SelectValue placeholder="Select survey type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual_recertification">Annual Recertification</SelectItem>
                    <SelectItem value="complaint">Complaint Investigation</SelectItem>
                    <SelectItem value="revisit" disabled>Focused Revisit (Draft)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {surveyType === "complaint" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Investigation Focus</label>
                  <Select value={complaintFocus} onValueChange={(val) => setComplaintFocus(val as ComplaintFocus)}>
                    <SelectTrigger><SelectValue placeholder="Select focus" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_quality">General Quality of Care</SelectItem>
                      <SelectItem value="neglect">Neglect</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Pathways to include — multi-select, loaded from the database */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Pathways to include <span className="text-muted-foreground font-normal">(surveyed in this order)</span>
              </label>
              {availablePathways.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No pathways available. Create or upload one in the Workflow Builder first.
                </p>
              ) : (
                <div className="rounded-lg border border-gray-200 divide-y divide-gray-100">
                  {availablePathways.map((p) => {
                    const checked = selectedPathwaySlugs.includes(p.slug);
                    const order = selectedPathwaySlugs.indexOf(p.slug);
                    return (
                      <label key={p.slug} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedPathwaySlugs((prev) =>
                              e.target.checked ? [...prev, p.slug] : prev.filter((s) => s !== p.slug),
                            )
                          }
                          className="h-4 w-4 shrink-0 p-0 rounded border-gray-300 accent-[#0077b6]"
                        />
                        <span className="text-sm text-gray-800 flex-1">{p.title}</span>
                        {checked && (
                          <span className="text-[11px] font-medium text-[#0077b6] bg-[#0077b6]/10 rounded-full px-2 py-0.5">
                            {order + 1}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Only the selected pathways will appear in the survey. They unlock in the numbered order.
              </p>
            </div>

            <Button onClick={createDemoCase} disabled={isCreating || !selectedFacility || selectedPathwaySlugs.length === 0}>
              {isCreating ? "Creating..." : "Create Survey"}
            </Button>
          </CardContent>
        </Card>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    );
  }

  /* ── Existing Survey Dashboard View ───────────────────────── */

  // Progress milestones — built from the survey's chosen pathways (gated, in order)
  type MsStatus = "completed" | "in_progress" | "pending";
  const mapMs = (s: string): MsStatus =>
    s === "completed" ? "completed" : s === "in_progress" ? "in_progress" : "pending";
  const allPathwaysComplete =
    casePathways.length > 0 && casePathways.every((p) => p.status === "completed");

  const milestones: { label: string; key: string; route: string; status: MsStatus; locked: boolean }[] = [
    { label: "Survey Created", key: "created", route: "", status: "completed", locked: false },
    ...casePathways.map((p, i) => ({
      label: p.title,
      key: p.slug,
      route: `/app/pathway/${p.slug}`,
      status: mapMs(p.status),
      locked: i > 0 && casePathways[i - 1].status !== "completed",
    })),
    {
      label: "Review & Summary",
      key: "summary",
      route: "/app/summary",
      status: (allPathwaysComplete ? "completed" : "pending") as MsStatus,
      locked: false,
    },
  ];

  const completedMilestones = milestones.filter((m) => m.status === "completed").length;
  const progressPct = Math.round((completedMilestones / milestones.length) * 100);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[26px] font-bold text-foreground tracking-tight">Survey Dashboard</h2>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          {caseRec?.external_case_id || "—"} · {caseRec?.facility_name || "—"}
        </p>
      </div>

      {globalLoading && (
        <p className="text-sm text-muted-foreground">Refreshing survey data…</p>
      )}

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200/60 px-5 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Progress</p>
          <p className="text-[28px] font-bold text-foreground mt-1">{progressPct}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 px-5 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Citations</p>
          <p className="text-[28px] font-bold text-foreground mt-1">{citationCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 px-5 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Flags</p>
          <p className="text-[28px] font-bold text-amber-600 mt-1">{flagCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 px-5 py-4 shadow-sm">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Events</p>
          <p className="text-[28px] font-bold text-foreground mt-1">{eventCount}</p>
        </div>
      </div>

      {/* ── Progress Bar ── */}
      <Card className="rounded-xl shadow-sm border-gray-200/60">
        <CardContent className="px-6 py-5 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Survey Progress</p>
            <span className="text-xs text-muted-foreground">{completedMilestones} of {milestones.length} milestones</span>
          </div>

          {/* Progress bar */}
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#0077b6] to-[#009eda] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Milestone steps */}
          <div className="flex items-start justify-between relative">
            {/* Connecting line */}
            <div className="absolute top-[14px] left-[28px] right-[28px] h-[2px] bg-gray-200" />
            <div
              className="absolute top-[14px] left-[28px] h-[2px] bg-[#0077b6] transition-all duration-500"
              style={{ width: `${Math.max(0, ((completedMilestones - 1) / (milestones.length - 1)) * 100)}%` }}
            />

            {milestones.map((m) => {
              const status = m.status;
              return (
                <button
                  key={m.key}
                  onClick={() => m.route && !m.locked && navigate(m.route)}
                  disabled={!m.route || m.locked}
                  title={m.locked ? "Complete the previous pathway first" : undefined}
                  className="flex flex-col items-center gap-2 relative z-10 group"
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      status === "completed"
                        ? "bg-[#0077b6] text-white shadow-md"
                        : status === "in_progress"
                          ? "bg-white border-2 border-[#0077b6] text-[#0077b6] shadow-md"
                          : "bg-white border-2 border-gray-300 text-gray-400"
                    }`}
                  >
                    {status === "completed" ? "✓" : ""}
                  </div>
                  <span
                    className={`text-[11px] font-medium text-center leading-tight max-w-[80px] ${
                      status === "completed"
                        ? "text-[#0077b6]"
                        : status === "in_progress"
                          ? "text-foreground"
                          : "text-gray-400"
                    } ${m.route ? "group-hover:text-[#0077b6]" : ""}`}
                  >
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pathway Recommendation */}
      {recommendation && !dismissedRecommend && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 space-y-2">
          <p className="text-sm font-semibold text-foreground">Pathway Recommendation</p>
          <p className="text-sm text-muted-foreground">{String(recommendation.payload.message || "Recommendation triggered")}</p>
          <div className="flex gap-2 pt-1">
            {(() => {
              const targetSlug = String(recommendation.payload.target_slug || "");
              const routeBySlug: Record<string, string> = {
                "general-cep": "/app/general",
                "neglect-cep": "/app/neglect",
                "infection-control-cep": "/app/infection",
              };
              if (targetSlug) {
                return (
                  <Button size="sm" onClick={() => navigate(routeBySlug[targetSlug] || `/app/pathway/${targetSlug}`)}>
                    Open Recommended CEP
                  </Button>
                );
              }
              return (
                <>
                  <Button size="sm" onClick={() => navigate("/app/general")}>Open General CEP</Button>
                  <Button size="sm" onClick={() => navigate("/app/neglect")}>Open Neglect CEP</Button>
                </>
              );
            })()}
            <Button size="sm" variant="ghost" onClick={() => setDismissedRecommend(true)}>Dismiss</Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function SurveyHistory({
  caseId,
  setCaseId,
  showToast,
}: {
  caseId: string | null;
  setCaseId: (id: string | null) => void;
  showToast: (msg: string) => void;
}) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CaseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "completed" | "in_progress" | "new">("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | SurveyType>("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [surveyMetaStore] = useState<Record<string, SurveyMeta>>(() => loadSurveyMetaStore());
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  async function refreshRows() {
    try {
      setIsLoading(true);
      setError(null);
      const items = await listCases();
      setRows(items);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void refreshRows();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    rows.forEach((r) => {
      const dt = new Date(r.created_at);
      if (!Number.isNaN(dt.getTime())) years.add(String(dt.getFullYear()));
    });
    return Array.from(years).sort((a, b) => Number(b) - Number(a));
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows
      .filter((r) => {
        if (filter === "new" && r.status !== "in_progress" && r.status !== "completed") return true;
        else if (filter === "new") return false;
        if (filter !== "all" && r.status !== filter) return false;
        if (yearFilter === "all") return true;
        const dt = new Date(r.created_at);
        if (Number.isNaN(dt.getTime())) return false;
        if (String(dt.getFullYear()) !== yearFilter) return false;
        return true;
      })
      .filter((r) => {
        if (typeFilter === "all") return true;
        const meta = surveyMetaStore[r.id];
        return meta?.surveyType === typeFilter;
      })
      .filter((r) => {
        const q = query.trim().toLowerCase();
        if (!q) return true;
        const meta = surveyMetaStore[r.id];
        const typeLabel = meta ? getSurveyTypeLabel(meta.surveyType) : "annual recertification";
        return (
          r.external_case_id.toLowerCase().includes(q) ||
          r.facility_name.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q) ||
          typeLabel.toLowerCase().includes(q)
        );
      });
  }, [rows, filter, yearFilter, typeFilter, surveyMetaStore, query]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setPage(1);
  }, [filter, yearFilter, typeFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const paginatedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  async function downloadReport(targetCaseId: string) {
    try {
      const blob = await downloadCaseReportPdf(targetCaseId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cms-2567-${targetCaseId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast("CMS-2567 downloaded");
    } catch {
      showToast("Report download failed");
    }
  }

  const newCount = rows.filter((r) => r.status !== "in_progress" && r.status !== "completed").length;
  const inProgressCount = rows.filter((r) => r.status === "in_progress").length;
  const completedCount = rows.filter((r) => r.status === "completed").length;
  const facilityCount = new Set(rows.map((r) => r.facility_name)).size || 5;

  return (
    <div className="space-y-5">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[26px] font-bold text-foreground tracking-tight">Surveys</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">Active and completed survey assessments</p>
        </div>
        <Button className="h-10 px-5 text-sm font-semibold" onClick={() => navigate("/app/create-survey")}>
          + Create Survey
        </Button>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total</p>
          <p className="text-[24px] font-bold text-foreground mt-0.5">{rows.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">New</p>
          <p className="text-[24px] font-bold text-amber-600 mt-0.5">{newCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold whitespace-nowrap">In Progress</p>
          <p className="text-[24px] font-bold text-[#0077b6] mt-0.5">{inProgressCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Completed</p>
          <p className="text-[24px] font-bold text-emerald-600 mt-0.5">{completedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200/60 px-4 py-3 shadow-sm">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Facilities</p>
          <p className="text-[24px] font-bold text-foreground mt-0.5">{facilityCount}</p>
        </div>
      </div>

      {/* ── Filters + Table Card ── */}
      <Card className="surveysListCard rounded-xl shadow-sm border-gray-200/60">
        <CardContent className="px-5 py-4 surveysFilterBar">
          <div className="flex items-center gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by survey name, facility, or type..."
              className="flex-1 min-w-[200px] h-9"
            />

            <Select value={filter} onValueChange={(val) => setFilter(val as "all" | "completed" | "in_progress" | "new")}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={(value) => setTypeFilter(value as "all" | SurveyType)}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="annual_recertification">Annual Recertification</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="revisit">Revisit</SelectItem>
              </SelectContent>
            </Select>

            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="All Years" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Years</SelectItem>
                {availableYears.map((year) => (
                  <SelectItem key={year} value={year}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        {filteredRows.length ? (
          <>
          <CardContent className="p-0 surveysTableWrap">
            <div className="overflow-x-auto">
            <Table className="surveysTable w-full" style={{ minWidth: 900 }}>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="py-3 px-5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Survey</TableHead>
                  <TableHead className="py-3 px-5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Facility</TableHead>
                  <TableHead className="py-3 px-5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Type</TableHead>
                  <TableHead className="py-3 px-5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Status</TableHead>
                  <TableHead className="py-3 px-5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Created</TableHead>
                  <TableHead className="py-3 px-5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row) => {
                  const meta = surveyMetaStore[row.id];
                  const surveyTypeLabel = meta ? getSurveyTypeLabel(meta.surveyType) : "Annual Recertification";
                  const isCompleted = row.status === "completed";
                  const isInProgress = row.status === "in_progress";
                  const isNew = !isCompleted && !isInProgress;
                  const displayName = row.external_case_id.startsWith("SURVEY-")
                    ? surveyTypeLabel
                    : row.external_case_id;

                  return (
                    <TableRow key={row.id} className="hover:bg-transparent transition">
                      <TableCell className="py-4 px-5">
                        <div className="font-semibold text-foreground text-[13px]">{displayName}</div>
                      </TableCell>
                      <TableCell className="py-4 px-5 text-[13px] text-foreground">{row.facility_name}</TableCell>
                      <TableCell className="py-4 px-5 text-[13px] text-foreground">{surveyTypeLabel}</TableCell>
                      <TableCell className="py-4 px-5 whitespace-nowrap">
                        {isCompleted ? (
                          <span className="text-[13px] font-semibold text-emerald-600">Completed</span>
                        ) : isInProgress ? (
                          <span className="text-[13px] font-semibold text-[#0077b6] whitespace-nowrap">In Progress</span>
                        ) : (
                          <span className="text-[13px] font-semibold text-amber-600">New</span>
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-5 text-sm text-foreground">{formatDate(row.created_at)}</TableCell>
                      <TableCell className="py-4 px-5 text-right">
                        {isCompleted ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white w-[90px]"
                            onClick={() => {
                              setCaseId(row.id);
                              navigate("/app/summary");
                            }}
                          >
                            Summary
                          </Button>
                        ) : isNew ? (
                          <Button
                            size="sm"
                            className="bg-amber-500 hover:bg-amber-600 text-white w-[90px]"
                            onClick={() => {
                              setCaseId(row.id);
                              navigate("/app/dashboard");
                            }}
                          >
                            Start
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            className="w-[90px]"
                            onClick={() => {
                              setCaseId(row.id);
                              navigate("/app/dashboard");
                            }}
                          >
                            Continue
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          </CardContent>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200/60">
              <p className="text-xs text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} surveys
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button
                    key={p}
                    variant={p === page ? "default" : "outline"}
                    size="sm"
                    className={`h-8 w-8 text-xs ${p === page ? "" : ""}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
          </>
        ) : (
          <CardContent className="p-10 text-center surveysEmptyState">
            <p className="text-sm text-muted-foreground">No surveys found</p>
          </CardContent>
        )}
      </Card>

      {error && <p className="error mt-4">{error}</p>}
    </div>
  );
}

/** Runtime screen for any pathway by slug (e.g. ones imported from PDF). */
function DynamicPathwayScreen({
  caseId,
  refreshGlobal,
  showToast,
}: {
  caseId: string | null;
  refreshGlobal: () => Promise<void>;
  showToast: (msg: string) => void;
}) {
  const { slug } = useParams<{ slug: string }>();
  const [title, setTitle] = useState<string>("");

  useEffect(() => {
    if (!slug) return;
    listPathways()
      .then((ps) => setTitle(ps.find((p) => p.slug === slug)?.title || slug))
      .catch(() => setTitle(slug));
  }, [slug]);

  if (!slug) return null;
  return (
    <PathwayScreen
      key={slug}
      caseId={caseId}
      pathwaySlug={slug}
      title={title || slug}
      sideTitle="Shared Evidence & Flags"
      refreshGlobal={refreshGlobal}
      showToast={showToast}
    />
  );
}

function PathwayScreen({
  caseId,
  pathwaySlug,
  title,
  sideTitle,
  refreshGlobal,
  showToast,
}: {
  caseId: string | null;
  pathwaySlug: string;
  title: string;
  sideTitle: string;
  refreshGlobal: () => Promise<void>;
  showToast: (msg: string) => void;
}) {
  const [definition, setDefinition] = useState<PathwayDefinition | null>(null);
  const [caseRecord, setCaseRecord] = useState<CaseRecord | null>(null);
  const [snapshot, setSnapshot] = useState<CasePathwaySnapshot | null>(null);
  const [caseState, setCaseState] = useState<CaseState | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [tab, setTab] = useState<string>("");
  const [indexByTab, setIndexByTab] = useState<Record<string, number>>({});
  const [notesByNode, setNotesByNode] = useState<Record<string, string>>({});
  const [evidenceRefByNode, setEvidenceRefByNode] = useState<Record<string, string>>({});
  const [lastStep, setLastStep] = useState<NextStep | null>(null);
  // Triggered-CEP pop-up flow
  const [triggerBanner, setTriggerBanner] = useState<{ message: string; slug: string | null; targetCode?: string } | null>(null);
  const [popup, setPopup] = useState<{ slug: string; targetCode?: string } | null>(null);

  useEffect(() => {
    if (lastStep?.recommendation) {
      setTriggerBanner({
        message: lastStep.recommendation,
        slug: lastStep.recommendation_slug ?? null,
      });
    }
  }, [lastStep]);

  // Cross-pathway "go to question" rules are resolved client-side from the
  // answered node's own rules (the engine treats them as same-pathway no-ops).
  function detectCrossPathwayGoto(node: Node, choiceLabel: string) {
    for (const rule of node.rules ?? []) {
      if (rule.when_choice !== choiceLabel) continue;
      for (const action of rule.actions ?? []) {
        if (action.type !== "goto_question") continue;
        const targetSlug = String((action.payload ?? {}).pathway_slug || "");
        const targetCode = String((action.payload ?? {}).target_node_code || "");
        if (targetSlug && targetSlug !== pathwaySlug && targetCode) {
          setTriggerBanner({
            message: `This answer continues in another pathway (question ${targetCode}).`,
            slug: targetSlug,
            targetCode,
          });
        }
      }
    }
  }
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEvidenceFile, setSelectedEvidenceFile] = useState<File | null>(null);
  const [evidenceDescription, setEvidenceDescription] = useState("");

  const answersMap = useMemo(() => {
    const m = new Map<string, { choice_id: string | null; choice_label: string | null; notes: string }>();
    snapshot?.answers.forEach((a) => {
      m.set(a.node_id, {
        choice_id: a.choice_id,
        choice_label: a.choice_label,
        notes: a.notes,
      });
    });
    return m;
  }, [snapshot]);

  // Determine if a node should be visible (sub-questions only show when parent answered "No")
  const isSubQuestionVisible = useMemo(() => {
    return (node: Node): boolean => {
      if (!node.parent_node_code) return true; // main question — always visible
      if (!definition) return false;
      for (const section of definition.sections) {
        const parentNode = section.nodes.find((n) => n.code === node.parent_node_code);
        if (parentNode) {
          const parentAnswer = answersMap.get(parentNode.id);
          return parentAnswer?.choice_label === "No";
        }
      }
      return false;
    };
  }, [definition, answersMap]);

  // Nodes skipped by "goto_question" rules: when a question is answered with a
  // choice whose rule says "go to question X", every question between it and X
  // is skipped (hidden and not required).
  const skippedNodeIds = useMemo(() => {
    const skipped = new Set<string>();
    if (!definition) return skipped;
    const flat: Node[] = definition.sections.flatMap((s) => s.nodes);
    const indexByCode = new Map(flat.map((n, i) => [n.code, i] as const));
    flat.forEach((node, i) => {
      const answer = answersMap.get(node.id)?.choice_label;
      if (!answer) return;
      for (const rule of node.rules ?? []) {
        if (rule.when_choice !== answer) continue;
        for (const action of rule.actions ?? []) {
          if (action.type !== "goto_question") continue;
          const targetCode = String((action.payload ?? {}).target_node_code || "");
          const j = indexByCode.get(targetCode);
          if (j === undefined || j <= i + 1) continue;
          for (let k = i + 1; k < j; k++) skipped.add(flat[k].id);
        }
      }
    });
    return skipped;
  }, [definition, answersMap]);

  const isNodeVisible = useMemo(() => {
    return (node: Node): boolean =>
      !skippedNodeIds.has(node.id) && isSubQuestionVisible(node);
  }, [skippedNodeIds, isSubQuestionVisible]);

  async function refreshAll(currentCaseId: string) {
    setIsLoading(true);
    try {
      const [def, caseMeta, snap, state, evidenceList, issues] = await Promise.all([
        getPathway(pathwaySlug),
        getCase(currentCaseId),
        getCasePathwaySnapshot(currentCaseId, pathwaySlug),
        getCaseState(currentCaseId),
        listEvidence(currentCaseId),
        listPathwayValidationIssues(currentCaseId, pathwaySlug),
      ]);
      setDefinition(def);
      setCaseRecord(caseMeta);
      setSnapshot(snap);
      setCaseState(state);
      setEvidence(evidenceList);
      setValidationIssues(issues);

      if (!tab && def.sections.length > 0) setTab(def.sections[0].slug);
      if (Object.keys(indexByTab).length === 0) {
        const init: Record<string, number> = {};
        def.sections.forEach((s) => { init[s.slug] = 0; });
        setIndexByTab(init);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (!caseId) return;
    void refreshAll(caseId).catch((e: Error) => setError(e.message));
  }, [caseId, pathwaySlug]);

  useEffect(() => {
    // Ensure each pathway opens on its first section (e.g., Neglect -> Interviews)
    // instead of carrying over the previously selected tab.
    setTab("");
    setIndexByTab({});
  }, [pathwaySlug, caseId]);

  const generalFailureDetected = useMemo(() => {
    if (pathwaySlug !== "general-cep" || !definition) return false;
    const triggerCodes = ["gen_obs_1", "gen_obs_2", "gen_rec_1", "gen_rec_2"];
    return triggerCodes.some((code) => {
      for (const section of definition.sections) {
        const node = section.nodes.find((n) => n.code === code);
        if (!node) continue;
        const answer = answersMap.get(node.id);
        if (answer?.choice_label === "No") return true;
      }
      return false;
    });
  }, [pathwaySlug, definition, answersMap]);

  const neglectCareFailureConfirmed = useMemo(() => {
    if (pathwaySlug !== "neglect-cep" || !definition) return false;
    for (const section of definition.sections) {
      const node = section.nodes.find((n) => n.code === "neg_int_1");
      if (!node) continue;
      const answer = answersMap.get(node.id);
      return answer?.choice_label === "Yes";
    }
    return false;
  }, [pathwaySlug, definition, answersMap]);

  const neglectReportingFailure = useMemo(() => {
    if (pathwaySlug !== "neglect-cep" || !definition) return false;
    for (const section of definition.sections) {
      const node = section.nodes.find((n) => n.code === "neg_rec_1");
      if (!node) continue;
      const answer = answersMap.get(node.id);
      return answer?.choice_label === "No";
    }
    return false;
  }, [pathwaySlug, definition, answersMap]);

  const infectionFailureDetected = useMemo(() => {
    if (pathwaySlug !== "infection-control-cep" || !definition) return false;
    const triggerCodes = ["inf_prev_1", "inf_mon_1", "inf_ord_1"];
    return triggerCodes.some((code) => {
      for (const section of definition.sections) {
        const node = section.nodes.find((n) => n.code === code);
        if (!node) continue;
        const answer = answersMap.get(node.id);
        if (answer?.choice_label === "No") return true;
      }
      return false;
    });
  }, [pathwaySlug, definition, answersMap]);

  const configuredSectionVisibility = useMemo(() => {
    if (!definition) return null;
    const showRuleMap = new Map<string, Array<{ nodeId: string; whenChoice: string }>>();
    for (const section of definition.sections) {
      for (const node of section.nodes) {
        for (const rule of node.rules || []) {
          for (const action of rule.actions || []) {
            if (action.type !== "show_section") continue;
            const targetSlug = String((action.payload || {}).section_slug || "");
            if (!targetSlug) continue;
            const current = showRuleMap.get(targetSlug) || [];
            current.push({ nodeId: node.id, whenChoice: rule.when_choice });
            showRuleMap.set(targetSlug, current);
          }
        }
      }
    }
    if (showRuleMap.size === 0) return null;
    const visibility = new Map<string, boolean>();
    for (const section of definition.sections) {
      visibility.set(section.slug, !showRuleMap.has(section.slug));
    }
    for (const [sectionSlug, conditions] of showRuleMap.entries()) {
      const matched = conditions.some((cond) => answersMap.get(cond.nodeId)?.choice_label === cond.whenChoice);
      visibility.set(sectionSlug, matched);
    }
    return visibility;
  }, [definition, answersMap]);

  const visibleSections = useMemo(() => {
    if (!definition) return [];
    if (configuredSectionVisibility) {
      return definition.sections.filter((s) => configuredSectionVisibility.get(s.slug) === true);
    }
    if (pathwaySlug === "general-cep") {
      return definition.sections.filter((s) => (s.slug === "harm" ? generalFailureDetected : true));
    }
    if (pathwaySlug === "neglect-cep") {
      return definition.sections.filter((s) => {
        if (s.slug === "records") return neglectCareFailureConfirmed;
        if (s.slug === "investigator") return neglectReportingFailure || neglectCareFailureConfirmed;
        return true;
      });
    }
    if (pathwaySlug === "infection-control-cep") {
      return definition.sections.filter((s) => (s.slug === "harm" ? infectionFailureDetected : true));
    }
    return definition.sections;
  }, [
    definition,
    configuredSectionVisibility,
    pathwaySlug,
    generalFailureDetected,
    neglectCareFailureConfirmed,
    neglectReportingFailure,
    infectionFailureDetected,
  ]);

  useEffect(() => {
    if (!visibleSections.length) return;
    if (!tab || !visibleSections.some((s) => s.slug === tab)) {
      setTab(visibleSections[0].slug);
    }
  }, [visibleSections, tab]);

  if (!caseId) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center">
        <p className="text-sm font-medium text-foreground mb-1">{title}</p>
        <p className="text-sm text-muted-foreground">Create a survey from the Dashboard first.</p>
      </div>
    );
  }

  const activeSection = visibleSections.find((s) => s.slug === tab) || visibleSections[0];
  const activeIndex = activeSection ? indexByTab[activeSection.slug] || 0 : 0;
  const activeNode: Node | undefined = activeSection?.nodes[activeIndex];
  const existingAnswer = activeNode ? answersMap.get(activeNode.id) : undefined;
  const noteValue = activeNode ? notesByNode[activeNode.id] ?? existingAnswer?.notes ?? "" : "";
  const evidenceValue = activeNode ? evidenceRefByNode[activeNode.id] ?? "" : "";

  const decisionSection = definition?.sections.find((s) => s.slug === "decisions");
  const decisionTrail = (decisionSection?.nodes || [])
    .map((node, idx) => {
      const answer = answersMap.get(node.id);
      if (!answer?.choice_label) return null;
      return `#${idx + 1}: ${answer.choice_label}`;
    })
    .filter(Boolean)
    .join(" · ");

  const requiredNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const section of visibleSections) {
      for (const node of section.nodes) {
        if (isNodeVisible(node)) ids.add(node.id);
      }
    }
    return ids;
  }, [visibleSections, isNodeVisible]);

  const totalNodeCount = requiredNodeIds.size;
  const answeredNodeCount = Array.from(requiredNodeIds).filter((id) => answersMap.has(id)).length;
  const openPathwayIssues = validationIssues.filter((i) => i.status === "open");
  const canCompletePathway = totalNodeCount > 0 && answeredNodeCount >= totalNodeCount && openPathwayIssues.length === 0;

  async function choose(choiceId: string) {
    if (!activeNode || !caseId) return;
    try {
      setIsSubmitting(true);
      setError(null);
      const next = await submitAnswer(caseId, {
        pathway_slug: pathwaySlug,
        node_id: activeNode.id,
        choice_id: choiceId,
        notes: noteValue,
        evidence_refs: evidenceValue ? { refs: evidenceValue } : {},
      });
      setLastStep(next);
      const chosenLabel = activeNode.choices.find((c) => c.id === choiceId)?.label;
      if (chosenLabel) detectCrossPathwayGoto(activeNode, chosenLabel);
      await refreshAll(caseId);
      await refreshGlobal();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function move(delta: number) {
    if (!activeSection) return;
    setIndexByTab((prev) => {
      const current = prev[activeSection.slug] || 0;
      const next = Math.max(0, Math.min(activeSection.nodes.length - 1, current + delta));
      return { ...prev, [activeSection.slug]: next };
    });
  }

  async function markStatus(status: string) {
    if (!caseId) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await updatePathwayStatus(caseId, pathwaySlug, status);
      await refreshAll(caseId);
      await refreshGlobal();
      showToast(`${title} marked ${formatStatus(status)}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function resolveIssue(issueId: string) {
    if (!caseId) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await resolveValidationIssue(caseId, issueId);
      await refreshAll(caseId);
      await refreshGlobal();
      showToast("Validation issue resolved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function addEvidenceItem() {
    if (!caseId) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await addEvidence(caseId, "Shared evidence item");
      await refreshAll(caseId);
      await refreshGlobal();
      showToast("Evidence added");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function uploadEvidenceFile() {
    if (!caseId || !selectedEvidenceFile) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await uploadEvidence(caseId, selectedEvidenceFile, evidenceDescription);
      setSelectedEvidenceFile(null);
      setEvidenceDescription("");
      await refreshAll(caseId);
      await refreshGlobal();
      showToast("Evidence file uploaded");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const navigate = useNavigate();

  // Determine next pathway route for "Save & Continue"
  const nextRoute = pathwaySlug === "general-cep" ? "/app/neglect"
    : pathwaySlug === "neglect-cep" ? "/app/infection"
    : pathwaySlug === "infection-control-cep" ? "/app/summary"
    : "/app/summary";

  const nextLabel = pathwaySlug === "general-cep" ? "Neglect CEP"
    : pathwaySlug === "neglect-cep" ? "Infection Control"
    : pathwaySlug === "infection-control-cep" ? "Summary"
    : "Summary";

  // Helper: get validation issues for a specific node
  function getNodeIssues(nodeId: string): ValidationIssue[] {
    return openPathwayIssues.filter((i) => i.node_id === nodeId);
  }

  // Section-level progress (only counts visible nodes)
  function getSectionProgress(section: { nodes: Node[] }): { answered: number; total: number } {
    const visibleNodes = section.nodes.filter(isSubQuestionVisible);
    const total = visibleNodes.length;
    const answered = visibleNodes.filter((n) => answersMap.has(n.id)).length;
    return { answered, total };
  }

  // Track which detail panel is expanded (null = none)
  const [expandedTile, setExpandedTile] = useState<string | null>(null);

  // Evidence preview state
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Camera modal state
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Open webcam modal
  function openCamera() {
    setShowCamera(true);
  }

  // Start camera stream when modal opens
  useEffect(() => {
    if (!showCamera) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch {
        if (!cancelled) {
          setError("Camera access denied. Please allow camera permissions and try again.");
          setShowCamera(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [showCamera]);

  // Stop webcam stream
  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  }

  // Capture frame from video and upload
  async function captureAndUpload() {
    if (!videoRef.current || !caseId) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return;
    const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
    closeCamera();
    try {
      setIsSubmitting(true);
      setError(null);
      await uploadEvidence(caseId, file, "Photo capture");
      await refreshAll(caseId);
      await refreshGlobal();
      showToast("Photo captured & uploaded");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  // Save handler (just saves, does not navigate)
  async function saveSurvey() {
    if (!caseId) return;
    try {
      setIsSubmitting(true);
      setError(null);
      await updatePathwayStatus(caseId, pathwaySlug, canCompletePathway ? "completed" : "in_progress");
      await refreshAll(caseId);
      await refreshGlobal();
      showToast(`${title} saved`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }


  const progressPct = totalNodeCount ? Math.round((answeredNodeCount / totalNodeCount) * 100) : 0;

  // Section-specific computed values
  const sectionNodeIds = useMemo(() => {
    if (!activeSection) return new Set<string>();
    return new Set(activeSection.nodes.map((n) => n.id));
  }, [activeSection]);

  const visibleSectionNodes = useMemo(() => {
    return activeSection?.nodes.filter(isNodeVisible) || [];
  }, [activeSection, isNodeVisible]);

  const sectionAnswered = useMemo(() => {
    return visibleSectionNodes.filter((n) => answersMap.has(n.id)).length;
  }, [visibleSectionNodes, answersMap]);

  const sectionTotal = visibleSectionNodes.length;
  const sectionPct = sectionTotal ? Math.round((sectionAnswered / sectionTotal) * 100) : 0;

  // Section navigation helpers (must be after sectionAnswered/sectionTotal)
  const activeSectionIdx = visibleSections.findIndex((s) => s.slug === activeSection?.slug);
  const prevSection = activeSectionIdx > 0 ? visibleSections[activeSectionIdx - 1] : null;
  const nextSection = activeSectionIdx < visibleSections.length - 1 ? visibleSections[activeSectionIdx + 1] : null;
  const currentSectionComplete = sectionAnswered === sectionTotal && sectionTotal > 0;
  const canGoNext = currentSectionComplete && !!nextSection;

  // Main question nodes for numbering (excludes sub-questions)
  const activeSectionMainNodes = useMemo(() => {
    return activeSection?.nodes.filter((n) => !n.parent_node_code) || [];
  }, [activeSection]);

  // Section-specific validation issues (filter by node_id belonging to active section)
  const sectionIssues = useMemo(() => {
    return openPathwayIssues.filter((i) => i.node_id && sectionNodeIds.has(i.node_id));
  }, [openPathwayIssues, sectionNodeIds]);

  // Issues not tied to a specific section (node_id is null) — pathway-level
  const pathwayLevelIssues = useMemo(() => {
    return openPathwayIssues.filter((i) => !i.node_id);
  }, [openPathwayIssues]);

  return (
    <div className="space-y-4">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[26px] font-bold text-foreground tracking-tight">{title}</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {caseRecord?.external_case_id || "—"} · {caseRecord?.facility_name || "—"}
          </p>
        </div>
        <Button onClick={saveSurvey} disabled={isSubmitting} className="h-10 px-6">
          {isSubmitting ? "Saving…" : "Save"}
        </Button>
      </div>

      {/* ── Compact KPI Bar (section-specific) ── */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm">
        {/* Top row: section progress + clickable counters */}
        <div className="px-5 py-3 flex items-center gap-6">
          {/* Section progress */}
          <div className="flex items-center gap-3 flex-1">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
                  {activeSection?.title || "Section"}
                </span>
                <span className="text-xs font-semibold text-foreground">{sectionAnswered}/{sectionTotal} ({sectionPct}%)</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#0077b6] to-[#009eda] rounded-full transition-all duration-500" style={{ width: `${sectionPct}%` }} />
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="h-8 w-px bg-gray-200" />

          {/* Section issues (node-specific) */}
          <button
            onClick={() => setExpandedTile(expandedTile === "validation" ? null : "validation")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              expandedTile === "validation" ? "bg-red-50" : "hover:bg-gray-50"
            }`}
            title="Section-specific validation issues"
          >
            <span className={`text-lg font-bold ${sectionIssues.length > 0 ? "text-red-600" : "text-gray-400"}`}>
              {sectionIssues.length}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">Issues</span>
          </button>

          <div className="h-8 w-px bg-gray-200" />

          {/* Survey-wide: alerts */}
          <button
            onClick={() => setExpandedTile(expandedTile === "attention" ? null : "attention")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              expandedTile === "attention" ? "bg-amber-50" : "hover:bg-gray-50"
            }`}
            title="Survey-wide alerts"
          >
            <span className={`text-lg font-bold ${(caseState?.flags.length || 0) > 0 ? "text-amber-600" : "text-gray-400"}`}>
              {caseState?.flags.length || 0}
            </span>
            <span className="text-[11px] text-muted-foreground font-medium">Survey Alerts</span>
          </button>

          {/* Survey-wide: evidence */}
          <button
            onClick={() => setExpandedTile(expandedTile === "evidence" ? null : "evidence")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
              expandedTile === "evidence" ? "bg-blue-50" : "hover:bg-gray-50"
            }`}
            title="Survey-wide evidence library"
          >
            <span className="text-lg font-bold text-[#0077b6]">{evidence.length}</span>
            <span className="text-[11px] text-muted-foreground font-medium">Evidence</span>
          </button>
        </div>

        {/* Expandable detail panels */}
        {expandedTile === "attention" && (caseState?.flags.length || 0) > 0 && (
          <div className="border-t border-gray-100 px-5 py-3 bg-amber-50/50 space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold mb-1">Survey-Wide Alerts</p>
            {caseState?.flags.map((flag, idx) => (
              <p key={`${flag}-${idx}`} className="text-xs text-amber-700">{toUserFriendlyFlagMessage(flag)}</p>
            ))}
          </div>
        )}

        {expandedTile === "validation" && (sectionIssues.length > 0 || pathwayLevelIssues.length > 0) && (
          <div className="border-t border-gray-100 px-5 py-3 bg-red-50/50 space-y-2">
            {sectionIssues.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-red-600 font-semibold">Issues in {activeSection?.title}</p>
                {sectionIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between gap-3">
                    <p className="text-xs text-red-700">{toUserFriendlyIssueMessage(issue.message)}</p>
                    <Button size="sm" variant="outline" className="shrink-0 h-6 text-[11px] border-red-200 text-red-700 hover:bg-red-100" onClick={() => resolveIssue(issue.id)} disabled={isSubmitting}>
                      Resolve
                    </Button>
                  </div>
                ))}
              </>
            )}
            {pathwayLevelIssues.length > 0 && (
              <>
                <p className="text-[10px] uppercase tracking-wider text-red-600 font-semibold mt-2">Pathway-Level Issues</p>
                {pathwayLevelIssues.map((issue) => (
                  <div key={issue.id} className="flex items-center justify-between gap-3">
                    <p className="text-xs text-red-700">{toUserFriendlyIssueMessage(issue.message)}</p>
                    <Button size="sm" variant="outline" className="shrink-0 h-6 text-[11px] border-red-200 text-red-700 hover:bg-red-100" onClick={() => resolveIssue(issue.id)} disabled={isSubmitting}>
                      Resolve
                    </Button>
                  </div>
                ))}
              </>
            )}
            {sectionIssues.length === 0 && pathwayLevelIssues.length === 0 && (
              <p className="text-xs text-muted-foreground">No issues in this section.</p>
            )}
          </div>
        )}

        {expandedTile === "evidence" && (
          <div className="border-t border-gray-100 px-5 py-3 bg-blue-50/30 space-y-3">
            {/* Upload row */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                Upload File
                <input type="file" className="hidden" onChange={(e) => setSelectedEvidenceFile(e.target.files?.[0] || null)} disabled={isSubmitting} />
              </label>
              <button
                type="button"
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-50 transition disabled:opacity-50"
                onClick={openCamera}
                disabled={isSubmitting}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Take Photo
              </button>
              {selectedEvidenceFile && (
                <>
                  <span className="text-xs text-muted-foreground truncate max-w-[140px]">{selectedEvidenceFile.name}</span>
                  <Input value={evidenceDescription} onChange={(e) => setEvidenceDescription(e.target.value)} placeholder="Description" disabled={isSubmitting} className="h-7 text-xs max-w-[160px]" />
                  <Button size="sm" className="h-7 text-xs" onClick={uploadEvidenceFile} disabled={isSubmitting}>Upload</Button>
                </>
              )}
            </div>

            {/* Evidence list */}
            {evidence.length > 0 && (
              <div className="space-y-1.5">
                {evidence.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-lg bg-white border border-gray-200 px-3 py-2">
                    <span className="w-6 h-6 rounded bg-[#0077b6]/10 text-[#0077b6] flex items-center justify-center text-[10px] font-bold shrink-0">E</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{e.label}</p>
                      {e.description && <p className="text-[10px] text-muted-foreground truncate">{e.description}</p>}
                    </div>
                    {e.file_url && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setPreviewUrl(`${API_BASE}${e.file_url}`)} className="text-[11px] text-[#0077b6] hover:underline font-medium">Preview</button>
                        <span className="text-gray-300">·</span>
                        <a href={`${API_BASE}${e.file_url}`} download className="text-[11px] text-[#0077b6] hover:underline font-medium">Download</a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Evidence Preview Modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPreviewUrl(null)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl max-h-[80vh] overflow-auto p-6" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-foreground">Evidence Preview</p>
              <button onClick={() => setPreviewUrl(null)} className="text-gray-400 hover:text-gray-700 text-lg">&times;</button>
            </div>
            <img src={previewUrl} alt="Evidence" className="max-w-full rounded-lg border" onError={() => { setPreviewUrl(null); window.open(previewUrl, "_blank"); }} />
            <div className="mt-3 flex justify-end">
              <a href={previewUrl} download className="text-sm text-[#0077b6] hover:underline font-medium">Download File</a>
            </div>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={closeCamera}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={(ev) => ev.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-foreground">Take Photo</p>
              <button onClick={closeCamera} className="text-gray-400 hover:text-gray-700 text-lg">&times;</button>
            </div>
            <div className="relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-video object-cover"
                onLoadedMetadata={(e) => (e.target as HTMLVideoElement).play()}
              />
            </div>
            <div className="flex items-center justify-center gap-4 px-5 py-4">
              <button
                onClick={captureAndUpload}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-[#0077b6] text-white text-sm font-medium hover:bg-[#005f8f] transition disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                {isSubmitting ? "Uploading..." : "Capture"}
              </button>
              <button
                onClick={closeCamera}
                className="px-5 py-2 rounded-full border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Section Navigation (Previous → Title → Next) ── */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm">
        <div className="flex items-center justify-between px-5 py-3">
          {/* Previous button */}
          <button
            onClick={() => prevSection && setTab(prevSection.slug)}
            disabled={!prevSection}
            className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors min-w-[140px] ${
              prevSection
                ? "text-[#0077b6] hover:text-[#005f8a] cursor-pointer"
                : "text-gray-300 cursor-not-allowed"
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {prevSection ? prevSection.title : "Previous"}
          </button>

          {/* Current section title */}
          <span className="text-[15px] font-semibold text-foreground">{activeSection?.title}</span>

          {/* Next button — if on last section, go to next pathway page */}
          {nextSection ? (
            <button
              onClick={() => canGoNext && setTab(nextSection.slug)}
              disabled={!canGoNext}
              className={`flex items-center gap-1.5 text-[13px] font-medium transition-colors min-w-[140px] justify-end ${
                canGoNext
                  ? "text-[#0077b6] hover:text-[#005f8a] cursor-pointer"
                  : "text-gray-300 cursor-not-allowed"
              }`}
              title={!currentSectionComplete ? "Complete all questions in this section to proceed" : ""}
            >
              {nextSection.title}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => { if (currentSectionComplete) { void saveSurvey().then(() => navigate(nextRoute)); } }}
              disabled={!currentSectionComplete}
              className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors min-w-[140px] justify-end ${
                currentSectionComplete
                  ? "text-white bg-[#0077b6] hover:bg-[#005f8a] px-4 py-2 rounded-lg cursor-pointer"
                  : "text-gray-300 cursor-not-allowed"
              }`}
              title={!currentSectionComplete ? "Complete all questions to proceed" : ""}
            >
              {nextLabel}
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {(isLoading || isSubmitting) && (
        <p className="text-xs text-muted-foreground">Syncing…</p>
      )}

      {/* ── Triggered-CEP banner (answer fired a recommend_pathway rule) ── */}
      {triggerBanner && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-purple-800">Another CEP triggered</p>
            <p className="text-[12px] text-purple-700 mt-0.5">{triggerBanner.message}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {triggerBanner.slug && (
              <Button
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white text-[12px]"
                onClick={() => {
                  setPopup({ slug: triggerBanner.slug!, targetCode: triggerBanner.targetCode });
                  setTriggerBanner(null);
                }}
              >
                Open now
              </Button>
            )}
            <Button size="sm" variant="ghost" className="text-[12px]" onClick={() => setTriggerBanner(null)}>
              Later
            </Button>
          </div>
        </div>
      )}

      {/* Pop-up runner for the triggered CEP — returns here when done */}
      {popup && caseId && (
        <PathwayTriggerModal
          caseId={caseId}
          initialSlug={popup.slug}
          highlightCode={popup.targetCode}
          onClose={() => {
            setPopup(null);
            void refreshAll(caseId);
            void refreshGlobal();
          }}
        />
      )}

      {/* ── ALL Questions for Active Section ── */}
      {activeSection && (
        <div className="space-y-3">
          {activeSection.nodes.map((node) => {
            // Hide sub-questions when parent not answered "No",
            // and questions skipped by a goto_question rule
            const isSubQuestion = !!node.parent_node_code;
            if (!isNodeVisible(node)) return null;

            const answer = answersMap.get(node.id);
            const nodeNoteValue = notesByNode[node.id] ?? answer?.notes ?? "";
            const nodeEvidenceValue = evidenceRefByNode[node.id] ?? "";
            const nodeIssues = getNodeIssues(node.id);
            const isAnswered = !!answer?.choice_label;
            const hasBranching = !!(node.rules?.length && node.rules.some((r) => (r.actions || []).some((a) => a.type === "show_section")));
            // Has sub-questions that could appear (main Q with "No" branch)
            const hasSubQuestions = !isSubQuestion && activeSection.nodes.some((n) => n.parent_node_code === node.code);

            // Compute display label (1, 2, 3 for main; 1a, 1b for sub)
            let displayLabel: string;
            if (isSubQuestion) {
              const parentIdx = activeSectionMainNodes.findIndex((n) => n.code === node.parent_node_code);
              const subNodes = activeSection.nodes.filter((n) => n.parent_node_code === node.parent_node_code);
              const subIdx = subNodes.indexOf(node);
              displayLabel = `${parentIdx + 1}${"abcdefgh"[subIdx] || ""}`;
            } else {
              const mainIdx = activeSectionMainNodes.indexOf(node);
              displayLabel = `${mainIdx + 1}`;
            }

            return (
              <div
                key={node.id}
                className={`${isSubQuestion ? "ml-8" : ""} bg-white rounded-xl border shadow-sm transition-all ${
                  isSubQuestion ? "border-l-4 border-l-[#0077b6]/30" : ""
                } ${
                  nodeIssues.length > 0
                    ? "border-red-300"
                    : isAnswered
                      ? "border-gray-200/60"
                      : "border-gray-200"
                }`}
              >
                <div className="px-5 py-4 space-y-3">
                  {/* Question row */}
                  <div className="flex items-start gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
                      isAnswered
                        ? "bg-emerald-100 text-emerald-700"
                        : isSubQuestion
                          ? "bg-blue-50 text-blue-500"
                          : "bg-gray-100 text-gray-500"
                    }`}>
                      {isAnswered ? "✓" : displayLabel}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {isSubQuestion && (
                            <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-200 font-medium mb-1.5">
                              Follow-up
                            </span>
                          )}
                          <p className={`text-[13px] font-medium leading-relaxed ${isSubQuestion ? "text-gray-700" : "text-foreground"}`}>{node.prompt}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {hasBranching && (
                            <span className="w-5 h-5 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-[10px]" title="This question controls section visibility">⑂</span>
                          )}
                          {hasSubQuestions && (
                            <span className="w-5 h-5 rounded bg-amber-100 text-amber-600 flex items-center justify-center text-[10px]" title="Answering No reveals follow-up questions">⑂</span>
                          )}
                          {isAnswered && (
                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                              {answer?.choice_label}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Answer choices inline */}
                      <div className="flex flex-wrap gap-2 mt-2.5">
                        {node.choices.map((c) => (
                          <button
                            key={c.id}
                            onClick={() => {
                              if (!caseId) return;
                              setIsSubmitting(true);
                              setError(null);
                              void submitAnswer(caseId, {
                                pathway_slug: pathwaySlug,
                                node_id: node.id,
                                choice_id: c.id,
                                notes: notesByNode[node.id] ?? answer?.notes ?? "",
                                evidence_refs: evidenceRefByNode[node.id] ? { refs: evidenceRefByNode[node.id] } : {},
                              })
                                .then(async (next) => {
                                  setLastStep(next);
                                  detectCrossPathwayGoto(node, c.label);
                                  await refreshAll(caseId);
                                  await refreshGlobal();
                                })
                                .catch((e: Error) => setError(e.message))
                                .finally(() => setIsSubmitting(false));
                            }}
                            disabled={isSubmitting}
                            className={`px-4 py-1.5 rounded-lg border text-[13px] font-medium transition-all ${
                              answer?.choice_id === c.id
                                ? "bg-[#0077b6] text-white border-[#0077b6]"
                                : "bg-white border-gray-200 text-gray-600 hover:border-[#0077b6] hover:text-[#0077b6]"
                            }`}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>

                      {/* Compact notes + evidence */}
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <textarea
                          value={nodeNoteValue}
                          onChange={(e) => setNotesByNode((prev) => ({ ...prev, [node.id]: e.target.value }))}
                          placeholder="Surveyor notes…"
                          className="w-full min-h-[48px] rounded-lg border border-gray-200 bg-gray-50/50 px-3 py-2 text-xs placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0077b6] resize-none"
                        />
                        <Input
                          value={nodeEvidenceValue}
                          onChange={(e) => setEvidenceRefByNode((prev) => ({ ...prev, [node.id]: e.target.value }))}
                          placeholder="Evidence refs (e.g. EVID-01)"
                          className="h-[48px] text-xs bg-gray-50/50"
                        />
                      </div>

                      {/* Per-question validation */}
                      {nodeIssues.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {nodeIssues.map((issue) => (
                            <div key={issue.id} className="flex items-center justify-between gap-3 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5">
                              <p className="text-[11px] text-red-700 font-medium">{toUserFriendlyIssueMessage(issue.message)}</p>
                              <Button size="sm" variant="outline" className="shrink-0 h-6 text-[10px] border-red-200 text-red-700 hover:bg-red-100" onClick={() => resolveIssue(issue.id)} disabled={isSubmitting}>
                                Resolve
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Decision Trail ── */}
      {activeSection?.slug === "decisions" && decisionTrail && (
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-muted-foreground mb-1">Decision Trail</p>
          <p className="text-sm text-foreground">{decisionTrail}</p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function Summary({ caseId }: { caseId: string | null }) {
  const navigate = useNavigate();
  const [state, setState] = useState<CaseState | null>(null);
  const [summary, setSummary] = useState<FindingsSummary | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [casePathways, setCasePathways] = useState<CasePathwayItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    setIsLoading(true);
    void Promise.all([getCaseState(caseId), getFindingsSummary(caseId), listEvidence(caseId), getCaseEvents(caseId), getCasePathways(caseId)])
      .then(([s, fs, ev, logs, cps]) => {
        setState(s);
        setSummary(fs);
        setEvidence(ev);
        setEvents(logs);
        setCasePathways(cps);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [caseId]);

  if (!caseId) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center">
        <p className="text-sm font-medium text-foreground mb-1">Findings Summary</p>
        <p className="text-sm text-muted-foreground">Create a survey from the Dashboard first.</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate("/app/dashboard")}>Go to Dashboard</Button>
      </div>
    );
  }

  const recommendations = events
    .filter((e) => e.event_type === "recommendation_generated")
    .map((e) => String(e.payload.message || "Recommendation generated"));
  const latestEvent = events[0];
  const citationMix = useMemo(() => {
    const out: Record<string, number> = {};
    for (const c of summary?.citations || []) {
      out[c.tag] = (out[c.tag] || 0) + 1;
    }
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  }, [summary]);
  const citationTotal = Math.max(1, summary?.total_citations || 0);
  const generalPct = Math.round(((summary?.general_citations || 0) / citationTotal) * 100);
  const neglectPct = Math.round(((summary?.neglect_citations || 0) / citationTotal) * 100);
  const flagCount = state?.flags.length || 0;
  const recommendationCount = recommendations.length;

  async function generateReport() {
    if (!caseId) return;
    try {
      const blob = await downloadCaseReportPdf(caseId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cms-2567-${caseId.slice(0, 8)}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  // Pathway section status tiles — driven by the survey's chosen pathways
  const tileColors = ["blue", "amber", "purple", "blue", "amber", "purple"] as const;
  const citationByPathway: Record<string, number> = {
    "general-cep": summary?.general_citations || 0,
    "neglect-cep": summary?.neglect_citations || 0,
  };
  const sectionStatuses = casePathways.map((p, i) => ({
    label: p.title,
    status: p.status || "pending",
    citations: citationByPathway[p.slug] ?? 0,
    color: tileColors[i % tileColors.length],
  }));

  const statusColors = {
    completed: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", badge: "bg-emerald-100 text-emerald-800", icon: "✓" },
    in_progress: { bg: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", badge: "bg-blue-100 text-blue-800", icon: "⟳" },
    pending: { bg: "bg-gray-50", border: "border-gray-200", text: "text-gray-500", badge: "bg-gray-100 text-gray-600", icon: "○" },
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-[26px] font-bold text-foreground tracking-tight">Findings Summary</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">{summary?.facility || "—"}</p>
        </div>
        <Button size="sm" onClick={generateReport} className="h-10 px-5 bg-[#0077b6] hover:bg-[#005f8a]">
          Generate 2567
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading summary…</p>}

      {/* ── Section Statuses + Critical Indicators (side by side) ── */}
      <div className="grid grid-cols-2 gap-4">
        {/* Left: All section statuses in one tile */}
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-5">
          <p className="text-[13px] font-bold text-foreground mb-4">Section Status</p>
          <div className="space-y-3">
            {sectionStatuses.map((sec) => {
              const s = statusColors[sec.status as keyof typeof statusColors] || statusColors.pending;
              return (
                <div key={sec.label} className={`flex items-center justify-between ${s.bg} ${s.border} border rounded-lg px-4 py-3`}>
                  <div className="flex items-center gap-3">
                    <span className="text-[16px]">{s.icon}</span>
                    <p className={`text-[13px] font-semibold ${s.text}`}>{sec.label}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sec.citations > 0 && (
                      <span className="text-[11px] font-medium text-muted-foreground">{sec.citations} citation{sec.citations !== 1 ? "s" : ""}</span>
                    )}
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${s.badge}`}>
                      {formatStatus(sec.status)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: 2x2 KPI grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-xl border-2 p-4 text-center flex flex-col justify-center ${flagCount > 0 ? "border-red-300 bg-red-50" : "border-gray-200 bg-white"}`}>
            <p className={`text-[28px] font-extrabold ${flagCount > 0 ? "text-red-600" : "text-gray-300"}`}>{flagCount}</p>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Critical Flags</p>
            {flagCount > 0 && <p className="text-[10px] text-red-500 font-semibold mt-1">⚠ Requires Attention</p>}
          </div>
          <div className={`rounded-xl border-2 p-4 text-center flex flex-col justify-center ${(summary?.total_citations || 0) > 0 ? "border-amber-300 bg-amber-50" : "border-gray-200 bg-white"}`}>
            <p className={`text-[28px] font-extrabold ${(summary?.total_citations || 0) > 0 ? "text-amber-600" : "text-gray-300"}`}>{summary?.total_citations || 0}</p>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Total Citations</p>
          </div>
          <div className="rounded-xl border-2 border-gray-200 bg-white p-4 text-center flex flex-col justify-center">
            <p className="text-[28px] font-extrabold text-[#0077b6]">{evidence.length}</p>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Evidence Items</p>
          </div>
          <div className={`rounded-xl border-2 p-4 text-center flex flex-col justify-center ${recommendationCount > 0 ? "border-indigo-300 bg-indigo-50" : "border-gray-200 bg-white"}`}>
            <p className={`text-[28px] font-extrabold ${recommendationCount > 0 ? "text-indigo-600" : "text-gray-300"}`}>{recommendationCount}</p>
            <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mt-1">Recommendations</p>
          </div>
        </div>
      </div>

      {/* ── Compliance Scorecard ── */}
      {(() => {
        /* F-Tag category mapping */
        const FTAG_CATEGORIES: Record<string, { category: string; group: string }> = {
          F684: { category: "Quality of Care", group: "Quality of Care & Treatment" },
          F685: { category: "Quality of Care", group: "Quality of Care & Treatment" },
          F686: { category: "Quality of Care", group: "Quality of Care & Treatment" },
          F600: { category: "Abuse & Neglect", group: "Resident Rights & Safety" },
          F602: { category: "Abuse & Neglect", group: "Resident Rights & Safety" },
          F606: { category: "Abuse & Neglect", group: "Resident Rights & Safety" },
          F609: { category: "Abuse & Neglect", group: "Resident Rights & Safety" },
          F943: { category: "Infection Control", group: "Infection Prevention & Control" },
          F880: { category: "Infection Control", group: "Infection Prevention & Control" },
          F867: { category: "QAPI", group: "Administration & Compliance" },
          F725: { category: "Staffing", group: "Administration & Compliance" },
        };

        const totalAreasChecked = 12; /* total regulatory categories assessed */
        const citationsByCategory: Record<string, { count: number; tags: string[]; severity: string }> = {};
        for (const c of summary?.citations || []) {
          const cat = FTAG_CATEGORIES[c.tag]?.category || "Other";
          if (!citationsByCategory[cat]) citationsByCategory[cat] = { count: 0, tags: [], severity: "low" };
          citationsByCategory[cat].count += 1;
          if (!citationsByCategory[cat].tags.includes(c.tag)) citationsByCategory[cat].tags.push(c.tag);
          if (c.scope_severity?.toLowerCase().includes("immediate")) citationsByCategory[cat].severity = "critical";
          else if (c.scope_severity?.toLowerCase().includes("actual harm") || c.scope_severity?.toLowerCase().includes("pattern")) citationsByCategory[cat].severity = "high";
          else if (citationsByCategory[cat].severity === "low") citationsByCategory[cat].severity = "medium";
        }

        /* Scored regulatory categories */
        const allCategories = [
          { name: "Quality of Care", group: "Quality of Care & Treatment", maxScore: 25 },
          { name: "Abuse & Neglect", group: "Resident Rights & Safety", maxScore: 20 },
          { name: "Infection Control", group: "Infection Prevention & Control", maxScore: 15 },
          { name: "Resident Rights", group: "Resident Rights & Safety", maxScore: 15 },
          { name: "QAPI", group: "Administration & Compliance", maxScore: 10 },
          { name: "Staffing", group: "Administration & Compliance", maxScore: 15 },
        ];

        const scoredCategories = allCategories.map((cat) => {
          const cited = citationsByCategory[cat.name];
          const deduction = cited ? Math.min(cat.maxScore, cited.count * 8) : 0;
          const score = cat.maxScore - deduction;
          const pct = Math.round((score / cat.maxScore) * 100);
          return { ...cat, score, pct, cited: cited || null };
        });

        const totalMax = allCategories.reduce((s, c) => s + c.maxScore, 0);
        const totalScore = scoredCategories.reduce((s, c) => s + c.score, 0);
        const overallPct = Math.round((totalScore / totalMax) * 100);
        const riskLevel = overallPct >= 85 ? "Low Risk" : overallPct >= 65 ? "Moderate Risk" : "High Risk";
        const riskColor = overallPct >= 85 ? "emerald" : overallPct >= 65 ? "amber" : "red";

        return (
          <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30">
              <p className="text-[14px] font-bold text-foreground">Compliance Scorecard</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Readiness assessment across CMS regulatory categories</p>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-3 gap-6">
                {/* Overall Score — ring gauge */}
                <div className="flex flex-col items-center justify-center">
                  <div className="relative w-[140px] h-[140px]">
                    <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                      <circle cx="60" cy="60" r="50" fill="none" stroke="#f0f0f0" strokeWidth="10" />
                      <circle cx="60" cy="60" r="50" fill="none"
                        stroke={riskColor === "emerald" ? "#10b981" : riskColor === "amber" ? "#f59e0b" : "#ef4444"}
                        strokeWidth="10" strokeLinecap="round"
                        strokeDasharray={`${overallPct * 3.14} ${314 - overallPct * 3.14}`}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-[32px] font-extrabold ${riskColor === "emerald" ? "text-emerald-600" : riskColor === "amber" ? "text-amber-600" : "text-red-600"}`}>{overallPct}</span>
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">out of 100</span>
                    </div>
                  </div>
                  <div className="mt-3 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                      riskColor === "emerald" ? "bg-emerald-100 text-emerald-800"
                      : riskColor === "amber" ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                    }`}>{riskLevel}</span>
                    <p className="text-[11px] text-muted-foreground mt-1.5">{totalScore}/{totalMax} points</p>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="col-span-2 space-y-3">
                  {scoredCategories.map((cat) => {
                    const barColor = cat.pct >= 80 ? "bg-emerald-500" : cat.pct >= 50 ? "bg-amber-500" : "bg-red-500";
                    const textColor = cat.pct >= 80 ? "text-emerald-600" : cat.pct >= 50 ? "text-amber-600" : "text-red-600";
                    return (
                      <div key={cat.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-foreground">{cat.name}</span>
                            {cat.cited && (
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                cat.cited.severity === "critical" ? "bg-red-100 text-red-700"
                                : cat.cited.severity === "high" ? "bg-amber-100 text-amber-700"
                                : "bg-gray-100 text-gray-600"
                              }`}>{cat.cited.tags.join(", ")}</span>
                            )}
                          </div>
                          <span className={`text-[12px] font-bold ${textColor}`}>{cat.pct}%</span>
                        </div>
                        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full ${barColor} rounded-full transition-all duration-700`} style={{ width: `${cat.pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Case Overview & F-Tag Summary ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Case Overview */}
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-5 space-y-4">
          <p className="text-[13px] font-bold text-foreground">Case Overview</p>
          <div className="space-y-3">
            {[
              { label: "Facility", value: summary?.facility || "N/A" },
              { label: "Survey Type", value: summary?.survey_type || "N/A" },
              { label: "Survey Dates", value: summary?.survey_dates || "N/A" },
              { label: "Resident Identifier", value: summary?.resident_identifier_anonymized || "N/A" },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                <span className="text-[12px] text-muted-foreground">{label}</span>
                <span className="text-[13px] text-foreground font-semibold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* F-Tag Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm p-5 space-y-4">
          <p className="text-[13px] font-bold text-foreground">F-Tag Breakdown</p>
          {citationMix.length > 0 ? (
            <div className="space-y-2.5">
              {citationMix.map(([tag, count]) => {
                const totalCit = summary?.total_citations || 1;
                const pct = Math.round((count / totalCit) * 100);
                return (
                  <div key={tag}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-semibold text-foreground">{tag}</span>
                      <span className="text-[11px] font-bold text-muted-foreground">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[12px] text-muted-foreground">No citations found — full compliance.</p>
          )}
        </div>
      </div>

      {/* ── Citation Details ── */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <p className="text-[13px] font-bold text-foreground">Citation Details</p>
        </div>
        {summary?.citations.length ? (
          <div className="divide-y divide-gray-100">
            {summary.citations.map((c, idx) => (
              <div key={`${c.tag}-${idx}`} className="px-5 py-4 transition-colors">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-[12px] font-bold mt-0.5">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-gray-100 text-gray-600">{c.tag}</span>
                      <p className="text-[13px] font-semibold text-foreground">{c.title}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="text-[11px]"><span className="text-muted-foreground">Scope & Severity:</span> <span className="font-medium text-foreground">{c.scope_severity}</span></div>
                      <div className="text-[11px]"><span className="text-muted-foreground">Determination:</span> <span className="font-medium text-foreground">{c.rationale}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-muted-foreground">No citations drafted yet.</p>
          </div>
        )}
      </div>

      {/* ── Recommendations ── */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-5">
          <p className="text-[13px] font-bold text-indigo-800 mb-3">Recommendations</p>
          <ul className="space-y-2">
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                <span className="text-[13px] text-indigo-900">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function AuditScreen({ caseId }: { caseId: string | null }) {
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("all");
  const ROWS_PER_PAGE = 10;

  useEffect(() => {
    if (!caseId) return;
    setIsLoading(true);
    void getCaseEvents(caseId)
      .then((rows) => setEvents(rows))
      .catch((e: Error) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [caseId]);

  if (!caseId) {
    return (
      <div className="rounded-lg border border-border bg-white p-8 text-center">
        <p className="text-sm font-medium text-foreground mb-1">Audit Trail</p>
        <p className="text-sm text-muted-foreground">Create or select a survey first.</p>
      </div>
    );
  }

  // Unique event types for filter
  const eventTypes = useMemo(() => {
    const types = new Set(events.map((e) => e.event_type));
    return Array.from(types).sort();
  }, [events]);

  // Filtered events
  const filteredEvents = filterType === "all" ? events : events.filter((e) => e.event_type === filterType);
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / ROWS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageEvents = filteredEvents.slice((safeCurrentPage - 1) * ROWS_PER_PAGE, safeCurrentPage * ROWS_PER_PAGE);

  // Pretty-format event type: "answer_submitted" → "Answer Submitted"
  function formatEventType(t: string) {
    return t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Format pathway slug for display
  function fmtPathway(p: unknown): string {
    return String(p || "").replace(/-/g, " ").replace(/\bcep\b/gi, "CEP").replace(/\b\w/g, c => c.toUpperCase());
  }

  // Build structured display from event
  function renderEvent(eventType: string, payload: Record<string, unknown>) {
    const pathwayTitle = String(payload.pathway_title || fmtPathway(payload.pathway_slug || payload.pathway));

    if (eventType === "answer_submitted") {
      const question = payload.question ? String(payload.question) : "";
      const choice = payload.choice ? String(payload.choice) : "";
      const section = payload.section ? String(payload.section) : "";
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">
            {question || "Question answered"}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
            {choice && <span className="text-[12px] text-gray-500">Response: <span className="font-medium text-gray-700">{choice}</span></span>}
            {section && <span className="text-[12px] text-gray-400">Section: {section}</span>}
            <span className="text-[12px] text-gray-400">Pathway: {pathwayTitle}</span>
          </div>
        </div>
      );
    }

    if (eventType === "pathway_status_changed" || eventType === "pathway_status_updated") {
      const status = String(payload.new_status || payload.status || "updated");
      const statusLabel = status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">{pathwayTitle}</div>
          <span className="text-[12px] text-gray-500">Status changed to <span className="font-medium text-gray-700">{statusLabel}</span></span>
        </div>
      );
    }

    if (eventType === "pathway_completed") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">{pathwayTitle} — Completed</div>
          <span className="text-[12px] text-gray-500">All sections and questions have been answered</span>
        </div>
      );
    }

    if (eventType === "section_completed") {
      const sectionTitle = payload.section_title || payload.section || "";
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">Section Completed: {String(sectionTitle)}</div>
          <span className="text-[12px] text-gray-500">All questions answered in this section — {pathwayTitle}</span>
        </div>
      );
    }

    if (eventType === "flag_added" || eventType === "flag_generated") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">{payload.code ? String(payload.code) : "Flag Raised"}</div>
          {payload.message ? <span className="text-[12px] text-gray-500">{String(payload.message).slice(0, 120)}</span> : null}
        </div>
      );
    }

    if (eventType === "flag_cleared") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">Flag Cleared: {payload.code ? String(payload.code) : ""}</div>
          <span className="text-[12px] text-gray-500">Previously raised flag has been resolved</span>
        </div>
      );
    }

    if (eventType === "citation_generated") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">Citation: {payload.tag ? String(payload.tag) : "Generated"}</div>
          {payload.rationale ? <span className="text-[12px] text-gray-500">{String(payload.rationale).slice(0, 120)}</span> : null}
        </div>
      );
    }

    if (eventType === "recommendation_generated") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">Recommendation</div>
          {payload.message ? <span className="text-[12px] text-gray-500">{String(payload.message).slice(0, 120)}</span> : null}
        </div>
      );
    }

    if (eventType === "evidence_added" || eventType === "evidence_uploaded") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">Evidence Added</div>
          {payload.label ? <span className="text-[12px] text-gray-500">{String(payload.label)}</span> : null}
          {payload.description ? <span className="text-[12px] text-gray-500">{String(payload.description)}</span> : null}
        </div>
      );
    }

    if (eventType === "survey_ready_for_review") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">Survey Ready for Review</div>
          <span className="text-[12px] text-gray-500">All pathways completed — survey is ready for final review</span>
        </div>
      );
    }

    if (eventType === "case_created") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">Survey Case Created</div>
          <span className="text-[12px] text-gray-500">New survey case initialized and pathways configured</span>
        </div>
      );
    }

    if (eventType === "validation_issue_created") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">Validation Issue</div>
          {payload.message ? <span className="text-[12px] text-gray-500">{String(payload.message)}</span> : null}
        </div>
      );
    }

    if (eventType === "validation_issue_resolved") {
      return (
        <div>
          <div className="text-[13px] font-medium text-gray-800">Validation Issue Resolved</div>
          {payload.code ? <span className="text-[12px] text-gray-500">Code: {String(payload.code)}</span> : null}
        </div>
      );
    }

    // Fallback
    const entries = Object.entries(payload).filter(([k]) => !k.endsWith("_id") && k !== "case_id").slice(0, 3);
    return (
      <div className="text-[13px] text-gray-600">
        {entries.length ? entries.map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v).slice(0, 60)}`).join(" · ") : "—"}
      </div>
    );
  }

  // Categorize event type for display
  function eventCategory(t: string): { label: string; color: string } {
    if (t.includes("answer")) return { label: "Answer", color: "text-[#0077b6]" };
    if (t === "pathway_completed") return { label: "Milestone", color: "text-emerald-600" };
    if (t === "section_completed") return { label: "Milestone", color: "text-emerald-600" };
    if (t === "survey_ready_for_review") return { label: "Milestone", color: "text-emerald-600" };
    if (t.includes("status")) return { label: "Status", color: "text-gray-500" };
    if (t.includes("flag")) return { label: "Flag", color: "text-amber-600" };
    if (t.includes("citation")) return { label: "Citation", color: "text-amber-600" };
    if (t.includes("evidence")) return { label: "Evidence", color: "text-gray-500" };
    if (t.includes("validation")) return { label: "Validation", color: "text-amber-600" };
    if (t.includes("recommendation")) return { label: "Insight", color: "text-gray-500" };
    if (t.includes("created")) return { label: "System", color: "text-gray-400" };
    return { label: "Event", color: "text-gray-400" };
  }

  // KPI counts
  const answerCount = events.filter(e => e.event_type === "answer_submitted").length;
  const flagCount = events.filter(e => e.event_type.includes("flag") && !e.event_type.includes("cleared")).length;
  const citationCount = events.filter(e => e.event_type.includes("citation")).length;
  const milestoneCount = events.filter(e => ["pathway_completed", "section_completed", "survey_ready_for_review"].includes(e.event_type)).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[26px] font-bold text-foreground tracking-tight">Audit Trail</h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">Complete event log for this survey</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
            className="h-9 px-3 text-[12px] rounded-lg border border-gray-200 bg-white text-foreground focus:ring-2 focus:ring-[#0077b6]/20 focus:border-[#0077b6] outline-none"
          >
            <option value="all">All Events ({events.length})</option>
            {eventTypes.map((t) => (
              <option key={t} value={t}>{formatEventType(t)} ({events.filter((e) => e.event_type === t).length})</option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI summary row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Answers</p>
          <p className="text-xl font-semibold text-gray-900">{answerCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Flags</p>
          <p className="text-xl font-semibold text-amber-600">{flagCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Citations</p>
          <p className="text-xl font-semibold text-amber-600">{citationCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">Milestones</p>
          <p className="text-xl font-semibold text-emerald-600">{milestoneCount}</p>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading audit events…</p>}

      {/* Event table — full width */}
      <div className="bg-white rounded-xl border border-gray-200/60 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <colgroup>
            <col style={{ width: "13%" }} />
            <col style={{ width: "10%" }} />
            <col />
            <col style={{ width: "8%" }} />
          </colgroup>
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="pl-5 pr-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Timestamp</th>
              <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Category</th>
              <th className="px-3 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Details</th>
              <th className="pl-3 pr-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 text-right">Actor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {pageEvents.length ? pageEvents.map((ev, idx) => {
              const cat = eventCategory(ev.event_type);
              const isSystem = ["case_created", "case_updated", "pathway_status_updated"].includes(ev.event_type);
              return (
                <tr key={ev.id || idx} className="hover:bg-transparent">
                  <td className="pl-5 pr-3 py-3.5 align-top">
                    <div className="text-[12px] text-foreground font-medium whitespace-nowrap">{new Date(ev.created_at).toLocaleDateString()}</div>
                    <div className="text-[11px] text-muted-foreground whitespace-nowrap">{new Date(ev.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-3 py-3.5 align-top">
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${cat.color}`}>
                      {cat.label}
                    </span>
                  </td>
                  <td className="px-3 py-3.5 align-top">
                    {renderEvent(ev.event_type, ev.payload)}
                  </td>
                  <td className="pl-3 pr-5 py-3.5 align-top text-right">
                    <span className="text-[11px] text-gray-400">{isSystem ? "System" : "Surveyor"}</span>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-sm text-muted-foreground">No audit events yet.</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-200">
            <p className="text-[12px] text-muted-foreground">
              Showing {((safeCurrentPage - 1) * ROWS_PER_PAGE) + 1}–{Math.min(safeCurrentPage * ROWS_PER_PAGE, filteredEvents.length)} of {filteredEvents.length} events
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                disabled={safeCurrentPage <= 1}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                  safeCurrentPage <= 1 ? "text-gray-300 cursor-not-allowed" : "text-[#0077b6] hover:bg-[#edf5fc]"
                }`}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setCurrentPage(p)}
                  className={`w-8 h-8 rounded-md text-[12px] font-semibold transition-colors ${
                    p === safeCurrentPage
                      ? "bg-[#0077b6] text-white"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                disabled={safeCurrentPage >= totalPages}
                className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                  safeCurrentPage >= totalPages ? "text-gray-300 cursor-not-allowed" : "text-[#0077b6] hover:bg-[#edf5fc]"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}



function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">This section is coming soon.</p>
      </div>
      <div className="rounded-lg border border-dashed border-border bg-white p-12 text-center">
        <p className="text-sm text-muted-foreground">{title} management will be available here.</p>
      </div>
    </div>
  );
}

export default function App() {
  const { caseId, updateCaseId } = useActiveCase();
  const [caseState, setCaseState] = useState<CaseState | null>(null);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [globalLoading, setGlobalLoading] = useState(false);

  async function refreshGlobal() {
    if (!caseId) {
      setCaseState(null);
      setEvidence([]);
      setEvents([]);
      return;
    }
    setGlobalLoading(true);
    try {
      const [state, evidenceList, logs] = await Promise.all([
        getCaseState(caseId),
        listEvidence(caseId),
        getCaseEvents(caseId),
      ]);
      setCaseState(state);
      setEvidence(evidenceList);
      setEvents(logs);
    } finally {
      setGlobalLoading(false);
    }
  }

  useEffect(() => {
    // Clear stale data immediately when switching surveys
    setCaseState(null);
    setEvidence([]);
    setEvents([]);
    localStorage.removeItem("cms-demo-pathway-status");
    void refreshGlobal().catch((err) => {
      // If the stored case no longer exists (404), clear it so the user
      // can create a new survey instead of being stuck on a stale ID.
      if (err instanceof Error && (err.message.includes("404") || err.message.includes("not found") || err.message.includes("Not Found"))) {
        updateCaseId(null);
      }
      setCaseState(null);
      setEvidence([]);
      setEvents([]);
      setGlobalLoading(false);
    });
  }, [caseId]);

  // Sync pathway statuses to localStorage for sidebar nav
  useEffect(() => {
    if (caseState) {
      localStorage.setItem("cms-demo-pathway-status", JSON.stringify({
        general: caseState.general_status || "pending",
        neglect: caseState.neglect_status || "pending",
        infection: caseState.infection_status || "pending",
      }));
    } else {
      localStorage.removeItem("cms-demo-pathway-status");
    }
  }, [caseState]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 1300);
    return () => clearTimeout(id);
  }, [toast]);

  function showToast(message: string) {
    setToast(message);
  }

  async function resetApp() {
    if (!caseId) {
      updateCaseId(null);
      showToast("Reset complete");
      return;
    }
    try {
      setGlobalLoading(true);
      await resetCase(caseId);
      await refreshGlobal();
      showToast("Case reset");
    } catch {
      showToast("Reset failed");
    } finally {
      setGlobalLoading(false);
    }
  }

  function handleImported(resetRuntime: boolean) {
    if (resetRuntime) {
      updateCaseId(null);
    } else {
      void refreshGlobal();
    }
  }

  return (
    <>
      <Routes>
        <Route index element={<LandingPage />} />
        <Route path="app" element={<AppShell />}>
          <Route
            index
            element={
              <SurveyHistory
                caseId={caseId}
                setCaseId={updateCaseId}
                showToast={showToast}
              />
            }
          />
          <Route path="history" element={<Navigate to="/app" replace />} />
          <Route path="admin/facilities" element={<FacilitiesPage />} />
          <Route path="admin/users" element={<UsersPage />} />
          <Route path="admin/questions" element={<QuestionLibraryPage />} />
          <Route path="admin/pathways" element={<PathwaysPage />} />
          <Route path="admin/templates" element={<TemplatesPage />} />
          <Route path="admin/guide" element={<AdminGuidePage />} />
          <Route path="dashboard-overview" element={<DashboardOverviewPage />} />
          <Route path="dashboard-overview/:facilityName" element={<FacilityDashboardPage />} />

          <Route
            path="create-survey"
            element={
              <Dashboard
                caseId={null}
                setCaseId={updateCaseId}
                caseState={null}
                evidence={[]}
                events={[]}
                refreshGlobal={refreshGlobal}
                showToast={showToast}
                globalLoading={false}
                onReset={resetApp}
              />
            }
          />
          <Route
            path="dashboard"
            element={
              <Dashboard
                caseId={caseId}
                setCaseId={updateCaseId}
                caseState={caseState}
                evidence={evidence}
                events={events}
                refreshGlobal={refreshGlobal}
                showToast={showToast}
                globalLoading={globalLoading}
                onReset={resetApp}
              />
            }
          />
          <Route
            path="general"
            element={
              <PathwayScreen
                caseId={caseId}
                pathwaySlug="general-cep"
                title="General Critical Element Pathway (CMS-20072)"
                sideTitle="Connectivity & Flags"
                refreshGlobal={refreshGlobal}
                showToast={showToast}
              />
            }
          />
          <Route
            path="neglect"
            element={
              <PathwayScreen
                caseId={caseId}
                pathwaySlug="neglect-cep"
                title="Neglect Critical Element Pathway (CMS 20130)"
                sideTitle="Shared Evidence & Flags"
                refreshGlobal={refreshGlobal}
                showToast={showToast}
              />
            }
          />
          <Route
            path="infection"
            element={
              <PathwayScreen
                caseId={caseId}
                pathwaySlug="infection-control-cep"
                title="Infection Control Pathway"
                sideTitle="Shared Evidence & Flags"
                refreshGlobal={refreshGlobal}
                showToast={showToast}
              />
            }
          />
          <Route
            path="pathway/:slug"
            element={
              <DynamicPathwayScreen
                caseId={caseId}
                refreshGlobal={refreshGlobal}
                showToast={showToast}
              />
            }
          />
          <Route path="summary" element={<Summary caseId={caseId} />} />
          <Route path="audit" element={<AuditScreen caseId={caseId} />} />
          <Route path="admin/workflows" element={<WorkflowBuilderPage onImported={handleImported} showToast={showToast} />}>
            <Route index element={<PathwaysTable />} />
            <Route path=":pathwayIdx" element={<SectionsTable />} />
            <Route path=":pathwayIdx/:sectionIdx" element={<QuestionsTable />} />
          </Route>
        </Route>
      </Routes>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
