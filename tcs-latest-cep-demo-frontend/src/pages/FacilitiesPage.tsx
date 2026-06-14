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
import { Plus, Pencil, Ban, CheckCircle2, X, Building2, Search } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types & seed data                                                   */
/* ------------------------------------------------------------------ */

type Facility = {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  licenseNumber: string;
  status: "Active" | "Disabled";
};

const SEED_FACILITIES: Facility[] = [
  {
    id: "fac-1",
    name: "Sunrise Senior Living",
    address: "4200 Bay Shore Blvd",
    city: "Tampa",
    state: "FL",
    licenseNumber: "SNF-2024-1182",
    status: "Active",
  },
  {
    id: "fac-2",
    name: "Oakwood Care Center",
    address: "1850 Oak Ridge Dr",
    city: "Orlando",
    state: "FL",
    licenseNumber: "NF-2024-0847",
    status: "Active",
  },
  {
    id: "fac-3",
    name: "Palm Gardens Health & Rehab",
    address: "7300 SW 8th St",
    city: "Miami",
    state: "FL",
    licenseNumber: "SNF-2024-2210",
    status: "Active",
  },
  {
    id: "fac-4",
    name: "Riverside Health Center",
    address: "920 Riverside Ave",
    city: "Jacksonville",
    state: "FL",
    licenseNumber: "ICF-2024-0533",
    status: "Active",
  },
  {
    id: "fac-5",
    name: "Bayshore Nursing & Rehab",
    address: "3100 Gulf Blvd",
    city: "St. Petersburg",
    state: "FL",
    licenseNumber: "SNF-2024-0961",
    status: "Active",
  },
];

/* Simulated surveys tied to facilities */
const FACILITY_SURVEYS: Record<string, number> = {
  "fac-1": 2,
  "fac-3": 1,
  "fac-5": 1,
};

/* ------------------------------------------------------------------ */
/*  Component                                                           */
/* ------------------------------------------------------------------ */

export default function FacilitiesPage() {
  const [facilities, setFacilities] = useState<Facility[]>(SEED_FACILITIES);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  /* form fields */
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("FL");
  const [formLicense, setFormLicense] = useState("");

  const activeCount = facilities.filter((f) => f.status === "Active").length;
  const disabledCount = facilities.filter((f) => f.status === "Disabled").length;

  const filtered = facilities.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.city.toLowerCase().includes(search.toLowerCase())
  );

  function showToastMsg(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function openAdd() {
    setEditingId(null);
    setFormName("");
    setFormAddress("");
    setFormCity("");
    setFormState("FL");
    setFormLicense("");
    setShowForm(true);
  }

  function openEdit(f: Facility) {
    setEditingId(f.id);
    setFormName(f.name);
    setFormAddress(f.address);
    setFormCity(f.city);
    setFormState(f.state);
    setFormLicense(f.licenseNumber);
    setShowForm(true);
  }

  function handleSave() {
    if (!formName.trim()) return;
    if (editingId) {
      setFacilities((prev) =>
        prev.map((f) =>
          f.id === editingId
            ? { ...f, name: formName.trim(), address: formAddress.trim(), city: formCity.trim(), state: formState.trim(), licenseNumber: formLicense.trim() }
            : f
        )
      );
      showToastMsg("Facility updated");
    } else {
      const newFac: Facility = {
        id: `fac-${Date.now()}`,
        name: formName.trim(),
        address: formAddress.trim(),
        city: formCity.trim(),
        state: formState.trim(),
        licenseNumber: formLicense.trim(),
        status: "Active",
      };
      setFacilities((prev) => [newFac, ...prev]);
      showToastMsg("Facility added");
    }
    setShowForm(false);
  }

  function toggleStatus(id: string) {
    setFacilities((prev) =>
      prev.map((f) =>
        f.id === id
          ? { ...f, status: f.status === "Active" ? "Disabled" : "Active" }
          : f
      )
    );
    const fac = facilities.find((f) => f.id === id);
    showToastMsg(
      fac?.status === "Active"
        ? `${fac.name} disabled — no new surveys can be conducted`
        : `${fac?.name} re-enabled`
    );
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
          <h2 className="text-2xl font-semibold text-gray-900">Facilities</h2>
          <p className="text-sm text-gray-500 mt-1">
            Licensed care facilities in your organization
          </p>
        </div>
        <Button
          onClick={openAdd}
          className="bg-[#0077b6] hover:bg-[#005f8a] text-white gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Add Facility
        </Button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Total Facilities</p>
          <p className="text-2xl font-semibold text-gray-900">{facilities.length}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Active</p>
          <p className="text-2xl font-semibold text-emerald-600">{activeCount}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 px-5 py-4">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Disabled</p>
          <p className="text-2xl font-semibold text-gray-400">{disabledCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search facilities..."
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
                {editingId ? "Edit Facility" : "Add New Facility"}
              </h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Facility Name *</label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Sunrise Senior Living" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">Address</label>
                <Input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="e.g., 4200 Bay Shore Blvd" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">City</label>
                  <Input value={formCity} onChange={(e) => setFormCity(e.target.value)} placeholder="e.g., Tampa" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-1 block">State</label>
                  <Input value={formState} onChange={(e) => setFormState(e.target.value)} placeholder="e.g., FL" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 mb-1 block">License Number</label>
                <Input value={formLicense} onChange={(e) => setFormLicense(e.target.value)} placeholder="e.g., SNF-2024-1182" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={!formName.trim()} className="bg-[#0077b6] hover:bg-[#005f8a] text-white">
                {editingId ? "Save Changes" : "Add Facility"}
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
                Facility
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Location
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                License #
              </TableHead>
              <TableHead className="py-3 px-5 text-xs uppercase tracking-wide text-gray-400">
                Surveys
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
                <TableCell colSpan={6} className="py-10 text-center text-sm text-gray-400">
                  No facilities found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((f) => {
                const surveyCount = FACILITY_SURVEYS[f.id] || 0;
                const isDisabled = f.status === "Disabled";
                return (
                  <TableRow key={f.id} className={`hover:bg-transparent transition ${isDisabled ? "opacity-60" : ""}`}>
                    <TableCell className="py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isDisabled ? "bg-gray-100" : "bg-sky-50"}`}>
                          <Building2 className={`h-4 w-4 ${isDisabled ? "text-gray-400" : "text-sky-600"}`} />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-[13px]">{f.name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{f.address}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-700">
                      {f.city}, {f.state}
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-500 font-mono text-xs">
                      {f.licenseNumber || "—"}
                    </TableCell>
                    <TableCell className="py-4 px-5">
                      {surveyCount > 0 ? (
                        <span className="text-sm font-medium text-[#0077b6]">{surveyCount}</span>
                      ) : (
                        <span className="text-sm text-gray-400">0</span>
                      )}
                    </TableCell>
                    <TableCell className="py-4 px-5">
                      <Badge
                        variant="secondary"
                        className={
                          f.status === "Active"
                            ? "bg-emerald-50 text-emerald-700 border-0 text-xs"
                            : "bg-gray-100 text-gray-500 border-0 text-xs"
                        }
                      >
                        {f.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEdit(f)}
                          className="h-8 w-8 inline-flex items-center justify-center rounded-md text-gray-400 hover:text-[#0077b6] hover:bg-sky-50 transition"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleStatus(f.id)}
                          className={`h-8 w-8 inline-flex items-center justify-center rounded-md transition ${
                            f.status === "Active"
                              ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50"
                              : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={f.status === "Active" ? "Disable facility" : "Enable facility"}
                        >
                          {f.status === "Active" ? (
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
