import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Invoice, BusinessSettings } from '../types';
import {
  formatINR,
  formatDate,
  amountToWordsINR,
  taxAmountToWordsINR,
} from './billing';

export function generateInvoicePDF(
  invoice: Invoice,
  business: BusinessSettings,
  copyType: 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE' = 'ORIGINAL'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm
  let currentY = margin;

  const copyLabels = {
    ORIGINAL: 'ORIGINAL FOR RECIPIENT',
    DUPLICATE: 'DUPLICATE FOR TRANSPORTER',
    TRIPLICATE: 'TRIPLICATE FOR SUPPLIER',
  };

  // Helper for black grid borders
  const drawBox = (x: number, y: number, w: number, h: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(x, y, w, h);
  };

  // 1. TOP HEADER: TAX INVOICE & COPY TYPE
  const headerHeight = 9;
  drawBox(margin, currentY, contentWidth, headerHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(50, 50, 50);
  doc.text('GST INVOICE', margin + 3, currentY + 5.5);

  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text('TAX INVOICE', pageWidth / 2, currentY + 6.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(
    `(${copyLabels[copyType] || 'ORIGINAL FOR RECIPIENT'})`,
    pageWidth - margin - 3,
    currentY + 5.5,
    { align: 'right' }
  );

  currentY += headerHeight;

  // 2. SELLER DETAILS (LEFT) & INVOICE META (RIGHT)
  const sellerWidth = 110;
  const metaWidth = contentWidth - sellerWidth; // 80mm
  const metaRowHeight = 5.2;
  const metaRowsCount = 6;
  const sectionHeight = metaRowHeight * metaRowsCount; // ~31.2mm

  // Draw outer boxes
  drawBox(margin, currentY, sellerWidth, sectionHeight);
  drawBox(margin + sellerWidth, currentY, metaWidth, sectionHeight);

  // Left Seller Info
  let sy = currentY + 4.5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(0, 51, 153); // Royal Blue matching reference
  doc.text(business.businessName || 'JET ENTERPRISES', margin + 3, sy);

  sy += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);

  const addressLine = [business.address, business.city, business.state, business.pincode]
    .filter(Boolean)
    .join(', ');
  if (addressLine) {
    const splitAddr = doc.splitTextToSize(addressLine, sellerWidth - 6);
    doc.text(splitAddr, margin + 3, sy);
    sy += splitAddr.length * 3.4;
  }

  doc.setFont('helvetica', 'bold');
  doc.text(`GSTIN: ${business.gstin || '-'}    PAN: ${business.pan || '-'}`, margin + 3, sy);
  sy += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.text(
    `Contact: ${business.phone || '-'}   Email: ${business.email || '-'}`,
    margin + 3,
    sy
  );
  sy += 3.5;

  doc.text(
    `State: ${business.state || '-'}   State Code: ${business.stateCode || '-'}`,
    margin + 3,
    sy
  );

  // Right Invoice Meta Grid Rows
  const metaX = margin + sellerWidth;
  const labelColWidth = 38;
  const metaFields = [
    { label: 'Invoice No.', val: invoice.invoiceNumber, bold: true },
    { label: 'Dated', val: formatDate(invoice.invoiceDate), bold: false },
    { label: "Buyer's Order / Ref No.", val: invoice.poNumber || '-', bold: false },
    { label: 'Ref Doc Date', val: invoice.poDate ? formatDate(invoice.poDate) : '-', bold: false },
    { label: 'Vehicle No.', val: invoice.vehicleNumber || '-', bold: false },
    {
      label: 'Terms of Delivery',
      val: invoice.termsOfDelivery || business.termsOfDelivery || 'As per Agreement',
      bold: false,
    },
  ];

  metaFields.forEach((field, idx) => {
    const rowY = currentY + idx * metaRowHeight;
    // Horizontal row divider (except top)
    if (idx > 0) {
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.15);
      doc.line(metaX, rowY, metaX + metaWidth, rowY);
    }
    // Vertical divider between label and value
    doc.line(metaX + labelColWidth, rowY, metaX + labelColWidth, rowY + metaRowHeight);

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);
    doc.text(field.label, metaX + 2, rowY + 3.8);

    // Value
    doc.setFont('helvetica', field.bold ? 'bold' : 'normal');
    doc.text(field.val, metaX + labelColWidth + 2, rowY + 3.8);
  });

  currentY += sectionHeight;

  // 3. CUSTOMER DETAILS (BILLED TO)
  const custHeaderHeight = 5;
  drawBox(margin, currentY, contentWidth, custHeaderHeight);
  doc.setFillColor(245, 245, 245);
  doc.rect(margin + 0.1, currentY + 0.1, contentWidth - 0.2, custHeaderHeight - 0.2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text(
    'Customer Details (Details of Receiver | Billed To)',
    margin + 3,
    currentY + 3.5
  );
  currentY += custHeaderHeight;

  const custBodyHeight = 17;
  drawBox(margin, currentY, contentWidth, custBodyHeight);
  // Vertical separator in customer box
  const custSplitX = margin + 115;
  doc.line(custSplitX, currentY, custSplitX, currentY + custBodyHeight);

  // Left customer info
  let cy = currentY + 3.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(invoice.customerName || 'Cash Customer', margin + 3, cy);
  cy += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const custAddr = doc.splitTextToSize(invoice.billingAddress || '-', 108);
  doc.text(custAddr, margin + 3, cy);
  cy += custAddr.length * 3.2;

  if (invoice.customerPhone || invoice.customerEmail) {
    const contactStr = [
      invoice.customerPhone ? `Ph: ${invoice.customerPhone}` : '',
      invoice.customerEmail ? `Email: ${invoice.customerEmail}` : '',
    ]
      .filter(Boolean)
      .join('  ');
    doc.text(contactStr, margin + 3, cy);
  }

  // Right customer GST & Place of supply
  let cry = currentY + 3.8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(
    `GSTIN / UIN: ${invoice.customerGstin || 'URP (Unregistered Person)'}`,
    custSplitX + 3,
    cry
  );
  cry += 3.5;

  doc.setFont('helvetica', 'normal');
  doc.text(`State: ${invoice.placeOfSupply || '-'}`, custSplitX + 3, cry);
  cry += 3.2;

  doc.text(`State Code: ${invoice.placeOfSupplyCode || '-'}`, custSplitX + 3, cry);
  cry += 3.2;

  doc.text(
    `Place of Supply: ${invoice.placeOfSupply} (${invoice.placeOfSupplyCode || ''})`,
    custSplitX + 3,
    cry
  );

  currentY += custBodyHeight;

  // 4. ITEMS TABLE (EXCEL COMPACT GRID)
  const tableHeaders = [
    'Sl No',
    'Description of Goods / Services',
    'HSN/SAC No',
    'Quantity',
    'Rate (Rs)',
    'Amount (Rs)',
  ];

  const tableBody = invoice.items.map((item, idx) => {
    const lineAmt = item.quantity * item.unitPrice - (item.discountAmount || 0);
    return [
      String(idx + 1),
      item.discountAmount > 0
        ? `${item.productName}\n(Less Disc: Rs ${item.discountAmount.toFixed(2)})`
        : item.productName,
      item.hsnSac || '-',
      `${item.quantity} ${item.unit || 'Pcs'}`.trim(),
      item.unitPrice.toFixed(2),
      lineAmt.toFixed(2),
    ];
  });

  // If there's an itemNote, append as note row
  if (invoice.itemNote) {
    tableBody.push([
      '',
      `Note: ${invoice.itemNote}`,
      '',
      '',
      '',
      '',
    ]);
  }

  // Fill up blank rows to maintain clean ledger height if fewer than 4 items
  const minRows = 4;
  while (tableBody.length < minRows) {
    tableBody.push(['', '', '', '', '', '']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [tableHeaders],
    body: tableBody,
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.5,
      cellPadding: 1.6,
      textColor: [0, 0, 0],
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      halign: 'center',
      lineColor: [0, 0, 0],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { cellWidth: 12, halign: 'center' }, // Sl No
      1: { cellWidth: 88, halign: 'left' }, // Description
      2: { cellWidth: 26, halign: 'center' }, // HSN/SAC
      3: { cellWidth: 20, halign: 'right' }, // Qty
      4: { cellWidth: 22, halign: 'right' }, // Rate
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }, // Amount
    },
  });

  currentY = (doc as any).lastAutoTable.finalY;

  // 5. TAX BREAKDOWN & FINANCIAL TOTALS SECTION
  const totalBoxWidth = 75;
  const leftBoxWidth = contentWidth - totalBoxWidth; // 115mm

  // Determine effective tax rates
  const effectiveGstRate = invoice.items.length > 0 ? invoice.items[0].gstRate : 18;
  const effectiveCgstRate = invoice.isInterState ? 0 : effectiveGstRate / 2;
  const effectiveSgstRate = invoice.isInterState ? 0 : effectiveGstRate / 2;
  const effectiveIgstRate = invoice.isInterState ? effectiveGstRate : 0;

  // Build the totals rows
  const totalsRows: Array<{ label: string; val: string; isBold?: boolean; isLarge?: boolean }> = [
    { label: 'Subtotal Amount', val: `Rs ${invoice.subtotal.toFixed(2)}` },
  ];

  if (invoice.totalDiscount > 0) {
    totalsRows.push({
      label: 'Less Total Discount',
      val: `-Rs ${invoice.totalDiscount.toFixed(2)}`,
    });
  }

  totalsRows.push({
    label: 'Taxable Amount',
    val: `Rs ${invoice.totalTaxableAmount.toFixed(2)}`,
    isBold: true,
  });

  if (invoice.isInterState) {
    totalsRows.push({
      label: `Add: IGST @ ${effectiveIgstRate}%`,
      val: `Rs ${invoice.totalIgst.toFixed(2)}`,
    });
  } else {
    totalsRows.push({
      label: `Add: CGST @ ${effectiveCgstRate}%`,
      val: `Rs ${invoice.totalCgst.toFixed(2)}`,
    });
    totalsRows.push({
      label: `Add: SGST @ ${effectiveSgstRate}%`,
      val: `Rs ${invoice.totalSgst.toFixed(2)}`,
    });
  }

  totalsRows.push({
    label: 'Round Off (+/-)',
    val: `${invoice.roundOff >= 0 ? '+' : ''}Rs ${invoice.roundOff.toFixed(2)}`,
  });

  totalsRows.push({
    label: 'FINAL TOTAL AMOUNT',
    val: formatINR(invoice.totalAmount),
    isBold: true,
    isLarge: true,
  });

  const totalsRowHeight = 4.8;
  const totalsSectionHeight = totalsRows.length * totalsRowHeight;
  const signatoryHeight = 24;
  const rightTotalHeight = totalsSectionHeight + signatoryHeight;

  // Draw borders for Left and Right Bottom Boxes
  drawBox(margin, currentY, leftBoxWidth, rightTotalHeight);
  drawBox(margin + leftBoxWidth, currentY, totalBoxWidth, rightTotalHeight);

  // Draw Right Totals Grid
  const totalX = margin + leftBoxWidth;
  totalsRows.forEach((row, idx) => {
    const rowY = currentY + idx * totalsRowHeight;
    const isLast = idx === totalsRows.length - 1;

    // Background for Final Total
    if (row.isLarge) {
      doc.setFillColor(240, 240, 240);
      doc.rect(totalX, rowY, totalBoxWidth, totalsRowHeight, 'F');
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.15);
    doc.line(totalX, rowY + totalsRowHeight, totalX + totalBoxWidth, rowY + totalsRowHeight);
    doc.line(totalX + 44, rowY, totalX + 44, rowY + totalsRowHeight);

    doc.setFont('helvetica', row.isBold ? 'bold' : 'normal');
    doc.setFontSize(row.isLarge ? 8 : 7.2);
    doc.setTextColor(0, 0, 0);
    doc.text(row.label, totalX + 2, rowY + 3.4);

    doc.text(row.val, totalX + totalBoxWidth - 2, rowY + 3.4, { align: 'right' });
  });

  // Right Signatory Block (under totals)
  const sigY = currentY + totalsSectionHeight;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`For ${business.businessName || 'JET ENTERPRISES'}`, totalX + totalBoxWidth - 3, sigY + 5, {
    align: 'right',
  });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(120, 120, 120);
  doc.text('[Company Seal]', totalX + 3, sigY + 18);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(totalX + totalBoxWidth - 45, sigY + 18, totalX + totalBoxWidth - 3, sigY + 18);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(0, 0, 0);
  doc.text('Authorized Signatory', totalX + totalBoxWidth - 3, sigY + 21.5, { align: 'right' });

  // Left Content: Words & Bank & Terms
  let ly = currentY + 3.5;

  // Tax Amount in Words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('TAX AMOUNT RUPEES IN WORDS:', margin + 3, ly);
  ly += 3.2;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  const taxWords = doc.splitTextToSize(taxAmountToWordsINR(invoice.totalTax), leftBoxWidth - 6);
  doc.text(taxWords, margin + 3, ly);
  ly += taxWords.length * 3.2 + 1.5;

  // Amount Chargeable in Words
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('AMOUNT CHARGEABLE RUPEES IN WORDS:', margin + 3, ly);
  ly += 3.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  const amountWords = doc.splitTextToSize(amountToWordsINR(invoice.totalAmount), leftBoxWidth - 6);
  doc.text(amountWords, margin + 3, ly);
  ly += amountWords.length * 3.2 + 2;

  // Bank Details inner box
  const bankBoxHeight = 15;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.15);
  doc.rect(margin + 2, ly, leftBoxWidth - 4, bankBoxHeight);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('BANK & PAYMENT DETAILS', margin + 4, ly + 3.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text(
    `Bank: ${business.bankName || 'HDFC Bank Ltd'}   A/C No: ${business.accountNumber || '50200012345678'}`,
    margin + 4,
    ly + 6.8
  );
  doc.text(
    `IFSC: ${business.ifscCode || 'HDFC0001234'}   Branch: ${business.branchName || 'Mumbai Main'}`,
    margin + 4,
    ly + 10.2
  );
  if (business.upiId) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 51, 153);
    doc.text(`UPI ID: ${business.upiId}`, margin + 4, ly + 13.5);
    doc.setTextColor(0, 0, 0);
  }

  ly += bankBoxHeight + 2.5;

  // Terms & Conditions
  if (invoice.terms || business.defaultTerms) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text('Terms & Conditions:', margin + 3, ly);
    ly += 2.8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(50, 50, 50);
    const terms = doc.splitTextToSize(invoice.terms || business.defaultTerms, leftBoxWidth - 6);
    doc.text(terms, margin + 3, ly);
  }

  currentY += rightTotalHeight;

  // 6. BOTTOM STATUTORY DISCLAIMER FOOTER
  const footerHeight = 4.5;
  drawBox(margin, currentY, contentWidth, footerHeight);
  doc.setFillColor(248, 248, 248);
  doc.rect(margin + 0.1, currentY + 0.1, contentWidth - 0.2, footerHeight - 0.2, 'F');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.setTextColor(80, 80, 80);
  doc.text(
    'This is a Computer Generated Tax Invoice under the Indian GST Act. Subject to Local Jurisdiction.',
    pageWidth / 2,
    currentY + 3.2,
    { align: 'center' }
  );

  return doc;
}
