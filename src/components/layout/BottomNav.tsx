'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Gamepad2, Download, User } from 'lucide-react';

interface NavTab {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; size?: number; strokeWidth?: number }>;
}

const tabs: NavTab[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/games', label: 'Game Hub', icon: Gamepad2 },
  { href: '/download', label: 'Download', icon: Download },
  { href: '/profile', label: 'Me', icon: User },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string): boolean => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-[#232338] bg-[#0D0D15]/95 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.6)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-[68px] max-w-md items-center justify-around px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group flex min-h-[48px] min-w-[64px] flex-col items-center justify-center rounded-xl py-1 px-3 transition-all duration-150 active:scale-95 ${
                active ? 'text-[#7C3AED]' : 'text-[#8E8EA0] hover:text-[#D1D5DB]'
              }`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <div
                className={`relative flex items-center justify-center rounded-full px-3 py-1 transition-all duration-150 ${
                  active ? 'bg-[#7C3AED]/15' : 'bg-transparent'
                }`}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.4 : 1.8}
                  className="transition-transform duration-150"
                />
              </div>
              <span
                className={`mt-0.5 text-[11px] tracking-tight transition-colors duration-150 ${
                  active ? 'font-bold text-[#7C3AED]' : 'font-medium text-[#8E8EA0]'
                }`}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

