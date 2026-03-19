import { redirect } from "next/navigation";

type PurchaseOrderLegacyPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PurchaseOrderLegacyPage({ params }: PurchaseOrderLegacyPageProps) {
  const { id } = await params;
  redirect(`/dashboard/achats/commandes?selectedOrderId=${encodeURIComponent(id)}`);
}
