// src/components/ManagementModal.tsx
import { useState, useEffect } from "react";
import {
  X, Plus, Edit, Trash2, Save, RefreshCw, Search,
  Building2, MapPin, Users, Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// @ts-ignore
import { supabase } from "../services/supabase";
import toast from "react-hot-toast";

// ---------- Types ----------
interface Company {
  id: string;
  company_name: string;
  company_code?: string;
  contact_person?: string;
  email?: string;
  mobile?: string;
  address?: string;
  city?: string;
  state?: string;
  status?: string;
}

interface Location {
  id: string;
  company_id: string;
  location_name: string;
  location_code?: string;
  address?: string;
  city?: string;
  state?: string;
  contact_person?: string;
  mobile?: string;
  status?: string;
  company?: Company;
}

interface Coordinator {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  company_id?: string;
  location_id?: string;
  role: string;
  status?: string;
}

type Tab = "companies" | "locations" | "coordinators";

interface ManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: Tab;
  onDataChange?: () => void;
  coordinator?: Coordinator | null;   // external editing
}

// ---------- Animation Variants ----------
const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants: any = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    y: 0, 
    transition: { type: "spring", damping: 25, stiffness: 300 } 
  },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.2 } },
};

// ---------- Status Badge ----------
const StatusBadge = ({ status }: { status?: string }) => {
  const isActive = status === "ACTIVE";
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive
          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800"
          : "bg-slate-100 text-slate-500 border border-slate-200 dark:bg-slate-700 dark:text-slate-400 dark:border-slate-600"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-emerald-500" : "bg-slate-400"}`} />
      {status || "INACTIVE"}
    </span>
  );
};

// ---------- Main Component ----------
export default function ManagementModal({
  isOpen,
  onClose,
  initialTab = "companies",
  onDataChange,
  coordinator,
}: ManagementModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingItem, setEditingItem] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});

  // ---------- Populate form when external coordinator is provided ----------
  useEffect(() => {
    if (coordinator && activeTab === "coordinators") {
      setEditingItem({ id: coordinator.id });
      setFormData({
        name: coordinator.name || "",
        email: coordinator.email || "",
        mobile: coordinator.mobile || "",
        company_id: coordinator.company_id || "",
        location_id: coordinator.location_id || "",
        status: coordinator.status || "ACTIVE",
      });
    } else if (!coordinator) {
      setEditingItem(null);
      setFormData({});
    }
  }, [coordinator, activeTab]);

  // ---------- Fetch companies & locations once when modal opens (for dropdowns) ----------
  useEffect(() => {
    if (isOpen) {
      const fetchDropdownData = async () => {
        try {
          const [companiesRes, locationsRes] = await Promise.all([
            supabase.from("companies").select("*").order("company_name"),
            supabase.from("locations").select("*, company:companies(company_name)").order("location_name"),
          ]);
          if (!companiesRes.error) setCompanies(companiesRes.data || []);
          if (!locationsRes.error) setLocations(locationsRes.data || []);
        } catch (err) {
          console.error("Failed to load dropdown data", err);
        }
      };
      fetchDropdownData();
      // Then fetch the active tab's main data
      fetchData();
    }
  }, [isOpen]);

  // ---------- Fetch data for the active tab (main list) ----------
  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "companies") {
        const { data } = await supabase.from("companies").select("*").order("company_name");
        setCompanies(data || []);
      } else if (activeTab === "locations") {
        const { data } = await supabase.from("locations").select("*, company:companies(company_name)").order("location_name");
        setLocations(data || []);
      } else if (activeTab === "coordinators") {
        const { data } = await supabase.from("users").select("id, name, email, mobile, company_id, location_id, role, status").eq("role", "COORDINATOR").order("name");
        setCoordinators(data || []);
      }
    } catch (err) {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setEditingItem(null);
    setFormData({});
    setSearchTerm("");
  }, [activeTab]);

  // ---------- CRUD Handlers ----------
  const handleAdd = () => {
    setEditingItem({ id: null });
    setFormData({ status: "ACTIVE" });
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      const table = activeTab === "companies" ? "companies" : activeTab === "locations" ? "locations" : "users";
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      toast.success("Deleted successfully");
      fetchData();
      onDataChange?.();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const table = activeTab === "companies" ? "companies" : activeTab === "locations" ? "locations" : "users";
      const isEdit = editingItem?.id;
      const payload = { ...formData };

      if (activeTab === "coordinators") {
        payload.role = "COORDINATOR";
        delete payload.password;
        delete payload.company;
        delete payload.location;
      }
      if (activeTab === "locations") {
        delete payload.company;
      }

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined) delete payload[key];
      });

      let result;
      if (isEdit) {
        result = await supabase.from(table).update(payload).eq("id", editingItem.id);
      } else {
        result = await supabase.from(table).insert([payload]);
      }
      if (result.error) throw result.error;

      toast.success(isEdit ? "Updated successfully" : "Added successfully");
      setEditingItem(null);
      setFormData({});
      fetchData();
      onDataChange?.();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // ---------- Filtered Data ----------
  const filteredData = (): any[] => {
    const term = searchTerm.toLowerCase().trim();
    const source = activeTab === "companies" ? companies : activeTab === "locations" ? locations : coordinators;
    if (!term) return source;
    // ... filtering logic (same as before)
    return source.filter((item: any) => {
      const str = JSON.stringify(item).toLowerCase();
      return str.includes(term);
    });
  };

  const filteredItems = filteredData();
  const tabs: Tab[] = ["companies", "locations", "coordinators"];
  const tabIcons = { companies: Building2, locations: MapPin, coordinators: Users };

  // ---------- Form Field Definitions ----------
  const formFields = (): { key: string; label: string; type: string; required?: boolean; options?: any[] }[] => {
    if (activeTab === "companies") {
      return [
        { key: "company_name", label: "Company Name", type: "text", required: true },
        { key: "company_code", label: "Company Code", type: "text" },
        { key: "contact_person", label: "Contact Person", type: "text" },
        { key: "email", label: "Email", type: "email" },
        { key: "mobile", label: "Mobile", type: "text" },
        { key: "address", label: "Address", type: "text" },
        { key: "city", label: "City", type: "text" },
        { key: "state", label: "State", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"] },
      ];
    } else if (activeTab === "locations") {
      return [
        { key: "location_name", label: "Location Name", type: "text", required: true },
        { key: "location_code", label: "Location Code", type: "text" },
        {
          key: "company_id",
          label: "Company",
          type: "select",
          required: true,
          options: companies.map((c) => ({ value: c.id, label: c.company_name })),
        },
        { key: "address", label: "Address", type: "text" },
        { key: "city", label: "City", type: "text" },
        { key: "state", label: "State", type: "text" },
        { key: "contact_person", label: "Contact Person", type: "text" },
        { key: "mobile", label: "Mobile", type: "text" },
        { key: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"] },
      ];
    } else {
      return [
        { key: "name", label: "Full Name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "mobile", label: "Mobile", type: "text" },
        {
          key: "company_id",
          label: "Company",
          type: "select",
          required: true,
          options: companies.map((c) => ({ value: c.id, label: c.company_name })),
        },
        {
          key: "location_id",
          label: "Location",
          type: "select",
          options: locations.map((l) => ({ value: l.id, label: l.location_name })),
        },
        { key: "status", label: "Status", type: "select", options: ["ACTIVE", "INACTIVE"] },
        {
          key: "password",
          label: "Password",
          type: "password",
          required: !editingItem?.id,
        },
      ];
    }
  };

  // ---------- Table Columns ----------
  const tableColumns = (): { key: string; label: string }[] => {
    if (activeTab === "companies") {
      return [
        { key: "company_name", label: "Name" },
        { key: "company_code", label: "Code" },
        { key: "contact_person", label: "Contact" },
        { key: "email", label: "Email" },
        { key: "mobile", label: "Mobile" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "status", label: "Status" },
      ];
    } else if (activeTab === "locations") {
      return [
        { key: "location_name", label: "Name" },
        { key: "location_code", label: "Code" },
        { key: "company", label: "Company" },
        { key: "city", label: "City" },
        { key: "state", label: "State" },
        { key: "status", label: "Status" },
      ];
    } else {
      return [
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "mobile", label: "Mobile" },
        { key: "company_id", label: "Company" },
        { key: "location_id", label: "Location" },
        { key: "status", label: "Status" },
      ];
    }
  };

  // ---------- Render Cell ----------
  const renderCell = (item: any, col: { key: string; label: string }) => {
    if (col.key === "status") return <StatusBadge status={item.status} />;
    if (col.key === "company" && activeTab === "locations") return item.company?.company_name || "—";
    if (col.key === "company_id" && activeTab === "coordinators") return companies.find((c) => c.id === item.company_id)?.company_name || "—";
    if (col.key === "location_id" && activeTab === "coordinators") return locations.find((l) => l.id === item.location_id)?.location_name || "—";
    return item[col.key] || "—";
  };

  const columns = tableColumns();

  // ---------- JSX ----------
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        variants={overlayVariants}
        initial="hidden"
        animate="visible"
        exit="hidden"
      >
        <motion.div
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col border border-slate-200/60 dark:border-slate-700/50 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/60 dark:border-slate-700/50 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <h2 className="text-lg font-display font-bold text-slate-900 dark:text-white">
              Enterprise Management
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-slate-200/60 dark:border-slate-700/50 px-6 bg-slate-50/50 dark:bg-slate-900/50">
            <nav className="flex space-x-1">
              {tabs.map((tab) => {
                const Icon = tabIcons[tab];
                const isActive = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium capitalize border-b-2 transition-all ${
                      isActive
                        ? "border-indigo-500 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {tab}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {loading ? "Loading..." : `${filteredItems.length} ${activeTab}`}
              </span>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder={`Search ${activeTab}...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-48"
                  />
                </div>
                <button
                  onClick={fetchData}
                  className="p-2 rounded-lg border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={handleAdd}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-lg shadow-indigo-500/25 transition-all"
                >
                  <Plus className="w-4 h-4" /> Add {activeTab.slice(0, -1)}
                </button>
              </div>
            </div>

            {/* Table */}
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-900/50">
                    <tr>
                      {columns.map((col) => (
                        <th key={col.key} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          {col.label}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
                    {filteredItems.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                        {columns.map((col) => (
                          <td key={col.key} className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300 max-w-[200px] truncate">
                            {renderCell(item, col)}
                          </td>
                        ))}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/30 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredItems.length === 0 && (
                      <tr>
                        <td colSpan={columns.length + 1} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                          <div className="flex flex-col items-center gap-2">
                            <Search className="w-8 h-8 opacity-50" />
                            <span>No {activeTab} found</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Edit/Add Form */}
            <AnimatePresence>
              {editingItem && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="border border-indigo-200 dark:border-indigo-700 rounded-xl bg-indigo-50/50 dark:bg-indigo-900/10 p-5 mt-4">
                    <h4 className="text-sm font-display font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                      {editingItem.id ? <><Edit className="w-4 h-4 text-indigo-500" /> Edit {activeTab.slice(0, -1)}</> : <><Plus className="w-4 h-4 text-indigo-500" /> Add {activeTab.slice(0, -1)}</>}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {formFields().map((field) => (
                        <div key={field.key} className={field.type === "address" ? "sm:col-span-2 lg:col-span-3" : ""}>
                          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                            {field.label}
                            {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                          </label>
                          {field.type === "select" ? (
                            <select
                              value={formData[field.key] || ""}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg text-sm py-2 px-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            >
                              <option value="">Select...</option>
                              {field.options?.map((opt: any) => (
                                <option key={opt.value || opt} value={opt.value || opt}>
                                  {opt.label || opt}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type={field.type}
                              value={formData[field.key] || ""}
                              onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                              placeholder={`Enter ${field.label.toLowerCase()}`}
                              className="w-full border border-slate-200 dark:border-slate-600 rounded-lg text-sm py-2 px-3 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 flex justify-end gap-2 pt-4 border-t border-slate-200/60 dark:border-slate-700/50">
                      <button
                        onClick={() => setEditingItem(null)}
                        className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-lg shadow-indigo-500/25 disabled:opacity-50 transition-all"
                      >
                        {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> {editingItem?.id ? "Update" : "Save"}</>}
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}