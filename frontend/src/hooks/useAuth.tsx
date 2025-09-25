import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, AuthResponse, Permission } from '../types';
import { authService } from '../services/api';

interface AuthContextType {
  user: User | null;
  permissions: Permission[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasRole: (roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Vérifier si l'utilisateur a une permission spécifique
  const hasPermission = (permission: string): boolean => {
    return permissions.some(p => p.name === permission);
  };

  // Vérifier si l'utilisateur a un des rôles spécifiés
  const hasRole = (roles: string[]): boolean => {
    return user ? roles.includes(user.role) : false;
  };

  // Connexion
  const login = async (email: string, password: string): Promise<void> => {
    try {
      const authResponse: AuthResponse = await authService.login({ email, password });
      
      // Stocker les données d'authentification
      localStorage.setItem('token', authResponse.token);
      localStorage.setItem('refreshToken', authResponse.refreshToken);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      
      setUser(authResponse.user);
      setPermissions(authResponse.permissions);
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Erreur de connexion');
    }
  };

  // Déconnexion
  const logout = async (): Promise<void> => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    } finally {
      setUser(null);
      setPermissions([]);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  };

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (token && storedUser) {
          // Vérifier que le token est toujours valide
          const profileData = await authService.getProfile();
          setUser(profileData.user);
          setPermissions(profileData.permissions);
        }
      } catch (error) {
        // Token invalide, nettoyer le localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const value: AuthContextType = {
    user,
    permissions,
    isLoading,
    isAuthenticated,
    login,
    logout,
    hasPermission,
    hasRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};