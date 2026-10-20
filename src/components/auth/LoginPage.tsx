import React, { useState, useEffect } from 'react';
import { useBilling } from '../../context/BillingContext';
import { api } from '../../services/api';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Building2,
  KeyRound,
  Copy,
  Check,
  HelpCircle,
  X,
  FileText,
  User,
  Shield,
} from 'lucide-react';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const {
    isDark,
    toggleTheme,
    loginUser,
    registerSuperAdmin,
    verifyMfa,
    authStatus,
    checkAuthStatus,
    connectionError,
    setCurrentView,
  } = useBilling();

  // Mode: 'login' | 'setup' | 'mfa'
  const [mode, setMode] = useState<'login' | 'setup' | 'mfa'>(() => {
    return authStatus === 'setup_required' ? 'setup' : 'login';
  });

  // Keep mode in sync: if initialized, always direct unauthenticated users to login
  useEffect(() => {
    if (authStatus === 'setup_required') {
      setMode('setup');
    } else if (authStatus === 'unauthenticated' || authStatus === 'authenticated') {
      setMode('login');
    }
  }, [authStatus]);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('billflow_remembered_email') || '';
      } catch {
        return '';
      }
    }
    return '';
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return Boolean(localStorage.getItem('billflow_remembered_email'));
      } catch {
        return false;
      }
    }
    return false;
  });

  // Validation States
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot Password Modal State
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<{
    loading: boolean;
    error?: string;
    info?: string;
    details?: string;
  }>({ loading: false });

  // MFA Challenge State
  const [mfaTempToken, setMfaTempToken] = useState('');
  const [mfaEmail, setMfaEmail] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Super Admin Setup State (only shown when authStatus === 'setup_required')
  const [setupName, setSetupName] = useState('');
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirmPassword, setSetupConfirmPassword] = useState('');
  const [setupShowPassword, setSetupShowPassword] = useState(false);
  const [setupMfaEnabled, setSetupMfaEnabled] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // MFA Credentials post-setup
  const [mfaSetupData, setMfaSetupData] = useState<{
    mfaSecret?: string;
    recoveryCodes?: string[];
  } | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Email validation regex (standard RFC 5322 compatible format)
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  const emailError =
    emailTouched && !loginEmail.trim()
      ? 'Email address is required.'
      : emailTouched && !isValidEmail(loginEmail)
      ? 'Please enter a valid email address (e.g., admin@company.in).'
      : null;

  const passwordError =
    passwordTouched && !loginPassword
      ? 'Password is required.'
      : null;

  // Password strength calculator for setup
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Moderate', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const setupStrength = getPasswordStrength(setupPassword);

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    setLoginError(null);

    const trimmedEmail = loginEmail.trim();

    if (!trimmedEmail) {
      setLoginError('Please enter your email address.');
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setLoginError('Please enter a valid email address.');
      return;
    }

    if (!loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);

      // Save or remove remembered email safely (never store passwords!)
      try {
        if (rememberMe) {
          localStorage.setItem('billflow_remembered_email', trimmedEmail);
        } else {
          localStorage.removeItem('billflow_remembered_email');
        }
      } catch (e) {
        console.warn('Could not access localStorage for remember-me:', e);
      }

      const res = await loginUser({
        email: trimmedEmail,
        password: loginPassword,
      });

      // If MFA required, transition to MFA mode
      if (res && 'mfaRequired' in res && res.mfaRequired) {
        setMfaTempToken(res.tempToken || '');
        setMfaEmail(res.email || trimmedEmail);
        setMode('mfa');
        setLoginError(null);
        return;
      }

      // Success
      if (onSuccess) onSuccess();
    } catch (err: any) {
      // Accessible generic error banner
      const errorMsg =
        err?.data?.error ||
        err?.message ||
        'Invalid email or password. Please verify your credentials and try again.';
      setLoginError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle MFA Submit
  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);

    const cleanCode = mfaCode.trim().toUpperCase();
    if (!cleanCode) {
      setMfaError('Please enter your 6-digit TOTP code or emergency recovery code.');
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyMfa(mfaTempToken, cleanCode);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMfaError(err?.message || 'Invalid verification code. Please check your authenticator app and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Super Admin Setup Submit
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError(null);

    if (!setupName.trim()) {
      setSetupError('Full administrator name is required.');
      return;
    }
    if (!setupEmail.trim() || !isValidEmail(setupEmail)) {
      setSetupError('A valid business email address is required.');
      return;
    }
    if (setupPassword.length < 8) {
      setSetupError('Password must be at least 8 characters long.');
      return;
    }
    if (setupPassword !== setupConfirmPassword) {
      setSetupError('Passwords do not match. Please re-enter confirmation password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await registerSuperAdmin({
        name: setupName.trim(),
        email: setupEmail.trim().toLowerCase(),
        password: setupPassword,
        mfaEnabled: setupMfaEnabled,
      });

      if (setupMfaEnabled && (res.mfaSecret || res.recoveryCodes)) {
        setMfaSetupData({
          mfaSecret: res.mfaSecret,
          recoveryCodes: res.recoveryCodes,
        });
      } else {
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      const isAlreadyInit =
        err?.code === 'SETUP_ALREADY_COMPLETED' ||
        (err?.message && err.message.toLowerCase().includes('already initialized'));
      if (isAlreadyInit) {
        setMode('login');
        if (setupEmail.trim()) {
          setLoginEmail(setupEmail.trim().toLowerCase());
        }
        setLoginError('System is already initialized. The initial Super Admin account already exists. Please sign in with your credentials.');
        checkAuthStatus();
      } else {
        setSetupError(err?.message || 'Failed to initialize Super Admin account. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check Password Recovery
  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToQuery = (forgotEmail || loginEmail).trim();
    if (!emailToQuery || !isValidEmail(emailToQuery)) {
      setForgotStatus({
        loading: false,
        error: 'Please enter a valid email address.',
      });
      return;
    }

    try {
      setForgotStatus({ loading: true });
      const res = await api.forgotPassword(emailToQuery);
      setForgotStatus({
        loading: false,
        info: res.message || 'Password reset request processed.',
      });
    } catch (err: any) {
      // Backend returns 501 SMTP_NOT_CONFIGURED if mailer is absent
      const isUnconfigured = err?.status === 501 || err?.code === 'SMTP_NOT_CONFIGURED';
      setForgotStatus({
        loading: false,
        error: isUnconfigured
          ? 'Self-service email recovery is unconfigured on this server.'
          : err?.message || 'Unable to process password reset request.',
        details: isUnconfigured
          ? 'Outbound SMTP mail gateway is not configured in this self-hosted environment. Contact your company Super Administrator, who can reset passwords instantly in Settings > User Management.'
          : undefined,
      });
    }
  };

  const handleCopyCodes = () => {
    if (mfaSetupData?.recoveryCodes) {
      navigator.clipboard.writeText(mfaSetupData.recoveryCodes.join('\n'));
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2500);
    }
  };

  const handleCopySecret = () => {
    if (mfaSetupData?.mfaSecret) {
      navigator.clipboard.writeText(mfaSetupData.mfaSecret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2500);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-[#020617] text-slate-900 dark:text-slate-100 transition-colors duration-200 selection:bg-blue-500 selection:text-white relative overflow-x-hidden">
      {/* Background Subtle Gradient & Ambience */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500/5 dark:bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-3xl" />
      </div>

      {/* Top Header Bar: Logo + Theme Switcher */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
            ₹
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                BillFlow
              </span>
              <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                India GST
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
              Smart Billing. Simple Business.
            </p>
          </div>
        </div>

        {/* Top-Right Actions: Theme Switcher */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0F172A] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-all text-xs font-medium shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500/40"
            title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
            aria-label="Toggle dark and light theme"
          >
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-slate-600" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area: Centered Login Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-md">
          {/* Server Connection Error Alert */}
          {authStatus === 'connection_error' && (
            <div className="mb-4 p-4 rounded-2xl border border-rose-300 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/70 text-rose-800 dark:text-rose-200 text-xs shadow-sm space-y-2">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-rose-900 dark:text-rose-100">
                    Cannot Connect to BillFlow Server
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">
                    {connectionError || 'The backend server on port 3000 is not responding.'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => checkAuthStatus()}
                className="w-full mt-2 py-1.5 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Connection</span>
              </button>
            </div>
          )}

          {/* Initial Setup Notification Banner if 0 users exist */}
          {authStatus === 'setup_required' && mode !== 'setup' && (
            <div className="mb-4 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 text-xs shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span className="font-medium">First-time system setup required.</span>
              </div>
              <button
                type="button"
                onClick={() => setMode('setup')}
                className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shrink-0 transition-colors"
              >
                Setup Admin
              </button>
            </div>
          )}

          {/* Login Card Container */}
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200/90 dark:border-slate-800 rounded-3xl shadow-xl shadow-slate-200/60 dark:shadow-2xl dark:shadow-black/70 p-6 sm:p-8 transition-colors duration-200 backdrop-blur-sm">
            {/* ------------------------------------------------------------- */}
            {/* MODE 1: STANDARD LOGIN FORM                                  */}
            {/* ------------------------------------------------------------- */}
            {mode === 'login' && (
              <div>
                {/* Branding & Welcome Headings */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white shadow-md shadow-blue-500/25 mb-3">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Welcome back
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Sign in to manage your business finances.
                  </p>
                </div>

                {/* Authentication Error Banner */}
                {loginError && (
                  <div
                    role="alert"
                    aria-live="assertive"
                    className="mb-5 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
                  >
                    <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed font-medium">{loginError}</span>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleLoginSubmit} noValidate className="space-y-4">
                  {/* Email Field */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-email"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="login-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={loginEmail}
                        onChange={(e) => {
                          setLoginEmail(e.target.value);
                          if (loginError) setLoginError(null);
                        }}
                        onBlur={() => setEmailTouched(true)}
                        placeholder="Enter your email address"
                        className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                          emailError
                            ? 'border-rose-500 focus:ring-rose-500/20'
                            : 'border-slate-300 dark:border-slate-700/80 focus:border-blue-600 focus:ring-blue-500/20'
                        }`}
                      />
                    </div>
                    {emailError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-1">
                        {emailError}
                      </p>
                    )}
                  </div>

                  {/* Password Field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor="login-password"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setForgotEmail(loginEmail);
                          setIsForgotPasswordOpen(true);
                        }}
                        className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:underline transition-colors"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          if (loginError) setLoginError(null);
                        }}
                        onBlur={() => setPasswordTouched(true)}
                        placeholder="Enter your password"
                        className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                          passwordError
                            ? 'border-rose-500 focus:ring-rose-500/20'
                            : 'border-slate-300 dark:border-slate-700/80 focus:border-blue-600 focus:ring-blue-500/20'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        tabIndex={0}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-1">
                        {passwordError}
                      </p>
                    )}
                  </div>

                  {/* Remember Me Checkbox */}
                  <div className="flex items-center pt-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/40 border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] cursor-pointer"
                      />
                      <span>Remember me</span>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#0F172A]"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign in</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* First-time Setup Link if applicable */}
                {authStatus === 'setup_required' && (
                  <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      First time using BillFlow?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('setup')}
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Initialize Super Admin
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODE 2: TWO-FACTOR AUTHENTICATION (MFA CHALLENGE)             */}
            {/* ------------------------------------------------------------- */}
            {mode === 'mfa' && (
              <div>
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 mb-3 shadow-xs">
                    <KeyRound className="w-6 h-6" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Two-Factor Verification
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                    Enter the 6-digit code from your authenticator app or an emergency recovery code.
                  </p>
                  {mfaEmail && (
                    <span className="inline-block mt-2 text-[11px] font-mono font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {mfaEmail}
                    </span>
                  )}
                </div>

                {mfaError && (
                  <div className="mb-4 p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{mfaError}</span>
                  </div>
                )}

                <form onSubmit={handleMfaSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="mfa-code"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300 text-center"
                    >
                      Security Code
                    </label>
                    <input
                      id="mfa-code"
                      type="text"
                      autoFocus
                      required
                      value={mfaCode}
                      onChange={(e) => {
                        setMfaCode(e.target.value);
                        if (mfaError) setMfaError(null);
                      }}
                      placeholder="000000 or XXXX-XXXX"
                      maxLength={12}
                      className="w-full text-center tracking-widest font-mono text-lg py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 uppercase"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <span>Verify &amp; Sign In</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setMode('login');
                      setMfaCode('');
                      setMfaError(null);
                    }}
                    className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    ← Back to Sign In
                  </button>
                </form>
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODE 3: FIRST-TIME SUPER ADMIN INITIALIZATION                */}
            {/* ------------------------------------------------------------- */}
            {mode === 'setup' && (
              <div>
                {/* If setup just succeeded and MFA credentials need saving */}
                {mfaSetupData ? (
                  <div className="space-y-4">
                    <div className="text-center mb-4">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 text-teal-600 dark:text-teal-400 mb-2">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        Multi-Factor Backup Keys
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Save these emergency credentials before continuing.
                      </p>
                    </div>

                    {mfaSetupData.recoveryCodes && (
                      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A0F1D] space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                            Emergency Recovery Codes
                          </span>
                          <button
                            type="button"
                            onClick={handleCopyCodes}
                            className="text-xs text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1 hover:underline"
                          >
                            {copiedCodes ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedCodes ? 'Copied' : 'Copy All'}</span>
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 font-mono text-xs text-slate-800 dark:text-slate-200">
                          {mfaSetupData.recoveryCodes.map((c, i) => (
                            <div key={i} className="p-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center font-bold">
                              {c}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setMfaSetupData(null);
                        setMode('login');
                        if (onSuccess) onSuccess();
                      }}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors"
                    >
                      I have safely saved my recovery keys →
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="text-center mb-5">
                      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/80 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 mb-2">
                        <Shield className="w-6 h-6" />
                      </div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                        Initialize Super Admin
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                        Welcome to BillFlow India. Setup the primary administrative account to activate your secure billing database.
                      </p>
                    </div>

                    {setupError && (
                      <div className="mb-4 p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span>{setupError}</span>
                      </div>
                    )}

                    <form onSubmit={handleSetupSubmit} className="space-y-3.5">
                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Administrator Name
                        </label>
                        <input
                          type="text"
                          required
                          value={setupName}
                          onChange={(e) => setSetupName(e.target.value)}
                          placeholder="e.g., Rajesh Kumar"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Business Email
                        </label>
                        <input
                          type="email"
                          required
                          value={setupEmail}
                          onChange={(e) => setSetupEmail(e.target.value)}
                          placeholder="admin@yourbusiness.in"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Password (min 8 chars)
                        </label>
                        <div className="relative">
                          <input
                            type={setupShowPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={setupPassword}
                            onChange={(e) => setSetupPassword(e.target.value)}
                            placeholder="Create strong password"
                            className="w-full px-3 pr-10 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                          />
                          <button
                            type="button"
                            onClick={() => setSetupShowPassword(!setupShowPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                          >
                            {setupShowPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {setupPassword && (
                          <div className="flex items-center gap-1.5 pt-1">
                            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${setupStrength.color}`}
                                style={{ width: `${(setupStrength.score / 3) * 100}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-slate-500">
                              {setupStrength.label}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Confirm Password
                        </label>
                        <input
                          type={setupShowPassword ? 'text' : 'password'}
                          required
                          value={setupConfirmPassword}
                          onChange={(e) => setSetupConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                          className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                        />
                      </div>

                      <div className="pt-1">
                        <label className="flex items-start gap-2 cursor-pointer select-none text-xs text-slate-600 dark:text-slate-400">
                          <input
                            type="checkbox"
                            checked={setupMfaEnabled}
                            onChange={(e) => setSetupMfaEnabled(e.target.checked)}
                            className="w-4 h-4 mt-0.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700"
                          />
                          <div>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              Enable Two-Factor Authentication (MFA)
                            </span>
                            <p className="text-[11px] text-slate-400">
                              Recommended for highest security on Super Admin accounts.
                            </p>
                          </div>
                        </label>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 mt-4"
                      >
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Creating Super Admin...</span>
                          </>
                        ) : (
                          <>
                            <span>Complete Initialization</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setMode('login')}
                        className="w-full py-2 text-xs font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white"
                      >
                        Cancel and return to Sign In
                      </button>
                    </form>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Informational Notice */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Authorized roles: Super Admin • Manager • Employee
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 border-t border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
        <div>
          <span>© BillFlow. All rights reserved.</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <button
            type="button"
            onClick={() => setCurrentView('privacy-policy')}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors hover:underline"
          >
            Privacy Policy
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => setCurrentView('terms-conditions')}
            className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors hover:underline"
          >
            Terms &amp; Conditions
          </button>
          <span>•</span>
          <span className="flex items-center gap-1 text-slate-400">
            <Lock className="w-3 h-3" />
            <span>256-bit PBKDF2</span>
          </span>
        </div>
      </footer>

      {/* ------------------------------------------------------------- */}
      {/* MODAL: FORGOT PASSWORD RECOVERY ASSISTANCE                    */}
      {/* ------------------------------------------------------------- */}
      {isForgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  <HelpCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Password Recovery Assistance
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    BillFlow Role-Based Access Support
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordOpen(false);
                  setForgotStatus({ loading: false });
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              <p>
                To reset your account password, check with your administrator or query the system recovery status:
              </p>

              {/* Status or Details Banner */}
              {forgotStatus.error && (
                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/70 bg-amber-50 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{forgotStatus.error}</span>
                  </div>
                  {forgotStatus.details && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-300/90 leading-relaxed">
                      {forgotStatus.details}
                    </p>
                  )}
                </div>
              )}

              {forgotStatus.info && (
                <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/70 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{forgotStatus.info}</span>
                </div>
              )}

              {/* Recovery Guidance by Role */}
              <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0A0F1D] space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">
                      Employees &amp; Managers
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Your company Super Administrator can reset your password instantly from the{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Settings &gt; User Management
                      </span>{' '}
                      panel. Please contact them directly.
                    </p>
                  </div>
                </div>

                <div className="h-px bg-slate-200 dark:bg-slate-800" />

                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-slate-900 dark:text-slate-100">
                      Super Administrator
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      If you lost your Super Admin password, use the emergency recovery codes generated during initial system initialization or use server-side management.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Gateway Check Form */}
              <form onSubmit={handleForgotPasswordSubmit} className="space-y-2 pt-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Verify Outbound Gateway for Email:
                </label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter account email"
                    className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <button
                    type="submit"
                    disabled={forgotStatus.loading}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white dark:bg-slate-700 dark:hover:bg-slate-600 font-semibold text-xs shrink-0 transition-colors flex items-center gap-1.5"
                  >
                    {forgotStatus.loading ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <span>Check Gateway</span>
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsForgotPasswordOpen(false);
                  setForgotStatus({ loading: false });
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
