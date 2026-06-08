import { useState } from "react";

import { notifyError, notifySuccess } from "../../utils/notify";
import { profileSchema } from "../../utils/validation";
import { useAuth } from "../hooks/useAuth";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  const [form, setForm] = useState({
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    avatarUrl: user?.avatarUrl ?? "",
    address: user?.address ?? "",
    bio: user?.bio ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState(null);
  const [shouldRemoveAvatar, setShouldRemoveAvatar] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setIsSaving(true);
      profileSchema.parse(form);
      await updateProfile({
        ...form,
        avatarFile,
        removeAvatar: shouldRemoveAvatar,
      });
      setAvatarFile(null);
      setShouldRemoveAvatar(false);
      notifySuccess("Cập nhật profile thành công.");
    } catch (error) {
      notifyError(error?.message || "Không thể cập nhật profile.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="clean-container clean-page">
      <div className="clean-panel" style={{ maxWidth: 720 }}>
        <div className="clean-page__header">
          <h1>Profile</h1>
          <p className="clean-page__lead">
            Client chỉ giữ session + user tối thiểu, sẵn sàng để thay bằng JWT
            sau này.
          </p>
        </div>
        <form className="clean-form" onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              value={form.name}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, name: event.target.value }))
              }
            />
          </label>
          <div className="clean-form__grid">
            <label>
              Phone
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
              />
            </label>
            <label>
              Avatar URL
              <input
                value={form.avatarUrl}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    avatarUrl: event.target.value,
                  }))
                }
              />
            </label>
          </div>
          <label>
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
          <label>
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
          <label>
            Address
            <input
              value={form.address}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, address: event.target.value }))
              }
            />
          </label>
          <label>
            Bio
            <textarea
              value={form.bio}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, bio: event.target.value }))
              }
            />
          </label>
          <button type="submit" className="clean-button" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save profile"}
          </button>
        </form>
      </div>
    </section>
  );
}
