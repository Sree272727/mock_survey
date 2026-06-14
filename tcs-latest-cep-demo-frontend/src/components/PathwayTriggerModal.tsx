import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, GitBranch, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCasePathwaySnapshot, getPathway, submitAnswer } from "@/api";
import type { CasePathwaySnapshot, Node, PathwayDefinition } from "@/types";

/* ------------------------------------------------------------------ */
/*  Pop-up runner for a triggered CEP.                                  */
/*  Renders the triggered pathway's questions for the SAME case in a   */
/*  modal. If a question inside triggers yet another CEP, it pushes    */
/*  onto the stack; completing/closing pops back to where you were.    */
/* ------------------------------------------------------------------ */

export function PathwayTriggerModal({
  caseId,
  initialSlug,
  highlightCode,
  onClose,
}: {
  caseId: string;
  initialSlug: string;
  highlightCode?: string;
  onClose: () => void;
}) {
  const [stack, setStack] = useState<string[]>([initialSlug]);
  const top = stack[stack.length - 1];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  function pop() {
    if (stack.length <= 1) {
      onClose();
    } else {
      setStack((s) => s.slice(0, -1));
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-gray-50 rounded-xl shadow-2xl max-w-3xl w-full flex flex-col pointer-events-auto"
          style={{ maxHeight: "88vh" }}
        >
          <ModalPathwayRunner
            key={top}
            caseId={caseId}
            slug={top}
            highlightCode={stack.length === 1 ? highlightCode : undefined}
            depth={stack.length}
            breadcrumb={stack}
            onTrigger={(slug) => {
              // avoid pushing a pathway already in the stack (loop guard)
              setStack((s) => (s.includes(slug) ? s : [...s, slug]));
            }}
            onBack={pop}
            onCloseAll={onClose}
          />
        </div>
      </div>
    </>,
    document.body,
  );
}

/* ------------------------------------------------------------------ */
/*  One pathway's questions inside the modal                            */
/* ------------------------------------------------------------------ */

function ModalPathwayRunner({
  caseId,
  slug,
  highlightCode,
  depth,
  breadcrumb,
  onTrigger,
  onBack,
  onCloseAll,
}: {
  caseId: string;
  slug: string;
  highlightCode?: string;
  depth: number;
  breadcrumb: string[];
  onTrigger: (slug: string) => void;
  onBack: () => void;
  onCloseAll: () => void;
}) {
  const [definition, setDefinition] = useState<PathwayDefinition | null>(null);
  const [snapshot, setSnapshot] = useState<CasePathwaySnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [innerRecommend, setInnerRecommend] = useState<{ message: string; slug: string | null } | null>(null);
  const [lastEffects, setLastEffects] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    const [def, snap] = await Promise.all([
      getPathway(slug),
      getCasePathwaySnapshot(caseId, slug),
    ]);
    setDefinition(def);
    setSnapshot(snap);
  }, [caseId, slug]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    refresh()
      .catch((e) => setError((e as Error).message))
      .finally(() => setIsLoading(false));
  }, [refresh]);

  const answersMap = useMemo(() => {
    const m = new Map<string, string>();
    snapshot?.answers.forEach((a) => {
      if (a.choice_label) m.set(a.node_id, a.choice_label);
    });
    return m;
  }, [snapshot]);

  /* visibility: same conventions as the main runtime — sub-questions
     show when parent = "No"; goto_question rules skip in-between */
  const flatNodes = useMemo(
    () => definition?.sections.flatMap((s) => s.nodes) ?? [],
    [definition],
  );

  const skippedIds = useMemo(() => {
    const skipped = new Set<string>();
    const indexByCode = new Map(flatNodes.map((n, i) => [n.code, i] as const));
    flatNodes.forEach((node, i) => {
      const answer = answersMap.get(node.id);
      if (!answer) return;
      for (const rule of node.rules ?? []) {
        if (rule.when_choice !== answer) continue;
        for (const action of rule.actions ?? []) {
          if (action.type !== "goto_question") continue;
          const j = indexByCode.get(String((action.payload ?? {}).target_node_code || ""));
          if (j === undefined || j <= i + 1) continue;
          for (let k = i + 1; k < j; k++) skipped.add(flatNodes[k].id);
        }
      }
    });
    return skipped;
  }, [flatNodes, answersMap]);

  const isVisible = useCallback(
    (node: Node): boolean => {
      if (skippedIds.has(node.id)) return false;
      if (!node.parent_node_code) return true;
      const parent = flatNodes.find((n) => n.code === node.parent_node_code);
      return !!parent && answersMap.get(parent.id) === "No";
    },
    [skippedIds, flatNodes, answersMap],
  );

  const visibleNodes = useMemo(() => flatNodes.filter(isVisible), [flatNodes, isVisible]);
  const answeredCount = visibleNodes.filter((n) => answersMap.has(n.id)).length;
  const allAnswered = visibleNodes.length > 0 && answeredCount === visibleNodes.length;

  async function answer(node: Node, choiceId: string) {
    try {
      setIsSubmitting(true);
      setError(null);
      const res = await submitAnswer(caseId, {
        pathway_slug: slug,
        node_id: node.id,
        choice_id: choiceId,
      });
      const effects: string[] = [
        ...res.flags_created.map((f) => `Flag: ${f}`),
        ...res.citations_created.map((c) => `Citation: ${c}`),
      ];
      setLastEffects(effects);
      if (res.recommendation && res.recommendation_slug && res.recommendation_slug !== slug) {
        setInnerRecommend({ message: res.recommendation, slug: res.recommendation_slug });
      }
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const title = definition?.title || slug;

  return (
    <>
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-gray-200 bg-white rounded-t-xl flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-purple-600 shrink-0" />
            <h3 className="text-[16px] font-semibold text-gray-900 truncate">{title}</h3>
            <Badge className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] shrink-0">
              Triggered CEP
            </Badge>
          </div>
          {/* Breadcrumb of the stack */}
          <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-400 flex-wrap">
            <span>Current survey</span>
            {breadcrumb.map((s, i) => (
              <span key={s} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" />
                <span className={i === breadcrumb.length - 1 ? "text-purple-600 font-medium" : ""}>{s}</span>
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[11px] text-gray-400 mr-2">
            {answeredCount}/{visibleNodes.length} answered
          </span>
          <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600" onClick={onCloseAll}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
        {isLoading && (
          <div className="flex items-center gap-2 text-sm text-gray-500 py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading pathway…
          </div>
        )}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Side effects of the last answer */}
        {lastEffects.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {lastEffects.map((e) => (
              <Badge key={e} className="bg-amber-50 text-amber-700 border-amber-200 text-[10px]">
                {e}
              </Badge>
            ))}
          </div>
        )}

        {/* Nested trigger banner */}
        {innerRecommend && (
          <div className="rounded-lg border border-purple-200 bg-purple-50 p-4 space-y-2">
            <p className="text-[13px] font-semibold text-purple-800">Another pathway triggered</p>
            <p className="text-[12px] text-purple-700">{innerRecommend.message}</p>
            <div className="flex gap-2">
              {innerRecommend.slug && (
                <Button
                  size="sm"
                  className="bg-purple-600 hover:bg-purple-700 text-white text-[12px]"
                  onClick={() => {
                    onTrigger(innerRecommend.slug!);
                    setInnerRecommend(null);
                  }}
                >
                  Open {innerRecommend.slug}
                </Button>
              )}
              <Button size="sm" variant="ghost" className="text-[12px]" onClick={() => setInnerRecommend(null)}>
                Later
              </Button>
            </div>
          </div>
        )}

        {/* Questions by section */}
        {definition?.sections.map((section) => {
          const sectionVisible = section.nodes.filter(isVisible);
          if (sectionVisible.length === 0) return null;
          return (
            <div key={section.id} className="space-y-2">
              <h4 className="text-[12px] font-semibold uppercase tracking-wide text-gray-400">
                {section.title}
              </h4>
              {sectionVisible.map((node) => {
                const current = answersMap.get(node.id);
                const isSub = !!node.parent_node_code;
                const isTarget = !!highlightCode && node.code === highlightCode;
                return (
                  <div
                    key={node.id}
                    ref={
                      isTarget
                        ? (el) => {
                            el?.scrollIntoView({ block: "center" });
                          }
                        : undefined
                    }
                    className={`bg-white rounded-lg border px-4 py-3 ${
                      isSub ? "ml-6 border-l-4 border-l-sky-300" : "border-gray-200"
                    } ${isTarget ? "ring-2 ring-purple-400 border-purple-300" : ""}`}
                  >
                    {isTarget && (
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200 text-[10px] mb-1.5">
                        Jumped here from the previous form
                      </Badge>
                    )}
                    <p className="text-[13px] text-gray-800 leading-relaxed mb-2">{node.prompt}</p>
                    <div className="flex gap-2 flex-wrap">
                      {node.choices.map((ch) => (
                        <Button
                          key={ch.id}
                          size="sm"
                          variant={current === ch.label ? "default" : "outline"}
                          disabled={isSubmitting}
                          className={
                            current === ch.label
                              ? "bg-[#0077b6] hover:bg-[#005f8a] text-white text-[12px] h-8"
                              : "text-[12px] h-8"
                          }
                          onClick={() => void answer(node, ch.id)}
                        >
                          {ch.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-4 border-t border-gray-200 bg-white rounded-b-xl flex items-center justify-between">
        <p className="text-[11px] text-gray-400">
          Answers are saved to this survey as you click.
        </p>
        <Button
          className={`gap-1.5 ${allAnswered ? "bg-emerald-600 hover:bg-emerald-700 text-white" : ""}`}
          variant={allAnswered ? "default" : "outline"}
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
          {allAnswered ? "Done — return to previous form" : depth > 1 ? "Back" : "Return to previous form"}
        </Button>
      </div>
    </>
  );
}
