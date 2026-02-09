import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from './types';
import Cookies from 'js-cookie';

/**
 * Configuration du client API Axios
 */
class ApiClient {
  private instance: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    // Utilisation de /api comme base URL par défaut pour le proxy ou le gateway
    // Si NEXT_PUBLIC_API_GATEWAY_URL est défini, on l'utilise, sinon on utilise /api
    const baseURL = process.env.NEXT_PUBLIC_API_GATEWAY_URL || '/api';
    
    this.instance = axios.create({
      baseURL: baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Configuration des intercepteurs pour authentification et gestion d'erreurs
   */
  private setupInterceptors(): void {
    // Intercepteur de requête - ajoute le token JWT
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Intercepteur de réponse - gestion d'erreurs globale
    this.instance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        return this.handleError(error);
      }
    );
  }

  /**
   * Récupère le token JWT depuis le localStorage
   */
  private getToken(): string | null {
    if (typeof window === 'undefined') {
      return this.accessToken;
    }
    return localStorage.getItem('accessToken');
  }

  /**
   * Définit le token JWT
   */
  public setToken(token: string | null): void {
    this.accessToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('accessToken', token);
      } else {
        localStorage.removeItem('accessToken');
      }
    }
  }

  /**
   * Gestion globale des erreurs API
   */
  private async handleError(error: AxiosError): Promise<never> {
    if (!error.response) {
      // Erreur réseau
      throw {
        success: false,
        message: 'Erreur de connexion au serveur',
        status: 0,
        data: null,
      } as ApiResponse<null>;
    }

    const { status, data } = error.response;

    // Gestion spécifique selon le code HTTP
    switch (status) {
      case 401:
        // Token expiré ou invalide - tentative de refresh
        if (this.shouldRetryWithRefresh(error)) {
          try {
            await this.refreshAccessToken();
            // Retry la requête originale
            const config = error.config!;
            const token = this.getToken();
            if (token && config.headers) {
              config.headers.Authorization = `Bearer ${token}`;
            }
            return this.instance.request(config);
          } catch (refreshError) {
            this.handleUnauthorized();
            throw this.formatError(401, 'Session expirée, veuillez vous reconnecter');
          }
        } else {
          this.handleUnauthorized();
          throw this.formatError(401, 'Non autorisé');
        }

      case 429:
        throw this.formatError(429, 'Trop de requêtes, veuillez patienter');

      case 403:
        throw this.formatError(403, 'Accès refusé');

      case 404:
        throw this.formatError(404, 'Ressource non trouvée');

      case 422:
        throw this.formatError(422, 'Données invalides', data);

      case 500:
        throw this.formatError(500, 'Erreur serveur interne');

      case 503:
        throw this.formatError(503, 'Service temporairement indisponible');

      default:
        throw this.formatError(
          status,
          (data as any)?.message || 'Une erreur est survenue',
          data
        );
    }
  }

  /**
   * Détermine si on doit tenter un refresh du token
   */
  private shouldRetryWithRefresh(error: AxiosError): boolean {
    const config = error.config as any;
    // Ne pas retry si c'est déjà un retry ou si c'est l'appel de refresh lui-même
    return !config?._retry && !config?.url?.includes('/auth/refresh');
  }

  /**
   * Refresh le token d'accès
   */
  private async refreshAccessToken(): Promise<void> {
    const refreshToken = typeof window !== 'undefined' 
      ? localStorage.getItem('refreshToken') 
      : null;

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    // On utilise l'instance directement pour éviter l'intercepteur de réponse qui pourrait boucler
    const response = await this.instance.post('/auth/refresh', {
      refreshToken,
    }, {
      _retry: true,
    } as any);

    const accessToken = response.data?.data?.accessToken || response.data?.accessToken;
    if (!accessToken) {
      throw new Error('No access token in refresh response');
    }
    this.setToken(accessToken);
  }

  /**
   * Gère la déconnexion en cas d'erreur d'authentification
   */
  private handleUnauthorized(): void {
    this.setToken(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      Cookies.remove('auth_token');
      // Redirection vers la page de login si on n'y est pas déjà
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
  }

  /**
   * Formate les erreurs en ApiResponse
   */
  private formatError(status: number, message: string, data?: any): ApiResponse<null> {
    return {
      success: false,
      message,
      status,
      data: null,
      errors: data?.errors || undefined,
    };
  }

  /**
   * Retourne l'instance Axios configurée
   */
  public getAxiosInstance(): AxiosInstance {
    return this.instance;
  }

  /**
   * Méthode GET
   */
  public async get<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.get<T>(url, config);
  }

  /**
   * Méthode POST
   */
  public async post<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.post<T>(url, data, config);
  }

  /**
   * Méthode PUT
   */
  public async put<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.put<T>(url, data, config);
  }

  /**
   * Méthode DELETE
   */
  public async delete<T = any>(url: string, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.delete<T>(url, config);
  }

  /**
   * Méthode PATCH
   */
  public async patch<T = any>(url: string, data?: any, config?: any): Promise<AxiosResponse<T>> {
    return this.instance.patch<T>(url, data, config);
  }
}

// Export d'une instance unique du client
export const apiClient = new ApiClient();
export default apiClient;

// Export de l'instance Axios pour compatibilité
export const axiosInstance = apiClient.getAxiosInstance();
