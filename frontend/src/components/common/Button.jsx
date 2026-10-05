export default function Button({
  children,
  variant = 'primary',
  size = 'medium',
  type = 'button',
  disabled = false,
  onClick,
  className = '',
  ...rest
}) {
  const baseClasses =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed outline-none';

  const variants = {
    primary:
      'bg-[#18A968] hover:bg-[#15945b] text-white shadow-sm active:scale-[0.99]',
    secondary:
      'bg-[#f5f6f8] hover:bg-[#ebedf1] text-[#273142] border border-[#e4e8ec]',
    outline:
      'bg-transparent hover:bg-[#f5f6f8] text-[#273142] border border-[#e4e8ec]',
    ghost:
      'bg-transparent hover:bg-[#f5f6f8] text-[#727c86] hover:text-[#273142]',
    danger:
      'bg-[#d95353] hover:bg-[#c94545] text-white',
  };

  const sizes = {
    small: 'text-xs h-8 px-3 gap-1.5',
    medium: 'text-sm h-10 px-4 gap-2',
    large: 'text-base h-12 px-6 gap-2.5',
  };

  const combinedClass = `${baseClasses} ${variants[variant] || variants.primary} ${sizes[size] || sizes.medium} ${className}`.trim();

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={combinedClass}
      {...rest}
    >
      {children}
    </button>
  );
}
