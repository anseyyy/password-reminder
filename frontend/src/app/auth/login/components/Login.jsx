'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Loader2 } from 'lucide-react';

import InputField from '@/components/common/InputField';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: '',
    password: '',
    remember: false,
  });

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('Please fill in both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({
        email: form.email.trim(),
        password: form.password,
      });

      if (res?.success) {
        router.push('/dashboard');
      } else {
        setError(res?.message || 'Login failed. Please verify your credentials.');
      }
    } catch (err) {
      setError(err?.message || 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-4 sm:p-6">
      <div className="w-full max-w-[420px] rounded-[20px] border border-[#edf0f2] bg-white p-6 shadow-[0_8px_30px_rgba(20,30,40,0.05)] sm:p-9 sm:pb-8">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-[#19b967] text-white">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 3L3 8L12 13L21 8L12 3Z" fill="currentColor" />
              <path
                d="M3 13L12 18L21 13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 17L12 22L21 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>

          <span className="text-lg font-semibold tracking-[-0.2px] text-[#171b22]">
            RemindPro
          </span>
        </div>

        {/* Heading */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#182028] sm:text-[26px]">
            Welcome back
          </h1>

          <p className="mx-auto mt-2 max-w-[330px] text-[13px] leading-relaxed text-[#8d969f]">
            Sign in to manage your clients, domains and reminders.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Form */}
        <form className="flex flex-col gap-4.5" onSubmit={handleSubmit}>
          <InputField
            id="email"
            name="email"
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={form.email}
            onChange={handleChange}
            icon={Mail}
            disabled={isLoading}
            required
          />

          <InputField
            id="password"
            name="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={form.password}
            onChange={handleChange}
            icon={Lock}
            disabled={isLoading}
            required
          />

          <div className="-mt-0.5 flex items-center justify-between">
            <label className="flex cursor-pointer items-center gap-1.5 text-xs text-[#727c86]">
              <input
                type="checkbox"
                name="remember"
                checked={form.remember}
                onChange={handleChange}
                disabled={isLoading}
                className="h-3.5 w-3.5 cursor-pointer rounded accent-[#18a968]"
              />
              <span>Remember me</span>
            </label>

            <Link
              href="/auth/forgot-password"
              className="cursor-pointer bg-transparent p-0 text-xs font-medium text-[#168f5a] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            className="mt-1 w-full min-h-[44px] gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-white" />
                <span>Signing in...</span>
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-[#8d969f]">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="font-medium text-[#168f5a] hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </main>
  );
}