'use client';

import React, { useState, useEffect } from 'react';
import ShaderBackground from '@/components/ShaderBackground';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    username?: string;
    password?: string;
  }>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const [handshakeMessage, setHandshakeMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  interface LoggedInUser {
    id: string;
    username: string;
    role: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }
  const [successUser, setSuccessUser] = useState<LoggedInUser | null>(null);

  // Trigger shake animation on apiError
  useEffect(() => {
    if (apiError) {
      const toast = document.getElementById('error-toast');
      if (toast) {
        toast.animate(
          [
            { transform: 'translateX(0)' },
            { transform: 'translateX(-6px)' },
            { transform: 'translateX(6px)' },
            { transform: 'translateX(-4px)' },
            { transform: 'translateX(4px)' },
            { transform: 'translateX(0)' },
          ],
          {
            duration: 400,
            easing: 'ease-in-out',
          }
        );
      }
    }
  }, [apiError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);
    setValidationErrors({});

    // Client-side validations
    const errors: typeof validationErrors = {};
    if (!username.trim()) {
      errors.username = 'Username is required';
    }
    if (!password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setHandshakeMessage('Establishing secure handshake with Industrial Server 04...');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error || 'Invalid username or password. Please try again.');
        setIsSubmitting(false);
        setHandshakeMessage(null);
      } else {
        setHandshakeMessage('Handshake established. Authorizing administrative node...');
        setTimeout(() => {
          setIsSubmitting(false);
          setSuccessUser(data.data.user);
        }, 1500);
      }
    } catch {
      setApiError('Network error. Unable to contact authentication server.');
      setIsSubmitting(false);
      setHandshakeMessage(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    }
    setSuccessUser(null);
    setUsername('');
    setPassword('');
    setHandshakeMessage(null);
  };

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-[#141313] font-sans text-[#e5e2e1]">
      <style jsx global>{`
        body {
          background-color: #141313;
          color: #e5e2e1;
          overflow: hidden;
          font-family: 'Hanken Grotesk', sans-serif;
        }

        .material-symbols-outlined {
          font-variation-settings:
            'FILL' 0,
            'wght' 400,
            'GRAD' 0,
            'opsz' 24;
        }

        .hairline-border {
          border: 0.5px solid #2e2e2e;
        }

        /* Floating Label Styles */
        .floating-label-group {
          position: relative;
        }

        .floating-label-group input:focus ~ label,
        .floating-label-group input:not(:placeholder-shown) ~ label {
          top: -8px;
          left: 12px;
          font-size: 11px;
          background-color: #1f1f1f;
          padding: 0 4px;
          color: #ffffff;
        }

        .floating-label-group label {
          position: absolute;
          top: 14px;
          left: 16px;
          transition: all 0.2s ease;
          pointer-events: none;
          color: #8e9192;
        }

        .custom-checkbox {
          appearance: none;
          width: 16px;
          height: 16px;
          border: 1px solid #2e2e2e;
          background-color: #181818;
          border-radius: 2px;
          cursor: pointer;
          position: relative;
        }

        .custom-checkbox:checked {
          background-color: #ffffff;
          border-color: #ffffff;
        }

        .custom-checkbox:checked::after {
          content: 'check';
          font-family: 'Material Symbols Outlined';
          font-size: 12px;
          color: #181818;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        @keyframes entrance {
          0% {
            opacity: 0;
            transform: translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-login-card {
          animation: entrance 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .loading-pulse {
          animation: pulse-opacity 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }

        @keyframes pulse-opacity {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .animate-spin-slow {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* WebGL Fluid Shader Background */}
      <ShaderBackground />

      {/* Decorative Radial Gradients */}
      <div className="pointer-events-none absolute inset-0 z-0 opacity-20">
        <div className="absolute bottom-0 left-0 h-1/2 w-1/2 bg-gradient-to-tr from-[#353434]/10 to-transparent blur-3xl"></div>
        <div className="absolute top-0 right-0 h-1/3 w-1/3 bg-gradient-to-bl from-white/5 to-transparent blur-3xl"></div>
      </div>

      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 z-50 flex h-16 w-full items-center justify-between border-b border-[#2e2e2e]/20 bg-[#141313] px-6">
        <div className="flex items-center gap-2">
          <div className="h-8 w-2 bg-white"></div>
          <span className="text-xl font-bold tracking-tight text-white">DigiERP</span>
        </div>
        <div className="hidden items-center gap-6 md:flex">
          <span className="text-[9px] font-bold tracking-[0.2em] text-[#c4c7c8] uppercase">
            Industrial Systems v4.2
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 w-full max-w-[420px] px-6">
        {/* Error Alert Toast */}
        {apiError && (
          <div
            id="error-toast"
            className="mb-6 flex items-center gap-3 rounded-none border border-[#ffb4ab]/30 bg-[#93000a]/20 p-4 transition-all duration-300"
          >
            <span
              className="material-symbols-outlined text-[#ffb4ab]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              error
            </span>
            <span className="text-sm text-[#ffb4ab]">{apiError}</span>
          </div>
        )}

        <div className="hairline-border animate-login-card rounded-lg bg-[#1f1f1f] p-6 shadow-2xl">
          {successUser ? (
            /* Success State */
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <span
                className="material-symbols-outlined text-6xl text-emerald-400"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                verified_user
              </span>
              <h2 className="text-2xl font-bold text-white">Session Provisioned</h2>
              <div className="space-y-1 text-sm text-[#c4c7c8]">
                <p>
                  Welcome back, <strong className="text-white">{successUser.username}</strong>
                </p>
                <p className="inline-block rounded bg-white/10 px-2 py-0.5 text-[10px] tracking-wider text-white uppercase">
                  Role: {successUser.role}
                </p>
              </div>
              <p className="mt-2 text-xs text-[#8e9192]">
                Administrative node successfully authorized.
              </p>
              <button
                onClick={handleLogout}
                className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white font-semibold text-[#181818] transition-all hover:bg-neutral-100 active:scale-[0.98]"
              >
                Terminate Session
                <span className="material-symbols-outlined text-xl">logout</span>
              </button>
            </div>
          ) : (
            /* Standard Login / Loading States */
            <>
              {/* Brand Identity */}
              <div className="mb-10 flex flex-col items-center">
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="material-symbols-outlined text-3xl text-white"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    fluid_med
                  </span>
                  <h1 className="text-xl font-bold tracking-tight text-white">DigiERP</h1>
                </div>
                <p className="text-[9px] font-bold tracking-[0.2em] text-[#c4c7c8] uppercase">
                  InkStream Distribution
                </p>
              </div>

              {/* Header Content */}
              <div className="mb-8">
                <h2 className="mb-2 text-2xl font-semibold text-white">Sign in to your account</h2>
                <p className="text-sm text-[#c4c7c8]">
                  Enter your credentials to access the logistics dashboard.
                </p>
              </div>

              {/* Form */}
              <form className="space-y-5" onSubmit={handleSubmit}>
                {/* Username / Operator Identity Field */}
                <div className="space-y-1">
                  <div className="floating-label-group">
                    <input
                      className={`hairline-border h-12 w-full rounded-md bg-[#181818] px-4 text-sm text-white transition-all focus:border-white focus:outline-none ${validationErrors.username ? 'border-[#ffb4ab] focus:border-[#ffb4ab]' : ''}`}
                      id="username"
                      name="username"
                      placeholder=" "
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="username" className="text-sm">
                      Operator ID / Username
                    </label>
                  </div>
                  {validationErrors.username && (
                    <p className="flex items-center gap-1 text-xs text-[#ffb4ab]">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {validationErrors.username}
                    </p>
                  )}
                </div>

                {/* Password / Security Token Field */}
                <div className="space-y-1">
                  <div className="floating-label-group relative">
                    <input
                      className={`hairline-border h-12 w-full rounded-md bg-[#181818] pr-12 pl-4 text-sm text-white transition-all focus:border-white focus:outline-none ${validationErrors.password ? 'border-[#ffb4ab] focus:border-[#ffb4ab]' : ''}`}
                      id="password"
                      name="password"
                      placeholder=" "
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSubmitting}
                    />
                    <label htmlFor="password" className="text-sm">
                      Security Token / Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="material-symbols-outlined absolute top-1/2 right-4 -translate-y-1/2 text-lg text-[#8e9192] transition-colors hover:text-white"
                      disabled={isSubmitting}
                    >
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </button>
                  </div>
                  {validationErrors.password && (
                    <p className="flex items-center gap-1 text-xs text-[#ffb4ab]">
                      <span className="material-symbols-outlined text-[14px]">error</span>
                      {validationErrors.password}
                    </p>
                  )}
                </div>

                {/* Secondary Actions */}
                <div className="flex items-center justify-between py-1 text-sm">
                  <label className="group flex cursor-pointer items-center gap-2">
                    <input
                      className="custom-checkbox"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      disabled={isSubmitting}
                    />
                    <span className="text-[#c4c7c8] transition-colors group-hover:text-white">
                      Remember me
                    </span>
                  </label>
                  <a className="text-[#c4c7c8] transition-colors hover:text-white" href="#">
                    Forgot password?
                  </a>
                </div>

                {/* CTA Button */}
                <button
                  className={`relative mt-4 flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-md text-sm font-semibold transition-all active:scale-[0.98] ${
                    isSubmitting
                      ? 'cursor-wait bg-white/20 text-[#c4c7c8]'
                      : 'bg-white text-[#181818] hover:bg-neutral-100'
                  }`}
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin-slow text-lg">
                        progress_activity
                      </span>
                      <span>AUTHENTICATING...</span>
                      <div className="loading-pulse absolute bottom-0 left-0 h-[2px] w-full bg-white"></div>
                    </>
                  ) : (
                    <>
                      Sign In
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </>
                  )}
                </button>
              </form>

              {/* Handshake/Status Message Banner */}
              {handshakeMessage && (
                <div className="mt-5 flex items-center gap-3 border-l-2 border-[#0566d9] bg-[#0566d9]/10 px-4 py-3">
                  <span className="material-symbols-outlined text-[18px] text-[#adc6ff]">info</span>
                  <p className="loading-pulse text-xs text-[#adc6ff]">{handshakeMessage}</p>
                </div>
              )}

              {/* Footer Security Note */}
              <div className="mt-8 flex items-center justify-center gap-2 border-t border-[#2e2e2e] pt-6">
                <span className="material-symbols-outlined text-[16px] text-[#c4c7c8]">
                  verified_user
                </span>
                <span className="text-[9px] font-bold tracking-[0.12em] text-[#c4c7c8] uppercase">
                  Secure SSO Login
                </span>
              </div>
            </>
          )}
        </div>

        {/* Global Footer minimal credit */}
        <div className="mt-8 text-center text-[9px] font-bold tracking-[0.12em] text-[#c4c7c8]/40 uppercase select-none">
          © 2026 DigiERP Industrial Systems
        </div>
      </main>

      {/* Visual Anchor / Background Detail (Server node info) */}
      <div className="pointer-events-none fixed bottom-0 left-0 hidden w-full items-end justify-between p-8 text-xs opacity-20 md:flex">
        <div className="flex flex-col gap-1">
          <span className="text-[9px] font-bold tracking-widest text-[#c4c7c8] uppercase">
            SERVER STATUS
          </span>
          <span className="flex items-center gap-2 font-mono text-[#e5e2e1]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
            NODE_04 ACTIVE
          </span>
        </div>
        <div className="flex flex-col gap-1 text-right font-mono">
          <span className="text-[9px] font-bold tracking-widest text-[#c4c7c8] uppercase">
            LOC: DC-NORTH-1
          </span>
          <span className="text-[#e5e2e1]">v4.2.0-PROD</span>
        </div>
      </div>
    </div>
  );
}
