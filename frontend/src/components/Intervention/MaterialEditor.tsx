// components/Intervention/MaterialEditor.tsx
import React, { useState, useCallback } from 'react';

type MaterialItem = {
  id: string;      // <- key stable
  libelle: string;
  quantite: number;
};

interface MaterialEditorProps {
  value: MaterialItem[];
  onChange: (items: MaterialItem[]) => void;
}

export const MaterialEditor: React.FC<MaterialEditorProps> = ({ value, onChange }) => {
  const [libelle, setLibelle] = useState('');
  const [quantite, setQuantite] = useState<number>(1);

  const addItem = useCallback(() => {
    const trimmed = libelle.trim();
    if (!trimmed || !quantite || quantite <= 0) return;

    const newItem: MaterialItem = {
      id: crypto.randomUUID(), // key stable
      libelle: trimmed,
      quantite: Number(quantite),
    };
    onChange([...value, newItem]);
    setLibelle('');
    setQuantite(1);
  }, [libelle, quantite, value, onChange]);

  const removeItem = useCallback((id: string) => {
    onChange(value.filter(i => i.id !== id));
  }, [value, onChange]);

  const updateItem = useCallback((id: string, patch: Partial<MaterialItem>) => {
    onChange(value.map(i => (i.id === id ? { ...i, ...patch } : i)));
  }, [value, onChange]);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-12 gap-2">
        <input
          className="col-span-7 px-3 py-2 border rounded-md"
          placeholder="Libellé"
          value={libelle}
          onChange={e => setLibelle(e.target.value)}
        />
        <input
          className="col-span-3 px-3 py-2 border rounded-md"
          placeholder="Qté"
          type="number"
          min={1}
          value={quantite}
          onChange={e => setQuantite(Number(e.target.value))}
        />
        <button type="button" className="col-span-2 px-3 py-2 bg-blue-600 text-white rounded-md" onClick={addItem}>
          Ajouter
        </button>
      </div>

      <ul className="divide-y border rounded-md">
        {value.map(item => (
          <li key={item.id} className="flex items-center justify-between p-2">
            <div className="flex-1">
              <div className="font-medium">{item.libelle}</div>
              <div className="text-sm text-gray-500">Qté : {item.quantite}</div>
            </div>
            <div className="flex items-center gap-2">
              <input
                className="w-24 px-2 py-1 border rounded"
                type="number"
                min={1}
                value={item.quantite}
                onChange={e => updateItem(item.id, { quantite: Number(e.target.value) })}
              />
              <button type="button" className="px-2 py-1 border rounded text-red-600" onClick={() => removeItem(item.id)}>
                Supprimer
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};
