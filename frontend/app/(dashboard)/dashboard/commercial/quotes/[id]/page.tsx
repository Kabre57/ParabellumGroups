import { QuoteDetailView } from '@/components/commercial/quotes';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CommercialQuoteDetailPage({ params }: Props) {
  const { id } = await params;
  return <QuoteDetailView quoteId={id} />;
}
