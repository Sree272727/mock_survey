import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FileUp, Loader2, Sparkles, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useWorkflow } from "./WorkflowContext";
import { adminExtractPdf, adminImportPack } from "@/api";
import type { PdfExtractResult } from "@/types";

/* ------------------------------------------------------------------ */
/*  Upload card — shown on the Workflow Builder index page              */
/* ------------------------------------------------------------------ */

export function PdfImportSection({
  asModal = false,
  onClose,
}: {
  asModal?: boolean;
  onClose?: () => void;
}) {
  const { loadCurrent } = useWorkflow();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [result, setResult] = useState<PdfExtractResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    if (!asModal) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isExtracting) onClose?.();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [asModal, onClose, isExtracting]);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Please choose a PDF file.");
      return;
    }
    try {
      setIsExtracting(true);
      setError(null);
      const extracted = await adminExtractPdf(file);
      setResult(extracted);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const inner = (
    <div className="space-y-4">
      <div>
        <h3 className="text-[16px] font-semibold text-foreground flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#0077b6]" />
          Create Pathway from PDF
        </h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Upload a CEP document and let AI extract the survey questions, sections, and branching rules — ready to review and edit
        </p>
      </div>

      <div
        className={`rounded-lg border-2 border-dashed p-8 flex flex-col items-center justify-center gap-3 transition-colors ${
          isDragOver ? "border-[#0077b6] bg-[#0077b6]/5" : "border-gray-200 bg-white"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const file = e.dataTransfer.files?.[0];
          if (file && !isExtracting) void handleFile(file);
        }}
      >
        {isExtracting ? (
          <>
            <Loader2 className="h-8 w-8 text-[#0077b6] animate-spin" />
            <p className="text-sm font-medium text-gray-700">Extracting questions from PDF…</p>
            <p className="text-xs text-gray-400">
              Reading the document, identifying sections, questions, and branching logic
            </p>
          </>
        ) : (
          <>
            <FileUp className="h-8 w-8 text-gray-300" />
            <p className="text-sm text-gray-600">
              Drag a CEP PDF here, or
              <button
                className="text-[#0077b6] font-medium hover:underline ml-1"
                onClick={() => fileInputRef.current?.click()}
              >
                browse files
              </button>
            </p>
            <p className="text-xs text-gray-400">
              e.g. General CEP, Neglect CEP, Infection Control CEP
            </p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
          }}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );

  const preview = result && (
    <ExtractionPreviewModal
      result={result}
      onClose={() => setResult(null)}
      onImported={async () => {
        setResult(null);
        await loadCurrent();
        onClose?.();
      }}
    />
  );

  if (!asModal) {
    return (
      <>
        {inner}
        {preview}
      </>
    );
  }

  return (
    <>
      {createPortal(
        <>
          <div className="fixed inset-0 z-50 bg-black/40" onClick={() => !isExtracting && onClose?.()} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full pointer-events-auto">
              <div className="flex items-center justify-end px-4 pt-3">
                <button
                  onClick={() => !isExtracting && onClose?.()}
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-6 pb-6 -mt-1">{inner}</div>
            </div>
          </div>
        </>,
        document.body,
      )}
      {preview}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview & confirm modal                                             */
/* ------------------------------------------------------------------ */

function ExtractionPreviewModal({
  result,
  onClose,
  onImported,
}: {
  result: PdfExtractResult;
  onClose: () => void;
  onImported: () => Promise<void>;
}) {
  const pathwayInit = result.payload.pathways[0];
  const [title, setTitle] = useState(pathwayInit?.title ?? "");
  const [slug, setSlug] = useState(pathwayInit?.slug ?? "");
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  if (!pathwayInit) return null;

  async function handleImport() {
    try {
      setIsImporting(true);
      setError(null);
      const payload = {
        ...result.payload,
        pathways: [{ ...pathwayInit, title: title.trim() || pathwayInit.title, slug: slug.trim() || pathwayInit.slug }],
        reset_runtime: false,
      };
      await adminImportPack(payload);
      await onImported();
    } catch (e) {
      setError((e as Error).message);
      setIsImporting(false);
    }
  }

  return createPortal(
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white rounded-xl shadow-xl max-w-3xl w-full flex flex-col pointer-events-auto"
          style={{ maxHeight: "85vh" }}
        >
          {/* Header */}
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                Extracted from {result.filename}
              </h3>
              {result.source === "openai" ? (
                <Badge className="bg-[#0077b6]/10 text-[#0077b6] border-0 text-xs gap-1 shrink-0">
                  <Sparkles className="h-3 w-3" />
                  AI Extracted
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs shrink-0">
                  Text Parser
                </Badge>
              )}
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
            {result.warning && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700">{result.warning}</p>
              </div>
            )}

            {/* Stats */}
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span>
                <strong className="text-gray-700">{result.pages}</strong> page{result.pages !== 1 ? "s" : ""}
              </span>
              <span>
                <strong className="text-gray-700">{result.section_count}</strong> sections
              </span>
              <span>
                <strong className="text-gray-700">{result.question_count}</strong> questions
              </span>
            </div>

            {/* Editable pathway identity */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Pathway Title</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">Slug</label>
                <Input value={slug} onChange={(e) => setSlug(e.target.value)} />
              </div>
            </div>

            {/* Sections & questions */}
            {pathwayInit.sections.map((section, sIdx) => (
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
                    const ruleBadges = (node.rules ?? []).flatMap((r) =>
                      r.actions.map((a) => {
                        const p = (a.payload ?? {}) as Record<string, unknown>;
                        switch (a.type) {
                          case "add_citation":
                            return { key: `${r.when_choice}-${a.type}-${p.tag}`, label: String(p.tag || "Citation"), cls: "bg-amber-50 text-amber-700 border-amber-200" };
                          case "add_flag":
                            return { key: `${r.when_choice}-${a.type}-${p.code}`, label: "Flag", cls: "bg-orange-50 text-orange-600 border-orange-200" };
                          case "recommend_pathway":
                            return { key: `${r.when_choice}-${a.type}`, label: "Triggers CEP", cls: "bg-purple-50 text-purple-700 border-purple-200" };
                          case "show_section":
                            return { key: `${r.when_choice}-${a.type}-${p.section_slug}`, label: `Shows: ${p.section_slug}`, cls: "bg-blue-50 text-blue-700 border-blue-200" };
                          case "goto_question":
                            return { key: `${r.when_choice}-${a.type}-${p.target_node_code}`, label: `${r.when_choice} → Go to ${p.target_node_code}`, cls: "bg-indigo-50 text-indigo-700 border-indigo-200" };
                          default:
                            return { key: `${r.when_choice}-${a.type}`, label: a.type, cls: "bg-gray-50 text-gray-600 border-gray-200" };
                        }
                      }),
                    );
                    return (
                      <div
                        key={node.code}
                        className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-3"
                      >
                        <span className="shrink-0 h-5 w-5 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-[10px] font-bold mt-0.5">
                          {nIdx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] text-gray-700 leading-relaxed">{node.prompt}</p>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {node.choices.map((ch) => (
                              <Badge key={ch} variant="outline" className="text-[10px] bg-white text-gray-500">
                                {ch}
                              </Badge>
                            ))}
                            {node.parent_node_code && (
                              <Badge className="text-[10px] bg-sky-50 text-sky-700 border-sky-200">
                                Follow-up of {node.parent_node_code}
                              </Badge>
                            )}
                            {ruleBadges.map((b) => (
                              <Badge key={b.key} className={`text-[10px] ${b.cls}`}>
                                {b.label}
                              </Badge>
                            ))}
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
          <div className="shrink-0 flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <p className="text-xs text-gray-400">
              You can edit questions, sections, and rules after import.
            </p>
            <div className="flex items-center gap-2">
              {error && <p className="text-xs text-red-600 mr-2">{error}</p>}
              <Button variant="outline" onClick={onClose} disabled={isImporting}>
                Discard
              </Button>
              <Button
                className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
                onClick={handleImport}
                disabled={isImporting}
              >
                {isImporting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Import as Pathway
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
