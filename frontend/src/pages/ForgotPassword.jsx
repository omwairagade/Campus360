import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiPost } from "../api";

function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);

    try {
      const data = await apiPost(
        "/auth/forgot-password",
        {
          email: email.trim().toLowerCase(),
        }
      );

      setMessage(
        data?.message ||
          "If an account exists with this email, a verification code has been sent."
      );

      // Move to OTP verification
      setTimeout(() => {
        navigate(
          `/verify-otp?email=${encodeURIComponent(
            email.trim().toLowerCase()
          )}`
        );
      }, 1500);
    } catch (err) {
      console.error(
        "Forgot password error:",
        err
      );

      setError(
        err.message ||
          "Unable to process your request."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4">

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        {/* Header */}
        <div className="text-center mb-8">

          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
            C
          </div>

          <h1 className="text-3xl font-bold text-slate-800 mt-4">
            Forgot Password?
          </h1>

          <p className="text-slate-500 mt-2">
            Enter your registered email address
            to receive a verification code.
          </p>

        </div>

        {/* Success */}
        {message && (
          <div className="mb-5 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
            {message}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >

          {/* Email */}
          <div>

            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>

            <input
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              placeholder="Enter your registered email"
              required
              autoComplete="email"
              className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            />

          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition"
          >
            {loading
              ? "Sending..."
              : "Send Verification Code"}
          </button>

        </form>

        {/* Back to Login */}
        <div className="text-center mt-6">

          <button
            type="button"
            onClick={() =>
              navigate("/login")
            }
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            ← Back to Login
          </button>

        </div>

        <p className="text-center text-sm text-slate-500 mt-6">
          Campus360 • College Management Portal
        </p>

      </div>
    </div>
  );
}

export default ForgotPassword;