import React from 'react';

interface RocketLogoProps {
  className?: string;
  size?: number | string;
}

/**
 * RocketLogo component rendering the user-requested Rocket Launch icon
 * from Flaticon UIcons (@flaticon/flaticon-uicons fi-sr-rocket-lunch)
 * with inline SVG vector geometry fallback.
 */
export const RocketLogo: React.FC<RocketLogoProps> = ({
  className = 'w-5 h-5 text-white',
  size = 20,
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      role="img"
      aria-label="Personal AI Journal Rocket Logo"
    >
      <i
        className="fi fi-sr-rocket-lunch leading-none block"
        style={{ fontSize: size }}
      />
    </span>
  );
};

export default RocketLogo;
