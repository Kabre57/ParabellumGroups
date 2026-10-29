import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse } from './types';
import Cookies from 'js-cookie';

/**
 * Configuration du client API Axios
 */
class ApiClient {
  private instance: AxiosInstance;
  private accessToken: string | null = null;
  private enterpriseId: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  private isPublicAuthEndpoint(url?: string): boolean {
    if (!url) return false;
    return (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/forgot-password') ||
      url.includes('/auth/reset-password') ||
      url.includes('/auth/refresh')
    );
  }

  constructor() {
    // Utilisation de /api comme base URL par défaut pour le proxy ou le gateway.
    // Les URLs gateway sans suffixe /api sont normalisées pour le développement local.
    const configuredBaseURL =
      process.env.NEXT_PUBLIC_API_GATEWAY_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      '/api';
    const baseURL = configuredBaseURL.endsWith('/api') || configuredBaseURL === '/api'
      ? configuredBaseURL
      : `${configuredBaseURL.replace(/\/$/, '')}/api`;
    
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
    const shouldLogResponses =
      typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEBUG_API === 'true';
    // Intercepteur de requête - ajoute le token JWT
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // For FormData, let the browser set multipart/form-data with its boundary.
        if (typeof FormData !== 'undefined' && config.data instanceof FormData && config.headers) {
          if (typeof config.headers.delete === 'function') {
            config.headers.delete('Content-Type');
          } else {
            delete (config.headers as any)['Content-Type'];
            delete (config.headers as any)['content-type'];
          }
        }

        const isPublicEndpoint = this.isPublicAuthEndpoint(config.url);
        const token = this.getToken();
        const authConfig = config as any;
        if (!isPublicEndpoint && typeof window !== 'undefined') {
          authConfig.__authAccessTokenAtRequest = token;
          authConfig.__authRefreshTokenAtRequest = localStorage.getItem('refreshToken');
        }
        if (!isPublicEndpoint && token && config.headers) {
          // Use .set() method for Axios 1.x AxiosHeaders
          if (typeof config.headers.set === 'function') {
            config.headers.set('Authorization', `Bearer ${token}`);
          } else {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        // Injecter X-Enterprise-Id si une entreprise est sélectionnée
        const enterpriseId = this.enterpriseId ||
          (typeof window !== 'undefined' ? localStorage.getItem('selectedEnterpriseId') : null);
        if (enterpriseId && config.headers) {
          if (typeof config.headers.set === 'function') {
            config.headers.set('X-Enterprise-Id', enterpriseId);
          } else {
            (config.headers as any)['X-Enterprise-Id'] = enterpriseId;
          }
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
        if (shouldLogResponses) {
          console.debug('[ApiClient RESPONSE]', {
            url: response.config?.url,
            status: response.status,
            data: response.data,
          });
        }
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
   * Définit l'entreprise active pour les requêtes suivantes
   */
  public setEnterpriseId(enterpriseId: string | null): void {
    this.enterpriseId = enterpriseId;
  }

  /**
   * Gestion globale des erreurs API
   */
  private async handleError(error: AxiosError): Promise<AxiosResponse> {
    if (!error.response) {
      // Erreur réseau
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      throw {
        success: false,
        message: isLoginRequest
          ? 'Le service de connexion ne répond pas pour le moment. Vérifiez votre connexion et réessayez dans quelques instants.'
          : 'Impossible de joindre le serveur. Vérifiez votre connexion et réessayez.',
        status: 0,
        data: null,
      } as ApiResponse<null>;
    }

    const { status, data } = error.response;
    const requestConfig = error.config as any;

    // Gestion spécifique selon le code HTTP
    switch (status) {
      case 401:
        if (requestConfig?.url?.includes('/auth/login')) {
          this.handleUnauthorized();
          throw this.formatError(401, 'Adresse email ou mot de passe incorrect');
        }

        // A refresh failure is handled by the original request below. Clearing
        // storage here would log the user out even for a temporary 429/500.
        if (requestConfig?.url?.includes('/auth/refresh')) {
          throw this.formatError(401, (data as any)?.message || 'Refresh token invalide', data);
        }

        const latestAccessToken = this.getToken();
        const requestAccessToken = requestConfig?.__authAccessTokenAtRequest as string | null | undefined;
        const requestRefreshToken = requestConfig?.__authRefreshTokenAtRequest as string | null | undefined;

        // Another tab (or a new login) may have replaced the session while this
        // request was in flight. Retry with that session instead of erasing it.
        if (
          !requestConfig?._retry &&
          latestAccessToken &&
          (latestAccessToken !== requestAccessToken ||
            (requestRefreshToken && localStorage.getItem('refreshToken') !== requestRefreshToken))
        ) {
          return this.retryRequestWithToken(requestConfig, latestAccessToken);
        }

        if (requestConfig?._retry) {
          const currentAccessToken = this.getToken();
          if (currentAccessToken && currentAccessToken !== requestAccessToken) {
            return this.retryRequestWithToken(requestConfig, currentAccessToken);
          }
          this.handleUnauthorizedIfCurrent(requestAccessToken, requestRefreshToken);
          throw this.formatError(401, 'Session expirée, veuillez vous reconnecter');
        }

        // Token expiré ou invalide - tentative de refresh
        if (this.shouldRetryWithRefresh(error)) {
          const refreshToken = typeof window !== 'undefined'
            ? localStorage.getItem('refreshToken')
            : null;
          if (!refreshToken) {
            this.handleUnauthorizedIfCurrent(requestAccessToken, requestRefreshToken);
            throw this.formatError(401, 'Session expirée, veuillez vous reconnecter');
          }
          try {
            await this.refreshAccessToken(requestAccessToken, requestRefreshToken);
            // Retry la requête originale avec le nouveau token
            const token = this.getToken();
            if (token) {
              return this.retryRequestWithToken(requestConfig, token);
            }
            throw new Error('No access token available after refresh');
          } catch (refreshError) {
            const currentAccessToken = this.getToken();
            const currentRefreshToken = typeof window !== 'undefined'
              ? localStorage.getItem('refreshToken')
              : null;

            // If another tab rotated the token during the failed request, keep
            // the newer session and retry with its access token.
            if (
              currentAccessToken &&
              (currentAccessToken !== requestAccessToken ||
                (currentRefreshToken && currentRefreshToken !== requestRefreshToken))
            ) {
              return this.retryRequestWithToken(requestConfig, currentAccessToken);
            }

            const refreshStatus = (refreshError as any)?.status ?? (refreshError as any)?.response?.status;
            if (refreshStatus === 401 || refreshStatus === 403 || !currentRefreshToken) {
              this.handleUnauthorizedIfCurrent(requestAccessToken, requestRefreshToken);
              throw this.formatError(401, 'Session expirée, veuillez vous reconnecter');
            }

            // Transient refresh failures must not destroy a valid local session.
            throw refreshError;
          }
        } else {
          this.handleUnauthorizedIfCurrent(requestAccessToken, requestRefreshToken);
          throw this.formatError(401, 'Non autorisé');
        }

      case 429: {
        const retryAfter = Math.max(
          0,
          Number((data as any)?.retryAfter || error.response?.headers?.['retry-after'] || 0),
        );
        const retryDelay = retryAfter >= 60
          ? `dans ${Math.ceil(retryAfter / 60)} minute${Math.ceil(retryAfter / 60) === 1 ? '' : 's'}`
          : retryAfter > 0
            ? `dans ${retryAfter} seconde${retryAfter === 1 ? '' : 's'}`
            : 'un peu plus tard';
        const message = requestConfig?.url?.includes('/auth/login')
          ? `Trop de tentatives de connexion. Réessayez ${retryDelay}.`
          : typeof (data as any)?.message === 'string'
            ? (data as any).message
            : `Trop de requêtes. Réessayez ${retryDelay}.`;
        throw this.formatError(429, message, data);
      }

      case 403:
        throw this.formatError(403, 'Accès refusé');

      case 404:
        throw this.formatError(404, 'Ressource non trouvée');

      case 422:
        throw this.formatError(422, (data as any)?.message || 'Données invalides', data);

      case 500:
        throw this.formatError(
          500,
          requestConfig?.url?.includes('/auth/login')
            ? 'Un incident technique empêche la connexion pour le moment. Réessayez dans quelques instants.'
            : 'Un incident interne est survenu. Réessayez plus tard ou contactez l’assistance.'
        );

      case 502:
      case 504:
        throw this.formatError(
          status,
          requestConfig?.url?.includes('/auth/login')
            ? 'Le service de connexion rencontre un problème temporaire. Vos identifiants n’ont pas pu être vérifiés. Réessayez dans quelques instants.'
            : 'Le service est momentanément indisponible. Réessayez dans quelques instants.'
        );

      case 503:
        throw this.formatError(
          503,
          requestConfig?.url?.includes('/auth/login')
            ? 'Le service de connexion est momentanément indisponible. Vos identifiants n’ont pas pu être vérifiés. Réessayez dans quelques instants.'
            : 'Le service est momentanément indisponible. Réessayez dans quelques instants.'
        );

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
    return (
      !config?._retry &&
      !this.isPublicAuthEndpoint(config?.url) &&
      !config?.url?.includes('/auth/refresh')
    );
  }

  /**
   * Refresh le token d'accès
   */
  private refreshAccessToken(
    expectedAccessToken?: string | null,
    expectedRefreshToken?: string | null
  ): Promise<void> {
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefreshAccessToken(expectedAccessToken, expectedRefreshToken).finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  private async performRefreshAccessToken(
    expectedAccessToken?: string | null,
    expectedRefreshToken?: string | null
  ): Promise<void> {
    const runRefresh = async () => {
      const currentRefreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('refreshToken')
        : null;
      const currentAccessToken = this.getToken();

      if (!currentRefreshToken) {
        throw new Error('No refresh token available');
      }

      // The lock may have been acquired after another tab already refreshed.
      if (
        currentAccessToken &&
        ((expectedAccessToken !== undefined && currentAccessToken !== expectedAccessToken) ||
          (expectedRefreshToken && currentRefreshToken !== expectedRefreshToken))
      ) {
        this.setToken(currentAccessToken);
        return;
      }

      // The refresh endpoint is called through the same instance so its URL,
      // cookies and gateway routing remain identical, while its 401 is left to
      // the caller to handle conditionally.
      const response = await this.instance.post('/auth/refresh', {
        refreshToken: currentRefreshToken,
      }, {
        _retry: true,
      } as any);

      const accessToken = response.data?.data?.accessToken || response.data?.accessToken;
      const newRefreshToken = response.data?.data?.refreshToken || response.data?.refreshToken;
      if (!accessToken) {
        throw new Error('No access token in refresh response');
      }

      // Do not let an older refresh response overwrite a session created by a
      // newer login in another tab.
      const latestRefreshToken = typeof window !== 'undefined'
        ? localStorage.getItem('refreshToken')
        : null;
      if (latestRefreshToken && latestRefreshToken !== currentRefreshToken) {
        return;
      }

      this.setToken(accessToken);
      if (newRefreshToken && typeof window !== 'undefined') {
        localStorage.setItem('refreshToken', newRefreshToken);
      }
    };

    const lockManager = typeof navigator !== 'undefined'
      ? (navigator as Navigator & { locks?: { request: <T>(name: string, callback: () => Promise<T>) => Promise<T> } }).locks
      : undefined;

    if (lockManager?.request) {
      await lockManager.request('parabellum-auth-refresh', runRefresh);
      return;
    }

    await runRefresh();
  }

  private retryRequestWithToken(requestConfig: any, token: string): Promise<AxiosResponse> {
    requestConfig._retry = true;
    requestConfig.__authAccessTokenAtRequest = token;
    requestConfig.__authRefreshTokenAtRequest = typeof window !== 'undefined'
      ? localStorage.getItem('refreshToken')
      : null;

    if (requestConfig.headers) {
      if (typeof requestConfig.headers.set === 'function') {
        requestConfig.headers.set('Authorization', `Bearer ${token}`);
      } else {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
    }

    return this.instance.request(requestConfig);
  }

  private handleUnauthorizedIfCurrent(
    expectedAccessToken?: string | null,
    expectedRefreshToken?: string | null
  ): void {
    const currentAccessToken = this.getToken();
    const currentRefreshToken = typeof window !== 'undefined'
      ? localStorage.getItem('refreshToken')
      : null;

    if (
      (expectedAccessToken !== undefined && currentAccessToken !== expectedAccessToken) ||
      (expectedRefreshToken !== undefined && currentRefreshToken !== expectedRefreshToken)
    ) {
      return;
    }

    this.handleUnauthorized();
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
