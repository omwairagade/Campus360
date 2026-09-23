import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Edit3,
  Eye,
  FileText,
  Filter,
  Layers3,
  List,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  WalletCards,
  X,
  Grid3X3,
  Building2,
  GraduationCap,
  IndianRupee,
  AlertCircle,
  CircleDollarSign,
  Receipt,
  Percent,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from "../api";

/* =========================================================
   CONSTANTS
========================================================= */

const EMPTY_FORM = {
  departmentId: "",
  programId: "",
  academicYearId: "",
  semester: "",
  name: "",
  description: "",
  dueDate: "",
  isActive: true,
  components: [],
};

const EMPTY_COMPONENT = {
  name: "",
  description: "",
  amount: "",
};

const SEMESTERS = Array.from({ length: 12 }, (_, index) => index + 1);

/* =========================================================
   HELPERS
========================================================= */

const safeNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatCurrency = (value) => {
  return `₹${safeNumber(value).toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  if (!value) return "Not specified";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateInput = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toISOString().slice(0, 10);
};

const getId = (value) => {
  const id = Number(value);
  return Number.isInteger(id) ? id : null;
};

const getInitials = (name = "") => {
  const words = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) return "FS";

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
};

const normalizeComponent = (component = {}) => ({
  id: component.id,
  name: component.name || "",
  description: component.description || "",
  amount:
    component.amount === null ||
    component.amount === undefined
      ? ""
      : component.amount,
});

const normalizeFeeStructure = (item = {}) => {
  const components = Array.isArray(item.components)
    ? item.components.map(normalizeComponent)
    : [];

  const calculatedTotal = components.reduce(
    (sum, component) => sum + safeNumber(component.amount),
    0
  );

  return {
    ...item,
    id: item.id,
    departmentId:
      item.departmentId ??
      item.department?.id ??
      "",
    programId:
      item.programId ??
      item.program?.id ??
      "",
    academicYearId:
      item.academicYearId ??
      item.academicYear?.id ??
      "",
    semester: item.semester ?? "",
    name: item.name || "",
    description: item.description || "",
    totalAmount:
      item.totalAmount !== undefined &&
      item.totalAmount !== null
        ? safeNumber(item.totalAmount)
        : calculatedTotal,
    dueDate: item.dueDate || null,
    isActive:
      item.isActive === undefined ? true : Boolean(item.isActive),
    components,
    department: item.department || null,
    program: item.program || null,
    academicYear: item.academicYear || null,
    _count: item._count || {},
  };
};

const normalizeListResponse = (response) => {
  if (Array.isArray(response)) {
    return response.map(normalizeFeeStructure);
  }

  if (Array.isArray(response?.feeStructures)) {
    return response.feeStructures.map(normalizeFeeStructure);
  }

  if (Array.isArray(response?.data)) {
    return response.data.map(normalizeFeeStructure);
  }

  return [];
};

const getErrorMessage = (error) => {
  if (!error) return "Something went wrong.";

  if (typeof error === "string") {
    return error;
  }

  return (
    error.message ||
    error?.response?.data?.message ||
    "Something went wrong."
  );
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

function AdminFeeStructures() {
  const navigate = useNavigate();

  const [feeStructures, setFeeStructures] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [academicYears, setAcademicYears] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [programFilter, setProgramFilter] = useState("");
  const [academicYearFilter, setAcademicYearFilter] = useState("");
  const [semesterFilter, setSemesterFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [viewMode, setViewMode] = useState("grid");

  const [selectedFeeStructure, setSelectedFeeStructure] =
    useState(null);

  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState("add");

  const [form, setForm] = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  /* =======================================================
     FETCH DEPARTMENTS
  ======================================================= */

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await apiGet("/admin/departments");
      const data = Array.isArray(response)
        ? response
        : response?.departments ||
          response?.data ||
          [];

      setDepartments(data);
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  }, []);

  /* =======================================================
     FETCH PROGRAMS
  ======================================================= */

  const fetchPrograms = useCallback(async () => {
    try {
      const response = await apiGet("/admin/programs");
      const data = Array.isArray(response)
        ? response
        : response?.programs ||
          response?.data ||
          [];

      setPrograms(data);
    } catch (err) {
      console.error("Failed to fetch programs:", err);
    }
  }, []);

  /* =======================================================
     FETCH ACADEMIC YEARS
  ======================================================= */

  const fetchAcademicYears = useCallback(async () => {
    try {
      const response = await apiGet(
        "/admin/academic-years"
      );

      const data = Array.isArray(response)
        ? response
        : response?.academicYears ||
          response?.data ||
          [];

      setAcademicYears(data);
    } catch (err) {
      console.error(
        "Failed to fetch academic years:",
        err
      );
    }
  }, []);

  /* =======================================================
     FETCH FEE STRUCTURES
  ======================================================= */

  const fetchFeeStructures = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response = await apiGet(
          "/admin/fee-structures"
        );

        const data = normalizeListResponse(response);

        setFeeStructures(data);
      } catch (err) {
        console.error(
          "Failed to fetch fee structures:",
          err
        );

        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDepartments();
    fetchPrograms();
    fetchAcademicYears();
    fetchFeeStructures();
  }, [
    fetchDepartments,
    fetchPrograms,
    fetchAcademicYears,
    fetchFeeStructures,
  ]);

  /* =======================================================
     FILTERED PROGRAMS
  ======================================================= */

  const formPrograms = useMemo(() => {
    if (!form.departmentId) {
      return programs;
    }

    return programs.filter(
      (program) =>
        Number(
          program.departmentId ??
            program.department?.id
        ) === Number(form.departmentId)
    );
  }, [programs, form.departmentId]);

  const filterPrograms = useMemo(() => {
    if (!departmentFilter) {
      return programs;
    }

    return programs.filter(
      (program) =>
        Number(
          program.departmentId ??
            program.department?.id
        ) === Number(departmentFilter)
    );
  }, [programs, departmentFilter]);

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filteredFeeStructures = useMemo(() => {
    const query = search.trim().toLowerCase();

    return feeStructures.filter((item) => {
      const departmentId = Number(
        item.departmentId ??
          item.department?.id
      );

      const programId = Number(
        item.programId ??
          item.program?.id
      );

      const academicYearId = Number(
        item.academicYearId ??
          item.academicYear?.id
      );

      const matchesSearch =
        !query ||
        String(item.name || "")
          .toLowerCase()
          .includes(query) ||
        String(item.description || "")
          .toLowerCase()
          .includes(query) ||
        String(item.department?.name || "")
          .toLowerCase()
          .includes(query) ||
        String(item.department?.code || "")
          .toLowerCase()
          .includes(query) ||
        String(item.program?.name || "")
          .toLowerCase()
          .includes(query) ||
        String(item.program?.code || "")
          .toLowerCase()
          .includes(query) ||
        String(item.academicYear?.name || "")
          .toLowerCase()
          .includes(query);

      const matchesDepartment =
        !departmentFilter ||
        departmentId === Number(departmentFilter);

      const matchesProgram =
        !programFilter ||
        programId === Number(programFilter);

      const matchesAcademicYear =
        !academicYearFilter ||
        academicYearId === Number(academicYearFilter);

      const matchesSemester =
        !semesterFilter ||
        Number(item.semester) ===
          Number(semesterFilter);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" &&
          item.isActive) ||
        (statusFilter === "inactive" &&
          !item.isActive);

      return (
        matchesSearch &&
        matchesDepartment &&
        matchesProgram &&
        matchesAcademicYear &&
        matchesSemester &&
        matchesStatus
      );
    });
  }, [
    feeStructures,
    search,
    departmentFilter,
    programFilter,
    academicYearFilter,
    semesterFilter,
    statusFilter,
  ]);

  /* =======================================================
     ANALYTICS
  ======================================================= */

  const analytics = useMemo(() => {
    const total = feeStructures.length;

    const active = feeStructures.filter(
      (item) => item.isActive
    ).length;

    const inactive = total - active;

    const totalConfiguredAmount = feeStructures.reduce(
      (sum, item) => sum + safeNumber(item.totalAmount),
      0
    );

    const averageAmount =
      total > 0
        ? totalConfiguredAmount / total
        : 0;

    const totalComponents = feeStructures.reduce(
      (sum, item) =>
        sum +
        (Array.isArray(item.components)
          ? item.components.length
          : 0),
      0
    );

    const departmentsCovered = new Set(
      feeStructures
        .map((item) =>
          item.departmentId ??
          item.department?.id
        )
        .filter(Boolean)
    ).size;

    const programsCovered = new Set(
      feeStructures
        .map((item) =>
          item.programId ??
          item.program?.id
        )
        .filter(Boolean)
    ).size;

    const highest = [...feeStructures].sort(
      (a, b) =>
        safeNumber(b.totalAmount) -
        safeNumber(a.totalAmount)
    )[0];

    return {
      total,
      active,
      inactive,
      totalConfiguredAmount,
      averageAmount,
      totalComponents,
      departmentsCovered,
      programsCovered,
      highest,
    };
  }, [feeStructures]);

  /* =======================================================
     FORM HANDLERS
  ======================================================= */

  const openAddModal = () => {
    setFormMode("add");
    setForm(EMPTY_FORM);
    setFormError("");
    setSuccess("");
    setShowFormModal(true);
  };

  const openEditModal = async (item) => {
    try {
      setFormMode("edit");
      setFormError("");
      setSuccess("");

      const id = item?.id;

      if (!id) {
        throw new Error(
          "Fee structure ID is missing."
        );
      }

      setForm({
        departmentId:
          item.departmentId ??
          item.department?.id ??
          "",
        programId:
          item.programId ??
          item.program?.id ??
          "",
        academicYearId:
          item.academicYearId ??
          item.academicYear?.id ??
          "",
        semester: item.semester ?? "",
        name: item.name || "",
        description: item.description || "",
        dueDate: formatDateInput(item.dueDate),
        isActive:
          item.isActive === undefined
            ? true
            : Boolean(item.isActive),
        components: Array.isArray(item.components)
          ? item.components.map(normalizeComponent)
          : [],
      });

      setShowFormModal(true);
    } catch (err) {
      setFormError(getErrorMessage(err));
    }
  };

  const handleFormChange = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleDepartmentChange = (value) => {
    setForm((previous) => ({
      ...previous,
      departmentId: value,
      programId: "",
    }));
  };

  const addComponent = () => {
    setForm((previous) => ({
      ...previous,
      components: [
        ...(previous.components || []),
        {
          ...EMPTY_COMPONENT,
        },
      ],
    }));
  };

  const removeComponent = (index) => {
    setForm((previous) => ({
      ...previous,
      components: previous.components.filter(
        (_, componentIndex) =>
          componentIndex !== index
      ),
    }));
  };

  const updateComponent = (
    index,
    field,
    value
  ) => {
    setForm((previous) => ({
      ...previous,
      components: previous.components.map(
        (component, componentIndex) =>
          componentIndex === index
            ? {
                ...component,
                [field]: value,
              }
            : component
      ),
    }));
  };

  const formTotal = useMemo(() => {
    return (form.components || []).reduce(
      (sum, component) =>
        sum + safeNumber(component.amount),
      0
    );
  }, [form.components]);

  /* =======================================================
     SUBMIT FORM
  ======================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setFormError("");
    setSuccess("");

    const departmentId = getId(form.departmentId);
    const programId = getId(form.programId);
    const academicYearId = getId(
      form.academicYearId
    );
    const semester = getId(form.semester);

    if (!departmentId) {
      setFormError(
        "Please select a department."
      );
      return;
    }

    if (!programId) {
      setFormError(
        "Please select a program."
      );
      return;
    }

    if (!academicYearId) {
      setFormError(
        "Please select an academic year."
      );
      return;
    }

    if (!semester) {
      setFormError(
        "Please select a semester."
      );
      return;
    }

    if (!form.name.trim()) {
      setFormError(
        "Please enter a fee structure name."
      );
      return;
    }

    if (
      !Array.isArray(form.components) ||
      form.components.length === 0
    ) {
      setFormError(
        "Please add at least one fee component."
      );
      return;
    }

    const invalidComponent =
      form.components.find(
        (component) =>
          !String(component.name || "").trim() ||
          safeNumber(component.amount) <= 0
      );

    if (invalidComponent) {
      setFormError(
        "Every fee component must have a name and an amount greater than zero."
      );
      return;
    }

    if (formTotal <= 0) {
      setFormError(
        "Total fee amount must be greater than zero."
      );
      return;
    }

    const selectedProgram = programs.find(
      (program) =>
        Number(program.id) ===
        Number(programId)
    );

    if (
      selectedProgram &&
      Number(
        selectedProgram.departmentId ??
          selectedProgram.department?.id
      ) !== Number(departmentId)
    ) {
      setFormError(
        "The selected program does not belong to the selected department."
      );
      return;
    }

    const payload = {
      departmentId,
      programId,
      academicYearId,
      semester,
      name: form.name.trim(),
      description:
        form.description.trim() || null,
      dueDate: form.dueDate
        ? new Date(
            `${form.dueDate}T00:00:00`
          ).toISOString()
        : null,
      isActive: Boolean(form.isActive),
      totalAmount: formTotal,
      components: form.components.map(
        (component) => ({
          name: String(
            component.name || ""
          ).trim(),
          description:
            String(
              component.description || ""
            ).trim() || null,
          amount: safeNumber(
            component.amount
          ),
        })
      ),
    };

    try {
      setFormLoading(true);

      if (formMode === "edit") {
        await apiPatch(
          `/admin/fee-structures/${selectedFeeStructure?.id}`,
          payload
        );

        setSuccess(
          "Fee structure updated successfully."
        );
      } else {
        await apiPost(
          "/admin/fee-structures",
          payload
        );

        setSuccess(
          "Fee structure created successfully."
        );
      }

      setShowFormModal(false);
      setForm(EMPTY_FORM);

      await fetchFeeStructures(true);
    } catch (err) {
      console.error(
        "Fee structure save error:",
        err
      );

      setFormError(getErrorMessage(err));
    } finally {
      setFormLoading(false);
    }
  };

  /* =======================================================
     VIEW DETAILS
  ======================================================= */

  const openDetails = async (item) => {
    try {
      setDetailsLoading(true);
      setShowDetailsModal(true);

      const response = await apiGet(
        `/admin/fee-structures/${item.id}`
      );

      const details = normalizeFeeStructure(
        response?.feeStructure ||
          response?.data ||
          response
      );

      setSelectedFeeStructure(details);
    } catch (err) {
      console.error(
        "Failed to fetch fee structure details:",
        err
      );

      setSelectedFeeStructure(
        normalizeFeeStructure(item)
      );
    } finally {
      setDetailsLoading(false);
    }
  };

  /* =======================================================
     EDIT
  ======================================================= */

  const handleEdit = (item) => {
    setSelectedFeeStructure(item);
    openEditModal(item);
  };

  /* =======================================================
     DELETE
  ======================================================= */

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;

    try {
      setDeleteLoading(true);

      await apiDelete(
        `/admin/fee-structures/${deleteTarget.id}`
      );

      setDeleteTarget(null);

      setSuccess(
        "Fee structure deleted successfully."
      );

      await fetchFeeStructures(true);
    } catch (err) {
      console.error(
        "Delete fee structure error:",
        err
      );

      setError(getErrorMessage(err));
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  /* =======================================================
     RESET FILTERS
  ======================================================= */

  const resetFilters = () => {
    setSearch("");
    setDepartmentFilter("");
    setProgramFilter("");
    setAcademicYearFilter("");
    setSemesterFilter("");
    setStatusFilter("all");
  };

  /* =======================================================
     BACK
  ======================================================= */

  const handleBack = () => {
    navigate("/admin/dashboard");
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* =================================================
          HEADER
      ================================================= */}

      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
              title="Back to Dashboard"
            >
              <ArrowLeft size={19} />
            </button>

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <Layers3 size={22} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
                Campus360 Admin Portal
              </p>

              <h1 className="truncate text-lg font-bold text-slate-900 sm:text-xl">
                Fee Structure Management
              </h1>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() =>
                fetchFeeStructures(true)
              }
              disabled={refreshing}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">
                Add Fee Structure
              </span>
              <span className="sm:hidden">
                Add
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        {/* =================================================
            HERO
        ================================================= */}

        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-blue-50">
                <WalletCards size={14} />
                Academic Finance
              </div>

              <h2 className="max-w-3xl text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl">
                Manage structured academic fees with complete control.
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
                Configure semester-wise fee structures,
                components, academic years, due dates and
                active status for every program.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <HeroMetric
                  icon={<Layers3 size={17} />}
                  label="Structures"
                  value={analytics.total}
                />

                <HeroMetric
                  icon={<CheckCircle2 size={17} />}
                  label="Active"
                  value={analytics.active}
                />

                <HeroMetric
                  icon={<GraduationCap size={17} />}
                  label="Programs"
                  value={analytics.programsCovered}
                />
              </div>
            </div>

            <div className="hidden lg:flex lg:h-36 lg:w-36 lg:items-center lg:justify-center lg:rounded-3xl lg:border lg:border-white/20 lg:bg-white/10">
              <Layers3
                size={72}
                strokeWidth={1.25}
                className="text-white/80"
              />
            </div>
          </div>
        </section>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800">
            <AlertCircle
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-bold">
                Unable to load fee structures
              </p>

              <p className="mt-1 text-sm">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-500 hover:text-red-700"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {success && (
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-bold">
                Success
              </p>

              <p className="mt-1 text-sm">
                {success}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-emerald-500 hover:text-emerald-700"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* =================================================
            KPI CARDS
        ================================================= */}

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            icon={<Layers3 size={21} />}
            title="Total Structures"
            value={analytics.total}
            subtitle="Configured fee structures"
          />

          <KpiCard
            icon={<CheckCircle2 size={21} />}
            title="Active Structures"
            value={analytics.active}
            subtitle={`${analytics.inactive} inactive`}
            iconClass="bg-emerald-50 text-emerald-600"
          />

          <KpiCard
            icon={<IndianRupee size={21} />}
            title="Configured Amount"
            value={formatCurrency(
              analytics.totalConfiguredAmount
            )}
            subtitle="Across all structures"
            iconClass="bg-amber-50 text-amber-600"
          />

          <KpiCard
            icon={<Receipt size={21} />}
            title="Average Structure"
            value={formatCurrency(
              analytics.averageAmount
            )}
            subtitle={`${analytics.totalComponents} components`}
            iconClass="bg-violet-50 text-violet-600"
          />
        </section>

        {/* =================================================
            ANALYTICS
        ================================================= */}

        <section className="mt-6 grid gap-5 lg:grid-cols-3">
          <AnalyticsPanel
            title="Coverage"
            subtitle="Academic structure coverage"
            icon={<Building2 size={19} />}
          >
            <ProgressMetric
              label="Departments covered"
              value={analytics.departmentsCovered}
              total={Math.max(
                departments.length,
                1
              )}
            />

            <ProgressMetric
              label="Programs covered"
              value={analytics.programsCovered}
              total={Math.max(
                programs.length,
                1
              )}
            />

            <ProgressMetric
              label="Active structures"
              value={analytics.active}
              total={Math.max(
                analytics.total,
                1
              )}
            />
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Fee Configuration"
            subtitle="Current financial setup"
            icon={<CircleDollarSign size={19} />}
          >
            <MetricBox
              label="Highest structure"
              value={
                analytics.highest
                  ? formatCurrency(
                      analytics.highest.totalAmount
                    )
                  : "₹0"
              }
            />

            <MetricBox
              label="Average amount"
              value={formatCurrency(
                analytics.averageAmount
              )}
            />

            <MetricBox
              label="Components"
              value={analytics.totalComponents}
            />
          </AnalyticsPanel>

          <AnalyticsPanel
            title="Structure Status"
            subtitle="Active and inactive records"
            icon={<Percent size={19} />}
          >
            <StatusAnalytics
              label="Active"
              value={analytics.active}
              total={analytics.total}
              active
            />

            <StatusAnalytics
              label="Inactive"
              value={analytics.inactive}
              total={analytics.total}
            />
          </AnalyticsPanel>
        </section>

        {/* =================================================
            SEARCH & FILTERS
        ================================================= */}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Filter
                    size={19}
                    className="text-blue-600"
                  />

                  <h2 className="text-lg font-bold text-slate-900">
                    Search & Filters
                  </h2>
                </div>

                <p className="mt-1 text-sm text-slate-500">
                  Find fee structures by program,
                  department, academic year or semester.
                </p>
              </div>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600 xl:self-auto"
              >
                <RefreshCw size={15} />
                Reset Filters
              </button>
            </div>

            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-6">
              <div className="relative xl:col-span-2">
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
                  placeholder="Search fee structures..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
                />
              </div>

              <SelectField
                value={departmentFilter}
                onChange={(value) => {
                  setDepartmentFilter(value);
                  setProgramFilter("");
                }}
                placeholder="All Departments"
                options={departments.map(
                  (department) => ({
                    value: department.id,
                    label:
                      department.code
                        ? `${department.code} — ${department.name}`
                        : department.name,
                  })
                )}
              />

              <SelectField
                value={programFilter}
                onChange={setProgramFilter}
                placeholder="All Programs"
                options={filterPrograms.map(
                  (program) => ({
                    value: program.id,
                    label:
                      program.code
                        ? `${program.code} — ${program.name}`
                        : program.name,
                  })
                )}
              />

              <SelectField
                value={academicYearFilter}
                onChange={setAcademicYearFilter}
                placeholder="All Academic Years"
                options={academicYears.map(
                  (year) => ({
                    value: year.id,
                    label: year.name,
                  })
                )}
              />

              <SelectField
                value={semesterFilter}
                onChange={setSemesterFilter}
                placeholder="All Semesters"
                options={SEMESTERS.map(
                  (semester) => ({
                    value: semester,
                    label: `Semester ${semester}`,
                  })
                )}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <div className="flex flex-wrap gap-2">
                {[
                  ["all", "All"],
                  ["active", "Active"],
                  ["inactive", "Inactive"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() =>
                      setStatusFilter(value)
                    }
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      statusFilter === value
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-500">
                  {filteredFeeStructures.length}{" "}
                  result
                  {filteredFeeStructures.length !==
                  1
                    ? "s"
                    : ""}
                </span>

                <div className="ml-2 flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                  <button
                    type="button"
                    onClick={() =>
                      setViewMode("grid")
                    }
                    className={`rounded-lg p-2 ${
                      viewMode === "grid"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-400"
                    }`}
                    title="Grid view"
                  >
                    <Grid3X3 size={17} />
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setViewMode("list")
                    }
                    className={`rounded-lg p-2 ${
                      viewMode === "list"
                        ? "bg-white text-blue-600 shadow-sm"
                        : "text-slate-400"
                    }`}
                    title="List view"
                  >
                    <List size={17} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =================================================
            RECORDS
        ================================================= */}

        <section className="mt-6">
          <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-2">
                <Layers3
                  size={20}
                  className="text-blue-600"
                />

                <h2 className="text-xl font-black text-slate-900">
                  Fee Structure Records
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Manage semester-wise academic fee
                configurations.
              </p>
            </div>

            <div className="text-sm font-semibold text-slate-500">
              Showing{" "}
              <span className="text-slate-900">
                {filteredFeeStructures.length}
              </span>{" "}
              of{" "}
              <span className="text-slate-900">
                {feeStructures.length}
              </span>
            </div>
          </div>

          {loading ? (
            <SkeletonGrid />
          ) : filteredFeeStructures.length ===
            0 ? (
            <EmptyState
              onAdd={openAddModal}
              hasFilters={
                Boolean(search) ||
                Boolean(departmentFilter) ||
                Boolean(programFilter) ||
                Boolean(academicYearFilter) ||
                Boolean(semesterFilter) ||
                statusFilter !== "all"
              }
              onReset={resetFilters}
            />
          ) : viewMode === "grid" ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredFeeStructures.map(
                (item) => (
                  <FeeStructureCard
                    key={item.id}
                    item={item}
                    onView={openDetails}
                    onEdit={handleEdit}
                    onDelete={setDeleteTarget}
                  />
                )
              )}
            </div>
          ) : (
            <FeeStructureList
              items={filteredFeeStructures}
              onView={openDetails}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
            />
          )}
        </section>
      </main>

      {/* ===================================================
          FORM MODAL
      =================================================== */}

      {showFormModal && (
        <FeeStructureFormModal
          mode={formMode}
          form={form}
          formPrograms={formPrograms}
          academicYears={academicYears}
          departments={departments}
          formTotal={formTotal}
          loading={formLoading}
          error={formError}
          onClose={() => {
            if (!formLoading) {
              setShowFormModal(false);
            }
          }}
          onSubmit={handleSubmit}
          onChange={handleFormChange}
          onDepartmentChange={
            handleDepartmentChange
          }
          onAddComponent={addComponent}
          onRemoveComponent={removeComponent}
          onUpdateComponent={updateComponent}
        />
      )}

      {/* ===================================================
          DETAILS MODAL
      =================================================== */}

      {showDetailsModal && (
        <FeeStructureDetailsModal
          item={selectedFeeStructure}
          loading={detailsLoading}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedFeeStructure(null);
          }}
          onEdit={() => {
            const item = selectedFeeStructure;

            setShowDetailsModal(false);

            if (item) {
              handleEdit(item);
            }
          }}
        />
      )}

      {/* ===================================================
          DELETE MODAL
      =================================================== */}

      {deleteTarget && (
        <DeleteModal
          item={deleteTarget}
          loading={deleteLoading}
          onCancel={() => {
            if (!deleteLoading) {
              setDeleteTarget(null);
            }
          }}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}

/* =========================================================
   HERO METRIC
========================================================= */

function HeroMetric({
  icon,
  label,
  value,
}) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
        {icon}
      </div>

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-100">
          {label}
        </p>

        <p className="text-lg font-black">
          {value}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   KPI CARD
========================================================= */

function KpiCard({
  icon,
  title,
  value,
  subtitle,
  iconClass = "bg-blue-50 text-blue-600",
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>

        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            {title}
          </p>

          <p className="mt-1 text-xl font-black text-slate-900">
            {value}
          </p>
        </div>
      </div>

      <p className="mt-4 text-sm text-slate-500">
        {subtitle}
      </p>
    </div>
  );
}

/* =========================================================
   ANALYTICS PANEL
========================================================= */

function AnalyticsPanel({
  title,
  subtitle,
  icon,
  children,
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          {icon}
        </div>

        <div>
          <h3 className="font-bold text-slate-900">
            {title}
          </h3>

          <p className="mt-0.5 text-xs text-slate-500">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

/* =========================================================
   PROGRESS METRIC
========================================================= */

function ProgressMetric({
  label,
  value,
  total,
}) {
  const percentage =
    total > 0
      ? Math.min(
          100,
          Math.round(
            (safeNumber(value) /
              safeNumber(total)) *
              100
          )
        )
      : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-slate-600">
          {label}
        </span>

        <span className="text-sm font-bold text-slate-900">
          {value}
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{
            width: `${percentage}%`,
          }}
        />
      </div>
    </div>
  );
}

/* =========================================================
   STATUS ANALYTICS
========================================================= */

function StatusAnalytics({
  label,
  value,
  total,
  active = false,
}) {
  const percentage =
    total > 0
      ? Math.round(
          (safeNumber(value) /
            safeNumber(total)) *
            100
        )
      : 0;

  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 p-4">
      <div className="flex items-center gap-3">
        <span
          className={`h-3 w-3 rounded-full ${
            active
              ? "bg-emerald-500"
              : "bg-slate-400"
          }`}
        />

        <span className="text-sm font-semibold text-slate-700">
          {label}
        </span>
      </div>

      <div className="text-right">
        <p className="font-black text-slate-900">
          {value}
        </p>

        <p className="text-xs text-slate-500">
          {percentage}%
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   METRIC BOX
========================================================= */

function MetricBox({
  label,
  value,
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-lg font-black text-slate-900">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  value,
  onChange,
  placeholder,
  options = [],
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
      >
        <option value="">
          {placeholder}
        </option>

        {options.map((option) => (
          <option
            key={String(option.value)}
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>

      <ChevronDown
        size={16}
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
      />
    </div>
  );
}

/* =========================================================
   FEE STRUCTURE CARD
========================================================= */

function FeeStructureCard({
  item,
  onView,
  onEdit,
  onDelete,
}) {
  const components = Array.isArray(
    item.components
  )
    ? item.components
    : [];

  return (
    <article className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg">
      <div className="border-b border-slate-100 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-sm font-black text-white shadow-sm">
              {getInitials(item.name)}
            </div>

            <div className="min-w-0">
              <h3 className="truncate font-black text-slate-900">
                {item.name}
              </h3>

              <p className="mt-0.5 truncate text-xs font-semibold text-blue-600">
                {item.program?.code ||
                  item.program?.name ||
                  "Program"}
              </p>
            </div>
          </div>

          <StatusBadge active={item.isActive} />
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Fee
            </p>

            <p className="mt-1 text-2xl font-black text-slate-900">
              {formatCurrency(
                item.totalAmount
              )}
            </p>
          </div>

          <div className="rounded-xl bg-white px-3 py-2 text-right shadow-sm ring-1 ring-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Semester
            </p>

            <p className="text-sm font-black text-blue-600">
              {item.semester || "—"}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="space-y-3">
          <CardInfo
            icon={<Building2 size={15} />}
            label="Department"
            value={
              item.department?.code ||
              item.department?.name ||
              "Not specified"
            }
          />

          <CardInfo
            icon={<GraduationCap size={15} />}
            label="Program"
            value={
              item.program?.name ||
              "Not specified"
            }
          />

          <CardInfo
            icon={<CalendarDays size={15} />}
            label="Academic Year"
            value={
              item.academicYear?.name ||
              "Not specified"
            }
          />

          <CardInfo
            icon={<Clock3 size={15} />}
            label="Due Date"
            value={formatDate(
              item.dueDate
            )}
          />
        </div>

        <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Receipt
              size={16}
              className="text-blue-600"
            />

            <span className="text-sm font-semibold text-slate-600">
              Components
            </span>
          </div>

          <span className="font-black text-slate-900">
            {components.length}
          </span>
        </div>

        {item.description && (
          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-500">
            {item.description}
          </p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-2">
          <ActionButton
            icon={<Eye size={16} />}
            label="View"
            onClick={() => onView(item)}
          />

          <ActionButton
            icon={<Edit3 size={16} />}
            label="Edit"
            onClick={() => onEdit(item)}
          />

          <ActionButton
            danger
            icon={<Trash2 size={16} />}
            label="Delete"
            onClick={() => onDelete(item)}
          />
        </div>
      </div>
    </article>
  );
}

/* =========================================================
   CARD INFO
========================================================= */

function CardInfo({
  icon,
  label,
  value,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>

        <p className="mt-0.5 truncate text-sm font-semibold text-slate-700">
          {value}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   STATUS BADGE
========================================================= */

function StatusBadge({
  active,
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          active
            ? "bg-emerald-500"
            : "bg-slate-400"
        }`}
      />

      {active ? "Active" : "Inactive"}
    </span>
  );
}

/* =========================================================
   ACTION BUTTON
========================================================= */

function ActionButton({
  icon,
  label,
  onClick,
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2 text-xs font-bold transition ${
        danger
          ? "border-red-100 bg-red-50 text-red-600 hover:border-red-200 hover:bg-red-100"
          : "border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
      }`}
    >
      {icon}
      <span className="hidden xl:inline">
        {label}
      </span>
    </button>
  );
}

/* =========================================================
   LIST VIEW
========================================================= */

function FeeStructureList({
  items,
  onView,
  onEdit,
  onDelete,
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1050px]">
          <thead className="border-b border-slate-200 bg-slate-50">
            <tr>
              <TableHeader>
                Fee Structure
              </TableHeader>

              <TableHeader>
                Department
              </TableHeader>

              <TableHeader>
                Program
              </TableHeader>

              <TableHeader>
                Academic Year
              </TableHeader>

              <TableHeader>
                Semester
              </TableHeader>

              <TableHeader>
                Total
              </TableHeader>

              <TableHeader>
                Status
              </TableHeader>

              <TableHeader align="right">
                Actions
              </TableHeader>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {items.map((item) => (
              <tr
                key={item.id}
                className="transition hover:bg-slate-50/80"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-600">
                      {getInitials(item.name)}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-bold text-slate-900">
                        {item.name}
                      </p>

                      <p className="text-xs text-slate-400">
                        {item.components?.length ||
                          0}{" "}
                        components
                      </p>
                    </div>
                  </div>
                </td>

                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {item.department?.code ||
                    item.department?.name ||
                    "—"}
                </td>

                <td className="px-5 py-4">
                  <p className="text-sm font-semibold text-slate-700">
                    {item.program?.name ||
                      "—"}
                  </p>

                  {item.program?.code && (
                    <p className="text-xs text-blue-600">
                      {item.program.code}
                    </p>
                  )}
                </td>

                <td className="px-5 py-4 text-sm font-medium text-slate-600">
                  {item.academicYear?.name ||
                    "—"}
                </td>

                <td className="px-5 py-4 text-sm font-bold text-slate-700">
                  Semester{" "}
                  {item.semester || "—"}
                </td>

                <td className="px-5 py-4 text-sm font-black text-slate-900">
                  {formatCurrency(
                    item.totalAmount
                  )}
                </td>

                <td className="px-5 py-4">
                  <StatusBadge
                    active={item.isActive}
                  />
                </td>

                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <ActionButton
                      icon={<Eye size={15} />}
                      label="View"
                      onClick={() =>
                        onView(item)
                      }
                    />

                    <ActionButton
                      icon={<Edit3 size={15} />}
                      label="Edit"
                      onClick={() =>
                        onEdit(item)
                      }
                    />

                    <ActionButton
                      danger
                      icon={<Trash2 size={15} />}
                      label="Delete"
                      onClick={() =>
                        onDelete(item)
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-slate-100 lg:hidden">
        {items.map((item) => (
          <div
            key={item.id}
            className="p-4 sm:p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-600">
                  {getInitials(item.name)}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-bold text-slate-900">
                    {item.name}
                  </p>

                  <p className="truncate text-xs text-slate-500">
                    {item.program?.name ||
                      "Program"}
                  </p>
                </div>
              </div>

              <StatusBadge
                active={item.isActive}
              />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniInfo
                label="Academic Year"
                value={
                  item.academicYear?.name ||
                  "—"
                }
              />

              <MiniInfo
                label="Semester"
                value={`Semester ${
                  item.semester || "—"
                }`}
              />

              <MiniInfo
                label="Department"
                value={
                  item.department?.code ||
                  item.department?.name ||
                  "—"
                }
              />

              <MiniInfo
                label="Total"
                value={formatCurrency(
                  item.totalAmount
                )}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <ActionButton
                icon={<Eye size={16} />}
                label="View"
                onClick={() =>
                  onView(item)
                }
              />

              <ActionButton
                icon={<Edit3 size={16} />}
                label="Edit"
                onClick={() =>
                  onEdit(item)
                }
              />

              <ActionButton
                danger
                icon={<Trash2 size={16} />}
                label="Delete"
                onClick={() =>
                  onDelete(item)
                }
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* =========================================================
   TABLE HEADER
========================================================= */

function TableHeader({
  children,
  align = "left",
}) {
  return (
    <th
      className={`px-5 py-4 text-[11px] font-black uppercase tracking-wider text-slate-400 ${
        align === "right"
          ? "text-right"
          : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

/* =========================================================
   MINI INFO
========================================================= */

function MiniInfo({
  label,
  value,
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <p className="mt-1 truncate text-sm font-bold text-slate-700">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   EMPTY STATE
========================================================= */

function EmptyState({
  onAdd,
  hasFilters,
  onReset,
}) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
        <Layers3 size={30} />
      </div>

      <h3 className="mt-5 text-lg font-black text-slate-900">
        No fee structures found
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        {hasFilters
          ? "No fee structure matches your current search and filters."
          : "Start by creating the first academic fee structure."}
      </p>

      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {hasFilters && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <RefreshCw size={16} />
            Reset Filters
          </button>
        )}

        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
        >
          <Plus size={17} />
          Add Fee Structure
        </button>
      </div>
    </div>
  );
}

/* =========================================================
   SKELETON
========================================================= */

function SkeletonGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map(
        (_, index) => (
          <div
            key={index}
            className="animate-pulse overflow-hidden rounded-3xl border border-slate-200 bg-white"
          >
            <div className="h-40 bg-slate-100" />

            <div className="space-y-4 p-5">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="h-3 w-4/5 rounded bg-slate-100" />

              <div className="grid grid-cols-3 gap-2 pt-3">
                <div className="h-9 rounded-xl bg-slate-100" />
                <div className="h-9 rounded-xl bg-slate-100" />
                <div className="h-9 rounded-xl bg-slate-100" />
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}

/* =========================================================
   FORM MODAL
========================================================= */

function FeeStructureFormModal({
  mode,
  form,
  formPrograms,
  academicYears,
  departments,
  formTotal,
  loading,
  error,
  onClose,
  onSubmit,
  onChange,
  onDepartmentChange,
  onAddComponent,
  onRemoveComponent,
  onUpdateComponent,
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Layers3 size={21} />
            </div>

            <div>
              <h2 className="text-lg font-black text-slate-900">
                {mode === "edit"
                  ? "Edit Fee Structure"
                  : "Add Fee Structure"}
              </h2>

              <p className="text-xs text-slate-500">
                Configure academic fee details and components.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={onSubmit}
          className="overflow-y-auto"
        >
          <div className="space-y-6 p-5 sm:p-6">

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                <AlertCircle
                  size={18}
                  className="mt-0.5 shrink-0"
                />

                <span>{error}</span>
              </div>
            )}

            {/* Basic Information */}
            <div>
              <SectionHeading
                icon={<FileText size={17} />}
                title="Basic Information"
                subtitle="Select the academic context for this fee structure."
              />

              <div className="mt-4 grid gap-4 md:grid-cols-2">

                {/* Department */}
                <FormSelectWithOptions
                  label="Department"
                  required
                  value={form.departmentId}
                  onChange={onDepartmentChange}
                  placeholder="Select Department"
                  options={departments.map(
                    (department) => ({
                      value: department.id,
                      label: department.code
                        ? `${department.code} — ${department.name}`
                        : department.name,
                    })
                  )}
                />

                {/* Program */}
                <FormSelectWithOptions
                  label="Program"
                  required
                  value={form.programId}
                  onChange={(value) =>
                    onChange(
                      "programId",
                      value
                    )
                  }
                  placeholder="Select Program"
                  disabled={!form.departmentId}
                  options={formPrograms.map(
                    (program) => ({
                      value: program.id,
                      label: program.code
                        ? `${program.code} — ${program.name}`
                        : program.name,
                    })
                  )}
                />

                {/* Academic Year */}
                <FormSelectWithOptions
                  label="Academic Year"
                  required
                  value={form.academicYearId}
                  onChange={(value) =>
                    onChange(
                      "academicYearId",
                      value
                    )
                  }
                  placeholder="Select Academic Year"
                  options={academicYears.map(
                    (year) => ({
                      value: year.id,
                      label:
                        year.name +
                        (year.isActive
                          ? " — Active"
                          : ""),
                    })
                  )}
                />

                {/* Semester */}
                <FormSelectWithOptions
                  label="Semester"
                  required
                  value={form.semester}
                  onChange={(value) =>
                    onChange(
                      "semester",
                      value
                    )
                  }
                  placeholder="Select Semester"
                  options={SEMESTERS.map(
                    (semester) => ({
                      value: semester,
                      label: `Semester ${semester}`,
                    })
                  )}
                />

                {/* Fee Structure Name */}
                <FormInput
                  label="Fee Structure Name"
                  required
                  value={form.name}
                  onChange={(value) =>
                    onChange(
                      "name",
                      value
                    )
                  }
                  placeholder="e.g. B.Tech CSE Semester 1 Fees"
                  className="md:col-span-2"
                />

                {/* Description */}
                <FormTextarea
                  label="Description"
                  value={form.description}
                  onChange={(value) =>
                    onChange(
                      "description",
                      value
                    )
                  }
                  placeholder="Optional description..."
                  className="md:col-span-2"
                />
              </div>
            </div>

            {/* Components */}
            <div>
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <SectionHeading
                  icon={<Receipt size={17} />}
                  title="Fee Components"
                  subtitle="Add individual components that make up the total fee."
                />

                <button
                  type="button"
                  onClick={onAddComponent}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
                >
                  <Plus size={17} />
                  Add Component
                </button>
              </div>

              <div className="mt-4 space-y-3">
                {form.components.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                    <Receipt
                      size={27}
                      className="mx-auto text-slate-400"
                    />

                    <p className="mt-3 text-sm font-bold text-slate-700">
                      No fee components added
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Add components such as Tuition,
                      Examination, Library, Lab, etc.
                    </p>
                  </div>
                ) : (
                  form.components.map(
                    (component, index) => (
                      <ComponentEditor
                        key={
                          component.id ||
                          `new-${index}`
                        }
                        index={index}
                        component={component}
                        onUpdate={
                          onUpdateComponent
                        }
                        onRemove={
                          onRemoveComponent
                        }
                      />
                    )
                  )
                )}
              </div>

              {/* Total Fee */}
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-blue-600 shadow-sm">
                    <IndianRupee size={19} />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-500">
                      Total Fee
                    </p>

                    <p className="text-xs text-blue-700">
                      Automatically calculated
                    </p>
                  </div>
                </div>

                <p className="text-2xl font-black text-blue-700">
                  {formatCurrency(formTotal)}
                </p>
              </div>
            </div>

            {/* Settings */}
            <div>
              <SectionHeading
                icon={<CalendarDays size={17} />}
                title="Payment Settings"
                subtitle="Set due date and availability."
              />

              <div className="mt-4 grid gap-4 md:grid-cols-2">

                {/* Due Date */}
                <FormInput
                  label="Due Date"
                  type="date"
                  value={form.dueDate}
                  onChange={(value) =>
                    onChange(
                      "dueDate",
                      value
                    )
                  }
                />

                {/* Active Status */}
                <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      Active Status
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Allow this fee structure to be used.
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={Boolean(
                      form.isActive
                    )}
                    onChange={(event) =>
                      onChange(
                        "isActive",
                        event.target.checked
                      )
                    }
                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <RefreshCw
                    size={17}
                    className="animate-spin"
                  />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  {mode === "edit"
                    ? "Update Fee Structure"
                    : "Create Fee Structure"}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   FORM SELECT
========================================================= */

function FormSelect({
  label,
  required,
  value,
  onChange,
  children,
  disabled = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          disabled={disabled}
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          {children}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

/* =========================================================
   FORM SELECT WITH OPTIONS
========================================================= */

function FormSelectWithOptions({
  label,
  required,
  value,
  onChange,
  placeholder,
  options = [],
  disabled = false,
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <div className="relative">
        <select
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          disabled={disabled}
          className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 pr-10 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100"
        >
          <option value="">
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={String(option.value)}
              value={option.value}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
        />
      </div>
    </div>
  );
}

/* =========================================================
   NOTE:
   Department selector requires the departments array.
   This wrapper reads the list from a custom property
   attached below by the modal-independent selector.
========================================================= */

function FormInput({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

/* =========================================================
   TEXTAREA
========================================================= */

function FormTextarea({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-bold text-slate-700">
        {label}
      </label>

      <textarea
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        rows={3}
        className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
      />
    </div>
  );
}

/* =========================================================
   SECTION HEADING
========================================================= */

function SectionHeading({
  icon,
  title,
  subtitle,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
        {icon}
      </div>

      <div>
        <h3 className="font-black text-slate-900">
          {title}
        </h3>

        <p className="mt-0.5 text-xs text-slate-500">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   COMPONENT EDITOR
========================================================= */

function ComponentEditor({
  index,
  component,
  onUpdate,
  onRemove,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-black text-blue-700">
            {index + 1}
          </div>

          <p className="text-sm font-bold text-slate-700">
            Fee Component
          </p>
        </div>

        <button
          type="button"
          onClick={() => onRemove(index)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-100"
          title="Remove component"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-[1fr_1fr_180px]">
        <input
          type="text"
          value={component.name}
          onChange={(event) =>
            onUpdate(
              index,
              "name",
              event.target.value
            )
          }
          placeholder="Component name"
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <input
          type="text"
          value={component.description}
          onChange={(event) =>
            onUpdate(
              index,
              "description",
              event.target.value
            )
          }
          placeholder="Description (optional)"
          className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
        />

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">
            ₹
          </span>

          <input
            type="number"
            min="0"
            step="1"
            value={component.amount}
            onChange={(event) =>
              onUpdate(
                index,
                "amount",
                event.target.value
              )
            }
            placeholder="Amount"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-8 pr-3 text-sm font-bold outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   DETAILS MODAL
========================================================= */

function FeeStructureDetailsModal({
  item,
  loading,
  onClose,
  onEdit,
}) {
  if (!item && !loading) return null;

  const components =
    item?.components || [];

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Layers3 size={21} />
            </div>

            <div className="min-w-0">
              <h2 className="truncate text-lg font-black text-slate-900">
                Fee Structure Details
              </h2>

              <p className="truncate text-xs text-slate-500">
                Complete configuration and component breakdown.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[400px] items-center justify-center">
            <div className="text-center">
              <RefreshCw
                size={30}
                className="mx-auto animate-spin text-blue-600"
              />

              <p className="mt-3 text-sm font-semibold text-slate-500">
                Loading details...
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto p-5 sm:p-6">
              <div className="rounded-3xl bg-gradient-to-br from-blue-700 to-indigo-700 p-6 text-white">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 text-lg font-black">
                      {getInitials(
                        item?.name
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-xl font-black">
                          {item?.name ||
                            "Fee Structure"}
                        </h3>

                        <span className="rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold">
                          {item?.isActive
                            ? "ACTIVE"
                            : "INACTIVE"}
                        </span>
                      </div>

                      <p className="mt-1 text-sm text-blue-100">
                        {item?.program?.name ||
                          "Program"}{" "}
                        • Semester{" "}
                        {item?.semester ||
                          "—"}
                      </p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-100">
                      Total Fee
                    </p>

                    <p className="mt-1 text-3xl font-black">
                      {formatCurrency(
                        item?.totalAmount
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <DetailStat
                  icon={<Building2 size={18} />}
                  label="Department"
                  value={
                    item?.department?.name ||
                    "—"
                  }
                />

                <DetailStat
                  icon={<GraduationCap size={18} />}
                  label="Program"
                  value={
                    item?.program?.name ||
                    "—"
                  }
                />

                <DetailStat
                  icon={<CalendarDays size={18} />}
                  label="Academic Year"
                  value={
                    item?.academicYear?.name ||
                    "—"
                  }
                />

                <DetailStat
                  icon={<Clock3 size={18} />}
                  label="Due Date"
                  value={formatDate(
                    item?.dueDate
                  )}
                />
              </div>

              {item?.description && (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Description
                  </p>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {item.description}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-black text-slate-900">
                      Fee Components
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Breakdown of the total amount.
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-600">
                    {components.length}{" "}
                    component
                    {components.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                </div>

                <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                  {components.length ===
                  0 ? (
                    <div className="p-8 text-center text-sm text-slate-500">
                      No components configured.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {components.map(
                        (
                          component,
                          index
                        ) => (
                          <div
                            key={
                              component.id ||
                              index
                            }
                            className="flex items-center justify-between gap-4 p-4"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-black text-blue-600">
                                {index + 1}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold text-slate-800">
                                  {
                                    component.name
                                  }
                                </p>

                                {component.description && (
                                  <p className="truncate text-xs text-slate-500">
                                    {
                                      component.description
                                    }
                                  </p>
                                )}
                              </div>
                            </div>

                            <p className="shrink-0 text-sm font-black text-slate-900">
                              {formatCurrency(
                                component.amount
                              )}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-slate-50 p-4">
                    <p className="font-black text-slate-800">
                      Total
                    </p>

                    <p className="text-lg font-black text-blue-600">
                      {formatCurrency(
                        item?.totalAmount
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>

              <button
                type="button"
                onClick={onEdit}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                <Edit3 size={17} />
                Edit Fee Structure
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   DETAIL STAT
========================================================= */

function DetailStat({
  icon,
  label,
  value,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-blue-600">
        {icon}

        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>

      <p className="mt-2 truncate text-sm font-bold text-slate-800">
        {value}
      </p>
    </div>
  );
}

/* =========================================================
   DELETE MODAL
========================================================= */

function DeleteModal({
  item,
  loading,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
          <Trash2 size={22} />
        </div>

        <h2 className="mt-5 text-xl font-black text-slate-900">
          Delete Fee Structure?
        </h2>

        <p className="mt-2 text-sm leading-6 text-slate-500">
          You are about to delete{" "}
          <span className="font-bold text-slate-700">
            {item?.name}
          </span>
          . This action cannot be undone.
        </p>

        <div className="mt-4 rounded-2xl bg-slate-50 p-4">
          <div className="flex justify-between gap-3 text-sm">
            <span className="text-slate-500">
              Program
            </span>

            <span className="text-right font-bold text-slate-700">
              {item?.program?.name ||
                "—"}
            </span>
          </div>

          <div className="mt-2 flex justify-between gap-3 text-sm">
            <span className="text-slate-500">
              Semester
            </span>

            <span className="font-bold text-slate-700">
              {item?.semester || "—"}
            </span>
          </div>

          <div className="mt-2 flex justify-between gap-3 text-sm">
            <span className="text-slate-500">
              Total
            </span>

            <span className="font-black text-slate-900">
              {formatCurrency(
                item?.totalAmount
              )}
            </span>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <RefreshCw
                  size={17}
                  className="animate-spin"
                />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={17} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   EXPORT
========================================================= */

export default AdminFeeStructures;