import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const BottomTabBar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    {
      path: '/',
      label: 'Home',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
        </svg>
      )
    },
    {
      path: '/earnings',
      label: 'Earnings',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5h16.5M3.75 20.25zM3.75 20.25H20.25M3.75 20.25A2.25 2.25 0 011.5 18V6.25A2.25 2.25 0 013.75 4h16.5A2.25 2.25 0 0122.5 6.25v11.75a2.25 2.25 0 01-2.25 2.25H3.75z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4.5m0 0a1.5 1.5 0 001.5 1.5M12 13.5a1.5 1.5 0 01-1.5-1.5M12 9a1.5 1.5 0 011.5-1.5M12 9a1.5 1.5 0 00-1.5 1.5" />
        </svg>
      )
    },
    {
      path: '/history',
      label: 'History',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      path: '/ratings',
      label: 'Ratings',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499c.172-.436.782-.436.954 0l2.22 4.817a.59.59 0 00.45.326l5.244.706c.476.064.667.65.31.986l-3.89 3.69a.59.59 0 00-.173.533l1.01 5.088c.09.458-.415.828-.821.57l-4.636-2.584a.59.59 0 00-.543 0l-4.636 2.584c-.406.257-.911-.113-.822-.57l1.01-5.088a.59.59 0 00-.173-.533l-3.89-3.69c-.356-.336-.165-.922.31-.986l5.244-.706a.59.59 0 00.45-.326l2.22-4.817z" />
        </svg>
      )
    },
    {
      path: '/profile',
      label: 'Profile',
      icon: (active: boolean) => (
        <svg xmlns="http://www.w3.org/2000/svg" fill={active ? "currentColor" : "none"} viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      )
    }
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 bg-gradient-to-t from-[var(--rx-bg)] via-[var(--rx-bg)]/80 to-transparent">
      <div className="max-w-md mx-auto glass-card flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => {
          const active = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full rounded-xl transition-all duration-200 ${
                active
                  ? 'text-[var(--rx-blue)] scale-105'
                  : 'text-[var(--rx-text-3)] hover:text-[var(--rx-text-2)]'
              }`}
            >
              {tab.icon(active)}
              <span className="text-[10px] font-medium mt-1 select-none">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
