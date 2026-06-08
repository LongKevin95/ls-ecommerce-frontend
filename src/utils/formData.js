function hasOwnValue(target, key) {
  return Object.prototype.hasOwnProperty.call(target ?? {}, key);
}

function isFileLike(value) {
  return (
    (typeof File !== "undefined" && value instanceof File) ||
    (typeof Blob !== "undefined" && value instanceof Blob)
  );
}

function appendValue(formData, key, value) {
  if (typeof value === "undefined" || value === null) {
    return;
  }

  formData.append(key, String(value));
}

export function buildUserProfileFormData(updates = {}) {
  const formData = new FormData();

  ["name", "phone", "avatarUrl", "address", "bio"].forEach((key) => {
    if (hasOwnValue(updates, key)) {
      appendValue(formData, key, updates[key]);
    }
  });

  if (updates.avatarFile && isFileLike(updates.avatarFile)) {
    formData.append("avatar", updates.avatarFile);
  }

  if (updates.removeAvatar) {
    formData.append("removeAvatar", "true");
  }

  return formData;
}

export function buildShopFormData(updates = {}) {
  const formData = new FormData();

  [
    "name",
    "description",
    "logo",
    "banner",
    "contactEmail",
    "phone",
    "status",
  ].forEach((key) => {
    if (hasOwnValue(updates, key)) {
      appendValue(formData, key, updates[key]);
    }
  });

  if (hasOwnValue(updates, "address")) {
    const addressValue =
      updates.address && typeof updates.address === "object"
        ? JSON.stringify(updates.address)
        : updates.address;
    appendValue(formData, "address", addressValue);
  }

  if (updates.logoFile && isFileLike(updates.logoFile)) {
    formData.append("logo", updates.logoFile);
  }

  if (updates.bannerFile && isFileLike(updates.bannerFile)) {
    formData.append("banner", updates.bannerFile);
  }

  if (updates.removeLogo) {
    formData.append("removeLogo", "true");
  }

  if (updates.removeBanner) {
    formData.append("removeBanner", "true");
  }

  return formData;
}

export function buildProductFormData(payload = {}) {
  const formData = new FormData();

  [
    "title",
    "category",
    "description",
    "price",
    "oldPrice",
    "stock",
    "thumbnail",
    "status",
  ].forEach((key) => {
    if (hasOwnValue(payload, key)) {
      appendValue(formData, key, payload[key]);
    }
  });

  if (payload.thumbnailFile && isFileLike(payload.thumbnailFile)) {
    formData.append("thumbnail", payload.thumbnailFile);
  }

  if (Array.isArray(payload.galleryFiles) && payload.galleryFiles.length > 0) {
    payload.galleryFiles.forEach((file) => {
      if (isFileLike(file)) {
        formData.append("gallery", file);
      }
    });
  } else if (hasOwnValue(payload, "gallery")) {
    const gallery = Array.isArray(payload.gallery) ? payload.gallery : [];
    formData.append("gallery", JSON.stringify(gallery));
  }

  if (payload.removeThumbnail) {
    formData.append("removeThumbnail", "true");
  }

  if (payload.replaceGallery) {
    formData.append("replaceGallery", "true");
  }

  if (hasOwnValue(payload, "attributes")) {
    formData.append(
      "attributes",
      JSON.stringify(
        payload.attributes && typeof payload.attributes === "object"
          ? payload.attributes
          : {},
      ),
    );
  }

  if (hasOwnValue(payload, "colors")) {
    formData.append(
      "colors",
      JSON.stringify(Array.isArray(payload.colors) ? payload.colors : []),
    );
  }

  if (hasOwnValue(payload, "sizes")) {
    formData.append(
      "sizes",
      JSON.stringify(Array.isArray(payload.sizes) ? payload.sizes : []),
    );
  }

  if (hasOwnValue(payload, "variants")) {
    formData.append(
      "variants",
      JSON.stringify(Array.isArray(payload.variants) ? payload.variants : []),
    );
  }

  return formData;
}
