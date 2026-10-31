// Cookie and Device Recognition System for Brightloop
// Manages device fingerprinting, persistent device identification, and user session cookies.

export interface DeviceInfo {
  deviceId: string;
  deviceName: string;
  browser: string;
  os: string;
  deviceType: "Desktop" | "Mobile" | "Tablet";
  firstSeen: string;
  lastSeen: string;
}

export interface RecognizedUser {
  id?: string;
  email: string;
  name: string;
  role: string;
}

export interface StoredSession {
  user: any;
  token: string;
}

export const COOKIE_KEYS = {
  DEVICE_ID: "bl_device_id",
  DEVICE_INFO: "bl_device_info",
  USER_SESSION: "bl_user_session",
  LAST_USER: "bl_last_user",
  DEVICE_RECOGNIZED: "bl_device_recognized",
};

/**
 * Read cookie value by name in browser context.
 */
export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(^|;\\s*)(" + name + ")=([^;]*)"));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Write a cookie with path, max-age, and SameSite attribute.
 */
export function setCookie(name: string, value: string, days: number = 30): void {
  if (typeof document === "undefined") return;
  const maxAge = days * 24 * 60 * 60;
  const secure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

/**
 * Remove a cookie by setting expired max-age.
 */
export function deleteCookie(name: string): void {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Parse client browser and OS from userAgent string.
 */
function parseClientEnvironment(): { browser: string; os: string; deviceType: "Desktop" | "Mobile" | "Tablet" } {
  if (typeof navigator === "undefined") {
    return { browser: "Browser", os: "System", deviceType: "Desktop" };
  }

  const ua = navigator.userAgent;

  // Operating System
  let os = "Unknown OS";
  if (/Windows NT 10.0/i.test(ua)) os = "Windows 10/11";
  else if (/Windows/i.test(ua)) os = "Windows";
  else if (/Macintosh|Mac OS X/i.test(ua)) os = "macOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  // Browser
  let browser = "Web Browser";
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge";
  else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) browser = "Google Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Mozilla Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) browser = "Apple Safari";
  else if (/Opera|OPR\//i.test(ua)) browser = "Opera";

  // Device Type
  let deviceType: "Desktop" | "Mobile" | "Tablet" = "Desktop";
  if (/iPad|Tablet/i.test(ua) || (navigator.maxTouchPoints && navigator.maxTouchPoints > 2 && /Macintosh/.test(ua))) {
    deviceType = "Tablet";
  } else if (/Mobile|Android|iPhone/i.test(ua)) {
    deviceType = "Mobile";
  }

  return { browser, os, deviceType };
}

/**
 * Retrieve or generate a persistent device identifier.
 */
export function getOrSetDeviceId(): string {
  let deviceId = getCookie(COOKIE_KEYS.DEVICE_ID);
  if (!deviceId) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      deviceId = `dev_${crypto.randomUUID()}`;
    } else {
      deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    }
    setCookie(COOKIE_KEYS.DEVICE_ID, deviceId, 365);
    setCookie(COOKIE_KEYS.DEVICE_RECOGNIZED, "true", 365);
  }
  return deviceId;
}

/**
 * Detect client device details, storing them in cookies.
 */
export function detectDeviceInfo(): DeviceInfo {
  const deviceId = getOrSetDeviceId();
  const env = parseClientEnvironment();
  const existingRaw = getCookie(COOKIE_KEYS.DEVICE_INFO);

  let firstSeen = new Date().toISOString();
  if (existingRaw) {
    try {
      const parsed = JSON.parse(existingRaw);
      if (parsed.firstSeen) firstSeen = parsed.firstSeen;
    } catch {
      // ignore
    }
  }

  const deviceName = `${env.os} (${env.browser})`;
  const info: DeviceInfo = {
    deviceId,
    deviceName,
    browser: env.browser,
    os: env.os,
    deviceType: env.deviceType,
    firstSeen,
    lastSeen: new Date().toISOString(),
  };

  setCookie(COOKIE_KEYS.DEVICE_INFO, JSON.stringify(info), 365);
  setCookie(COOKIE_KEYS.DEVICE_RECOGNIZED, "true", 365);
  return info;
}

/**
 * Save user authentication session in cookies.
 */
export function setUserSessionCookie(user: any, token: string): void {
  const session: StoredSession = { user, token };
  setCookie(COOKIE_KEYS.USER_SESSION, JSON.stringify(session), 30);

  const lastUser: RecognizedUser = {
    id: user.id,
    email: user.email,
    name: user.name || user.full_name || "User",
    role: user.role,
  };
  setCookie(COOKIE_KEYS.LAST_USER, JSON.stringify(lastUser), 180);
  setCookie(COOKIE_KEYS.DEVICE_RECOGNIZED, "true", 365);
}

/**
 * Read active session from cookie.
 */
export function getUserSessionCookie(): StoredSession | null {
  const raw = getCookie(COOKIE_KEYS.USER_SESSION);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Clear user session on logout, while keeping device recognized.
 */
export function clearUserSessionCookie(): void {
  deleteCookie(COOKIE_KEYS.USER_SESSION);
  // bl_device_id, bl_device_info, bl_last_user are intentionally preserved
  // so the device is recognized on next visit.
}

/**
 * Read recognized device information if previously set.
 */
export function getSavedDeviceInfo(): DeviceInfo | null {
  const raw = getCookie(COOKIE_KEYS.DEVICE_INFO);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Read last known user on this device.
 */
export function getLastRecognizedUser(): RecognizedUser | null {
  const raw = getCookie(COOKIE_KEYS.LAST_USER);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Check if the current browser/device is recognized.
 */
export function isDeviceRecognized(): boolean {
  return !!getCookie(COOKIE_KEYS.DEVICE_ID);
}
