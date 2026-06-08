import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <section className="clean-container clean-page">
      <div className="clean-empty">
        <h1>404</h1>
        <p>Trang bạn tìm không tồn tại.</p>
        <Link to="/" className="clean-link-btn">
          Back home
        </Link>
      </div>
    </section>
  );
}
