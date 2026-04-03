export type LogipaieColumn = {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
  format?: (value: any, row: Record<string, any>) => string | number | null;
};

export const buildColumnsFromLabels = (
  labels: readonly string[],
  options?: { keyPrefix?: string }
): LogipaieColumn[] => {
  const keyPrefix = options?.keyPrefix ?? 'col';
  return labels.map((label, index) => ({
    key: `${keyPrefix}${index}`,
    label,
  }));
};

export const buildRowFromValues = (
  values: any[],
  labels: readonly string[],
  id?: string | number
) => {
  const row: Record<string, any> = { id };
  labels.forEach((_, index) => {
    row[`col${index}`] = values[index] ?? null;
  });
  return row;
};
