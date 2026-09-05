import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';
import animationData from '../assets/loading-animation.json';

interface LottieLoadingProps {
  className?: string;
  size?: number;
}

export const LottieLoading: React.FC<LottieLoadingProps> = ({ className = 'shrink-0', size = 20 }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData,
    });

    return () => {
      anim.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`inline-flex items-center justify-center overflow-hidden [&>svg]:w-full [&>svg]:h-full ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
