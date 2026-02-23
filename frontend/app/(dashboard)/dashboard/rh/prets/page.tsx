"use client";

import React, { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Plus, Search, Calendar, Trash2, CheckSquare } from "lucide-react";
import { hrService, LoanPayload, Employee } from "@/shared/api/hr";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "sonner";

export default function PretsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    employeId: "",
    type: "AVANCE",
    montantInitial: "",
    deductionMensuelle: "",
    dateDebut: "",
    dateFin: "",
    motif: "",
  });

  const queryClient = useQueryClient();

  const { data: loans, isLoading } = useQuery<LoanPayload[]>({
    queryKey: ["loans"],
    queryFn: async () => {
      const res = await hrService.getLoans();
      return res.data || [];
    },
  });

  const { data: employeesData } = useQuery({
    queryKey: ["employees-mini"],
    queryFn: () => hrService.getEmployees({ page: 1, pageSize: 200 }),
  });
  const employees = employeesData?.data || [] as Employee[];

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.employeId || !form.montantInitial || !form.deductionMensuelle || !form.dateDebut) {
        throw new Error("Champs requis manquants");
      }
      const payload = {
        employeId: form.employeId,
        type: form.type,
        motif: form.motif,
        montantInitial: parseFloat(form.montantInitial),
        deductionMensuelle: parseFloat(form.deductionMensuelle),
        dateDebut: form.dateDebut,
        dateFin: form.dateFin || null,
      };
      return hrService.createLoan(payload);
    },
    onSuccess: () => {
      toast.success("Avance/Prêt créé(e)");
      setShowForm(false);
      setForm({ employeId: "", type: "AVANCE", montantInitial: "", deductionMensuelle: "", dateDebut: "", dateFin: "", motif: "" });
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: (err: any) => toast.error(err?.message || "Création impossible"),
  });

  const terminateMutation = useMutation({
    mutationFn: (id: string) => hrService.terminateLoan(id),
    onSuccess: () => {
      toast.success("Prêt clôturé");
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: () => toast.error("Action impossible"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => hrService.deleteLoan(id),
    onSuccess: () => {
      toast.success("Supprimé");
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
    onError: () => toast.error("Suppression impossible"),
  });

  const filteredLoans = useMemo(() => {
    return (loans || []).filter((loan) => {
      const fullName = `${loan.employe?.prenom ?? ""} ${loan.employe?.nom ?? ""}`.toLowerCase();
      const matchesSearch = fullName.includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || loan.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [loans, searchQuery, typeFilter]);

  const getTypeBadge = (type: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      PRET: { label: "Prêt", className: "bg-blue-100 text-blue-800" },
      AVANCE: { label: "Avance", className: "bg-purple-100 text-purple-800" },
    };
    const badge = badges[type] || badges.PRET;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      EN_COURS: { label: "En cours", className: "bg-green-100 text-green-800" },
      TERMINE: { label: "Terminé", className: "bg-gray-100 text-gray-800" },
      ANNULE: { label: "Annulé", className: "bg-yellow-100 text-yellow-800" },
    };
    const badge = badges[status] || badges.EN_COURS;
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Avances & Prêts</h1>
          <p className="text-muted-foreground mt-2">Gestion des avances sur salaire et prêts aux employés</p>
        </div>
        <Button className="flex items-center gap-2" onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4" />
          Nouvelle demande
        </Button>
      </div>

      {showForm && (
        <Card className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Employé</Label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.employeId}
                onChange={(e) => setForm({ ...form, employeId: e.target.value })}
              >
                <option value="">Choisir</option>
                {employees.map((e: Employee) => (
                  <option key={e.id} value={e.id}>{`${e.firstName} ${e.lastName}`}</option>
                ))}
              </select>
            </div>
            <div>
              <Label>Type</Label>
              <select
                className="w-full border rounded px-3 py-2"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
              >
                <option value="AVANCE">Avance</option>
                <option value="PRET">Prêt</option>
              </select>
            </div>
            <div>
              <Label>Motif</Label>
              <Input value={form.motif} onChange={(e) => setForm({ ...form, motif: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Montant initial</Label>
              <Input type="number" value={form.montantInitial} onChange={(e) => setForm({ ...form, montantInitial: e.target.value })} />
            </div>
            <div>
              <Label>Déduction mensuelle</Label>
              <Input type="number" value={form.deductionMensuelle} onChange={(e) => setForm({ ...form, deductionMensuelle: e.target.value })} />
            </div>
            <div>
              <Label>Date de début</Label>
              <Input type="date" value={form.dateDebut} onChange={(e) => setForm({ ...form, dateDebut: e.target.value })} />
            </div>
            <div>
              <Label>Date de fin (optionnel)</Label>
              <Input type="date" value={form.dateFin} onChange={(e) => setForm({ ...form, dateFin: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
              {createMutation.isPending ? <Spinner className="w-4 h-4" /> : "Enregistrer"}
            </Button>
            <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2 w-full md:w-1/2">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              placeholder="Rechercher un employé..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <select
              className="border rounded px-3 py-2 bg-transparent"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="all">Tous les types</option>
              <option value="AVANCE">Avances</option>
              <option value="PRET">Prêts</option>
            </select>
          </div>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="text-left py-3 px-4">Employé</th>
                <th className="text-left py-3 px-4">Type</th>
                <th className="text-left py-3 px-4">Montant initial</th>
                <th className="text-left py-3 px-4">Restant dû</th>
                <th className="text-left py-3 px-4">Déduction/Mois</th>
                <th className="text-left py-3 px-4">Début</th>
                <th className="text-left py-3 px-4">Fin</th>
                <th className="text-left py-3 px-4">Statut</th>
                <th className="text-left py-3 px-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={9} className="py-6 text-center"><Spinner /></td>
                </tr>
              )}
              {!isLoading && (filteredLoans?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-muted-foreground">Aucune avance ou prêt trouvé</td>
                </tr>
              )}
              {filteredLoans?.map((loan) => (
                <tr key={loan.id} className="border-b last:border-none">
                  <td className="py-3 px-4 font-medium">{`${loan.employe?.prenom ?? ''} ${loan.employe?.nom ?? ''}`}</td>
                  <td className="py-3 px-4">{getTypeBadge(loan.type)}</td>
                  <td className="py-3 px-4">{Number(loan.montantInitial || 0).toLocaleString()} F</td>
                  <td className="py-3 px-4">{Number(loan.restantDu || 0).toLocaleString()} F</td>
                  <td className="py-3 px-4">{Number(loan.deductionMensuelle || 0).toLocaleString()} F</td>
                  <td className="py-3 px-4">{loan.dateDebut?.slice(0, 10)}</td>
                  <td className="py-3 px-4">{loan.dateFin?.slice(0, 10) || '-'}</td>
                  <td className="py-3 px-4">{getStatusBadge(loan.statut)}</td>
                  <td className="py-3 px-4 flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => terminateMutation.mutate(loan.id)} disabled={terminateMutation.isPending || loan.statut === 'TERMINE'}>
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => deleteMutation.mutate(loan.id)} disabled={deleteMutation.isPending}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

