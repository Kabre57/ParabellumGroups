'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Shield, Plus, Search, Edit, Trash2 } from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  roles: string[];
}

export default function PermissionsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: permissions, isLoading } = useQuery<Permission[]>({
    queryKey: ['permissions'],
    queryFn: async () => {
      return [
        { id: '1', name: 'Voir tableau de bord', code: 'dashboard.read', description: 'Accès au tableau de bord principal', category: 'Dashboard', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
        { id: '2', name: 'Gérer clients', code: 'customers.manage', description: 'Créer, modifier, supprimer des clients', category: 'CRM', roles: ['ADMIN', 'MANAGER'] },
        { id: '3', name: 'Voir clients', code: 'customers.read', description: 'Consulter la liste des clients', category: 'CRM', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
        { id: '4', name: 'Créer devis', code: 'quotes.create', description: 'Créer de nouveaux devis', category: 'Commercial', roles: ['ADMIN', 'MANAGER'] },
        { id: '5', name: 'Approuver devis', code: 'quotes.approve', description: 'Approuver ou rejeter des devis', category: 'Commercial', roles: ['ADMIN'] },
        { id: '6', name: 'Gérer factures', code: 'invoices.manage', description: 'Créer et gérer les factures', category: 'Facturation', roles: ['ADMIN', 'ACCOUNTANT'] },
        { id: '7', name: 'Voir factures', code: 'invoices.read', description: 'Consulter les factures', category: 'Facturation', roles: ['ADMIN', 'ACCOUNTANT', 'MANAGER'] },
        { id: '8', name: 'Gérer projets', code: 'projects.manage', description: 'Créer et gérer les projets', category: 'Projets', roles: ['ADMIN', 'MANAGER'] },
        { id: '9', name: 'Voir projets', code: 'projects.read', description: 'Consulter les projets', category: 'Projets', roles: ['ADMIN', 'MANAGER', 'EMPLOYEE'] },
        { id: '10', name: 'Gérer interventions', code: 'interventions.manage', description: 'Planifier et gérer interventions', category: 'Technique', roles: ['ADMIN', 'MANAGER'] },
        { id: '11', name: 'Gérer employés', code: 'employees.manage', description: 'Gérer les employés', category: 'RH', roles: ['ADMIN'] },
        { id: '12', name: 'Voir employés', code: 'employees.read', description: 'Consulter les employés', category: 'RH', roles: ['ADMIN', 'MANAGER'] },
        { id: '13', name: 'Gérer achats', code: 'purchases.manage', description: 'Créer et gérer commandes d\'achat', category: 'Achats', roles: ['ADMIN', 'PURCHASING_MANAGER'] },
        { id: '14', name: 'Audit stock', code: 'inventory.audit', description: 'Effectuer audits de stock', category: 'Achats', roles: ['ADMIN', 'PURCHASING_MANAGER'] },
        { id: '15', name: 'Rapports financiers', code: 'reports.financial', description: 'Générer rapports financiers', category: 'Comptabilité', roles: ['ADMIN', 'ACCOUNTANT'] },
      ];
    },
  });

  const categories = ['all', ...new Set(permissions?.map(p => p.category) || [])];

  const filteredPermissions = permissions?.filter(permission => {
    const matchesSearch = permission.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         permission.code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || permission.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestion des Permissions</h1>
          <p className="text-muted-foreground mt-2">
            Configuration des droits d'accès et permissions système
          </p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nouvelle Permission
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Permissions</p>
              <p className="text-2xl font-bold">{permissions?.length || 0}</p>
            </div>
            <Shield className="h-8 w-8 text-blue-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Catégories</p>
              <p className="text-2xl font-bold">{categories.length - 1}</p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Rôles Système</p>
              <p className="text-2xl font-bold">6</p>
            </div>
            <Shield className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une permission..."
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-md dark:bg-gray-800 dark:border-gray-700"
          >
            <option value="all">Toutes les catégories</option>
            {categories.filter(c => c !== 'all').map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </Card>

      {/* Permissions Table */}
      <Card className="p-6">
        {isLoading ? (
          <div className="text-center py-8">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-sm">Permission</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Code</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Catégorie</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Rôles Autorisés</th>
                  <th className="text-left py-3 px-4 font-semibold text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPermissions?.map((permission) => (
                  <tr key={permission.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-3 px-4 font-medium">{permission.name}</td>
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                        {permission.code}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                        {permission.category}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {permission.description}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        {permission.roles.map(role => (
                          <Badge key={role} className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 text-xs">
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
