/**
 * Hook useEnterpriseLogo
 * Retourne le logo et le nom de l'entreprise de l'utilisateur connecté
 * pour être utilisé dans les composants d'impression.
 */
import { useAuth } from './useAuth';

const DEFAULT_LOGO = '/parabellum.jpg';
const DEFAULT_COMPANY = 'Parabellum Groups';

export function useEnterpriseLogo() {
  const { user } = useAuth();

  const enterprise = user?.enterprise;
  const logoUrl = enterprise?.logoUrl || null;
  const companyName = enterprise?.name || DEFAULT_COMPANY;

  return {
    logoSrc: logoUrl || DEFAULT_LOGO,
    companyName,
    hasLogo: !!logoUrl,
    enterprise,
  };
}
