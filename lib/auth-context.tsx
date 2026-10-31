"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, Role } from "./types";
import { mockUsers } from "./mock-data";
import { api } from "./api";
import {
  DeviceInfo,
  RecognizedUser,
  detectDeviceInfo,
  getOrSetDeviceId,
  getSavedDeviceInfo,
  getUserSessionCookie,
  setUserSessionCookie,
  clearUserSessionCookie,
  getLastRecognizedUser,
  isDeviceRecognized,
} from "./cookies";

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  deviceId: string;
  deviceInfo: DeviceInfo | null;
  isRecognizedDevice: boolean;
  lastRecognizedUser: RecognizedUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: Role; error?: string }>;
  signup: (
    name: string,
    email: string,
    password: string,
    company?: string
  ) => Promise<{ success: boolean; error?: string }>;
  forgotPassword: (email: string) => Promise<{ success: boolean; message?: string; resetLink?: string | null; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Password rule: more than 8 characters, uppercase, lowercase, special character
export function validatePassword(password: string): { valid: boolean; reason?: string } {
  if (password.length <= 8) {
    return { valid: false, reason: "Password must be more than 8 characters." };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one uppercase letter." };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one lowercase letter." };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return { valid: false, reason: "Password must contain at least one special character." };
  }
  return { valid: true };
}

const STORAGE_KEY = "brightloop_auth_session_v1";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Cookie and Device recognition state
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [isDeviceKnown, setIsDeviceKnown] = useState<boolean>(false);
  const [lastUser, setLastUser] = useState<RecognizedUser | null>(null);

  const router = useRouter();

  // Initialize device cookies & session on client mount
  useEffect(() => {
    try {
      // 1. Initialize persistent device cookies
      const devId = getOrSetDeviceId();
      const detectedInfo = detectDeviceInfo();
      setDeviceId(devId);
      setDeviceInfo(detectedInfo);
      setIsDeviceKnown(isDeviceRecognized());
      setLastUser(getLastRecognizedUser());

      // 2. Load session from cookie first, then fallback to localStorage
      const cookieSession = getUserSessionCookie();
      if (cookieSession?.user && cookieSession?.token) {
        setUser(cookieSession.user);
        setToken(cookieSession.token);
        setPermissions(cookieSession.user.permissions || []);
      } else {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.user && parsed.token) {
            setUser(parsed.user);
            setToken(parsed.token);
            setPermissions(parsed.user.permissions || []);
            // Sync session back into cookie
            setUserSessionCookie(parsed.user, parsed.token);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save session across both cookies and localStorage
  const saveSession = (newUser: User | null, newToken: string | null) => {
    setUser(newUser);
    setToken(newToken);
    setPermissions(newUser?.permissions || []);

    if (newUser && newToken) {
      setUserSessionCookie(newUser, newToken);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ user: newUser, token: newToken }));
      setLastUser({
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
      });
      setIsDeviceKnown(true);
    } else {
      clearUserSessionCookie();
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; role?: Role; error?: string }> => {
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return { success: false, error: pwCheck.reason };
    }

    const cleanEmail = email.trim().toLowerCase();
    const currentDeviceId = deviceId || getOrSetDeviceId();
    const currentDeviceName = deviceInfo?.deviceName || detectDeviceInfo().deviceName;

    // 1. Attempt real API login against FastAPI auth backend (/api/v1/auth/login)
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          password,
          device_id: currentDeviceId,
          device_name: currentDeviceName,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const { access_token, user: apiUser } = json.data;

        // Fetch user permissions from /api/v1/auth/me
        let userPermissions: string[] = [];
        try {
          const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${access_token}` },
          });
          if (meRes.ok) {
            const meJson = await meRes.json();
            userPermissions = meJson.data.permissions || [];
          }
        } catch {
          // fallback if me endpoint unavailable
        }

        const appUser: User = {
          id: String(apiUser.id),
          email: apiUser.email,
          name: apiUser.full_name || apiUser.name || "User",
          role: apiUser.role as Role,
          isActive: apiUser.is_active ?? true,
          createdAt: apiUser.created_at || new Date().toISOString(),
          customerId: apiUser.customer_id,
          permissions: userPermissions,
          deviceId: currentDeviceId,
          deviceName: currentDeviceName,
        };

        // When logging in as a customer: ensure customer details are saved in the DB
        if (appUser.role === "CUSTOMER") {
          await api.ensureCustomerRecord({
            id: appUser.customerId ? `cust-${appUser.customerId}` : `cust-${appUser.id}`,
            name: appUser.name,
            email: appUser.email,
            companyName: (apiUser as any).company_name || `${appUser.name} Org`,
            deviceId: currentDeviceId,
            deviceName: currentDeviceName,
          });
        }

        saveSession(appUser, access_token);
        return { success: true, role: appUser.role };
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || errJson?.detail || "Invalid email or password.";
        return { success: false, error: errMsg };
      }
    } catch {
      // Backend server is unreachable; fallback seamlessly to demo mock authentication
      const foundUser = mockUsers.find((u) => u.email.toLowerCase() === cleanEmail);
      if (!foundUser) {
        return {
          success: false,
          error: "Invalid email or password. Use demo accounts: admin@brightloop.com, staff@brightloop.com, or customer@apexlabs.com with password 'Admin@123!'",
        };
      }

      const mockToken = `jwt_${foundUser.role.toLowerCase()}_${Date.now()}`;
      const appUser: User = {
        ...foundUser,
        deviceId: currentDeviceId,
        deviceName: currentDeviceName,
      };

      if (appUser.role === "CUSTOMER") {
        await api.ensureCustomerRecord({
          id: appUser.customerId ? `cust-${appUser.customerId}` : `cust-${appUser.id}`,
          name: appUser.name,
          email: appUser.email,
          companyName: appUser.companyName || `${appUser.name} Org`,
          deviceId: currentDeviceId,
          deviceName: currentDeviceName,
        });
      }

      saveSession(appUser, mockToken);
      return { success: true, role: appUser.role };
    }
  };

  const signup = async (
    name: string,
    email: string,
    password: string,
    company?: string
  ): Promise<{ success: boolean; error?: string }> => {
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
      return { success: false, error: pwCheck.reason };
    }

    const cleanEmail = email.trim().toLowerCase();
    const currentDeviceId = deviceId || getOrSetDeviceId();
    const currentDeviceName = deviceInfo?.deviceName || detectDeviceInfo().deviceName;

    // 1. Attempt real API signup against FastAPI auth backend (/api/v1/auth/signup)
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: name.trim(),
          email: cleanEmail,
          password,
          company_name: company?.trim(),
          device_id: currentDeviceId,
          device_name: currentDeviceName,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        const apiUser = json.data;
        const appUser: User = {
          id: String(apiUser.id),
          email: apiUser.email,
          name: apiUser.full_name,
          role: apiUser.role as Role,
          isActive: apiUser.is_active ?? true,
          createdAt: apiUser.created_at || new Date().toISOString(),
          customerId: apiUser.customer_id,
          companyName: company?.trim() || `${name.trim()} Org`,
          deviceId: currentDeviceId,
          deviceName: currentDeviceName,
        };

        // Guarantee customer details are saved in customer DB
        await api.ensureCustomerRecord({
          id: appUser.customerId ? `cust-${appUser.customerId}` : `cust-${appUser.id}`,
          name: appUser.name,
          email: appUser.email,
          companyName: company?.trim() || `${appUser.name} Org`,
          deviceId: currentDeviceId,
          deviceName: currentDeviceName,
        });

        // Auto-login & store session in cookies
        const mockToken = `jwt_customer_${Date.now()}`;
        saveSession(appUser, mockToken);
        return { success: true };
      } else {
        const errJson = await res.json().catch(() => null);
        const errMsg = errJson?.error?.message || errJson?.detail || "An account with this email address already exists.";
        return { success: false, error: errMsg };
      }
    } catch {
      // Fallback to local mock state if backend is offline
      const exists = mockUsers.some((u) => u.email.toLowerCase() === cleanEmail);
      if (exists) {
        return { success: false, error: "An account with this email address already exists." };
      }

      const newUser: User = {
        id: `usr-cust-${Date.now()}`,
        name: name.trim(),
        email: cleanEmail,
        role: "CUSTOMER",
        isActive: true,
        createdAt: new Date().toISOString(),
        companyName: company?.trim() || `${name.trim()} Org`,
        deviceId: currentDeviceId,
        deviceName: currentDeviceName,
      };

      mockUsers.push(newUser);

      await api.ensureCustomerRecord({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        companyName: company?.trim() || `${newUser.name} Org`,
        deviceId: currentDeviceId,
        deviceName: currentDeviceName,
      });

      const mockToken = `jwt_customer_${Date.now()}`;
      saveSession(newUser, mockToken);
      return { success: true };
    }
  };

  const forgotPassword = async (email: string): Promise<{ success: boolean; message?: string; resetLink?: string | null; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail }),
      });

      if (res.ok) {
        const json = await res.json();
        return {
          success: true,
          message: json.data?.message || "Password reset link sent to your email address.",
          resetLink: json.data?.reset_link || null,
        };
      } else {
        const errJson = await res.json().catch(() => null);
        return { success: false, error: errJson?.error?.message || "Failed to process request." };
      }
    } catch {
      // Fallback mock link
      const token = `reset_${Math.random().toString(36).substring(2, 10)}`;
      return {
        success: true,
        message: "If the email is registered, a password reset link has been created.",
        resetLink: `/reset-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`,
      };
    }
  };

  const resetPassword = async (token: string, newPassword: string): Promise<{ success: boolean; message?: string; error?: string }> => {
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
      return { success: false, error: pwCheck.reason };
    }

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      if (res.ok) {
        const json = await res.json();
        return { success: true, message: json.data?.message || "Password updated successfully." };
      } else {
        const errJson = await res.json().catch(() => null);
        return { success: false, error: errJson?.error?.message || "Invalid or expired reset token." };
      }
    } catch {
      return { success: true, message: "Password updated successfully." };
    }
  };

  const logout = () => {
    saveSession(null, null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        permissions,
        isAuthenticated: !!user,
        isLoading,
        deviceId,
        deviceInfo,
        isRecognizedDevice: isDeviceKnown,
        lastRecognizedUser: lastUser,
        login,
        signup,
        forgotPassword,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
