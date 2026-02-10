"use client";

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Users, Clock, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectsService } from '@/shared/api/projects/projects.service';
import { Project } from '@/shared/api/shared/types';

interface Event {
  id: string;
  title: string;
  project: string;
  type: 'meeting' | 'deadline' | 'task';
  date: string;
  time: string;
  duration: number;
  attendees: string[];
  status: 'scheduled' | 'completed' | 'cancelled';
}

const CalendarPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: projectsResponse, isLoading } = useQuery({
    queryKey: ['projects-calendar'],
    queryFn: () => projectsService.getProjects({ limit: 200 }),
  });

  const events: Event[] = useMemo(() => {
    const projects: Project[] = projectsResponse?.data || [];
    return projects
      .filter((p) => p.startDate || p.endDate)
      .map((p) => ({
        id: p.id,
        title: p.name,
        project: p.clientName || p.customer?.companyName || 'Projet',
        type: 'deadline',
        date: p.endDate || p.startDate,
        time: '00:00',
        duration: 0,
        attendees: [],
        status: 'scheduled',
      }));
  }, [projectsResponse]);

  const stats = {
    totalEvents: events.length,
    meetings: events.filter((e) => e.type === 'meeting').length,
    deadlines: events.filter((e) => e.type === 'deadline').length,
    occupationRate: events.length ? 80 : 0,
  };

  const filteredEvents = events.filter((event) =>
    event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.project.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getTypeColor = (type: Event['type']) => {
    const colors = {
      meeting: 'bg-blue-500/10 text-blue-500',
      deadline: 'bg-red-500/10 text-red-500',
      task: 'bg-green-500/10 text-green-500',
    };
    return colors[type];
  };

  const getStatusColor = (status: Event['status']) => {
    const colors = {
      scheduled: 'bg-yellow-500/10 text-yellow-500',
      completed: 'bg-green-500/10 text-green-500',
      cancelled: 'bg-gray-500/10 text-gray-500',
    };
    return colors[status];
  };

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Planning Projets</h1>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Nouvel événement
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Réunions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.meetings}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deadlines</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.deadlines}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux occupation</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.occupationRate}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Calendrier</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-medium">
                {currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
              </span>
              <Button variant="outline" size="sm">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un événement..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{event.title}</h3>
                    <Badge className={getTypeColor(event.type)}>
                      {event.type}
                    </Badge>
                    <Badge className={getStatusColor(event.status)}>
                      {event.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>Projet: {event.project}</p>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(event.date).toLocaleDateString('fr-FR')}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {event.time}
                      </span>
                      {event.attendees.length > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {event.attendees.length} participant(s)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    Modifier
                  </Button>
                  <Button variant="outline" size="sm">
                    Détails
                  </Button>
                </div>
              </div>
            ))}
            {filteredEvents.length === 0 && (
              <div className="text-sm text-muted-foreground">Aucun événement trouvé.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarPage;
