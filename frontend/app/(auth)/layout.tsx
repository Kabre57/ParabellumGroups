'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/shared/hooks/useAuth';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !user) return;
    if (user.mustChangePassword && pathname !== '/change-password') {
      router.replace('/change-password');
      return;
    }
    if (!user.mustChangePassword && pathname === '/change-password') {
      router.replace('/select-enterprise');
    }
  }, [isLoading, pathname, router, user]);

  return <>{children}</>;
}
