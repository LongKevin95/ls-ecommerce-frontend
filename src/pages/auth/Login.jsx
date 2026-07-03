import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import "./Login.css";

const defaultFormValues = {
  email: "",
  password: "",
};

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const fromLocation = location.state?.from;
  const defaultTarget = user?.roles?.includes("admin") ? "/admin" : "/";
  const redirectTarget = `${fromLocation?.pathname ?? defaultTarget}${fromLocation?.search ?? ""}${fromLocation?.hash ?? ""}`;

  if (user) {
    return <Navigate to={redirectTarget} replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((previousValues) => ({
      ...previousValues,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleLogin = async (event) => {
    event.preventDefault();

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const nextUser = await login(formValues);
      const fallbackTarget = nextUser?.roles?.includes("admin")
        ? "/admin"
        : "/";
      const nextTarget = `${fromLocation?.pathname ?? fallbackTarget}${fromLocation?.search ?? ""}${fromLocation?.hash ?? ""}`;
      navigate(nextTarget, { replace: true });
    } catch (error) {
      setErrorMessage(
        error?.message ??
          "Dang nhap tam thoi chua thanh cong. Vui long thu lai.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="signin-container">
      <form className="signin" onSubmit={handleLogin}>
        <h2 className="signin-title">Sign In</h2>

        <div className="signin-group">
          <input
            type="email"
            name="email"
            placeholder="Email"
            className="signin-input"
            autoComplete="email"
            value={formValues.email}
            onChange={handleChange}
            required
          />
        </div>

        <div className="signin-group signin-group--icon">
          <input
            type={showPassword ? "text" : "password"}
            name="password"
            placeholder="Password"
            className="signin-input"
            autoComplete="current-password"
            value={formValues.password}
            onChange={handleChange}
            required
          />
          <button
            className="signin-eye"
            type="button"
            aria-label="Toggle password visibility"
            onClick={() => setShowPassword((previousValue) => !previousValue)}
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        <div className="signin-options">
          <label className="signin-remember">
            <input type="checkbox" />
            Remember Me
          </label>
          <span className="signin-forgot">Forget Password</span>
        </div>

        {errorMessage && (
          <p className="login-error" role="alert">
            {errorMessage}
          </p>
        )}

        <button type="submit" className="signin-btn" disabled={isSubmitting}>
          {isSubmitting ? "Signing In..." : "Sign In ->"}
        </button>

        <p className="signin-hint">
          Chua co tai khoan? Hay{" "}
          <Link className="signin-hint-link" to="/signup">
            dang ky ngay!
          </Link>
        </p>
      </form>
    </div>
  );
}
