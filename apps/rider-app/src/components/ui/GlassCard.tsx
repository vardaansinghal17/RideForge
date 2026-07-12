import React from 'react';
import { motion } from 'framer-motion';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  strong?: boolean;
  onClick?: () => void;
  padding?: string;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  strong = false,
  onClick,
  padding = '20px',
}) => {
  const baseClass = strong ? 'glass-card-strong' : 'glass-card';
  const combinedClass = `${baseClass} ${className}`;

  if (onClick) {
    return (
      <motion.div
        className={`${combinedClass} cursor-pointer`}
        style={{ padding }}
        onClick={onClick}
        whileHover={{ scale: 1.005 }}
        whileTap={{ scale: 0.995 }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={combinedClass} style={{ padding }}>
      {children}
    </div>
  );
};
