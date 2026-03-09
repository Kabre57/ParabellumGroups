'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus } from 'lucide-react';

export default function AvoirsPage() {
  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Avoirs</h1>
          <p className="text-gray-600 mt-1">Gestion des avoirs et notes de crédit</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Nouvel Avoir
        </Button>
      </div>
      
      <Card className="p-8 text-center">
        <FileText className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <h3 className="text-xl font-semibold mb-2">Fonctionnalité en développement</h3>
        <p className="text-gray-600">La gestion des avoirs sera bientôt disponible.</p>
      </Card>
    </div>
  );
}
