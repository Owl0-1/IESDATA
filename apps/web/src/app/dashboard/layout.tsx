'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { useAuthStore } from '@/stores/auth-store';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!accessToken) {
      router.replace('/login');
    }
  }, [accessToken, router]);

  if (!accessToken) {
    return null;
  }

  return <DashboardShell>{children}</DashboardShell>;
}
