import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import "./AdminLayout.css";

const navItems = [
  { label: "Dashboard", path: "/admin" },
  { label: "Orders", path: "/admin/orders" },
  { label: "Products", path: "/admin/products" },
  { label: "Accounts", path: "/admin/accounts" },
];

const titleMap = [
  { path: "/admin/orders", title: "Orders Management" },
  { path: "/admin/products", title: "Products Management" },
  { path: "/admin/accounts", title: "Accounts Management" },
  { path: "/admin", title: "Dashboard" },
];

function resolveTitle(pathname) {
  const matched = titleMap.find((item) => pathname.startsWith(item.path));
  return matched?.title ?? "Admin";
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const title = resolveTitle(location.pathname);
  const displayName = user?.name || user?.email || "Admin";
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || "A";
  const roleLabel = user?.roles?.includes("admin") ? "Admin" : "User";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleGoHomepage = () => {
    navigate("/");
  };

  const handleGoProfile = () => {
    navigate("/profile");
  };

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar__brand">
          <span>Menu</span>
        </div>
        <nav className="admin-sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/admin"}
              className={({ isActive }) =>
                isActive
                  ? "admin-sidebar__link is-active"
                  : "admin-sidebar__link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="admin-sidebar__footer">
          <button
            type="button"
            className="admin-sidebar__action"
            onClick={handleGoProfile}
          >
            Profile
          </button>
          <button
            type="button"
            className="admin-sidebar__action"
            onClick={handleGoHomepage}
          >
            Home
          </button>
          <button
            type="button"
            className="admin-sidebar__action admin-sidebar__action--logout"
            onClick={handleLogout}
          >
            <span className="admin-sidebar__icon" aria-hidden="true"></span>
            Log out
          </button>
        </div>
      </aside>

      <section className="admin-main">
        <div className="admin-main__content">
          <header className="admin-main__header">
            <h1>{title}</h1>
            <div className="admin-profile">
              <div className="admin-profile__meta">
                <span>{displayName}</span>
                <small>{roleLabel}</small>
              </div>
              <div className="admin-profile__avatar" aria-hidden="true">
                {avatarLetter}
              </div>
            </div>
          </header>
          <Outlet />
        </div>
      </section>
    </div>
  );
}
