import { motion } from 'framer-motion';
import { ReactNode } from 'react';

export function FloatingPanel({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className='glass p-4 absolute top-10 right-10 w-[300px] shadow-xl'
    >
      {children}
    </motion.div>
  );
}
