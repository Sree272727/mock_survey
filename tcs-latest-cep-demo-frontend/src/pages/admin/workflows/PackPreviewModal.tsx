import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CmsPackMeta } from "@/data/cmsQuestionPacks";

interface PackPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pack: CmsPackMeta;
}

export function PackPreviewModal({ isOpen, onClose, pack }: PackPreviewModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !pack.payload) return null;

  const pathway = pack.payload.pathways[0];
  if (!pathway) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full flex flex-col" style={{ maxHeight: "80vh" }}>
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-gray-900">{pack.name}</h3>
              <Badge variant="secondary" className="text-xs">
                v{pack.version}
              </Badge>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            {/* Summary stats */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>
                <strong className="text-gray-700">{pathway.sections.length}</strong> sections
              </span>
              <span>
                <strong className="text-gray-700">
                  {pathway.sections.reduce((s, sec) => s + sec.nodes.length, 0)}
                </strong>{" "}
                questions
              </span>
              <span>
                <strong className="text-gray-700">{pack.fTags.length}</strong> F-tags
              </span>
            </div>

            {/* F-tag badges */}
            <div className="flex flex-wrap gap-2">
              {pack.fTags.map((tag) => (
                <Badge key={tag} className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* Sections & questions */}
            {pathway.sections.map((section, sIdx) => (
              <div key={section.slug} className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-[14px] font-semibold text-gray-800">
                    {sIdx + 1}. {section.title}
                  </h4>
                  <Badge variant="outline" className="text-[10px] text-gray-500">
                    {section.nodes.length} question{section.nodes.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                <div className="space-y-2 ml-2">
                  {section.nodes.map((node, nIdx) => {
                    // Extract F-tags from citation rules
                    const citations =
                      node.rules
                        ?.flatMap((r) => r.actions)
                        .filter((a) => a.type === "add_citation")
                        .map((a) => (a.payload as Record<string, string>).tag) ?? [];

                    const hasFlags =
                      node.rules?.some((r) =>
                        r.actions.some((a) => a.type === "add_flag"),
                      ) ?? false;

                    return (
                      <div
                        key={node.code}
                        className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3"
                      >
                        <span className="shrink-0 h-5 w-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {nIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-700 leading-relaxed">
                            {node.prompt}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {/* Choices */}
                            {node.choices.map((ch) => (
                              <Badge
                                key={ch}
                                variant="outline"
                                className="text-[10px] bg-white text-gray-500"
                              >
                                {ch}
                              </Badge>
                            ))}

                            {/* Node type */}
                            {node.node_type === "decision" && (
                              <Badge className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                Decision
                              </Badge>
                            )}

                            {/* Citations */}
                            {citations.map((tag) => (
                              <Badge
                                key={tag}
                                className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                              >
                                {tag}
                              </Badge>
                            ))}

                            {/* Flag indicator */}
                            {hasFlags && citations.length === 0 && (
                              <Badge className="text-[10px] bg-orange-50 text-orange-600 border-orange-200">
                                Flag
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="shrink-0 flex justify-end px-6 py-4 border-t border-gray-200">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
