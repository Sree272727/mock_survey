import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Pencil, Search, Loader2, Wrench } from "lucide-react";
import { adminExportWorkflows } from "../api";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type Question = {
  id: string;
  code: string;
  pathway: string;
  pathwayIdx: number;
  sectionIdx: number;
  section: string;
  prompt: string;
  type: "question" | "decision";
  citations: string[];
};

const PAGE_SIZE = 10;

// Stable-ish color per pathway (by its position in the unique list).
const PATHWAY_PALETTE = [
  "bg-blue-50 text-blue-700",
  "bg-amber-50 text-amber-700",
  "bg-purple-50 text-purple-700",
  "bg-emerald-50 text-emerald-700",
  "bg-rose-50 text-rose-700",
  "bg-cyan-50 text-cyan-700",
];

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function QuestionLibraryPage() {
  const navigate = useNavigate();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [pathwayFilter, setPathwayFilter] = useState("");
  const [page, setPage] = useState(1);

  /* ---- Load live questions from the database ---- */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const payload = await adminExportWorkflows();
        const flat: Question[] = [];
        payload.pathways.forEach((pw, pIdx) => {
          pw.sections.forEach((sec, sIdx) => {
            sec.nodes.forEach((node) => {
              const citations = (node.rules ?? [])
                .flatMap((r) => r.actions ?? [])
                .filter((a) => a.type === "add_citation")
                .map((a) => String((a.payload as Record<string, unknown>)?.tag ?? ""))
                .filter(Boolean);
              const isDecision = node.node_type === "decision" || citations.length > 0;
              flat.push({
                id: `${pw.slug}-${node.code}`,
                code: node.code,
                pathway: pw.title || pw.slug,
                pathwayIdx: pIdx,
                sectionIdx: sIdx,
                section: sec.title || sec.slug,
                prompt: node.prompt,
                type: isDecision ? "decision" : "question",
                citations: Array.from(new Set(citations)),
              });
            });
          });
        });
        if (!cancelled) setQuestions(flat);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /* ---- pathway color map ---- */
  const pathwayColors = useMemo(() => {
    const map: Record<string, string> = {};
    Array.from(new Set(questions.map((q) => q.pathway))).forEach((p, i) => {
      map[p] = PATHWAY_PALETTE[i % PATHWAY_PALETTE.length];
    });
    return map;
  }, [questions]);

  const pathwayOptions = useMemo(
    () => Array.from(new Set(questions.map((q) => q.pathway))).sort(),
    [questions],
  );

  /* ---- KPIs ---- */
  const totalQuestions = questions.length;
  const pathwayCount = pathwayOptions.length;
  const decisionNodes = questions.filter((q) => q.type === "decision").length;
  const uniqueCitations = new Set(questions.flatMap((q) => q.citations)).size;

  /* ---- Filtering ---- */
  const filtered = useMemo(() => {
    const s = search.toLowerCase();
    return questions.filter((q) => {
      const matchesSearch =
        !s ||
        q.code.toLowerCase().includes(s) ||
        q.prompt.toLowerCase().includes(s) ||
        q.pathway.toLowerCase().includes(s) ||
        q.section.toLowerCase().includes(s) ||
        q.citations.some((c) => c.toLowerCase().includes(s));
      const matchesPathway = !pathwayFilter || q.pathway === pathwayFilter;
      return matchesSearch && matchesPathway;
    });
  }, [questions, search, pathwayFilter]);

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function getPageNumbers(): (number | "ellipsis")[] {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("ellipsis");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(totalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                              */
  /* ------------------------------------------------------------------ */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Question Library</h2>
          <p className="text-sm text-gray-500 mt-1">
            Every question across all Critical Element Pathways — sourced live from your uploaded &amp; built CEPs
          </p>
        </div>
        <Button
          onClick={() => navigate("/app/admin/workflows")}
          className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
        >
          <Wrench className="h-4 w-4" />
          Manage in Workflow Builder
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Total Questions</p>
          <p className="text-2xl font-semibold text-gray-900">{totalQuestions}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Pathways</p>
          <p className="text-2xl font-semibold text-gray-900">{pathwayCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Decision Nodes</p>
          <p className="text-2xl font-semibold text-gray-900">{decisionNodes}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Unique Citations</p>
          <p className="text-2xl font-semibold text-gray-900">{uniqueCitations}</p>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by code, prompt, pathway, or citation..."
            className="pl-9 h-10 text-sm"
          />
        </div>
        <select
          value={pathwayFilter}
          onChange={(e) => {
            setPathwayFilter(e.target.value);
            setPage(1);
          }}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All Pathways</option>
          {pathwayOptions.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 w-28">Code</TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 w-36">Pathway</TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 w-40">Section</TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">Prompt</TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 w-24">Type</TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 w-32">Citations</TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 w-20 text-right">Edit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-12 text-center text-sm text-gray-400">
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading questions…
                  </span>
                </TableCell>
              </TableRow>
            ) : error ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-12 text-center text-sm text-red-600">
                  {error}
                </TableCell>
              </TableRow>
            ) : paged.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-12 text-center text-sm text-gray-400">
                  {questions.length === 0
                    ? "No questions yet. Create a pathway or upload a CEP PDF in the Workflow Builder."
                    : "No questions match your search."}
                </TableCell>
              </TableRow>
            ) : (
              paged.map((q) => (
                <TableRow key={q.id} className="hover:bg-gray-50/40">
                  <TableCell className="py-3 px-5">
                    <code className="text-xs font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded">
                      {q.code}
                    </code>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <Badge
                      variant="secondary"
                      className={`border-0 text-xs ${pathwayColors[q.pathway] || "bg-gray-100 text-gray-600"}`}
                    >
                      {q.pathway}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-[13px] text-gray-600">{q.section}</TableCell>
                  <TableCell className="py-3 px-5 text-[13px] text-gray-700 leading-snug">{q.prompt}</TableCell>
                  <TableCell className="py-3 px-5">
                    <Badge
                      variant="secondary"
                      className={
                        q.type === "decision"
                          ? "bg-rose-50 text-rose-700 border-0 text-xs"
                          : "bg-gray-50 text-gray-600 border-0 text-xs"
                      }
                    >
                      {q.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3 px-5">
                    <div className="flex flex-wrap gap-1">
                      {q.citations.map((c) => (
                        <span
                          key={c}
                          className="text-[10px] font-mono font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded"
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-3 px-5 text-right">
                    <button
                      onClick={() => navigate(`/app/admin/workflows/${q.pathwayIdx}/${q.sectionIdx}`)}
                      title="Open in Workflow Builder"
                      className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-[#0077b6] hover:bg-sky-50 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {filtered.length > PAGE_SIZE && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {(safePage - 1) * PAGE_SIZE + 1}–
              {Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} questions
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage === 1}
              >
                Previous
              </Button>
              {getPageNumbers().map((n, i) =>
                n === "ellipsis" ? (
                  <span key={`e-${i}`} className="px-2 text-sm text-gray-400">
                    ...
                  </span>
                ) : (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`h-8 w-8 inline-flex items-center justify-center rounded-md text-sm transition ${
                      n === safePage
                        ? "bg-[#0077b6] text-white font-medium"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    {n}
                  </button>
                ),
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
