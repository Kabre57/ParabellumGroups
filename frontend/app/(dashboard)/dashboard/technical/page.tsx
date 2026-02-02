'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Wrench, Users, ClipboardCheck } from 'lucide-react';

export default function TechnicalPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Module Technique</h1>
        <p className="text-muted-foreground mt-2">
          Gestion des interventions techniques, spécialités et rapports
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              Spécialités
            </CardTitle>
            <CardDescription>
              Gérer les spécialités techniques
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Interventions
            </CardTitle>
            <CardDescription>
              Planifier et suivre les interventions sur le terrain
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              Rapports
            </CardTitle>
            <CardDescription>
              Consulter les rapports d&apos;intervention et les photos
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Tabs defaultValue="specialites" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="specialites">Spécialités</TabsTrigger>
          <TabsTrigger value="interventions">Interventions</TabsTrigger>
          <TabsTrigger value="rapports">Rapports</TabsTrigger>
        </TabsList>

        <TabsContent value="specialites">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Spécialités</CardTitle>
              <CardDescription>
                Accédez à la page des spécialités pour gérer les différentes spécialités techniques
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="interventions">
          <Card>
            <CardHeader>
              <CardTitle>Gestion des Interventions</CardTitle>
              <CardDescription>
                Accédez à la page des interventions pour planifier et suivre les interventions
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="rapports">
          <Card>
            <CardHeader>
              <CardTitle>Rapports d&apos;Intervention</CardTitle>
              <CardDescription>
                Accédez à la page des rapports pour consulter les rapports d&apos;intervention
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
