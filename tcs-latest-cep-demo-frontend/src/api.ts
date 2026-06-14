import type {
  ActionResult,
  AdminWorkflowPayload,
  CaseEvent,
  DashboardOverview,
  FacilityDashboard,
  FacilityListItem,
  FacilitySurveyFrequency,
  FindingsSummary,
  CasePathwaySnapshot,
  CaseRecord,
  CaseState,
  EvidenceItem,
  NextStep,
  PathwayDefinition,
  PdfExtractResult,
  ValidationIssue,
} from "./types";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export function listPathways(): Promise<Array<{ slug: string; title: string; is_active: boolean }>> {
  return request<Array<{ slug: string; title: string; is_active: boolean }>>("/api/pathways");
}

export function adminDeletePathway(slug: string): Promise<ActionResult> {
  return request<ActionResult>(`/api/admin/pathways/${slug}`, { method: "DELETE" });
}

export function getPathway(slug: string): Promise<PathwayDefinition> {
  return request<PathwayDefinition>(`/api/pathways/${slug}`);
}

export function createCase(payload: {
  external_case_id: string;
  resident_id: string;
  facility_name: string;
  pathway_slugs?: string[];
}): Promise<CaseRecord> {
  return request<CaseRecord>("/api/cases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export type CasePathwayItem = { slug: string; title: string; status: string };

export function getCasePathways(caseId: string): Promise<CasePathwayItem[]> {
  return request<CasePathwayItem[]>(`/api/cases/${caseId}/pathways`);
}

export function getCase(caseId: string): Promise<CaseRecord> {
  return request<CaseRecord>(`/api/cases/${caseId}`);
}

export function listCases(): Promise<CaseRecord[]> {
  return request<CaseRecord[]>("/api/cases");
}

export function deleteCase(caseId: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/api/cases/${caseId}`, { method: "DELETE" });
}

export function purgeAllCases(): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>("/api/cases", { method: "DELETE" });
}

export function updateCase(
  caseId: string,
  payload: {
    external_case_id: string;
    resident_id: string;
    facility_name: string;
  },
): Promise<CaseRecord> {
  return request<CaseRecord>(`/api/cases/${caseId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function getCaseState(caseId: string): Promise<CaseState> {
  return request<CaseState>(`/api/cases/${caseId}/state`);
}

export function getCasePathwaySnapshot(caseId: string, slug: string): Promise<CasePathwaySnapshot> {
  return request<CasePathwaySnapshot>(`/api/cases/${caseId}/pathways/${slug}/snapshot`);
}

export function updatePathwayStatus(caseId: string, slug: string, status: string): Promise<CasePathwaySnapshot> {
  return request<CasePathwaySnapshot>(`/api/cases/${caseId}/pathways/${slug}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}

export function submitAnswer(
  caseId: string,
  payload: {
    pathway_slug: string;
    node_id: string;
    choice_id: string;
    notes?: string;
    evidence_refs?: Record<string, unknown>;
  },
): Promise<NextStep> {
  return request<NextStep>(`/api/cases/${caseId}/answers`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getCaseEvents(caseId: string): Promise<CaseEvent[]> {
  return request<CaseEvent[]>(`/api/cases/${caseId}/events`);
}

export function getFindingsSummary(caseId: string): Promise<FindingsSummary> {
  return request<FindingsSummary>(`/api/cases/${caseId}/findings-summary`);
}

export function listValidationIssues(caseId: string): Promise<ValidationIssue[]> {
  return request<ValidationIssue[]>(`/api/cases/${caseId}/validation-issues`);
}

export function listPathwayValidationIssues(caseId: string, slug: string): Promise<ValidationIssue[]> {
  return request<ValidationIssue[]>(`/api/cases/${caseId}/pathways/${slug}/validation-issues`);
}

export function resolveValidationIssue(caseId: string, issueId: string): Promise<ActionResult> {
  return request<ActionResult>(`/api/cases/${caseId}/validation-issues/${issueId}/resolve`, {
    method: "POST",
  });
}

export function saveCase(caseId: string): Promise<ActionResult> {
  return request<ActionResult>(`/api/cases/${caseId}/save`, { method: "POST" });
}

export function resetCase(caseId: string): Promise<ActionResult> {
  return request<ActionResult>(`/api/cases/${caseId}/reset`, { method: "POST" });
}

export async function downloadCaseReportPdf(caseId: string): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/cases/${caseId}/report.pdf`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return res.blob();
}

export function adminExportWorkflows(): Promise<AdminWorkflowPayload> {
  return request<AdminWorkflowPayload>("/api/admin/workflows/export");
}

export function adminRuntimeStatus(): Promise<{ case_count: number; answer_count: number }> {
  return request<{ case_count: number; answer_count: number }>("/api/admin/workflows/runtime-status");
}

// ── Dashboard ────────────────────────────────────────────────────

export function getDashboardOverview(): Promise<DashboardOverview> {
  return request<DashboardOverview>("/api/dashboard/overview");
}

export function getFacilityDashboard(facilityName: string): Promise<FacilityDashboard> {
  return request<FacilityDashboard>(`/api/dashboard/facility/${encodeURIComponent(facilityName)}`);
}

export function getDashboardFacilities(): Promise<FacilityListItem[]> {
  return request<FacilityListItem[]>("/api/dashboard/facilities");
}

export function getSurveyFrequency(): Promise<FacilitySurveyFrequency[]> {
  return request<FacilitySurveyFrequency[]>("/api/dashboard/survey-frequency");
}

export function adminImportWorkflows(payload: AdminWorkflowPayload): Promise<ActionResult> {
  return request<ActionResult>("/api/admin/workflows/import", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function adminImportPack(payload: AdminWorkflowPayload): Promise<ActionResult> {
  return request<ActionResult>("/api/admin/workflows/import-pack", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminExtractPdf(file: File): Promise<PdfExtractResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/admin/workflows/extract-pdf`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as PdfExtractResult;
}

export function listEvidence(caseId: string): Promise<EvidenceItem[]> {
  return request<EvidenceItem[]>(`/api/cases/${caseId}/evidence`);
}

export function addEvidence(caseId: string, description: string): Promise<EvidenceItem> {
  return request<EvidenceItem>(`/api/cases/${caseId}/evidence`, {
    method: "POST",
    body: JSON.stringify({ description, source_type: "manual" }),
  });
}

export async function uploadEvidence(
  caseId: string,
  file: File,
  description = "",
  label?: string,
): Promise<EvidenceItem> {
  const form = new FormData();
  form.append("file", file);
  form.append("description", description);
  if (label) form.append("label", label);

  const res = await fetch(`${API_BASE}/api/cases/${caseId}/evidence/upload`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as EvidenceItem;
}
