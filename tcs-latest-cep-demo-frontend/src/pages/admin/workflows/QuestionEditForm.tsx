import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkflow, type WorkflowNode } from "./WorkflowContext";

type RuleAction = { type: string; payload: Record<string, unknown> };

const ACTION_TYPES: Array<{ value: string; label: string }> = [
  { value: "goto_question", label: "Go to a specific question" },
  { value: "add_flag", label: "Raise a flag" },
  { value: "add_citation", label: "Add citation (F-tag)" },
  { value: "recommend_pathway", label: "Trigger another CEP" },
  { value: "show_section", label: "Show a section" },
  { value: "require_evidence_min", label: "Require evidence" },
  { value: "require_note", label: "Require surveyor note" },
];

function defaultPayload(type: string): Record<string, unknown> {
  switch (type) {
    case "goto_question":
      return { target_node_code: "" };
    case "add_flag":
      return { code: "NEW_FLAG", message: "", severity: "warn" };
    case "add_citation":
      return { tag: "F600", rationale: "" };
    case "recommend_pathway":
      return { message: "" };
    case "show_section":
      return { section_slug: "" };
    case "require_evidence_min":
      return { min: 1, message: "" };
    case "require_note":
      return { min_length: 10, message: "" };
    default:
      return {};
  }
}

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-[13px] ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

export function QuestionEditForm({
  node,
  pathwayIndex,
  sectionIndex,
  questionIndex,
}: {
  node: WorkflowNode;
  pathwayIndex: number;
  sectionIndex: number;
  questionIndex: number;
}) {
  const { workflow, withWorkflow } = useWorkflow();

  const pathway = workflow?.pathways[pathwayIndex];
  const section = pathway?.sections[sectionIndex];

  const updateNode = (updater: (n: WorkflowNode) => void) => {
    withWorkflow((w) => {
      updater(w.pathways[pathwayIndex].sections[sectionIndex].nodes[questionIndex]);
    });
  };

  const rules = node.rules ?? [];

  /* -- rule mutations ------------------------------------------------ */
  function addRule() {
    updateNode((n) => {
      n.rules = [
        ...(n.rules ?? []),
        { when_choice: n.choices[n.choices.length - 1] ?? "No", actions: [] },
      ];
    });
  }

  function removeRule(rIdx: number) {
    updateNode((n) => {
      n.rules = (n.rules ?? []).filter((_, i) => i !== rIdx);
    });
  }

  function setRuleChoice(rIdx: number, choice: string) {
    updateNode((n) => {
      (n.rules ?? [])[rIdx].when_choice = choice;
    });
  }

  function addAction(rIdx: number) {
    updateNode((n) => {
      const rule = (n.rules ?? [])[rIdx];
      rule.actions = [...(rule.actions ?? []), { type: "add_flag", payload: defaultPayload("add_flag") }];
    });
  }

  function removeAction(rIdx: number, aIdx: number) {
    updateNode((n) => {
      const rule = (n.rules ?? [])[rIdx];
      rule.actions = (rule.actions ?? []).filter((_, i) => i !== aIdx);
    });
  }

  function setActionType(rIdx: number, aIdx: number, type: string) {
    updateNode((n) => {
      const action = (n.rules ?? [])[rIdx].actions[aIdx];
      action.type = type;
      action.payload = defaultPayload(type);
    });
  }

  function setActionPayload(rIdx: number, aIdx: number, key: string, value: unknown) {
    updateNode((n) => {
      const action = (n.rules ?? [])[rIdx].actions[aIdx];
      action.payload = { ...(action.payload ?? {}), [key]: value };
    });
  }

  /* -- questions after this one (targets for "go to question") -------- */
  const laterQuestions = (() => {
    if (!pathway) return [];
    const flat = pathway.sections.flatMap((s) => s.nodes);
    const currentIdx =
      pathway.sections.slice(0, sectionIndex).reduce((sum, s) => sum + s.nodes.length, 0) +
      questionIndex;
    return flat.slice(currentIdx + 1);
  })();

  /* -- per-type payload editors --------------------------------------- */
  function renderPayloadFields(rIdx: number, aIdx: number, action: RuleAction) {
    const p = action.payload ?? {};
    switch (action.type) {
      case "goto_question": {
        const currentSlug = pathway?.slug ?? "";
        const selectedSlug = String(p.pathway_slug ?? currentSlug);
        const isCross = selectedSlug !== currentSlug;
        const targetPathway = (workflow?.pathways ?? []).find((pw) => pw.slug === selectedSlug);
        const questionOptions = isCross
          ? (targetPathway?.sections ?? []).flatMap((s) => s.nodes)
          : laterQuestions;
        return (
          <div className="space-y-2">
            <select
              className={selectCls}
              value={selectedSlug}
              onChange={(e) => {
                setActionPayload(rIdx, aIdx, "pathway_slug", e.target.value);
                setActionPayload(rIdx, aIdx, "target_node_code", "");
              }}
            >
              {(workflow?.pathways ?? []).map((pw) => (
                <option key={pw.slug} value={pw.slug}>
                  {pw.title}{pw.slug === currentSlug ? " (this pathway)" : ""}
                </option>
              ))}
            </select>
            <select
              className={selectCls}
              value={String(p.target_node_code ?? "")}
              onChange={(e) => setActionPayload(rIdx, aIdx, "target_node_code", e.target.value)}
            >
              <option value="">Choose question…</option>
              {questionOptions.map((n) => (
                <option key={n.code} value={n.code}>
                  {n.code} — {n.prompt.slice(0, 70)}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-400">
              {isCross
                ? "Answering opens that pathway in a pop-up at the chosen question."
                : "Questions between this one and the target will be skipped."}
            </p>
          </div>
        );
      }
      case "add_flag":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              className="h-9 text-[13px]"
              placeholder="Flag code (e.g. CARE_FAIL)"
              value={String(p.code ?? "")}
              onChange={(e) => setActionPayload(rIdx, aIdx, "code", e.target.value)}
            />
            <Input
              className="h-9 text-[13px]"
              placeholder="Message shown to surveyor"
              value={String(p.message ?? "")}
              onChange={(e) => setActionPayload(rIdx, aIdx, "message", e.target.value)}
            />
          </div>
        );
      case "add_citation":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              className="h-9 text-[13px]"
              placeholder="F-tag (e.g. F684)"
              value={String(p.tag ?? "")}
              onChange={(e) => setActionPayload(rIdx, aIdx, "tag", e.target.value)}
            />
            <Input
              className="h-9 text-[13px]"
              placeholder="Rationale"
              value={String(p.rationale ?? "")}
              onChange={(e) => setActionPayload(rIdx, aIdx, "rationale", e.target.value)}
            />
          </div>
        );
      case "recommend_pathway": {
        const otherPathways = (workflow?.pathways ?? []).filter((_, i) => i !== pathwayIndex);
        return (
          <div className="grid grid-cols-2 gap-2">
            <select
              className={selectCls}
              value={String(p.pathway_slug ?? p.slug ?? "")}
              onChange={(e) => {
                const target = otherPathways.find((pw) => pw.slug === e.target.value);
                setActionPayload(rIdx, aIdx, "pathway_slug", e.target.value);
                if (target) {
                  setActionPayload(rIdx, aIdx, "message", `Initiate the ${target.title}`);
                }
              }}
            >
              <option value="">Choose CEP…</option>
              {otherPathways.map((pw) => (
                <option key={pw.slug} value={pw.slug}>
                  {pw.title}
                </option>
              ))}
            </select>
            <Input
              className="h-9 text-[13px]"
              placeholder="Recommendation message"
              value={String(p.message ?? "")}
              onChange={(e) => setActionPayload(rIdx, aIdx, "message", e.target.value)}
            />
          </div>
        );
      }
      case "show_section": {
        const sections = pathway?.sections ?? [];
        return (
          <select
            className={selectCls}
            value={String(p.section_slug ?? "")}
            onChange={(e) => setActionPayload(rIdx, aIdx, "section_slug", e.target.value)}
          >
            <option value="">Choose section…</option>
            {sections
              .filter((s) => s.slug !== section?.slug)
              .map((s) => (
                <option key={s.slug} value={s.slug}>
                  {s.title}
                </option>
              ))}
          </select>
        );
      }
      case "require_evidence_min":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              className="h-9 text-[13px]"
              type="number"
              min={1}
              placeholder="Min evidence items"
              value={Number(p.min ?? 1)}
              onChange={(e) => setActionPayload(rIdx, aIdx, "min", Number(e.target.value) || 1)}
            />
            <Input
              className="h-9 text-[13px]"
              placeholder="Message (what evidence is needed)"
              value={String(p.message ?? "")}
              onChange={(e) => setActionPayload(rIdx, aIdx, "message", e.target.value)}
            />
          </div>
        );
      case "require_note":
        return (
          <div className="grid grid-cols-2 gap-2">
            <Input
              className="h-9 text-[13px]"
              type="number"
              min={1}
              placeholder="Min length"
              value={Number(p.min_length ?? 10)}
              onChange={(e) => setActionPayload(rIdx, aIdx, "min_length", Number(e.target.value) || 10)}
            />
            <Input
              className="h-9 text-[13px]"
              placeholder="Message (what to document)"
              value={String(p.message ?? "")}
              onChange={(e) => setActionPayload(rIdx, aIdx, "message", e.target.value)}
            />
          </div>
        );
      default:
        return null;
    }
  }

  /* -- parent (follow-up) options: other questions in this section ----- */
  const parentOptions = (section?.nodes ?? []).filter((n) => n.code !== node.code && !n.parent_node_code);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Question Code
        </label>
        <Input
          value={node.code}
          onChange={(e) => updateNode((n) => { n.code = e.target.value; })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Node Type</label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          value={node.node_type || "question"}
          onChange={(e) => updateNode((n) => { n.node_type = e.target.value; })}
        >
          <option value="question">question</option>
          <option value="decision">decision</option>
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Question Prompt
        </label>
        <textarea
          className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          value={node.prompt}
          onChange={(e) => updateNode((n) => { n.prompt = e.target.value; })}
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Choices (comma separated)
        </label>
        <Input
          value={node.choices.join(", ")}
          onChange={(e) =>
            updateNode((n) => {
              n.choices = e.target.value
                .split(",")
                .map((x) => x.trim())
                .filter(Boolean);
            })
          }
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          Follow-up of (parent question)
        </label>
        <select
          className={selectCls}
          value={node.parent_node_code || ""}
          onChange={(e) =>
            updateNode((n) => {
              n.parent_node_code = e.target.value || null;
            })
          }
        >
          <option value="">None — always shown</option>
          {parentOptions.map((n) => (
            <option key={n.code} value={n.code}>
              {n.code} — {n.prompt.slice(0, 60)}
            </option>
          ))}
        </select>
        {node.parent_node_code && (
          <p className="text-[11px] text-gray-400">
            This question appears only when {node.parent_node_code} is answered "No".
          </p>
        )}
      </div>

      {/* Branching rules editor */}
      <div className="rounded-lg border border-gray-200 bg-gray-50/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-800">
            Branching Rules ({rules.length})
          </h4>
          <Button
            variant="outline"
            size="sm"
            className="h-7 gap-1 text-[12px]"
            onClick={addRule}
          >
            <Plus className="h-3 w-3" />
            Add Rule
          </Button>
        </div>

        {rules.length === 0 && (
          <p className="text-xs text-gray-400">
            No rules yet. Rules decide what happens when this question is answered —
            raise flags, add citations, trigger another CEP, or reveal sections.
          </p>
        )}

        {rules.map((rule, rIdx) => (
          <div key={rIdx} className="rounded-md border border-gray-200 bg-white p-3 space-y-2.5">
            {/* When answer = ... */}
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-gray-500 shrink-0">When answer is</span>
              <select
                className={`${selectCls} flex-1`}
                value={rule.when_choice}
                onChange={(e) => setRuleChoice(rIdx, e.target.value)}
              >
                {node.choices.map((ch) => (
                  <option key={ch} value={ch}>
                    {ch}
                  </option>
                ))}
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-gray-400 hover:text-red-600 shrink-0"
                onClick={() => removeRule(rIdx)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Actions */}
            <div className="space-y-2 pl-1">
              {(rule.actions ?? []).map((action, aIdx) => (
                <div key={aIdx} className="rounded border border-gray-100 bg-gray-50/80 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-500 shrink-0">then</span>
                    <select
                      className={`${selectCls} flex-1`}
                      value={action.type}
                      onChange={(e) => setActionType(rIdx, aIdx, e.target.value)}
                    >
                      {ACTION_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-gray-400 hover:text-red-600 shrink-0"
                      onClick={() => removeAction(rIdx, aIdx)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                  {renderPayloadFields(rIdx, aIdx, action as RuleAction)}
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-[12px] text-[#0077b6] hover:text-[#005f8a]"
                onClick={() => addAction(rIdx)}
              >
                <Plus className="h-3 w-3" />
                Add Action
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
