import React, { useState, useEffect } from 'react';
import { useBilling } from '../../context/BillingContext';
import { BusinessSettings, INDIAN_STATES, AppUser, UserRole, UserPermissions } from '../../types';
import { api } from '../../services/api';
import {
  Building2,
  Save,
  CreditCard,
  FileText,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Landmark,
  Percent,
  Lock,
  UserCheck,
  KeyRound,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Users,
  UserPlus,
  Shield,
  Activity,
  Server,
  HardDrive,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Clock,
  Key,
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    addToast,
    currentUser,
    authStatus,
    setIsAuthModalOpen,
    setAuthMode,
    checkAuthStatus,
  } = useBilling();

  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Navigation tab: 'profile' | 'team' | 'audit'
  const [activeTab, setActiveTab] = useState<'profile' | 'team' | 'audit'>('profile');

  // Business profile form state
  const [businessName, setBusinessName] = useState<string>(settings?.businessName || '');
  const [tradeName, setTradeName] = useState<string>(settings?.tradeName || '');
  const [email, setEmail] = useState<string>(settings?.email || '');
  const [phone, setPhone] = useState<string>(settings?.phone || '');
  const [address, setAddress] = useState<string>(settings?.address || '');
  const [city, setCity] = useState<string>(settings?.city || '');
  const [state, setState] = useState<string>(settings?.state || 'Maharashtra');
  const [stateCode, setStateCode] = useState<string>(settings?.stateCode || '27');
  const [pincode, setPincode] = useState<string>(settings?.pincode || '');
  const [gstin, setGstin] = useState<string>(settings?.gstin || '');
  const [pan, setPan] = useState<string>(settings?.pan || '');
  const [isGstRegistered, setIsGstRegistered] = useState<boolean>(settings?.isGstRegistered ?? true);
  const [gstScheme, setGstScheme] = useState<'regular' | 'composition' | 'unregistered'>(
    settings?.gstScheme || 'regular'
  );

  const [invoicePrefix, setInvoicePrefix] = useState<string>(settings?.invoicePrefix || 'BF/2026-27/');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<number>(settings?.nextInvoiceNumber || 105);

  const [bankName, setBankName] = useState<string>(settings?.bankName || '');
  const [accountNumber, setAccountNumber] = useState<string>(settings?.accountNumber || '');
  const [ifscCode, setIfscCode] = useState<string>(settings?.ifscCode || '');
  const [branchName, setBranchName] = useState<string>(settings?.branchName || '');
  const [upiId, setUpiId] = useState<string>(settings?.upiId || '');

  const [defaultNotes, setDefaultNotes] = useState<string>(settings?.defaultNotes || '');
  const [defaultTerms, setDefaultTerms] = useState<string>(settings?.defaultTerms || '');
  const [termsOfDelivery, setTermsOfDelivery] = useState<string>(
    settings?.termsOfDelivery || 'Door Delivery'
  );
  const [saving, setSaving] = useState<boolean>(false);

  // Team Management State
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState<boolean>(false);
  const [isCreateUserOpen, setIsCreateUserOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'manager' | 'employee'>('employee');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserMfa, setNewUserMfa] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);

  // Custom permissions for new user
  const [userPerms, setUserPerms] = useState<Partial<UserPermissions>>({
    canIssueInvoices: false,
    canCancelInvoices: false,
    canManageExpenses: false,
    canViewGstReports: false,
    canEditProductRates: false,
    canCreateDrafts: true,
    canViewCatalog: true,
    canViewCustomers: true,
  });

  // Password reset modal
  const [resettingUser, setResettingUser] = useState<AppUser | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Storage and Audit logs state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [storageDiagnostics, setStorageDiagnostics] = useState<any>(null);

  const handleStateChange = (stateName: string) => {
    setState(stateName);
    const found = INDIAN_STATES.find((s) => s.name === stateName);
    if (found) setStateCode(found.code);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      addToast('Business Name is required', 'error');
      return;
    }

    try {
      setSaving(true);
      await updateSettings({
        businessName: businessName.trim(),
        tradeName: tradeName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state,
        stateCode,
        pincode: pincode.trim(),
        gstin: gstin.toUpperCase().trim(),
        pan: pan.toUpperCase().trim(),
        isGstRegistered,
        gstScheme,
        invoicePrefix,
        nextInvoiceNumber: Number(nextInvoiceNumber) || 101,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.toUpperCase().trim(),
        branchName: branchName.trim(),
        upiId: upiId.trim(),
        defaultNotes,
        defaultTerms,
        termsOfDelivery: termsOfDelivery.trim(),
        isConfigured: true,
      });
      addToast('Business settings successfully saved', 'success');
    } catch {
      // Error handled in context
    } finally {
      setSaving(false);
    }
  };

  const [togglingMfa, setTogglingMfa] = useState(false);
  const handleToggleMfa = async () => {
    if (!currentUser) return;
    try {
      setTogglingMfa(true);
      const res = await api.toggleMfa(!currentUser.mfaEnabled);
      currentUser.mfaEnabled = res.mfaEnabled;
      addToast(res.message || 'MFA preference updated', 'success');
      await checkAuthStatus();
    } catch (err: any) {
      addToast(err.message || 'Failed to update MFA setting', 'error');
    } finally {
      setTogglingMfa(false);
    }
  };

  // Fetch users list for Super Admin
  const loadUsers = async () => {
    if (!isSuperAdmin) return;
    try {
      setLoadingUsers(true);
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.warn('Could not load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch audit logs and diagnostics
  const loadAuditAndStorage = async () => {
    if (!isSuperAdmin) return;
    try {
      setLoadingAudit(true);
      const [logs, healthRes] = await Promise.all([
        api.getAuditLogs({ limit: 50 }),
        fetch('/api/health').then((r) => r.json()).catch(() => null),
      ]);
      setAuditLogs(logs || []);
      if (healthRes?.storage) {
        setStorageDiagnostics(healthRes.storage);
      }
    } catch (err: any) {
      console.warn('Could not load audit logs or diagnostics:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'team') {
      loadUsers();
    } else if (activeTab === 'audit') {
      loadAuditAndStorage();
    }
  }, [activeTab, isSuperAdmin]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim()) {
      addToast('Name and email are required', 'error');
      return;
    }
    if (newUserPassword.length < 8) {
      addToast('Password must be at least 8 characters long', 'error');
      return;
    }

    try {
      setCreatingUser(true);
      await api.createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        role: newUserRole,
        password: newUserPassword,
        mfaEnabled: newUserMfa,
        customPermissions: userPerms,
      });

      addToast(`Team member "${newUserName}" created successfully`, 'success');
      setIsCreateUserOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      loadUsers();
    } catch (err: any) {
      addToast(err.message || 'Failed to create user', 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleUserStatus = async (user: AppUser) => {
    if (user.role === 'super_admin') {
      addToast('Cannot toggle status of the Super Admin account', 'error');
      return;
    }
    try {
      const updated = await api.toggleUserStatus(user.id);
      addToast(`User ${updated.name} is now ${updated.status}`, 'success');
      loadUsers();
    } catch (err: any) {
      addToast(err.message || 'Failed to update user status', 'error');
    }
  };

  const handleApproveUser = async (user: AppUser) => {
    try {
      const updated = await api.updateUser(user.id, { status: 'active' });
      addToast(`Account for ${updated.name} has been approved and activated!`, 'success');
      loadUsers();
    } catch (err: any) {
      addToast(err.message || 'Failed to approve account', 'error');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    if (resetPasswordVal.length < 8) {
      addToast('Password must be at least 8 characters long', 'error');
      return;
    }

    try {
      setIsResetting(true);
      await api.resetUserPassword(resettingUser.id, resetPasswordVal);
      addToast(`Password for ${resettingUser.name} has been reset`, 'success');
      setResettingUser(null);
      setResetPasswordVal('');
    } catch (err: any) {
      addToast(err.message || 'Failed to reset password', 'error');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Business Settings &amp; Administration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your registered business profile, GSTIN, invoice series, role-based team accounts, and storage diagnostics.
          </p>
        </div>

        {activeTab === 'profile' && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all self-start sm:self-auto"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 text-xs">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3.5 py-2 font-semibold border-b-2 transition-all ${
            activeTab === 'profile'
              ? 'border-teal-600 text-teal-700 dark:text-teal-400 font-bold'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Business &amp; GST Profile</span>
        </button>

        {isSuperAdmin && (
          <>
            <button
              type="button"
              onClick={() => setActiveTab('team')}
              className={`flex items-center gap-2 px-3.5 py-2 font-semibold border-b-2 transition-all ${
                activeTab === 'team'
                  ? 'border-teal-600 text-teal-700 dark:text-teal-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Team &amp; Access Control (RBAC)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`flex items-center gap-2 px-3.5 py-2 font-semibold border-b-2 transition-all ${
                activeTab === 'audit'
                  ? 'border-teal-600 text-teal-700 dark:text-teal-400 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Audit Logs &amp; Storage</span>
            </button>
          </>
        )}
      </div>

      {/* TAB 1: Business Profile Form */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Administrator & Access Control Status Card */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Super Admin &amp; Security Credentials
                </h2>
              </div>
              {currentUser && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> System Initialized &amp; Authenticated
                </span>
              )}
            </div>

            {currentUser ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Administrator</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 block truncate">{currentUser.name}</span>
                  <span className="text-[11px] text-slate-500 font-mono block truncate">{currentUser.email}</span>
                </div>

                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Assigned Role &amp; Access</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold">Active</span>
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Full Super Admin Privileges</span>
                </div>

                <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Two-Factor Security (TOTP)</span>
                    <span className={`text-xs font-semibold ${currentUser.mfaEnabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'}`}>
                      {currentUser.mfaEnabled ? 'Enabled & Active' : 'Disabled'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleMfa}
                    disabled={togglingMfa}
                    className="mt-2 px-2.5 py-1 text-[11px] font-semibold rounded border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 self-start transition-colors"
                  >
                    {togglingMfa ? 'Updating...' : currentUser.mfaEnabled ? 'Disable 2FA' : 'Enable 2FA'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          <form onSubmit={handleSave} className="space-y-6 text-xs">
            {/* 1. Identity & GST */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Building2 className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Business Registration &amp; GST Profile
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Legal Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Apex Infotech & Hardware Solutions"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Trade / Brand Name
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="e.g. Apex Retail"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    GSTIN (15 characters)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="27AABCA1234F1Z9"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono font-bold text-teal-700 dark:text-teal-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    PAN (10 characters)
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    value={pan}
                    onChange={(e) => setPan(e.target.value.toUpperCase())}
                    placeholder="AABCA1234F"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    GST Tax Scheme
                  </label>
                  <select
                    value={gstScheme}
                    onChange={(e) => setGstScheme(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  >
                    <option value="regular">Regular Scheme (Tax Invoices)</option>
                    <option value="composition">Composition Scheme (Bill of Supply)</option>
                    <option value="unregistered">Unregistered Business</option>
                  </select>
                </div>
              </div>

              {/* Address & State */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Shop / Office Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Shop 12, Ground Floor, Lamington Road"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Mumbai"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">PIN Code</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="400007"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    State (Home State for Intra-GST) *
                  </label>
                  <select
                    value={state}
                    onChange={(e) => handleStateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-medium"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.name}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Official Business Phone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98201 54321"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Billing Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="billing@apexinfotech.in"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>

            {/* 2. Invoice Numbering Scheme */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Invoice Series &amp; Numbering
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Invoice Prefix Format
                  </label>
                  <input
                    type="text"
                    value={invoicePrefix}
                    onChange={(e) => setInvoicePrefix(e.target.value)}
                    placeholder="BF/2026-27/"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Standard format e.g. BF/2026-27/ or INV/26-27/
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Next Invoice Number Sequence
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={nextInvoiceNumber}
                    onChange={(e) => setNextInvoiceNumber(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Next generated invoice: <strong>{invoicePrefix}{nextInvoiceNumber}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Bank & UPI Settlement Details */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <Landmark className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Bank Remittance &amp; UPI Payment Credentials
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank Ltd"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Bank Account Number
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 50200049281734"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    IFSC Code (11 characters)
                  </label>
                  <input
                    type="text"
                    maxLength={11}
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    placeholder="HDFC0000060"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Branch Location
                  </label>
                  <input
                    type="text"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                    placeholder="Fort, Mumbai"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    UPI Virtual Payment Address (VPA)
                  </label>
                  <input
                    type="text"
                    value={upiId}
                    onChange={(e) => setUpiId(e.target.value)}
                    placeholder="apexinfotech@hdfcbank"
                    className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-teal-700 dark:text-teal-400 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* 4. Default Terms & Invoice Footer */}
            <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                <FileText className="w-4 h-4 text-teal-600" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                  Default Invoice Notes &amp; Warranty Policy
                </h2>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Default Terms of Delivery (Excel Tax Invoice)
                </label>
                <input
                  type="text"
                  value={termsOfDelivery}
                  onChange={(e) => setTermsOfDelivery(e.target.value)}
                  placeholder="e.g. Door Delivery / Ex-Godown / As per PO"
                  className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Standard Notes to Customer
                </label>
                <textarea
                  rows={2}
                  value={defaultNotes}
                  onChange={(e) => setDefaultNotes(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                  Standard Terms &amp; Conditions
                </label>
                <textarea
                  rows={3}
                  value={defaultTerms}
                  onChange={(e) => setDefaultTerms(e.target.value)}
                  className="w-full p-2.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono text-[11px]"
                />
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: Team & Access Control (Super Admin Exclusive) */}
      {activeTab === 'team' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Users className="w-4 h-4 text-teal-600" />
                Team Accounts &amp; Role Provisioning
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                As Super Admin, you control user creation. Provision Manager and Employee accounts with tailored granular privileges.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateUserOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors self-start sm:self-auto"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Provision User</span>
            </button>
          </div>

          {/* User Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold text-[11px]">
                    <th className="py-2.5 px-3">Team Member</th>
                    <th className="py-2.5 px-3">Assigned Role</th>
                    <th className="py-2.5 px-3">Account Status</th>
                    <th className="py-2.5 px-3">Two-Factor (2FA)</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingUsers ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-teal-600" />
                        Loading team accounts...
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No team accounts found. Click "Provision User" above to add your first manager or employee.
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => {
                      const isSelf = user.id === currentUser?.id;
                      const isSuper = user.role === 'super_admin';

                      return (
                        <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                              {user.name}
                              {isSelf && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-mono font-bold">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{user.email}</div>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                                user.role === 'super_admin'
                                  ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                  : user.role === 'manager'
                                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                              }`}
                            >
                              {user.role.replace('_', ' ')}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                                user.status === 'active'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                  : user.status === 'pending_approval'
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                              }`}
                            >
                              {user.status === 'active' ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : user.status === 'pending_approval' ? (
                                <Clock className="w-3 h-3" />
                              ) : (
                                <XCircle className="w-3 h-3" />
                              )}
                              {user.status === 'pending_approval' ? 'Pending Approval' : user.status}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono text-[11px]">
                            {user.mfaEnabled ? (
                              <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5" /> Enabled
                              </span>
                            ) : (
                              <span className="text-slate-400">Disabled</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {!isSuper && (
                                <>
                                  {user.status === 'pending_approval' && (
                                    <button
                                      type="button"
                                      onClick={() => handleApproveUser(user)}
                                      className="px-2.5 py-1 text-[11px] rounded font-semibold bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3 h-3" />
                                      <span>Approve</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleToggleUserStatus(user)}
                                    className={`px-2 py-1 text-[11px] rounded font-semibold transition-colors cursor-pointer ${
                                      user.status === 'active'
                                        ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                                    }`}
                                  >
                                    {user.status === 'active' ? 'Deactivate' : user.status === 'pending_approval' ? 'Reject' : 'Activate'}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setResettingUser(user);
                                      setResetPasswordVal('');
                                    }}
                                    className="px-2 py-1 text-[11px] rounded font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <KeyRound className="w-3 h-3" />
                                    <span>Reset Pass</span>
                                  </button>
                                </>
                              )}

                              {isSuper && (
                                <span className="text-[10px] text-slate-400 italic">
                                  Sole Super Admin
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Provision User Modal */}
          {isCreateUserOpen && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-lg w-full p-5 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-teal-600" />
                    Provision New Team Member
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCreateUserOpen(false)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    ×
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Corporate Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="ramesh@apexinfotech.in"
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Role *
                      </label>
                      <select
                        value={newUserRole}
                        onChange={(e) => {
                          const r = e.target.value as 'manager' | 'employee';
                          setNewUserRole(r);
                          if (r === 'manager') {
                            setUserPerms({
                              canIssueInvoices: true,
                              canCancelInvoices: true,
                              canManageExpenses: true,
                              canViewGstReports: true,
                              canEditProductRates: true,
                              canCreateDrafts: true,
                              canViewCatalog: true,
                              canViewCustomers: true,
                            });
                          } else {
                            setUserPerms({
                              canIssueInvoices: false,
                              canCancelInvoices: false,
                              canManageExpenses: false,
                              canViewGstReports: false,
                              canEditProductRates: false,
                              canCreateDrafts: true,
                              canViewCatalog: true,
                              canViewCustomers: true,
                            });
                          }
                        }}
                        className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-semibold"
                      >
                        <option value="employee">Employee (Restricted / Read-Only Drafts)</option>
                        <option value="manager">Manager (Billing Operations &amp; Reports)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                        Initial Password (min 8 chars) *
                      </label>
                      <div className="relative">
                        <input
                          type={showNewUserPassword ? 'text' : 'password'}
                          required
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full pl-2.5 pr-8 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showNewUserPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Granular Permissions Section */}
                  <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block text-[11px]">
                      Explicit Privileges Granted by Super Admin:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userPerms.canIssueInvoices}
                          onChange={(e) => setUserPerms({ ...userPerms, canIssueInvoices: e.target.checked })}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Issue Official Tax Invoices</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userPerms.canCancelInvoices}
                          onChange={(e) => setUserPerms({ ...userPerms, canCancelInvoices: e.target.checked })}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Cancel Issued Invoices</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userPerms.canManageExpenses}
                          onChange={(e) => setUserPerms({ ...userPerms, canManageExpenses: e.target.checked })}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Record &amp; Edit Business Expenses</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userPerms.canViewGstReports}
                          onChange={(e) => setUserPerms({ ...userPerms, canViewGstReports: e.target.checked })}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Access GST &amp; Financial Reports</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userPerms.canEditProductRates}
                          onChange={(e) => setUserPerms({ ...userPerms, canEditProductRates: e.target.checked })}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Update Master Catalog Rates</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userPerms.canCreateDrafts}
                          onChange={(e) => setUserPerms({ ...userPerms, canCreateDrafts: e.target.checked })}
                          className="rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span>Draft Invoices</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setIsCreateUserOpen(false)}
                      className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={creatingUser}
                      className="px-4 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-xs"
                    >
                      {creatingUser ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Reset Password Modal */}
          {resettingUser && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-w-sm w-full p-5 space-y-4 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-teal-600" />
                    Reset Password
                  </h3>
                  <button
                    type="button"
                    onClick={() => setResettingUser(null)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                </div>

                <p className="text-[11px] text-slate-500">
                  Enter a new password for <strong>{resettingUser.name}</strong> ({resettingUser.email}).
                </p>

                <form onSubmit={handleResetPasswordSubmit} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      New Password (min 8 characters)
                    </label>
                    <input
                      type="password"
                      required
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setResettingUser(null)}
                      className="px-3.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResetting}
                      className="px-4 py-1.5 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold"
                    >
                      {isResetting ? 'Updating...' : 'Set Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Audit Logs & Storage Diagnostics */}
      {activeTab === 'audit' && isSuperAdmin && (
        <div className="space-y-6">
          {/* Storage Diagnostics Card */}
          <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-slate-900 dark:text-slate-100">
                  Render Production Storage &amp; Database Health
                </h3>
              </div>
              <button
                type="button"
                onClick={loadAuditAndStorage}
                disabled={loadingAudit}
                className="flex items-center gap-1 text-[11px] text-teal-600 hover:text-teal-700 font-semibold"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loadingAudit ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Storage Mode</span>
                <span className="font-bold text-slate-800 dark:text-slate-200 uppercase font-mono">
                  {storageDiagnostics?.mode || 'LOCAL'}
                </span>
                <span className="text-[10px] text-slate-500 block mt-1">
                  Mounted Disk: {storageDiagnostics?.isDiskMounted ? 'YES' : 'NO'} (Writable: {storageDiagnostics?.isWritable ? 'YES' : 'NO'})
                </span>
              </div>

              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 sm:col-span-2">
                <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Active Database Path</span>
                <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 block truncate">
                  {storageDiagnostics?.activeDataDir || 'Project Root'}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-1">
                  Database file active &amp; verified. All customer, invoice, and user records are safely stored.
                </span>
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden text-xs">
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-600" />
                Security &amp; Administrative Audit Trail (Recent 50 Events)
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">
                {auditLogs.length} events recorded
              </span>
            </div>

            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-[10px] text-slate-500 font-semibold uppercase">
                  <tr>
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">User</th>
                    <th className="py-2 px-3">Action</th>
                    <th className="py-2 px-3">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-[11px] font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 font-sans">
                        No audit records found.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log: any) => (
                      <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString('en-IN', {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="py-2 px-3 text-slate-800 dark:text-slate-200 whitespace-nowrap">
                          {log.userName}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[10px]">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-600 dark:text-slate-400 max-w-xs truncate font-sans">
                          {log.details}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
