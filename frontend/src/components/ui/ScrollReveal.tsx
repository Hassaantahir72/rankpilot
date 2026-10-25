'use client';
import { useEffect, useRef, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  type?: 'up' | 'left' | 'right' | 'scale';
}

export default function ScrollReveal({ children, className = '', delay = 0, type = 'up' }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const cls = type === 'left' ? 'reveal-left' : type === 'right' ? 'reveal-right' : type === 'scale' ? 'reveal-scale' : 'reveal';
    el.classList.add(cls);
    if (delay) el.style.transitionDelay = `${delay}ms`;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add('visible'); observer.unobserve(el); } },
      { threshold: 0.12 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [delay, type]);

  return <div ref={ref} className={className}>{children}</div>;
}
