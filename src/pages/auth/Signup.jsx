import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import "./Signup.css";

const defaultFormValues = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function Signup() {
  const { register, user } = useAuth();
  const navigate = useNavigate();
  const [formValues, setFormValues] = useState(defaultFormValues);
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormValues((prevValues) => ({
      ...prevValues,
      [name]: value,
    }));

    if (errorMessage) {
      setErrorMessage("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage("");

    if (formValues.password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (formValues.password !== formValues.confirmPassword) {
      setErrorMessage("Password confirmation does not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        name: formValues.name,
        email: formValues.email,
        password: formValues.password,
      });
      navigate("/");
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Signup was not successful. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card" aria-label="Sign up form">
        <h1 className="auth-title">Create Account</h1>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              autoComplete="name"
              value={formValues.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field email-field mt-14">
            <input
              id="email"
              type="email"
              name="email"
              placeholder="Enter your email..."
              autoComplete="email"
              value={formValues.email}
              onChange={handleChange}
              required
            />
            <p className="field-error" aria-live="polite"></p>
          </div>

          <div className="field password-field">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              autoComplete="new-password"
              minLength={6}
              value={formValues.password}
              onChange={handleChange}
              required
            />
            <button
              className="toggle-pass"
              type="button"
              aria-label="Toggle password visibility"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="field password-field mt-14">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              name="confirmPassword"
              placeholder="Confirm password"
              autoComplete="new-password"
              minLength={6}
              value={formValues.confirmPassword}
              onChange={handleChange}
              required
            />
            <button
              className="toggle-pass"
              type="button"
              aria-label="Toggle confirm password visibility"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
            >
              {showConfirmPassword ? "Hide" : "Show"}
            </button>
          </div>

          <div className="auth-row">
            <label className="checkbox">
              <input type="checkbox" name="remember" />
              <span>Remember Me</span>
            </label>

            <Link className="auth-link" to="/login">
              Already have an account?
            </Link>
          </div>

          {errorMessage && <p className="form-error">{errorMessage}</p>}

          <button className="auth-btn" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Signing Up..." : "Sign Up ->"}
          </button>

          <div className="auth-divider" aria-hidden="true">
            <span>OR</span>
          </div>

          <div className="social-row" aria-label="Sign up with">
            <button className="social-btn social-btn--facebook" type="button">
              <span className="social-icon social-icon--facebook">f</span>
              Facebook
            </button>
            <button className="social-btn social-btn--google" type="button">
              <span className="social-icon social-icon--google">G</span>
              Google
            </button>
          </div>

          <p className="auth-hint">
            By signing up, you agree to our
            <button type="button" className="auth-link">
              Terms
            </button>
            &amp;
            <button type="button" className="auth-link">
              Privacy Policy
            </button>
            .
          </p>

          <p className="auth-switch">
            Da co tai khoan? Hay{" "}
            <Link className="auth-link" to="/login">
              dang nhap ngay!
            </Link>
          </p>
        </form>
      </section>
    </main>
  );
}
