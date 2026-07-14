import React from 'react';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'neutral',
  children,
  dot = true,
  className = '',
}) => {
  let styleClass = '';

  if (variant === 'success') {
    styleClass = 'bg-[var(--rx-green-dim)] text-[var(--rx-green)]';
  } else if (variant === 'warning') {
    styleClass = 'bg-[var(--rx-orange-dim)] text-[var(--rx-orange)]';
  } else if (variant === 'error') {
    styleClass = 'bg-[var(--rx-red-dim)] text-[var(--rx-red)]';
  } else if (variant === 'info') {
    styleClass = 'bg-[var(--rx-blue-dim)] text-[var(--rx-blue)]';
  } else if (variant === 'neutral') {
    styleClass = 'bg-[var(--rx-bg-3)] text-[var(--rx-text-2)]';
  }

  return (
    <div
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-medium select-none ${styleClass} ${className}`}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full mr-1.5 flex-shrink-0"
          style={{ backgroundColor: 'currentColor' }}
        />
      )}
      {children}
    </div>
  );
};
