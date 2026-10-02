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
  Clock3,
  CreditCard,
  FileText,
  IndianRupee,
  Loader2,
  RefreshCw,
  Receipt,
  ShieldCheck,
  WalletCards,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { apiGet, logoutUser } from "../api";

const RAZORPAY_SCRIPT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

const API_BASE_URL =
  "https://campus360-backend-gbf0.onrender.com/api";

const loadRazorpayScript = () =>
  new Promise((resolve) => {
    const existingScript = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_URL}"]`
    );

    if (existingScript) {
      resolve(true);
      return;
    }

    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_URL;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });

const formatCurrency = (amount) => {
  const value = Number(amount || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (date) => {
  if (!date) return "—";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "—";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeStatus = (status) =>
  String(status || "PENDING").toUpperCase();

const getStatusClass = (status) => {
  const normalized = normalizeStatus(status);

  if (normalized === "PAID") {
    return "fee-status paid";
  }

  if (normalized === "PARTIAL") {
    return "fee-status partial";
  }

  return "fee-status pending";
};

const getPaymentMethodLabel = (method) => {
  const value = String(method || "").toUpperCase();

  if (value === "UPI") return "UPI";
  if (value === "CARD") return "Card";
  if (value === "NETBANKING") return "Net Banking";
  if (value === "WALLET") return "Wallet";

  if (value === "ONLINE") return "Online";

  return method || "Payment";
};

const getToken = () =>
  localStorage.getItem("token");

const Fees = () => {
  const navigate = useNavigate();

  const [fees, setFees] = useState([]);
  const [summary, setSummary] = useState({
    totalAmount: 0,
    paidAmount: 0,
    pendingAmount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState("");

  const [selectedFee, setSelectedFee] =
    useState(null);

  const [paymentLoadingId, setPaymentLoadingId] =
    useState(null);

  const [paymentError, setPaymentError] =
    useState("");

  const [paymentSuccess, setPaymentSuccess] =
    useState(null);

  const [showPaymentHistory, setShowPaymentHistory] =
    useState(false);

  // ==========================================================
  // ONLINE PAYMENT SETTING
  // ==========================================================

  const [
    onlinePayment,
    setOnlinePayment,
  ] = useState(true);

  const [
    paymentSettingLoading,
    setPaymentSettingLoading,
  ] = useState(true);

  const fetchPaymentSetting =
    useCallback(async () => {
      try {
        setPaymentSettingLoading(true);

        const response = await apiGet(
          "/admin/fees/payment-setting"
        );

        const data =
          response?.data || response;

        setOnlinePayment(
          data?.onlinePayment !== false
        );
      } catch (err) {
        console.error(
          "Fetch payment setting error:",
          err
        );

        setOnlinePayment(true);
      } finally {
        setPaymentSettingLoading(false);
      }
    }, []);

  // ==========================================================
  // FETCH FEES
  // ==========================================================

  const fetchFees = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const response =
          await apiGet("/fees/my-fees");

        const data =
          response?.data || response;

        const receivedFees =
          Array.isArray(data?.fees)
            ? data.fees
            : [];

        setFees(receivedFees);

        setSummary({
          totalAmount:
            Number(
              data?.summary?.totalAmount || 0
            ),

          paidAmount:
            Number(
              data?.summary?.paidAmount || 0
            ),

          pendingAmount:
            Number(
              data?.summary?.pendingAmount || 0
            ),
        });
      } catch (err) {
        console.error(
          "Fetch fees error:",
          err
        );

        const message =
          err?.message ||
          "Failed to load fee information.";

        setError(message);

        const lowerMessage =
          message.toLowerCase();

        if (
          lowerMessage.includes("token") ||
          lowerMessage.includes("unauthorized") ||
          lowerMessage.includes("authentication") ||
          lowerMessage.includes("forbidden")
        ) {
          logoutUser();
          navigate("/");
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [navigate]
  );

  useEffect(() => {
    fetchFees();
  }, [fetchFees]);

  useEffect(() => {
    fetchPaymentSetting();
  }, [fetchPaymentSetting]);

  // ==========================================================
  // DERIVED DATA
  // ==========================================================

  const pendingFees = useMemo(
    () =>
      fees.filter(
        (fee) =>
          Number(fee.totalAmount || 0) >
          Number(fee.paidAmount || 0)
      ),
    [fees]
  );

  const paidFees = useMemo(
    () =>
      fees.filter(
        (fee) =>
          normalizeStatus(fee.status) ===
            "PAID" ||
          Number(fee.paidAmount || 0) >=
            Number(fee.totalAmount || 0)
      ),
    [fees]
  );

  const totalPayments = useMemo(
    () =>
      fees.reduce(
        (count, fee) =>
          count +
          (Array.isArray(fee.payments)
            ? fee.payments.length
            : 0),
        0
      ),
    [fees]
  );

  // ==========================================================
  // RAZORPAY PAYMENT
  // ==========================================================

  const handlePayNow = async (fee) => {
    if (!fee?.id) return;

    if (!onlinePayment) {
      setPaymentError(
        "Online payments are currently disabled by the administrator."
      );
      return;
    }

    if (paymentSettingLoading) {
      setPaymentError(
        "Checking online payment availability. Please try again in a moment."
      );
      return;
    }

    setPaymentError("");
    setPaymentSuccess(null);
    setPaymentLoadingId(fee.id);

    try {
      const loaded =
        await loadRazorpayScript();

      if (!loaded) {
        throw new Error(
          "Unable to load Razorpay Checkout. Please check your internet connection and try again."
        );
      }

      const token = getToken();

      if (!token) {
        logoutUser();
        navigate("/");
        return;
      }

      // --------------------------------------------------------
      // CREATE ORDER
      // --------------------------------------------------------

      const orderResponse =
        await fetch(
          `${API_BASE_URL}/fees/${fee.id}/create-order`,
          {
            method: "POST",

            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type":
                "application/json",
            },
          }
        );

      const orderData =
        await orderResponse.json();

      if (!orderResponse.ok) {
        throw new Error(
          orderData?.message ||
            "Failed to create payment order."
        );
      }

      const order =
        orderData?.order;

      const razorpayKey =
        orderData?.keyId;

      if (
        !order?.id ||
        !order?.amount ||
        !razorpayKey
      ) {
        throw new Error(
          "Invalid payment order received from server."
        );
      }

      // --------------------------------------------------------
      // OPEN RAZORPAY
      // --------------------------------------------------------

      const options = {
        key: razorpayKey,

        amount: order.amount,

        currency:
          order.currency || "INR",

        name: "Campus360",

        description:
          fee.title ||
          "Campus360 Fee Payment",

        order_id: order.id,

        theme: {
          color: "#1769ff",
        },

        prefill: {
          name: "",
          email: "",
        },

        notes: {
          feeId: String(fee.id),
        },

        handler: async (
          response
        ) => {
          try {
            setPaymentError("");

            // --------------------------------------------------
            // VERIFY PAYMENT
            // --------------------------------------------------

            const verifyResponse =
              await fetch(
                `${API_BASE_URL}/fees/verify-payment`,
                {
                  method: "POST",

                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type":
                      "application/json",
                  },

                  body: JSON.stringify({
                    feeId: fee.id,

                    razorpay_order_id:
                      response.razorpay_order_id,

                    razorpay_payment_id:
                      response.razorpay_payment_id,

                    razorpay_signature:
                      response.razorpay_signature,
                  }),
                }
              );

            const verifyData =
              await verifyResponse.json();

            if (!verifyResponse.ok) {
              throw new Error(
                verifyData?.message ||
                  "Payment verification failed."
              );
            }

            setPaymentSuccess({
              feeId: fee.id,

              amount:
                Number(
                  order.amount
                ) / 100,

              transactionId:
                response.razorpay_payment_id,

              message:
                verifyData?.message ||
                "Payment completed successfully.",
            });

            setSelectedFee(null);

            await fetchFees(true);
          } catch (err) {
            console.error(
              "Payment verification error:",
              err
            );

            setPaymentError(
              err?.message ||
                "Payment was completed but verification failed. Please contact the administrator."
            );
          } finally {
            setPaymentLoadingId(null);
          }
        },

        modal: {
          ondismiss: () => {
            setPaymentLoadingId(null);
          },
        },
      };

      const razorpay =
        new window.Razorpay(
          options
        );

      razorpay.on(
        "payment.failed",
        (response) => {
          console.error(
            "Razorpay payment failed:",
            response
          );

          setPaymentError(
            response?.error?.description ||
              "Payment failed. Please try again."
          );

          setPaymentLoadingId(null);
        }
      );

      razorpay.open();
    } catch (err) {
      console.error(
        "Payment initialization error:",
        err
      );

      setPaymentError(
        err?.message ||
          "Unable to start payment."
      );

      setPaymentLoadingId(null);
    }
  };

  // ==========================================================
  // VIEW FEE DETAILS
  // ==========================================================

  const handleViewFee = (fee) => {
    setPaymentError("");
    setSelectedFee(fee);
  };

  // ==========================================================
  // CLOSE MODALS
  // ==========================================================

  const closeModal = () => {
    if (paymentLoadingId) return;

    setSelectedFee(null);
    setPaymentError("");
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="fees-page">
        <style>{feesStyles}</style>

        <div className="fees-loading">
          <div className="loading-spinner">
            <Loader2 size={28} />
          </div>

          <h3>Loading your fees...</h3>

          <p>
            Please wait while we fetch your
            latest fee information.
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // PAGE
  // ==========================================================

  return (
    <div className="fees-page">
      <style>{feesStyles}</style>

      {/* ====================================================
          HEADER
      ==================================================== */}

      <header className="fees-header">
        <div className="fees-header-inner">
          <button
            className="back-button"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <ArrowLeft size={18} />
            Back to Dashboard
          </button>

          <button
            className="refresh-button"
            onClick={() => {
              fetchFees(true);
              fetchPaymentSetting();
            }}
            disabled={refreshing}
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "spin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>
      </header>

      <main className="fees-container">
        {/* ==================================================
            PAGE TITLE
        ================================================== */}

        <section className="fees-title-section">
          <div>
            <div className="eyebrow">
              <WalletCards size={15} />
              STUDENT FINANCE
            </div>

            <h1>My Fees</h1>

            <p>
              View your fee records, payment
              history and securely pay your
              outstanding fees online.
            </p>
          </div>

          <div
            className={
              onlinePayment
                ? "secure-payment-badge"
                : "payment-disabled-badge"
            }
          >
            {paymentSettingLoading ? (
              <>
                <Loader2
                  size={17}
                  className="spin"
                />

                <span>
                  Checking payment status...
                </span>
              </>
            ) : onlinePayment ? (
              <>
                <ShieldCheck size={18} />

                <span>
                  Secure online payments
                </span>
              </>
            ) : (
              <>
                <XCircle size={18} />

                <span>
                  Online payments disabled
                </span>
              </>
            )}
          </div>
        </section>

        {/* ==================================================
            PAYMENT DISABLED NOTICE
        ================================================== */}

        {!paymentSettingLoading &&
          !onlinePayment && (
            <div className="payment-disabled-banner">
              <div className="payment-disabled-icon">
                <CreditCard size={21} />
              </div>

              <div>
                <strong>
                  Online payments are currently disabled
                </strong>

                <span>
                  The administrator has temporarily
                  disabled online fee payments.
                  You can still view your fee
                  records and payment history.
                </span>
              </div>
            </div>
          )}

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="error-banner">
            <XCircle size={20} />

            <div>
              <strong>
                Unable to load fees
              </strong>

              <span>{error}</span>
            </div>

            <button
              onClick={() => {
                fetchFees(true);
                fetchPaymentSetting();
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* ==================================================
            PAYMENT ERROR
        ================================================== */}

        {paymentError && (
          <div className="error-banner">
            <XCircle size={20} />

            <div>
              <strong>
                Payment unavailable
              </strong>

              <span>
                {paymentError}
              </span>
            </div>

            <button
              onClick={() =>
                setPaymentError("")
              }
            >
              Close
            </button>
          </div>
        )}

        {/* ==================================================
            SUCCESS
        ================================================== */}

        {paymentSuccess && (
          <div className="success-banner">
            <div className="success-icon">
              <CheckCircle2 size={22} />
            </div>

            <div className="success-content">
              <strong>
                Payment successful
              </strong>

              <span>
                {paymentSuccess.message}
              </span>

              <small>
                Amount:{" "}
                {formatCurrency(
                  paymentSuccess.amount
                )}
                {" • "}
                Transaction ID:{" "}
                {paymentSuccess.transactionId}
              </small>
            </div>

            <button
              onClick={() =>
                setPaymentSuccess(null)
              }
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* ==================================================
            SUMMARY CARDS
        ================================================== */}

        <section className="summary-grid">
          <div className="summary-card total-card">
            <div className="summary-icon">
              <IndianRupee size={21} />
            </div>

            <div>
              <span>
                Total Fees
              </span>

              <strong>
                {formatCurrency(
                  summary.totalAmount
                )}
              </strong>
            </div>
          </div>

          <div className="summary-card paid-card">
            <div className="summary-icon">
              <CheckCircle2 size={21} />
            </div>

            <div>
              <span>
                Paid
              </span>

              <strong>
                {formatCurrency(
                  summary.paidAmount
                )}
              </strong>
            </div>
          </div>

          <div className="summary-card pending-card">
            <div className="summary-icon">
              <Clock3 size={21} />
            </div>

            <div>
              <span>
                Pending
              </span>

              <strong>
                {formatCurrency(
                  summary.pendingAmount
                )}
              </strong>
            </div>
          </div>

          <div className="summary-card history-card">
            <div className="summary-icon">
              <Receipt size={21} />
            </div>

            <div>
              <span>
                Payments
              </span>

              <strong>
                {totalPayments}
              </strong>
            </div>
          </div>
        </section>

        {/* ==================================================
            PAYMENT PROGRESS
        ================================================== */}

        {summary.totalAmount > 0 && (
          <section className="progress-card">
            <div className="progress-top">
              <div>
                <h3>
                  Payment Progress
                </h3>

                <p>
                  {formatCurrency(
                    summary.paidAmount
                  )}{" "}
                  paid of{" "}
                  {formatCurrency(
                    summary.totalAmount
                  )}
                </p>
              </div>

              <strong>
                {Math.min(
                  Math.round(
                    (summary.paidAmount /
                      summary.totalAmount) *
                      100
                  ),
                  100
                )}
                %
              </strong>
            </div>

            <div className="progress-track">
              <div
                className="progress-fill"
                style={{
                  width: `${Math.min(
                    (summary.paidAmount /
                      summary.totalAmount) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </section>
        )}

        {/* ==================================================
            FEE RECORDS
        ================================================== */}

        <section className="fees-section">
          <div className="section-heading">
            <div>
              <h2>Fee Records</h2>

              <p>
                {fees.length}{" "}
                {fees.length === 1
                  ? "fee record"
                  : "fee records"}
              </p>
            </div>
          </div>

          {fees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <FileText size={30} />
              </div>

              <h3>
                No fee records found
              </h3>

              <p>
                You currently don't have
                any fee records.
              </p>
            </div>
          ) : (
            <div className="fees-list">
              {fees.map((fee) => {
                const total =
                  Number(
                    fee.totalAmount || 0
                  );

                const paid =
                  Number(
                    fee.paidAmount || 0
                  );

                const pending =
                  Math.max(
                    total - paid,
                    0
                  );

                const isPaid =
                  pending <= 0 ||
                  normalizeStatus(
                    fee.status
                  ) === "PAID";

                const progress =
                  total > 0
                    ? Math.min(
                        (paid / total) *
                          100,
                        100
                      )
                    : 0;

                return (
                  <article
                    key={fee.id}
                    className="fee-card"
                  >
                    <div className="fee-card-main">
                      <div className="fee-title-row">
                        <div className="fee-main-icon">
                          <FileText
                            size={20}
                          />
                        </div>

                        <div>
                          <h3>
                            {fee.title ||
                              "Fee"}
                          </h3>

                          <span>
                            Fee ID: #
                            {fee.id}
                          </span>
                        </div>
                      </div>

                      <div
                        className={getStatusClass(
                          fee.status
                        )}
                      >
                        {isPaid ? (
                          <CheckCircle2
                            size={15}
                          />
                        ) : (
                          <Clock3
                            size={15}
                          />
                        )}

                        {isPaid
                          ? "PAID"
                          : normalizeStatus(
                              fee.status
                            )}
                      </div>
                    </div>

                    <div className="fee-amount-grid">
                      <div>
                        <span>
                          Total Amount
                        </span>

                        <strong>
                          {formatCurrency(
                            total
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Paid
                        </span>

                        <strong className="paid-text">
                          {formatCurrency(
                            paid
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Remaining
                        </span>

                        <strong
                          className={
                            pending > 0
                              ? "pending-text"
                              : "paid-text"
                          }
                        >
                          {formatCurrency(
                            pending
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>
                          Due Date
                        </span>

                        <strong className="date-value">
                          <CalendarDays
                            size={15}
                          />
                          {formatDate(
                            fee.dueDate
                          )}
                        </strong>
                      </div>
                    </div>

                    <div className="fee-progress-row">
                      <div className="mini-progress">
                        <div
                          style={{
                            width: `${progress}%`,
                          }}
                        />
                      </div>

                      <span>
                        {Math.round(
                          progress
                        )}
                        % paid
                      </span>
                    </div>

                    <div className="fee-card-actions">
                      <button
                        className="details-button"
                        onClick={() =>
                          handleViewFee(
                            fee
                          )
                        }
                      >
                        <FileText
                          size={16}
                        />
                        View Details
                      </button>

                      {!isPaid &&
                        !paymentSettingLoading &&
                        onlinePayment && (
                          <button
                            className="pay-button"
                            onClick={() =>
                              handlePayNow(
                                fee
                              )
                            }
                            disabled={
                              paymentLoadingId ===
                              fee.id
                            }
                          >
                            {paymentLoadingId ===
                            fee.id ? (
                              <>
                                <Loader2
                                  size={17}
                                  className="spin"
                                />
                                Opening...
                              </>
                            ) : (
                              <>
                                <CreditCard
                                  size={17}
                                />
                                Pay{" "}
                                {formatCurrency(
                                  pending
                                )}
                              </>
                            )}
                          </button>
                        )}
                    </div>

                    {!isPaid &&
                      !paymentSettingLoading &&
                      !onlinePayment && (
                        <div className="fee-payment-disabled">
                          <XCircle size={16} />

                          <span>
                            Online payment is currently
                            disabled by the administrator.
                          </span>
                        </div>
                      )}
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ==================================================
            PAYMENT HISTORY
        ================================================== */}

        <section className="history-section">
          <div className="section-heading">
            <div>
              <h2>
                Recent Payment History
              </h2>

              <p>
                Your latest fee transactions
              </p>
            </div>

            <button
              className="history-toggle"
              onClick={() =>
                setShowPaymentHistory(
                  !showPaymentHistory
                )
              }
            >
              {showPaymentHistory
                ? "Hide History"
                : "View History"}
            </button>
          </div>

          {showPaymentHistory && (
            <div className="payment-history">
              {fees.every(
                (fee) =>
                  !Array.isArray(
                    fee.payments
                  ) ||
                  fee.payments.length ===
                    0
              ) ? (
                <div className="history-empty">
                  <Receipt size={25} />

                  <span>
                    No payments have been
                    recorded yet.
                  </span>
                </div>
              ) : (
                fees
                  .flatMap((fee) =>
                    (
                      Array.isArray(
                        fee.payments
                      )
                        ? fee.payments
                        : []
                    ).map((payment) => ({
                      ...payment,
                      feeTitle:
                        fee.title,
                    }))
                  )
                  .sort(
                    (a, b) =>
                      new Date(
                        b.paymentDate
                      ) -
                      new Date(
                        a.paymentDate
                      )
                  )
                  .map((payment) => (
                    <div
                      className="payment-row"
                      key={
                        payment.id
                      }
                    >
                      <div className="payment-icon">
                        <CheckCircle2
                          size={18}
                        />
                      </div>

                      <div className="payment-info">
                        <strong>
                          {payment.feeTitle}
                        </strong>

                        <span>
                          {formatDate(
                            payment.paymentDate
                          )}
                          {" • "}
                          {getPaymentMethodLabel(
                            payment.paymentMethod
                          )}
                        </span>
                      </div>

                      <div className="payment-transaction">
                        <span>
                          Transaction ID
                        </span>

                        <strong>
                          {
                            payment.transactionId
                          }
                        </strong>
                      </div>

                      <strong className="payment-amount">
                        {formatCurrency(
                          payment.amount
                        )}
                      </strong>
                    </div>
                  ))
              )}
            </div>
          )}
        </section>
      </main>

      {/* ====================================================
          FEE DETAILS MODAL
      ==================================================== */}

      {selectedFee && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="fee-modal">
            <div className="modal-header">
              <div>
                <span>
                  FEE DETAILS
                </span>

                <h2>
                  {selectedFee.title}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={closeModal}
                disabled={
                  Boolean(
                    paymentLoadingId
                  )
                }
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {paymentError && (
                <div className="modal-error">
                  <XCircle size={18} />

                  <span>
                    {paymentError}
                  </span>
                </div>
              )}

              <div className="detail-grid">
                <div>
                  <span>
                    Fee ID
                  </span>

                  <strong>
                    #{selectedFee.id}
                  </strong>
                </div>

                <div>
                  <span>
                    Status
                  </span>

                  <strong>
                    {normalizeStatus(
                      selectedFee.status
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Total Amount
                  </span>

                  <strong>
                    {formatCurrency(
                      selectedFee.totalAmount
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Paid Amount
                  </span>

                  <strong className="paid-text">
                    {formatCurrency(
                      selectedFee.paidAmount
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Remaining Amount
                  </span>

                  <strong className="pending-text">
                    {formatCurrency(
                      Math.max(
                        Number(
                          selectedFee.totalAmount ||
                            0
                        ) -
                          Number(
                            selectedFee.paidAmount ||
                              0
                          ),
                        0
                      )
                    )}
                  </strong>
                </div>

                <div>
                  <span>
                    Due Date
                  </span>

                  <strong>
                    {formatDate(
                      selectedFee.dueDate
                    )}
                  </strong>
                </div>
              </div>

              <div className="modal-history">
                <h3>
                  Payment History
                </h3>

                {!Array.isArray(
                  selectedFee.payments
                ) ||
                selectedFee.payments.length ===
                  0 ? (
                  <p className="no-history">
                    No payments recorded.
                  </p>
                ) : (
                  selectedFee.payments.map(
                    (payment) => (
                      <div
                        className="modal-payment-row"
                        key={
                          payment.id
                        }
                      >
                        <div>
                          <strong>
                            {formatCurrency(
                              payment.amount
                            )}
                          </strong>

                          <span>
                            {
                              payment.transactionId
                            }
                          </span>
                        </div>

                        <div>
                          <span>
                            {getPaymentMethodLabel(
                              payment.paymentMethod
                            )}
                          </span>

                          <small>
                            {formatDate(
                              payment.paymentDate
                            )}
                          </small>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="details-button"
                onClick={closeModal}
                disabled={
                  Boolean(
                    paymentLoadingId
                  )
                }
              >
                Close
              </button>

              {Number(
                selectedFee.totalAmount || 0
              ) >
                Number(
                  selectedFee.paidAmount || 0
                ) &&
                !paymentSettingLoading &&
                onlinePayment && (
                  <button
                    className="pay-button"
                    onClick={() =>
                      handlePayNow(
                        selectedFee
                      )
                    }
                    disabled={
                      paymentLoadingId ===
                      selectedFee.id
                    }
                  >
                    {paymentLoadingId ===
                    selectedFee.id ? (
                      <>
                        <Loader2
                          size={17}
                          className="spin"
                        />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard
                          size={17}
                        />
                        Pay Now
                      </>
                    )}
                  </button>
                )}

              {Number(
                selectedFee.totalAmount || 0
              ) >
                Number(
                  selectedFee.paidAmount || 0
                ) &&
                !paymentSettingLoading &&
                !onlinePayment && (
                  <div className="modal-payment-disabled">
                    <XCircle size={16} />

                    <span>
                      Online payments are currently
                      disabled.
                    </span>
                  </div>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const feesStyles = `
  * {
    box-sizing: border-box;
  }

  .fees-page {
    min-height: 100vh;
    background: #f5f7fb;
    color: #172033;
    font-family:
      Inter,
      "Segoe UI",
      Arial,
      sans-serif;
  }

  .fees-header {
    position: sticky;
    top: 0;
    z-index: 20;
    background: rgba(255,255,255,0.94);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid #e7ebf2;
  }

  .fees-header-inner {
    max-width: 1280px;
    margin: auto;
    min-height: 68px;
    padding: 0 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
  }

  .back-button,
  .refresh-button,
  .history-toggle,
  .details-button,
  .pay-button {
    border: 0;
    cursor: pointer;
    font-family: inherit;
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease,
      background 0.2s ease;
  }

  .back-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    background: #eef3ff;
    color: #1769ff;
    font-weight: 700;
  }

  .back-button:hover {
    background: #e4ecff;
  }

  .refresh-button {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid #dfe5ef;
    color: #344054;
    font-weight: 700;
  }

  .refresh-button:hover:not(:disabled) {
    background: #f8faff;
  }

  button:disabled {
    cursor: not-allowed;
    opacity: 0.65;
  }

  .fees-container {
    max-width: 1280px;
    margin: 0 auto;
    padding: 34px 24px 60px;
  }

  .fees-title-section {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 24px;
    margin-bottom: 28px;
  }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #1769ff;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.12em;
    margin-bottom: 9px;
  }

  .fees-title-section h1 {
    margin: 0;
    font-size: 34px;
    letter-spacing: -0.8px;
  }

  .fees-title-section p {
    margin: 9px 0 0;
    color: #667085;
    max-width: 720px;
    line-height: 1.6;
  }

  .secure-payment-badge,
  .payment-disabled-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 15px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: 700;
    white-space: nowrap;
  }

  .secure-payment-badge {
    background: #ecfdf3;
    color: #027a48;
  }

  .payment-disabled-badge {
    background: #fff2f1;
    color: #b42318;
  }

  .payment-disabled-banner {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    margin-bottom: 20px;
    border-radius: 15px;
    background: #fff8ed;
    border: 1px solid #fedf89;
    color: #9a3412;
  }

  .payment-disabled-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: grid;
    place-items: center;
    border-radius: 11px;
    background: #ffedd5;
    color: #c2410c;
  }

  .payment-disabled-banner > div:last-child {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .payment-disabled-banner strong {
    font-size: 14px;
  }

  .payment-disabled-banner span {
    font-size: 13px;
    line-height: 1.5;
  }

  .error-banner,
  .success-banner {
    display: flex;
    align-items: center;
    gap: 13px;
    padding: 15px 17px;
    border-radius: 14px;
    margin-bottom: 20px;
  }

  .error-banner {
    background: #fff2f1;
    border: 1px solid #ffd5d2;
    color: #b42318;
  }

  .success-banner {
    background: #ecfdf3;
    border: 1px solid #abefc6;
    color: #027a48;
  }

  .error-banner > div,
  .success-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
  }

  .error-banner span,
  .success-content span {
    font-size: 13px;
  }

  .success-content small {
    margin-top: 3px;
    opacity: 0.9;
    word-break: break-word;
  }

  .error-banner button {
    border: 0;
    background: #b42318;
    color: white;
    padding: 8px 13px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
  }

  .success-banner > button {
    border: 0;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .success-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #d1fadf;
    display: grid;
    place-items: center;
  }

  .summary-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 16px;
    margin-bottom: 18px;
  }

  .summary-card {
    background: #ffffff;
    border: 1px solid #e7ebf2;
    border-radius: 16px;
    padding: 19px;
    display: flex;
    align-items: center;
    gap: 14px;
    box-shadow:
      0 5px 18px rgba(16,24,40,0.04);
  }

  .summary-icon {
    width: 45px;
    height: 45px;
    border-radius: 12px;
    display: grid;
    place-items: center;
  }

  .total-card .summary-icon {
    background: #eaf0ff;
    color: #1769ff;
  }

  .paid-card .summary-icon {
    background: #e8f8ef;
    color: #039855;
  }

  .pending-card .summary-icon {
    background: #fff6df;
    color: #dc6803;
  }

  .history-card .summary-icon {
    background: #f2eaff;
    color: #7f56d9;
  }

  .summary-card div:last-child {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .summary-card span {
    color: #667085;
    font-size: 12px;
    font-weight: 600;
  }

  .summary-card strong {
    font-size: 20px;
    letter-spacing: -0.3px;
  }

  .progress-card {
    background: #ffffff;
    border: 1px solid #e7ebf2;
    border-radius: 16px;
    padding: 21px;
    margin-bottom: 30px;
  }

  .progress-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 20px;
    margin-bottom: 15px;
  }

  .progress-top h3 {
    margin: 0;
    font-size: 16px;
  }

  .progress-top p {
    margin: 5px 0 0;
    color: #667085;
    font-size: 13px;
  }

  .progress-top > strong {
    font-size: 24px;
    color: #1769ff;
  }

  .progress-track,
  .mini-progress {
    overflow: hidden;
    background: #edf1f7;
    border-radius: 999px;
  }

  .progress-track {
    height: 9px;
  }

  .progress-fill {
    height: 100%;
    border-radius: inherit;
    background: #1769ff;
    transition: width 0.4s ease;
  }

  .fees-section,
  .history-section {
    margin-top: 30px;
  }

  .section-heading {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    margin-bottom: 15px;
  }

  .section-heading h2 {
    margin: 0;
    font-size: 21px;
    letter-spacing: -0.3px;
  }

  .section-heading p {
    margin: 5px 0 0;
    color: #667085;
    font-size: 13px;
  }

  .fees-list {
    display: grid;
    gap: 15px;
  }

  .fee-card {
    background: #ffffff;
    border: 1px solid #e7ebf2;
    border-radius: 17px;
    padding: 20px;
    box-shadow:
      0 5px 18px rgba(16,24,40,0.035);
  }

  .fee-card-main {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
  }

  .fee-title-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .fee-main-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: #edf3ff;
    color: #1769ff;
    display: grid;
    place-items: center;
  }

  .fee-title-row h3 {
    margin: 0;
    font-size: 17px;
  }

  .fee-title-row span {
    display: block;
    margin-top: 4px;
    color: #98a2b3;
    font-size: 12px;
  }

  .fee-status {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
  }

  .fee-status.paid {
    background: #ecfdf3;
    color: #027a48;
  }

  .fee-status.partial {
    background: #fff6ed;
    color: #c4320a;
  }

  .fee-status.pending {
    background: #fff7e6;
    color: #b54708;
  }

  .fee-amount-grid {
    display: grid;
    grid-template-columns:
      repeat(4, minmax(0, 1fr));
    gap: 18px;
    padding: 20px 0 16px;
  }

  .fee-amount-grid > div {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .fee-amount-grid span {
    color: #667085;
    font-size: 12px;
  }

  .fee-amount-grid strong {
    font-size: 15px;
  }

  .date-value {
    display: inline-flex !important;
    align-items: center;
    gap: 5px;
  }

  .paid-text {
    color: #039855 !important;
  }

  .pending-text {
    color: #d92d20 !important;
  }

  .fee-progress-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 18px;
  }

  .mini-progress {
    flex: 1;
    height: 6px;
  }

  .mini-progress > div {
    height: 100%;
    border-radius: inherit;
    background: #1769ff;
  }

  .fee-progress-row > span {
    color: #667085;
    font-size: 11px;
    min-width: 48px;
    text-align: right;
  }

  .fee-card-actions,
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    padding-top: 15px;
    border-top: 1px solid #eef1f5;
  }

  .fee-payment-disabled {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 14px;
    padding: 10px 12px;
    border-radius: 10px;
    background: #fff8ed;
    border: 1px solid #fedf89;
    color: #9a3412;
    font-size: 12px;
    font-weight: 600;
  }

  .details-button,
  .pay-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 40px;
    padding: 9px 14px;
    border-radius: 10px;
    font-weight: 700;
  }

  .details-button {
    background: #f2f4f7;
    color: #344054;
  }

  .details-button:hover:not(:disabled) {
    background: #e9edf3;
  }

  .pay-button {
    background: #1769ff;
    color: #ffffff;
    box-shadow:
      0 5px 12px rgba(23,105,255,0.18);
  }

  .pay-button:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow:
      0 7px 16px rgba(23,105,255,0.24);
  }

  .history-toggle {
    padding: 9px 13px;
    border-radius: 9px;
    background: #eef3ff;
    color: #1769ff;
    font-weight: 700;
  }

  .payment-history {
    background: #ffffff;
    border: 1px solid #e7ebf2;
    border-radius: 15px;
    overflow: hidden;
  }

  .payment-row {
    display: grid;
    grid-template-columns:
      auto 1fr minmax(180px, 0.8fr) auto;
    align-items: center;
    gap: 15px;
    padding: 15px 18px;
    border-bottom: 1px solid #eef1f5;
  }

  .payment-row:last-child {
    border-bottom: 0;
  }

  .payment-icon {
    width: 37px;
    height: 37px;
    border-radius: 50%;
    background: #ecfdf3;
    color: #039855;
    display: grid;
    place-items: center;
  }

  .payment-info,
  .payment-transaction {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .payment-info strong {
    font-size: 13px;
  }

  .payment-info span,
  .payment-transaction span {
    color: #667085;
    font-size: 11px;
  }

  .payment-transaction strong {
    font-size: 11px;
    color: #344054;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .payment-amount {
    color: #039855;
    white-space: nowrap;
  }

  .history-empty,
  .empty-state {
    background: #ffffff;
    border: 1px solid #e7ebf2;
    border-radius: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .history-empty {
    padding: 30px;
    color: #667085;
    gap: 10px;
  }

  .empty-state {
    padding: 60px 20px;
  }

  .empty-icon {
    width: 60px;
    height: 60px;
    border-radius: 16px;
    background: #edf3ff;
    color: #1769ff;
    display: grid;
    place-items: center;
    margin-bottom: 15px;
  }

  .empty-state h3 {
    margin: 0;
  }

  .empty-state p {
    color: #667085;
    margin: 8px 0 0;
  }

  .modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(15,23,42,0.52);
    backdrop-filter: blur(4px);
    padding: 20px;
    display: grid;
    place-items: center;
  }

  .fee-modal {
    width: min(680px, 100%);
    max-height: min(760px, 92vh);
    overflow-y: auto;
    background: #ffffff;
    border-radius: 20px;
    box-shadow:
      0 25px 70px rgba(15,23,42,0.24);
  }

  .modal-header {
    padding: 22px 23px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    border-bottom: 1px solid #eef1f5;
  }

  .modal-header > div > span {
    color: #1769ff;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.12em;
  }

  .modal-header h2 {
    margin: 5px 0 0;
    font-size: 21px;
  }

  .modal-close {
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 9px;
    background: #f2f4f7;
    color: #475467;
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .modal-body {
    padding: 22px;
  }

  .modal-error {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    background: #fff2f1;
    color: #b42318;
    border: 1px solid #ffd5d2;
    border-radius: 11px;
    padding: 11px 13px;
    margin-bottom: 17px;
    font-size: 13px;
  }

  .detail-grid {
    display: grid;
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
    gap: 13px;
  }

  .detail-grid > div {
    background: #f8fafc;
    border-radius: 11px;
    padding: 13px;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .detail-grid span {
    color: #667085;
    font-size: 11px;
  }

  .detail-grid strong {
    font-size: 14px;
  }

  .modal-history {
    margin-top: 23px;
  }

  .modal-history h3 {
    margin: 0 0 12px;
    font-size: 15px;
  }

  .no-history {
    margin: 0;
    padding: 15px;
    background: #f8fafc;
    border-radius: 10px;
    color: #667085;
    font-size: 13px;
  }

  .modal-payment-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    padding: 13px 0;
    border-bottom: 1px solid #eef1f5;
  }

  .modal-payment-row:last-child {
    border-bottom: 0;
  }

  .modal-payment-row > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .modal-payment-row span,
  .modal-payment-row small {
    color: #667085;
    font-size: 11px;
  }

  .modal-payment-disabled {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    min-height: 40px;
    padding: 9px 14px;
    border-radius: 10px;
    background: #fff8ed;
    border: 1px solid #fedf89;
    color: #9a3412;
    font-size: 12px;
    font-weight: 700;
  }

  .modal-footer {
    padding: 15px 22px 20px;
  }

  .fees-loading {
    min-height: 70vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .loading-spinner {
    width: 58px;
    height: 58px;
    border-radius: 17px;
    background: #eaf0ff;
    color: #1769ff;
    display: grid;
    place-items: center;
    margin-bottom: 15px;
  }

  .fees-loading h3 {
    margin: 0;
  }

  .fees-loading p {
    margin: 7px 0 0;
    color: #667085;
  }

  .spin {
    animation: fees-spin 0.9s linear infinite;
  }

  @keyframes fees-spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 950px) {
    .summary-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .fee-amount-grid {
      grid-template-columns:
        repeat(2, minmax(0, 1fr));
    }

    .payment-row {
      grid-template-columns:
        auto 1fr auto;
    }

    .payment-transaction {
      display: none;
    }
  }

  @media (max-width: 650px) {
    .fees-header-inner,
    .fees-container {
      padding-left: 15px;
      padding-right: 15px;
    }

    .fees-header-inner {
      min-height: 62px;
    }

    .back-button {
      font-size: 12px;
    }

    .refresh-button {
      padding: 9px;
      font-size: 0;
    }

    .refresh-button svg {
      margin: 0;
    }

    .fees-title-section {
      flex-direction: column;
      align-items: flex-start;
    }

    .fees-title-section h1 {
      font-size: 28px;
    }

    .secure-payment-badge,
    .payment-disabled-badge {
      width: 100%;
      justify-content: center;
    }

    .payment-disabled-banner {
      align-items: flex-start;
    }

    .summary-grid {
      grid-template-columns: 1fr;
    }

    .fee-card {
      padding: 16px;
    }

    .fee-card-main {
      flex-direction: column;
    }

    .fee-status {
      align-self: flex-start;
    }

    .fee-amount-grid {
      grid-template-columns: 1fr 1fr;
      gap: 14px;
    }

    .fee-card-actions {
      flex-direction: column-reverse;
    }

    .details-button,
    .pay-button {
      width: 100%;
    }

    .fee-payment-disabled {
      align-items: flex-start;
    }

    .payment-row {
      grid-template-columns:
        auto 1fr auto;
      padding: 14px;
    }

    .payment-amount {
      font-size: 13px;
    }

    .detail-grid {
      grid-template-columns: 1fr;
    }

    .modal-footer {
      flex-direction: column-reverse;
    }

    .modal-footer button,
    .modal-payment-disabled {
      width: 100%;
    }

    .modal-payment-disabled {
      text-align: center;
    }
  }
`;

export default Fees;