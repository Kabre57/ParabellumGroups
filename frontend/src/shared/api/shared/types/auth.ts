import type { User } from './entities';

// ==================== TYPES DE REQUÊTE ====================

/**
 * Données de connexion
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Réponse de connexion
 */
export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

/**
 * Données d'inscription
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

/**
 * Données de mise à jour de profil
 */
export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatar?: string;
  position?: string;
  department?: string;
  preferences?: Record<string, any> | null;
}

/**
 * Demande de refresh token
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Réponse de refresh token
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}