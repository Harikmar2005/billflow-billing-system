import React from 'react';
import { Invoice, BusinessSettings } from '../../types';
import {
  formatINR,
  formatDate,
  amountToWordsINR,
  taxAmountToWordsINR,
} from '../../utils/billing';

interface ExcelTaxInvoiceTemplateProps {
  invoice: Invoice;
  settings: BusinessSettings;
  copyType?: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE';
  onCopyTypeChange?: (copy: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE') => void;
}

export const ExcelTaxInvoiceTemplate: React.FC<ExcelTaxInvoiceTemplateProps> = ({
  invoice,
  settings,
  copyType = 'ORIGINAL',
  onCopyTypeChange,
}) => {
  // Determine copy label
  const copyLabels = {
    ORIGINAL: 'ORIGINAL FOR RECIPIENT',
    DUPLICATE: 'DUPLICATE FOR TRANSPORTER',
    TRIPLICATE: 'TRIPLICATE FOR SUPPLIER',
  };

  // Determine effective tax rates for summary
  const effectiveGstRate =
    invoice.items.length > 0 ? invoice.items[0].gstRate : 18;
  const effectiveCgstRate = invoice.isInterState ? 0 : effectiveGstRate / 2;
  const effectiveSgstRate = invoice.isInterState ? 0 : effectiveGstRate / 2;
  const effectiveIgstRate = invoice.isInterState ? effectiveGstRate : 0;

  // Format number without symbol for tabular display
  const numFmt = (num: number) => num.toFixed(2);

  return (
    <div
      id="printable-tax-invoice"
      className="bg-white text-black font-sans text-[11px] leading-tight max-w-[210mm] mx-auto p-4 sm:p-6 print:p-0 print:max-w-none print:w-full print:m-0 print:bg-white select-text"
      style={{
        boxSizing: 'border-box',
        color: '#000000',
        backgroundColor: '#ffffff',
      }}
    >
      {/* Outer Excel Spreadsheet Container with sharp black borders */}
      <div className="border-2 border-black w-full bg-white">
        {/* Row 1: Copy Type & Centered TAX INVOICE Header */}
        <div className="border-b border-black grid grid-cols-12 bg-white">
          <div className="col-span-3 p-1.5 flex items-center">
            <span className="text-[10px] font-semibold text-slate-600">
              GST INVOICE
            </span>
          </div>

          <div className="col-span-6 p-1.5 text-center border-l border-r border-black">
            <h1 className="text-base font-extrabold tracking-wider uppercase text-black">
              TAX INVOICE
            </h1>
          </div>

          <div className="col-span-3 p-1.5 text-right flex items-center justify-end gap-1">
            {onCopyTypeChange ? (
              <div className="no-print">
                <select
                  value={copyType}
                  onChange={(e) =>
                    onCopyTypeChange(
                      e.target.value as 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE'
                    )
                  }
                  className="text-[10px] font-bold border border-black px-1 py-0.5 rounded bg-white text-black cursor-pointer uppercase"
                >
                  <option value="ORIGINAL">ORIGINAL</option>
                  <option value="DUPLICATE">DUPLICATE</option>
                  <option value="TRIPLICATE">TRIPLICATE</option>
                </select>
              </div>
            ) : null}
            <span className="text-[10px] font-bold uppercase tracking-tight text-black">
              ({copyLabels[copyType] || 'ORIGINAL FOR RECIPIENT'})
            </span>
          </div>
        </div>

        {/* Row 2: Seller Details (Left) and Invoice Meta (Right) */}
        <div className="border-b border-black grid grid-cols-12">
          {/* Seller / Consignor Info (Left 7 Cols) */}
          <div className="col-span-7 p-2.5 border-r border-black flex flex-col justify-between">
            <div>
              {/* Business Name matching Excel royal blue style */}
              <div className="text-base font-extrabold text-[#003399] tracking-wide uppercase">
                {settings.businessName || 'JET ENTERPRISES'}
              </div>

              {settings.tradeName && settings.tradeName !== settings.businessName && (
                <div className="text-[11px] font-semibold text-slate-800">
                  ({settings.tradeName})
                </div>
              )}

              <div className="text-[11px] mt-1 text-black space-y-0.5">
                <p className="font-normal">
                  {[settings.address, settings.city, settings.state, settings.pincode]
                    .filter(Boolean)
                    .join(', ')}
                </p>
                <div className="grid grid-cols-2 gap-x-2 pt-0.5 font-medium">
                  {settings.gstin && (
                    <p>
                      <strong>GSTIN:</strong>{' '}
                      <span className="font-mono">{settings.gstin}</span>
                    </p>
                  )}
                  {settings.pan && (
                    <p>
                      <strong>PAN:</strong>{' '}
                      <span className="font-mono">{settings.pan}</span>
                    </p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-x-2 pt-0.5">
                  {settings.phone && (
                    <p>
                      <strong>Contact:</strong> {settings.phone}
                    </p>
                  )}
                  {settings.email && (
                    <p>
                      <strong>Email:</strong> {settings.email}
                    </p>
                  )}
                </div>
                <p className="pt-0.5">
                  <strong>State:</strong> {settings.state} |{' '}
                  <strong>State Code:</strong>{' '}
                  <span className="font-mono">{settings.stateCode}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Invoice & Dispatch Meta Grid (Right 5 Cols) */}
          <div className="col-span-5 text-[10.5px]">
            <table className="w-full border-collapse">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-1 font-semibold w-1/2 border-r border-black bg-slate-50/60">
                    Invoice No.
                  </td>
                  <td className="p-1 font-bold font-mono text-black">
                    {invoice.invoiceNumber}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 font-semibold border-r border-black bg-slate-50/60">
                    Dated
                  </td>
                  <td className="p-1 font-mono text-black">
                    {formatDate(invoice.invoiceDate)}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 font-semibold border-r border-black bg-slate-50/60">
                    Buyer's Order / Ref No.
                  </td>
                  <td className="p-1 font-mono text-black">
                    {invoice.poNumber || '-'}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 font-semibold border-r border-black bg-slate-50/60">
                    Ref Doc Date
                  </td>
                  <td className="p-1 font-mono text-black">
                    {invoice.poDate ? formatDate(invoice.poDate) : '-'}
                  </td>
                </tr>
                <tr className="border-b border-black">
                  <td className="p-1 font-semibold border-r border-black bg-slate-50/60">
                    Vehicle No.
                  </td>
                  <td className="p-1 font-mono uppercase text-black">
                    {invoice.vehicleNumber || '-'}
                  </td>
                </tr>
                <tr>
                  <td className="p-1 font-semibold border-r border-black bg-slate-50/60">
                    Terms of Delivery
                  </td>
                  <td className="p-1 text-black">
                    {invoice.termsOfDelivery || settings.termsOfDelivery || 'As per Agreement'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 3: Customer Details Heading & Info */}
        <div className="border-b border-black grid grid-cols-12 bg-white">
          <div className="col-span-12 p-2 bg-slate-50/70 border-b border-black font-bold uppercase text-[11px] tracking-wide text-black">
            Customer Details (Details of Receiver | Billed To)
          </div>

          <div className="col-span-12 p-2.5 grid grid-cols-1 sm:grid-cols-12 gap-2">
            <div className="sm:col-span-7 space-y-0.5">
              <div className="text-[12px] font-bold text-black uppercase">
                {invoice.customerName}
              </div>
              <p className="text-[11px] text-slate-800 leading-tight">
                {invoice.billingAddress}
              </p>
              {invoice.customerPhone && (
                <p className="text-[10.5px] text-slate-700">
                  <strong>Phone:</strong> {invoice.customerPhone}
                </p>
              )}
              {invoice.customerEmail && (
                <p className="text-[10.5px] text-slate-700">
                  <strong>Email:</strong> {invoice.customerEmail}
                </p>
              )}
            </div>

            <div className="sm:col-span-5 sm:border-l sm:border-black sm:pl-3 space-y-0.5 text-[11px]">
              <p>
                <strong>GSTIN / UIN:</strong>{' '}
                <span className="font-mono font-bold">
                  {invoice.customerGstin || 'URP (Unregistered Person)'}
                </span>
              </p>
              <p>
                <strong>State:</strong> {invoice.placeOfSupply}
              </p>
              <p>
                <strong>State Code:</strong>{' '}
                <span className="font-mono">{invoice.placeOfSupplyCode || '-'}</span>
              </p>
              <p>
                <strong>Place of Supply:</strong>{' '}
                <span className="font-semibold">
                  {invoice.placeOfSupply} ({invoice.placeOfSupplyCode || ''})
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Row 4: Items Table (Spreadsheet Bordered Table) */}
        <div className="w-full">
          <table className="w-full border-collapse text-[10.5px]">
            <thead>
              <tr className="border-b border-black bg-slate-100 font-bold text-black text-center">
                <th className="border-r border-black py-1.5 px-1 w-[6%] text-center">
                  Sl No
                </th>
                <th className="border-r border-black py-1.5 px-2 w-[48%] text-left">
                  Description of Goods / Services
                </th>
                <th className="border-r border-black py-1.5 px-1 w-[14%] text-center">
                  HSN/SAC No
                </th>
                <th className="border-r border-black py-1.5 px-1.5 w-[10%] text-right">
                  Quantity
                </th>
                <th className="border-r border-black py-1.5 px-1.5 w-[11%] text-right">
                  Rate (₹)
                </th>
                <th className="py-1.5 px-2 w-[11%] text-right">
                  Amount (₹)
                </th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => {
                const lineAmount = item.quantity * item.unitPrice - (item.discountAmount || 0);
                return (
                  <tr
                    key={item.id || idx}
                    className="border-b border-black/40 hover:bg-slate-50/50"
                  >
                    <td className="border-r border-black p-1 text-center font-mono align-top">
                      {idx + 1}
                    </td>
                    <td className="border-r border-black p-1.5 text-left font-medium text-black align-top break-words">
                      <div>{item.productName}</div>
                      {item.discountAmount > 0 && (
                        <div className="text-[9.5px] text-slate-600 font-mono">
                          Less Discount: ₹{numFmt(item.discountAmount)} ({item.discountPercent}%)
                        </div>
                      )}
                    </td>
                    <td className="border-r border-black p-1 text-center font-mono align-top">
                      {item.hsnSac || '-'}
                    </td>
                    <td className="border-r border-black p-1 text-right font-mono align-top">
                      {item.quantity} {item.unit || 'Pcs'}
                    </td>
                    <td className="border-r border-black p-1 text-right font-mono align-top">
                      {numFmt(item.unitPrice)}
                    </td>
                    <td className="p-1 text-right font-mono font-semibold text-black align-top">
                      {numFmt(lineAmount)}
                    </td>
                  </tr>
                );
              })}

              {/* Optional note row below item list (e.g. "For Labour Charges only") */}
              {invoice.itemNote ? (
                <tr className="border-b border-black/40 italic text-slate-700 bg-slate-50/30">
                  <td className="border-r border-black p-1 text-center"></td>
                  <td colSpan={5} className="p-1.5 text-left font-semibold">
                    Note: {invoice.itemNote}
                  </td>
                </tr>
              ) : null}

              {/* Spacer rows if items count is small to simulate classic Excel ledger form */}
              {invoice.items.length < 5 &&
                Array.from({ length: Math.max(0, 5 - invoice.items.length) }).map(
                  (_, i) => (
                    <tr
                      key={`empty-${i}`}
                      className="border-b border-black/20 text-transparent select-none h-6"
                    >
                      <td className="border-r border-black p-1 text-center">-</td>
                      <td className="border-r border-black p-1.5">-</td>
                      <td className="border-r border-black p-1 text-center">-</td>
                      <td className="border-r border-black p-1 text-right">-</td>
                      <td className="border-r border-black p-1 text-right">-</td>
                      <td className="p-1 text-right">-</td>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>

        {/* Row 5: Tax Breakdown & Financial Totals (Bottom Grid) */}
        <div className="border-t border-black grid grid-cols-12">
          {/* Left 7 Cols: Amount in Words, Bank Details, Terms */}
          <div className="col-span-7 border-r border-black flex flex-col justify-between p-2.5 space-y-3">
            {/* Amount in Words Blocks */}
            <div className="space-y-1.5 text-[10.5px]">
              <div className="border border-black p-1.5 bg-slate-50/40">
                <span className="font-bold uppercase text-[9.5px] block text-slate-800">
                  Tax Amount (in words):
                </span>
                <span className="font-semibold text-black">
                  {taxAmountToWordsINR(invoice.totalTax)}
                </span>
              </div>

              <div className="border border-black p-1.5 bg-slate-50/80">
                <span className="font-bold uppercase text-[9.5px] block text-slate-800">
                  Amount Chargeable (in words):
                </span>
                <span className="font-bold text-black text-[11px]">
                  {amountToWordsINR(invoice.totalAmount)}
                </span>
              </div>
            </div>

            {/* Bank Details & Terms */}
            <div className="border border-black p-2 text-[10px] space-y-1 bg-white">
              <div className="font-bold uppercase text-[10px] border-b border-black pb-0.5">
                Bank & Payment Details
              </div>
              <div className="grid grid-cols-2 gap-x-2 pt-0.5">
                <p>
                  <strong>Bank:</strong> {settings.bankName || 'HDFC Bank Ltd'}
                </p>
                <p>
                  <strong>A/C No:</strong>{' '}
                  <span className="font-mono font-semibold">
                    {settings.accountNumber || '50200012345678'}
                  </span>
                </p>
                <p>
                  <strong>IFSC:</strong>{' '}
                  <span className="font-mono font-semibold">
                    {settings.ifscCode || 'HDFC0001234'}
                  </span>
                </p>
                <p>
                  <strong>Branch:</strong> {settings.branchName || 'Mumbai Main'}
                </p>
              </div>
              {settings.upiId && (
                <p className="pt-0.5">
                  <strong>UPI ID:</strong>{' '}
                  <span className="font-mono font-bold text-[#003399]">
                    {settings.upiId}
                  </span>
                </p>
              )}
            </div>

            {/* Terms and Conditions */}
            {(invoice.terms || settings.defaultTerms) && (
              <div className="text-[9.5px] text-slate-700 leading-tight">
                <strong>Terms & Conditions:</strong>
                <p className="mt-0.5 whitespace-pre-line">
                  {invoice.terms || settings.defaultTerms}
                </p>
              </div>
            )}
          </div>

          {/* Right 5 Cols: Financial Calculations & Authorized Signatory */}
          <div className="col-span-5 flex flex-col justify-between">
            <table className="w-full border-collapse text-[10.5px]">
              <tbody>
                <tr className="border-b border-black">
                  <td className="p-1.5 font-semibold border-r border-black w-1/2 bg-slate-50/60">
                    Subtotal Amount
                  </td>
                  <td className="p-1.5 text-right font-mono font-semibold text-black">
                    ₹{numFmt(invoice.subtotal)}
                  </td>
                </tr>

                {invoice.totalDiscount > 0 && (
                  <tr className="border-b border-black text-slate-700">
                    <td className="p-1.5 font-semibold border-r border-black bg-slate-50/60">
                      Less Total Discount
                    </td>
                    <td className="p-1.5 text-right font-mono">
                      -₹{numFmt(invoice.totalDiscount)}
                    </td>
                  </tr>
                )}

                <tr className="border-b border-black">
                  <td className="p-1.5 font-semibold border-r border-black bg-slate-50/60">
                    Taxable Amount
                  </td>
                  <td className="p-1.5 text-right font-mono font-semibold text-black">
                    ₹{numFmt(invoice.totalTaxableAmount)}
                  </td>
                </tr>

                {invoice.isInterState ? (
                  <tr className="border-b border-black">
                    <td className="p-1.5 font-semibold border-r border-black bg-slate-50/60">
                      Add: IGST @ {effectiveIgstRate}%
                    </td>
                    <td className="p-1.5 text-right font-mono text-black">
                      ₹{numFmt(invoice.totalIgst)}
                    </td>
                  </tr>
                ) : (
                  <>
                    <tr className="border-b border-black">
                      <td className="p-1.5 font-semibold border-r border-black bg-slate-50/60">
                        Add: CGST @ {effectiveCgstRate}%
                      </td>
                      <td className="p-1.5 text-right font-mono text-black">
                        ₹{numFmt(invoice.totalCgst)}
                      </td>
                    </tr>
                    <tr className="border-b border-black">
                      <td className="p-1.5 font-semibold border-r border-black bg-slate-50/60">
                        Add: SGST @ {effectiveSgstRate}%
                      </td>
                      <td className="p-1.5 text-right font-mono text-black">
                        ₹{numFmt(invoice.totalSgst)}
                      </td>
                    </tr>
                  </>
                )}

                <tr className="border-b border-black">
                  <td className="p-1.5 font-semibold border-r border-black bg-slate-50/60">
                    Round Off (+/-)
                  </td>
                  <td className="p-1.5 text-right font-mono text-black">
                    {invoice.roundOff >= 0 ? '+' : ''}₹{numFmt(invoice.roundOff)}
                  </td>
                </tr>

                {/* Final Total Row */}
                <tr className="border-b-2 border-black bg-slate-100 font-extrabold text-[12px]">
                  <td className="p-2 border-r border-black uppercase text-black">
                    Final Total Amount
                  </td>
                  <td className="p-2 text-right font-mono text-black">
                    {formatINR(invoice.totalAmount)}
                  </td>
                </tr>

                {/* Balance Due if partially paid */}
                {invoice.amountPaid > 0 && (
                  <>
                    <tr className="border-b border-black text-slate-700">
                      <td className="p-1 border-r border-black">Amount Received</td>
                      <td className="p-1 text-right font-mono">
                        {formatINR(invoice.amountPaid)}
                      </td>
                    </tr>
                    <tr className="border-b border-black font-bold">
                      <td className="p-1 border-r border-black">Balance Due</td>
                      <td className="p-1 text-right font-mono">
                        {formatINR(invoice.balanceDue)}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>

            {/* Seller Authorization & Signatory Block */}
            <div className="p-2.5 border-t border-black text-right flex flex-col justify-between h-28 bg-white">
              <div className="text-[11px] font-bold text-black uppercase">
                For {settings.businessName || 'JET ENTERPRISES'}
              </div>

              <div className="flex justify-between items-end pt-6">
                <div className="text-[9px] text-slate-400 italic">
                  [Company Seal]
                </div>
                <div className="border-t border-black pt-1 px-4 text-[10px] font-bold uppercase inline-block text-black">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 6: Statutory Disclaimer Footer */}
        <div className="border-t border-black p-1 text-center text-[9px] text-slate-600 bg-slate-50">
          This is a Computer Generated Tax Invoice under the Indian GST Act. Subject to Local Jurisdiction.
        </div>
      </div>
    </div>
  );
};
