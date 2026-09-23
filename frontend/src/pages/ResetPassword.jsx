import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from "lucide-react";

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const resetToken = searchParams.get("token") || "";
  const email = searchParams.get("email") || "";

  const [form, setForm] = useState({
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    new: false,
    confirm: false,
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const passwordRules = useMemo(() => {
    const password = form.newPassword;

    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    };
  }, [form.newPassword]);

  const isStrongPassword =
    passwordRules.minLength &&
    passwordRules.hasUppercase &&
    passwordRules.hasLowercase &&
    passwordRules.hasNumber &&
    passwordRules.hasSpecial;

  const passwordsMatch =
    form.newPassword.length > 0 &&
    form.newPassword === form.confirmPassword;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (message.text) {
      setMessage({
        type: "",
        text: "",
      });
    }
  };

  const togglePassword = (field) => {
    setShowPasswords((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage({
      type: "",
      text: "",
    });

    if (!resetToken) {
      setMessage({
        type: "error",
        text: "Invalid or missing password reset token.",
      });
      return;
    }

    if (!form.newPassword || !form.confirmPassword) {
      setMessage({
        type: "error",
        text: "Please fill in both password fields.",
      });
      return;
    }

    if (form.newPassword.length < 8) {
      setMessage({
        type: "error",
        text: "New password must be at least 8 characters long.",
      });
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setMessage({
        type: "error",
        text: "New password and confirm password do not match.",
      });
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/reset-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            resetToken,
            newPassword: form.newPassword,
            confirmPassword: form.confirmPassword,
          }),
        }
      );

      const contentType =
        response.headers.get("content-type") || "";

      let data = null;

      if (contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text || null;
      }

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Unable to reset password."
        );
      }

      setForm({
        newPassword: "",
        confirmPassword: "",
      });

      setMessage({
        type: "success",
        text:
          data?.message ||
          "Password reset successfully. You can now login with your new password.",
      });

      setTimeout(() => {
        navigate("/");
      }, 2500);
    } catch (error) {
      console.error("Reset password error:", error);

      setMessage({
        type: "error",
        text:
          error?.message ||
          "Something went wrong while resetting your password.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* ============================================================
            BRAND
        ============================================================ */}

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/20 mb-4">
            <ShieldCheck size={32} />
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            Reset Password
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Create a new secure password for your Campus360 account.
          </p>

          {email && (
            <p className="mt-2 text-sm font-medium text-blue-600 break-all">
              {email}
            </p>
          )}
        </div>

        {/* ============================================================
            CARD
        ============================================================ */}

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-6 sm:p-8">

          {/* ==========================================================
              MESSAGE
          ========================================================== */}

          {message.text && (
            <div
              className={`mb-6 rounded-xl border px-4 py-3 flex items-start gap-3 ${
                message.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : "bg-red-50 border-red-200 text-red-700"
              }`}
            >
              {message.type === "success" ? (
                <CheckCircle2
                  size={20}
                  className="mt-0.5 shrink-0"
                />
              ) : (
                <AlertCircle
                  size={20}
                  className="mt-0.5 shrink-0"
                />
              )}

              <p className="text-sm leading-6">
                {message.text}
              </p>
            </div>
          )}

          {/* ==========================================================
              FORM
          ========================================================== */}

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* New Password */}

            <div>
              <label
                htmlFor="newPassword"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                New Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="newPassword"
                  name="newPassword"
                  type={
                    showPasswords.new
                      ? "text"
                      : "password"
                  }
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full h-12 rounded-xl border border-slate-300 bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 disabled:bg-slate-100"
                />

                <button
                  type="button"
                  onClick={() => togglePassword("new")}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 transition"
                  aria-label={
                    showPasswords.new
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPasswords.new ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-semibold text-slate-700 mb-2"
              >
                Confirm New Password
              </label>

              <div className="relative">
                <LockKeyhole
                  size={19}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={
                    showPasswords.confirm
                      ? "text"
                      : "password"
                  }
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  disabled={loading}
                  className={`w-full h-12 rounded-xl border bg-white pl-11 pr-12 text-sm text-slate-900 outline-none transition focus:ring-4 disabled:bg-slate-100 ${
                    form.confirmPassword &&
                    !passwordsMatch
                      ? "border-red-400 focus:border-red-500 focus:ring-red-500/10"
                      : form.confirmPassword &&
                        passwordsMatch
                      ? "border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/10"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/10"
                  }`}
                />

                <button
                  type="button"
                  onClick={() =>
                    togglePassword("confirm")
                  }
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-700 transition"
                  aria-label={
                    showPasswords.confirm
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPasswords.confirm ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>

              {form.confirmPassword &&
                !passwordsMatch && (
                  <p className="mt-2 text-xs text-red-600">
                    Passwords do not match.
                  </p>
                )}

              {form.confirmPassword &&
                passwordsMatch && (
                  <p className="mt-2 text-xs text-emerald-600">
                    Passwords match.
                  </p>
                )}
            </div>

            {/* ========================================================
                PASSWORD REQUIREMENTS
            ======================================================== */}

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
              <p className="text-sm font-semibold text-slate-700 mb-3">
                Password requirements
              </p>

              <div className="space-y-2">

                <PasswordRule
                  valid={passwordRules.minLength}
                  text="At least 8 characters"
                />

                <PasswordRule
                  valid={passwordRules.hasUppercase}
                  text="At least one uppercase letter"
                />

                <PasswordRule
                  valid={passwordRules.hasLowercase}
                  text="At least one lowercase letter"
                />

                <PasswordRule
                  valid={passwordRules.hasNumber}
                  text="At least one number"
                />

                <PasswordRule
                  valid={passwordRules.hasSpecial}
                  text="At least one special character"
                />

              </div>
            </div>

            {/* ========================================================
                SUBMIT
            ======================================================== */}

            <button
              type="submit"
              disabled={
                loading ||
                !resetToken ||
                !form.newPassword ||
                !form.confirmPassword
              }
              className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-sm transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <Loader2
                    size={19}
                    className="animate-spin"
                  />
                  Resetting Password...
                </>
              ) : (
                <>
                  <ShieldCheck size={19} />
                  Reset Password
                </>
              )}
            </button>

          </form>

          {/* ==========================================================
              BACK TO LOGIN
          ========================================================== */}

          <div className="mt-6 pt-6 border-t border-slate-200">
            <Link
              to="/"
              className="flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 transition"
            >
              <ArrowLeft size={17} />
              Back to Login
            </Link>
          </div>
        </div>

        {/* ============================================================
            FOOTER
        ============================================================ */}

        <p className="text-center text-xs text-slate-400 mt-6">
          Campus360 • Secure Password Recovery
        </p>
      </div>
    </div>
  );
};

// ================================================================
// PASSWORD RULE
// ================================================================

const PasswordRule = ({
  valid,
  text,
}) => {
  return (
    <div className="flex items-center gap-2">
      <CheckCircle2
        size={16}
        className={
          valid
            ? "text-emerald-500"
            : "text-slate-300"
        }
      />

      <span
        className={`text-xs ${
          valid
            ? "text-emerald-700"
            : "text-slate-500"
        }`}
      >
        {text}
      </span>
    </div>
  );
};

export default ResetPassword;