'use client'
import React from 'react'
import dynamic from 'next/dynamic'
import { Toaster } from '@/components/ui/sonner'

const OfflineIndicator = dynamic(() => import("@/components/OfflineIndicator"), { ssr: false });
const ServiceWorkerRegistrar = dynamic(() => import("@/components/ServiceWorkerRegistrar"), { ssr: false });
const SmartSidebar = dynamic(() => import("@/components/sidebar/SmartSidebar"), { ssr: false });

export default function SystemWidgets() {
  return (
    <>
      <Toaster position="top-center" richColors theme="dark" />
      <OfflineIndicator />
      <ServiceWorkerRegistrar />
      <SmartSidebar />
    </>
  )
}

