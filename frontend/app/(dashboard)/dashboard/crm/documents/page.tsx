"use client";

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FileText, Upload, Download, Eye, Search, File, FileCheck, BarChart } from 'lucide-react';
import { documentsService } from '@/shared/api/crm/documents.service';
import { Document as CrmDocument } from '@/shared/api/crm/types';

const DocumentsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: apiDocuments = [], isLoading } = useQuery<CrmDocument[]>({
    queryKey: ['documents'],
    queryFn: () => documentsService.getDocuments(),
  });

  const documents = useMemo(() => {
    return apiDocuments.map((doc) => ({
      id: doc.id,
      name: doc.nomFichier || doc.id,
      project: doc.description || '—',
      type: (doc.typeDocument as string) || 'other',
      size: doc.taille ? `${Math.round(doc.taille / 1024)} KB` : '—',
      uploadedBy: (doc as any).uploadedBy || '—',
      uploadDate: doc.dateUpload,
      version: (doc as any).version || '—',
      status: doc.estValide ? 'published' : 'draft',
    }));
  }, [apiDocuments]);

  const stats = {
    totalDocuments: documents.length,
    contracts: documents.filter((d) => d.type === 'contract').length,
    plans: documents.filter((d) => d.type === 'plan').length,
    reports: documents.filter((d) => d.type === 'report').length,
  };

  const filteredDocuments = documents.filter((document) => {
    const matchesSearch =
      document.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || document.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      contract: 'bg-purple-500/10 text-purple-500',
      plan: 'bg-blue-500/10 text-blue-500',
      report: 'bg-green-500/10 text-green-500',
      invoice: 'bg-orange-500/10 text-orange-500',
      other: 'bg-gray-500/10 text-gray-500',
    };
    return colors[type] || colors.other;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-yellow-500/10 text-yellow-500',
      published: 'bg-green-500/10 text-green-500',
      archived: 'bg-gray-500/10 text-gray-500',
    };
    return colors[status] || colors.draft;
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Documents Projets</h1>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Uploader document
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalDocuments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contrats</CardTitle>
            <File className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contracts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plans</CardTitle>
            <FileCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.plans}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rapports</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reports}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Bibliothèque de documents</CardTitle>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un document..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrer par type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="contract">Contrat</SelectItem>
                <SelectItem value="plan">Plan</SelectItem>
                <SelectItem value="report">Rapport</SelectItem>
                <SelectItem value="invoice">Facture</SelectItem>
                <SelectItem value="other">Autre</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="p-3 text-left font-medium">Nom</th>
                  <th className="p-3 text-left font-medium">Projet</th>
                  <th className="p-3 text-left font-medium">Type</th>
                  <th className="p-3 text-left font-medium">Taille</th>
                  <th className="p-3 text-left font-medium">Téléversé par</th>
                  <th className="p-3 text-left font-medium">Date</th>
                  <th className="p-3 text-left font-medium">Version</th>
                  <th className="p-3 text-left font-medium">Statut</th>
                  <th className="p-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDocuments.map((document) => (
                  <tr key={document.id} className="border-t hover:bg-muted/50">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{document.name}</span>
                      </div>
                    </td>
                    <td className="p-3">{document.project}</td>
                    <td className="p-3">
                      <Badge className={getTypeColor(document.type)}>
                        {document.type}
                      </Badge>
                    </td>
                    <td className="p-3">{document.size}</td>
                    <td className="p-3">{document.uploadedBy}</td>
                    <td className="p-3">
                      {document.uploadDate ? new Date(document.uploadDate).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="p-3">{document.version}</td>
                    <td className="p-3">
                      <Badge className={getStatusColor(document.status)}>
                        {document.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DocumentsPage;
