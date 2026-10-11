import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { BusinessSettings, INDIAN_STATES } from '../../types';
import {
  Building2,
  Save,
  CreditCard,
  FileText,
  ShieldCheck,
  CheckCircle,
  HelpCircle,
  Landmark,
  Percent
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, addToast } = useBilling();

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
    } catch {
      // Error handled in context
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Business Profile & Tax Configuration
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure your registered business details, GSTIN, invoice sequence, and electronic bank remittance credentials.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-md bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-all"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* 1. Identity & GST */}
        <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              Business Registration & GST Profile
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
              Invoice Series & Numbering
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
              Bank Remittance & UPI Payment Credentials
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
              Default Invoice Notes & Warranty Policy
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
              Standard Terms & Conditions
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
  );
};
