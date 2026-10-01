import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";
import { loginUser } from "../api";

function Login() {
const navigate = useNavigate();
console.log(
    "reCAPTCHA site key loaded:",
    Boolean(import.meta.env.VITE_RECAPTCHA_SITE_KEY)
  );

const [identifier, setIdentifier] = useState("");
const [password, setPassword] = useState("");
const [captchaToken, setCaptchaToken] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

const handleLogin = async (e) => {
e.preventDefault();

setError("");

if (!identifier.trim()) {
  setError(
    "Please enter your email or registered phone number."
  );
  return;
}

if (!password) {
  setError("Please enter your password.");
  return;
}

if (!captchaToken) {
  setError(
    "Please verify that you are not a robot."
  );
  return;
}

setLoading(true);

try {
  const data = await loginUser(
    identifier.trim(),
    password,
    captchaToken
  );

  const role = String(
    data?.user?.role || ""
  ).toUpperCase();

  // ------------------------------------------------------
  // FIRST LOGIN PASSWORD CHANGE
  // ------------------------------------------------------

  if (data?.user?.mustChangePassword === true) {
    navigate("/change-password");
    return;
  }

  // ------------------------------------------------------
  // NORMAL DASHBOARD REDIRECTION
  // ------------------------------------------------------

  if (role === "ADMIN") {
    navigate("/admin/dashboard");
  } else if (
    role === "FACULTY" ||
    role === "TEACHER"
  ) {
    navigate("/faculty/dashboard");
  } else {
    navigate("/dashboard");
  }
} catch (err) {
  console.error("Login error:", err);

  setError(
    err?.message || "Login failed"
  );

  setCaptchaToken("");
} finally {
  setLoading(false);
}


};

return ( <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4"> <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">


    {/* Header */}

    <div className="text-center mb-8">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center text-2xl font-bold">
        C
      </div>

      <h1 className="text-3xl font-bold text-slate-800 mt-4">
        Campus360
      </h1>

      <p className="text-slate-500 mt-2">
        College Management Portal
      </p>
    </div>

    {/* Error */}

    {error && (
      <div className="mb-5 rounded-lg bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm">
        {error}
      </div>
    )}

    {/* Login Form */}

    <form
      onSubmit={handleLogin}
      className="space-y-5"
    >

      {/* Email / Phone */}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Email or Phone Number
        </label>

        <input
          type="text"
          value={identifier}
          onChange={(e) =>
            setIdentifier(e.target.value)
          }
          placeholder="Enter your email or registered phone number"
          required
          autoComplete="username"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
        />

        <p className="text-xs text-slate-500 mt-2">
          Students can use their Campus360 email
          or registered phone number.
        </p>
      </div>

      {/* Password */}

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Password
        </label>

        <input
          type="password"
          value={password}
          onChange={(e) =>
            setPassword(e.target.value)
          }
          placeholder="Enter your password"
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* CAPTCHA */}

      <div className="flex justify-center">
        <ReCAPTCHA
          sitekey={
            import.meta.env
              .VITE_RECAPTCHA_SITE_KEY
          }
          onChange={(token) =>
            setCaptchaToken(token || "")
          }
          onExpired={() =>
            setCaptchaToken("")
          }
          onErrored={() =>
            setCaptchaToken("")
          }
        />
      </div>

      {/* Login Button */}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition"
      >
        {loading
          ? "Signing in..."
          : "Sign In"}
      </button>
    </form>

    {/* Forgot Password */}

    <div className="text-center mt-5">
      <button
        type="button"
        onClick={() =>
          navigate("/forgot-password")
        }
        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
      >
        Forgot Password?
      </button>
    </div>

    {/* Footer */}

    <p className="text-center text-sm text-slate-500 mt-6">
      Campus360 • College Management Portal
    </p>
  </div>
</div>

);
}

export default Login;
