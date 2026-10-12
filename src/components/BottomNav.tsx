import React from 'react';
import { Home, Ticket, Compass, User } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'tickets', icon: Ticket, label: 'Tickets' },
    { id: 'track', icon: Compass, label: 'Track' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 flex justify-around items-center z-40 shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            id={`nav-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 py-2 px-4 rounded-xl transition-all duration-300 ${
              isActive
                ? 'bg-indigo-50 text-[#1A1F71] font-medium scale-105'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            {isActive && (
              <span className="text-xs tracking-tight font-semibold">
                {tab.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
