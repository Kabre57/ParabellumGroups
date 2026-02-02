'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsService } from '@/shared/api/services/analytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { BarChart, FileText, Download, Play } from 'lucide-react';

export default function CRMReportsPage() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ['crm-reports'],
    queryFn: async () => {
      const allReports = await analyticsService.getReports();
      // Filtrer pour ne garder que les rapports liés aux ventes/CRM
      return allReports.filter(r => r.type === 'VENTES' || r.type === 'CUSTOM');
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rapports CRM</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Analyses et rapports de performance commerciale</p>
        </div>
        <Button>
          <BarChart className="mr-2 h-4 w-4" />
          Nouveau rapport
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Rapports disponibles</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Spinner />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du rapport</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Fréquence</TableHead>
                  <TableHead>Dernière mise à jour</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports?.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        {report.nom}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{report.type}</Badge>
                    </TableCell>
                    <TableCell>{report.format}</TableCell>
                    <TableCell>{report.frequence}</TableCell>
                    <TableCell>{new Date(report.updatedAt).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" title="Exécuter">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" title="Télécharger">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!reports || reports.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      Aucun rapport configuré
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
