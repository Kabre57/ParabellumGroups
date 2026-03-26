import { redirect } from 'next/navigation';

interface Props {
  params: Promise<{ num: string }>;
}

export default async function InvoiceEditRedirectPage({ params }: Props) {
  const { num } = await params;
  redirect(`/dashboard/facturation/factures/${num}`);
}
