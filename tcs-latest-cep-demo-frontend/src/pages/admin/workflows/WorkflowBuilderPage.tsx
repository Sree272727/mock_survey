import { Outlet, Link, useParams } from "react-router-dom";
import { ChevronRight, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkflowProvider, useWorkflow } from "./WorkflowContext";
import { SideDrawer } from "./SideDrawer";
import { ConfirmDialog } from "./ConfirmDialog";
import { PathwayEditForm } from "./PathwayEditForm";
import { SectionEditForm } from "./SectionEditForm";
import { QuestionEditForm } from "./QuestionEditForm";

/* ------------------------------------------------------------------ */
/*  Inner layout (needs context)                                        */
/* ------------------------------------------------------------------ */

function WorkflowBuilderInner() {
  const {
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
    closeDrawer,
  } = useWorkflow();

  const { pathwayIdx, sectionIdx } = useParams<{
    pathwayIdx: string;
    sectionIdx: string;
  }>();

  const pIdx = pathwayIdx !== undefined ? Number(pathwayIdx) : undefined;
  const sIdx = sectionIdx !== undefined ? Number(sectionIdx) : undefined;

  // Save bar is hidden on the pathways list (home) when there are no pending
  // edits — Add / Delete / Upload all persist immediately. It appears on the
  // deeper editing views, or whenever there are unsaved drawer edits to apply.
  const onHome = pIdx === undefined;
  const showSaveBar = !onHome || isDirty;

  /* -- breadcrumbs -------------------------------------------------- */
  const crumbs: Array<{ label: string; to?: string }> = [
    { label: "Workflows", to: "/app/admin/workflows" },
  ];

  if (pIdx !== undefined && workflow?.pathways[pIdx]) {
    crumbs.push({
      label: workflow.pathways[pIdx].title || `Pathway ${pIdx + 1}`,
      to: `/app/admin/workflows/${pIdx}`,
    });

    if (sIdx !== undefined && workflow.pathways[pIdx].sections[sIdx]) {
      crumbs.push({
        label:
          workflow.pathways[pIdx].sections[sIdx].title ||
          `Section ${sIdx + 1}`,
      });
    }
  }

  /* -- drawer content ----------------------------------------------- */
  let drawerTitle = "";
  let drawerContent: React.ReactNode = null;

  if (drawer && workflow) {
    const pw = workflow.pathways[drawer.pathwayIndex];
    if (drawer.level === "pathway" && pw) {
      drawerTitle = "Edit Pathway";
      drawerContent = (
        <PathwayEditForm
          pathway={pw}
          pathwayIndex={drawer.pathwayIndex}
        />
      );
    } else if (
      drawer.level === "section" &&
      pw &&
      drawer.sectionIndex !== undefined
    ) {
      const sec = pw.sections[drawer.sectionIndex];
      if (sec) {
        drawerTitle = "Edit Section";
        drawerContent = (
          <SectionEditForm
            pathway={pw}
            section={sec}
            pathwayIndex={drawer.pathwayIndex}
            sectionIndex={drawer.sectionIndex}
          />
        );
      }
    } else if (
      drawer.level === "question" &&
      pw &&
      drawer.sectionIndex !== undefined &&
      drawer.questionIndex !== undefined
    ) {
      const sec = pw.sections[drawer.sectionIndex];
      const node = sec?.nodes[drawer.questionIndex];
      if (node) {
        drawerTitle = "Edit Question";
        drawerContent = (
          <QuestionEditForm
            node={node}
            pathwayIndex={drawer.pathwayIndex}
            sectionIndex={drawer.sectionIndex}
            questionIndex={drawer.questionIndex}
          />
        );
      }
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[26px] font-bold text-foreground tracking-tight">
            Workflow Builder
          </h2>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            Manage pathways, sections, questions, and branching logic
          </p>
        </div>
        {showSaveBar && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="gap-1.5"
              disabled={isLoading}
              onClick={() => void loadCurrent()}
            >
              <RotateCcw className="h-4 w-4" />
              Discard Changes
            </Button>
            <Button
              className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
              disabled={isLoading || !workflow}
              onClick={() => void applyChanges()}
            >
              <Save className="h-4 w-4" />
              Apply Changes
            </Button>
          </div>
        )}
      </div>

      {isLoading && (
        <p className="text-sm text-muted-foreground">Processing...</p>
      )}

      {/* Breadcrumbs */}
      {crumbs.length > 1 && (
        <nav className="flex items-center gap-1 text-sm">
          {crumbs.map((crumb, i) => {
            const isLast = i === crumbs.length - 1;
            return (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                )}
                {isLast || !crumb.to ? (
                  <span className="text-gray-900 font-medium">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    to={crumb.to}
                    className="text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            );
          })}
        </nav>
      )}

      {/* Child route content */}
      <Outlet />

      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}

      {/* Side drawer */}
      <SideDrawer
        isOpen={!!drawer}
        onClose={closeDrawer}
        title={drawerTitle}
      >
        {drawerContent}
      </SideDrawer>

      {/* Runtime data wipe confirmation */}
      <ConfirmDialog
        isOpen={!!confirmApply}
        title="Delete all survey data?"
        message={
          confirmApply
            ? `Applying with "Reset runtime" enabled will permanently delete ${confirmApply.caseCount} case${confirmApply.caseCount !== 1 ? "s" : ""} and ${confirmApply.answerCount} answer${confirmApply.answerCount !== 1 ? "s" : ""}. This cannot be undone.`
            : ""
        }
        detail="All existing cases, answers, flags, citations, and events will be removed."
        confirmLabel="Delete Data & Apply"
        onConfirm={confirmAndApply}
        onCancel={cancelApply}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exported page (wraps with provider)                                 */
/* ------------------------------------------------------------------ */
export default function WorkflowBuilderPage({
  onImported,
  showToast,
}: {
  onImported: (resetRuntime: boolean) => void;
  showToast: (msg: string) => void;
}) {
  return (
    <WorkflowProvider onImported={onImported} showToast={showToast}>
      <WorkflowBuilderInner />
    </WorkflowProvider>
  );
}
