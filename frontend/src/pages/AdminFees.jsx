import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  ChevronDown,
  CreditCard,
  IndianRupee,
  Power,
  Loader2,
  Pencil,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  Wallet,
  X,
  History,
  UserRound,
  Eye,
  Clock,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  apiGet,
  apiPost,
  apiPatch,
} from "../api";

// ============================================================
// HELPERS
// ============================================================

function formatCurrency(
  value
) {
  const amount =
    Number(value || 0);

  return `₹${amount.toLocaleString(
    "en-IN"
  )}`;
}

function formatDate(
  value
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatDateTime(
  value
) {
  if (!value) {
    return "-";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(date);
}

function formatDateTimeLocal(
  value
) {
  if (!value) {
    return "";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  const local =
    new Date(
      date.getTime() -
        date.getTimezoneOffset() *
          60000
    );

  return local
    .toISOString()
    .slice(0, 16);
}

function getStudentName(
  student
) {
  if (!student) {
    return "Unknown Student";
  }

  const firstName =
    student?.user?.firstName ||
    "";

  const lastName =
    student?.user?.lastName ||
    "";

  const fullName =
    `${firstName} ${lastName}`.trim();

  return (
    fullName ||
    student?.name ||
    student?.fullName ||
    "Unknown Student"
  );
}

function getStudentEnrollment(
  student
) {
  return (
    student?.enrollmentNumber ||
    student?.studentCode ||
    student?.registrationNumber ||
    student?.studentId ||
    "-"
  );
}

function getPendingAmount(
  fee
) {
  const explicitPending =
    Number(
      fee?.pendingAmount
    );

  if (
    Number.isFinite(
      explicitPending
    ) &&
    explicitPending >= 0
  ) {
    return explicitPending;
  }

  const total =
    Number(
      fee?.totalAmount || 0
    );

  const paid =
    Number(
      fee?.paidAmount || 0
    );

  return Math.max(
    total - paid,
    0
  );
}

function getStatus(
  fee
) {
  const explicitStatus =
    String(
      fee?.status ||
        ""
    ).toUpperCase();

  if (
    explicitStatus
  ) {
    return explicitStatus;
  }

  const pending =
    getPendingAmount(
      fee
    );

  const paid =
    Number(
      fee?.paidAmount ||
        0
    );

  if (
    paid > 0 &&
    pending > 0
  ) {
    return "PARTIAL";
  }

  if (
    paid > 0 &&
    pending <= 0
  ) {
    return "PAID";
  }

  return "PENDING";
}

function getStatusClasses(
  status
) {
  const normalized =
    String(
      status || ""
    ).toUpperCase();

  if (
    normalized ===
    "PAID"
  ) {
    return "bg-green-100 text-green-700 border-green-200";
  }

  if (
    normalized ===
    "PARTIAL"
  ) {
    return "bg-yellow-100 text-yellow-700 border-yellow-200";
  }

  if (
    normalized ===
    "OVERDUE"
  ) {
    return "bg-red-100 text-red-700 border-red-200";
  }

  return "bg-gray-100 text-gray-700 border-gray-200";
}

function isAuthError(
  error
) {
  const message =
    String(
      error?.message || ""
    ).toLowerCase();

  return (
    message.includes(
      "401"
    ) ||
    message.includes(
      "unauthorized"
    ) ||
    message.includes(
      "authentication"
    ) ||
    message.includes(
      "forbidden"
    ) ||
    message.includes(
      "token"
    )
  );
}

function handleAuthError(
  error
) {
  if (
    isAuthError(error)
  ) {
    localStorage.removeItem(
      "token"
    );

    localStorage.removeItem(
      "user"
    );

    window.location.href =
      "/";

    return true;
  }

  return false;
}

function normalizeFees(
  data
) {
  const loaded =
    data?.fees ||
    data?.data?.fees ||
    data?.data ||
    [];

  return Array.isArray(
    loaded
  )
    ? loaded
    : [];
}

function normalizeStudents(
  data
) {
  const loaded =
    data?.students ||
    data?.data?.students ||
    data?.data ||
    [];

  return Array.isArray(
    loaded
  )
    ? loaded
    : [];
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  icon,
  title,
  message,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
        {icon || (
          <Wallet size={28} />
        )}
      </div>

      <h3 className="mt-4 text-lg font-bold text-gray-800">
        {title}
      </h3>

      <p className="mt-2 max-w-md text-sm text-gray-500">
        {message}
      </p>
    </div>
  );
}

// ============================================================
// MODAL
// ============================================================

function Modal({
  title,
  children,
  onClose,
  wide = false,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        className={`max-h-[92vh] w-full overflow-y-auto rounded-2xl bg-white shadow-2xl ${
          wide
            ? "max-w-5xl"
            : "max-w-2xl"
        }`}
      >
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function AdminFees() {
  const navigate =
    useNavigate();

  const [fees, setFees] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [
    appliedSearch,
    setAppliedSearch,
  ] = useState("");

  const [
    statusFilter,
    setStatusFilter,
  ] = useState("ALL");

  const [
    selectedFee,
    setSelectedFee,
  ] = useState(null);

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    showAddModal,
    setShowAddModal,
  ] = useState(false);

  const [
    showEditModal,
    setShowEditModal,
  ] = useState(false);

  const [
    showPaymentModal,
    setShowPaymentModal,
  ] = useState(false);

  const [
    formLoading,
    setFormLoading,
  ] = useState(false);

  const [
    formError,
    setFormError,
  ] = useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [students, setStudents] =
    useState([]);

  const [
    studentsLoading,
    setStudentsLoading,
  ] = useState(false);

  const [onlinePayment, setOnlinePayment] = useState(true);

  const [paymentSettingLoading, setPaymentSettingLoading] =
    useState(true);

  const [paymentSettingUpdating, setPaymentSettingUpdating] =
    useState(false);

  const [addForm, setAddForm] =
    useState({
      studentId: "",
      title: "",
      totalAmount: "",
      dueDate: "",
    });

  const [editForm, setEditForm] =
    useState({
      title: "",
      totalAmount: "",
      dueDate: "",
      status: "PENDING",
    });

  const [
    paymentForm,
    setPaymentForm,
  ] = useState({
    amount: "",
    paymentMethod: "ONLINE",
    transactionId: "",
  });

  // ============================================================
  // INITIAL LOAD
  // ============================================================

  useEffect(() => {
    loadFees();
    loadPaymentSetting();
  }, []);

  // ============================================================
  // LOAD FEES
  // ============================================================

  async function loadFees(
    showRefreshLoader = false,
    overrideSearch
  ) {
    try {
      if (
        showRefreshLoader
      ) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setFormError("");

      const effectiveSearch =
        overrideSearch !==
        undefined
          ? overrideSearch
          : appliedSearch;

      const params =
        new URLSearchParams();

      if (
        effectiveSearch.trim()
      ) {
        params.set(
          "search",
          effectiveSearch.trim()
        );
      }

      if (
        statusFilter !==
        "ALL"
      ) {
        params.set(
          "status",
          statusFilter
        );
      }

      const query =
        params.toString();

      const endpoint =
        `/admin/fees${
          query
            ? `?${query}`
            : ""
        }`;

      const data =
        await apiGet(
          endpoint
        );

      setFees(
        normalizeFees(data)
      );
    } catch (error) {
      console.error(
        "Load admin fees error:",
        error
      );

      if (
        handleAuthError(error)
      ) {
        return;
      }

      setFormError(
        error?.message ||
          "Unable to load fee records."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ============================================================
  // LOAD ONLINE PAYMENT SETTING
  // ============================================================

  async function loadPaymentSetting() {
    try {
      setPaymentSettingLoading(true);

      const data = await apiGet(
        "/admin/fees/payment-setting"
      );

      setOnlinePayment(
        data?.onlinePayment !== false
      );
    } catch (error) {
      console.error(
        "Load payment setting error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setFormError(
        error?.message ||
          "Unable to load online payment setting."
      );
    } finally {
      setPaymentSettingLoading(false);
    }
  }

  // ============================================================
  // UPDATE ONLINE PAYMENT SETTING
  // ============================================================

  async function handlePaymentSettingToggle() {
    if (paymentSettingUpdating) return;

    const nextValue = !onlinePayment;

    try {
      setPaymentSettingUpdating(true);
      setFormError("");
      setSuccessMessage("");

      const data = await apiPatch(
        "/admin/fees/payment-setting",
        {
          onlinePayment: nextValue,
        }
      );

      setOnlinePayment(
        data?.onlinePayment !== false
      );

      setSuccessMessage(
        nextValue
          ? "Online student payments have been enabled."
          : "Online student payments have been disabled."
      );
    } catch (error) {
      console.error(
        "Update payment setting error:",
        error
      );

      if (handleAuthError(error)) {
        return;
      }

      setFormError(
        error?.message ||
          "Unable to update online payment setting."
      );
    } finally {
      setPaymentSettingUpdating(false);
    }
  }

  // ============================================================
  // SEARCH
  // ============================================================

  async function handleSearch() {
    const value =
      search.trim();

    setAppliedSearch(
      value
    );

    await loadFees(
      true,
      value
    );
  }

  // ============================================================
  // STATUS FILTER
  // ============================================================

  async function handleStatusFilter(
    value
  ) {
    setStatusFilter(value);

    // Give React state a chance to update,
    // then construct the request directly.
    try {
      setRefreshing(true);
      setFormError("");

      const params =
        new URLSearchParams();

      if (
        appliedSearch.trim()
      ) {
        params.set(
          "search",
          appliedSearch.trim()
        );
      }

      if (
        value !== "ALL"
      ) {
        params.set(
          "status",
          value
        );
      }

      const query =
        params.toString();

      const endpoint =
        `/admin/fees${
          query
            ? `?${query}`
            : ""
        }`;

      const data =
        await apiGet(
          endpoint
        );

      setFees(
        normalizeFees(data)
      );
    } catch (error) {
      console.error(
        "Filter admin fees error:",
        error
      );

      if (
        handleAuthError(error)
      ) {
        return;
      }

      setFormError(
        error?.message ||
          "Unable to filter fee records."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // ============================================================
  // LOAD STUDENTS
  // ============================================================

  async function loadStudents() {
    try {
      setStudentsLoading(
        true
      );

      const data =
        await apiGet(
          "/admin/students"
        );

      setStudents(
        normalizeStudents(data)
      );
    } catch (error) {
      console.error(
        "Load students error:",
        error
      );

      if (
        handleAuthError(error)
      ) {
        return;
      }

      setFormError(
        error?.message ||
          "Unable to load students."
      );
    } finally {
      setStudentsLoading(
        false
      );
    }
  }

  // ============================================================
  // LOAD FEE DETAILS
  // ============================================================

  async function loadFeeDetails(
    feeId
  ) {
    try {
      setFormError("");
      setDetailsLoading(
        true
      );

      const data =
        await apiGet(
          `/admin/fees/${feeId}`
        );

      const loadedFee =
        data?.fee ||
        data?.data?.fee ||
        data?.data ||
        null;

      if (!loadedFee) {
        throw new Error(
          "Fee details were not returned."
        );
      }

      setSelectedFee(
        loadedFee
      );
    } catch (error) {
      console.error(
        "Load fee details error:",
        error
      );

      if (
        handleAuthError(error)
      ) {
        return;
      }

      setFormError(
        error?.message ||
          "Unable to load fee details."
      );
    } finally {
      setDetailsLoading(
        false
      );
    }
  }

  // ============================================================
  // ADD MODAL
  // ============================================================

  function openAddModal() {
    setFormError("");
    setSuccessMessage("");

    setAddForm({
      studentId: "",
      title: "",
      totalAmount: "",
      dueDate: "",
    });

    setShowAddModal(
      true
    );

    if (
      students.length === 0
    ) {
      loadStudents();
    }
  }

  // ============================================================
  // EDIT MODAL
  // ============================================================

  function openEditModal(
    fee
  ) {
    setFormError("");
    setSuccessMessage("");

    setSelectedFee(
      fee
    );

    setEditForm({
      title:
        fee?.title ||
        "",
      totalAmount:
        fee?.totalAmount ??
        "",
      dueDate:
        formatDateTimeLocal(
          fee?.dueDate
        ),
      status:
        getStatus(
          fee
        ),
    });

    setShowEditModal(
      true
    );
  }

  // ============================================================
  // PAYMENT MODAL
  // ============================================================

  function openPaymentModal(
    fee
  ) {
    setFormError("");
    setSuccessMessage("");

    setPaymentForm({
      amount: "",
      paymentMethod:
        "ONLINE",
      transactionId:
        "",
    });

    setSelectedFee(
      fee
    );

    setShowPaymentModal(
      true
    );
  }

  // ============================================================
  // CLOSE MODALS
  // ============================================================

  function closeModals() {
    setShowAddModal(
      false
    );

    setShowEditModal(
      false
    );

    setShowPaymentModal(
      false
    );

    setFormError("");
  }

  function closeDetails() {
    if (
      showEditModal ||
      showPaymentModal ||
      showAddModal
    ) {
      return;
    }

    setSelectedFee(
      null
    );

    setFormError("");
  }

  // ============================================================
  // FORM HANDLERS
  // ============================================================

  function handleAddChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setAddForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setFormError("");
  }

  function handleEditChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setEditForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setFormError("");
  }

  function handlePaymentChange(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setPaymentForm(
      (current) => ({
        ...current,
        [name]: value,
      })
    );

    setFormError("");
  }

  // ============================================================
  // ADD FEE
  // ============================================================

  async function handleAddFee(
    event
  ) {
    event.preventDefault();

    try {
      setFormLoading(
        true
      );

      setFormError("");
      setSuccessMessage("");

      if (
        !addForm.studentId
      ) {
        throw new Error(
          "Please select a student."
        );
      }

      const title =
        addForm.title.trim();

      if (!title) {
        throw new Error(
          "Please enter a fee title."
        );
      }

      const amount =
        Number(
          addForm.totalAmount
        );

      if (
        !Number.isInteger(
          amount
        ) ||
        amount <= 0
      ) {
        throw new Error(
          "Total amount must be a positive whole number."
        );
      }

      if (
        !addForm.dueDate
      ) {
        throw new Error(
          "Please select a due date."
        );
      }

      const dueDate =
        new Date(
          addForm.dueDate
        );

      if (
        Number.isNaN(
          dueDate.getTime()
        )
      ) {
        throw new Error(
          "Please select a valid due date."
        );
      }

      await apiPost(
        "/admin/fees",
        {
          studentId:
            Number(
              addForm.studentId
            ),
          title,
          totalAmount:
            amount,
          dueDate:
            dueDate.toISOString(),
        }
      );

      setSuccessMessage(
        "Fee created successfully."
      );

      setShowAddModal(
        false
      );

      await loadFees(
        true
      );
    } catch (error) {
      console.error(
        "Create fee error:",
        error
      );

      if (
        handleAuthError(error)
      ) {
        return;
      }

      setFormError(
        error?.message ||
          "Unable to create fee."
      );
    } finally {
      setFormLoading(
        false
      );
    }
  }

  // ============================================================
  // EDIT FEE
  // ============================================================

  async function handleEditFee(
    event
  ) {
    event.preventDefault();

    if (!selectedFee) {
      return;
    }

    try {
      setFormLoading(
        true
      );

      setFormError("");
      setSuccessMessage("");

      const title =
        editForm.title.trim();

      if (!title) {
        throw new Error(
          "Please enter a fee title."
        );
      }

      const totalAmount =
        Number(
          editForm.totalAmount
        );

      const alreadyPaid =
        Number(
          selectedFee?.paidAmount ||
            0
        );

      if (
        !Number.isInteger(
          totalAmount
        ) ||
        totalAmount <= 0
      ) {
        throw new Error(
          "Total amount must be a positive whole number."
        );
      }

      if (
        totalAmount <
        alreadyPaid
      ) {
        throw new Error(
          `Total amount cannot be less than the already paid amount of ${formatCurrency(
            alreadyPaid
          )}.`
        );
      }

      if (
        !editForm.dueDate
      ) {
        throw new Error(
          "Please select a due date."
        );
      }

      const dueDate =
        new Date(
          editForm.dueDate
        );

      if (
        Number.isNaN(
          dueDate.getTime()
        )
      ) {
        throw new Error(
          "Please select a valid due date."
        );
      }

      await apiPatch(
        `/admin/fees/${selectedFee.id}`,
        {
          title,
          totalAmount,
          dueDate:
            dueDate.toISOString(),
          status:
            editForm.status,
        }
      );

      setSuccessMessage(
        "Fee updated successfully."
      );

      setShowEditModal(
        false
      );

      await loadFees(
        true
      );

      await loadFeeDetails(
        selectedFee.id
      );
    } catch (error) {
      console.error(
        "Update fee error:",
        error
      );

      if (
        handleAuthError(error)
      ) {
        return;
      }

      setFormError(
        error?.message ||
          "Unable to update fee."
      );
    } finally {
      setFormLoading(
        false
      );
    }
  }

  // ============================================================
  // RECORD PAYMENT
  // ============================================================

  async function handleAddPayment(
    event
  ) {
    event.preventDefault();

    if (!selectedFee) {
      return;
    }

    try {
      setFormLoading(
        true
      );

      setFormError("");
      setSuccessMessage("");

      const amount =
        Number(
          paymentForm.amount
        );

      if (
        !Number.isInteger(
          amount
        ) ||
        amount <= 0
      ) {
        throw new Error(
          "Payment amount must be a positive whole number."
        );
      }

      if (
        !paymentForm.paymentMethod
      ) {
        throw new Error(
          "Please select a payment method."
        );
      }

      const transactionId =
        paymentForm.transactionId.trim();

      if (!transactionId) {
        throw new Error(
          "Please enter a transaction ID."
        );
      }

      const pendingAmount =
        getPendingAmount(
          selectedFee
        );

      if (
        amount >
        pendingAmount
      ) {
        throw new Error(
          `Payment cannot exceed the pending amount of ${formatCurrency(
            pendingAmount
          )}.`
        );
      }

      if (
        pendingAmount <=
        0
      ) {
        throw new Error(
          "This fee is already fully paid."
        );
      }

      await apiPost(
        `/admin/fees/${selectedFee.id}/payments`,
        {
          amount,
          paymentMethod:
            paymentForm.paymentMethod.trim(),
          transactionId,
        }
      );

      setSuccessMessage(
        "Payment recorded successfully."
      );

      setShowPaymentModal(
        false
      );

      await loadFees(
        true
      );

      await loadFeeDetails(
        selectedFee.id
      );
    } catch (error) {
      console.error(
        "Record payment error:",
        error
      );

      if (
        handleAuthError(error)
      ) {
        return;
      }

      setFormError(
        error?.message ||
          "Unable to record payment."
      );
    } finally {
      setFormLoading(
        false
      );
    }
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  const summary =
    useMemo(() => {
      const totalAmount =
        fees.reduce(
          (sum, fee) =>
            sum +
            Number(
              fee?.totalAmount ||
                0
            ),
          0
        );

      const paidAmount =
        fees.reduce(
          (sum, fee) =>
            sum +
            Number(
              fee?.paidAmount ||
                0
            ),
          0
        );

      const pendingAmount =
        fees.reduce(
          (sum, fee) =>
            sum +
            getPendingAmount(
              fee
            ),
          0
        );

      const paidCount =
        fees.filter(
          (fee) =>
            getStatus(
              fee
            ) ===
            "PAID"
        ).length;

      const partialCount =
        fees.filter(
          (fee) =>
            getStatus(
              fee
            ) ===
            "PARTIAL"
        ).length;

      const pendingCount =
        fees.filter(
          (fee) =>
            getStatus(
              fee
            ) ===
            "PENDING"
        ).length;

      const overdueCount =
        fees.filter(
          (fee) =>
            getStatus(
              fee
            ) ===
              "OVERDUE" ||
            (
              getStatus(
                fee
              ) !==
                "PAID" &&
              fee?.dueDate &&
              new Date(
                fee.dueDate
              ) < new Date()
            )
        ).length;

      return {
        totalAmount,
        paidAmount,
        pendingAmount,
        paidCount,
        partialCount,
        pendingCount,
        overdueCount,
      };
    }, [fees]);

  // ============================================================
  // STUDENT OPTION
  // ============================================================

  function renderStudentOption(
    student
  ) {
    const name =
      getStudentName(
        student
      );

    const enrollment =
      getStudentEnrollment(
        student
      );

    return (
      <option
        key={
          student?.id
        }
        value={
          student?.id
        }
      >
        {name} —{" "}
        {enrollment}
      </option>
    );
  }

  // ============================================================
  // PAYMENT PROGRESS
  // ============================================================

  const collectionProgress =
    summary.totalAmount > 0
      ? Math.min(
          100,
          (summary.paidAmount /
            summary.totalAmount) *
            100
        )
      : 0;

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 p-4 text-gray-900 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        {/* ====================================================
            HEADER
        ===================================================== */}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <Receipt size={16} />

              <span>
                Admin
              </span>

              <span>/</span>

              <span>
                Fees & Payments
              </span>
            </div>

            <h1 className="text-3xl font-bold text-gray-900">
              Fees & Payments
            </h1>

            <p className="mt-1 text-gray-600">
              Manage student fee records, balances and payment transactions.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/admin/dashboard"
                )
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              <ArrowLeft
                size={18}
              />

              Back to Dashboard
            </button>

            <button
              type="button"
              onClick={() =>
                loadFees(true)
              }
              disabled={
                refreshing
              }
              className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

            <button
              type="button"
              onClick={
                openAddModal
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-blue-700"
            >
              <Plus size={18} />

              Add Fee
            </button>
          </div>
        </div>

        {/* ====================================================
            ONLINE STUDENT PAYMENT CONTROL
        ===================================================== */}

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  onlinePayment
                    ? "bg-green-100 text-green-600"
                    : "bg-red-100 text-red-600"
                }`}
              >
                <Power size={21} />
              </div>

              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Online Student Payments
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Control whether students can start new online Razorpay payments for their pending fees.
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${
                      onlinePayment
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {paymentSettingLoading
                      ? "Loading..."
                      : onlinePayment
                        ? "ENABLED"
                        : "DISABLED"}
                  </span>

                  {!onlinePayment && !paymentSettingLoading ? (
                    <span className="text-xs text-red-600">
                      Students cannot create new online payment orders.
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handlePaymentSettingToggle}
              disabled={
                paymentSettingLoading ||
                paymentSettingUpdating
              }
              className={`inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
                onlinePayment
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {paymentSettingUpdating ? (
                <Loader2 size={17} className="animate-spin" />
              ) : (
                <Power size={17} />
              )}

              {paymentSettingLoading
                ? "Loading..."
                : paymentSettingUpdating
                  ? "Updating..."
                  : onlinePayment
                    ? "Disable Payments"
                    : "Enable Payments"}
            </button>
          </div>
        </section>

        {/* ====================================================
            SUCCESS
        ===================================================== */}

        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle
              size={20}
            />

            <span className="font-medium">
              {successMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setSuccessMessage(
                  ""
                )
              }
              className="ml-auto rounded-lg p-1 transition hover:bg-green-100"
              title="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ====================================================
            GLOBAL ERROR
        ===================================================== */}

        {formError &&
          !showAddModal &&
          !showEditModal &&
          !showPaymentModal && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
              <AlertCircle
                size={20}
                className="mt-0.5 shrink-0"
              />

              <span className="flex-1 font-medium">
                {formError}
              </span>

              <button
                type="button"
                onClick={() =>
                  setFormError(
                    ""
                  )
                }
                className="rounded-lg p-1 transition hover:bg-red-100"
                title="Dismiss"
              >
                <X size={18} />
              </button>
            </div>
          )}

        {/* ====================================================
            SUMMARY
        ===================================================== */}

        <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={
              <IndianRupee
                size={22}
              />
            }
            title="Total Fees"
            value={formatCurrency(
              summary.totalAmount
            )}
            description={`${fees.length} visible records`}
            iconClass="bg-blue-100 text-blue-600"
          />

          <SummaryCard
            icon={
              <CheckCircle
                size={22}
              />
            }
            title="Collected"
            value={formatCurrency(
              summary.paidAmount
            )}
            description={`${summary.paidCount} fully paid`}
            iconClass="bg-green-100 text-green-600"
          />

          <SummaryCard
            icon={
              <Wallet size={22} />
            }
            title="Pending"
            value={formatCurrency(
              summary.pendingAmount
            )}
            description={`${summary.pendingCount + summary.partialCount} open records`}
            iconClass="bg-yellow-100 text-yellow-600"
          />

          <SummaryCard
            icon={
              <Receipt size={22} />
            }
            title="Collection"
            value={`${Math.round(
              collectionProgress
            )}%`}
            description={`${summary.overdueCount} overdue`}
            iconClass="bg-purple-100 text-purple-600"
          />
        </div>

        {/* ====================================================
            COLLECTION PROGRESS
        ===================================================== */}

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                Fee Collection Progress
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Collected amount compared with total fee value in the visible records.
              </p>
            </div>

            <span className="text-2xl font-bold text-gray-900">
              {Math.round(
                collectionProgress
              )}
              %
            </span>
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{
                width: `${collectionProgress}%`,
              }}
            />
          </div>

          <div className="mt-3 flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:justify-between">
            <span>
              Collected:{" "}
              {formatCurrency(
                summary.paidAmount
              )}
            </span>

            <span>
              Remaining:{" "}
              {formatCurrency(
                summary.pendingAmount
              )}
            </span>
          </div>
        </section>

        {/* ====================================================
            SEARCH + FILTER
        ===================================================== */}

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target
                      .value
                  )
                }
                onKeyDown={(
                  event
                ) => {
                  if (
                    event.key ===
                    "Enter"
                  ) {
                    handleSearch();
                  }
                }}
                placeholder="Search student, enrollment number or fee title..."
                className="w-full rounded-xl border border-gray-300 py-3 pl-10 pr-4 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="relative min-w-[190px]">
              <select
                value={
                  statusFilter
                }
                onChange={(event) =>
                  handleStatusFilter(
                    event.target
                      .value
                  )
                }
                className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-3 pr-10 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >
                <option value="ALL">
                  All Statuses
                </option>

                <option value="PENDING">
                  Pending
                </option>

                <option value="PARTIAL">
                  Partial
                </option>

                <option value="PAID">
                  Paid
                </option>

                <option value="OVERDUE">
                  Overdue
                </option>
              </select>

              <ChevronDown
                size={18}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
            </div>

            <button
              type="button"
              onClick={
                handleSearch
              }
              disabled={
                refreshing
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 font-medium text-white transition hover:bg-gray-800 disabled:opacity-60"
            >
              <Search size={17} />
              Search
            </button>
          </div>

          {(appliedSearch ||
            statusFilter !==
              "ALL") && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-gray-500">
                Active filters:
              </span>

              {appliedSearch && (
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                  Search:{" "}
                  {appliedSearch}
                </span>
              )}

              {statusFilter !==
                "ALL" && (
                <span className="rounded-full bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700">
                  Status:{" "}
                  {statusFilter}
                </span>
              )}

              <button
                type="button"
                onClick={async () => {
                  setSearch("");
                  setAppliedSearch(
                    ""
                  );
                  setStatusFilter(
                    "ALL"
                  );
                  await loadFees(
                    true,
                    ""
                  );
                }}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                Clear all
              </button>
            </div>
          )}
        </section>

        {/* ====================================================
            FEE TABLE
        ===================================================== */}

        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Receipt size={20} />
                </div>

                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Fee Records
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Student fee balances and payment records
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-500">
              {fees.length}{" "}
              record
              {fees.length ===
              1
                ? ""
                : "s"}
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="flex items-center gap-3 text-gray-600">
                <Loader2
                  size={24}
                  className="animate-spin"
                />

                Loading fee records...
              </div>
            </div>
          ) : fees.length ===
            0 ? (
            <EmptyState
              icon={
                <Receipt
                  size={28}
                />
              }
              title="No fee records found"
              message={
                appliedSearch ||
                statusFilter !==
                  "ALL"
                  ? "Try changing the search text or status filter."
                  : "Create a fee record to start tracking student payments."
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <TableHeader>
                      Student
                    </TableHeader>

                    <TableHeader>
                      Fee
                    </TableHeader>

                    <TableHeader>
                      Total
                    </TableHeader>

                    <TableHeader>
                      Paid
                    </TableHeader>

                    <TableHeader>
                      Pending
                    </TableHeader>

                    <TableHeader>
                      Due Date
                    </TableHeader>

                    <TableHeader>
                      Status
                    </TableHeader>

                    <TableHeader align="right">
                      Actions
                    </TableHeader>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {fees.map(
                    (fee) => {
                      const total =
                        Number(
                          fee?.totalAmount ||
                            0
                        );

                      const paid =
                        Number(
                          fee?.paidAmount ||
                            0
                        );

                      const pending =
                        getPendingAmount(
                          fee
                        );

                      const status =
                        getStatus(
                          fee
                        );

                      return (
                        <tr
                          key={
                            fee?.id
                          }
                          className="transition hover:bg-gray-50"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                                <UserRound
                                  size={18}
                                />
                              </div>

                              <div>
                                <p className="font-semibold text-gray-900">
                                  {getStudentName(
                                    fee?.student
                                  )}
                                </p>

                                <p className="mt-1 text-sm text-gray-500">
                                  {getStudentEnrollment(
                                    fee?.student
                                  )}
                                </p>

                                <p className="text-xs text-gray-400">
                                  {fee
                                    ?.student
                                    ?.departmentRel
                                    ?.code ||
                                    fee
                                      ?.student
                                      ?.department
                                      ?.code ||
                                    ""}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <p className="font-medium text-gray-800">
                              {fee?.title ||
                                "Fee Record"}
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              Fee ID #
                              {
                                fee?.id
                              }
                            </p>
                          </td>

                          <td className="px-5 py-4 font-semibold text-gray-900">
                            {formatCurrency(
                              total
                            )}
                          </td>

                          <td className="px-5 py-4 font-semibold text-green-600">
                            {formatCurrency(
                              paid
                            )}
                          </td>

                          <td className="px-5 py-4 font-semibold text-orange-600">
                            {formatCurrency(
                              pending
                            )}
                          </td>

                          <td className="px-5 py-4">
                            <p className="text-sm font-medium text-gray-700">
                              {formatDate(
                                fee?.dueDate
                              )}
                            </p>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusClasses(
                                status
                              )}`}
                            >
                              {status}
                            </span>
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  loadFeeDetails(
                                    fee.id
                                  )
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                              >
                                <Eye
                                  size={
                                    15
                                  }
                                />
                                Details
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openPaymentModal(
                                    fee
                                  )
                                }
                                disabled={
                                  pending <=
                                  0
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                <CreditCard
                                  size={
                                    15
                                  }
                                />
                                Payment
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openEditModal(
                                    fee
                                  )
                                }
                                className="rounded-lg border border-blue-200 bg-blue-50 p-2 text-blue-600 transition hover:bg-blue-100"
                                title="Edit fee"
                              >
                                <Pencil
                                  size={
                                    16
                                  }
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ====================================================
            DETAILS MODAL
        ===================================================== */}

        {selectedFee &&
          !showEditModal &&
          !showPaymentModal &&
          !showAddModal && (
            <Modal
              title="Fee Details"
              onClose={
                closeDetails
              }
              wide
            >
              {detailsLoading ? (
                <div className="flex min-h-[260px] items-center justify-center">
                  <div className="flex items-center gap-3 text-gray-600">
                    <Loader2
                      size={22}
                      className="animate-spin"
                    />

                    Loading fee details...
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* STUDENT + FEE */}

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <UserRound
                          size={16}
                        />

                        Student
                      </div>

                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {getStudentName(
                          selectedFee?.student
                        )}
                      </p>

                      <p className="mt-1 text-sm text-gray-500">
                        {getStudentEnrollment(
                          selectedFee?.student
                        )}
                      </p>

                      <p className="mt-1 break-all text-sm text-gray-500">
                        {selectedFee
                          ?.student
                          ?.user
                          ?.email ||
                          "Email not available"}
                      </p>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                        <Receipt
                          size={16}
                        />

                        Fee
                      </div>

                      <p className="mt-2 text-lg font-bold text-gray-900">
                        {selectedFee?.title ||
                          "Fee Record"}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-3 text-sm text-gray-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar
                            size={15}
                          />

                          Due:{" "}
                          {formatDate(
                            selectedFee?.dueDate
                          )}
                        </span>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusClasses(
                            getStatus(
                              selectedFee
                            )
                          )}`}
                        >
                          {getStatus(
                            selectedFee
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* AMOUNTS */}

                  <div className="grid gap-4 sm:grid-cols-3">
                    <AmountSummary
                      label="Total Amount"
                      value={formatCurrency(
                        selectedFee?.totalAmount
                      )}
                      className="bg-gray-50"
                      valueClass="text-gray-900"
                    />

                    <AmountSummary
                      label="Paid Amount"
                      value={formatCurrency(
                        selectedFee?.paidAmount
                      )}
                      className="bg-green-50"
                      valueClass="text-green-700"
                    />

                    <AmountSummary
                      label="Pending Amount"
                      value={formatCurrency(
                        getPendingAmount(
                          selectedFee
                        )
                      )}
                      className="bg-orange-50"
                      valueClass="text-orange-700"
                    />
                  </div>

                  {/* PROGRESS */}

                  <div className="rounded-xl border border-gray-200 p-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-600">
                        Payment Progress
                      </span>

                      <span className="font-bold text-gray-900">
                        {Number(
                          selectedFee?.totalAmount ||
                            0
                        ) > 0
                          ? Math.round(
                              (Number(
                                selectedFee?.paidAmount ||
                                  0
                              ) /
                                Number(
                                  selectedFee?.totalAmount ||
                                    0
                                )) *
                                100
                            )
                          : 0}
                        %
                      </span>
                    </div>

                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-green-500 transition-all duration-500"
                        style={{
                          width: `${
                            Number(
                              selectedFee?.totalAmount ||
                                0
                            ) > 0
                              ? Math.min(
                                  100,
                                  (Number(
                                    selectedFee?.paidAmount ||
                                      0
                                  ) /
                                    Number(
                                      selectedFee?.totalAmount ||
                                        0
                                    )) *
                                    100
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* HISTORY */}

                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <History
                          size={18}
                          className="text-gray-500"
                        />

                        <h3 className="text-lg font-bold text-gray-900">
                          Payment History
                        </h3>
                      </div>

                      <span className="text-sm text-gray-500">
                        {Array.isArray(
                          selectedFee?.payments
                        )
                          ? selectedFee
                              .payments
                              .length
                          : 0}{" "}
                        transaction
                        {Array.isArray(
                          selectedFee?.payments
                        ) &&
                        selectedFee
                          .payments
                          .length ===
                          1
                          ? ""
                          : "s"}
                      </span>
                    </div>

                    {!Array.isArray(
                      selectedFee?.payments
                    ) ||
                    selectedFee
                      .payments
                      .length ===
                      0 ? (
                      <EmptyState
                        icon={
                          <History
                            size={26}
                          />
                        }
                        title="No payments recorded"
                        message="Payment transactions for this fee will appear here."
                      />
                    ) : (
                      <div className="overflow-hidden rounded-xl border border-gray-200">
                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[700px]">
                            <thead className="bg-gray-50">
                              <tr>
                                <TableHeader>
                                  Transaction ID
                                </TableHeader>

                                <TableHeader>
                                  Amount
                                </TableHeader>

                                <TableHeader>
                                  Method
                                </TableHeader>

                                <TableHeader>
                                  Payment Date
                                </TableHeader>
                              </tr>
                            </thead>

                            <tbody className="divide-y divide-gray-100">
                              {selectedFee.payments.map(
                                (
                                  payment
                                ) => (
                                  <tr
                                    key={
                                      payment?.id
                                    }
                                    className="hover:bg-gray-50"
                                  >
                                    <td className="px-4 py-3">
                                      <p className="break-all text-sm font-medium text-gray-800">
                                        {payment?.transactionId ||
                                          "-"}
                                      </p>
                                    </td>

                                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                                      {formatCurrency(
                                        payment?.amount
                                      )}
                                    </td>

                                    <td className="px-4 py-3 text-sm text-gray-700">
                                      {payment
                                        ?.paymentMethod ||
                                        "-"}
                                    </td>

                                    <td className="px-4 py-3">
                                      <p className="text-sm text-gray-700">
                                        {formatDate(
                                          payment?.paymentDate
                                        )}
                                      </p>

                                      <p className="mt-1 text-xs text-gray-400">
                                        {formatDateTime(
                                          payment?.paymentDate
                                        )}
                                      </p>
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ACTIONS */}

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        openEditModal(
                          selectedFee
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 font-medium text-blue-600 transition hover:bg-blue-100"
                    >
                      <Pencil
                        size={17}
                      />

                      Edit Fee
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        openPaymentModal(
                          selectedFee
                        )
                      }
                      disabled={
                        getPendingAmount(
                          selectedFee
                        ) <= 0
                      }
                      className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <CreditCard
                        size={17}
                      />

                      Record Payment
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedFee(
                          null
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                    >
                      <X size={17} />

                      Close
                    </button>
                  </div>
                </div>
              )}
            </Modal>
          )}

        {/* ====================================================
            ADD FEE MODAL
        ===================================================== */}

        {showAddModal && (
          <Modal
            title="Add Fee"
            onClose={
              closeModals
            }
          >
            <form
              onSubmit={
                handleAddFee
              }
              className="space-y-5"
            >
              {formError && (
                <FormError
                  message={
                    formError
                  }
                />
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Student
                </label>

                {studentsLoading ? (
                  <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-gray-50 px-4 py-3 text-gray-500">
                    <Loader2
                      size={18}
                      className="animate-spin"
                    />

                    Loading students...
                  </div>
                ) : (
                  <select
                    name="studentId"
                    value={
                      addForm.studentId
                    }
                    onChange={
                      handleAddChange
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">
                      Select a student
                    </option>

                    {students.map(
                      renderStudentOption
                    )}
                  </select>
                )}

                {students.length ===
                  0 &&
                  !studentsLoading && (
                    <p className="mt-1 text-xs text-red-500">
                      No students are available.
                    </p>
                  )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  Fee Title
                </label>

                <input
                  type="text"
                  name="title"
                  value={
                    addForm.title
                  }
                  onChange={
                    handleAddChange
                  }
                  placeholder="e.g. Semester 5 Tuition Fee"
                  required
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Total Amount
                  </label>

                  <input
                    type="number"
                    name="totalAmount"
                    value={
                      addForm.totalAmount
                    }
                    onChange={
                      handleAddChange
                    }
                    min="1"
                    step="1"
                    placeholder="50000"
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Due Date
                  </label>

                  <input
                    type="datetime-local"
                    name="dueDate"
                    value={
                      addForm.dueDate
                    }
                    onChange={
                      handleAddChange
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-start gap-2 text-blue-700">
                  <Clock
                    size={17}
                    className="mt-0.5 shrink-0"
                  />

                  <div>
                    <p className="text-sm font-semibold">
                      Initial status
                    </p>

                    <p className="mt-1 text-xs leading-5">
                      New fee records start as Pending. The status changes to Partial or Paid when payments are recorded.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={
                    closeModals
                  }
                  className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    formLoading ||
                    studentsLoading
                  }
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {formLoading && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  Create Fee
                </button>
              </div>
            </form>
          </Modal>
        )}

        {/* ====================================================
            EDIT FEE MODAL
        ===================================================== */}

        {showEditModal &&
          selectedFee && (
            <Modal
              title="Edit Fee"
              onClose={
                closeModals
              }
            >
              <form
                onSubmit={
                  handleEditFee
                }
                className="space-y-5"
              >
                {formError && (
                  <FormError
                    message={
                      formError
                    }
                  />
                )}

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-sm text-gray-500">
                    Student
                  </p>

                  <p className="mt-1 font-bold text-gray-900">
                    {getStudentName(
                      selectedFee?.student
                    )}
                  </p>

                  <p className="text-sm text-gray-500">
                    {getStudentEnrollment(
                      selectedFee?.student
                    )}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Fee Title
                  </label>

                  <input
                    type="text"
                    name="title"
                    value={
                      editForm.title
                    }
                    onChange={
                      handleEditChange
                    }
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Total Amount
                    </label>

                    <input
                      type="number"
                      name="totalAmount"
                      value={
                        editForm.totalAmount
                      }
                      onChange={
                        handleEditChange
                      }
                      min={
                        Number(
                          selectedFee?.paidAmount ||
                            0
                        )
                      }
                      step="1"
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />

                    <p className="mt-1 text-xs text-gray-500">
                      Already paid:{" "}
                      {formatCurrency(
                        selectedFee?.paidAmount
                      )}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Due Date
                    </label>

                    <input
                      type="datetime-local"
                      name="dueDate"
                      value={
                        editForm.dueDate
                      }
                      onChange={
                        handleEditChange
                      }
                      required
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Status
                  </label>

                  <select
                    name="status"
                    value={
                      editForm.status
                    }
                    onChange={
                      handleEditChange
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="PENDING">
                      Pending
                    </option>

                    <option value="PARTIAL">
                      Partial
                    </option>

                    <option value="PAID">
                      Paid
                    </option>

                    <option value="OVERDUE">
                      Overdue
                    </option>
                  </select>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-xs leading-5 text-gray-500">
                  Payment status should normally follow the actual amount paid. Avoid manually marking a fee as Paid unless the corresponding payment has been recorded.
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={
                      closeModals
                    }
                    className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      formLoading
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {formLoading && (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    )}

                    Save Changes
                  </button>
                </div>
              </form>
            </Modal>
          )}

        {/* ====================================================
            PAYMENT MODAL
        ===================================================== */}

        {showPaymentModal &&
          selectedFee && (
            <Modal
              title="Record Payment"
              onClose={
                closeModals
              }
            >
              <form
                onSubmit={
                  handleAddPayment
                }
                className="space-y-5"
              >
                {formError && (
                  <FormError
                    message={
                      formError
                    }
                  />
                )}

                <div className="rounded-xl border border-green-100 bg-green-50 p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard
                      size={20}
                      className="mt-0.5 text-green-600"
                    />

                    <div>
                      <p className="font-semibold text-green-800">
                        {selectedFee?.title ||
                          "Fee Record"}
                      </p>

                      <p className="mt-1 text-sm text-green-700">
                        {getStudentName(
                          selectedFee?.student
                        )}{" "}
                        •{" "}
                        {getStudentEnrollment(
                          selectedFee?.student
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <AmountSummary
                    label="Total"
                    value={formatCurrency(
                      selectedFee?.totalAmount
                    )}
                    className="bg-gray-50"
                    valueClass="text-gray-900"
                  />

                  <AmountSummary
                    label="Paid"
                    value={formatCurrency(
                      selectedFee?.paidAmount
                    )}
                    className="bg-green-50"
                    valueClass="text-green-700"
                  />

                  <AmountSummary
                    label="Pending"
                    value={formatCurrency(
                      getPendingAmount(
                        selectedFee
                      )
                    )}
                    className="bg-orange-50"
                    valueClass="text-orange-700"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Payment Amount
                  </label>

                  <input
                    type="number"
                    name="amount"
                    value={
                      paymentForm.amount
                    }
                    onChange={
                      handlePaymentChange
                    }
                    min="1"
                    max={getPendingAmount(
                      selectedFee
                    )}
                    step="1"
                    placeholder="20000"
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Maximum payment:{" "}
                    {formatCurrency(
                      getPendingAmount(
                        selectedFee
                      )
                    )}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Payment Method
                  </label>

                  <select
                    name="paymentMethod"
                    value={
                      paymentForm.paymentMethod
                    }
                    onChange={
                      handlePaymentChange
                    }
                    className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  >
                    <option value="ONLINE">
                      Online
                    </option>

                    <option value="UPI">
                      UPI
                    </option>

                    <option value="CARD">
                      Card
                    </option>

                    <option value="NET_BANKING">
                      Net Banking
                    </option>

                    <option value="CASH">
                      Cash
                    </option>

                    <option value="CHEQUE">
                      Cheque
                    </option>

                    <option value="BANK_TRANSFER">
                      Bank Transfer
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">
                    Transaction / Reference ID
                  </label>

                  <input
                    type="text"
                    name="transactionId"
                    value={
                      paymentForm.transactionId
                    }
                    onChange={
                      handlePaymentChange
                    }
                    placeholder="Enter transaction/reference ID"
                    required
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                  <div className="flex items-start gap-2">
                    <Clock
                      size={17}
                      className="mt-0.5 shrink-0 text-blue-600"
                    />

                    <p className="text-xs leading-5 text-blue-700">
                      The payment is recorded with the current server/database time. The transaction ID is used to identify the payment.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={
                      closeModals
                    }
                    className="rounded-xl border border-gray-300 px-5 py-2.5 font-medium text-gray-700 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={
                      formLoading ||
                      getPendingAmount(
                        selectedFee
                      ) <= 0
                    }
                    className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {formLoading && (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    )}

                    Record Payment
                  </button>
                </div>
              </form>
            </Modal>
          )}
      </div>
    </div>
  );
}

// ============================================================
// TABLE HEADER
// ============================================================

function TableHeader({
  children,
  align = "left",
}) {
  return (
    <th
      className={`px-5 py-4 text-${align} text-xs font-semibold uppercase tracking-wide text-gray-500`}
    >
      {children}
    </th>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  icon,
  title,
  value,
  description,
  iconClass,
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-gray-500">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900 sm:text-3xl">
            {value}
          </p>

          <p className="mt-1 text-xs text-gray-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AMOUNT SUMMARY
// ============================================================

function AmountSummary({
  label,
  value,
  className,
  valueClass,
}) {
  return (
    <div
      className={`rounded-xl p-4 ${className}`}
    >
      <p className="text-xs uppercase tracking-wide text-gray-500">
        {label}
      </p>

      <p
        className={`mt-1 text-xl font-bold ${valueClass}`}
      >
        {value}
      </p>
    </div>
  );
}

// ============================================================
// FORM ERROR
// ============================================================

function FormError({
  message,
}) {
  return (
    <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle
        size={18}
        className="mt-0.5 shrink-0"
      />

      <span className="flex-1">
        {message}
      </span>
    </div>
  );
}