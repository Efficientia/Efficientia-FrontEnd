import React from 'react';
import { LogoBoiIcon } from '../icons';
import './BrandLogo.css';

export interface BrandLogoProps {
  variant?: 'light' | 'dark' | 'auto';
  size?: number | string;
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'auto',
  size = 38,
  showTagline = true,
  className = '',
  onClick,
}) => {
  return (
    <div
      className={`eff-brand-header ${variant !== 'auto' ? `eff-brand-${variant}` : ''} ${className}`}
      onClick={onClick}
    >
      <LogoBoiIcon size={size} variant={variant} className="eff-brand-icon" />
      <div className="eff-brand-text">
        <span className="eff-brand-title">
          Efficient<span className="eff-brand-ia">ia</span>
        </span>
        {showTagline && (
          <span className="eff-brand-tagline">
            Eficiência que viaja junto com você.
          </span>
        )}
      </div>
    </div>
  );
};
