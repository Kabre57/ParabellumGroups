'use client';

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Settings, Save, Database, Mail, Bell, Shield, Globe } from 'lucide-react';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'Général', icon: Settings },
    { id: 'database', label: 'Base de données', icon: Database },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'security', label: 'Sécurité', icon: Shield },
    { id: 'localization', label: 'Localisation', icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Paramètres Système</h1>
          <p className="text-muted-foreground mt-2">
            Configuration générale de l'application Parabellum ERP
          </p>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Navigation latérale */}
        <div className="col-span-3">
          <Card className="p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                      : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
                  }`}
                >
                  <tab.icon className="mr-3 h-5 w-5" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Contenu */}
        <div className="col-span-9">
          <Card className="p-6">
            {activeTab === 'general' && <GeneralSettings />}
            {activeTab === 'database' && <DatabaseSettings />}
            {activeTab === 'notifications' && <NotificationSettings />}
            {activeTab === 'email' && <EmailSettings />}
            {activeTab === 'security' && <SecuritySettings />}
            {activeTab === 'localization' && <LocalizationSettings />}
          </Card>
        </div>
      </div>
    </div>
  );
}

function GeneralSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Paramètres Généraux</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nom de l'entreprise</label>
            <Input defaultValue="Parabellum Groups" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email contact</label>
            <Input type="email" defaultValue="contact@parabellum.com" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Fuseau horaire</label>
            <select className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
              <option>Europe/Paris (GMT+1)</option>
              <option>America/New_York (GMT-5)</option>
              <option>Asia/Tokyo (GMT+9)</option>
            </select>
          </div>
        </div>
      </div>
      <div className="pt-4 border-t">
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Enregistrer les modifications
        </Button>
      </div>
    </div>
  );
}

function DatabaseSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Configuration Base de Données</h2>
        <div className="space-y-4">
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <Database className="h-5 w-5" />
              <span className="font-medium">Connexion active</span>
            </div>
            <p className="text-sm text-green-600 dark:text-green-500 mt-1">
              PostgreSQL 15.2 - 12 microservices connectés
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">URL de connexion</label>
            <Input type="password" defaultValue="postgresql://localhost:5432/parabellum" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Pool min</label>
              <Input type="number" defaultValue="2" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Pool max</label>
              <Input type="number" defaultValue="10" />
            </div>
          </div>
        </div>
      </div>
      <div className="pt-4 border-t">
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function NotificationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Préférences de Notifications</h2>
        <div className="space-y-4">
          {[
            { label: 'Notifications par email', description: 'Recevoir les alertes importantes par email' },
            { label: 'Notifications push', description: 'Notifications en temps réel dans l\'application' },
            { label: 'Résumé quotidien', description: 'Résumé quotidien des activités envoyé à 8h' },
            { label: 'Alertes système', description: 'Notifications critiques système et sécurité' },
          ].map((item) => (
            <label key={item.label} className="flex items-start gap-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
              <input type="checkbox" defaultChecked className="mt-1" />
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{item.description}</div>
              </div>
            </label>
          ))}
        </div>
      </div>
      <div className="pt-4 border-t">
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function EmailSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Configuration SMTP</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Serveur SMTP</label>
            <Input defaultValue="smtp.gmail.com" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Port</label>
              <Input type="number" defaultValue="587" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Sécurité</label>
              <select className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
                <option>TLS</option>
                <option>SSL</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Email expéditeur</label>
            <Input type="email" defaultValue="noreply@parabellum.com" />
          </div>
        </div>
      </div>
      <div className="pt-4 border-t">
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function SecuritySettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Sécurité</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Durée session (minutes)</label>
            <Input type="number" defaultValue="60" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Tentatives connexion max</label>
            <Input type="number" defaultValue="5" />
          </div>
          <label className="flex items-start gap-3 p-3 border rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
            <input type="checkbox" defaultChecked className="mt-1" />
            <div>
              <div className="font-medium">Authentification à deux facteurs (2FA)</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Exiger 2FA pour tous les utilisateurs</div>
            </div>
          </label>
        </div>
      </div>
      <div className="pt-4 border-t">
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}

function LocalizationSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">Localisation</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Langue</label>
            <select className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
              <option>Français (France)</option>
              <option>English (US)</option>
              <option>Español (España)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Format date</label>
            <select className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
              <option>YYYY-MM-DD</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Devise</label>
            <select className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white">
              <option>EUR (Euro)</option>
              <option>USD (Dollar)</option>
              <option>GBP (Livre)</option>
            </select>
          </div>
        </div>
      </div>
      <div className="pt-4 border-t">
        <Button className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          Enregistrer
        </Button>
      </div>
    </div>
  );
}
