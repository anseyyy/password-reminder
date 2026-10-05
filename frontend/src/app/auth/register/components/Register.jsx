'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2 } from 'lucide-react';

import InputField from '@/components/common/InputField';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import { useAuth } from '@/context/AuthContext';

export default function Register() {
  const router = useRouter();
  const { register, login } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (
      !form.name.trim() ||
      !form.email.trim() ||
      !form.password ||
      !form.confirmPassword
    ) {
      setError('Please fill in all required fields.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match. Please check again.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Call real backend register endpoint (POST /api/auth/register)
      const registerRes = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });

      if (registerRes?.success) {
        setSuccessMessage('Account created! Signing you in...');

        // 2. Automatically sign user in for seamless UX
        try {
          const loginRes = await login({
            email: form.email.trim(),
            password: form.password,
          });

          if (loginRes?.success) {
            router.push('/dashboard');
            return;
          }
        } catch {
          // If auto-login fails, redirect to login page
          router.push('/auth/login');
          return;
        }

        router.push('/dashboard');
      } else {
        setError(registerRes?.message || 'Registration failed. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'Unable to register. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] px-4 py-8 sm:px-6">
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
        <div className="w-full max-w-[440px] rounded-[20px] border border-[#E9EDEF] bg-white p-6 shadow-[0_8px_30px_rgba(20,30,40,0.05)] sm:p-8">

          {/* Logo */}
          <div className="flex justify-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-[#18A968] shadow-[0_5px_14px_rgba(24,169,104,0.18)]">
              <span className="text-[18px] font-bold text-white">
                R
              </span>
            </div>
          </div>

          {/* Header */}
          <div className="mt-5 text-center">
            <h1 className="text-[23px] font-semibold tracking-[-0.4px] text-[#182028]">
              Create your account
            </h1>

            <p className="mt-1.5 text-[13px] text-[#8F999F]">
              Start managing your clients and renewals
            </p>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="mt-5 flex items-center gap-2 rounded-[10px] border border-[#A7F3D0] bg-[#EFF9F4] p-3 text-xs font-semibold text-[#168F5A]">
              <CheckCircle2 size={16} className="text-[#18A968]" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {error && (
            <div className="mt-5">
              <ErrorMessage message={error} />
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
          >
            <InputField
              label="Full Name"
              name="name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              disabled={isLoading}
              required
            />

            <InputField
              label="Email Address"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              disabled={isLoading}
              required
            />

            <InputField
              label="Password"
              name="password"
              type="password"
              placeholder="Create a password (min. 6 characters)"
              value={form.password}
              onChange={handleChange}
              disabled={isLoading}
              required
            />

            <InputField
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={handleChange}
              disabled={isLoading}
              required
            />

            <Button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full min-h-[44px] gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin text-white" />
                  <span>Creating account...</span>
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <p className="mt-6 text-center text-[12px] text-[#8F999F]">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-medium text-[#168F5A] transition hover:text-[#18A968]"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}