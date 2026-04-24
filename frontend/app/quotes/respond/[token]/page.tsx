import { PublicQuoteResponseView } from '@/components/commercial/quotes/PublicQuoteResponseView';

interface Props {
  params: Promise<{ token: string }>;
}

export default async function PublicQuoteResponsePage({ params }: Props) {
  const { token } = await params;
  return <PublicQuoteResponseView token={token} />;
}
