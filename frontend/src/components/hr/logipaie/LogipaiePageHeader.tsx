'use client';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function LogipaiePageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
    </Card>
  );
}
