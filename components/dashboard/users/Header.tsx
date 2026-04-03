// components/dashboard/Header.tsx
'use client';

import { useTheme } from 'next-themes';
import { Bell, Moon, Sun, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Header({ user }: { user: any }) {
  const { theme, setTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-8 py-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <button className="lg:hidden p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl">
          <Menu className="w-6 h-6" />
        </button>
        
        <div className="hidden md:block">
          <h2 className="font-semibold text-xl">Welcome back, {user?.full_name?.split(" ")[0] || "User"} 👋</h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Theme Toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition"
        >
          {theme === 'dark' ? (
            <Sun className="w-5 h-5" />
          ) : (
            <Moon className="w-5 h-5" />
          )}
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-3 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-2xl transition relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          {/* Notification Dropdown (Simple version) */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-xl py-4 z-50">
              <div className="px-6 py-2 text-sm font-semibold border-b">Notifications</div>
              <div className="p-6 text-center text-sm text-zinc-500">
                No new notifications
              </div>
            </div>
          )}
        </div>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium">{user?.full_name || "Customer"}</p>
            <p className="text-xs text-zinc-500">Customer</p>
          </div>
          
          <div className="w-9 h-9 rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-700">
            {user?.avatar_url ? (
              <img 
                src={user.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-black flex items-center justify-center text-white text-sm font-bold">
                {user?.full_name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}