import { useCallback, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search, GitBranch } from "lucide-react";
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
import { useWorkflow } from "./WorkflowContext";
import { useFilteredPaginated } from "./useFilteredPaginated";
import { PathwayFlowView } from "./PathwayFlowView";

export function SectionsTable() {
  const { workflow, isLoading, withWorkflow, makeSection, openDrawer, getSectionDisplayRule } =
    useWorkflow();
  const navigate = useNavigate();
  const { pathwayIdx } = useParams<{ pathwayIdx: string }>();
  const pIdx = Number(pathwayIdx);
  const [showFlow, setShowFlow] = useState(false);

  const pathway = workflow?.pathways[pIdx];

  const sections = pathway?.sections ?? [];

  const searchFields = useCallback(
    (s: (typeof sections)[number]) => [s.title, s.slug],
    [],
  );

  const { search, setSearch, page, setPage, paged, totalPages, totalFiltered, pageSize } =
    useFilteredPaginated({ items: sections, searchFields });

  // Guard: wait for data, then redirect if index is invalid
  if (!workflow || isLoading) {
    return null; // still loading
  }
  if (!pathway || isNaN(pIdx) || pIdx < 0 || pIdx >= workflow.pathways.length) {
    return <Navigate to="/app/admin/workflows" replace />;
  }

  function handleAdd() {
    const seed = Date.now();
    withWorkflow((w) => {
      w.pathways[pIdx].sections.push(makeSection(seed));
    });
    openDrawer({
      level: "section",
      pathwayIndex: pIdx,
      sectionIndex: sections.length,
    });
  }

  function handleDelete(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    if (sections.length <= 1) return;
    withWorkflow((w) => {
      w.pathways[pIdx].sections.splice(idx, 1);
    });
  }

  function handleEdit(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    openDrawer({ level: "section", pathwayIndex: pIdx, sectionIndex: idx });
  }

  function realIndex(item: (typeof sections)[number]) {
    return sections.indexOf(item);
  }

  function visibilityLabel(sectionSlug: string): string {
    const rule = getSectionDisplayRule(pathway!, sectionSlug);
    if (!rule) return "Always visible";
    return `When ${rule.sourceNodeCode} = ${rule.whenChoice}`;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search sections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-1.5"
            onClick={() => setShowFlow(true)}
          >
            <GitBranch className="h-4 w-4" />
            Flow View
          </Button>
          <Button
            className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            Add Section
          </Button>
        </div>
      </div>

      {showFlow && pathway && (
        <PathwayFlowView pathway={pathway} onClose={() => setShowFlow(false)} />
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table style={{ minWidth: 750 }}>
          <colgroup>
            <col style={{ width: "25%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "30%" }} />
            <col style={{ width: "13%" }} />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Title
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Slug
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-center">
                Questions
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Visibility
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-sm text-gray-400">
                  {search ? "No sections match your search." : "No sections available."}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((section) => {
                const idx = realIndex(section);
                const vis = visibilityLabel(section.slug);
                const isConditional = vis !== "Always visible";
                return (
                  <TableRow
                    key={`${section.slug}-${idx}`}
                    className="hover:bg-gray-50/50 cursor-pointer transition"
                    onClick={() => navigate(String(idx))}
                  >
                    <TableCell className="py-4 px-5">
                      <span className="font-semibold text-foreground text-[13px]">
                        {section.title || "Untitled"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-500">
                      {section.slug}
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-600 text-center">
                      {section.nodes.length}
                    </TableCell>
                    <TableCell className="py-4 px-5">
                      <Badge
                        variant="secondary"
                        className={
                          isConditional
                            ? "bg-amber-50 text-amber-700 border-0 text-xs"
                            : "bg-gray-100 text-gray-500 border-0 text-xs"
                        }
                      >
                        {vis}
                      </Badge>
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
                          disabled={sections.length <= 1}
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
            {Math.min(page * pageSize, totalFiltered)} of {totalFiltered} section
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
    </div>
  );
}
