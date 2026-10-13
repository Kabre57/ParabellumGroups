/**
 * Normalise les réponses de liste du service CRM pour les hooks de requête.
 */
export const normalizeListResponse = (response: any) => {
  if (Array.isArray(response)) {
    return response;
  }
  if (Array.isArray(response?.data)) {
    return response.data;
  }
  return [];
};
