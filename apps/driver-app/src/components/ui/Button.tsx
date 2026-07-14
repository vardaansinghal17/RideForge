import React from 'react';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'icon';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}) => {
  let variantClass = '';
  if (variant === 'primary') {
    variantClass = 'btn-blue';
  } else if (variant === 'ghost') {
    variantClass = 'btn-ghost';
  } else if (variant === 'danger') {
    variantClass = 'bg-transparent text-[var(--rx-red)] border border-transparent hover:border-[var(--rx-red)] transition-all rounded-[14px]';
  } else if (variant === 'icon') {
    variantClass = 'w-[44px] h-[44px] rounded-full flex items-center justify-center bg-[var(--rx-glass)] border border-[var(--rx-glass-border)] hover:bg-[var(--rx-glass-hover)] text-white backdrop-blur-[12px] transition-all';
  }

  let sizeClass = '';
  if (variant !== 'icon') {
    if (size === 'sm') {
      sizeClass = 'h-[40px] px-4 text-[13px] font-medium';
    } else if (size === 'md') {
      sizeClass = 'h-[54px] px-6 text-[15px]';
    } else if (size === 'lg') {
      sizeClass = 'h-[60px] px-8 text-[17px]';
    }
  }

  const baseStyles = 'flex items-center justify-center font-semibold outline-none select-none transition-all';
  const widthClass = fullWidth && variant !== 'icon' ? 'w-full' : '';
  const stateClass = (disabled || loading) ? 'opacity-50 pointer-events-none' : '';

  return (
    <motion.button
      type={type}
      className={`${baseStyles} ${variantClass} ${sizeClass} ${widthClass} ${stateClass} ${className}`}
      disabled={disabled || loading}
      whileTap={{ scale: 0.96 }}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-5 w-5 text-current"
          fill="none"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      ) : (
        children
      )}
    </motion.button>
  );
};
