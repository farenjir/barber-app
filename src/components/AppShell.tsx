'use client';

import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { cn } from '@/lib/utils';

interface AppShellProps {
  children: ReactNode;
  userName: string;
  userRole: 'barber' | 'super_admin';
  barberName?: string;
  pageTitle: string;
}

export function AppShell({ children, userName, userRole, barberName, pageTitle }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar userName={userName} userRole={userRole} barberName={barberName} />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b border-border bg-card px-6 py-4">
          <h2 className="text-2xl font-bold text-foreground">{pageTitle}</h2>
        </header>
        
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
