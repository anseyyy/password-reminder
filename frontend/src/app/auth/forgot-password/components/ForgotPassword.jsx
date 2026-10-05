'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Mail,
  Lock,
  Loader2,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';

import InputField from '@/components/common/InputField';
import Button from '@/components/common/Button';
import ErrorMessage from '@/components/common/ErrorMessage';
import authApi from '@/api/auth.api';

export default function ForgotPassword() {
  const router = useRouter();

  // Steps: 'email' -> 'otp' -> 'reset' -> 'success'
  const [step, setStep] = useState('email');

  // Form states
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status & Feedback
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Resend cooldown timer
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs for OTP inputs
  const otpInputRefs = useRef([]);

  // Timer countdown effect
  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Focus first OTP input when moving to OTP step
  useEffect(() => {
    if (step === 'otp') {
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // ── Step 1: Send OTP to Email ──────────────────────────────────────────────
  const handleSendOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.forgotPassword({ email: trimmedEmail });
      if (res?.success) {
        setSuccessMessage('Verification code sent! Please check your inbox or spam folder.');
        setStep('otp');
        setResendCooldown(60); // 60s cooldown
      } else {
        setError(res?.message || 'Failed to send OTP. Please verify your email.');
      }
    } catch (err) {
      setError(err?.message || 'Unable to connect to server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 2: Handle OTP Input & Verification ────────────────────────────────
  const handleOtpChange = (index, value) => {
    // Only accept single digit
    const digit = value.replace(/\D/g, '').slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (error) setError('');

    // If digit entered, focus next input
    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Move to previous input on backspace if current is empty
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 6);
    if (!pastedData) return;

    const newOtp = ['', '', '', '', '', ''];
    for (let i = 0; i < pastedData.length; i++) {
      newOtp[i] = pastedData[i];
    }
    setOtp(newOtp);
    if (error) setError('');

    const focusIndex = Math.min(pastedData.length, 5);
    otpInputRefs.current[focusIndex]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.verifyOtp({
        email: email.trim(),
        otp: fullOtp,
      });

      if (res?.success && res.resetToken) {
        setResetToken(res.resetToken);
        setStep('reset');
      } else {
        setError(res?.message || 'Invalid or expired OTP code.');
      }
    } catch (err) {
      setError(err?.message || 'Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 3: Handle Reset Password ──────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and try again.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.resetPassword({
        email: email.trim(),
        resetToken,
        newPassword: password,
      });

      if (res?.success) {
        setStep('success');
      } else {
        setError(res?.message || 'Failed to reset password. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'Unable to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f5f6f8] p-4 sm:p-6">
      <div className="w-full max-w-[420px] rounded-[20px] border border-[#edf0f2] bg-white p-6 shadow-[0_8px_30px_rgba(20,30,40,0.05)] sm:p-9 sm:pb-8">
        
        {/* Logo */}
        <div className="mb-6 flex items-center justify-center gap-2.5">
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

        {/* Step Progression Indicators */}
        {step !== 'success' && (
          <div className="mb-6 flex items-center justify-center gap-2">
            <div
              className={`h-1.5 w-10 rounded-full transition-all duration-300 ${
                step === 'email' ? 'bg-[#19b967]' : 'bg-[#19b967]/30'
              }`}
            />
            <div
              className={`h-1.5 w-10 rounded-full transition-all duration-300 ${
                step === 'otp' ? 'bg-[#19b967]' : step === 'reset' ? 'bg-[#19b967]/30' : 'bg-[#e5e7eb]'
              }`}
            />
            <div
              className={`h-1.5 w-10 rounded-full transition-all duration-300 ${
                step === 'reset' ? 'bg-[#19b967]' : 'bg-[#e5e7eb]'
              }`}
            />
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="mb-5">
            <ErrorMessage message={error} />
          </div>
        )}

        {/* Global Success Banner */}
        {successMessage && step === 'otp' && !error && (
          <div className="mb-5 flex items-center gap-2 rounded-[10px] border border-[#a7f3d0] bg-[#eff9f4] p-3 text-xs font-medium text-[#168f5a]">
            <CheckCircle2 size={16} className="shrink-0 text-[#18a968]" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ── STEP 1: Enter Email ────────────────────────────────────────── */}
        {step === 'email' && (
          <>
            <div className="mb-7 text-center">
              <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#182028] sm:text-[25px]">
                Reset your password
              </h1>
              <p className="mx-auto mt-2 max-w-[330px] text-[13px] leading-relaxed text-[#8d969f]">
                Enter your registered email address and we&apos;ll send you a 6-digit OTP code.
              </p>
            </div>

            <form onSubmit={handleSendOtp} className="flex flex-col gap-4.5">
              <InputField
                id="forgot-email"
                name="email"
                type="email"
                label="Email Address"
                placeholder="Enter your account email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                icon={Mail}
                disabled={isLoading}
                required
              />

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-1 w-full min-h-[44px] gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Sending Code...</span>
                  </>
                ) : (
                  'Send Verification Code'
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                href="/auth/login"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#727c86] hover:text-[#182028] transition-colors"
              >
                <ArrowLeft size={14} />
                <span>Back to Sign In</span>
              </Link>
            </div>
          </>
        )}

        {/* ── STEP 2: Enter OTP Code ────────────────────────────────────── */}
        {step === 'otp' && (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0fdf4] text-[#19b967]">
                <KeyRound size={22} />
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#182028] sm:text-[25px]">
                Enter Verification Code
              </h1>
              <p className="mx-auto mt-2 max-w-[330px] text-[13px] leading-relaxed text-[#8d969f]">
                We sent a 6-digit code to <span className="font-semibold text-[#182028]">{email}</span>.
              </p>
            </div>

            {/* Spam Folder Tip */}
            <div className="mb-5 rounded-[12px] border border-[#e2e8f0] bg-[#f8fafc] px-3.5 py-2.5 text-center text-xs text-[#64748b]">
              <span>💡 Don&apos;t see the email? Please check your </span>
              <strong className="text-[#334155]">Spam</strong>
              <span> or </span>
              <strong className="text-[#334155]">Junk</strong>
              <span> folder.</span>
            </div>

            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-5">
              {/* 6 Segmented OTP Input boxes */}
              <div className="flex justify-between gap-2 sm:gap-2.5">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (otpInputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    onPaste={handleOtpPaste}
                    disabled={isLoading}
                    className={`h-12 w-12 rounded-[12px] text-center text-xl font-bold transition-all duration-200 outline-none ${
                      digit
                        ? 'border-2 border-[#19b967] bg-[#f0fdf4] text-[#168f5a]'
                        : 'border border-[#e4e8ec] bg-white text-[#182028] hover:border-[#d3d9de] focus:border-[#19b967] focus:ring-4 focus:ring-[#19b967]/10'
                    }`}
                  />
                ))}
              </div>

              <Button
                type="submit"
                disabled={isLoading || otp.join('').length < 6}
                className="w-full min-h-[44px] gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  'Verify Code'
                )}
              </Button>
            </form>

            {/* Resend OTP & Change Email */}
            <div className="mt-5 flex flex-col items-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={isLoading || resendCooldown > 0}
                className="inline-flex items-center gap-1.5 font-medium text-[#168f5a] hover:underline disabled:text-[#9aa3ad] disabled:no-underline disabled:cursor-not-allowed cursor-pointer"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                {resendCooldown > 0 ? (
                  <span>Resend code in {resendCooldown}s</span>
                ) : (
                  <span>Didn&apos;t receive code? Resend</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp(['', '', '', '', '', '']);
                  setError('');
                }}
                className="font-medium text-[#8d969f] hover:text-[#182028] transition-colors cursor-pointer"
              >
                Change email address
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Reset Password ────────────────────────────────────── */}
        {step === 'reset' && (
          <>
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0fdf4] text-[#19b967]">
                <ShieldCheck size={24} />
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#182028] sm:text-[25px]">
                Create new password
              </h1>
              <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-relaxed text-[#8d969f]">
                Please enter a strong password for your account.
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4.5">
              {/* New Password */}
              <div className="relative">
                <InputField
                  id="new-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  label="New Password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  icon={Lock}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-[38px] text-[#9aa3ad] hover:text-[#27313b] cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Confirm New Password */}
              <div className="relative">
                <InputField
                  id="confirm-new-password"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  label="Confirm New Password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                  }}
                  icon={Lock}
                  disabled={isLoading}
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-[38px] text-[#9aa3ad] hover:text-[#27313b] cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="mt-1 w-full min-h-[44px] gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    <span>Resetting Password...</span>
                  </>
                ) : (
                  'Reset Password'
                )}
              </Button>
            </form>
          </>
        )}

        {/* ── STEP 4: Success View ───────────────────────────────────────── */}
        {step === 'success' && (
          <div className="py-2 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e8f8f0] text-[#19b967]">
              <CheckCircle2 size={32} />
            </div>

            <h1 className="text-2xl font-semibold tracking-[-0.5px] text-[#182028] sm:text-[25px]">
              Password reset successfully!
            </h1>

            <p className="mx-auto mt-2 max-w-[320px] text-[13px] leading-relaxed text-[#8d969f]">
              Your password has been changed. You can now sign in using your new password.
            </p>

            <div className="mt-7">
              <Button
                type="button"
                onClick={() => router.push('/auth/login')}
                className="w-full min-h-[44px]"
              >
                Sign In Now
              </Button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
