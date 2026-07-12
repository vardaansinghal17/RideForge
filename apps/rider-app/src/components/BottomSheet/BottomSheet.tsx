import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { PanInfo } from 'framer-motion';

interface BottomSheetProps {
  isOpen: boolean;
  height: string;
  children: React.ReactNode;
  onDismiss?: () => void;
  showHandle?: boolean;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  height,
  children,
  onDismiss,
  showHandle = true,
}) => {
  const handleDragEnd = (_event: any, info: PanInfo) => {
    if (info.offset.y > 80 && onDismiss) {
      onDismiss();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed bottom-0 left-0 right-0 z-30 w-full max-w-md mx-auto select-none"
          style={{
            height,
            background: 'var(--rx-sheet-bg)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderTop: '1px solid var(--rx-sheet-border)',
            borderRadius: '24px 24px 0 0',
            boxShadow: 'var(--rx-sheet-shadow)',
          }}
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 32, stiffness: 320 }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={{ top: 0, bottom: 0.4 }}
          onDragEnd={handleDragEnd}
        >
          {showHandle && <div className="sheet-handle cursor-grab active:cursor-grabbing" />}
          <div
            className="overflow-y-auto px-5 pb-8 no-scrollbar"
            style={{ maxHeight: `calc(${height} - 40px)` }}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
