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
import { Plus, Pencil, Ban, CheckCircle2, X, Search } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & seed data                                                   */
/* ------------------------------------------------------------------ */

type User = {
  id: string;
  name: string;
  role: string;
  email: string;
  facility: string;
  status: "Active" | "Disabled";
  lastLogin: string;
};

const ROLES = ["Survey Director", "Lead Surveyor", "Surveyor", "Compliance Officer", "Quality Analyst"];

const FACILITIES = [
  "Sunrise Senior Living",
  "Oakwood Care Center",
  "Palm Gardens Health & Rehab",
  "Riverside Health Center",
  "Bayshore Nursing & Rehab",
];

const SEED_USERS: User[] = [
  {
    id: "usr-1",
    name: "Sarah Johnson",
    role: "Survey Director",
    email: "sarah.johnson@sunrisesenior.com",
    facility: "Sunrise Senior Living",
    status: "Active",
    lastLogin: "Mar 2, 2026",
  },
  {
    id: "usr-2",
    name: "Michael Chen",
    role: "Lead Surveyor",
    email: "michael.chen@sunrisesenior.com",
    facility: "Sunrise Senior Living",
    status: "Active",
    lastLogin: "Mar 1, 2026",
  },
  {
    id: "usr-3",
    name: "Emily Rodriguez",
    role: "Surveyor",
    email: "emily.r@oakwoodcare.com",
    facility: "Oakwood Care Center",
    status: "Active",
    lastLogin: "Feb 28, 2026",
  },
  {
    id: "usr-4",
    name: "James Wilson",
    role: "Compliance Officer",
    email: "james.wilson@palmgardens.com",
    facility: "Palm Gardens Health & Rehab",
    status: "Active",
    lastLogin: "Mar 2, 2026",
  },
  {
    id: "usr-5",
    name: "Lisa Thompson",
    role: "Quality Analyst",
    email: "lisa.t@riverside.com",
    facility: "Riverside Health Center",
    status: "Disabled",
    lastLogin: "Jan 15, 2026",
  },
  {
    id: "usr-6",
    name: "Robert Garcia",
    role: "Surveyor",
    email: "r.garcia@bayshore.com",
    facility: "Bayshore Nursing & Rehab",
    status: "Active",
    lastLogin: "Feb 27, 2026",
  },
];

/* Users with surveys attached (cannot be deleted, only disabled) */
const USERS_WITH_SURVEYS: Record<string, number> = {
  "usr-1": 3,
  "usr-2": 2,
  "usr-4": 1,
  "usr-6": 1,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>(SEED_USERS);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* form fields */
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState(ROLES[0]);
  const [formFacility, setFormFacility] = useState(FACILITIES[0]);

  const activeCount = users.filter((u) => u.status === "Active").length;
  const disabledCount = users.filter((u) => u.status === "Disabled").length;
  const roleCount = new Set(users.map((u) => u.role)).size;

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.facility.toLowerCase().includes(search.toLowerCase())
  );

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function openAdd() {
    setEditingId(null);
    setFormName("");
    setFormEmail("");
    setFormRole(ROLES[0]);
    setFormFacility(FACILITIES[0]);
    setShowForm(true);
  }

  function openEdit(u: User) {
    setEditingId(u.id);
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormFacility(u.facility);
    setShowForm(true);
  }

  function handleSave() {
    if (!formName.trim() || !formEmail.trim()) return;
    if (editingId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingId
            ? { ...u, name: formName.trim(), email: formEmail.trim(), role: formRole, facility: formFacility }
            : u
        )
      );
      showToastMsg("User updated");
    } else {
      const newUser: User = {
        id: `usr-${Date.now()}`,
        name: formName.trim(),
        email: formEmail.trim(),
        role: formRole,
        facility: formFacility,
        status: "Active",
        lastLogin: "Never",
      };
      setUsers((prev) => [newUser, ...prev]);
      showToastMsg("User added");
    }
    setShowForm(false);
  }

  function toggleStatus(id: string) {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id
          ? { ...u, status: u.status === "Active" ? "Disabled" : "Active" }
          : u
      )
    );
    const user = users.find((u) => u.id === id);
    const surveyCount = USERS_WITH_SURVEYS[id] || 0;
    if (user?.status === "Active" && surveyCount > 0) {
      showToastMsg(
        `${user.name} disabled — has ${surveyCount} survey${surveyCount > 1 ? "s" : ""} attached, cannot be deleted`
      );
    } else {
      showToastMsg(
        user?.status === "Active"
          ? `${user.name} disabled`
          : `${user?.name} re-enabled`
      );
    }
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
          <h2 className="text-2xl font-semibold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500 mt-1">
            Team members, roles, and access assignments
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Total Users</p>
          <p className="text-2xl font-semibold text-gray-900">{users.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Active</p>
          <p className="text-2xl font-semibold text-emerald-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Disabled</p>
          <p className="text-2xl font-semibold text-gray-400">{disabledCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Roles</p>
          <p className="text-2xl font-semibold text-gray-900">{roleCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-10 text-sm"
        />
      </div>

      {/* Add/Edit Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? "Edit User" : "Add New User"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Full Name *</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., John Smith" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Email *</label>
                <Input value={formEmail} onChange={(e) => setFormEmail(e.target.value)} placeholder="e.g., john@facility.com" type="email" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Role</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">Facility</label>
                  <select
                    value={formFacility}
                    onChange={(e) => setFormFacility(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {FACILITIES.map((f) => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formName.trim() || !formEmail.trim()} className="bg-[#0077b6] hover:bg-[#005f8a] text-white">
                {editingId ? "Save Changes" : "Add User"}
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
                User
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Role
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Facility
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Surveys
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Last Login
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
            {filtered.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="py-10 text-center text-sm text-gray-400">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => {
                const surveyCount = USERS_WITH_SURVEYS[u.id] || 0;
                const isDisabled = u.status === "Disabled";
                return (
                  <TableRow key={u.id} className={`hover:bg-transparent transition ${isDisabled ? "opacity-60" : ""}`}>
                    <TableCell className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                          isDisabled
                            ? "bg-gray-100 text-gray-400"
                            : "bg-sky-100 text-sky-700"
                        }`}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-[13px]">{u.name}</div>
                          <div className="text-xs text-gray-400">{u.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-5">
                      <Badge
                        variant="secondary"
                        className="bg-gray-100 text-gray-600 border-0 text-xs"
                      >
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-700">{u.facility}</TableCell>
                    <TableCell className="py-4 px-5">
                      {surveyCount > 0 ? (
                        <span className="text-sm font-medium text-[#0077b6]">{surveyCount}</span>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-500">{u.lastLogin}</TableCell>
                    <TableCell className="py-4 px-5">
                      <Badge
                        variant="secondary"
                        className={
                          u.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-0 text-xs"
                            : "bg-gray-100 text-gray-500 border-0 text-xs"
                        }
                      >
                        {u.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(u)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-[#0077b6] hover:bg-sky-50 transition"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleStatus(u.id)}
                          className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
                            u.status === "Active"
                              ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                              : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={
                            u.status === "Active"
                              ? surveyCount > 0
                                ? `Disable user (${surveyCount} survey${surveyCount > 1 ? "s" : ""} attached — cannot delete)`
                                : "Disable user"
                              : "Enable user"
                          }
                        >
                          {u.status === "Active" ? (
                            <Ban className="h-3.5 w-3.5" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
