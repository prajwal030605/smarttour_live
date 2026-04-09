'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#22c55e', '#eab308'];

function Particle({
  delay,
  duration,
  left,
  drift,
  color,
  size,
}: {
  delay: number;
  duration: number;
  left: number;
  drift: number;
  color: string;
  size: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: 0, rotate: 0 }}
      animate={{
        opacity: 0,
        y: 500,
        x: drift,
        rotate: 720,
      }}
      transition={{ duration, delay, ease: 'easeIn' }}
      className="absolute top-0"
      style={{
        left: `${left}%`,
        width: size,
        height: size,
        backgroundColor: color,
        borderRadius: size > 8 ? 2 : '50%',
        marginLeft: -size / 2,
      }}
    />
  );
}

export default function Confetti({ onComplete }: { onComplete: () => void }) {
  const [particles, setParticles] = useState<Array<{
    id: number;
    delay: number;
    duration: number;
    left: number;
    drift: number;
    color: string;
    size: number;
  }>>([]);

  useEffect(() => {
    const count = 80;
    const items = Array.from({ length: count }, (_, i) => ({
      id: i,
      delay: Math.random() * 0.5,
      duration: 2 + Math.random() * 1.5,
      left: Math.random() * 100,
      drift: (Math.random() - 0.5) * 150,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
    }));
    setParticles(items);

    const timer = setTimeout(onComplete, 4000);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <Particle
          key={p.id}
          delay={p.delay}
          duration={p.duration}
          left={p.left}
          drift={p.drift}
          color={p.color}
          size={p.size}
        />
      ))}
    </div>
  );
}
