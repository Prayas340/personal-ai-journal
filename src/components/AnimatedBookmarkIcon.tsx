import React, { useEffect, useRef } from 'react';
import lottie, { AnimationItem } from 'lottie-web';
import bookmarkAnimationData from '../assets/bookmark-animation.json';

interface AnimatedBookmarkIconProps {
  className?: string;
  size?: number;
  trigger?: boolean | number;
  isHovered?: boolean;
}

export const AnimatedBookmarkIcon: React.FC<AnimatedBookmarkIconProps> = ({
  className = '',
  size = 16,
  trigger,
  isHovered
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<AnimationItem | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const anim = lottie.loadAnimation({
      container: containerRef.current,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: bookmarkAnimationData,
    });

    animRef.current = anim;

    // Set initial frame to outline bookmark (frame 0)
    anim.goToAndStop(0, true);

    return () => {
      anim.destroy();
      animRef.current = null;
    };
  }, []);

  // Trigger animation when trigger prop changes or when hovered
  useEffect(() => {
    if (trigger !== undefined && trigger && animRef.current) {
      animRef.current.goToAndPlay(0, true);
    }
  }, [trigger]);

  useEffect(() => {
    if (isHovered && animRef.current) {
      animRef.current.goToAndPlay(0, true);
    }
  }, [isHovered]);

  const handleInteraction = () => {
    if (animRef.current) {
      animRef.current.goToAndPlay(0, true);
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleInteraction}
      onClick={handleInteraction}
      className={`inline-flex items-center justify-center overflow-hidden shrink-0 [&>svg]:w-full [&>svg]:h-full ${className}`}
      style={{ width: size, height: size }}
      title="Bookmark"
    />
  );
};
