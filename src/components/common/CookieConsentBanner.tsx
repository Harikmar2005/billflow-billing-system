import React, { useState, useEffect } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Cookie, ShieldCheck, Check, X, ArrowRight, Settings2 } from 'lucide-react';

export const CookieConsentBanner: React.FC = () => {
  const { setCurrentView } = useBilling();
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('billflow_cookie_consent');
    if (!consent) {
      // Delay slightly for smooth appearance
      const timer = setTimeout(() => setShowBanner(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('billflow_cookie_consent', JSON.stringify({ type: 'all', date: new Date().toISOString() }));
    setShowBanner(false);
  };

  const handleAcceptEssential = () => {
    localStorage.setItem('billflow_cookie_consent', JSON.stringify({ type: 'essential', date: new Date().toISOString() }));
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <aside
      aria-label="Cookie consent"
      className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-2xl p-4 text-xs text-slate-800 dark:text-slate-200 animate-in slide-in-from-bottom duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20 shrink-0">
          <Cookie className="w-5 h-5" />
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Privacy &amp; Cookie Preferences</span>
            </h3>
            <button
              onClick={handleAcceptEssential}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded"
              title="Close and accept essential only"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
            BillFlow stores your GST billing preferences and local master records in client storage. We do not sell your commercial data or track you across third-party networks.
          </p>

          {showDetails && (
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 text-[10.5px] space-y-1.5 animate-in fade-in">
              <div className="flex items-center justify-between font-semibold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-500" />
                  Essential State &amp; Auth (Required)
                </span>
                <span className="text-teal-600 font-mono">Always Active</span>
              </div>
              <p className="text-slate-500">
                Maintains your dark/light theme, active invoice draft, and business GSTIN configurations.
              </p>
              <div className="pt-1 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <span>Privacy-Safe Usage Metrics</span>
                <span className="text-slate-400 font-mono">Anonymous</span>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleAcceptAll}
              className="flex-1 px-3 py-1.5 rounded-lg font-semibold bg-teal-600 hover:bg-teal-500 text-white shadow-xs text-xs transition-colors flex items-center justify-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Accept All</span>
            </button>
            <button
              onClick={handleAcceptEssential}
              className="px-3 py-1.5 rounded-lg font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs transition-colors"
            >
              Essential Only
            </button>
            <button
              onClick={() => {
                setShowBanner(false);
                setCurrentView('privacy-policy');
              }}
              className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-0.5 ml-auto font-medium"
            >
              <span>Read Policy</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
