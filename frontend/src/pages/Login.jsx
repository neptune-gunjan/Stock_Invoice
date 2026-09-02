
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";
import "./Auth.css";

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

    if (!formData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    if (!formData.password) {
      setError("Please enter your password.");
      return;
    }

    try {
      setLoading(true);

      const response = await api.post("/auth/login", {
        email: formData.email.trim(),
        password: formData.password,
      });

      const accessToken = response.data?.access_token;

      if (!accessToken) {
        throw new Error("Access token was not returned.");
      }

      localStorage.setItem("access_token", accessToken);

      if (response.data?.token_type) {
        localStorage.setItem(
          "token_type",
          response.data.token_type
        );
      }

      navigate("/dashboard");
    } catch (err) {
      console.error("Login failed:", err);

      setError(
        err.response?.data?.detail ||
          err.message ||
          "Invalid email or password."
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
              SMART BUSINESS MANAGEMENT
            </span>

            <h1>
              Manage your stock.
              <br />
              <span>Grow your business.</span>
            </h1>

            <p>
              Manage inventory, create invoices, track payments
              and keep your business organized — all in one place.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-check">✓</span>
                Smart inventory management
              </div>

              <div className="feature-item">
                <span className="feature-check">✓</span>
                Professional invoices
              </div>

              <div className="feature-item">
                <span className="feature-check">✓</span>
                Payment tracking
              </div>

              <div className="feature-item">
                <span className="feature-check">✓</span>
                Business insights
              </div>
            </div>
          </div>

          <div className="brand-footer">
            © 2026 Stock Invoice
          </div>
        </div>
      </div>

      {/* RIGHT FORM PANEL */}
      <div className="auth-form-panel">
        <div className="auth-form-container">

          <div className="mobile-logo">
            <div className="logo-icon">SI</div>
            <span>Stock Invoice</span>
          </div>

          <div className="auth-heading">
            <h2>Welcome back 👋</h2>
            <p>Login to manage your business</p>
          </div>

          {error && (
            <div className="auth-error">
              <span>!</span>
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>

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
              <div className="label-row">
                <label htmlFor="password">
                  Password
                </label>

                <button
                  type="button"
                  className="forgot-link"
                  onClick={() =>
                    setError(
                      "Please contact your administrator to reset your password."
                    )
                  }
                >
                  Forgot password?
                </button>
              </div>

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
                  placeholder="Enter your password"
                  autoComplete="current-password"
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
            </div>

            <button
              type="submit"
              className="auth-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Logging in...
                </>
              ) : (
                <>
                  Login
                  <span>→</span>
                </>
              )}
            </button>

          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <div className="auth-switch">
            <span>Don't have an account?</span>
            <Link to="/register">
              Create account
            </Link>
          </div>

          <p className="security-note">
            🔐 Your business data is securely protected.
          </p>

        </div>
      </div>

    </div>
  );
}

export default Login;

