"use client";

import { useRef, useEffect, useState, type ReactNode } from "react";

type AnimateInProps = {
  readonly children: ReactNode;
  readonly className?: string;
  readonly delay?: number;
};

export function AnimateIn({ children, className, delay = 0 }: AnimateInProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // On mount, mark as ready for animation
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const el = ref.current;
    if (!el) return;

    // If already in viewport, show immediately
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight * 0.95) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px 50px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  // SSR: fully visible. Client: animate in.
  const shouldAnimate = mounted && !isVisible;

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shouldAnimate ? 0 : 1,
        transform: shouldAnimate ? "translateY(20px)" : "translateY(0)",
        transition: mounted
          ? `opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms, transform 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
          : "none",
      }}
    >
      {children}
    </div>
  );
}
