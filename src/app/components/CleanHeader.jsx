import { Link, NavLink, useNavigate } from "react-router-dom";

import logo from "../../assets/Images/logo.png";
import { USER_ROLES } from "../../constants/roles";
import { useAuth } from "../hooks/useAuth";
import { useCart } from "../hooks/useCart";
import { useWishlist } from "../hooks/useWishlist";
import "../styles/clean-app.css";

export default function CleanHeader() {
  const navigate = useNavigate();
  const { user, isAdmin, isVendor, logout } = useAuth();
  const { totalItems } = useCart();
  const { totalItems: wishlistTotal } = useWishlist();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="clean-header">
      <div className="clean-container clean-header__inner">
        <Link to="/" className="clean-brand">
          <img src={logo} alt="L&S" />
          <div>
            <strong>L&S Ecommerce</strong>
            <small>Frontend clean baseline</small>
          </div>
        </Link>

        <nav className="clean-nav">
          <NavLink to="/">Home</NavLink>
          <NavLink to="/cart">Cart ({totalItems})</NavLink>
          <NavLink to="/wishlist">Wishlist ({wishlistTotal})</NavLink>
          {user ? <NavLink to="/profile">Profile</NavLink> : null}
          {user ? <NavLink to="/my-orders">My Orders</NavLink> : null}
          {isVendor ? <NavLink to="/vendor">Vendor</NavLink> : null}
          {isAdmin ? <NavLink to="/admin">Admin</NavLink> : null}
        </nav>

        <div className="clean-header__actions">
          {user ? (
            <>
              <div className="clean-user-chip">
                <strong>{user.name}</strong>
                <small>{user.roles?.join(", ") || USER_ROLES.CUSTOMER}</small>
              </div>
              <button type="button" className="clean-button clean-button--ghost" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="clean-button clean-button--ghost">
                Login
              </Link>
              <Link to="/signup" className="clean-button">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
