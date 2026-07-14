import React, { useState } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string | null;
}

export const Input: React.FC<InputProps> = ({
  label,
  leftIcon,
  rightIcon,
  error,
  type = 'text',
  className = '',
  id,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

  return (
    <div className={`flex flex-col w-full text-left ${className}`}>
      {label && (
        <label
          htmlFor={id}
          className="text-[12px] text-[var(--rx-text-2)] font-medium mb-1.5 select-none"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-[14px] text-[var(--rx-text-3)] flex items-center justify-center pointer-events-none">
            {leftIcon}
          </div>
        )}
        <input
          id={id}
          type={inputType}
          className={`glass-input ${leftIcon ? 'has-left-icon' : ''} ${
            rightIcon || isPassword ? 'has-right-icon' : ''
          } ${
            error
              ? '!border-[var(--rx-red)] focus:!shadow-[0_0_0_3px_rgba(239,68,68,0.15)]'
              : ''
          }`}
          {...props}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={togglePasswordVisibility}
            className="absolute right-[14px] text-[var(--rx-text-3)] hover:text-[var(--rx-text)] transition-colors focus:outline-none flex items-center justify-center"
          >
            {showPassword ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 010-.644C3.476 8.005 7.4 5 12 5c4.756 0 8.653 3.001 10.09 7.322a1.011 1.011 0 010 .644C20.643 15.999 16.74 19 12 19c-4.756 0-8.653-3.001-10.09-7.322z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            )}
          </button>
        ) : (
          rightIcon && (
            <div className="absolute right-[14px] text-[var(--rx-text-3)] flex items-center justify-center">
              {rightIcon}
            </div>
          )
        )}
      </div>
      {error && (
        <span className="text-[12px] text-[var(--rx-red)] mt-1.5 font-medium ml-1">
          {error}
        </span>
      )}
    </div>
  );
};
