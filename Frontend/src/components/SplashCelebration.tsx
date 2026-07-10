import React from 'react';
import { motion } from 'motion/react';
import { Milk, Droplets } from 'lucide-react';

interface SplashCelebrationProps {
  onComplete: () => void;
}

export default function SplashCelebration({ onComplete }: SplashCelebrationProps) {
  React.useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950 text-white"
    >
      {/* Background glowing bubbles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25"> <motion.div
          animate={{
            y: [-10, -120],
            opacity: [0, 0.8, 0],
            scale: [0.8, 1.2, 0.8]
          }}
          transition={{ repeat: Infinity, duration: 4, ease: 'easeOut' }}
          className="absolute bottom-10 left-1/4 w-32 h-32 rounded-full bg-blue-500/20 blur-xl"
        /> <motion.div
          animate={{
            y: [-20, -180],
            opacity: [0, 0.6, 0],
            scale: [1, 1.3, 1]
          }}
          transition={{ repeat: Infinity, duration: 5, delay: 1, ease: 'easeOut' }}
          className="absolute bottom-20 right-1/4 w-40 h-40 rounded-full bg-sky-400/15 blur-2xl"
        /> <motion.div
          animate={{
            y: [-5, -90],
            opacity: [0, 0.7, 0],
            scale: [0.7, 1.1, 0.7]
          }}
          transition={{ repeat: Infinity, duration: 3.5, delay: 2, ease: 'easeOut' }}
          className="absolute bottom-5 left-1/2 w-24 h-24 rounded-full bg-white/10 blur-lg"
        /> </div> <div className="relative text-center max-w-lg px-6 flex flex-col items-center">
        {/* Glowing Main Dairy Icon */}
        <motion.div 
          initial={{ scale: 0.3, opacity: 0, rotate: -45 }}
          animate={{ scale: [0.3, 1.1, 1], opacity: 1, rotate: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative mb-6 flex items-center justify-center group"
        >
          {/* Outer glowing pulsing circle */}
          <div className="absolute inset-0 bg-blue-500/30 rounded-full filter blur-xl animate-pulse"></div> <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 p-0.5 shadow-2xl flex items-center justify-center border border-blue-400/20"> <div className="absolute inset-px rounded-[22px] bg-slate-900/90 flex items-center justify-center"> <Milk className="w-12 h-12 text-blue-400" /> </div>
            {/* Ambient droplet drop animation */}
            <motion.div
              animate={{ y: [0, 6, 0], opacity: [0.5, 1, 0.5] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
              className="absolute -bottom-2 -right-1 bg-blue-500 text-white p-1 rounded-full shadow-lg"
            > <Droplets className="w-4 h-4 fill-current text-white" /> </motion.div> </div> </motion.div>

        {/* Brand Name Text Animation */}
        <div className="space-y-2 select-none"> <motion.h1 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.7, delay: 0.3, ease: 'easeOut' }}
            className="text-3xl sm:text-4xl font-black tracking-tight"
          > <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-blue-200">
              Cheema Milk
            </span> </motion.h1> <motion.p
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 0.9 }}
            transition={{ duration: 0.6, delay: 0.5, ease: 'easeOut' }}
            className="text-xs sm:text-sm font-bold uppercase tracking-[0.25em] text-blue-400 font-mono"
          >
            Distribution & Collection
          </motion.p> </div>

        {/* Bottom Loading Progress Meter */}
        <div className="w-48 h-[3px] bg-slate-800/80 rounded-full overflow-hidden mt-8 relative"> <motion.div
            initial={{ left: '-100%' }}
            animate={{ left: '0%' }}
            transition={{ duration: 1.5, ease: 'linear' }}
            className="absolute top-0 bottom-0 left-0 w-full bg-gradient-to-r from-blue-500 via-sky-400 to-indigo-600 rounded-full"
          /> </div> </div> </motion.div>
  );
}
