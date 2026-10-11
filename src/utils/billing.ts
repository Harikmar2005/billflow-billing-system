import { InvoiceLineItem } from '../types';

/**
 * Format numbers in Indian numbering system (e.g., 1,25,000.00) with ₹ symbol
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '₹0.00';
  }
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  const parts = absAmount.toFixed(2).split('.');
  let integerPart = parts[0];
  const decimalPart = parts[1];

  // Indian number comma grouping: last 3 digits, then groups of 2 digits
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  const formattedInteger =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;

  return `${isNegative ? '-' : ''}₹${formattedInteger}.${decimalPart}`;
}

/**
 * Format date to standard Indian format: DD/MM/YYYY
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateString;
  }
}

/**
 * Convert numbers to words in Indian numbering system (Rupees and Paise)
 */
export function amountToWordsINR(amount: number, prefix: string = 'INR'): string {
  if (amount === 0) return `${prefix ? prefix + ' ' : ''}Zero Rupees Only`;

  const singleDigits = [
    '',
    'One',
    'Two',
    'Three',
    'Four',
    'Five',
    'Six',
    'Seven',
    'Eight',
    'Nine',
  ];
  const twoDigits = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tensMultiple = [
    '',
    '',
    'Twenty',
    'Thirty',
    'Forty',
    'Fifty',
    'Sixty',
    'Seventy',
    'Eighty',
    'Ninety',
  ];

  function convertTwoDigits(num: number): string {
    if (num < 10) return singleDigits[num];
    if (num >= 10 && num < 20) return twoDigits[num - 10];
    const tens = Math.floor(num / 10);
    const unit = num % 10;
    return `${tensMultiple[tens]}${unit ? '-' + singleDigits[unit] : ''}`;
  }

  function convertThreeDigits(num: number): string {
    const hundred = Math.floor(num / 100);
    const rest = num % 100;
    let str = '';
    if (hundred) {
      str += `${singleDigits[hundred]} Hundred`;
      if (rest) str += ' and ';
    }
    if (rest) {
      str += convertTwoDigits(rest);
    }
    return str;
  }

  const rounded = Math.round(Math.abs(amount) * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  let rupeesStr = '';

  const crore = Math.floor(rupees / 10000000);
  let remainder = rupees % 10000000;

  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;

  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  const hundredRest = remainder;

  if (crore) rupeesStr += `${convertTwoDigits(crore)} Crore `;
  if (lakh) rupeesStr += `${convertTwoDigits(lakh)} Lakh `;
  if (thousand) rupeesStr += `${convertTwoDigits(thousand)} Thousand `;
  if (hundredRest) rupeesStr += `${convertThreeDigits(hundredRest)} `;

  rupeesStr = rupeesStr.trim();

  let finalStr = '';
  if (rupees > 0) {
    finalStr = `${rupeesStr} ${rupees === 1 ? 'Rupee' : 'Rupees'}`;
  }

  if (paise > 0) {
    const paiseStr = `${convertTwoDigits(paise)} Paise`;
    if (rupees > 0) {
      finalStr += ` and ${paiseStr}`;
    } else {
      finalStr = paiseStr;
    }
  }

  if (!finalStr) {
    finalStr = 'Zero Rupees';
  }

  const isNeg = amount < 0;
  return `${isNeg ? 'Minus ' : ''}${prefix ? prefix + ' ' : ''}${finalStr} Only`;
}

/**
 * Convenience helper specifically for Tax Amount in Words
 */
export function taxAmountToWordsINR(amount: number): string {
  return amountToWordsINR(amount, 'Rupees');
}

/**
 * Calculate line item tax, subtotal, and tax breakdowns
 */
export function calculateLineItem(
  quantity: number,
  unitPrice: number,
  discountPercent: number,
  gstRate: number,
  isTaxInclusive: boolean,
  isInterState: boolean
): {
  taxableAmount: number;
  discountAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
  totalAmount: number;
} {
  const qty = Number(quantity) || 0;
  const price = Number(unitPrice) || 0;
  const discPct = Number(discountPercent) || 0;
  const taxRate = Number(gstRate) || 0;

  const baseGross = qty * price;
  const discountAmount = (baseGross * discPct) / 100;
  const afterDiscount = baseGross - discountAmount;

  let taxableAmount = 0;
  let totalTax = 0;
  let totalAmount = 0;

  if (isTaxInclusive && taxRate > 0) {
    // If tax inclusive: taxable = total / (1 + rate/100)
    taxableAmount = afterDiscount / (1 + taxRate / 100);
    totalTax = afterDiscount - taxableAmount;
    totalAmount = afterDiscount;
  } else {
    // If tax exclusive: tax = taxable * rate / 100
    taxableAmount = afterDiscount;
    totalTax = (taxableAmount * taxRate) / 100;
    totalAmount = taxableAmount + totalTax;
  }

  let cgstRate = 0;
  let cgstAmount = 0;
  let sgstRate = 0;
  let sgstAmount = 0;
  let igstRate = 0;
  let igstAmount = 0;

  if (isInterState) {
    igstRate = taxRate;
    igstAmount = totalTax;
  } else {
    cgstRate = taxRate / 2;
    sgstRate = taxRate / 2;
    cgstAmount = totalTax / 2;
    sgstAmount = totalTax / 2;
  }

  return {
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    discountAmount: Math.round(discountAmount * 100) / 100,
    cgstRate,
    cgstAmount: Math.round(cgstAmount * 100) / 100,
    sgstRate,
    sgstAmount: Math.round(sgstAmount * 100) / 100,
    igstRate,
    igstAmount: Math.round(igstAmount * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalAmount: Math.round(totalAmount * 100) / 100,
  };
}

/**
 * Calculate totals for entire invoice from items
 */
export function calculateInvoiceSummary(
  items: InvoiceLineItem[],
  isInterState: boolean
): {
  subtotal: number;
  totalDiscount: number;
  totalTaxableAmount: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
  roundOff: number;
  totalAmount: number;
} {
  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0), 0);
  const totalDiscount = items.reduce((sum, item) => sum + (Number(item.discountAmount) || 0), 0);
  const totalTaxableAmount = items.reduce((sum, item) => sum + (Number(item.taxableAmount) || 0), 0);
  const totalCgst = isInterState ? 0 : items.reduce((sum, item) => sum + (Number(item.cgstAmount) || 0), 0);
  const totalSgst = isInterState ? 0 : items.reduce((sum, item) => sum + (Number(item.sgstAmount) || 0), 0);
  const totalIgst = isInterState ? items.reduce((sum, item) => sum + (Number(item.igstAmount) || 0), 0) : 0;
  const totalTax = totalCgst + totalSgst + totalIgst;

  const rawTotal = totalTaxableAmount + totalTax;
  const roundedTotal = Math.round(rawTotal);
  const roundOff = Math.round((roundedTotal - rawTotal) * 100) / 100;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalDiscount: Math.round(totalDiscount * 100) / 100,
    totalTaxableAmount: Math.round(totalTaxableAmount * 100) / 100,
    totalCgst: Math.round(totalCgst * 100) / 100,
    totalSgst: Math.round(totalSgst * 100) / 100,
    totalIgst: Math.round(totalIgst * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    roundOff,
    totalAmount: roundedTotal,
  };
}

