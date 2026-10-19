import React, { useState } from 'react';
import { useBilling } from '../../context/BillingContext';
import { Invoice } from '../../types';
import { formatINR, formatDate } from '../../utils/billing';
import { generateInvoicePDF } from '../../utils/pdfGenerator';
import { ExcelTaxInvoiceTemplate } from './ExcelTaxInvoiceTemplate';
import {
  X,
  Download,
  Printer,
  Share2,
  Copy,
  CreditCard,
  FileSpreadsheet
} from 'lucide-react';

interface InvoicePreviewModalProps {
  invoice: Invoice | null;
  onClose: () => void;
  onOpenPaymentModal?: (invoice: Invoice) => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  invoice,
  onClose,
  onOpenPaymentModal,
}) => {
  const { settings, addToast } = useBilling();
  const [copyType, setCopyType] = useState<'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'>(
    invoice?.copyType || 'ORIGINAL'
  );

  if (!invoice || !settings) return null;

  const handleDownloadPdf = () => {
    try {
      const doc = generateInvoicePDF(invoice, settings, copyType);
      const filename = `${invoice.invoiceNumber.replace(/\//g, '_')}_${copyType}.pdf`;
      doc.save(filename);
      addToast(`Downloaded Excel Tax Invoice: ${filename}`, 'success');
    } catch (err: any) {
      console.error('PDF generation error:', err);
      addToast('Failed to generate PDF invoice', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(
      `Hello ${invoice.customerName},\n\nHere is your Tax Invoice ${invoice.invoiceNumber} from ${settings.businessName}.\nTotal Amount: ${formatINR(invoice.totalAmount)}\nBalance Due: ${formatINR(invoice.balanceDue)}\nDue Date: ${formatDate(invoice.dueDate)}\n\nUPI Payment ID: ${settings.upiId || 'N/A'}\n\nThank you for your business!`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white animate-in fade-in duration-150">
      <div className="w-full max-w-5xl my-auto bg-slate-100 rounded-xl shadow-2xl border border-slate-300 overflow-hidden text-slate-900 print:shadow-none print:border-none print:m-0 print:max-w-none print:bg-white print:rounded-none">
        {/* Modal Toolbar (hidden on print) */}
        <div className="p-3.5 bg-white text-slate-900 flex flex-wrap items-center justify-between gap-3 no-print border-b border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded bg-teal-50 text-teal-700 border border-teal-200">
              <FileSpreadsheet className="w-4 h-4 text-[#009688]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#009688]">
                  {invoice.invoiceNumber}
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Excel Tax Invoice
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                A4 Portrait Spreadsheet Layout (JET Enterprises Standard)
              </p>
            </div>
          </div>

          {/* Copy Selector & Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            {/* Copy Type Selector */}
            <div className="flex items-center bg-slate-100 rounded-md p-0.5 border border-slate-200 text-xs">
              <span className="text-slate-600 px-2 text-[10px] uppercase font-semibold flex items-center gap-1">
                <Copy className="w-3 h-3" />
                Copy:
              </span>
              {(['ORIGINAL', 'DUPLICATE', 'TRIPLICATE'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setCopyType(type)}
                  className={`px-2 py-1 text-[11px] font-bold rounded transition-colors ${
                    copyType === type
                      ? 'bg-[#009688] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {invoice.balanceDue > 0 && onOpenPaymentModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPaymentModal(invoice);
                }}
                className="px-2.5 py-1.5 text-xs font-semibold rounded bg-[#009688] hover:bg-[#00796B] text-white transition-colors flex items-center gap-1 shadow-2xs"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Record Payment</span>
              </button>
            )}

            <button
              onClick={handleWhatsAppShare}
              className="px-2.5 py-1.5 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-colors shadow-2xs"
              title="Share invoice summary on WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">WhatsApp</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-bold rounded bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Printer className="w-3.5 h-3.5 text-[#009688]" />
              <span>Print A4</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              className="px-3 py-1.5 text-xs font-bold rounded bg-[#009688] hover:bg-[#00796B] text-white flex items-center gap-1.5 transition-colors shadow-2xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Sheet Viewport */}
        <div className="p-4 sm:p-8 bg-slate-200/70 overflow-y-auto max-h-[calc(90vh-60px)] print:p-0 print:max-h-none print:bg-white print:overflow-visible">
          <div className="bg-white shadow-xl mx-auto rounded-sm print:shadow-none print:rounded-none">
            <ExcelTaxInvoiceTemplate
              invoice={invoice}
              settings={settings}
              copyType={copyType}
              onCopyTypeChange={setCopyType}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
