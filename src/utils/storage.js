export function readStorageJson(key, fallbackValue) {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    const rawValue = window.localStorage.getItem(key);

    if (!rawValue) {
      return fallbackValue;
    }

    return JSON.parse(rawValue);
  } catch {
    window.localStorage.removeItem(key);
    return fallbackValue;
  }
}

export function writeStorageJson(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

export function removeStorageValue(key) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}

export function readStorageString(key, fallbackValue = "") {
  if (typeof window === "undefined") {
    return fallbackValue;
  }

  try {
    return String(window.localStorage.getItem(key) ?? fallbackValue);
  } catch {
    return fallbackValue;
  }
}

export function writeStorageString(key, value) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, String(value ?? ""));
}
