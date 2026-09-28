import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";

import {
  apiPost,
  getLoggedInUser,
  logoutUser,
} from "../api";

const PasswordInput = ({
  label,
  value,
  setValue,
  showPassword,
  setShowPassword,
}) => {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-2">
        {label}
      </label>

      <div className="relative">
        <Lock
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
        />

        <input
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder={"Enter " + label.toLowerCase()}
          autoComplete="off"
          className="w-full px-10 py-3 pr-12 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
        />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          {showPassword ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

const ChangePassword = () => {
  const navigate = useNavigate();

  const user = getLoggedInUser();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const role = String(user?.role || "").toUpperCase();

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setError("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setError(
        "New password must be at least 8 characters long."
      );
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(
        "New password and confirm password do not match."
      );
      return;
    }

    if (currentPassword === newPassword) {
      setError(
        "New password must be different from the current password."
      );
      return;
    }

    setLoading(true);

    try {
      const response = await apiPost(
        "/auth/change-password",
        {
          currentPassword,
          newPassword,
          confirmPassword,
        }
      );

      setSuccess(
        response?.message ||
          "Password changed successfully."
      );

      const updatedUser = response?.user || {
        ...user,
        mustChangePassword: false,
      };

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...updatedUser,
          mustChangePassword: false,
        })
      );

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setTimeout(() => {
        if (role === "ADMIN") {
          navigate("/admin/dashboard", {
            replace: true,
          });
          return;
        }

        if (
          role === "FACULTY" ||
          role === "TEACHER"
        ) {
          navigate("/faculty/dashboard", {
            replace: true,
          });
          return;
        }

        navigate("/dashboard", {
          replace: true,
        });
      }, 700);
    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      setError(
        error?.message ||
          "Failed to change password."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logoutUser();

    navigate("/", {
      replace: true,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">

        <div className="text-center mb-7">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
            <ShieldCheck size={30} />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mt-4">
            Change Your Password
          </h1>

          <p className="text-sm text-slate-500 mt-2 leading-6">
            You are using a temporary password.
            You must create a new password before
            accessing Campus360.
          </p>
        </div>

        <div className="mb-5 rounded-xl bg-blue-50 border border-blue-100 p-4">
          <p className="text-xs text-blue-600 font-medium">
            Logged in as
          </p>

          <p className="text-sm font-semibold text-slate-800 mt-1 break-all">
            {user?.email || "Campus360 User"}
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 border border-red-200 text-red-600 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg bg-green-50 border border-green-200 text-green-700 px-4 py-3 text-sm">
            {success}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-5"
        >
          <PasswordInput
            label="Temporary Password"
            value={currentPassword}
            setValue={setCurrentPassword}
            showPassword={showCurrent}
            setShowPassword={setShowCurrent}
          />

          <PasswordInput
            label="New Password"
            value={newPassword}
            setValue={setNewPassword}
            showPassword={showNew}
            setShowPassword={setShowNew}
          />

          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            setValue={setConfirmPassword}
            showPassword={showConfirm}
            setShowPassword={setShowConfirm}
          />

          <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-600">
              New password must contain at least
              8 characters.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Lock size={18} />

            {loading
              ? "Changing Password..."
              : "Set New Password"}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full mt-4 text-sm text-slate-500 hover:text-red-600 transition"
        >
          Logout
        </button>

        <p className="text-center text-xs text-slate-400 mt-5">
          Campus360 • College Management Portal
        </p>
      </div>
    </div>
  );
};

export default ChangePassword;