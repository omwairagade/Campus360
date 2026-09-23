import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { apiPost } from "../api";

function VerifyOtp() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setMessage("");

    const cleanOtp = otp.trim();

    if (!cleanOtp) {
      setError("Please enter the verification code.");
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      setError("Verification code must be 6 digits.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiPost("/auth/verify-reset-otp", {
        email,
        otp: cleanOtp,
      });

      setMessage(
        data?.message || "OTP verified successfully."
      );

      const resetToken = data?.resetToken;

      if (!resetToken) {
        throw new Error(
          "Reset token was not received from the server."
        );
      }

      setTimeout(() => {
        navigate(
          `/reset-password?token=${encodeURIComponent(
            resetToken
          )}&email=${encodeURIComponent(email)}`
        );
      }, 800);
    } catch (err) {
      console.error("OTP verification error:", err);

      setError(
        err.message ||
          "Invalid or expired verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (e) => {
    const value = e.target.value
      .replace(/\D/g, "")
      .slice(0, 6);

    setOtp(value);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-2xl font-bold">
                C
              </span>
            </div>
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            Verify OTP
          </h1>

          <p className="text-slate-500 mt-2 text-sm">
            Enter the 6-digit verification code sent to
          </p>

          <p className="text-blue-600 font-medium mt-1 break-all">
            {email}
          </p>
        </div>

        {/* Success message */}
        {message && (
          <div className="mb-5 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {message}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <div>
            <label
              htmlFor="otp"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Verification Code
            </label>

            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={handleOtpChange}
              placeholder="Enter 6-digit OTP"
              maxLength={6}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-center text-xl tracking-[0.5em] font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full rounded-xl bg-blue-600 py-3.5 text-white font-semibold transition hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed"
          >
            {loading
              ? "Verifying..."
              : "Verify OTP"}
          </button>
        </form>

        {/* Back */}
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() =>
              navigate("/forgot-password")
            }
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Forgot Password
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 pt-6 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            Campus360 • Secure Password Recovery
          </p>
        </div>
      </div>
    </div>
  );
}

export default VerifyOtp;