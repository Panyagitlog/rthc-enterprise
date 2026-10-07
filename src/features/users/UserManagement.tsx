import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Ban, Building2, Check, ChevronDown, Eye, Loader2, Mail, MapPin, Pencil, Phone, Plus, RotateCcw, Search, ShieldCheck, UserRound, X } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { isSupabaseConfigured, normalizeRole, supabase } from "../../services/supabase";

type CompanyRecord = {
  id: string;
  company_name: string;
};

type LocationRecord = {
  id: string;
  location_name: string;
  company_id?: string | null;
};

type UserRecord = {
  id: string;
  auth_user_id?: string | null;
  employee_code?: string | null;
  name: string;
  email: string;
  mobile?: string | null;
  role: string;
  company_id?: string | null;
  location_id?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  company?: { company_name?: string | null } | null;
  location?: { location_name?: string | null } | null;
};

type UserFormState = {
  employee_code: string;
  name: string;
  email: string;
  mobile: string;
  role: "COORDINATOR" | "AUDITOR";
  company_id: string;
  location_id: string;
  status: "ACTIVE" | "INACTIVE";
};

const emptyForm = (): UserFormState => ({
  employee_code: "",
  name: "",
  email: "",
  mobile: "",
  role: "COORDINATOR",
  company_id: "",
  location_id: "",
  status: "ACTIVE",
});

const roleLabel = (value?: string | null) => {
  const normalized = normalizeRole(value || "");
  if (!normalized) return "Unknown";
  return normalized.replace(/_/g, " ");
};

const statusPill = (status?: string | null) => {
  const normalized = String(status || "INACTIVE").toUpperCase();
  const active = normalized === "ACTIVE";

  return {
    className: active
      ? "border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-700/80 dark:bg-emerald-900/20 dark:text-emerald-300"
      : "border border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-700/70 dark:text-slate-300",
    label: active ? "Active" : "Inactive",
  };
};

const getInitials = (name: string) => name
  .split(/\s+/)
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0])
  .join("")
  .toUpperCase() || "U";

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export default function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [locations, setLocations] = useState<LocationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [companyFilter, setCompanyFilter] = useState("ALL");
  const [locationFilter, setLocationFilter] = useState("ALL");
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<UserFormState>(emptyForm());
  const [resetTarget, setResetTarget] = useState<UserRecord | null>(null);

  const fetchData = async () => {
    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        setUsers([]);
        setCompanies([]);
        setLocations([]);
        toast.error("Supabase is not configured. User management cannot load real user data.");
        return;
      }

      const [usersResponse, companiesResponse, locationsResponse] = await Promise.all([
        supabase
          .from("users")
          .select(
            "id, auth_user_id, employee_code, name, email, mobile, role, company_id, location_id, status, created_at, updated_at, company:companies(company_name), location:locations(location_name)"
          )
          .order("name", { ascending: true }),
        supabase.from("companies").select("id, company_name").order("company_name", { ascending: true }),
        supabase.from("locations").select("id, location_name, company_id").order("location_name", { ascending: true }),
      ]);

      if (usersResponse.error) throw usersResponse.error;
      if (companiesResponse.error) throw companiesResponse.error;
      if (locationsResponse.error) throw locationsResponse.error;

      setUsers((usersResponse.data as UserRecord[]) || []);
      setCompanies((companiesResponse.data as CompanyRecord[]) || []);
      setLocations((locationsResponse.data as LocationRecord[]) || []);
    } catch (error: any) {
      console.error("Failed to load user management data:", error);
      toast.error(error?.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchData();
  }, []);

  useEffect(() => {
    if (companyFilter !== "ALL") {
      setLocationFilter("ALL");
    }
  }, [companyFilter]);

  const companyMap = useMemo(
    () => Object.fromEntries(companies.map((company) => [company.id, company.company_name])),
    [companies]
  );

  const filteredUsers = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch = !searchText || [
        user.name,
        user.email,
        user.mobile || "",
        user.employee_code || "",
      ].some((value) => value.toLowerCase().includes(searchText));

      const matchesRole = roleFilter === "ALL" || normalizeRole(user.role) === roleFilter;
      const matchesStatus = statusFilter === "ALL" || String(user.status || "INACTIVE").toUpperCase() === statusFilter;
      const matchesCompany = companyFilter === "ALL" || user.company_id === companyFilter;
      const matchesLocation = locationFilter === "ALL" || user.location_id === locationFilter;

      return matchesSearch && matchesRole && matchesStatus && matchesCompany && matchesLocation;
    });
  }, [users, search, roleFilter, statusFilter, companyFilter, locationFilter]);

  const companyOptions = useMemo(
    () => (companyFilter === "ALL" ? companies : companies.filter((company) => company.id === companyFilter)),
    [companies, companyFilter]
  );

  const locationOptions = useMemo(
    () => (
      locationFilter === "ALL"
        ? locations.filter((location) => companyFilter === "ALL" || location.company_id === companyFilter)
        : locations.filter((location) => location.id === locationFilter)
    ),
    [locations, companyFilter, locationFilter]
  );

  const openAddUser = () => {
    setForm(emptyForm());
    setIsAddOpen(true);
  };

  const handleFormChange = (field: keyof UserFormState, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const resetFormAndClose = () => {
    setForm(emptyForm());
    setIsAddOpen(false);
    setIsEditOpen(false);
  };

  const validateUserForm = (nextForm: UserFormState) => {
    if (!nextForm.employee_code.trim()) return "Employee code is required.";
    if (!nextForm.name.trim()) return "Name is required.";
    if (!nextForm.email.trim()) return "Email is required.";
    if (!isValidEmail(nextForm.email.trim())) return "Please provide a valid email address.";
    if (!nextForm.role) return "Role is required.";

    return "";
  };

  const handleAddUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationMessage = validateUserForm(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const emailValue = form.email.trim().toLowerCase();
    const employeeCode = form.employee_code.trim();

    if (!isSupabaseConfigured) {
      toast.error("Supabase is not configured. User creation is unavailable.");
      return;
    }

    try {
      setIsSubmitting(true);

      const duplicateEmployee = await supabase.from("users").select("id").eq("employee_code", employeeCode).maybeSingle();
      if (duplicateEmployee.data) {
        toast.error("A user with this employee code already exists.");
        return;
      }

      const duplicateEmail = await supabase.from("users").select("id").eq("email", emailValue).maybeSingle();
      if (duplicateEmail.data) {
        toast.error("A user with this email already exists.");
        return;
      }

      const tempPassword = `DMCFS-${Math.random().toString(36).slice(2, 10).toUpperCase()}!${Math.random().toString(36).slice(2, 6)}`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: emailValue,
        password: tempPassword,
        options: {
          data: {
            full_name: form.name.trim(),
            role: form.role,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      const authUserId = authData?.user?.id || null;
      if (!authUserId) {
        throw new Error("Supabase did not return an auth user id. Please verify the account creation flow.");
      }

      const { error: insertError } = await supabase.from("users").insert({
        auth_user_id: authUserId,
        employee_code: employeeCode,
        name: form.name.trim(),
        email: emailValue,
        mobile: form.mobile.trim() || null,
        role: form.role,
        company_id: form.company_id || null,
        location_id: form.location_id || null,
        status: form.status,
      });

      if (insertError) {
        throw insertError;
      }

      await supabase.auth.resetPasswordForEmail(emailValue, {
        redirectTo: `${window.location.origin}/`,
      });

      toast.success("User created and password reset email sent.");
      resetFormAndClose();
      await fetchData();
    } catch (error: any) {
      console.error("Failed to add user:", error);
      toast.error(error?.message || "Unable to create user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (user: UserRecord) => {
    setSelectedUser(user);
    setForm({
      employee_code: user.employee_code || "",
      name: user.name || "",
      email: user.email || "",
      mobile: user.mobile || "",
      role: (normalizeRole(user.role) === "COORDINATOR" ? "COORDINATOR" : "AUDITOR") as "COORDINATOR" | "AUDITOR",
      company_id: user.company_id || "",
      location_id: user.location_id || "",
      status: (String(user.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "ACTIVE" : "INACTIVE") as "ACTIVE" | "INACTIVE",
    });
    setIsEditOpen(true);
  };

  const handleUpdateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedUser) return;

    const validationMessage = validateUserForm(form);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    try {
      setIsSubmitting(true);

      const updatedEmployeeCode = form.employee_code.trim();
      const duplicateEmployee = await supabase
        .from("users")
        .select("id")
        .neq("id", selectedUser.id)
        .eq("employee_code", updatedEmployeeCode)
        .maybeSingle();

      if (duplicateEmployee.data) {
        toast.error("Another user already uses this employee code.");
        return;
      }

      const { error } = await supabase
        .from("users")
        .update({
          employee_code: updatedEmployeeCode,
          name: form.name.trim(),
          mobile: form.mobile.trim() || null,
          role: form.role,
          company_id: form.company_id || null,
          location_id: form.location_id || null,
          status: form.status,
        })
        .eq("id", selectedUser.id);

      if (error) throw error;

      toast.success("User updated successfully.");
      resetFormAndClose();
      await fetchData();
    } catch (error: any) {
      console.error("Failed to update user:", error);
      toast.error(error?.message || "Unable to update user.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleUserStatus = async (user: UserRecord) => {
    const nextStatus = String(user.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const confirmText = nextStatus === "INACTIVE"
      ? "Are you sure you want to deactivate this user?"
      : "Are you sure you want to activate this user?";

    if (!window.confirm(confirmText)) return;

    try {
      const { error } = await supabase.from("users").update({ status: nextStatus }).eq("id", user.id);
      if (error) throw error;
      toast.success(`${user.name} is now ${nextStatus === "ACTIVE" ? "active" : "inactive"}.`);
      await fetchData();
    } catch (error: any) {
      console.error("Failed to update status:", error);
      toast.error(error?.message || "Unable to update status.");
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget) return;

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetTarget.email, {
        redirectTo: `${window.location.origin}/`,
      });
      if (error) throw error;
      toast.success(`Password reset instructions have been sent to ${resetTarget.email}.`);
      setResetTarget(null);
      setIsResetOpen(false);
    } catch (error: any) {
      console.error("Failed to send reset email:", error);
      toast.error(error?.message || "Unable to send password reset instructions.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => navigate("/app-select")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Application Selector
        </button>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">User Management</h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                Manage DMCFS platform users and account access.
              </p>
            </div>

            <button
              type="button"
              onClick={openAddUser}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 dark:bg-[#FF6600] dark:text-slate-950 dark:hover:bg-[#ff7d2d]"
            >
              <Plus className="h-4 w-4" />
              Add User
            </button>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="xl:col-span-2">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Search users
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search users..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none ring-0 transition focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Role
              </label>
              <div className="relative">
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="ALL">All</option>
                  <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                  <option value="COORDINATOR">COORDINATOR</option>
                  <option value="AUDITOR">AUDITOR</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Status
              </label>
              <div className="relative">
                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Company
              </label>
              <div className="relative">
                <select
                  value={companyFilter}
                  onChange={(event) => setCompanyFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                >
                  <option value="ALL">All</option>
                  {companies.map((company) => (
                    <option key={company.id} value={company.id}>{company.company_name}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                Location
              </label>
              <div className="relative">
                <select
                  value={locationFilter}
                  onChange={(event) => setLocationFilter(event.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-9 text-sm outline-none transition focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                  disabled={companyFilter !== "ALL" && !locations.some((location) => location.company_id === companyFilter)}
                >
                  <option value="ALL">All</option>
                  {locations
                    .filter((location) => companyFilter === "ALL" || location.company_id === companyFilter)
                    .map((location) => (
                      <option key={location.id} value={location.id}>{location.location_name}</option>
                    ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {loading ? (
            <div className="flex min-h-[280px] items-center justify-center gap-3 text-slate-500 dark:text-slate-300">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading users...
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <UserRound className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">No users match the current filters</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Try adjusting the search or filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950/70">
                  <tr className="text-left text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                    <th className="px-4 py-3">Employee Code</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Mobile</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Company</th>
                    <th className="px-4 py-3">Location</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {filteredUsers.map((user) => {
                    const statusBadge = statusPill(user.status);

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200">{user.employee_code || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                              {getInitials(user.name)}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-white">{user.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{user.mobile || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-300">
                            {roleLabel(user.role)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{user.company?.company_name || companyMap[user.company_id || ""] || "—"}</td>
                        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300">{user.location?.location_name || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusBadge.className}`}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" onClick={() => setSelectedUser(user)} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title="View">
                              <Eye className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => startEdit(user)} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title="Edit">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => { setResetTarget(user); setIsResetOpen(true); }} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title="Reset Password">
                              <RotateCcw className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => toggleUserStatus(user)} className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" title={String(user.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "Deactivate" : "Activate"}>
                              {String(user.status || "ACTIVE").toUpperCase() === "ACTIVE" ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Add User</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Create a new platform user account.</p>
              </div>
              <button type="button" onClick={resetFormAndClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Employee Code *
                  <input value={form.employee_code} onChange={(event) => handleFormChange("employee_code", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950" />
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Role *
                  <select value={form.role} onChange={(event) => handleFormChange("role", event.target.value as UserFormState["role"])} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950">
                    <option value="COORDINATOR">COORDINATOR</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
                  Name *
                  <input value={form.name} onChange={(event) => handleFormChange("name", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950" />
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
                  Email *
                  <input type="email" value={form.email} onChange={(event) => handleFormChange("email", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950" />
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Mobile
                  <input value={form.mobile} onChange={(event) => handleFormChange("mobile", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950" />
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Status
                  <select value={form.status} onChange={(event) => handleFormChange("status", event.target.value as UserFormState["status"])} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Company
                  <select value={form.company_id} onChange={(event) => {
                    const companyId = event.target.value;
                    handleFormChange("company_id", companyId);
                    if (companyId !== form.company_id) {
                      handleFormChange("location_id", "");
                    }
                  }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950">
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.company_name}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Location
                  <select value={form.location_id} onChange={(event) => handleFormChange("location_id", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950" disabled={!form.company_id}>
                    <option value="">Select location</option>
                    {locations.filter((location) => !form.company_id || location.company_id === form.company_id).map((location) => (
                      <option key={location.id} value={location.id}>{location.location_name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetFormAndClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#FF6600] dark:text-slate-950">
                  {isSubmitting ? "Creating user..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">Edit User</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update profile details and account access.</p>
              </div>
              <button type="button" onClick={resetFormAndClose} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Employee Code *
                  <input value={form.employee_code} onChange={(event) => handleFormChange("employee_code", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950" />
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Role *
                  <select value={form.role} onChange={(event) => handleFormChange("role", event.target.value as UserFormState["role"])} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950">
                    <option value="COORDINATOR">COORDINATOR</option>
                    <option value="AUDITOR">AUDITOR</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
                  Name *
                  <input value={form.name} onChange={(event) => handleFormChange("name", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950" />
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 md:col-span-2">
                  Email
                  <input value={form.email} disabled className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2.5 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400" />
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Mobile
                  <input value={form.mobile} onChange={(event) => handleFormChange("mobile", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950" />
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Status
                  <select value={form.status} onChange={(event) => handleFormChange("status", event.target.value as UserFormState["status"])} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950">
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Company
                  <select value={form.company_id} onChange={(event) => {
                    const companyId = event.target.value;
                    handleFormChange("company_id", companyId);
                    if (companyId !== form.company_id) {
                      handleFormChange("location_id", "");
                    }
                  }} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950">
                    <option value="">Select company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>{company.company_name}</option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-medium text-slate-700 dark:text-slate-200">
                  Location
                  <select value={form.location_id} onChange={(event) => handleFormChange("location_id", event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 outline-none focus:border-slate-300 dark:border-slate-700 dark:bg-slate-950" disabled={!form.company_id}>
                    <option value="">Select location</option>
                    {locations.filter((location) => !form.company_id || location.company_id === form.company_id).map((location) => (
                      <option key={location.id} value={location.id}>{location.location_name}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={resetFormAndClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmitting} className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#FF6600] dark:text-slate-950">
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedUser && !isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-100">
                  {getInitials(selectedUser.name)}
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">{selectedUser.name}</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{selectedUser.email}</p>
                </div>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"><UserRound className="h-3.5 w-3.5" /> Name</div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{selectedUser.name}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> Role</div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{roleLabel(selectedUser.role)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"><Building2 className="h-3.5 w-3.5" /> Company</div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{selectedUser.company?.company_name || companyMap[selectedUser.company_id || ""] || "—"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"><MapPin className="h-3.5 w-3.5" /> Location</div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{selectedUser.location?.location_name || "—"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"><Mail className="h-3.5 w-3.5" /> Email</div>
                <div className="text-sm font-medium break-all text-slate-800 dark:text-slate-100">{selectedUser.email}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"><Phone className="h-3.5 w-3.5" /> Mobile</div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{selectedUser.mobile || "—"}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"><Check className="h-3.5 w-3.5" /> Status</div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{statusPill(selectedUser.status).label}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400"><ShieldCheck className="h-3.5 w-3.5" /> Employee Code</div>
                <div className="text-sm font-medium text-slate-800 dark:text-slate-100">{selectedUser.employee_code || "—"}</div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button type="button" onClick={() => { startEdit(selectedUser); setSelectedUser(null); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <Pencil className="h-4 w-4" /> Edit
              </button>
              <button type="button" onClick={() => { setResetTarget(selectedUser); setIsResetOpen(true); setSelectedUser(null); }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                <RotateCcw className="h-4 w-4" /> Reset Password
              </button>
              <button type="button" onClick={() => toggleUserStatus(selectedUser)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-[#FF6600] dark:text-slate-950">
                {String(selectedUser.status || "ACTIVE").toUpperCase() === "ACTIVE" ? <Ban className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                {String(selectedUser.status || "ACTIVE").toUpperCase() === "ACTIVE" ? "Deactivate" : "Activate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isResetOpen && resetTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-semibold">Reset Password</h3>
              <button type="button" onClick={() => { setIsResetOpen(false); setResetTarget(null); }} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
              Send password reset instructions to <span className="font-semibold text-slate-900 dark:text-white">{resetTarget.email}</span>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setIsResetOpen(false); setResetTarget(null); }} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                Cancel
              </button>
              <button type="button" onClick={handleResetPassword} className="rounded-xl bg-[#0F172A] px-4 py-2.5 text-sm font-medium text-white dark:bg-[#FF6600] dark:text-slate-950">
                Send Reset Link
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="top-right" />
    </div>
  );
}
