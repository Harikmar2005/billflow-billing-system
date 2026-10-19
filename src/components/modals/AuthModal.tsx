import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ArrowRight,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    authStatus,
    authMode,
    setAuthMode,
    isAuthModalOpen,
    setIsAuthModalOpen,
    registerSuperAdmin,
    loginUser,
    verifyMfa,
    loading,
    checkAuthStatus,
  } = useBilling();

  // Setup Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // MFA Challenge State
  const [mfaTempToken, setMfaTempToken] = useState<string>('');
  const [mfaCode, setMfaCode] = useState('');

  // MFA Initial Setup Credentials (post-setup display)
  const [mfaSetupData, setMfaSetupData] = useState<{
    mfaSecret?: string;
    recoveryCodes?: string[];
  } | null>(null);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Error & Status
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  // Calculate password strength
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = getPasswordStrength(password);

  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Please enter your full administrator name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setFormError('Please enter a valid business email address.');
      return;
    }
    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify your confirmation password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await registerSuperAdmin({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        mfaEnabled,
      });

      if (mfaEnabled && (res.mfaSecret || res.recoveryCodes)) {
        setMfaSetupData({
          mfaSecret: res.mfaSecret,
          recoveryCodes: res.recoveryCodes,
        });
      }
    } catch (err: any) {
      setFormError(err.message || 'Failed to initialize Super Admin account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!loginEmail.trim() || !loginPassword) {
      setFormError('Email and password are required.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await loginUser({
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });

      if (res && 'mfaRequired' in res && res.mfaRequired) {
        setMfaTempToken(res.tempToken || '');
        setAuthMode('mfa');
      }
    } catch (err: any) {
      setFormError(err.message || 'Invalid email or password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!mfaCode.trim()) {
      setFormError('Please enter the 6-digit TOTP code or emergency recovery code.');
      return;
    }

    try {
      setIsSubmitting(true);
      await verifyMfa(mfaTempToken, mfaCode.trim());
    } catch (err: any) {
      setFormError(err.message || 'Invalid MFA code.');
    } finally {
      setIsSubmitting(false);
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
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-[#1E293B] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transition-colors my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Post-Setup MFA Recovery Codes Screen */}
        {mfaSetupData ? (
          <div className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Save Your Multi-Factor Credentials
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Two-factor authentication has been enabled for your Super Admin account.
                </p>
              </div>
            </div>

            {mfaSetupData.mfaSecret && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  TOTP Secret Key (For Authenticator App)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={mfaSetupData.mfaSecret}
                    className="flex-1 font-mono text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200"
                  />
                  <button
                    type="button"
                    onClick={handleCopySecret}
                    className="px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSecret ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>
            )}

            {mfaSetupData.recoveryCodes && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    Emergency Recovery Codes (Save Securely)
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyCodes}
                    className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
                  >
                    {copiedCodes ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCodes ? 'Codes Copied!' : 'Copy All'}</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                  {mfaSetupData.recoveryCodes.map((c, i) => (
                    <div key={i} className="py-1 px-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
                      {c}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 flex items-center gap-1.5 mt-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Each recovery code can only be used once if you lose your phone.</span>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                setMfaSetupData(null);
                setIsAuthModalOpen(false);
              }}
              className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <span>I Have Saved My Recovery Credentials — Launch BillFlow</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : authMode === 'setup' ? (
          /* ======================================================== */
          /* First-Time Super Admin Initialization Form               */
          /* ======================================================== */
          <form onSubmit={handleSetupSubmit} className="p-6 space-y-5">
            {/* Modal Header */}
            <div className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 mb-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Initial System Setup Required</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Register First Super Admin
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  No administrator exists in the database. Create the master Super Admin account to access business settings, GST ledgers, and manage users.
                </p>
              </div>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Hari Kumar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Administrator Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. admin@apexinfotech.in"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Master Password (Min 8 Characters) *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong master password"
                    className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Password strength:</span>
                      <span className="font-semibold">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className={`h-full ${strength.color} transition-all duration-300`}
                        style={{ width: `${(strength.score / 3) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Confirm Master Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type your password"
                  className={`w-full px-3 py-2 rounded-lg border ${
                    confirmPassword && password !== confirmPassword
                      ? 'border-rose-400 dark:border-rose-800 bg-rose-50/50'
                      : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                  } text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500`}
                />
                {confirmPassword && password === confirmPassword && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-medium">
                    <CheckCircle2 className="w-3 h-3" /> Passwords match
                  </span>
                )}
              </div>

              {/* MFA Checkbox */}
              <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/60 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                <input
                  type="checkbox"
                  checked={mfaEnabled}
                  onChange={(e) => setMfaEnabled(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500 mt-0.5"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                    Enable Two-Factor Authentication (TOTP)
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Generates a TOTP key for authenticator apps (Google Authenticator, Authy) and emergency recovery codes.
                  </span>
                </div>
              </label>
            </div>

            {/* Security Guarantee */}
            <div className="p-3 rounded-lg border border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/40 text-[11px] text-teal-800 dark:text-teal-300 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-teal-600 dark:text-teal-400" />
              <span>
                <strong>Zero default passwords.</strong> Your password is cryptographically salted and hashed using PBKDF2 with SHA-512 (100,000 rounds).
              </span>
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Initializing Super Admin...</span>
                ) : (
                  <>
                    <span>Initialize Super Admin &amp; Launch BillFlow</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : authMode === 'login' ? (
          /* ======================================================== */
          /* Login Form (When Super Admin Already Exists)             */
          /* ======================================================== */
          <form onSubmit={handleLoginSubmit} className="p-6 space-y-5">
            <div className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                <Lock className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 mb-1">
                  <span>Sign In</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  BillFlow Billing Workspace
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Sign in with your registered administrator or staff account.
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="admin@apexinfotech.in"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your account password"
                    className="w-full pl-3 pr-9 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span>Verifying Credentials...</span>
                ) : (
                  <>
                    <span>Sign In to Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
              <span>Trouble signing in?</span>
              <button
                type="button"
                onClick={() => checkAuthStatus()}
                className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
              >
                Re-check System Status
              </button>
            </div>
          </form>
        ) : (
          /* ======================================================== */
          /* Two-Factor Authentication Prompt                         */
          /* ======================================================== */
          <form onSubmit={handleMfaSubmit} className="p-6 space-y-5">
            <div className="flex items-start gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 flex items-center justify-center text-teal-600 dark:text-teal-400 shrink-0 mt-0.5">
                <KeyRound className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 mb-1">
                  <span>2-Step Verification</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Two-Factor Authentication
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter the 6-digit TOTP code from your authenticator application or an emergency recovery code.
                </p>
              </div>
            </div>

            {formError && (
              <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                  Authentication Code / Recovery Code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={12}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.toUpperCase())}
                  placeholder="e.g. 123456 or A1B2-C3D4"
                  className="w-full text-center font-mono tracking-widest text-lg font-bold px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="py-2.5 px-4 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Back to Login
              </button>
              <button
                type="submit"
                disabled={isSubmitting || loading}
                className="flex-1 py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs shadow-sm disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                {isSubmitting ? <span>Verifying...</span> : <span>Verify &amp; Continue</span>}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
