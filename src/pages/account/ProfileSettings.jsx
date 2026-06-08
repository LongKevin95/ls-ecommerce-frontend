import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { updateMyShop } from "../../api/shopsApi";
import { useAuth } from "../../hooks/useAuth";
import "./ProfileSettings.css";

export default function ProfileSettings() {
  const { user, updateProfile, isAdmin, isVendor } = useAuth();
  const navigate = useNavigate();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState(() => ({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    avatarUrl: user?.avatarUrl ?? "",
    address: user?.address ?? "",
    bio: user?.bio ?? "",
    shopName: user?.shopName ?? "",
  }));
  const [avatarFile, setAvatarFile] = useState(null);
  const [shouldRemoveAvatar, setShouldRemoveAvatar] = useState(false);

  const canUseDashboard = isAdmin || isVendor;
  const backTargetPath = canUseDashboard
    ? isAdmin
      ? "/admin"
      : "/vendor"
    : "/";
  const backTargetLabel = canUseDashboard
    ? "Back to dashboard"
    : "Back to home";

  const roleLabel = useMemo(() => {
    if (Array.isArray(user?.roles) && user.roles.length > 0) {
      return user.roles.join(", ");
    }

    return "user";
  }, [user?.roles]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSaving(true);

      await updateProfile({
        name: form.name,
        phone: isAdmin ? undefined : form.phone,
        avatarUrl: form.avatarUrl,
        avatarFile,
        removeAvatar: shouldRemoveAvatar,
        address: isAdmin ? undefined : form.address,
        bio: form.bio,
        shopName: isVendor ? form.shopName : "",
      });

      if (isVendor && String(form.shopName ?? "").trim()) {
        await updateMyShop({
          name: form.shopName,
          contactEmail: user?.email ?? "",
          phone: form.phone,
          address: {
            addressLine1: form.address,
            city: "",
            state: "",
            zipCode: "",
            country: "",
          },
        });
      }

      setAvatarFile(null);
      setShouldRemoveAvatar(false);

      window.alert("Cap nhat profile thanh cong.");
    } catch (error) {
      window.alert(error?.message ?? "Khong the cap nhat profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="profile-settings-page o-container">
      <section className="profile-settings-card">
        <header className="profile-settings-header">
          <div>
            <h1>Profile Settings</h1>
            <p>
              Tai khoan: <strong>{user?.email ?? "N/A"}</strong> ({roleLabel})
            </p>
          </div>
          <div className="profile-settings-avatar">
            {form.avatarUrl ? (
              <img src={form.avatarUrl} alt="Profile avatar" />
            ) : (
              <span>
                {String(form.name || user?.email || "U")
                  .charAt(0)
                  .toUpperCase()}
              </span>
            )}
          </div>
        </header>

        <form className="profile-settings-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Your full name"
            />
          </label>

          {!isAdmin && (
            <label>
              Phone
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Phone number"
              />
            </label>
          )}

          <label className="is-full">
            Avatar URL
            <input
              type="text"
              name="avatarUrl"
              value={form.avatarUrl}
              onChange={handleChange}
              placeholder="https://..."
            />
          </label>

          <label className="is-full">
            Avatar file
            <input
              type="file"
              accept="image/*"
              onChange={(event) => {
                setAvatarFile(event.target.files?.[0] ?? null);
                setShouldRemoveAvatar(false);
              }}
            />
          </label>

          <label className="is-full">
            <input
              type="checkbox"
              checked={shouldRemoveAvatar}
              onChange={(event) => {
                const isChecked = event.target.checked;
                setShouldRemoveAvatar(isChecked);

                if (isChecked) {
                  setAvatarFile(null);
                }
              }}
            />
            Remove current avatar
          </label>

          {isVendor && (
            <label className="is-full">
              Shop name
              <input
                type="text"
                name="shopName"
                value={form.shopName}
                onChange={handleChange}
                placeholder="Your shop name"
              />
            </label>
          )}

          {!isAdmin && (
            <label className="is-full">
              Address
              <input
                type="text"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Address"
              />
            </label>
          )}

          <label className="is-full">
            Bio
            <textarea
              rows="3"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              placeholder="A short profile description"
            />
          </label>

          <div className="profile-settings-actions is-full">
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save profile"}
            </button>
            <button
              type="button"
              className="profile-settings-back-btn"
              onClick={() => navigate(backTargetPath)}
            >
              {backTargetLabel}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
