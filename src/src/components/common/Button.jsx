import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  loadingText,
  icon: Icon,
  className = '',
  fullWidth = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-bold rounded-xl transition-all duration-200 focus:outline-none focus:ring-4 select-none active:scale-[0.98] disabled:opacity-60 disabled:pointer-events-none disabled:active:scale-100 farmer-touch-target shadow-sm';

  const variants = {
    primary: 'bg-agri-600 hover:bg-agri-700 text-white shadow-farmer hover:shadow-farmer-lg focus:ring-agri-200 border-2 border-agri-700/20',
    secondary: 'bg-agri-100 hover:bg-agri-200 text-agri-900 focus:ring-agri-200 border border-agri-300',
    accent: 'bg-amber-500 hover:bg-amber-600 text-stone-950 font-extrabold focus:ring-amber-200 shadow-sm border border-amber-600/30',
    outline: 'bg-white hover:bg-agri-50 text-agri-800 border-2 border-agri-600 focus:ring-agri-100',
    earth: 'bg-earth-100 hover:bg-earth-200 text-earth-900 border border-earth-300 focus:ring-earth-200',
    ghost: 'bg-transparent hover:bg-black/5 text-agri-800 focus:ring-agri-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-200',
  };

  const sizes = {
    sm: 'text-sm px-3.5 py-2 min-h-[40px] gap-1.5',
    md: 'text-base px-5 py-3 min-h-[48px] gap-2',
    lg: 'text-lg px-7 py-4 min-h-[56px] gap-2.5 font-extrabold',
    xl: 'text-xl px-8 py-5 min-h-[64px] gap-3 font-extrabold tracking-wide',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        ${baseStyles}
        ${variants[variant] || variants.primary}
        ${sizes[size] || sizes.md}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-5 h-5 flex-shrink-0" />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};

export default Button;
