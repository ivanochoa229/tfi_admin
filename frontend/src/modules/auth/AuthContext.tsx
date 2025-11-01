import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import authService from '../shared/services/authService';
import { CollaboratorRole } from '../shared/types/project';
import { mapRoleNameToCollaboratorRole, normalizeRoleName } from '../shared/utils/roles';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: CollaboratorRole;
  roleName: 'GESTOR' | 'COLABORADOR';
  roleId: number;
}

interface SessionState {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = 'project-management-auth';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedSession = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedSession) {
      const parsed = JSON.parse(savedSession) as SessionState;
      const normalizedRoleName = normalizeRoleName(parsed.user.roleName);
      const normalizedUser: User = {
        ...parsed.user,
        roleName: normalizedRoleName,
        role: mapRoleNameToCollaboratorRole(normalizedRoleName)
      };
      setSession({ token: parsed.token, user: normalizedUser });
    }
  }, []);

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authService.login(credentials);
      const normalizedRoleName = normalizeRoleName(response.user.roleName);
      const mappedUser: User = {
        id: response.user.id,
        email: response.user.email,
        firstName: response.user.firstName,
        lastName: response.user.lastName,
        role: mapRoleNameToCollaboratorRole(normalizedRoleName),
        roleName: normalizedRoleName,
        roleId: response.user.roleId
      };
      const nextSession: SessionState = { token: response.token, user: mappedUser };
      setSession(nextSession);
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
      navigate('/', { replace: true });
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Ocurrió un error inesperado.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    setSession(null);
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
    navigate('/login', { replace: true });
  };

  const value = useMemo(
    () => ({
      isAuthenticated: Boolean(session?.user),
      user: session?.user ?? null,
      token: session?.token ?? null,
      login,
      logout,
      isLoading,
      error
    }),
    [session, isLoading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }

  return context;
};