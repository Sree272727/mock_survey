import { useCallback } from "react";
import { useParams, Navigate } from "react-router-dom";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
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

export function QuestionsTable() {
  const { workflow, isLoading, withWorkflow, makeNode, openDrawer } = useWorkflow();
  const { pathwayIdx, sectionIdx } = useParams<{
    pathwayIdx: string;
    sectionIdx: string;
  }>();
  const pIdx = Number(pathwayIdx);
  const sIdx = Number(sectionIdx);

  const pathway = workflow?.pathways[pIdx];
  const section = pathway?.sections[sIdx];

  const nodes = section?.nodes ?? [];

  const searchFields = useCallback(
    (n: (typeof nodes)[number]) => [n.code, n.prompt, n.node_type || ""],
    [],
  );

  const { search, setSearch, page, setPage, paged, totalPages, totalFiltered, pageSize } =
    useFilteredPaginated({ items: nodes, searchFields });

  // Guard: wait for data, then redirect if indices are invalid
  if (!workflow || isLoading) {
    return null; // still loading
  }
  if (
    !pathway ||
    !section ||
    isNaN(pIdx) ||
    isNaN(sIdx) ||
    pIdx < 0 ||
    pIdx >= workflow.pathways.length ||
    sIdx < 0 ||
    sIdx >= pathway.sections.length
  ) {
    return <Navigate to={`/app/admin/workflows${!isNaN(pIdx) && pathway ? `/${pIdx}` : ""}`} replace />;
  }

  function handleAdd() {
    const seed = Date.now();
    withWorkflow((w) => {
      w.pathways[pIdx].sections[sIdx].nodes.push(makeNode(seed));
    });
    openDrawer({
      level: "question",
      pathwayIndex: pIdx,
      sectionIndex: sIdx,
      questionIndex: nodes.length,
    });
  }

  function handleDelete(e: React.MouseEvent, idx: number) {
    e.stopPropagation();
    if (nodes.length <= 1) return;
    withWorkflow((w) => {
      w.pathways[pIdx].sections[sIdx].nodes.splice(idx, 1);
    });
  }

  function handleRowClick(idx: number) {
    openDrawer({
      level: "question",
      pathwayIndex: pIdx,
      sectionIndex: sIdx,
      questionIndex: idx,
    });
  }

  function realIndex(item: (typeof nodes)[number]) {
    return nodes.indexOf(item);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <Button
          className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
          Add Question
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <Table style={{ minWidth: 750 }}>
          <colgroup>
            <col style={{ width: "15%" }} />
            <col style={{ width: "40%" }} />
            <col style={{ width: "12%" }} />
            <col style={{ width: "20%" }} />
            <col style={{ width: "13%" }} />
          </colgroup>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Code
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Prompt
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Type
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Choices
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
                  {search ? "No questions match your search." : "No questions available."}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((node) => {
                const idx = realIndex(node);
                return (
                  <TableRow
                    key={`${node.code}-${idx}`}
                    className="hover:bg-gray-50/50 cursor-pointer transition"
                    onClick={() => handleRowClick(idx)}
                  >
                    <TableCell className="py-4 px-5">
                      <span className="font-semibold text-foreground text-[13px]">
                        {node.code}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-600 max-w-[300px]">
                      <span className="line-clamp-2">
                        {node.prompt || "New question"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-5">
                      <Badge
                        variant="secondary"
                        className={
                          node.node_type === "decision"
                            ? "bg-purple-50 text-purple-700 border-0 text-xs"
                            : "bg-blue-50 text-blue-700 border-0 text-xs"
                        }
                      >
                        {node.node_type || "question"}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-500 max-w-[200px]">
                      <span className="line-clamp-1">
                        {node.choices.join(", ") || "None"}
                      </span>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(idx);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-gray-400 hover:text-red-600"
                          disabled={nodes.length <= 1}
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
            {Math.min(page * pageSize, totalFiltered)} of {totalFiltered} question
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
