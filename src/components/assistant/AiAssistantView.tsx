import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { api } from '../../services/api';
import {
  Sparkles,
  Send,
  Bot,
  Copy,
  Check,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  Package,
  Users
} from 'lucide-react';

const PRESET_QUERIES = [
  'How much gross sales and cash collections were recorded this month?',
  'Which customer invoices are currently overdue and what is the total due amount?',
  'List customers with the highest outstanding receivable balances.',
  'Which inventory items are currently running low on stock?',
  'Provide a brief financial health audit of revenues versus operational expenses.',
];

export const AiAssistantView: React.FC = () => {
  const { settings, addToast } = useBilling();
  const [query, setQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<{
    answer: string;
    model: string;
    generatedAt: string;
  } | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const handleAsk = async (textToAsk?: string) => {
    const q = textToAsk || query;
    if (!q.trim()) return;

    try {
      setLoading(true);
      const res = await api.askAiAssistant(q.trim());
      setResponse(res);
      if (!textToAsk) setQuery('');
    } catch (err: any) {
      addToast(err.message || 'Failed to query AI assistant', 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyResponse = () => {
    if (!response) return;
    navigator.clipboard.writeText(response.answer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Answer copied to clipboard', 'info');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
          BillFlow AI Business Advisor
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
            Gemini 3.8 Flash
          </span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Ask questions in plain English or Hinglish; answers are synthesized directly from verified database ledger figures.
        </p>
      </div>

      {/* Preset Query Chips */}
      <div className="space-y-2">
        <span className="text-[11px] font-semibold uppercase text-slate-400 block">
          Frequent Business Inquiries:
        </span>
        <div className="flex flex-wrap gap-2">
          {PRESET_QUERIES.map((preset, i) => (
            <button
              key={i}
              onClick={() => handleAsk(preset)}
              disabled={loading}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-teal-400 dark:hover:border-teal-600 hover:text-teal-700 transition-all text-left shadow-xs"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Input Prompt Box */}
      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex items-center gap-2">
        <Bot className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0 ml-1" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAsk();
          }}
          placeholder="Ask anything about sales, overdue payments, top customers, or stock..."
          className="w-full bg-transparent text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none"
        />
        <button
          onClick={() => handleAsk()}
          disabled={loading || !query.trim()}
          className={`px-4 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all ${
            loading || !query.trim()
              ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Ask</span>
        </button>
      </div>

      {/* Assistant Response Box */}
      <div className="p-5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm min-h-[220px]">
        {loading ? (
          <div className="h-44 flex flex-col items-center justify-center text-center">
            <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin mb-3" />
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Querying Ledger Database
            </h3>
            <p className="text-[11px] text-slate-400 mt-1">
              Extracting sales, payments, and overdue records for "{settings?.businessName}"...
            </p>
          </div>
        ) : !response ? (
          <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400">
            <Sparkles className="w-8 h-8 text-slate-300 dark:text-slate-700 mb-2" />
            <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Click one of the recommended prompts above or ask your own question.
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              BillFlow AI does not fabricate figures—all answers stem from saved records.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-semibold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800">
                  {response.model}
                </span>
                <span className="text-slate-400 text-[11px]">
                  Generated at {new Date(response.generatedAt).toLocaleTimeString()}
                </span>
              </div>

              <button
                onClick={copyResponse}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-mono text-[11px] transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-teal-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div className="font-sans text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
              {response.answer}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
