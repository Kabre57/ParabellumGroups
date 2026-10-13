'use client';

import { CustomerDetailContent } from './customer-detail-content';
import { useCustomerDetail } from './use-customer-detail';

export default function CustomerDetailPage() {
  const model = useCustomerDetail();

  return <CustomerDetailContent model={model} />;
}
