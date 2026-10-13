import React from 'react';

interface GeminiIconProps {
  className?: string;
  size?: number;
}

/**
 * Authentic Google Gemini 4-Pointed Celestial Star Sparkle
 */
export const GeminiStarIcon: React.FC<GeminiIconProps & { fill?: string }> = ({
  className = 'w-5 h-5',
  size = 20,
  fill = 'currentColor',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path
        d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z"
        fill={fill}
      />
      {/* Delicate secondary sparkles */}
      <circle cx="18.5" cy="5.5" r="1.5" fill={fill} fillOpacity="0.85" />
      <circle cx="5.5" cy="18.5" r="1.2" fill={fill} fillOpacity="0.7" />
    </svg>
  );
};

/**
 * Authentic Google Gemini App Icon with Vibrant Gradient Background ("有底色的图标")
 * As seen in Google Gemini web app, Android app, and Google Workspace
 */
export const GeminiBrandBadge: React.FC<{
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  glow?: boolean;
}> = ({ size = 'md', className = '', glow = true }) => {
  const sizeMap = {
    sm: { box: 'w-7 h-7 rounded-lg', star: 15 },
    md: { box: 'w-8.5 h-8.5 rounded-xl', star: 18 },
    lg: { box: 'w-10 h-10 rounded-2xl', star: 22 },
    xl: { box: 'w-12 h-12 rounded-2xl', star: 26 },
  };

  const { box, star } = sizeMap[size];

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none transition-all duration-200 hover:scale-105 ${box} ${
        glow ? 'shadow-md shadow-indigo-500/25 ring-1 ring-white/20' : ''
      } ${className}`}
      style={{
        background: 'linear-gradient(135deg, #1A73E8 0%, #4F46E5 32%, #9333EA 68%, #EC4899 100%)',
      }}
    >
      {/* Subtle top-light reflection overlay for glass depth */}
      <div className="absolute inset-0 rounded-[inherit] bg-gradient-to-b from-white/25 via-transparent to-black/15 pointer-events-none" />

      {/* Radiant center star glow */}
      <div className="absolute inset-1 rounded-[inherit] bg-white/10 blur-[1px] pointer-events-none" />

      {/* Pure white Gemini celestial star inside */}
      <div className="relative z-10 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]">
        <GeminiStarIcon size={star} fill="#FFFFFF" />
      </div>
    </div>
  );
};

/**
 * Feature Icon Container with Soft Tinted Background ("有底色的功能图标")
 */
export const ColoredFeatureIcon: React.FC<{
  children: React.ReactNode;
  color?: 'blue' | 'indigo' | 'purple' | 'emerald' | 'amber' | 'sky' | 'rose' | 'gemini';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ children, color = 'blue', size = 'md', className = '' }) => {
  const colorStyles = {
    gemini: 'bg-gradient-to-tr from-blue-500/20 via-indigo-500/20 to-purple-500/20 text-indigo-400 border-indigo-500/30',
    blue: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    indigo: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20',
    purple: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    sky: 'bg-sky-500/15 text-sky-400 border-sky-500/20',
    rose: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
  };

  const sizeStyles = {
    sm: 'w-5 h-5 rounded-md text-[10px]',
    md: 'w-6 h-6 rounded-lg text-xs',
    lg: 'w-8 h-8 rounded-xl text-sm',
  };

  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 border transition-colors ${colorStyles[color]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </div>
  );
};
