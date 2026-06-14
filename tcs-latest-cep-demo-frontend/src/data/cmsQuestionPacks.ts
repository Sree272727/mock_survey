import type { AdminWorkflowPayload } from "@/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type CmsPackMeta = {
  id: string;
  name: string;
  description: string;
  version: string;
  sectionCount: number;
  questionCount: number;
  fTags: string[];
  status: "available" | "coming_soon";
  payload: AdminWorkflowPayload | null;
};

/* ------------------------------------------------------------------ */
/*  General CEP — CMS 2026 Pack                                        */
/* ------------------------------------------------------------------ */

const GENERAL_CEP_PAYLOAD: AdminWorkflowPayload = {
  pathways: [
    {
      slug: "cms-general-cep-2026",
      title: "General CEP — CMS 2026",
      is_active: false,
      sections: [
        /* ── Section 1: Observations ─────────────────────────── */
        {
          slug: "cms26-observations",
          title: "Observations",
          nodes: [
            {
              code: "cms26_obs_1",
              prompt:
                "Does staff consistently implement the care-planned interventions during the observed shift(s)?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_OBS_CARE_IMPL",
                        severity: "warn",
                        message:
                          "Care-planned interventions may not be consistently implemented.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_obs_2",
              prompt:
                "Do observations of the resident's condition match the most recent comprehensive assessment?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_OBS_ASSESS_MISMATCH",
                        severity: "warn",
                        message:
                          "Observed condition does not align with the documented assessment.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_obs_3",
              prompt:
                "Is the resident receiving assistance with activities of daily living (ADLs) consistent with the care plan?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_OBS_ADL_GAP",
                        severity: "warn",
                        message:
                          "ADL assistance may not align with what is documented in the care plan.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_obs_4",
              prompt:
                "Is the resident treated with dignity and respect during observed care interactions?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_OBS_DIGNITY",
                        severity: "high",
                        message:
                          "Potential dignity or respect concerns observed during care delivery.",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Section 2: Resident/Family Interviews ───────────── */
        {
          slug: "cms26-interviews",
          title: "Resident/Family Interviews",
          nodes: [
            {
              code: "cms26_int_1",
              prompt:
                "Does the resident (or representative) report satisfaction with the care and services being provided?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_INT_DISSATISFIED",
                        severity: "warn",
                        message:
                          "Resident or representative reports dissatisfaction with care or services.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_int_2",
              prompt:
                "Does the resident report that concerns or complaints are addressed in a timely manner?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_INT_CONCERNS_UNRESOLVED",
                        severity: "warn",
                        message:
                          "Resident concerns or complaints may not be addressed promptly.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_int_3",
              prompt:
                "Does the resident feel they are involved in decisions about their care and daily routine?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_INT_NOT_INVOLVED",
                        severity: "warn",
                        message:
                          "Resident may not be sufficiently involved in care decisions.",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Section 3: Record Review ────────────────────────── */
        {
          slug: "cms26-records",
          title: "Record Review",
          nodes: [
            {
              code: "cms26_rec_1",
              prompt:
                "Were required comprehensive assessments (MDS) completed within the required timeframes?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_REC_ASSESS_LATE",
                        severity: "warn",
                        message:
                          "Required assessments may not have been completed within regulatory timeframes.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_rec_2",
              prompt:
                "Was a comprehensive, person-centered care plan developed and revised in response to changes in the resident's condition?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_REC_CARE_PLAN_GAP",
                        severity: "warn",
                        message:
                          "Care plan may not reflect current resident needs or condition changes.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_rec_3",
              prompt:
                "Are physician orders current and consistent with the care plan and treatment being provided?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_REC_ORDERS_INCONSISTENT",
                        severity: "warn",
                        message:
                          "Physician orders may not be consistent with the documented care plan.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_rec_4",
              prompt:
                "Does the MDS accurately reflect the resident's current status and care needs?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_REC_MDS_INACCURATE",
                        severity: "warn",
                        message:
                          "MDS may not accurately represent the resident's current condition.",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Section 4: Staff Interviews ─────────────────────── */
        {
          slug: "cms26-staff",
          title: "Staff Interviews",
          nodes: [
            {
              code: "cms26_staff_1",
              prompt:
                "Are direct-care staff aware of the resident's current care plan and specific interventions?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_STAFF_UNAWARE",
                        severity: "warn",
                        message:
                          "Staff may not be adequately informed of resident's care plan.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_staff_2",
              prompt:
                "Do staff report changes in the resident's condition to the charge nurse or physician in a timely manner?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_STAFF_REPORTING_DELAY",
                        severity: "high",
                        message:
                          "Condition changes may not be reported to clinical staff promptly.",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_staff_3",
              prompt:
                "Have staff received adequate training specific to the resident's care needs (e.g., fall prevention, wound care, dementia care)?",
              node_type: "question",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_STAFF_TRAINING_GAP",
                        severity: "warn",
                        message:
                          "Staff training may be insufficient for the resident's specific care needs.",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },

        /* ── Section 5: Critical Decisions ───────────────────── */
        {
          slug: "cms26-decisions",
          title: "Critical Decisions",
          nodes: [
            {
              code: "cms26_dec_1",
              prompt:
                "Did the facility ensure the resident received treatment and care in accordance with professional standards of practice? (§483.25 — Quality of Care)",
              node_type: "decision",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_citation",
                      payload: {
                        tag: "F684",
                        rationale:
                          "Facility failed to provide treatment and care in accordance with professional standards of practice and resident's care plan.",
                      },
                    },
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_DEC_F684",
                        severity: "high",
                        message: "Potential citation: F684 — Quality of Care",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_dec_2",
              prompt:
                "Did the facility develop a comprehensive assessment of the resident's needs? (§483.20 — Resident Assessment)",
              node_type: "decision",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_citation",
                      payload: {
                        tag: "F636",
                        rationale:
                          "Facility failed to conduct a comprehensive, accurate, standardized assessment of each resident's functional capacity.",
                      },
                    },
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_DEC_F636",
                        severity: "high",
                        message:
                          "Potential citation: F636 — Comprehensive Assessment",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_dec_3",
              prompt:
                "Did the facility develop a comprehensive, person-centered care plan for the resident? (§483.21(b) — Comprehensive Care Plans)",
              node_type: "decision",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_citation",
                      payload: {
                        tag: "F656",
                        rationale:
                          "Facility failed to develop a comprehensive care plan for each resident that includes measurable objectives and timeframes.",
                      },
                    },
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_DEC_F656",
                        severity: "high",
                        message:
                          "Potential citation: F656 — Comprehensive Care Plans",
                      },
                    },
                  ],
                },
              ],
            },
            {
              code: "cms26_dec_4",
              prompt:
                "Did the facility provide services to the resident as described in the care plan? (§483.21(b)(3) — Care Plan Implementation)",
              node_type: "decision",
              parent_node_code: null,
              choices: ["Yes", "No"],
              rules: [
                {
                  when_choice: "No",
                  actions: [
                    {
                      type: "add_citation",
                      payload: {
                        tag: "F657",
                        rationale:
                          "Facility failed to provide the services described in the resident's care plan, including revisions in response to changing conditions.",
                      },
                    },
                    {
                      type: "add_flag",
                      payload: {
                        code: "CMS26_DEC_F657",
                        severity: "high",
                        message:
                          "Potential citation: F657 — Care Plan Implementation",
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  reset_runtime: false,
};

/* ------------------------------------------------------------------ */
/*  Pack catalog                                                        */
/* ------------------------------------------------------------------ */

export const CMS_PACKS: CmsPackMeta[] = [
  {
    id: "cms-general-cep-2026",
    name: "General CEP — CMS 2026",
    description:
      "Complete Critical Element Pathway for general quality of care investigations. Covers care delivery observations, resident/family interviews, record reviews, staff interviews, and compliance determinations with F-tag citations.",
    version: "2026.1",
    sectionCount: 5,
    questionCount: 18,
    fTags: ["F684", "F636", "F656", "F657"],
    status: "available",
    payload: GENERAL_CEP_PAYLOAD,
  },
  {
    id: "cms-neglect-cep-2026",
    name: "Neglect CEP — CMS 2026",
    description:
      "Critical Element Pathway for neglect investigations. Covers staff interviews, resident assessments, incident reporting, and neglect determination.",
    version: "2026.1",
    sectionCount: 5,
    questionCount: 0,
    fTags: ["F600", "F609", "F610"],
    status: "coming_soon",
    payload: null,
  },
  {
    id: "cms-infection-control-2026",
    name: "Infection Control CEP — CMS 2026",
    description:
      "Critical Element Pathway for infection prevention and control. Covers hand hygiene, PPE use, environmental observations, and antibiotic stewardship.",
    version: "2026.1",
    sectionCount: 5,
    questionCount: 0,
    fTags: ["F880", "F881"],
    status: "coming_soon",
    payload: null,
  },
];
