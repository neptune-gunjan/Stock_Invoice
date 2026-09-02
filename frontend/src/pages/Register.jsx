import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Auth.css";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    business_name: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleChange(e) {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setSuccess("");

    if (!formData.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!formData.business_name.trim()) {
      setError("Please enter your business name.");
      return;
    }

    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!formData.password) {
      setError("Please create a password.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    try {
      setLoading(true);

      await api.post("/auth/register", {
        name: formData.name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        business_name: formData.business_name.trim(),
      });

      setSuccess(
        "Account created successfully! Redirecting..."
      );

      setTimeout(() => {
        navigate("/login");
      }, 1200);

    } catch (err) {
      console.error("Registration failed:", err);

      setError(
        err.response?.data?.detail ||
          "Unable to create your account."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">

      {/* LEFT BRAND PANEL */}
      <div className="auth-brand-panel">
        <div className="brand-content">

          <div className="brand-logo">
            <div className="logo-icon">SI</div>
            <span>Stock Invoice</span>
          </div>

          <div className="brand-main">

            <span className="brand-badge">
              START YOUR BUSINESS JOURNEY
            </span>

            <h1>
              Everything your
              <br />
              <span>business needs.</span>
            </h1>

            <p>
              Create your business account and start managing
              inventory, invoices and payments smarter.
            </p>

            <div className="stats-grid">

              <div className="stat-card">
                <strong>01</strong>
                <span>Smart Stock</span>
              </div>

              <div className="stat-card">
                <strong>02</strong>
                <span>Easy Invoices</span>
              </div>

              <div className="stat-card">
                <strong>03</strong>
                <span>Track Payments</span>
              </div>

              <div className="stat-card">
                <strong>04</strong>
                <span>Business Reports</span>
              </div>

            </div>
          </div>

          <div className="brand-footer">
            © 2026 Stock Invoice
          </div>

        </div>
      </div>

      {/* RIGHT FORM */}
      <div className="auth-form-panel">
        <div className="auth-form-container">

          <div className="mobile-logo">
            <div className="logo-icon">SI</div>
            <span>Stock Invoice</span>
          </div>

          <div className="auth-heading">
            <h2>Create your account 🚀</h2>
            <p>Set up your business in less than a minute</p>
          </div>

          {error && (
            <div className="auth-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="auth-success">
              <span>✓</span>
              <p>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="name">
                Your name
              </label>

              <div className="input-wrapper">
                <span className="input-icon">👤</span>

                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Enter your name"
                  autoComplete="name"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="business_name">
                Business name
              </label>

              <div className="input-wrapper">
                <span className="input-icon">🏢</span>

                <input
                  id="business_name"
                  name="business_name"
                  type="text"
                  value={formData.business_name}
                  onChange={handleChange}
                  placeholder="Your business name"
                  autoComplete="organization"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="email">
                Email address
              </label>

              <div className="input-wrapper">
                <span className="input-icon">✉</span>

                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">
                Password
              </label>

              <div className="input-wrapper">
                <span className="input-icon">🔒</span>

                <input
                  id="password"
                  name="password"
                  type={
                    showPassword ? "text" : "password"
                  }
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Minimum 6 characters"
                  autoComplete="new-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword((prev) => !prev)
                  }
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              <div className="password-hint">
                Use at least 6 characters for your password.
              </div>
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <span>→</span>
                </>
              )}
            </button>

          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <div className="auth-switch">
            <span>Already have an account?</span>
            <Link to="/login">
              Login
            </Link>
          </div>

          <p className="terms-note">
            By creating an account, you agree to use Stock Invoice
            responsibly for your business.
          </p>

        </div>
      </div>

    </div>
  );
}

export default Register;

