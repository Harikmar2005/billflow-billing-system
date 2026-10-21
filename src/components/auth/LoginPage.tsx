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
  UserPlus,
  Clock,
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
    registerUser,
    verifyMfa,
    authStatus,
    checkAuthStatus,
    connectionError,
    setCurrentView,
    recoverSuperAdmin,
  } = useBilling();

  // Mode: 'login' | 'register' | 'setup' | 'mfa'
  const [mode, setMode] = useState<'login' | 'register' | 'setup' | 'mfa'>(() => {
    return authStatus === 'setup_required' ? 'setup' : 'login';
  });

  // Keep mode in sync: if setup is required, direct user to setup; if initialized, always direct unauthenticated users to login
  useEffect(() => {
    if (authStatus === 'setup_required') {
      setMode('setup');
    } else if (mode === 'setup') {
      setMode('login');
    }
  }, [authStatus, mode]);

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


  // Forgot Password & Emergency Recovery Modal State
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState<'emergency' | 'smtp'>('emergency');
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverCode, setRecoverCode] = useState('');
  const [recoverNewPassword, setRecoverNewPassword] = useState('');
  const [recoverNewEmail, setRecoverNewEmail] = useState('');
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [recoverySuccess, setRecoverySuccess] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

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

  // Registration Form State
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [registerNameTouched, setRegisterNameTouched] = useState(false);
  const [registerEmailTouched, setRegisterEmailTouched] = useState(false);
  const [registerPasswordTouched, setRegisterPasswordTouched] = useState(false);
  const [registerConfirmTouched, setRegisterConfirmTouched] = useState(false);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState<{
    approvalRequired: boolean;
    message: string;
    email: string;
    name: string;
  } | null>(null);

  // Email validation regex (standard RFC 5322 compatible format)
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr.trim());
  };

  const registerNameError =
    registerNameTouched && (!registerName.trim() || registerName.trim().length < 2)
      ? 'Full name is required (minimum 2 characters).'
      : null;

  const registerEmailError =
    registerEmailTouched && !registerEmail.trim()
      ? 'Email address is required.'
      : registerEmailTouched && !isValidEmail(registerEmail)
      ? 'Please enter a valid work or corporate email address.'
      : null;

  const registerPasswordError =
    registerPasswordTouched && !registerPassword
      ? 'Password is required.'
      : registerPasswordTouched && registerPassword.length < 8
      ? 'Password must be at least 8 characters long.'
      : null;

  const registerConfirmError =
    registerConfirmTouched && !registerConfirmPassword
      ? 'Please confirm your password.'
      : registerConfirmTouched && registerConfirmPassword !== registerPassword
      ? 'Passwords do not match.'
      : null;

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterNameTouched(true);
    setRegisterEmailTouched(true);
    setRegisterPasswordTouched(true);
    setRegisterConfirmTouched(true);
    setRegisterError(null);

    const trimmedName = registerName.trim();
    const trimmedEmail = registerEmail.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setRegisterError('Please enter your full name (minimum 2 characters).');
      return;
    }

    if (!trimmedEmail || !isValidEmail(trimmedEmail)) {
      setRegisterError('Please enter a valid work or corporate email address.');
      return;
    }

    if (!registerPassword || registerPassword.length < 8) {
      setRegisterError('Password must be at least 8 characters long (12+ characters recommended).');
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setRegisterError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    try {
      setIsRegisterSubmitting(true);
      const res = await registerUser({
        name: trimmedName,
        email: trimmedEmail,
        password: registerPassword,
      });

      setRegisterSuccess({
        approvalRequired: Boolean(res.approvalRequired),
        message:
          res.message ||
          (res.approvalRequired
            ? 'Registration successful — awaiting administrator approval.'
            : 'Registration successful! Your account is active.'),
        email: trimmedEmail,
        name: trimmedName,
      });

      if (!res.approvalRequired && onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setRegisterError(err.message || 'Registration failed. Please check your information and try again.');
    } finally {
      setIsRegisterSubmitting(false);
    }
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
  const registerStrength = getPasswordStrength(registerPassword);

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
      setForgotStatus({ loading: true, error: undefined, info: undefined, details: undefined });
      const res = await api.forgotPassword(emailToQuery);

      if (res && res.configured === false) {
        setForgotStatus({
          loading: false,
          error: 'Self-service email recovery is unconfigured on this server.',
          details:
            res.message ||
            'Outbound SMTP mail gateway is not enabled. If you are an Employee or Manager, your company Super Administrator can reset passwords instantly in Settings > Team & Access Control. If you are a Super Administrator, use the Emergency Recovery Code tab or server CLI.',
        });
      } else {
        setForgotStatus({
          loading: false,
          info: res?.message || 'Password reset request processed. If an account matches, instructions have been dispatched.',
        });
      }
    } catch (err: any) {
      setForgotStatus({
        loading: false,
        error: err?.message || 'Unable to process password reset request.',
      });
    }
  };

  // Emergency Super Admin Recovery Submit
  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecoveryError(null);
    setRecoverySuccess(null);

    const emailToUse = (recoverEmail || loginEmail || '').trim();
    const cleanCode = recoverCode.trim().toUpperCase();

    if (!cleanCode) {
      setRecoveryError('Emergency recovery code is required.');
      return;
    }

    if (recoverNewPassword.length < 8) {
      setRecoveryError('New password must be at least 8 characters long.');
      return;
    }

    try {
      setIsRecovering(true);
      await recoverSuperAdmin({
        email: emailToUse || undefined,
        recoveryCode: cleanCode,
        newPassword: recoverNewPassword,
        newEmail: recoverNewEmail.trim() ? recoverNewEmail.trim().toLowerCase() : undefined,
      });
      setRecoverySuccess('Super Admin account recovered successfully! Redirecting...');
      setTimeout(() => {
        setIsForgotPasswordOpen(false);
        if (onSuccess) onSuccess();
      }, 1000);
    } catch (err: any) {
      setRecoveryError(err?.message || 'Invalid recovery code. Please check your emergency credentials.');
    } finally {
      setIsRecovering(false);
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
                    className="mb-5 p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs space-y-1.5 animate-in fade-in duration-150"
                  >
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{loginError}</span>
                    </div>
                    <div className="pl-6.5 text-[11px] text-rose-600 dark:text-rose-400">
                      Lost access?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setRecoverEmail(loginEmail || '');
                          setForgotEmail(loginEmail || '');
                          setRecoveryError(null);
                          setRecoverySuccess(null);
                          setIsForgotPasswordOpen(true);
                        }}
                        className="font-bold underline hover:text-rose-800 dark:hover:text-rose-200"
                      >
                        Reset password using Emergency Recovery Code or Server Key
                      </button>
                    </div>
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
                          setForgotEmail(loginEmail || '');
                          setRecoverEmail(loginEmail || '');
                          setRecoveryError(null);
                          setRecoverySuccess(null);
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

                {/* Don't have an account? Create account */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setRegisterError(null);
                        setRegisterSuccess(null);
                        setMode('register');
                      }}
                      className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                    >
                      Create account
                    </button>
                  </p>
                </div>

                {/* First-time Setup Link if applicable */}
                {authStatus === 'setup_required' && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      First time using BillFlow?{' '}
                      <button
                        type="button"
                        onClick={() => setMode('setup')}
                        className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      >
                        Initialize Super Admin
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ------------------------------------------------------------- */}
            {/* MODE: REGISTRATION FORM                                       */}
            {/* ------------------------------------------------------------- */}
            {mode === 'register' && (
              <div>
                {/* Branding & Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/25 mb-3">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Create account
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Sign up to join your team on BillFlow
                  </p>
                </div>

                {/* SUCCESS NOTICE */}
                {registerSuccess ? (
                  <div className="space-y-5 animate-in fade-in duration-200">
                    <div className="p-5 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 text-xs space-y-3">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-200">
                            {registerSuccess.approvalRequired
                              ? 'Registration successful — awaiting administrator approval.'
                              : 'Registration successful!'}
                          </h3>
                          <p className="text-xs text-emerald-700 dark:text-emerald-300 leading-relaxed">
                            {registerSuccess.approvalRequired ? (
                              <>
                                Account registered for <strong className="font-semibold">{registerSuccess.email}</strong>. For security and confidential financial data protection, new team accounts require Super Administrator review before accessing business records.
                              </>
                            ) : (
                              <>
                                Your employee account has been created for <strong className="font-semibold">{registerSuccess.email}</strong> and is active.
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      {registerSuccess.approvalRequired && (
                        <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-900/60 text-[11px] text-emerald-700 dark:text-emerald-400 space-y-1">
                          <p>
                            • A registration record has been added to the Super Admin's Team Management console.
                          </p>
                          <p>
                            • Once approved by the administrator, you can sign in directly with your email and password.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={() => {
                          setLoginEmail(registerSuccess.email);
                          setLoginPassword('');
                          setRegisterSuccess(null);
                          setMode('login');
                        }}
                        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-500/25 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <span>Sign in to BillFlow</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setRegisterSuccess(null);
                          setRegisterName('');
                          setRegisterEmail('');
                          setRegisterPassword('');
                          setRegisterConfirmPassword('');
                          setRegisterNameTouched(false);
                          setRegisterEmailTouched(false);
                          setRegisterPasswordTouched(false);
                          setRegisterConfirmTouched(false);
                        }}
                        className="w-full py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      >
                        Register another account
                      </button>
                    </div>
                  </div>
                ) : (
                  /* REGISTRATION FORM */
                  <form onSubmit={handleRegisterSubmit} noValidate className="space-y-4">
                    {/* Error Banner */}
                    {registerError && (
                      <div
                        role="alert"
                        aria-live="assertive"
                        className="p-3.5 rounded-xl border border-rose-200 dark:border-rose-900/80 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
                      >
                        <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                        <span className="leading-relaxed font-medium">{registerError}</span>
                      </div>
                    )}

                    {/* Full Name Field */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="register-name"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Full name *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          id="register-name"
                          name="name"
                          type="text"
                          autoComplete="name"
                          required
                          value={registerName}
                          onChange={(e) => {
                            setRegisterName(e.target.value);
                            if (registerError) setRegisterError(null);
                          }}
                          onBlur={() => setRegisterNameTouched(true)}
                          placeholder="e.g. Ramesh Kumar"
                          className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            registerNameError
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : 'border-slate-300 dark:border-slate-700/80 focus:border-blue-600 focus:ring-blue-500/20'
                          }`}
                        />
                      </div>
                      {registerNameError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-1">
                          {registerNameError}
                        </p>
                      )}
                    </div>

                    {/* Email Field */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="register-email"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Email address *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                          <Mail className="w-4 h-4" />
                        </div>
                        <input
                          id="register-email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          value={registerEmail}
                          onChange={(e) => {
                            setRegisterEmail(e.target.value);
                            if (registerError) setRegisterError(null);
                          }}
                          onBlur={() => setRegisterEmailTouched(true)}
                          placeholder="name@company.com"
                          className={`w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            registerEmailError
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : 'border-slate-300 dark:border-slate-700/80 focus:border-blue-600 focus:ring-blue-500/20'
                          }`}
                        />
                      </div>
                      {registerEmailError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-1">
                          {registerEmailError}
                        </p>
                      )}
                    </div>

                    {/* Password Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="register-password"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          Password *
                        </label>
                        <span className="text-[11px] text-slate-400 dark:text-slate-500">
                          12+ chars recommended
                        </span>
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="register-password"
                          name="password"
                          type={showRegisterPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={registerPassword}
                          onChange={(e) => {
                            setRegisterPassword(e.target.value);
                            if (registerError) setRegisterError(null);
                          }}
                          onBlur={() => setRegisterPasswordTouched(true)}
                          placeholder="Create a strong password"
                          className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            registerPasswordError
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : 'border-slate-300 dark:border-slate-700/80 focus:border-blue-600 focus:ring-blue-500/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                          aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                          tabIndex={0}
                        >
                          {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Password Strength Indicator */}
                      {registerPassword && (
                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500">Password strength:</span>
                            <span
                              className={`font-semibold ${
                                registerStrength.score <= 1
                                  ? 'text-rose-500'
                                  : registerStrength.score === 2
                                  ? 'text-amber-500'
                                  : 'text-emerald-500'
                              }`}
                            >
                              {registerStrength.label}
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex gap-1">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                registerStrength.score >= 1 ? registerStrength.color : 'bg-transparent'
                              }`}
                              style={{ width: '33.3%' }}
                            />
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                registerStrength.score >= 2 ? registerStrength.color : 'bg-transparent'
                              }`}
                              style={{ width: '33.3%' }}
                            />
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                registerStrength.score >= 3 ? registerStrength.color : 'bg-transparent'
                              }`}
                              style={{ width: '33.4%' }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-500 pt-1">
                            <span className={registerPassword.length >= 8 ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium' : 'flex items-center gap-1'}>
                              ✓ At least 8 chars
                            </span>
                            <span className={registerPassword.length >= 12 ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium' : 'flex items-center gap-1'}>
                              ✓ 12+ recommended
                            </span>
                            <span className={/[A-Z]/.test(registerPassword) && /[a-z]/.test(registerPassword) ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium' : 'flex items-center gap-1'}>
                              ✓ Upper &amp; lower case
                            </span>
                            <span className={/[0-9]/.test(registerPassword) && /[^A-Za-z0-9]/.test(registerPassword) ? 'text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium' : 'flex items-center gap-1'}>
                              ✓ Numbers &amp; symbols
                            </span>
                          </div>
                        </div>
                      )}

                      {registerPasswordError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-1">
                          {registerPasswordError}
                        </p>
                      )}
                    </div>

                    {/* Confirm Password Field */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor="register-confirm-password"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                        >
                          Confirm password *
                        </label>
                        {registerConfirmPassword && (
                          <span
                            className={`text-[11px] font-semibold flex items-center gap-1 ${
                              registerConfirmPassword === registerPassword
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-rose-500'
                            }`}
                          >
                            {registerConfirmPassword === registerPassword ? (
                              <>
                                <Check className="w-3.5 h-3.5" /> Passwords match
                              </>
                            ) : (
                              'Passwords do not match'
                            )}
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 dark:text-slate-500">
                          <Lock className="w-4 h-4" />
                        </div>
                        <input
                          id="register-confirm-password"
                          name="confirmPassword"
                          type={showRegisterConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          required
                          value={registerConfirmPassword}
                          onChange={(e) => {
                            setRegisterConfirmPassword(e.target.value);
                            if (registerError) setRegisterError(null);
                          }}
                          onBlur={() => setRegisterConfirmTouched(true)}
                          placeholder="Re-enter your chosen password"
                          className={`w-full pl-10 pr-11 py-2.5 text-sm rounded-xl border bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all ${
                            registerConfirmError
                              ? 'border-rose-500 focus:ring-rose-500/20'
                              : 'border-slate-300 dark:border-slate-700/80 focus:border-blue-600 focus:ring-blue-500/20'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                          aria-label={showRegisterConfirmPassword ? 'Hide password' : 'Show password'}
                          tabIndex={0}
                        >
                          {showRegisterConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      {registerConfirmError && (
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium pl-1">
                          {registerConfirmError}
                        </p>
                      )}
                    </div>

                    {/* Role & Access Notice */}
                    <div className="p-3 rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                      <span>
                        Registrations receive standard Employee permissions. Access to financial data, GST ledgers, and invoice creation is governed by your organization's Super Administrator.
                      </span>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      disabled={isRegisterSubmitting}
                      className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-[#0F172A]"
                    >
                      {isRegisterSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Creating account...</span>
                        </>
                      ) : (
                        <>
                          <span>Create account</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* Already have an account? Sign in */}
                <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 text-center">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setLoginError(null);
                        setMode('login');
                      }}
                      className="font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors cursor-pointer"
                    >
                      Sign in
                    </button>
                  </p>
                </div>
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
            {mode === 'setup' && authStatus === 'setup_required' && (
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

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 pt-3 gap-4">
              <button
                type="button"
                onClick={() => setRecoveryTab('emergency')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  recoveryTab === 'emergency'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Emergency Recovery Code</span>
              </button>
              <button
                type="button"
                onClick={() => setRecoveryTab('smtp')}
                className={`pb-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                  recoveryTab === 'smtp'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Role Help &amp; Gateway</span>
              </button>
            </div>

            <div className="py-4 space-y-3.5 text-xs text-slate-600 dark:text-slate-300">
              {recoveryTab === 'emergency' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Reset your Super Admin password using one of the 4 emergency recovery codes generated during initialization or your server environment key.
                  </p>

                  {recoveryError && (
                    <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{recoveryError}</span>
                    </div>
                  )}

                  {recoverySuccess && (
                    <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{recoverySuccess}</span>
                    </div>
                  )}

                  <form onSubmit={handleRecoverSubmit} className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Super Admin Email
                        </label>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                          Optional if single admin
                        </span>
                      </div>
                      <input
                        type="email"
                        value={recoverEmail}
                        onChange={(e) => setRecoverEmail(e.target.value)}
                        placeholder="e.g., admin@yourbusiness.in"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Emergency Recovery Code (or Server Key)
                      </label>
                      <input
                        type="text"
                        required
                        value={recoverCode}
                        onChange={(e) => setRecoverCode(e.target.value)}
                        placeholder="e.g., A19D-04D2"
                        className="w-full px-3 py-2 text-xs font-mono uppercase tracking-wider rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        New Password (min 8 chars)
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={recoverNewPassword}
                        onChange={(e) => setRecoverNewPassword(e.target.value)}
                        placeholder="Create new password"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Update to New Email <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <input
                        type="email"
                        value={recoverNewEmail}
                        onChange={(e) => setRecoverNewEmail(e.target.value)}
                        placeholder="e.g., your.actual.email@company.in"
                        className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0A0F1D] text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isRecovering}
                      className="w-full mt-2 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
                    >
                      {isRecovering ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Recovering Account...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Reset Password &amp; Sign In</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {recoveryTab === 'smtp' && (
                <div className="space-y-3.5">
                  <p>
                    Check role-based password recovery guidance or query the outbound SMTP email gateway:
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
                          panel.
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
                          Use the <strong>Emergency Recovery Code</strong> tab with any of your initial emergency recovery codes, or run the server CLI tool: <code className="font-mono text-blue-600 dark:text-blue-400">npx tsx scripts/recover-admin.ts</code>.
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
              )}
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
