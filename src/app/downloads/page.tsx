import type { Metadata } from 'next';
import DownloadDashboard from '@/components/download/DownloadDashboard';

export const metadata: Metadata = {
  title: 'Download Center | Play Nexa',
  description: 'Manage active and completed video and audio downloads in Play Nexa.',
};

export default function DownloadsPage() {
  return <DownloadDashboard />;
}
