import type { Enterprise } from '@/lib/api';

const normalizeEnterpriseId = (value: string | number | null | undefined): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

export const getAccessibleEnterprises = (
  enterprises: Enterprise[],
  currentEnterpriseId?: string | number | null
): Enterprise[] => {
  const normalizedCurrentEnterpriseId = normalizeEnterpriseId(currentEnterpriseId);
  if (!normalizedCurrentEnterpriseId) {
    return [...enterprises].sort((left, right) => left.name.localeCompare(right.name, 'fr'));
  }

  const childrenByParentId = new Map<number, number[]>();
  enterprises.forEach((enterprise) => {
    const parentId = normalizeEnterpriseId(enterprise.parentEnterpriseId);
    const enterpriseId = normalizeEnterpriseId(enterprise.id);
    if (!parentId || !enterpriseId) return;
    if (!childrenByParentId.has(parentId)) {
      childrenByParentId.set(parentId, []);
    }
    childrenByParentId.get(parentId)?.push(enterpriseId);
  });

  const scopedIds = new Set<number>([normalizedCurrentEnterpriseId]);
  const visit = (parentId: number) => {
    const children = childrenByParentId.get(parentId) || [];
    children.forEach((childId) => {
      if (scopedIds.has(childId)) return;
      scopedIds.add(childId);
      visit(childId);
    });
  };

  visit(normalizedCurrentEnterpriseId);

  return enterprises
    .filter((enterprise) => {
      const enterpriseId = normalizeEnterpriseId(enterprise.id);
      return enterpriseId ? scopedIds.has(enterpriseId) : false;
    })
    .sort((left, right) => left.name.localeCompare(right.name, 'fr'));
};
