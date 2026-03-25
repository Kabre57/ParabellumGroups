"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, CheckCircle2, RefreshCw, Printer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { inventoryReceptionsService } from "@/shared/api/inventory/receptions.service";
import type { Reception, ReceptionStatus } from "@/shared/api/inventory/types";
import { procurementService } from "@/services/procurement";
import ReceptionPrint from "@/components/printComponents/ReceptionPrint";
import { DocumentLinesTable } from "@/components/procurement/DocumentLinesTable";

const statusColors: Record<ReceptionStatus, string> = {
  EN_ATTENTE: "bg-yellow-100 text-yellow-800",
  PARTIELLE: "bg-blue-100 text-blue-800",
  COMPLETE: "bg-purple-100 text-purple-800",
  VERIFIEE: "bg-green-100 text-green-800",
};

const statusLabels: Record<ReceptionStatus, string> = {
  EN_ATTENTE: "En attente",
  PARTIELLE: "Partielle",
  COMPLETE: "Complète",
  VERIFIEE: "Vérifiée",
};

export default function ReceptionsPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReceptionStatus | "ALL">("ALL");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedReception, setSelectedReception] = useState<Reception | null>(null);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Liste
  const { data: listResponse, isLoading } = useQuery({
    queryKey: ["receptions", statusFilter, searchTerm],
    queryFn: () =>
      inventoryReceptionsService.list({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: searchTerm || undefined,
        limit: 200,
      }),
  });

  // L'API renvoie un tableau brut. On accepte aussi le format ApiResponse pour compatibilité.
  const receptions: Reception[] = (Array.isArray(listResponse) ? listResponse : listResponse?.data) ?? [];

  // Détail
  const { data: detail, isFetching: isDetailLoading } = useQuery({
    queryKey: ["reception-detail", selectedId],
    queryFn: () => inventoryReceptionsService.get(selectedId || "").then((res) => res.data),
    enabled: !!selectedId,
  });

  const mapped = useMemo(
    () =>
      receptions.filter((r) => {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          (r.numero || "").toLowerCase().includes(search) || (r.fournisseurId || "").toLowerCase().includes(search);
        const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [receptions, searchTerm, statusFilter]
  );

  const stats = useMemo(
    () => ({
      total: receptions.length,
      pending: receptions.filter((r) => r.status === "EN_ATTENTE" || r.status === "PARTIELLE").length,
      verified: receptions.filter((r) => r.status === "VERIFIEE").length,
      totalAmount: receptions.reduce((sum, r) => {
        const lignes = r.lignes || [];
        const montant = lignes.reduce((s, l) => {
          const ht = (l.prixUnitaire || 0) * (l.quantiteRecue || 0);
          const tva = l.tva ? ht * (l.tva / 100) : 0;
          return s + ht + tva;
        }, 0);
        return sum + montant;
      }, 0),
    }),
    [receptions]
  );

  const validateMutation = useMutation({
    mutationFn: () => inventoryReceptionsService.validate(selectedId || ""),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receptions"] });
      queryClient.invalidateQueries({ queryKey: ["reception-detail", selectedId] });
    },
  });

  const current = detail || selectedReception;
  const { data: currentOrder } = useQuery({
    queryKey: ["reception-order-detail", current?.bonCommandeId],
    queryFn: () => procurementService.getOrder(current?.bonCommandeId || "").then((res) => res.data),
    enabled: Boolean(current?.bonCommandeId),
    staleTime: 5 * 60 * 1000,
  });
  const { data: currentSupplier } = useQuery({
    queryKey: ["reception-supplier-detail", currentOrder?.supplierId],
    queryFn: () => procurementService.getSupplier(currentOrder?.supplierId || "").then((res) => res.data),
    enabled: Boolean(currentOrder?.supplierId),
    staleTime: 5 * 60 * 1000,
  });
  const lignes = current?.lignes || [];

  return (
    <div className="space-y-6 overflow-x-hidden p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/achats">Retour aux achats</Link>
          </Button>
          <h1 className="mt-2 text-3xl font-bold">Réceptions</h1>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">En attente / Partielle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vérifiées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.verified}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Montant total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString("fr-FR")} F</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="h-full min-w-0">
          <CardHeader>
            <CardTitle>Liste des réceptions</CardTitle>
            <CardDescription>Suivi des réceptions de bons de commande.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[220px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Rechercher par numéro ou fournisseur..."
                    className="pl-9"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReceptionStatus | "ALL")}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="ALL">Tous les statuts</option>
                <option value="EN_ATTENTE">En attente</option>
                <option value="PARTIELLE">Partielle</option>
                <option value="COMPLETE">Complète</option>
                <option value="VERIFIEE">Vérifiée</option>
              </select>
            </div>

            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Spinner />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b text-left text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 font-medium">Numéro</th>
                      <th className="px-4 py-3 font-medium">Statut</th>
                      <th className="px-4 py-3 font-medium">Lignes</th>
                      <th className="px-4 py-3 font-medium">Date</th>
                      <th className="px-4 py-3 font-medium text-right">Montant</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mapped.map((r) => (
                      <tr
                        key={r.id}
                        className={`border-b last:border-0 cursor-pointer hover:bg-slate-50 ${
                          selectedId === r.id ? "bg-slate-100" : ""
                        }`}
                        onClick={() => {
                          setSelectedId(r.id);
                          setSelectedReception(r);
                        }}
                      >
                        <td className="px-4 py-3 font-medium">{r.numero}</td>
                        <td className="px-4 py-3">
                          <Badge className={statusColors[r.status]}>{statusLabels[r.status]}</Badge>
                        </td>
                        <td className="px-4 py-3">{r.lignes?.length ?? 0}</td>
                        <td className="px-4 py-3">
                          {r.dateReception ? new Date(r.dateReception).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {(() => {
                            const lignes = r.lignes || [];
                            const montant = lignes.reduce((s, l) => {
                              const ht = (l.prixUnitaire || 0) * (l.quantiteRecue || 0);
                              const tva = l.tva ? ht * (l.tva / 100) : 0;
                              return s + ht + tva;
                            }, 0);
                            return montant.toLocaleString("fr-FR");
                          })()}{" "}
                          F
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mapped.length === 0 && (
                  <div className="py-8 text-center text-muted-foreground">Aucune réception.</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="h-full min-w-0">
          <CardHeader>
            <CardTitle>Détails de la réception</CardTitle>
            <CardDescription>Sélectionnez une réception dans la liste</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isDetailLoading ? (
              <div className="py-8 text-center text-muted-foreground">
                <Spinner />
              </div>
            ) : !current ? (
              <div className="py-8 text-center text-muted-foreground">Aucune réception sélectionnée.</div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-2 text-sm">
                  <div>
                    <div className="text-muted-foreground">Numéro</div>
                    <div className="font-semibold">{current.numero}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Statut</div>
                    <Badge className={statusColors[current.status]}>{statusLabels[current.status]}</Badge>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Date</div>
                    <div className="font-semibold">
                      {current.dateReception ? new Date(current.dateReception).toLocaleDateString("fr-FR") : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Bon de commande</div>
                    <div className="font-semibold">
                      {currentOrder?.number || currentOrder?.numeroBon || current.bonCommandeId}
                    </div>
                  </div>
                </div>

                <DocumentLinesTable
                  title="Lignes réceptionnées"
                  description="Lecture compacte type ERP pour contrôler rapidement les quantités et montants reçus."
                  lines={lignes.map((l) => ({
                    id: l.id,
                    designation: l.designation || "-",
                    categorie: null,
                    quantite: l.quantiteRecue || 0,
                    prixUnitaire: l.prixUnitaire || 0,
                    tva: l.tva ?? 0,
                    montantHT: (l.prixUnitaire || 0) * (l.quantiteRecue || 0),
                    montantTTC:
                      (l.prixUnitaire || 0) * (l.quantiteRecue || 0) * (1 + (l.tva || 0) / 100),
                  }))}
                  heightClass="h-[320px]"
                />

                <div className="flex gap-2">
                  {current.status !== "VERIFIEE" && (
                    <Button disabled={validateMutation.isPending} onClick={() => validateMutation.mutate()}>
                      {validateMutation.isPending ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      )}
                      Valider la réception
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setIsPrintOpen(true)}>
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimer
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {isPrintOpen && current && (
        <ReceptionPrint
          reception={current}
          order={currentOrder}
          supplier={currentSupplier}
          onClose={() => setIsPrintOpen(false)}
        />
      )}
    </div>
  );
}
