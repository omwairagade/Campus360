import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  GraduationCap,
  Building2,
  BookOpen,
  Hash,
  Edit3,
  Save,
  X,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  LogOut,
} from "lucide-react";

import {
  apiGet,
  apiPatch,
  apiPost,
  logoutUser,
} from "../api";

const Settings = () => {
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] =
    useState(false);

  const [editMode, setEditMode] = useState(false);
  const [showPasswordForm, setShowPasswordForm] =
    useState(false);

  const [message, setMessage] = useState({
    type: "",
    text: "",
  });

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: "",
    batch: "",
    division: "",
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // ==========================================================
  // SHOW MESSAGE
  // ==========================================================

  const showMessage = (type, text) => {
    setMessage({
      type,
      text,
    });
  };

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile = async () => {
    try {
      setLoading(true);

      setMessage({
        type: "",
        text: "",
      });

      const response = await apiGet(
        "/student/profile"
      );

      console.log(
        "Student profile response:",
        response
      );

      const data =
        response?.student ||
        response?.data?.student ||
        response;

      if (!data || !data.id) {
        throw new Error(
          "Student profile not found"
        );
      }

      setStudent(data);

      setForm({
        firstName:
          data?.user?.firstName || "",
        lastName:
          data?.user?.lastName || "",
        phone:
          data?.phone || "",
        dateOfBirth:
          data?.dateOfBirth
            ? String(
                data.dateOfBirth
              ).split("T")[0]
            : "",
        batch:
          data?.batch || "",
        division:
          data?.division || "",
      });
    } catch (error) {
      console.error(
        "Settings profile error:",
        error
      );

      const errorMessage =
        error?.message ||
        "Failed to load profile";

      if (
        errorMessage
          .toLowerCase()
          .includes("unauthorized") ||
        errorMessage
          .toLowerCase()
          .includes("token") ||
        errorMessage
          .toLowerCase()
          .includes("authentication")
      ) {
        logoutUser();
        navigate("/");
        return;
      }

      showMessage(
        "error",
        errorMessage
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  // ==========================================================
  // PROFILE INPUT
  // ==========================================================

  const handleChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================================
  // PASSWORD INPUT
  // ==========================================================

  const handlePasswordChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setPasswordForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  const handleSaveProfile = async () => {
    if (!form.firstName.trim()) {
      showMessage(
        "error",
        "First name is required."
      );
      return;
    }

    if (
      form.firstName.trim().length < 2
    ) {
      showMessage(
        "error",
        "First name must contain at least 2 characters."
      );
      return;
    }

    if (!form.lastName.trim()) {
      showMessage(
        "error",
        "Last name is required."
      );
      return;
    }

    if (
      form.lastName.trim().length < 2
    ) {
      showMessage(
        "error",
        "Last name must contain at least 2 characters."
      );
      return;
    }

    try {
      setSaving(true);

      setMessage({
        type: "",
        text: "",
      });

      // ======================================================
      // UPDATE USING CENTRAL API HELPER
      // ======================================================

      const response = await apiPatch(
        "/student/profile",
        {
          firstName:
            form.firstName.trim(),

          lastName:
            form.lastName.trim(),

          phone:
            form.phone.trim() || null,

          dateOfBirth:
            form.dateOfBirth || null,

          batch:
            form.batch || null,

          division:
            form.division.trim() || null,
        }
      );

      console.log(
        "Update profile response:",
        response
      );

      const updatedStudent =
        response?.student ||
        response?.data?.student;

      if (updatedStudent) {
        setStudent(updatedStudent);

        setForm({
          firstName:
            updatedStudent?.user
              ?.firstName || "",

          lastName:
            updatedStudent?.user
              ?.lastName || "",

          phone:
            updatedStudent?.phone || "",

          dateOfBirth:
            updatedStudent?.dateOfBirth
              ? String(
                  updatedStudent.dateOfBirth
                ).split("T")[0]
              : "",

          batch:
            updatedStudent?.batch || "",

          division:
            updatedStudent?.division || "",
        });
      } else {
        // Reload profile if backend does not
        // return the updated student object.
        await loadProfile();
      }

      setEditMode(false);

      showMessage(
        "success",
        response?.message ||
          "Profile updated successfully."
      );
    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      showMessage(
        "error",
        error?.message ||
          "Failed to update profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // CANCEL PROFILE EDIT
  // ==========================================================

  const handleCancelEdit = () => {
    if (!student) {
      setEditMode(false);
      return;
    }

    setForm({
      firstName:
        student?.user?.firstName || "",

      lastName:
        student?.user?.lastName || "",

      phone:
        student?.phone || "",

      dateOfBirth:
        student?.dateOfBirth
          ? String(
              student.dateOfBirth
            ).split("T")[0]
          : "",

      batch:
        student?.batch || "",

      division:
        student?.division || "",
    });

    setEditMode(false);

    setMessage({
      type: "",
      text: "",
    });
  };

  // ==========================================================
  // CHANGE PASSWORD
  // ==========================================================

  const handleChangePassword = async (e) => {
    e.preventDefault();

    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = passwordForm;

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      showMessage(
        "error",
        "Please fill all password fields."
      );
      return;
    }

    if (newPassword.length < 8) {
      showMessage(
        "error",
        "New password must be at least 8 characters."
      );
      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      showMessage(
        "error",
        "New password and confirm password do not match."
      );
      return;
    }

    try {
      setChangingPassword(true);

      setMessage({
        type: "",
        text: "",
      });

      // ======================================================
      // CHANGE PASSWORD USING CENTRAL API HELPER
      // ======================================================

      const response = await apiPost(
        "/student/change-password",
        {
          currentPassword,
          newPassword,
          confirmPassword,
        }
      );

      console.log(
        "Change password response:",
        response
      );

      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setShowPasswordForm(false);

      setShowPasswords({
        current: false,
        new: false,
        confirm: false,
      });

      showMessage(
        "success",
        response?.message ||
          "Password changed successfully."
      );
    } catch (error) {
      console.error(
        "Change password error:",
        error
      );

      showMessage(
        "error",
        error?.message ||
          "Failed to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const handleLogout = () => {
    logoutUser();
    navigate("/");
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <div className="settings-loading">
        <div className="loading-spinner" />
        <p>
          Loading settings...
        </p>

        <style>{styles}</style>
      </div>
    );
  }

  // ==========================================================
  // MAIN
  // ==========================================================

  return (
    <div className="settings-page">
      <style>{styles}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="settings-header">
        <div className="header-left">
          <button
            className="back-btn"
            onClick={() =>
              navigate("/dashboard")
            }
          >
            <ArrowLeft size={19} />

            <span>
              Dashboard
            </span>
          </button>

          <div>
            <h1>Settings</h1>

            <p>
              Manage your profile and account
              settings
            </p>
          </div>
        </div>

        <button
          className="refresh-btn"
          onClick={loadProfile}
          disabled={loading}
        >
          <RefreshCw size={18} />

          <span>
            Refresh
          </span>
        </button>
      </header>

      {/* =====================================================
          MESSAGE
      ===================================================== */}

      {message.text && (
        <div
          className={`message ${
            message.type ===
            "success"
              ? "message-success"
              : "message-error"
          }`}
        >
          {message.type ===
          "success" ? (
            <CheckCircle size={19} />
          ) : (
            <AlertCircle size={19} />
          )}

          <span>
            {message.text}
          </span>

          <button
            type="button"
            onClick={() =>
              setMessage({
                type: "",
                text: "",
              })
            }
          >
            <X size={17} />
          </button>
        </div>
      )}

      <main className="settings-content">
        {/* ===================================================
            PERSONAL INFORMATION
        =================================================== */}

        <section className="settings-card">
          <div className="card-header">
            <div className="card-title">
              <div className="title-icon">
                <User size={20} />
              </div>

              <div>
                <h2>
                  Personal Information
                </h2>

                <p>
                  Update your personal details
                </p>
              </div>
            </div>

            {!editMode ? (
              <button
                className="edit-btn"
                onClick={() => {
                  setEditMode(true);

                  setMessage({
                    type: "",
                    text: "",
                  });
                }}
              >
                <Edit3 size={17} />

                Edit Profile
              </button>
            ) : (
              <div className="action-buttons">
                <button
                  className="cancel-btn"
                  onClick={
                    handleCancelEdit
                  }
                  disabled={saving}
                >
                  <X size={17} />

                  Cancel
                </button>

                <button
                  className="save-btn"
                  onClick={
                    handleSaveProfile
                  }
                  disabled={saving}
                >
                  <Save size={17} />

                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          <div className="profile-grid">
            {/* FIRST NAME */}

            <div className="field">
              <label>
                First Name
              </label>

              {editMode ? (
                <input
                  type="text"
                  name="firstName"
                  value={
                    form.firstName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter first name"
                />
              ) : (
                <div className="field-value">
                  <User size={17} />

                  {student?.user
                    ?.firstName ||
                    "Not provided"}
                </div>
              )}
            </div>

            {/* LAST NAME */}

            <div className="field">
              <label>
                Last Name
              </label>

              {editMode ? (
                <input
                  type="text"
                  name="lastName"
                  value={
                    form.lastName
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter last name"
                />
              ) : (
                <div className="field-value">
                  <User size={17} />

                  {student?.user
                    ?.lastName ||
                    "Not provided"}
                </div>
              )}
            </div>

            {/* EMAIL */}

            <div className="field">
              <label>
                Email Address
              </label>

              <div className="field-value readonly">
                <Mail size={17} />

                {student?.user
                  ?.email ||
                  "Not provided"}
              </div>

              <small>
                Email cannot be changed here.
              </small>
            </div>

            {/* PHONE */}

            <div className="field">
              <label>
                Phone Number
              </label>

              {editMode ? (
                <input
                  type="tel"
                  name="phone"
                  value={
                    form.phone
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Enter phone number"
                />
              ) : (
                <div className="field-value">
                  <Phone size={17} />

                  {student?.phone ||
                    "Not provided"}
                </div>
              )}
            </div>

            {/* DATE OF BIRTH */}

            <div className="field">
              <label>
                Date of Birth
              </label>

              {editMode ? (
                <input
                  type="date"
                  name="dateOfBirth"
                  value={
                    form.dateOfBirth
                  }
                  onChange={
                    handleChange
                  }
                />
              ) : (
                <div className="field-value">
                  <Calendar size={17} />

                  {student?.dateOfBirth
                    ? new Date(
                        student.dateOfBirth
                      ).toLocaleDateString(
                        "en-IN"
                      )
                    : "Not provided"}
                </div>
              )}
            </div>

            {/* ENROLLMENT NUMBER */}

            <div className="field">
              <label>
                Enrollment Number
              </label>

              <div className="field-value readonly">
                <Hash size={17} />

                {student
                  ?.enrollmentNumber ||
                  "Not provided"}
              </div>

              <small>
                Enrollment number cannot be
                changed here.
              </small>
            </div>
          </div>
        </section>

        {/* ===================================================
            ACADEMIC INFORMATION
        =================================================== */}

        <section className="settings-card">
          <div className="card-header">
            <div className="card-title">
              <div className="title-icon">
                <GraduationCap size={20} />
              </div>

              <div>
                <h2>
                  Academic Information
                </h2>

                <p>
                  Your current academic details
                </p>
              </div>
            </div>
          </div>

          <div className="profile-grid">
            {/* DEPARTMENT */}

            <div className="field">
              <label>
                Department
              </label>

              <div className="field-value readonly">
                <Building2 size={17} />

                {student
                  ?.departmentRel
                  ?.name ||
                  student
                    ?.department
                    ?.name ||
                  "Not available"}
              </div>
            </div>

            {/* PROGRAM */}

            <div className="field">
              <label>
                Program
              </label>

              <div className="field-value readonly">
                <BookOpen size={17} />

                {student
                  ?.programRel
                  ?.name ||
                  student
                    ?.program
                    ?.name ||
                  "Not available"}
              </div>
            </div>

            {/* SEMESTER */}

            <div className="field">
              <label>
                Semester
              </label>

              <div className="field-value readonly">
                <GraduationCap size={17} />

                {student?.semester
                  ? `Semester ${student.semester}`
                  : "Not available"}
              </div>
            </div>

            {/* ADMISSION YEAR */}

            <div className="field">
              <label>
                Admission Year
              </label>

              <div className="field-value readonly">
                <Calendar size={17} />

                {student
                  ?.admissionYear ||
                  "Not available"}
              </div>
            </div>

            {/* BATCH */}

            <div className="field">
              <label>
                Batch
              </label>

              {editMode ? (
                <select
                  name="batch"
                  value={
                    form.batch
                  }
                  onChange={
                    handleChange
                  }
                >
                  <option value="">
                    Select Batch
                  </option>

                  <option value="1">
                    Batch 1
                  </option>

                  <option value="2">
                    Batch 2
                  </option>

                  <option value="3">
                    Batch 3
                  </option>
                </select>
              ) : (
                <div className="field-value">
                  <Hash size={17} />

                  {student?.batch
                    ? `Batch ${student.batch}`
                    : "Not provided"}
                </div>
              )}
            </div>

            {/* DIVISION */}

            <div className="field">
              <label>
                Division
              </label>

              {editMode ? (
                <input
                  type="text"
                  name="division"
                  value={
                    form.division
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="Example: A"
                />
              ) : (
                <div className="field-value">
                  <Hash size={17} />

                  {student?.division ||
                    "Not provided"}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ===================================================
            SECURITY
        =================================================== */}

        <section className="settings-card">
          <div className="card-header">
            <div className="card-title">
              <div className="title-icon">
                <Lock size={20} />
              </div>

              <div>
                <h2>
                  Security
                </h2>

                <p>
                  Manage your account password
                </p>
              </div>
            </div>

            {!showPasswordForm && (
              <button
                className="edit-btn"
                onClick={() => {
                  setShowPasswordForm(
                    true
                  );

                  setMessage({
                    type: "",
                    text: "",
                  });
                }}
              >
                <Lock size={17} />

                Change Password
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form
              className="password-form"
              onSubmit={
                handleChangePassword
              }
            >
              <PasswordInput
                label="Current Password"
                name="currentPassword"
                value={
                  passwordForm.currentPassword
                }
                show={
                  showPasswords.current
                }
                onChange={
                  handlePasswordChange
                }
                onToggle={() =>
                  setShowPasswords(
                    (previous) => ({
                      ...previous,
                      current:
                        !previous.current,
                    })
                  )
                }
              />

              <PasswordInput
                label="New Password"
                name="newPassword"
                value={
                  passwordForm.newPassword
                }
                show={
                  showPasswords.new
                }
                onChange={
                  handlePasswordChange
                }
                onToggle={() =>
                  setShowPasswords(
                    (previous) => ({
                      ...previous,
                      new:
                        !previous.new,
                    })
                  )
                }
              />

              <PasswordInput
                label="Confirm New Password"
                name="confirmPassword"
                value={
                  passwordForm.confirmPassword
                }
                show={
                  showPasswords.confirm
                }
                onChange={
                  handlePasswordChange
                }
                onToggle={() =>
                  setShowPasswords(
                    (previous) => ({
                      ...previous,
                      confirm:
                        !previous.confirm,
                    })
                  )
                }
              />

              <div className="password-actions">
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => {
                    setShowPasswordForm(
                      false
                    );

                    setPasswordForm({
                      currentPassword:
                        "",
                      newPassword: "",
                      confirmPassword:
                        "",
                    });

                    setShowPasswords({
                      current: false,
                      new: false,
                      confirm: false,
                    });
                  }}
                  disabled={
                    changingPassword
                  }
                >
                  <X size={17} />

                  Cancel
                </button>

                <button
                  type="submit"
                  className="save-btn"
                  disabled={
                    changingPassword
                  }
                >
                  <Lock size={17} />

                  {changingPassword
                    ? "Changing..."
                    : "Change Password"}
                </button>
              </div>

              <div className="password-hint">
                Password must contain at least
                8 characters.
              </div>
            </form>
          )}
        </section>

        {/* ===================================================
            ACCOUNT
        =================================================== */}

        <section className="settings-card account-card">
          <div className="account-info">
            <div className="title-icon">
              <User size={20} />
            </div>

            <div>
              <h2>
                Account
              </h2>

              <p>
                Logged in as{" "}
                <strong>
                  {student?.user
                    ?.email ||
                    "Student"}
                </strong>
              </p>
            </div>
          </div>

          <button
            className="logout-btn"
            onClick={
              handleLogout
            }
          >
            <LogOut size={17} />

            Logout
          </button>
        </section>
      </main>
    </div>
  );
};

// ============================================================
// PASSWORD INPUT COMPONENT
// ============================================================

const PasswordInput = ({
  label,
  name,
  value,
  show,
  onChange,
  onToggle,
}) => {
  return (
    <div className="password-field">
      <label>
        {label}
      </label>

      <div className="password-input-wrapper">
        <Lock size={17} />

        <input
          type={
            show
              ? "text"
              : "password"
          }
          name={name}
          value={value}
          onChange={onChange}
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete="off"
        />

        <button
          type="button"
          onClick={onToggle}
          className="eye-btn"
        >
          {show ? (
            <EyeOff size={18} />
          ) : (
            <Eye size={18} />
          )}
        </button>
      </div>
    </div>
  );
};

// ============================================================
// STYLES
// ============================================================

const styles = `
* {
  box-sizing: border-box;
}

.settings-page {
  min-height: 100vh;
  background: #f5f7fb;
  color: #172033;
  padding-bottom: 40px;
}

.settings-header {
  background: #ffffff;
  border-bottom: 1px solid #e7ebf2;
  padding: 20px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 22px;
}

.header-left h1 {
  margin: 0;
  font-size: 27px;
  font-weight: 750;
}

.header-left p {
  margin: 5px 0 0;
  color: #6b7280;
  font-size: 14px;
}

.back-btn,
.refresh-btn,
.edit-btn,
.cancel-btn,
.save-btn,
.logout-btn {
  border: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 650;
  transition: 0.2s ease;
}

.back-btn {
  background: #f1f4f9;
  color: #344054;
  padding: 10px 14px;
  border-radius: 10px;
}

.back-btn:hover,
.refresh-btn:hover {
  background: #e8edf5;
}

.refresh-btn {
  background: #f1f4f9;
  color: #344054;
  padding: 10px 15px;
  border-radius: 10px;
}

.settings-content {
  width: min(1180px, calc(100% - 40px));
  margin: 28px auto;
  display: grid;
  gap: 22px;
}

.settings-card {
  background: #ffffff;
  border: 1px solid #e7ebf2;
  border-radius: 18px;
  padding: 25px;
  box-shadow: 0 8px 28px rgba(20, 30, 50, 0.045);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
}

.card-title,
.account-info {
  display: flex;
  align-items: center;
  gap: 13px;
}

.title-icon {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: #edf4ff;
  color: #1769ff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-title h2,
.account-info h2 {
  margin: 0;
  font-size: 18px;
}

.card-title p,
.account-info p {
  margin: 4px 0 0;
  color: #788294;
  font-size: 13px;
}

.edit-btn {
  background: #edf4ff;
  color: #1769ff;
  padding: 10px 15px;
  border-radius: 10px;
}

.edit-btn:hover {
  background: #dfeaff;
}

.action-buttons,
.password-actions {
  display: flex;
  gap: 9px;
}

.cancel-btn {
  background: #f1f3f6;
  color: #475467;
  padding: 10px 14px;
  border-radius: 10px;
}

.cancel-btn:hover {
  background: #e7e9ed;
}

.save-btn {
  background: #1769ff;
  color: #ffffff;
  padding: 10px 15px;
  border-radius: 10px;
}

.save-btn:hover {
  background: #0d5ce0;
}

.save-btn:disabled,
.cancel-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.field,
.password-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field label,
.password-field label {
  font-size: 13px;
  color: #667085;
  font-weight: 650;
}

.field input,
.field select,
.password-input-wrapper input {
  width: 100%;
  border: 1px solid #d9dee8;
  border-radius: 10px;
  padding: 11px 13px;
  outline: none;
  background: #ffffff;
  color: #172033;
  font-size: 14px;
  transition: 0.2s ease;
}

.field input:focus,
.field select:focus,
.password-input-wrapper:focus-within {
  border-color: #1769ff;
  box-shadow: 0 0 0 3px rgba(23, 105, 255, 0.08);
}

.field-value {
  min-height: 42px;
  padding: 11px 13px;
  border-radius: 10px;
  background: #f8f9fc;
  border: 1px solid #e5e8ef;
  color: #273142;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 14px;
}

.field-value svg {
  color: #1769ff;
  flex-shrink: 0;
}

.field-value.readonly {
  color: #667085;
}

.field small {
  color: #98a2b3;
  font-size: 11px;
}

.password-form {
  display: grid;
  gap: 18px;
  max-width: 600px;
}

.password-input-wrapper {
  display: flex;
  align-items: center;
  gap: 9px;
  border: 1px solid #d9dee8;
  border-radius: 10px;
  padding: 0 11px;
  background: #ffffff;
  transition: 0.2s ease;
}

.password-input-wrapper > svg {
  color: #7b8494;
  flex-shrink: 0;
}

.password-input-wrapper input {
  border: 0;
  box-shadow: none;
  padding: 11px 4px;
}

.password-input-wrapper input:focus {
  box-shadow: none;
}

.eye-btn {
  border: 0;
  background: transparent;
  color: #667085;
  cursor: pointer;
  display: flex;
  padding: 4px;
}

.password-hint {
  font-size: 12px;
  color: #7a8494;
}

.account-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.logout-btn {
  background: #fff1f1;
  color: #d92d20;
  padding: 10px 15px;
  border-radius: 10px;
}

.logout-btn:hover {
  background: #ffe3e3;
}

.message {
  width: min(1180px, calc(100% - 40px));
  margin: 20px auto 0;
  padding: 13px 15px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
}

.message button {
  margin-left: auto;
  border: 0;
  background: transparent;
  cursor: pointer;
  display: flex;
}

.message-success {
  background: #ecfdf3;
  color: #067647;
  border: 1px solid #abefc6;
}

.message-error {
  background: #fef3f2;
  color: #b42318;
  border: 1px solid #fecdca;
}

.settings-loading {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f5f7fb;
  color: #667085;
}

.loading-spinner {
  width: 35px;
  height: 35px;
  border: 3px solid #dce5f3;
  border-top-color: #1769ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .settings-header {
    padding: 18px;
    align-items: flex-start;
  }

  .header-left {
    align-items: flex-start;
    gap: 12px;
  }

  .header-left h1 {
    font-size: 22px;
  }

  .back-btn span,
  .refresh-btn span {
    display: none;
  }

  .back-btn {
    padding: 10px;
  }

  .refresh-btn {
    padding: 10px;
  }

  .settings-content {
    width: calc(100% - 24px);
    margin: 18px auto;
  }

  .settings-card {
    padding: 18px;
  }

  .card-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .profile-grid {
    grid-template-columns: 1fr;
  }

  .action-buttons {
    width: 100%;
  }

  .action-buttons button {
    flex: 1;
  }

  .account-card {
    align-items: flex-start;
    flex-direction: column;
  }

  .logout-btn {
    width: 100%;
  }

  .message {
    width: calc(100% - 24px);
  }
}

@media (max-width: 480px) {
  .settings-header {
    gap: 10px;
  }

  .header-left p {
    font-size: 12px;
  }

  .card-title h2 {
    font-size: 16px;
  }

  .password-actions {
    flex-direction: column;
  }

  .password-actions button {
    width: 100%;
  }
}
`;

export default Settings;