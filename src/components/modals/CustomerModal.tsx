import React, { useState, useEffect } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Customer, INDIAN_STATES } from '../../types';
import { X, UserPlus, Building, Phone, Mail, MapPin } from 'lucide-react';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerToEdit?: Customer | null;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({
  isOpen,
  onClose,
  customerToEdit,
}) => {
  const { createCustomer, updateCustomer, addToast } = useBilling();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('Maharashtra');
  const [stateCode, setStateCode] = useState('27');
  const [pincode, setPincode] = useState('');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState(''); // Anti-bot spam shield

  useEffect(() => {
    setErrors({});
    setHoneypot('');
    if (customerToEdit) {
      setName(customerToEdit.name);
      setPhone(customerToEdit.phone || '');
      setEmail(customerToEdit.email || '');
      setBillingAddress(customerToEdit.billingAddress || '');
      setCity(customerToEdit.city || '');
      setState(customerToEdit.state || 'Maharashtra');
      setStateCode(customerToEdit.stateCode || '27');
      setPincode(customerToEdit.pincode || '');
      setGstin(customerToEdit.gstin || '');
      setPan(customerToEdit.pan || '');
    } else {
      setName('');
      setPhone('');
      setEmail('');
      setBillingAddress('');
      setCity('');
      setState('Maharashtra');
      setStateCode('27');
      setPincode('');
      setGstin('');
      setPan('');
    }
  }, [customerToEdit, isOpen]);

  if (!isOpen) return null;

  const handleStateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedStateName = e.target.value;
    setState(selectedStateName);
    const found = INDIAN_STATES.find((s) => s.name === selectedStateName);
    if (found) {
      setStateCode(found.code);
    }
  };

  const handleGstinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setGstin(val);
    // Auto-extract PAN from GSTIN if 15 characters (digits 3 to 12)
    if (val.length >= 12 && /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}/.test(val)) {
      setPan(val.substring(2, 12));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Spam / bot protection: If honeypot is filled, abort silently
    if (honeypot.trim()) {
      console.warn('Bot detected via honeypot');
      onClose();
      return;
    }

    const newErrors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 2) {
      newErrors.name = 'Customer Name must be at least 2 characters long';
    }

    const cleanPhone = phone.replace(/[\s\-\+\(\)]/g, '');
    if (!phone.trim()) {
      newErrors.phone = 'Customer phone number is required';
    } else if (cleanPhone.length < 10) {
      newErrors.phone = 'Please enter a valid phone number (at least 10 digits)';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address (e.g. name@company.com)';
    }

    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(cleanGstin)) {
      newErrors.gstin = 'Invalid GSTIN format. Must be 15 characters (e.g. 27AABCA1234F1Z9)';
    }

    const cleanPan = pan.trim().toUpperCase();
    if (cleanPan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(cleanPan)) {
      newErrors.pan = 'Invalid PAN format. Must be 10 characters (e.g. AABCA1234F)';
    }

    if (pincode.trim() && !/^\d{6}$/.test(pincode.trim())) {
      newErrors.pincode = 'PIN code must be a 6-digit number';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      addToast(Object.values(newErrors)[0], 'error');
      return;
    }

    setErrors({});

    try {
      setSubmitting(true);
      if (customerToEdit) {
        await updateCustomer(customerToEdit.id, {
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          billingAddress: billingAddress.trim(),
          city: city.trim(),
          state,
          stateCode,
          pincode: pincode.trim(),
          gstin: cleanGstin,
          pan: cleanPan,
        });
      } else {
        await createCustomer({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim(),
          billingAddress: billingAddress.trim(),
          city: city.trim(),
          state,
          stateCode,
          pincode: pincode.trim(),
          gstin: cleanGstin,
          pan: cleanPan,
        });
      }
      onClose();
    } catch {
      // Error handled in context
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden text-xs">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              {customerToEdit ? 'Edit Customer Details' : 'Add New Customer / Client'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Honeypot field for bot/spam protection */}
          <input
            type="text"
            name="hp_field"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="hidden opacity-0 h-0 w-0 absolute pointer-events-none"
            aria-hidden="true"
          />

          {/* Customer / Company Name */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Customer or Business Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="e.g. Acme Tech Solutions Pvt Ltd or Rajesh Sharma"
              className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-950 focus:outline-none transition-colors ${
                errors.name
                  ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                  : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
              }`}
            />
            {errors.name && <p className="text-[10px] text-rose-500 mt-1">{errors.name}</p>}
          </div>

          {/* Contact Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Phone Number <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  placeholder="+91 98765 43210"
                  className={`w-full pl-8 pr-3 py-2 rounded-lg border bg-white dark:bg-slate-950 focus:outline-none font-mono ${
                    errors.phone
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
                  }`}
                />
              </div>
              {errors.phone && <p className="text-[10px] text-rose-500 mt-1">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="accounts@customer.com"
                  className={`w-full pl-8 pr-3 py-2 rounded-lg border bg-white dark:bg-slate-950 focus:outline-none ${
                    errors.email
                      ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
                  }`}
                />
              </div>
              {errors.email && <p className="text-[10px] text-rose-500 mt-1">{errors.email}</p>}
            </div>
          </div>

          {/* Tax Identification (GSTIN & PAN) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                GSTIN (15 Digits)
              </label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => {
                  handleGstinChange(e);
                  if (errors.gstin) setErrors((prev) => ({ ...prev, gstin: '' }));
                }}
                placeholder="27AABCA1234F1Z9"
                className={`w-full px-3 py-1.5 rounded border bg-white dark:bg-slate-900 focus:outline-none font-mono uppercase ${
                  errors.gstin
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
                }`}
              />
              {errors.gstin ? (
                <span className="text-[10px] text-rose-500 block mt-0.5">{errors.gstin}</span>
              ) : (
                <span className="text-[10px] text-slate-400 block mt-0.5">Leave blank for unregistered consumer</span>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                PAN (10 Digits)
              </label>
              <input
                type="text"
                maxLength={10}
                value={pan}
                onChange={(e) => {
                  setPan(e.target.value.toUpperCase());
                  if (errors.pan) setErrors((prev) => ({ ...prev, pan: '' }));
                }}
                placeholder="AABCA1234F"
                className={`w-full px-3 py-1.5 rounded border bg-white dark:bg-slate-900 focus:outline-none font-mono uppercase ${
                  errors.pan
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
                }`}
              />
              {errors.pan && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.pan}</span>}
            </div>
          </div>

          {/* Billing Address */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Billing Address
            </label>
            <textarea
              rows={2}
              value={billingAddress}
              onChange={(e) => setBillingAddress(e.target.value)}
              placeholder="Unit/Office No, Street, Landmark"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none resize-none"
            />
          </div>

          {/* Location Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                City / Town
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Mumbai"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                State (Place of Supply)
              </label>
              <select
                value={state}
                onChange={handleStateChange}
                className="w-full px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 focus:border-teal-500 focus:outline-none text-[11px]"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.name}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Pincode
              </label>
              <input
                type="text"
                maxLength={6}
                value={pincode}
                onChange={(e) => {
                  setPincode(e.target.value);
                  if (errors.pincode) setErrors((prev) => ({ ...prev, pincode: '' }));
                }}
                placeholder="400001"
                className={`w-full px-3 py-2 rounded-lg border bg-white dark:bg-slate-950 focus:outline-none font-mono ${
                  errors.pincode
                    ? 'border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-800 focus:border-teal-500'
                }`}
              />
              {errors.pincode && <span className="text-[10px] text-rose-500 block mt-0.5">{errors.pincode}</span>}
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : customerToEdit ? 'Update Customer' : 'Save Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
