"use client";

const DEVICE_STORAGE_KEY = "brito_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") {
    return "server_device";
  }

  try {
    const existing = localStorage.getItem(DEVICE_STORAGE_KEY);
    if (existing) return existing;

    const newId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    localStorage.setItem(DEVICE_STORAGE_KEY, newId);
    return newId;
  } catch {
    return `dev_fallback_${Date.now()}`;
  }
}

export function getFriendlyDeviceName(): string {
  if (typeof window === "undefined" || !navigator?.userAgent) {
    return "Equipo Brito";
  }

  const ua = navigator.userAgent;

  let os = "Dispositivo";
  if (/Windows NT/i.test(ua) || /Windows/i.test(ua)) {
    os = "PC Windows";
  } else if (/iPhone/i.test(ua)) {
    os = "iPhone";
  } else if (/iPad/i.test(ua)) {
    os = "iPad";
  } else if (/Android/i.test(ua)) {
    os = /Mobile/i.test(ua) ? "Teléfono Android" : "Tablet Android";
  } else if (/Macintosh|Mac OS/i.test(ua)) {
    os = "Mac";
  } else if (/Linux/i.test(ua)) {
    os = "Linux";
  }

  let browser = "";
  if (/Edg\//i.test(ua)) {
    browser = "Edge";
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = "Samsung Browser";
  } else if (/OPR\/|Opera/i.test(ua)) {
    browser = "Opera";
  } else if (/CriOS/i.test(ua)) {
    browser = "Chrome";
  } else if (/FxiOS/i.test(ua)) {
    browser = "Firefox";
  } else if (/Chrome\//i.test(ua) && !/Edg/i.test(ua)) {
    browser = "Chrome";
  } else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    browser = "Safari";
  } else if (/Firefox\//i.test(ua)) {
    browser = "Firefox";
  }

  return browser ? `${os} (${browser})` : os;
}
