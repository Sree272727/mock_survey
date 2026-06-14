import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { AdminWorkflowPayload } from "@/types";
import { adminExportWorkflows, adminImportWorkflows, adminRuntimeStatus } from "@/api";

/* ------------------------------------------------------------------ */
/*  Type aliases                                                        */
/* ------------------------------------------------------------------ */
export type WorkflowPathway = AdminWorkflowPayload["pathways"][number];
export type WorkflowSection = WorkflowPathway["sections"][number];
export type WorkflowNode = WorkflowSection["nodes"][number];

export type DrawerState = {
  level: "pathway" | "section" | "question";
  pathwayIndex: number;
  sectionIndex?: number;
  questionIndex?: number;
};

export type ConfirmState = {
  caseCount: number;
  answerCount: number;
} | null;

/* ------------------------------------------------------------------ */
/*  Context value                                                       */
/* ------------------------------------------------------------------ */
interface WorkflowContextValue {
  workflow: AdminWorkflowPayload | null;
  isLoading: boolean;
  error: string | null;
  isDirty: boolean;

  withWorkflow: (mutator: (next: AdminWorkflowPayload) => void) => void;
  loadCurrent: () => Promise<void>;
  applyChanges: () => Promise<void>;
  confirmApply: ConfirmState;
  confirmAndApply: () => void;
  cancelApply: () => void;

  drawer: DrawerState | null;
  openDrawer: (state: DrawerState) => void;
  closeDrawer: () => void;

  makePathway: (seed: number) => WorkflowPathway;
  makeSection: (seed: number) => WorkflowSection;
  makeNode: (seed: number) => WorkflowNode;

  allSectionNodeOptions: (
    pathway: WorkflowPathway,
  ) => Array<{ code: string; prompt: string; choices: string[] }>;
  getSectionDisplayRule: (
    pathway: WorkflowPathway,
    sectionSlug: string,
  ) => { sourceNodeCode: string; whenChoice: string } | null;
  clearSectionDisplayRules: (
    pathway: WorkflowPathway,
    sectionSlug: string,
  ) => void;
  setSectionDisplayRule: (
    pathway: WorkflowPathway,
    sectionSlug: string,
    sourceNodeCode: string,
    whenChoice: string,
  ) => void;
}

const WorkflowCtx = createContext<WorkflowContextValue | null>(null);

export function useWorkflow() {
  const ctx = useContext(WorkflowCtx);
  if (!ctx) throw new Error("useWorkflow must be used within WorkflowProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Provider                                                            */
/* ------------------------------------------------------------------ */
export function WorkflowProvider({
  onImported,
  showToast,
  children,
}: {
  onImported: (resetRuntime: boolean) => void;
  showToast: (msg: string) => void;
  children: ReactNode;
}) {
  const [workflow, setWorkflow] = useState<AdminWorkflowPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drawer, setDrawer] = useState<DrawerState | null>(null);
  const [confirmApply, setConfirmApply] = useState<ConfirmState>(null);
  const [isDirty, setIsDirty] = useState(false);

  /* -- deep copy helper -------------------------------------------- */
  function deepCopy<T>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }

  /* -- mutator ------------------------------------------------------ */
  const withWorkflow = useCallback(
    (mutator: (next: AdminWorkflowPayload) => void) => {
      setWorkflow((prev) => {
        if (!prev) return prev;
        const next = deepCopy(prev);
        mutator(next);
        return next;
      });
      setIsDirty(true);
    },
    [],
  );

  /* -- factory functions -------------------------------------------- */
  function makeNode(seed: number): WorkflowNode {
    return {
      code: `new_node_${seed}`,
      prompt: "New question",
      node_type: "question",
      choices: ["Yes", "No"],
      rules: [],
    };
  }

  function makeSection(seed: number): WorkflowSection {
    return {
      slug: `new-section-${seed}`,
      title: `New Section ${seed}`,
      nodes: [makeNode(seed)],
    };
  }

  function makePathway(seed: number): WorkflowPathway {
    return {
      slug: `new-pathway-${seed}`,
      title: `New Pathway ${seed}`,
      is_active: true,
      sections: [makeSection(seed)],
    };
  }

  /* -- section helpers ---------------------------------------------- */
  function allSectionNodeOptions(
    pathway: WorkflowPathway,
  ): Array<{ code: string; prompt: string; choices: string[] }> {
    const out: Array<{ code: string; prompt: string; choices: string[] }> = [];
    pathway.sections.forEach((s) => {
      s.nodes.forEach((n) => {
        out.push({ code: n.code, prompt: n.prompt, choices: n.choices || [] });
      });
    });
    return out;
  }

  function getSectionDisplayRule(
    pathway: WorkflowPathway,
    sectionSlug: string,
  ): { sourceNodeCode: string; whenChoice: string } | null {
    for (const section of pathway.sections) {
      for (const node of section.nodes) {
        for (const rule of node.rules || []) {
          for (const action of rule.actions || []) {
            if (action.type !== "show_section") continue;
            const targetSlug = String(
              (action.payload || {}).section_slug || "",
            );
            if (targetSlug === sectionSlug) {
              return { sourceNodeCode: node.code, whenChoice: rule.when_choice };
            }
          }
        }
      }
    }
    return null;
  }

  function clearSectionDisplayRules(
    pathway: WorkflowPathway,
    sectionSlug: string,
  ) {
    pathway.sections.forEach((section) => {
      section.nodes.forEach((node) => {
        const nextRules = (node.rules || [])
          .map((rule) => {
            const nextActions = (rule.actions || []).filter((a) => {
              if (a.type !== "show_section" && a.type !== "hide_section")
                return true;
              return (
                String((a.payload || {}).section_slug || "") !== sectionSlug
              );
            });
            return { ...rule, actions: nextActions };
          })
          .filter((rule) => (rule.actions || []).length > 0);
        node.rules = nextRules;
      });
    });
  }

  function setSectionDisplayRule(
    pathway: WorkflowPathway,
    sectionSlug: string,
    sourceNodeCode: string,
    whenChoice: string,
  ) {
    clearSectionDisplayRules(pathway, sectionSlug);
    if (!sourceNodeCode || !whenChoice) return;
    for (const section of pathway.sections) {
      for (const node of section.nodes) {
        if (node.code !== sourceNodeCode) continue;
        const rules = node.rules || [];
        const existing = rules.find((r) => r.when_choice === whenChoice);
        const action = {
          type: "show_section",
          payload: { section_slug: sectionSlug },
        };
        if (existing) {
          existing.actions = [...(existing.actions || []), action];
        } else {
          rules.push({ when_choice: whenChoice, actions: [action] });
        }
        node.rules = rules;
        return;
      }
    }
  }

  /* -- API actions -------------------------------------------------- */
  const loadCurrent = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const payload = await adminExportWorkflows();
      setWorkflow(payload);
      setIsDirty(false);
      showToast("Current questionnaire loaded");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  /* Actually sends the import request (no confirmation check) */
  const doApply = useCallback(async () => {
    if (!workflow) {
      setError("No workflow loaded");
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      const resetRuntime = workflow.reset_runtime ?? true;
      await adminImportWorkflows(workflow);
      setIsDirty(false);
      onImported(resetRuntime);
      showToast("Questionnaire updated");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [workflow, onImported, showToast]);

  /* Checks for runtime data and shows confirmation if needed */
  const applyChanges = useCallback(async () => {
    if (!workflow) {
      setError("No workflow loaded");
      return;
    }
    const resetRuntime = workflow.reset_runtime ?? true;
    if (!resetRuntime) {
      // No runtime wipe — apply directly
      await doApply();
      return;
    }
    // Check if runtime data exists
    try {
      setIsLoading(true);
      const status = await adminRuntimeStatus();
      if (status.case_count > 0) {
        // Show confirmation dialog
        setConfirmApply({ caseCount: status.case_count, answerCount: status.answer_count });
      } else {
        // No runtime data — safe to apply
        await doApply();
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [workflow, doApply]);

  const confirmAndApply = useCallback(() => {
    setConfirmApply(null);
    void doApply();
  }, [doApply]);

  const cancelApply = useCallback(() => {
    setConfirmApply(null);
  }, []);

  useEffect(() => {
    if (!workflow) {
      void loadCurrent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* -- drawer ------------------------------------------------------- */
  const openDrawer = useCallback((state: DrawerState) => setDrawer(state), []);
  const closeDrawer = useCallback(() => setDrawer(null), []);

  /* -- value -------------------------------------------------------- */
  const value: WorkflowContextValue = {
    workflow,
    isLoading,
    error,
    isDirty,
    withWorkflow,
    loadCurrent,
    applyChanges,
    confirmApply,
    confirmAndApply,
    cancelApply,
    drawer,
    openDrawer,
    closeDrawer,
    makePathway,
    makeSection,
    makeNode,
    allSectionNodeOptions,
    getSectionDisplayRule,
    clearSectionDisplayRules,
    setSectionDisplayRule,
  };

  return <WorkflowCtx.Provider value={value}>{children}</WorkflowCtx.Provider>;
}
