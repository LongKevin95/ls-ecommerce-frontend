import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { notifyError, notifySuccess } from "../../utils/notify";
import { useAuth } from "../hooks/useAuth";

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      await signup(form);
      notifySuccess("Tạo tài khoản thành công.");
      navigate("/", { replace: true });
    } catch (error) {
      notifyError(error?.message || "Không thể tạo tài khoản.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="clean-container clean-page">
      <div className="clean-panel" style={{ maxWidth: 520, margin: "0 auto" }}>
        <div className="clean-page__header">
          <h1>Sign up</h1>
          <p className="clean-page__lead">Signup demo customer account để test flow checkout tối giản.</p>
        </div>
        <form className="clean-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
          <label>
            Email
            <input type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
          </label>
          <label>
            Password
            <input type="password" value={form.password} onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))} />
          </label>
          <button type="submit" className="clean-button" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create account"}
          </button>
          <p className="clean-muted">
            Đã có tài khoản? <Link to="/login">Login</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
