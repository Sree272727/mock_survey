import { useState } from "react";
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
import { Plus, Pencil, Trash2, X, Search } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & seed data                                                   */
/* ------------------------------------------------------------------ */

type Template = {
  id: string;
  name: string;
  description: string;
  pathways: string[];
  version: string;
  status: "Published" | "Draft";
  questionCount: number;
};

const ALL_PATHWAYS = ["General CEP", "Neglect CEP", "Infection Control"];

const SEED_TEMPLATES: Template[] = [
  {
    id: "tpl-1",
    name: "Annual Recertification Survey",
    description:
      "Comprehensive survey template used during annual recertification visits. Covers general quality of care, neglect screening, and infection control compliance.",
    pathways: ["General CEP", "Neglect CEP", "Infection Control"],
    version: "2.1",
    status: "Published",
    questionCount: 16,
  },
  {
    id: "tpl-2",
    name: "Complaint Investigation",
    description:
      "Focused survey template for investigating resident or family complaints. Routes through general quality of care and neglect assessment pathways.",
    pathways: ["General CEP", "Neglect CEP"],
    version: "1.3",
    status: "Published",
    questionCount: 11,
  },
  {
    id: "tpl-3",
    name: "Focused Revisit",
    description:
      "Abbreviated survey template for revisit inspections to verify correction of previously cited deficiencies.",
    pathways: ["General CEP"],
    version: "1.0",
    status: "Draft",
    questionCount: 6,
  },
  {
    id: "tpl-4",
    name: "Infection Control Focused Survey",
    description:
      "Specialized template for infection control focused surveys triggered by outbreak reports or infection control complaints.",
    pathways: ["Infection Control"],
    version: "1.1",
    status: "Published",
    questionCount: 5,
  },
];

const pathwayColors: Record<string, string> = {
  "General CEP": "bg-blue-50 text-blue-700",
  "Neglect CEP": "bg-amber-50 text-amber-700",
  "Infection Control": "bg-purple-50 text-purple-700",
};

const ROWS_PER_PAGE = 10;

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>(SEED_TEMPLATES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Published" | "Draft">("All");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* form fields */
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formVersion, setFormVersion] = useState("");
  const [formStatus, setFormStatus] = useState<"Published" | "Draft">("Draft");
  const [formPathways, setFormPathways] = useState<string[]>([]);
  const [formQuestionCount, setFormQuestionCount] = useState<number>(0);

  /* KPI counts */
  const totalCount = templates.length;
  const publishedCount = templates.filter((t) => t.status === "Published").length;
  const draftCount = templates.filter((t) => t.status === "Draft").length;

  /* Filtering */
  const filtered = templates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /* Pagination */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paginatedRows = filtered.slice(
    (safePage - 1) * ROWS_PER_PAGE,
    safePage * ROWS_PER_PAGE
  );

  /* ---------------------------------------------------------------- */
  /*  Helpers                                                          */
  /* ---------------------------------------------------------------- */

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function openAdd() {
    setEditingId(null);
    setFormName("");
    setFormDescription("");
    setFormVersion("");
    setFormStatus("Draft");
    setFormPathways([]);
    setFormQuestionCount(0);
    setShowForm(true);
  }

  function openEdit(t: Template) {
    setEditingId(t.id);
    setFormName(t.name);
    setFormDescription(t.description);
    setFormVersion(t.version);
    setFormStatus(t.status);
    setFormPathways([...t.pathways]);
    setFormQuestionCount(t.questionCount);
    setShowForm(true);
  }

  function togglePathway(p: string) {
    setFormPathways((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }

  function handleSave() {
    if (!formName.trim() || !formVersion.trim()) return;
    if (editingId) {
      setTemplates((prev) =>
        prev.map((t) =>
          t.id === editingId
            ? {
                ...t,
                name: formName.trim(),
                description: formDescription.trim(),
                version: formVersion.trim(),
                status: formStatus,
                pathways: formPathways,
                questionCount: formQuestionCount,
              }
            : t
        )
      );
      showToastMsg("Template updated");
    } else {
      const newTemplate: Template = {
        id: `tpl-${Date.now()}`,
        name: formName.trim(),
        description: formDescription.trim(),
        version: formVersion.trim(),
        status: formStatus,
        pathways: formPathways,
        questionCount: formQuestionCount,
      };
      setTemplates((prev) => [newTemplate, ...prev]);
      showToastMsg("Template added");
    }
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const target = templates.find((t) => t.id === id);
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    showToastMsg(`"${target?.name}" deleted`);
  }

  /* Reset page to 1 when filters change */
  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleStatusFilterChange(val: string) {
    setStatusFilter(val as "All" | "Published" | "Draft");
    setPage(1);
  }

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 bg-[#1a2d3e] text-white text-sm px-5 py-3 rounded-lg shadow-lg animate-in fade-in slide-in-from-top-2">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Survey Templates</h2>
          <p className="text-sm text-gray-500 mt-1">
            Survey templates and pathway configurations
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Template
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Total Templates</p>
          <p className="text-2xl font-semibold text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Published</p>
          <p className="text-2xl font-semibold text-gray-900">{publishedCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Draft</p>
          <p className="text-2xl font-semibold text-gray-900">{draftCount}</p>
        </div>
      </div>

      {/* Search & Status Filter */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="All">All Statuses</option>
          <option value="Published">Published</option>
          <option value="Draft">Draft</option>
        </select>
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Template" : "Add New Template"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Annual Recertification Survey"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description of the template..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Version *</label>
                  <Input
                    value={formVersion}
                    onChange={(e) => setFormVersion(e.target.value)}
                    placeholder="e.g., 1.0"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Published" | "Draft")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Pathways</label>
                <div className="flex flex-wrap gap-3 mt-1">
                  {ALL_PATHWAYS.map((p) => (
                    <label key={p} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPathways.includes(p)}
                        onChange={() => togglePathway(p)}
                        className="h-4 w-4 rounded border-gray-300 text-[#0077b6] focus:ring-[#0077b6]"
                      />
                      {p}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Question Count</label>
                <Input
                  type="number"
                  min={0}
                  value={formQuestionCount}
                  onChange={(e) => setFormQuestionCount(Number(e.target.value) || 0)}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!formName.trim() || !formVersion.trim()}
                className="bg-[#0077b6] hover:bg-[#005f8a] text-white"
              >
                {editingId ? "Save Changes" : "Add Template"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Template Name
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Description
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Pathways
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Questions
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Status
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((t) => (
                <TableRow key={t.id} className="hover:bg-transparent">
                  <TableCell className="py-4 px-5">
                    <div>
                      <div className="font-semibold text-gray-900 text-[13px]">{t.name}</div>
                      <div className="text-xs text-gray-400">v{t.version}</div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-5 text-[13px] text-gray-600 max-w-xs">
                    <span className="line-clamp-2">{t.description}</span>
                  </TableCell>
                  <TableCell className="py-4 px-5">
                    <div className="flex flex-wrap gap-1.5">
                      {t.pathways.map((p) => (
                        <Badge
                          key={p}
                          variant="secondary"
                          className={`border-0 text-xs ${pathwayColors[p] || "bg-gray-100 text-gray-600"}`}
                        >
                          {p}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="py-4 px-5 text-[13px] text-gray-700">
                    {t.questionCount}
                  </TableCell>
                  <TableCell className="py-4 px-5">
                    <Badge
                      variant="secondary"
                      className={
                        t.status === "Published"
                          ? "bg-emerald-50 text-emerald-700 border-0 text-xs"
                          : "bg-amber-50 text-amber-700 border-0 text-xs"
                      }
                    >
                      {t.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4 px-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(t)}
                        title="Edit"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-[#0077b6] hover:bg-sky-50 transition"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        title="Delete"
                        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>
            Showing {(safePage - 1) * ROWS_PER_PAGE + 1}–
            {Math.min(safePage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} templates
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Button
                key={n}
                variant={n === safePage ? "default" : "outline"}
                size="sm"
                onClick={() => setPage(n)}
                className={n === safePage ? "bg-[#0077b6] hover:bg-[#005f8a] text-white" : ""}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
