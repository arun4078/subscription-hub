/**
 * Authentication and Session Context
 * Manages current user, 3 roles (ADMIN, STAFF, CUSTOMER), login, signup validation,
 * forgot password mock link generation, and role switching for demo evaluations.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '../services/db';
import { Role, User } from '../types';

interface AuthContextType {
  currentUser: User;
  switchRole: (role: Role) => void;
  switchUser: (userId: string) => void;
  allUsers: User[];
  login: (email: string, password?: string) => { success: boolean; error?: string };
  signup: (params: {
    name: string;
    email: string;
    password: string;
    company_name: string;
    phone?: string;
  }) => { success: boolean; error?: string };
  requestPasswordReset: (email: string) => { success: boolean; resetLink?: string; error?: string };
  logout: () => void;
  validatePassword: (password: string) => { valid: boolean; errors: string[] };
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  // Default to Customer Samantha Reed (Acme Industrial) as requested
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const customer = users.find((u) => u.role === 'CUSTOMER') || users[0];
    return customer;
  });

  const refreshUsers = () => {
    const fresh = db.getUsers();
    setUsers(fresh);
  };

  /**
   * Password Rule (from specification):
   * More than 8 characters, with an uppercase letter, a lowercase letter,
   * and a special character.
   */
  const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];
    if (!password || password.length <= 8) {
      errors.push('Password must be more than 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Must contain at least one uppercase letter (A-Z)');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Must contain at least one lowercase letter (a-z)');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('Must contain at least one special character (!@#$%^&*...)');
    }
    return {
      valid: errors.length === 0,
      errors,
    };
  };

  const switchRole = (role: Role) => {
    const matched = users.find((u) => u.role === role);
    if (matched) {
      setCurrentUser(matched);
    }
  };

  const switchUser = (userId: string) => {
    const found = users.find((u) => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const login = (email: string, password?: string): { success: boolean; error?: string } => {
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return { success: false, error: 'No account found with this email address.' };
    }
    setCurrentUser(user);
    return { success: true };
  };

  const signup = (params: {
    name: string;
    email: string;
    password: string;
    company_name: string;
    phone?: string;
  }): { success: boolean; error?: string } => {
    const validation = validatePassword(params.password);
    if (!validation.valid) {
      return { success: false, error: validation.errors[0] };
    }

    const existing = users.find(
      (u) => u.email.toLowerCase() === params.email.trim().toLowerCase()
    );
    if (existing) {
      return { success: false, error: 'Email is already registered. Please login.' };
    }

    try {
      const newUser = db.addUser({
        name: params.name,
        email: params.email.trim().toLowerCase(),
        role: 'CUSTOMER',
        company_name: params.company_name,
        phone: params.phone,
      });
      refreshUsers();
      setCurrentUser(newUser);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to create account.' };
    }
  };

  const requestPasswordReset = (
    email: string
  ): { success: boolean; resetLink?: string; error?: string } => {
    const user = users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
    if (!user) {
      return { success: false, error: 'No account registered with this email address.' };
    }
    // Per specification: "Reset endpoint returns or prints the link (email is mocked)"
    const mockToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const resetLink = `https://app.brightloop.io/reset-password?token=${mockToken}&email=${encodeURIComponent(
      user.email
    )}`;
    return { success: true, resetLink };
  };

  const logout = () => {
    // Switch to first customer or guest state
    const customer = users.find((u) => u.role === 'CUSTOMER') || users[0];
    setCurrentUser(customer);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        switchRole,
        switchUser,
        allUsers: users,
        login,
        signup,
        requestPasswordReset,
        logout,
        validatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
