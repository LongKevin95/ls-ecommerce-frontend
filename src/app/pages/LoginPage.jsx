import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { notifyError, notifySuccess } from "../../utils/notify";
import { loginSchema } from "../../utils/validation";
import { useAuth } from "../hooks/useAuth";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "customer@ls.com", password: "123456" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTarget = location.state?.from || "/";

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      loginSchema.parse(form);
      await login(form);
      notifySuccess("Đăng nhập thành công.");
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      notifyError(error?.message || "Không thể đăng nhập.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="clean-container clean-page">
      <div className="clean-panel" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="clean-page__header">
          <h1>Login</h1>
          <p className="clean-page__lead">Demo accounts: admin@ls.com / customer@ls.com / vendor@ls.com - password `123456`.</p>
        </div>
        <form className="clean-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            />
          </label>
          <button type="submit" className="clean-button" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
          <p className="clean-muted">
            Chưa có tài khoản? <Link to="/signup">Sign up</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
