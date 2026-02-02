'use client';

import React, { useState } from 'react';
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

interface Document {
  id: string;
  name: string;
  project: string;
  type: 'contract' | 'plan' | 'report' | 'invoice' | 'other';
  size: string;
  uploadedBy: string;
  uploadDate: string;
  version: string;
  status: 'draft' | 'published' | 'archived';
}

const DocumentsPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: async () => {
      const mockDocuments: Document[] = [
        {
          id: '1',
          name: 'Contrat ERP - Phase 1.pdf',
          project: 'ERP Implementation',
          type: 'contract',
          size: '2.4 MB',
          uploadedBy: 'John Doe',
          uploadDate: '2026-01-15',
          version: '1.0',
          status: 'published'
        },
        {
          id: '2',
          name: 'Plan projet Website.docx',
          project: 'Website Redesign',
          type: 'plan',
          size: '856 KB',
          uploadedBy: 'Jane Smith',
          uploadDate: '2026-01-18',
          version: '2.1',
          status: 'published'
        },
        {
          id: '3',
          name: 'Rapport mensuel Janvier.xlsx',
          project: 'ERP Implementation',
          type: 'report',
          size: '1.2 MB',
          uploadedBy: 'Bob Wilson',
          uploadDate: '2026-01-20',
          version: '1.0',
          status: 'draft'
        },
        {
          id: '4',
          name: 'Facture F2026-001.pdf',
          project: 'Website Redesign',
          type: 'invoice',
          size: '345 KB',
          uploadedBy: 'Alice Brown',
          uploadDate: '2026-01-19',
          version: '1.0',
          status: 'published'
        },
        {
          id: '5',
          name: 'Spécifications techniques.pdf',
          project: 'Mobile App',
          type: 'other',
          size: '3.8 MB',
          uploadedBy: 'Charlie Davis',
          uploadDate: '2026-01-17',
          version: '1.3',
          status: 'published'
        },
        {
          id: '6',
          name: 'Architecture diagram.png',
          project: 'ERP Implementation',
          type: 'plan',
          size: '1.5 MB',
          uploadedBy: 'John Doe',
          uploadDate: '2026-01-16',
          version: '2.0',
          status: 'published'
        },
        {
          id: '7',
          name: 'Budget prévisionnel.xlsx',
          project: 'Mobile App',
          type: 'report',
          size: '678 KB',
          uploadedBy: 'Jane Smith',
          uploadDate: '2026-01-14',
          version: '1.0',
          status: 'archived'
        },
        {
          id: '8',
          name: 'Cahier des charges.pdf',
          project: 'Website Redesign',
          type: 'other',
          size: '2.1 MB',
          uploadedBy: 'Bob Wilson',
          uploadDate: '2026-01-12',
          version: '1.5',
          status: 'published'
        },
        {
          id: '9',
          name: 'Contrat maintenance.pdf',
          project: 'Mobile App',
          type: 'contract',
          size: '1.8 MB',
          uploadedBy: 'Alice Brown',
          uploadDate: '2026-01-21',
          version: '1.0',
          status: 'draft'
        }
      ];
      return mockDocuments;
    }
  });

  const stats = {
    totalDocuments: documents.length,
    contracts: documents.filter(d => d.type === 'contract').length,
    plans: documents.filter(d => d.type === 'plan').length,
    reports: documents.filter(d => d.type === 'report').length
  };

  const filteredDocuments = documents.filter(document => {
    const matchesSearch = 
      document.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      document.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || document.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: Document['type']) => {
    const colors = {
      contract: 'bg-purple-500/10 text-purple-500',
      plan: 'bg-blue-500/10 text-blue-500',
      report: 'bg-green-500/10 text-green-500',
      invoice: 'bg-orange-500/10 text-orange-500',
      other: 'bg-gray-500/10 text-gray-500'
    };
    return colors[type];
  };

  const getStatusColor = (status: Document['status']) => {
    const colors = {
      draft: 'bg-yellow-500/10 text-yellow-500',
      published: 'bg-green-500/10 text-green-500',
      archived: 'bg-gray-500/10 text-gray-500'
    };
    return colors[status];
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
                      {new Date(document.uploadDate).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="p-3">v{document.version}</td>
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
