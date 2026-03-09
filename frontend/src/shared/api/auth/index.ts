import { apiClient } from '../shared/client';
import {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  UpdateProfileRequest,
  RefreshTokenRequest,
  RefreshTokenResponse,
  User,
} from '../shared/types';
import { AxiosResponse } from 'axios';

/**
 * Service d'authentification
 */
class AuthService {
  private readonly basePath = '/auth';

  /**
   * Connexion utilisateur
   */
  async login(email: string, password: string): Promise<LoginResponse> {
    const credentials: LoginRequest = { email, password };
    
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await apiClient.post(
      `${this.basePath}/login`,
      credentials
    );

    const { user, accessToken, refreshToken } = response.data.data;

    // Stockage des tokens et données utilisateur
    this.storeAuthData(user, accessToken, refreshToken);

    return response.data.data;
  }

  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(userData: RegisterRequest): Promise<LoginResponse> {
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await apiClient.post(
      `${this.basePath}/register`,
      userData
    );

    const { user, accessToken, refreshToken } = response.data.data;

    // Stockage des tokens et données utilisateur
    this.storeAuthData(user, accessToken, refreshToken);

    return response.data.data;
  }

  /**
   * Déconnexion utilisateur
   */
  async logout(): Promise<void> {
    try {
      // Appel API pour invalider le token côté serveur
      await apiClient.post(`${this.basePath}/logout`);
    } catch (error) {
      // Continue même si l'appel API échoue
      console.error('Logout error:', error);
    } finally {
      // Nettoyage local
      this.clearAuthData();
    }
  }

  /**
   * Refresh du token d'accès
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const request: RefreshTokenRequest = { refreshToken };

    const response: AxiosResponse<ApiResponse<RefreshTokenResponse>> = await apiClient.post(
      `${this.basePath}/refresh`,
      request
    );

    const { accessToken, refreshToken: newRefreshToken } = response.data.data;

    // Mise à jour des tokens
    apiClient.setToken(accessToken);
    this.setRefreshToken(newRefreshToken);

    return response.data.data;
  }

  /**
   * Récupération de l'utilisateur connecté
   */
  async getCurrentUser(): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await apiClient.get(
      `${this.basePath}/me`
    );

    const user = response.data.data;

    // Mise à jour du cache local
    this.setUser(user);

    return user;
  }

  /**
   * Mise à jour du profil utilisateur
   */
  async updateProfile(data: UpdateProfileRequest): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await apiClient.patch(
      `${this.basePath}/profile`,
      data
    );

    const user = response.data.data;

    // Mise à jour du cache local
    this.setUser(user);

    return user;
  }

  /**
   * Vérification de l'authentification
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken() && !!this.getUser();
  }

  /**
   * Récupération du token d'accès
   */
  getAccessToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('accessToken');
  }

  /**
   * Récupération du refresh token
   */
  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return localStorage.getItem('refreshToken');
  }

  /**
   * Définit le refresh token
   */
  private setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refreshToken', token);
    }
  }

  /**
   * Récupération de l'utilisateur depuis le cache
   */
  getUser(): User | null {
    if (typeof window === 'undefined') {
      return null;
    }
    const userJson = localStorage.getItem('user');
    return userJson ? JSON.parse(userJson) : null;
  }

  /**
   * Définit l'utilisateur dans le cache
   */
  private setUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  /**
   * Stocke les données d'authentification
   */
  private storeAuthData(user: User, accessToken: string, refreshToken: string): void {
    apiClient.setToken(accessToken);
    this.setRefreshToken(refreshToken);
    this.setUser(user);
  }

  /**
   * Nettoie les données d'authentification
   */
  private clearAuthData(): void {
    apiClient.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }
}

// Export d'une instance unique du service
export const authService = new AuthService();
export default authService;
