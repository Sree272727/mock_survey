from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class ChoiceOut(BaseModel):
    id: UUID
    code: str
    label: str
    value: str


class RuleActionOut(BaseModel):
    type: str
    payload: dict = Field(default_factory=dict)


class NodeRuleOut(BaseModel):
    when_choice: str
    actions: list[RuleActionOut] = Field(default_factory=list)


class NodeOut(BaseModel):
    id: UUID
    code: str
    prompt: str
    node_type: str
    is_terminal: bool
    parent_node_code: str | None = None
    choices: list[ChoiceOut]
    rules: list[NodeRuleOut] = Field(default_factory=list)


class SectionOut(BaseModel):
    id: UUID
    slug: str
    title: str
    order: int
    nodes: list[NodeOut]


class PathwayDefinitionOut(BaseModel):
    id: UUID
    slug: str
    title: str
    sections: list[SectionOut]


class CaseCreateIn(BaseModel):
    external_case_id: str
    resident_id: str
    facility_name: str
    pathway_slugs: list[str] | None = None  # if set, attach only these pathways


class CaseUpdateIn(BaseModel):
    external_case_id: str
    resident_id: str
    facility_name: str


class CaseOut(BaseModel):
    id: UUID
    external_case_id: str
    resident_id: str
    facility_name: str
    status: str
    created_at: datetime


class AnswerSubmitIn(BaseModel):
    pathway_slug: str
    node_id: UUID
    choice_id: UUID | None = None
    notes: str = ""
    evidence_refs: dict = Field(default_factory=dict)


class NextStepOut(BaseModel):
    next_node_id: UUID | None
    next_node_code: str | None
    flags_created: list[str]
    citations_created: list[str]
    recommendation: str | None
    recommendation_slug: str | None = None
    required_actions: list[str] = Field(default_factory=list)
    validation_issues: list[str] = Field(default_factory=list)


class CaseStateOut(BaseModel):
    case_id: UUID
    general_status: str
    neglect_status: str
    infection_status: str
    flags: list[str]
    citations: list[str]


class NodeAnswerOut(BaseModel):
    node_id: UUID
    choice_id: UUID | None
    choice_label: str | None
    notes: str
    evidence_refs: dict
    answered_at: datetime


class CasePathwaySnapshotOut(BaseModel):
    case_id: UUID
    pathway_slug: str
    pathway_status: str
    current_node_id: UUID | None
    answers: list[NodeAnswerOut]


class PathwayStatusUpdateIn(BaseModel):
    status: str


class EvidenceCreateIn(BaseModel):
    label: str | None = None
    description: str = ""
    source_type: str = "manual"


class EvidenceOut(BaseModel):
    id: UUID
    label: str
    description: str
    source_type: str
    filename: str | None = None
    file_url: str | None = None
    created_at: datetime


class CaseEventOut(BaseModel):
    id: UUID
    event_type: str
    payload: dict
    created_at: datetime


class ActionResultOut(BaseModel):
    ok: bool
    message: str


class CaseValidationIssueOut(BaseModel):
    id: UUID
    case_id: UUID
    pathway_id: UUID
    node_id: UUID | None
    code: str
    message: str
    severity: str
    status: str
    created_at: datetime
    resolved_at: datetime | None


class CitationDetailOut(BaseModel):
    tag: str
    title: str
    regulation: str
    scope_severity: str
    rationale: str


class FindingsSummaryOut(BaseModel):
    case_id: UUID
    facility: str
    survey_type: str
    survey_dates: str
    resident_identifier_anonymized: str
    total_citations: int
    general_citations: int
    neglect_citations: int
    citations: list[CitationDetailOut]
    observation_details: list[str]
    interview_details: list[str]
    record_review_details: list[str]
    dates: list[str]


class AdminRuleActionIn(BaseModel):
    type: str
    payload: dict = Field(default_factory=dict)


class AdminNodeRuleIn(BaseModel):
    when_choice: str
    actions: list[AdminRuleActionIn] = Field(default_factory=list)


class AdminNodeIn(BaseModel):
    code: str
    prompt: str
    node_type: str = "question"
    parent_node_code: str | None = None
    choices: list[str]
    rules: list[AdminNodeRuleIn] = Field(default_factory=list)


class AdminSectionIn(BaseModel):
    slug: str
    title: str
    nodes: list[AdminNodeIn]


class AdminPathwayIn(BaseModel):
    slug: str
    title: str
    is_active: bool = True
    sections: list[AdminSectionIn]


class AdminWorkflowPayloadIn(BaseModel):
    pathways: list[AdminPathwayIn]
    reset_runtime: bool = True


class AdminWorkflowPayloadOut(BaseModel):
    pathways: list[dict]


class PdfExtractResultOut(BaseModel):
    source: str  # "openai" | "heuristic"
    filename: str
    pages: int
    section_count: int
    question_count: int
    warning: str | None = None
    payload: AdminWorkflowPayloadIn


# ── Dashboard schemas ─────────────────────────────────────────────

class FacilityListItemOut(BaseModel):
    facility_name: str
    case_count: int


class MonthlyStatOut(BaseModel):
    current_month: int
    previous_month: int


class ActionItemsOut(BaseModel):
    past_due: int
    due_soon: int
    pending: int
    total: int


class FTagCitationOut(BaseModel):
    tag: str
    title: str
    regulation: str
    scope_severity: str
    count: int


class ComplianceAreaScoreOut(BaseModel):
    area_name: str
    regulation: str
    tags: list[str]
    citation_count: int
    score: int


class HeatMapCellOut(BaseModel):
    area_name: str
    tag: str
    count: int


class FacilityCitationRankOut(BaseModel):
    facility_name: str
    citation_count: int
    case_count: int


class PathwayCoverageItemOut(BaseModel):
    facility_name: str
    pathway_title: str
    pathway_slug: str
    not_started: int
    in_progress: int
    completed: int


class ActionPlanItemOut(BaseModel):
    tag: str
    title: str
    regulation: str
    citation_count: int
    recommendation: str


class CaseSummaryOut(BaseModel):
    id: UUID
    external_case_id: str
    resident_id: str
    status: str
    created_at: datetime
    citation_count: int


class FacilitySurveyFrequencyOut(BaseModel):
    facility_name: str
    total_surveys: int
    completed: int
    in_progress: int
    month: str  # e.g. "2026-03"
    monthly_count: int


class ActivityTrendPointOut(BaseModel):
    period: str
    new: int
    in_progress: int
    completed: int


class DailyActivityOut(BaseModel):
    date: str
    count: int


class FunnelStepOut(BaseModel):
    name: str
    value: int


class FacilityLeaderboardItemOut(BaseModel):
    facility_name: str
    survey_count: int
    completion_rate: float
    citation_count: int


class PathwayPopularityItemOut(BaseModel):
    pathway_title: str
    pathway_slug: str
    usage_count: int
    completion_rate: float


class DashboardOverviewOut(BaseModel):
    total_facilities: int
    total_cases: int
    in_progress_cases: int
    completed_cases: int
    surveys_completed: MonthlyStatOut
    deficiencies: MonthlyStatOut
    action_items: ActionItemsOut
    ftag_citations: list[FTagCitationOut]
    compliance_area_scores: list[ComplianceAreaScoreOut]
    heat_map_data: list[HeatMapCellOut]
    facility_rankings: list[FacilityCitationRankOut]
    action_plans: list[ActionPlanItemOut]
    pathway_coverage: list[PathwayCoverageItemOut]
    activity_trend: list[ActivityTrendPointOut]
    daily_activity: list[DailyActivityOut]
    funnel_data: list[FunnelStepOut]
    facility_leaderboard: list[FacilityLeaderboardItemOut]
    pathway_popularity: list[PathwayPopularityItemOut]


class FacilityDashboardOut(BaseModel):
    facility_name: str
    total_cases: int
    in_progress_cases: int
    completed_cases: int
    surveys_completed: MonthlyStatOut
    deficiencies: MonthlyStatOut
    action_items: ActionItemsOut
    ftag_citations: list[FTagCitationOut]
    compliance_area_scores: list[ComplianceAreaScoreOut]
    heat_map_data: list[HeatMapCellOut]
    action_plans: list[ActionPlanItemOut]
    pathway_coverage: list[PathwayCoverageItemOut]
    cases: list[CaseSummaryOut]
