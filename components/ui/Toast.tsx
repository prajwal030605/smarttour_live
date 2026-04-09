'use client';

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  visible: boolean;
  onClose: () => void;
  duration?: number;
}

const typeStyles: Record<ToastType, string> = {
  success: 'bg-emerald-500/90 border-emerald-400',
  error: 'bg-red-500/90 border-red-400',
  info: 'bg-blue-500/90 border-blue-400',
};

const typeIcons: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

export function Toast({
  message,
  type = 'info',
  visible,
  onClose,
  duration = 4000,
}: ToastProps) {
  useEffect(() => {
    if (!visible || duration <= 0) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [visible, duration, onClose]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg flex items-center gap-3 ${typeStyles[type]}`}
        >
          <span className="text-xl font-bold">{typeIcons[type]}</span>
          <span className="text-white font-medium">{message}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
