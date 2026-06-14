import { useState } from "react";
import { Download, Eye, Package, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "./ConfirmDialog";
import { PackPreviewModal } from "./PackPreviewModal";
import { useWorkflow } from "./WorkflowContext";
import { adminImportPack } from "@/api";
import { CMS_PACKS, type CmsPackMeta } from "@/data/cmsQuestionPacks";

export function CmsPacksSection() {
  const { loadCurrent, workflow } = useWorkflow();
  const [previewPack, setPreviewPack] = useState<CmsPackMeta | null>(null);
  const [confirmPack, setConfirmPack] = useState<CmsPackMeta | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function isAlreadyImported(pack: CmsPackMeta): boolean {
    if (!workflow || !pack.payload) return false;
    const packSlug = pack.payload.pathways[0]?.slug;
    return workflow.pathways.some((p) => p.slug === packSlug);
  }

  async function handleImport(pack: CmsPackMeta) {
    if (!pack.payload) return;
    try {
      setIsImporting(true);
      setError(null);
      await adminImportPack(pack.payload);
      await loadCurrent();
      setConfirmPack(null);
    } catch (e) {
      setError((e as Error).message);
      setConfirmPack(null);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Section heading */}
      <div>
        <h3 className="text-[16px] font-semibold text-foreground flex items-center gap-2">
          <Package className="h-5 w-5 text-[#0077b6]" />
          CMS Question Packs
        </h3>
        <p className="text-[13px] text-muted-foreground mt-0.5">
          Import pre-built CMS Critical Element Pathway question sets with F-tag citations and branching logic
        </p>
      </div>

      {/* Pack cards grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {CMS_PACKS.map((pack) => {
          const imported = isAlreadyImported(pack);
          const comingSoon = pack.status === "coming_soon";

          return (
            <div
              key={pack.id}
              className={`rounded-lg border bg-white p-5 flex flex-col ${
                comingSoon ? "opacity-60 border-gray-200" : "border-gray-200"
              }`}
            >
              {/* Title + version */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="text-[14px] font-semibold text-gray-900 leading-tight">
                  {pack.name}
                </h4>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  v{pack.version}
                </Badge>
              </div>

              {/* Description */}
              <p className="text-[12px] text-gray-500 leading-relaxed mb-3 flex-1">
                {pack.description}
              </p>

              {/* Stats */}
              <div className="flex gap-4 text-[11px] text-gray-400 mb-3">
                <span>{pack.sectionCount} sections</span>
                <span>{pack.questionCount} questions</span>
                <span>{pack.fTags.length} F-tags</span>
              </div>

              {/* F-tag badges */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {pack.fTags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                  >
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 mt-auto">
                {comingSoon ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="gap-1.5 text-[12px]"
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Coming Soon
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-[12px]"
                      onClick={() => setPreviewPack(pack)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Preview
                    </Button>
                    <Button
                      size="sm"
                      className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5 text-[12px]"
                      disabled={imported || isImporting}
                      onClick={() => setConfirmPack(pack)}
                    >
                      <Download className="h-3.5 w-3.5" />
                      {imported ? "Imported" : "Import"}
                    </Button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Preview modal */}
      {previewPack && (
        <PackPreviewModal
          isOpen={!!previewPack}
          onClose={() => setPreviewPack(null)}
          pack={previewPack}
        />
      )}

      {/* Confirm import dialog */}
      <ConfirmDialog
        isOpen={!!confirmPack}
        title="Import CMS Question Pack?"
        message={
          confirmPack
            ? `This will add "${confirmPack.name}" as a new pathway with ${confirmPack.questionCount} questions and ${confirmPack.fTags.length} F-tag citations. Existing pathways will not be affected.`
            : ""
        }
        detail="The imported pathway will be set to Inactive by default. You can activate it later and wire it into a survey template when ready."
        confirmLabel="Import Pack"
        variant="primary"
        onConfirm={() => confirmPack && handleImport(confirmPack)}
        onCancel={() => setConfirmPack(null)}
      />
    </div>
  );
}
