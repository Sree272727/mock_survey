export type CaseRecord = {
  id: string;
  external_case_id: string;
  resident_id: string;
  facility_name: string;
  status: string;
  created_at: string;
};

export type CaseState = {
  case_id: string;
  general_status: string;
  neglect_status: string;
  infection_status: string;
  flags: string[];
  citations: string[];
};

export type Choice = {
  id: string;
  code: string;
  label: string;
  value: string;
};

export type Node = {
  id: string;
  code: string;
  prompt: string;
  node_type: string;
  is_terminal: boolean;
  parent_node_code: string | null;
  choices: Choice[];
  rules?: Array<{
    when_choice: string;
    actions: Array<{ type: string; payload: Record<string, unknown> }>;
  }>;
};

export type Section = {
  id: string;
  slug: string;
  title: string;
  order: number;
  nodes: Node[];
};

export type PathwayDefinition = {
  id: string;
  slug: string;
  title: string;
  sections: Section[];
};

export type NextStep = {
  next_node_id: string | null;
  next_node_code: string | null;
  flags_created: string[];
  citations_created: string[];
  recommendation: string | null;
  recommendation_slug?: string | null;
  required_actions: string[];
  validation_issues: string[];
};

export type NodeAnswer = {
  node_id: string;
  choice_id: string | null;
  choice_label: string | null;
  notes: string;
  evidence_refs: Record<string, unknown>;
  answered_at: string;
};

export type CasePathwaySnapshot = {
  case_id: string;
  pathway_slug: string;
  pathway_status: string;
  current_node_id: string | null;
  answers: NodeAnswer[];
};

export type EvidenceItem = {
  id: string;
  label: string;
  description: string;
  source_type: string;
  filename?: string | null;
  file_url?: string | null;
  created_at: string;
};

export type CaseEvent = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type ActionResult = {
  ok: boolean;
  message: string;
};

export type ValidationIssue = {
  id: string;
  case_id: string;
  pathway_id: string;
  node_id: string | null;
  code: string;
  message: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
};

export type CitationDetail = {
  tag: string;
  title: string;
  regulation: string;
  scope_severity: string;
  rationale: string;
};

export type FindingsSummary = {
  case_id: string;
  facility: string;
  survey_type: string;
  survey_dates: string;
  resident_identifier_anonymized: string;
  total_citations: number;
  general_citations: number;
  neglect_citations: number;
  citations: CitationDetail[];
  observation_details: string[];
  interview_details: string[];
  record_review_details: string[];
  dates: string[];
};

// ── Dashboard types ──────────────────────────────────────────────

export type MonthlyStat = { current_month: number; previous_month: number };

export type ActionItems = { past_due: number; due_soon: number; pending: number; total: number };

export type FTagCitation = {
  tag: string;
  title: string;
  regulation: string;
  scope_severity: string;
  count: number;
};

export type ComplianceAreaScore = {
  area_name: string;
  regulation: string;
  tags: string[];
  citation_count: number;
  score: number;
};

export type HeatMapCell = { area_name: string; tag: string; count: number };

export type FacilityCitationRank = {
  facility_name: string;
  citation_count: number;
  case_count: number;
};

export type ActionPlanItem = {
  tag: string;
  title: string;
  regulation: string;
  citation_count: number;
  recommendation: string;
};

export type CaseSummaryItem = {
  id: string;
  external_case_id: string;
  resident_id: string;
  status: string;
  created_at: string;
  citation_count: number;
};

export type PathwayCoverageItem = {
  facility_name: string;
  pathway_title: string;
  pathway_slug: string;
  not_started: number;
  in_progress: number;
  completed: number;
};

export type ActivityTrendPoint = {
  period: string;
  new: number;
  in_progress: number;
  completed: number;
};

export type DailyActivity = {
  date: string;
  count: number;
};

export type FunnelStep = {
  name: string;
  value: number;
};

export type FacilityLeaderboardItem = {
  facility_name: string;
  survey_count: number;
  completion_rate: number;
  citation_count: number;
};

export type PathwayPopularityItem = {
  pathway_title: string;
  pathway_slug: string;
  usage_count: number;
  completion_rate: number;
};

export type DashboardOverview = {
  total_facilities: number;
  total_cases: number;
  in_progress_cases: number;
  completed_cases: number;
  surveys_completed: MonthlyStat;
  deficiencies: MonthlyStat;
  action_items: ActionItems;
  ftag_citations: FTagCitation[];
  compliance_area_scores: ComplianceAreaScore[];
  heat_map_data: HeatMapCell[];
  facility_rankings: FacilityCitationRank[];
  action_plans: ActionPlanItem[];
  pathway_coverage: PathwayCoverageItem[];
  activity_trend: ActivityTrendPoint[];
  daily_activity: DailyActivity[];
  funnel_data: FunnelStep[];
  facility_leaderboard: FacilityLeaderboardItem[];
  pathway_popularity: PathwayPopularityItem[];
};

export type FacilityDashboard = {
  facility_name: string;
  total_cases: number;
  in_progress_cases: number;
  completed_cases: number;
  surveys_completed: MonthlyStat;
  deficiencies: MonthlyStat;
  action_items: ActionItems;
  ftag_citations: FTagCitation[];
  compliance_area_scores: ComplianceAreaScore[];
  heat_map_data: HeatMapCell[];
  action_plans: ActionPlanItem[];
  pathway_coverage: PathwayCoverageItem[];
  cases: CaseSummaryItem[];
};

export type FacilityListItem = { facility_name: string; case_count: number };

export type FacilitySurveyFrequency = {
  facility_name: string;
  total_surveys: number;
  completed: number;
  in_progress: number;
  month: string;
  monthly_count: number;
};

export type AdminWorkflowPayload = {
  pathways: Array<{
    slug: string;
    title: string;
    is_active?: boolean;
    sections: Array<{
      slug: string;
      title: string;
      nodes: Array<{
        code: string;
        prompt: string;
        node_type?: string;
        parent_node_code?: string | null;
        choices: string[];
        rules?: Array<{
          when_choice: string;
          actions: Array<{ type: string; payload: Record<string, unknown> }>;
        }>;
      }>;
    }>;
  }>;
  reset_runtime?: boolean;
};

export type PdfExtractResult = {
  source: "openai" | "heuristic";
  filename: string;
  pages: number;
  section_count: number;
  question_count: number;
  warning: string | null;
  payload: AdminWorkflowPayload;
};
