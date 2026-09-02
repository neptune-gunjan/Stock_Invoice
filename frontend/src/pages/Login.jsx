import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(event) {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/auth/login", {
        email,
        password,
      });

      const data = response.data;

      localStorage.setItem(
        "access_token",
        data.access_token
      );

      localStorage.setItem(
        "user",
        JSON.stringify(data.user)
      );

      navigate("/dashboard");

    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Invalid email or password."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">

      <div className="login-card">

        <h1>Stock & Invoice</h1>

        <p>
          Login to manage your business
        </p>

        <form onSubmit={handleLogin}>

          <label>Email</label>

          <input
            type="email"
            value={email}
            onChange={(event) =>
              setEmail(event.target.value)
            }
            placeholder="Enter your email"
            required
          />

          <label>Password</label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(event.target.value)
            }
            placeholder="Enter your password"
            required
          />

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="primary-button"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

        </form>

      </div>

    </div>
  );
}
