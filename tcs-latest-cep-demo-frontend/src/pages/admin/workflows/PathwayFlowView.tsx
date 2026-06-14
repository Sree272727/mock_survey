import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X, Flag, FileWarning, GitBranch, Eye, CornerDownRight, ArrowDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WorkflowPathway, WorkflowNode } from "./WorkflowContext";

/* ------------------------------------------------------------------ */
/*  Read-only decision-tree visualization of one pathway               */
/* ------------------------------------------------------------------ */

function RuleChips({ node, pathwaySlug }: { node: WorkflowNode; pathwaySlug?: string }) {
  const chips: Array<{ key: string; icon: React.ReactNode; text: string; cls: string }> = [];
  (node.rules ?? []).forEach((rule, rIdx) => {
    (rule.actions ?? []).forEach((action, aIdx) => {
      const p = (action.payload ?? {}) as Record<string, unknown>;
      const key = `${rIdx}-${aIdx}`;
      switch (action.type) {
        case "add_flag":
          chips.push({
            key,
            icon: <Flag className="h-3 w-3" />,
            text: `${rule.when_choice} → Flag: ${String(p.code || "FLAG")}`,
            cls: "bg-orange-50 text-orange-700 border-orange-200",
          });
          break;
        case "add_citation":
          chips.push({
            key,
            icon: <FileWarning className="h-3 w-3" />,
            text: `${rule.when_choice} → Cite ${String(p.tag || "F-tag")}`,
            cls: "bg-amber-50 text-amber-700 border-amber-200",
          });
          break;
        case "recommend_pathway":
          chips.push({
            key,
            icon: <GitBranch className="h-3 w-3" />,
            text: `${rule.when_choice} → ${String(p.message || "Trigger another CEP")}`,
            cls: "bg-purple-50 text-purple-700 border-purple-200",
          });
          break;
        case "show_section":
          chips.push({
            key,
            icon: <Eye className="h-3 w-3" />,
            text: `${rule.when_choice} → Show section: ${String(p.section_slug || "?")}`,
            cls: "bg-blue-50 text-blue-700 border-blue-200",
          });
          break;
        case "goto_question": {
          const targetPathway = String(p.pathway_slug || "");
          const isCross = !!targetPathway && targetPathway !== pathwaySlug;
          chips.push({
            key,
            icon: <CornerDownRight className="h-3 w-3" />,
            text: isCross
              ? `${rule.when_choice} → Go to ${targetPathway} : ${String(p.target_node_code || "?")}`
              : `${rule.when_choice} → Go to ${String(p.target_node_code || "?")} (skip in-between)`,
            cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
          });
          break;
        }
        case "require_evidence_min":
          chips.push({
            key,
            icon: <FileWarning className="h-3 w-3" />,
            text: `${rule.when_choice} → Evidence required (min ${Number(p.min ?? 1)})`,
            cls: "bg-teal-50 text-teal-700 border-teal-200",
          });
          break;
        case "require_note":
          chips.push({
            key,
            icon: <FileWarning className="h-3 w-3" />,
            text: `${rule.when_choice} → Note required`,
            cls: "bg-teal-50 text-teal-700 border-teal-200",
          });
          break;
      }
    });
  });

  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {chips.map((c) => (
        <Badge key={c.key} className={`text-[10px] gap-1 font-normal border ${c.cls}`}>
          {c.icon}
          {c.text}
        </Badge>
      ))}
    </div>
  );
}

function QuestionCard({
  node,
  index,
  isSub,
  pathwaySlug,
}: {
  node: WorkflowNode;
  index: string;
  isSub?: boolean;
  pathwaySlug?: string;
}) {
  return (
    <div
      className={`rounded-lg border bg-white px-4 py-3 shadow-sm ${
        isSub ? "border-sky-200" : "border-gray-200"
      }`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`shrink-0 h-6 min-w-6 px-1 rounded-full flex items-center justify-center text-[11px] font-bold mt-0.5 ${
            isSub ? "bg-sky-100 text-sky-700" : "bg-[#0077b6]/10 text-[#0077b6]"
          }`}
        >
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] text-gray-800 leading-relaxed">{node.prompt}</p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="text-[10px] text-gray-400 font-mono">{node.code}</span>
            {node.choices.map((ch) => (
              <Badge key={ch} variant="outline" className="text-[10px] bg-gray-50 text-gray-500">
                {ch}
              </Badge>
            ))}
          </div>
          <RuleChips node={node} pathwaySlug={pathwaySlug} />
        </div>
      </div>
    </div>
  );
}

export function PathwayFlowView({
  pathway,
  onClose,
}: {
  pathway: WorkflowPathway;
  onClose: () => void;
}) {
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

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-gray-50 rounded-xl shadow-xl max-w-4xl w-full flex flex-col pointer-events-auto"
          style={{ maxHeight: "88vh" }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white rounded-t-xl">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-[#0077b6]" />
                {pathway.title} — Decision Flow
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                How questions branch: follow-ups, flags, citations, triggered CEPs, and revealed sections
              </p>
            </div>
            <Button variant="ghost" size="icon" className="text-gray-400 hover:text-gray-600" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="shrink-0 flex items-center gap-3 px-6 py-2.5 border-b border-gray-200 bg-white flex-wrap">
            <Badge className="text-[10px] gap-1 bg-sky-50 text-sky-700 border border-sky-200 font-normal">
              <CornerDownRight className="h-3 w-3" /> Follow-up question
            </Badge>
            <Badge className="text-[10px] gap-1 bg-orange-50 text-orange-700 border border-orange-200 font-normal">
              <Flag className="h-3 w-3" /> Flag
            </Badge>
            <Badge className="text-[10px] gap-1 bg-amber-50 text-amber-700 border border-amber-200 font-normal">
              <FileWarning className="h-3 w-3" /> Citation
            </Badge>
            <Badge className="text-[10px] gap-1 bg-purple-50 text-purple-700 border border-purple-200 font-normal">
              <GitBranch className="h-3 w-3" /> Triggers another CEP
            </Badge>
            <Badge className="text-[10px] gap-1 bg-blue-50 text-blue-700 border border-blue-200 font-normal">
              <Eye className="h-3 w-3" /> Reveals section
            </Badge>
          </div>

          {/* Flow body */}
          <div className="flex-1 overflow-y-auto px-8 py-6">
            {pathway.sections.map((section, sIdx) => {
              const mainNodes = section.nodes.filter((n) => !n.parent_node_code);
              return (
                <div key={section.slug}>
                  {/* Section header */}
                  <div className="flex items-center gap-3 mb-3">
                    <span className="h-7 w-7 rounded-lg bg-[#0077b6] text-white flex items-center justify-center text-[12px] font-bold">
                      {sIdx + 1}
                    </span>
                    <h4 className="text-[14px] font-semibold text-gray-800">{section.title}</h4>
                    <span className="text-[11px] text-gray-400">
                      {section.nodes.length} question{section.nodes.length !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Questions with connector line */}
                  <div className="ml-3.5 border-l-2 border-gray-200 pl-6 space-y-3 pb-2">
                    {mainNodes.map((node, nIdx) => {
                      const subNodes = section.nodes.filter(
                        (n) => n.parent_node_code === node.code,
                      );
                      return (
                        <div key={node.code} className="relative">
                          {/* connector dot */}
                          <span className="absolute -left-[31px] top-4 h-2.5 w-2.5 rounded-full bg-gray-300 border-2 border-gray-50" />
                          <QuestionCard node={node} index={`${sIdx + 1}.${nIdx + 1}`} pathwaySlug={pathway.slug} />

                          {/* Sub-questions */}
                          {subNodes.length > 0 && (
                            <div className="mt-2 ml-8 space-y-2">
                              <p className="text-[11px] text-sky-600 flex items-center gap-1">
                                <CornerDownRight className="h-3 w-3" />
                                Asked only when answered "No"
                              </p>
                              {subNodes.map((sub, subIdx) => (
                                <QuestionCard
                                  key={sub.code}
                                  node={sub}
                                  index={`${sIdx + 1}.${nIdx + 1}.${subIdx + 1}`}
                                  isSub
                                  pathwaySlug={pathway.slug}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Arrow between sections */}
                  {sIdx < pathway.sections.length - 1 && (
                    <div className="flex items-center gap-2 my-4 ml-1">
                      <ArrowDown className="h-4 w-4 text-gray-300" />
                      <span className="text-[11px] text-gray-300">continues to next section</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
