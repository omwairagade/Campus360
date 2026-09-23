import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  IndianRupee,
} from "lucide-react";
import { apiDelete, apiGet, apiPatch, apiPost } from "../api";

function AdminAcademicYears() {
  const navigate = useNavigate();

  const [academicYears, setAcademicYears] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);

  const [form, setForm] = useState({
    name: "",
    startYear: "",
    endYear: "",
    isActive: false,
  });

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const currentYear = new Date().getFullYear();

  const loadAcademicYears = async (showRefresh = false) => {
    try {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (activeFilter !== "") {
        params.set("active", activeFilter);
      }

      const query = params.toString();

      const response = await apiGet(
        `/admin/academic-years${query ? `?${query}` : ""}`
      );

      const data = response?.academicYears || response?.data || [];

      setAcademicYears(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to load academic years:", error);

      setMessage({
        type: "error",
        text: error?.message || "Failed to load academic years.",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAcademicYears();
  }, [search, activeFilter]);

  const resetForm = () => {
    setForm({
      name: "",
      startYear: "",
      endYear: "",
      isActive: false,
    });

    setEditingYear(null);
  };

  const openAddModal = () => {
    resetForm();

    setMessage({
      type: "",
      text: "",
    });

    setModalOpen(true);
  };

  const openEditModal = (academicYear) => {
    setEditingYear(academicYear);

    setForm({
      name: academicYear.name || "",
      startYear: academicYear.startYear || "",
      endYear: academicYear.endYear || "",
      isActive: Boolean(academicYear.isActive),
    });

    setMessage({
      type: "",
      text: "",
    });

    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    resetForm();
  };

  const handleChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleStartYearChange = (value) => {
    const numericValue = value.replace(/\D/g, "").slice(0, 4);

    setForm((previous) => ({
      ...previous,
      startYear: numericValue,
      endYear:
        numericValue.length === 4
          ? String(Number(numericValue) + 1)
          : previous.endYear,
      name:
        numericValue.length === 4
          ? `${numericValue}-${String(Number(numericValue) + 1).slice(-2)}`
          : previous.name,
    }));
  };

  const validateForm = () => {
    const name = form.name.trim();
    const startYear = Number(form.startYear);
    const endYear = Number(form.endYear);

    if (!name) {
      return "Academic year name is required.";
    }

    if (
      !Number.isInteger(startYear) ||
      startYear < 2000 ||
      startYear > 2100
    ) {
      return "Please enter a valid start year.";
    }

    if (
      !Number.isInteger(endYear) ||
      endYear < 2000 ||
      endYear > 2100
    ) {
      return "Please enter a valid end year.";
    }

    if (endYear !== startYear + 1) {
      return "Academic year must contain two consecutive years.";
    }

    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage({
      type: "",
      text: "",
    });

    const validationError = validateForm();

    if (validationError) {
      setMessage({
        type: "error",
        text: validationError,
      });

      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        startYear: Number(form.startYear),
        endYear: Number(form.endYear),
        isActive: Boolean(form.isActive),
      };

      if (editingYear) {
        await apiPatch(
          `/admin/academic-years/${editingYear.id}`,
          payload
        );

        setMessage({
          type: "success",
          text: "Academic year updated successfully.",
        });
      } else {
        await apiPost("/admin/academic-years", payload);

        setMessage({
          type: "success",
          text: "Academic year created successfully.",
        });
      }

      setModalOpen(false);
      resetForm();

      await loadAcademicYears(true);
    } catch (error) {
      console.error("Save academic year error:", error);

      setMessage({
        type: "error",
        text: error?.message || "Failed to save academic year.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (academicYear) => {
    const feeStructureCount =
      academicYear?._count?.feeStructures || 0;

    const confirmationMessage =
      feeStructureCount > 0
        ? `Academic year "${academicYear.name}" has ${feeStructureCount} fee structure(s). It cannot be deleted while those fee structures exist.`
        : `Are you sure you want to delete academic year "${academicYear.name}"?`;

    if (feeStructureCount > 0) {
      setMessage({
        type: "error",
        text: confirmationMessage,
      });

      return;
    }

    const confirmed = window.confirm(confirmationMessage);

    if (!confirmed) return;

    try {
      setDeletingId(academicYear.id);

      await apiDelete(`/admin/academic-years/${academicYear.id}`);

      setMessage({
        type: "success",
        text: "Academic year deleted successfully.",
      });

      await loadAcademicYears(true);
    } catch (error) {
      console.error("Delete academic year error:", error);

      setMessage({
        type: "error",
        text: error?.message || "Failed to delete academic year.",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const stats = useMemo(() => {
    const total = academicYears.length;

    const active = academicYears.filter(
      (year) => year.isActive
    ).length;

    const feeStructures = academicYears.reduce(
      (totalCount, year) =>
        totalCount + Number(year?._count?.feeStructures || 0),
      0
    );

    return {
      total,
      active,
      feeStructures,
    };
  }, [academicYears]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">

        {/* Back Button */}
        <div className="mb-5">
          <button
            type="button"
            onClick={() => navigate("/admin/dashboard")}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 font-medium transition shadow-sm"
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg">
                <CalendarDays size={25} />
              </div>

              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">
                  Academic Years
                </h1>

                <p className="text-sm text-slate-500 mt-1">
                  Manage academic sessions used for fee structures.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => loadAcademicYears(true)}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
            >
              <RefreshCw
                size={17}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-md transition"
            >
              <Plus size={18} />
              Add Academic Year
            </button>
          </div>
        </div>

        {/* Message */}
        {message.text && (
          <div
            className={`mb-6 rounded-xl border px-4 py-3 flex items-start gap-3 ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-red-50 border-red-200 text-red-700"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 size={20} className="mt-0.5 shrink-0" />
            ) : (
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
            )}

            <p className="text-sm font-medium flex-1">
              {message.text}
            </p>

            <button
              type="button"
              onClick={() =>
                setMessage({
                  type: "",
                  text: "",
                })
              }
              className="opacity-70 hover:opacity-100"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-7">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Academic Years
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {stats.total}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <CalendarDays size={22} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Active Session
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {stats.active}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 size={22} />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">
                  Fee Structures
                </p>

                <p className="text-3xl font-bold text-slate-800 mt-2">
                  {stats.feeStructures}
                </p>
              </div>

              <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <IndianRupee size={22} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Search academic year..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={activeFilter}
              onChange={(event) =>
                setActiveFilter(event.target.value)
              }
              className="w-full md:w-48 px-4 py-2.5 rounded-xl border border-slate-300 bg-white outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Sessions</option>
              <option value="true">Active Only</option>
              <option value="false">Inactive Only</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8">
              <div className="animate-pulse space-y-4">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-14 bg-slate-100 rounded-xl"
                  />
                ))}
              </div>
            </div>
          ) : academicYears.length === 0 ? (
            <div className="py-16 px-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CalendarDays size={30} />
              </div>

              <h3 className="text-lg font-semibold text-slate-800 mt-5">
                No academic years found
              </h3>

              <p className="text-sm text-slate-500 mt-2">
                Create your first academic year to start managing
                program-wise fee structures.
              </p>

              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold"
              >
                <Plus size={17} />
                Add Academic Year
              </button>
            </div>
          ) : (
            <>
              {/* Desktop */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Academic Year
                      </th>

                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Year Range
                      </th>

                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Status
                      </th>

                      <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Fee Structures
                      </th>

                      <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {academicYears.map((academicYear) => (
                      <tr
                        key={academicYear.id}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                              <CalendarDays size={19} />
                            </div>

                            <div>
                              <p className="font-semibold text-slate-800">
                                {academicYear.name}
                              </p>

                              <p className="text-xs text-slate-500 mt-0.5">
                                ID: {academicYear.id}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600">
                          {academicYear.startYear} -{" "}
                          {academicYear.endYear}
                        </td>

                        <td className="px-6 py-4">
                          {academicYear.isActive ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                              <CheckCircle2 size={14} />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                              Inactive
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-2 text-sm text-slate-700">
                            <GraduationCap
                              size={17}
                              className="text-slate-400"
                            />

                            {academicYear?._count?.feeStructures || 0}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-end items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                openEditModal(academicYear)
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm font-medium"
                            >
                              <Edit size={15} />
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                handleDelete(academicYear)
                              }
                              disabled={
                                deletingId === academicYear.id
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium"
                            >
                              <Trash2 size={15} />
                              {deletingId === academicYear.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile */}
              <div className="md:hidden divide-y divide-slate-100">
                {academicYears.map((academicYear) => (
                  <div
                    key={academicYear.id}
                    className="p-5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <CalendarDays size={20} />
                        </div>

                        <div>
                          <h3 className="font-semibold text-slate-800">
                            {academicYear.name}
                          </h3>

                          <p className="text-sm text-slate-500 mt-1">
                            {academicYear.startYear} -{" "}
                            {academicYear.endYear}
                          </p>
                        </div>
                      </div>

                      {academicYear.isActive ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold">
                          Active
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                      <GraduationCap size={17} />
                      <span>
                        {academicYear?._count?.feeStructures || 0} fee
                        structures
                      </span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(academicYear)
                        }
                        className="flex-1 inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium"
                      >
                        <Edit size={15} />
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(academicYear)
                        }
                        disabled={
                          deletingId === academicYear.id
                        }
                        className="flex-1 inline-flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-medium disabled:opacity-50"
                      >
                        <Trash2 size={15} />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Add/Edit Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-200">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">
                    {editingYear
                      ? "Edit Academic Year"
                      : "Add Academic Year"}
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    {editingYear
                      ? "Update the academic session details."
                      : "Create an academic session for fee management."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="w-9 h-9 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X size={20} />
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
                className="p-6 space-y-5"
              >
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Academic Year Name
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      handleChange(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="Example: 2026-27"
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Start Year
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={form.startYear}
                      onChange={(event) =>
                        handleStartYearChange(
                          event.target.value
                        )
                      }
                      placeholder={String(currentYear)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      End Year
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={form.endYear}
                      onChange={(event) =>
                        handleChange(
                          "endYear",
                          event.target.value
                            .replace(/\D/g, "")
                            .slice(0, 4)
                        )
                      }
                      placeholder={String(currentYear + 1)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      handleChange(
                        "isActive",
                        event.target.checked
                      )
                    }
                    className="mt-1 w-4 h-4 accent-blue-600"
                  />

                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Set as active academic year
                    </p>

                    <p className="text-xs text-slate-500 mt-1">
                      Only one academic year should normally be active.
                      Activating this one will deactivate the previous
                      active session.
                    </p>
                  </div>
                </label>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold"
                  >
                    {saving
                      ? "Saving..."
                      : editingYear
                      ? "Update Academic Year"
                      : "Create Academic Year"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminAcademicYears;