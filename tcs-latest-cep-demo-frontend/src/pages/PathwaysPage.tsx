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
import { Plus, Pencil, Trash2, X, Search, ChevronDown, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type Section = {
  name: string;
  questions: number;
  conditional?: boolean;
};

type Pathway = {
  id: string;
  name: string;
  slug: string;
  cmsRef: string;
  description: string;
  sections: Section[];
  citations: string[];
  status: "Active" | "Inactive";
  branching: string;
};

/* ------------------------------------------------------------------ */
/*  Seed data                                                           */
/* ------------------------------------------------------------------ */

const SEED_PATHWAYS: Pathway[] = [
  {
    id: "pw-1",
    name: "General Critical Element Pathway",
    slug: "general-cep",
    cmsRef: "CMS-20072",
    description:
      "Evaluates the facility's compliance with care requirements through direct observations, record review, and harm determination. The primary pathway for quality of care assessments.",
    sections: [
      { name: "Observations", questions: 2 },
      { name: "Record Review", questions: 2 },
      { name: "Harm Determination", questions: 1, conditional: true },
      { name: "Critical Element Decisions", questions: 1 },
    ],
    citations: ["F684", "F655", "F636", "F637", "F641", "F656", "F657"],
    status: "Active",
    branching: "Harm section appears only when deficiency triggers are detected",
  },
  {
    id: "pw-2",
    name: "Neglect Critical Element Pathway",
    slug: "neglect-cep",
    cmsRef: "CMS-20130",
    description:
      "Investigates potential neglect through interviews, record review, and facility investigation assessment. Includes supervisory staff evaluation and quality assurance checks.",
    sections: [
      { name: "Interviews", questions: 1 },
      { name: "Record Review", questions: 1, conditional: true },
      { name: "Facility Investigator Interview", questions: 1, conditional: true },
      { name: "Supervisory Staff Interviews", questions: 1 },
      { name: "Quality Assurance Interview", questions: 1 },
    ],
    citations: ["F600", "F606", "F607", "F609", "F610"],
    status: "Active",
    branching: "Record Review and Investigator sections appear based on interview and reporting outcomes",
  },
  {
    id: "pw-3",
    name: "Infection Control Pathway",
    slug: "infection-control-cep",
    cmsRef: "CMS IC",
    description:
      "Assesses the facility's infection prevention and control program including practices, surveillance, physician orders, and harm evaluation.",
    sections: [
      { name: "Infection Prevention Practices", questions: 1 },
      { name: "Monitoring & Surveillance", questions: 1 },
      { name: "Physician Orders & Isolation", questions: 1 },
      { name: "Harm / Transmission Evaluation", questions: 1, conditional: true },
      { name: "Decision Summary", questions: 1 },
    ],
    citations: ["F880", "F943", "F947"],
    status: "Active",
    branching: "Harm evaluation appears only when infection control failures are detected",
  },
];

/* ------------------------------------------------------------------ */
/*  Constants                                                           */
/* ------------------------------------------------------------------ */

const ROWS_PER_PAGE = 10;

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function totalQuestions(p: Pathway): number {
  return p.sections.reduce((sum, s) => sum + s.questions, 0);
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function PathwaysPage() {
  const [pathways, setPathways] = useState<Pathway[]>(SEED_PATHWAYS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  /* modal state */
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  /* form fields */
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCmsRef, setFormCmsRef] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"Active" | "Inactive">("Active");
  const [formBranching, setFormBranching] = useState("");
  const [formCitations, setFormCitations] = useState("");

  /* toast */
  const [toast, setToast] = useState<string | null>(null);

  /* ---- KPI calculations ---- */
  const totalPathways = pathways.length;
  const totalQs = pathways.reduce((sum, p) => sum + totalQuestions(p), 0);
  const uniqueCitations = new Set(pathways.flatMap((p) => p.citations)).size;

  /* ---- Filtering ---- */
  const filtered = pathways.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase()) ||
      p.cmsRef.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "All" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  /* ---- Pagination ---- */
  const totalPages = Math.max(1, Math.ceil(filtered.length / ROWS_PER_PAGE));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * ROWS_PER_PAGE, safePage * ROWS_PER_PAGE);

  /* ---- Toast helper ---- */
  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  /* ---- Modal helpers ---- */
  function openAdd() {
    setEditingId(null);
    setFormName("");
    setFormSlug("");
    setFormCmsRef("");
    setFormDescription("");
    setFormStatus("Active");
    setFormBranching("");
    setFormCitations("");
    setShowForm(true);
  }

  function openEdit(p: Pathway) {
    setEditingId(p.id);
    setFormName(p.name);
    setFormSlug(p.slug);
    setFormCmsRef(p.cmsRef);
    setFormDescription(p.description);
    setFormStatus(p.status);
    setFormBranching(p.branching);
    setFormCitations(p.citations.join(", "));
    setShowForm(true);
  }

  function handleSave() {
    if (!formName.trim() || !formSlug.trim()) return;

    const citationsArr = formCitations
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    if (editingId) {
      setPathways((prev) =>
        prev.map((p) =>
          p.id === editingId
            ? {
                ...p,
                name: formName.trim(),
                slug: formSlug.trim(),
                cmsRef: formCmsRef.trim(),
                description: formDescription.trim(),
                status: formStatus,
                branching: formBranching.trim(),
                citations: citationsArr,
              }
            : p
        )
      );
      showToastMsg("Pathway updated");
    } else {
      const newPathway: Pathway = {
        id: `pw-${Date.now()}`,
        name: formName.trim(),
        slug: formSlug.trim(),
        cmsRef: formCmsRef.trim(),
        description: formDescription.trim(),
        sections: [],
        citations: citationsArr,
        status: formStatus,
        branching: formBranching.trim(),
      };
      setPathways((prev) => [newPathway, ...prev]);
      showToastMsg("Pathway added");
    }
    setShowForm(false);
  }

  function handleDelete(id: string) {
    const pw = pathways.find((p) => p.id === id);
    setPathways((prev) => prev.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
    showToastMsg(`"${pw?.name}" deleted`);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  /* ---- Render ---- */
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
          <h2 className="text-2xl font-semibold text-gray-900">Pathways</h2>
          <p className="text-sm text-gray-500 mt-1">
            CMS Critical Element Pathways with branching logic and citation mappings
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Pathway
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Total Pathways</p>
          <p className="text-2xl font-semibold text-gray-900">{totalPathways}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Total Questions</p>
          <p className="text-2xl font-semibold text-gray-900">{totalQs}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Unique Citations</p>
          <p className="text-2xl font-semibold text-gray-900">{uniqueCitations}</p>
        </div>
      </div>

      {/* Search + Status filter */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, slug, or CMS ref..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-10 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "All" | "Active" | "Inactive");
            setPage(1);
          }}
          className="flex h-10 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit Pathway" : "Add New Pathway"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 overflow-y-auto">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Name *</label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., General Critical Element Pathway"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Slug *</label>
                  <Input
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    placeholder="e.g., general-cep"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">CMS Reference</label>
                  <Input
                    value={formCmsRef}
                    onChange={(e) => setFormCmsRef(e.target.value)}
                    placeholder="e.g., CMS-20072"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Pathway description..."
                  rows={3}
                  className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as "Active" | "Inactive")}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Citations</label>
                  <Input
                    value={formCitations}
                    onChange={(e) => setFormCitations(e.target.value)}
                    placeholder="F684, F655, F636"
                  />
                  <p className="text-xs text-gray-400 mt-1">Comma-separated</p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Branching Logic</label>
                <Input
                  value={formBranching}
                  onChange={(e) => setFormBranching(e.target.value)}
                  placeholder="Describe branching conditions..."
                />
              </div>

              {/* Sections display (read-only in modal when editing) */}
              {editingId && (() => {
                const editPw = pathways.find((p) => p.id === editingId);
                if (!editPw || editPw.sections.length === 0) return null;
                return (
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Sections ({editPw.sections.length})
                    </label>
                    <div className="space-y-1.5">
                      {editPw.sections.map((sec) => (
                        <div
                          key={sec.name}
                          className="flex items-center justify-between px-3 py-2 rounded-md bg-gray-50 border border-gray-100"
                        >
                          <span className="text-sm text-gray-700">{sec.name}</span>
                          <span className="text-xs text-gray-400">
                            {sec.questions} question{sec.questions > 1 ? "s" : ""}
                            {sec.conditional && (
                              <span className="ml-1.5 text-amber-600">&middot; conditional</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button
                onClick={handleSave}
                disabled={!formName.trim() || !formSlug.trim()}
                className="bg-[#0077b6] hover:bg-[#005f8a] text-white"
              >
                {editingId ? "Save Changes" : "Add Pathway"}
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
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400 w-8" />
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Pathway Name
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Sections
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Questions
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Citations
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
            {paged.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-400">
                  No pathways found
                </TableCell>
              </TableRow>
            ) : (
              paged.map((p) => {
                const qTotal = totalQuestions(p);
                const isExpanded = expandedId === p.id;
                return (
                  <>
                    <TableRow
                      key={p.id}
                      className="hover:bg-transparent transition cursor-pointer"
                      onClick={() => toggleExpand(p.id)}
                    >
                      <TableCell className="py-4 px-5 w-8">
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </TableCell>
                      <TableCell className="py-4 px-5">
                        <div>
                          <div className="font-semibold text-gray-900 text-[13px]">{p.name}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">
                            {p.slug} &middot; {p.cmsRef}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-5">
                        <span className="text-sm font-medium text-gray-700">{p.sections.length}</span>
                      </TableCell>
                      <TableCell className="py-4 px-5">
                        <span className="text-sm font-medium text-gray-700">{qTotal}</span>
                      </TableCell>
                      <TableCell className="py-4 px-5">
                        <div className="flex flex-wrap gap-1">
                          {p.citations.map((c) => (
                            <span
                              key={c}
                              className="text-xs font-mono font-medium text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="py-4 px-5">
                        <Badge
                          variant="secondary"
                          className={
                            p.status === "Active"
                              ? "bg-emerald-50 text-emerald-700 border-0 text-xs"
                              : "bg-gray-100 text-gray-500 border-0 text-xs"
                          }
                        >
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 px-5 text-right">
                        <div
                          className="flex items-center justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => openEdit(p)}
                            title="Edit"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-[#0077b6] hover:bg-sky-50 transition"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            title="Delete"
                            className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expandable row detail */}
                    {isExpanded && (
                      <TableRow key={`${p.id}-detail`} className="hover:bg-transparent">
                        <TableCell colSpan={7} className="px-5 py-0">
                          <div className="py-4 pl-8 border-t border-gray-100">
                            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
                              Sections
                            </p>
                            {p.sections.length === 0 ? (
                              <p className="text-sm text-gray-400 italic">No sections defined</p>
                            ) : (
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {p.sections.map((sec) => (
                                  <div
                                    key={sec.name}
                                    className="px-3 py-2 rounded-md bg-gray-50 border border-gray-100"
                                  >
                                    <p className="text-sm font-medium text-gray-800">{sec.name}</p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      {sec.questions} question{sec.questions > 1 ? "s" : ""}
                                      {sec.conditional && (
                                        <span className="ml-1.5 text-amber-600">&middot; conditional</span>
                                      )}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                            {p.branching && (
                              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50/50 border border-amber-100 rounded-md mt-3">
                                <span className="text-amber-600 text-sm mt-px">&#x26A0;</span>
                                <p className="text-xs text-amber-800 leading-relaxed">
                                  <span className="font-semibold">Branching Logic:</span> {p.branching}
                                </p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
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
            Showing {(safePage - 1) * ROWS_PER_PAGE + 1}&ndash;
            {Math.min(safePage * ROWS_PER_PAGE, filtered.length)} of {filtered.length} pathway
            {filtered.length !== 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={safePage <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
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
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
