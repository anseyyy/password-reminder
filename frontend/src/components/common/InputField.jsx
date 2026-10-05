'use client';

import React, { useId } from 'react';

export default function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = 'text',
  name,
  id,
  disabled = false,
  required = false,
  error,
  helperText,
  icon: Icon,
  className = '',
  ...rest
}) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  const hasIcon = Boolean(Icon);
  const isInvalid = Boolean(error);

  return (
    <div className={`flex w-full flex-col ${className}`.trim()}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[#26313B]"
        >
          <span>{label}</span>
          {required && (
            <span className="text-[13px] font-semibold text-[#D95353]" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div className="group relative flex w-full items-center">
        {hasIcon && (
          <span
            className={`pointer-events-none absolute left-3.5 z-10 flex h-[17px] w-[17px] items-center justify-center transition-colors duration-200 ${
              isInvalid
                ? 'text-[#D95353]'
                : 'text-[#9AA3AD] group-focus-within:text-[#18A968]'
            }`}
            aria-hidden="true"
          >
            {React.isValidElement(Icon) ? (
              Icon
            ) : (
              <Icon size={17} strokeWidth={1.8} />
            )}
          </span>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          aria-invalid={isInvalid}
          aria-describedby={
            isInvalid ? errorId : helperText ? helperId : undefined
          }
          className={`h-11 w-full rounded-[10px] bg-white text-sm text-[#27313B] placeholder-[#9AA3AD] transition-all duration-200 outline-none ${
            hasIcon ? 'pl-10 pr-3.5' : 'px-3.5'
          } ${
            isInvalid
              ? 'border border-[#E7A3A3] focus:border-[#D95353] focus:ring-4 focus:ring-[#D95353]/10'
              : 'border border-[#E4E8EC] hover:border-[#D3D9DE] focus:border-[#18A968] focus:ring-4 focus:ring-[#18A968]/10'
          } disabled:cursor-not-allowed disabled:border-[#E5E8EB] disabled:bg-[#F5F6F7] disabled:text-[#A1A8AF]`}
          {...rest}
        />
      </div>

      {error ? (
        <p id={errorId} className="mt-1 text-xs text-[#D95353]" role="alert">
          {error}
        </p>
      ) : helperText ? (
        <p id={helperId} className="mt-1 text-xs text-[#8B949E]">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
