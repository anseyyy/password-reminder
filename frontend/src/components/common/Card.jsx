export default function Card({ children, className = '', ...rest }) {
  return (
    <div
      className={`rounded-2xl border border-[#edf0f2] bg-white p-6 shadow-[0_2px_12px_rgba(20,30,40,0.035)] ${className}`.trim()}
      {...rest}
    >
      {children}
    </div>
  );
}
