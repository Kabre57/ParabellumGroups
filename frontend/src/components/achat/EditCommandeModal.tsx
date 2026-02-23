"use client";
import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PurchaseOrderStatus } from "@/services/procurement";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultStatus?: PurchaseOrderStatus;
  defaultAmount?: number;
  onSubmit: (data: { status: PurchaseOrderStatus; amount?: number }) => void;
}

export function EditCommandeModal({ isOpen, onClose, defaultStatus = "BROUILLON", defaultAmount, onSubmit }: Props) {
  const [status, setStatus] = useState<PurchaseOrderStatus>(defaultStatus);
  const [amount, setAmount] = useState<string>(defaultAmount?.toString() || "");

  useEffect(() => {
    if (!isOpen) return;
    setStatus(defaultStatus);
    setAmount(defaultAmount?.toString() || "");
  }, [isOpen, defaultStatus, defaultAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ status, amount: amount ? Number(amount) : undefined });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-semibold">Modifier la commande</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Statut</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as PurchaseOrderStatus)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="BROUILLON">Brouillon</option>
              <option value="ENVOYE">Envoyée</option>
              <option value="CONFIRME">Confirmée</option>
              <option value="LIVRE">Livrée</option>
              <option value="ANNULE">Annulée</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Montant total (optionnel)</label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Ne pas modifier"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
