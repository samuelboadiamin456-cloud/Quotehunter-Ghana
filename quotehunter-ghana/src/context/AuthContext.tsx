import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
import { api } from '../services/api.ts';
import { User, Organization, SupplierProfile } from '../types/index.ts';

interface AuthContextType {
  user: User | null;
  organizations: Organization[];
  currentOrg: Organization | null;
  supplierProfile: SupplierProfile | null;
  loading: boolean;
  error: string | null;
  signInWithGoogle: () => Promise<void>;
  switchPersona: (role: 'contractor' | 'supplier') => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [supplierProfile, setSupplierProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setOrganizations(data.organizations);
      setCurrentOrg(data.organizations[0] || null);
      setSupplierProfile(data.supplierProfile);
      setError(null);
    } catch (err: any) {
      console.warn('Could not load current user session:', err);
      localStorage.removeItem('qh_auth_token');
      // If in development, initialize contractor session
      if (import.meta.env.DEV) {
        await switchPersona('contractor');
      } else {
        setUser(null);
        setOrganizations([]);
        setCurrentOrg(null);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const existingToken = localStorage.getItem('qh_auth_token');
    if (existingToken) {
      refreshUser();
    } else {
      // In development, default to contractor session for seamless exploration
      if (import.meta.env.DEV) {
        switchPersona('contractor');
      } else {
        setLoading(false);
      }
    }
  }, []);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      setError(null);
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const token = await cred.user.getIdToken();
      localStorage.setItem('qh_auth_token', token);
      await refreshUser();
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setError(err.message || 'Google Sign-in failed. Please try again.');
      setLoading(false);
    }
  };

  const switchPersona = async (role: 'contractor' | 'supplier') => {
    try {
      setLoading(true);
      setError(null);
      let email = 'contractor@primebuildgh.com';
      let name = 'Kwame Mensah';
      let orgName = 'Prime Build Construction Ghana Ltd';
      let region = 'Greater Accra';

      if (role === 'supplier') {
        email = 'supplier@accramaterials.com';
        name = 'Kofi Antwi';
        orgName = 'Accra Building Materials & Supplies Ltd';
        region = 'Greater Accra';
      }

      const res = await api.authenticateSession({
        email,
        name,
        role,
        organizationName: orgName,
        region,
      });

      localStorage.setItem('qh_auth_token', res.token);
      await refreshUser();
    } catch (err: any) {
      console.error('Failed to switch persona:', err);
      setError('Persona switch failed: ' + err.message);
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('qh_auth_token');
    setUser(null);
    setOrganizations([]);
    setCurrentOrg(null);
    setSupplierProfile(null);
    if (import.meta.env.DEV) {
      switchPersona('contractor');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        supplierProfile,
        loading,
        error,
        signInWithGoogle,
        switchPersona,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
