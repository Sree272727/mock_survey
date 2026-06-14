import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, Loader2, ChevronDown, FilePlus2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { useWorkflow } from "./WorkflowContext";
import { useFilteredPaginated } from "./useFilteredPaginated";
import { CmsPacksSection } from "./CmsPacksSection";
import { PdfImportSection } from "./PdfImportSection";
import { ConfirmDialog } from "./ConfirmDialog";
import { adminDeletePathway, adminImportPack } from "@/api";

export function PathwaysTable() {
  const { workflow, makePathway, openDrawer, loadCurrent } = useWorkflow();
  const navigate = useNavigate();

  const [confirmDelete, setConfirmDelete] = useState<{ title: string; slug: string; idx: number } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [pendingOpenSlug, setPendingOpenSlug] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const pathways = workflow?.pathways ?? [];

  // After a freshly-added pathway is persisted and reloaded, open its editor.
  useEffect(() => {
    if (!pendingOpenSlug || !workflow) return;
    const idx = workflow.pathways.findIndex((p) => p.slug === pendingOpenSlug);
    if (idx >= 0) {
      openDrawer({ level: "pathway", pathwayIndex: idx });
      setPendingOpenSlug(null);
    }
  }, [pendingOpenSlug, workflow, openDrawer]);

  const searchFields = useCallback(
    (p: (typeof pathways)[number]) => [p.title, p.slug],
    [],
  );

  const { search, setSearch, page, setPage, paged, totalPages, totalFiltered, pageSize } =
    useFilteredPaginated({ items: pathways, searchFields });

  async function handleAdd() {
    const seed = Date.now();
    const newPathway = makePathway(seed);
    try {
      setIsAdding(true);
      setAddError(null);
      // Persist immediately (additive — leaves other pathways untouched), then
      // reload so the new pathway survives a page refresh. The effect above
      // opens its editor once it shows up in the reloaded workflow.
      await adminImportPack({ pathways: [newPathway], reset_runtime: false });
      setPendingOpenSlug(newPathway.slug);
      await loadCurrent();
    } catch (err) {
      setAddError((err as Error).message || "Failed to add pathway");
    } finally {
      setIsAdding(false);
    }
  }

  function handleDelete(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    const pw = pathways[idx];
    setDeleteError(null);
    setConfirmDelete({ title: pw.title || "Untitled", slug: pw.slug, idx });
  }

  async function doDelete() {
    if (!confirmDelete) return;
    const { slug } = confirmDelete;
    try {
      setIsDeleting(true);
      setDeleteError(null);
      // Every pathway shown here is backend-persisted (Add persists immediately),
      // so delete on the server, then reload from the source of truth.
      await adminDeletePathway(slug);
      await loadCurrent();
      setConfirmDelete(null);
    } catch (err) {
      setDeleteError((err as Error).message || "Failed to delete pathway");
    } finally {
      setIsDeleting(false);
    }
  }

  function handleEdit(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    openDrawer({ level: "pathway", pathwayIndex: idx });
  }

  // Find actual index in the full pathways array for a paged item
  function realIndex(item: (typeof pathways)[number]) {
    return pathways.indexOf(item);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search pathways..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
              disabled={isAdding}
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {isAdding ? "Adding…" : "Create Pathway"}
              <ChevronDown className="h-3.5 w-3.5 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={() => void handleAdd()}>
              <FilePlus2 className="h-4 w-4 text-gray-500" />
              <div>
                <div className="text-sm font-medium">Add Pathway</div>
                <div className="text-[11px] text-gray-400">Build one manually</div>
              </div>
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2 cursor-pointer" onSelect={() => setShowUploadModal(true)}>
              <Sparkles className="h-4 w-4 text-[#0077b6]" />
              <div>
                <div className="text-sm font-medium">Upload CEP PDF</div>
                <div className="text-[11px] text-gray-400">AI extracts the survey</div>
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {addError && <p className="text-sm text-red-600">{addError}</p>}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table style={{ minWidth: 800 }}>
          <colgroup>
            <col style={{ width: "30%" }} />
            <col style={{ width: "25%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Title
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Slug
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Status
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-center">
                Sections
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-center">
                Questions
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-12 text-center text-sm text-gray-400">
                  {search ? "No pathways match your search." : "No pathways available."}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((pathway) => {
                const idx = realIndex(pathway);
                const questionCount = pathway.sections.reduce(
                  (sum, s) => sum + s.nodes.length,
                  0,
                );
                return (
                  <TableRow
                    key={`${pathway.slug}-${idx}`}
                    className="hover:bg-gray-50/50 transition cursor-pointer"
                    onClick={() => navigate(String(idx))}
                  >
                    <TableCell className="py-4 px-5">
                      <span className="font-semibold text-foreground text-[13px]">
                        {pathway.title || "Untitled"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-500">
                      {pathway.slug}
                    </TableCell>
                    <TableCell className="py-4 px-5">
                      <Badge
                        variant="secondary"
                        className={
                          pathway.is_active !== false
                            ? "bg-emerald-50 text-emerald-700 border-0 text-xs"
                            : "bg-gray-100 text-gray-500 border-0 text-xs"
                        }
                      >
                        {pathway.is_active !== false ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-600 text-center">
                      {pathway.sections.length}
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-600 text-center">
                      {questionCount}
                    </TableCell>
                    <TableCell className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-gray-600"
                          onClick={(e) => handleEdit(e, idx)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-600"
                          onClick={(e) => handleDelete(e, idx)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-gray-500">
            Showing {(page - 1) * pageSize + 1}&ndash;
            {Math.min(page * pageSize, totalFiltered)} of {totalFiltered} pathway
            {totalFiltered !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={n === page ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(n)}
                className={n === page ? "bg-[#0077b6] hover:bg-[#005f8a] text-white" : ""}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(Math.min(totalPages, page + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Upload CEP PDF — opened from the Create Pathway dropdown */}
      {showUploadModal && (
        <PdfImportSection asModal onClose={() => setShowUploadModal(false)} />
      )}

      {/* CMS Question Packs */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <CmsPacksSection />
      </div>

      {/* Delete pathway confirmation */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        title="Delete this pathway?"
        message={
          confirmDelete
            ? `"${confirmDelete.title}" and all of its sections, questions, and branching rules will be permanently deleted.`
            : ""
        }
        detail={
          deleteError
            ? `Error: ${deleteError}`
            : "Any in-progress surveys using this pathway will lose their answers for it. This cannot be undone."
        }
        confirmLabel={isDeleting ? "Deleting…" : "Delete Pathway"}
        variant="destructive"
        onConfirm={() => void doDelete()}
        onCancel={() => {
          if (isDeleting) return;
          setConfirmDelete(null);
          setDeleteError(null);
        }}
      />
    </div>
  );
}
