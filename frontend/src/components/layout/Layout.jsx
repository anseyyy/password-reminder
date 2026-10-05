'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Header from './Header';
import Sidebar from './Sidebar';
import BottomBar from './BottomBar';
import { useAuth } from '@/context/AuthContext';
import Loader from '@/components/common/Loader';

export default function Layout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();

  const isAuthPage =
    pathname?.startsWith('/auth') ||
    pathname?.startsWith('/login') ||
    pathname?.startsWith('/register');

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated && !isAuthPage) {
      router.replace('/auth/login');
    } else if (isAuthenticated && isAuthPage) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, isAuthPage, router]);

  if (loading) {
    return <Loader fullScreen label="Loading RemindPro..." />;
  }

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-[#f5f6f8]">
      <Sidebar />

      <div className="flex min-h-screen flex-col bg-[#f5f6f8] lg:ml-[274px]">
        <Header />

        <main className="min-w-0 flex-1 px-4 py-4 pb-24 lg:pb-6"> 
          {children}
        </main>
      </div>

      <BottomBar />
    </div>
  );
}
