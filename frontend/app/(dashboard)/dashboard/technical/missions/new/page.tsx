'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useCreateMission } from '@/hooks/useTechnical';
import { Mission } from '@/shared/api/services/technical';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { CreateMissionModal } from '@/components/technical/CreateMissionModal'; // Utiliser CreateMissionModal ici

export default function NewMissionPage() {
  const router = useRouter();
  const createMutation = useCreateMission();
  const [isModalOpen, setIsModalOpen] = React.useState(true);

  const handleClose = () => {
    router.back();
  };

  const handleSubmitSuccess = () => {
    router.push('/dashboard/technical/missions');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/technical/missions">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux missions
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nouvelle Mission</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Créer une nouvelle mission d'intervention
          </p>
        </div>
      </div>

      {/* Utiliser CreateMissionModal au lieu de MissionForm */}
      <CreateMissionModal
        isOpen={isModalOpen}
        onClose={handleClose}
      />
    </div>
  );
}