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
    if (href === '/games') {
      return pathname === '/games' || pathname.startsWith('/games/');
    }
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-[9999] border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md shadow-[0_-8px_24px_rgba(0,0,0,0.7)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex h-[62px] max-w-md items-center justify-around px-2">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`group relative flex min-h-[44px] min-w-[60px] flex-col items-center justify-center rounded-xl py-1 px-2.5 transition-all duration-150 active:scale-95 ${
                active ? 'text-purple-400 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              aria-label={tab.label}
              aria-current={active ? 'page' : undefined}
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.9}
                  className={`transition-all duration-200 ${
                    active ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : ''
                  }`}
                />
              </div>

              <span
                className={`mt-1 text-[11px] leading-tight transition-colors duration-150 ${
                  active ? 'font-bold text-purple-400' : 'font-medium text-zinc-400'
                }`}
              >
                {tab.label}
              </span>

              {/* Active subtle pill dot */}
              {active && (
                <span className="absolute bottom-1 w-1 h-1 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
