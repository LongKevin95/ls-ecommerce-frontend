import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../hooks/useAuth";
import "./VendorLayout.css";

const navItems = [
  { label: "Dashboard", path: "/vendor" },
  { label: "Products", path: "/vendor/products" },
  { label: "Orders", path: "/vendor/orders" },
  { label: "Profile", path: "/vendor/profile" },
];

const titleMap = [
  { path: "/vendor/products", title: "Products Management" },
  { path: "/vendor/orders", title: "Orders Management" },
  { path: "/vendor/profile", title: "Profile Management" },
  { path: "/vendor", title: "Dashboard" },
];

function resolveTitle(pathname) {
  const matched = titleMap.find((item) => pathname.startsWith(item.path));
  return matched?.title ?? "Vendor";
}

export default function VendorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const title = resolveTitle(location.pathname);
  const displayName = user?.name || user?.email || "Vendor";
  const avatarLetter = displayName.trim().charAt(0).toUpperCase() || "V";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleGoHomepage = () => {
    navigate("/");
  };

  return (
    <div className="vendor-layout">
      <aside className="vendor-sidebar">
        <div className="vendor-sidebar__brand">
          <span>Vendor Menu</span>
        </div>
        <nav className="vendor-sidebar__nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/vendor"}
              className={({ isActive }) =>
                isActive
                  ? "vendor-sidebar__link is-active"
                  : "vendor-sidebar__link"
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="vendor-sidebar__footer">
          <button
            type="button"
            className="vendor-sidebar__action"
            onClick={handleGoHomepage}
          >
            Home
          </button>
          <button
            type="button"
            className="vendor-sidebar__action vendor-sidebar__action--logout"
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </aside>

      <section className="vendor-main">
        <div className="vendor-main__content">
          <header className="vendor-main__header">
            <h1>{title}</h1>
            <div className="vendor-profile">
              <div className="vendor-profile__meta">
                <span>{displayName}</span>
                <small>Vendor</small>
              </div>
              <div className="vendor-profile__avatar" aria-hidden="true">
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
