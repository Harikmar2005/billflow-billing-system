import {
  calculateLineItem,
  calculateInvoiceSummary,
  amountToWordsINR,
  taxAmountToWordsINR,
  formatINR,
  formatDate,
} from '../utils/billing';
import { InvoiceLineItem } from '../types';

/**
 * BillFlow Financial Calculations Automated Test Suite
 * Tests line amounts, discounts, GST rates, round-off, and amounts in words.
 */

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Failed [${message}]: Expected ${expected}, got ${actual}`);
  }
}

function assertClose(actual: number, expected: number, message: string, precision: number = 0.01) {
  if (Math.abs(actual - expected) > precision) {
    throw new Error(`Failed [${message}]: Expected close to ${expected}, got ${actual}`);
  }
}

console.log('--- STARTING BILLFLOW FINANCIAL CALCULATION TESTS ---\n');

// 1. Line Amount & Discount Tests
console.log('1. Testing Line Amounts and Discounts...');
{
  // 10 units @ 1200 with 0% discount
  const line1 = calculateLineItem(10, 1200, 0, 18, false, false);
  assertEqual(line1.taxableAmount, 12000, 'Taxable amount for 10 @ 1200 (tax-exclusive)');
  assertEqual(line1.discountAmount, 0, 'Discount amount should be 0');
  assertEqual(line1.cgstRate, 9, 'CGST rate should be 9%');
  assertEqual(line1.sgstRate, 9, 'SGST rate should be 9%');
  assertEqual(line1.cgstAmount, 1080, 'CGST amount should be 1080');
  assertEqual(line1.sgstAmount, 1080, 'SGST amount should be 1080');
  assertEqual(line1.totalTax, 2160, 'Total tax should be 2160');
  assertEqual(line1.totalAmount, 14160, 'Line total with tax should be 14160');

  // 5 units @ 500 with 10% discount
  const line2 = calculateLineItem(5, 500, 10, 18, false, false);
  assertEqual(line2.discountAmount, 250, '10% discount on 2500 is 250');
  assertEqual(line2.taxableAmount, 2250, 'Taxable amount after discount is 2250');
  assertEqual(line2.cgstAmount, 202.5, 'CGST 9% on 2250 is 202.5');
  assertEqual(line2.sgstAmount, 202.5, 'SGST 9% on 2250 is 202.5');
  assertEqual(line2.totalAmount, 2655, 'Line total with tax is 2655');
  console.log('   ✓ Line amounts and discounts verified');
}

// 2. GST Rates Verification (0%, 5%, 12%, 18%, 28%)
console.log('2. Testing GST Rates (0%, 5%, 12%, 18%, 28%)...');
{
  const rates = [0, 5, 12, 18, 28];
  for (const rate of rates) {
    // Intra-state
    const intra = calculateLineItem(1, 1000, 0, rate, false, false);
    assertEqual(intra.cgstRate, rate / 2, `CGST rate for ${rate}%`);
    assertEqual(intra.sgstRate, rate / 2, `SGST rate for ${rate}%`);
    assertEqual(intra.igstRate, 0, `IGST rate for intra-state at ${rate}%`);
    assertEqual(intra.totalTax, (1000 * rate) / 100, `Total tax for ${rate}%`);

    // Inter-state
    const inter = calculateLineItem(1, 1000, 0, rate, false, true);
    assertEqual(inter.igstRate, rate, `IGST rate for ${rate}% inter-state`);
    assertEqual(inter.cgstAmount, 0, `CGST should be 0 for inter-state at ${rate}%`);
    assertEqual(inter.sgstAmount, 0, `SGST should be 0 for inter-state at ${rate}%`);
    assertEqual(inter.totalTax, (1000 * rate) / 100, `IGST tax amount for ${rate}%`);
  }
  console.log('   ✓ All GST rates and intra/inter-state allocations verified');
}

// 3. Tax Inclusive Calculations
console.log('3. Testing Tax-Inclusive Pricing...');
{
  // 1180 inclusive of 18% GST -> base = 1000, tax = 180
  const inc = calculateLineItem(1, 1180, 0, 18, true, false);
  assertClose(inc.taxableAmount, 1000, 'Taxable amount for 1180 inclusive');
  assertClose(inc.totalTax, 180, 'Total tax for 1180 inclusive');
  assertClose(inc.cgstAmount, 90, 'CGST for 1180 inclusive');
  assertClose(inc.sgstAmount, 90, 'SGST for 1180 inclusive');
  assertEqual(inc.totalAmount, 1180, 'Total amount should equal inclusive price');
  console.log('   ✓ Tax-inclusive calculations verified');
}

// 4. Multi-Item Invoice Summary & Subtotal Reconciliation
console.log('4. Testing Invoice Summary & Reconciliation...');
{
  const mockItems: InvoiceLineItem[] = [
    {
      id: 'item-1',
      productId: 'p1',
      productName: 'Heavy Duty Conveyor Roller 100mm',
      type: 'product',
      hsnSac: '8428',
      quantity: 10,
      unit: 'Pcs',
      unitPrice: 1200,
      discountPercent: 0,
      discountAmount: 0,
      isTaxInclusive: false,
      taxableAmount: 12000,
      gstRate: 18,
      cgstRate: 9,
      cgstAmount: 1080,
      sgstRate: 9,
      sgstAmount: 1080,
      igstRate: 0,
      igstAmount: 0,
      totalAmount: 14160,
    },
    {
      id: 'item-2',
      productId: 'p2',
      productName: 'High Tensile Fastener Set',
      type: 'product',
      hsnSac: '7318',
      quantity: 50,
      unit: 'Set',
      unitPrice: 150,
      discountPercent: 0,
      discountAmount: 0,
      isTaxInclusive: false,
      taxableAmount: 7500,
      gstRate: 18,
      cgstRate: 9,
      cgstAmount: 675,
      sgstRate: 9,
      sgstAmount: 675,
      igstRate: 0,
      igstAmount: 0,
      totalAmount: 8850,
    },
    {
      id: 'item-3',
      productId: 'p3',
      productName: 'Precision Machining Labor Charges',
      type: 'service',
      hsnSac: '9987',
      quantity: 1,
      unit: 'Job',
      unitPrice: 4500,
      discountPercent: 0,
      discountAmount: 0,
      isTaxInclusive: false,
      taxableAmount: 4500,
      gstRate: 18,
      cgstRate: 9,
      cgstAmount: 405,
      sgstRate: 9,
      sgstAmount: 405,
      igstRate: 0,
      igstAmount: 0,
      totalAmount: 5310,
    },
  ];

  const summary = calculateInvoiceSummary(mockItems, false);

  // Subtotal = (10*1200) + (50*150) + (1*4500) = 12000 + 7500 + 4500 = 24000
  assertEqual(summary.subtotal, 24000, 'Subtotal should equal 24,000');
  assertEqual(summary.totalTaxableAmount, 24000, 'Taxable amount should equal 24,000');
  // CGST 9% on 24000 = 2160, SGST 9% on 24000 = 2160
  assertEqual(summary.totalCgst, 2160, 'Total CGST should be 2160');
  assertEqual(summary.totalSgst, 2160, 'Total SGST should be 2160');
  assertEqual(summary.totalTax, 4320, 'Total Tax should be 4320');
  assertEqual(summary.totalAmount, 28320, 'Total Amount should be 28320');
  assertEqual(summary.roundOff, 0, 'Round off should be 0');

  // Verify that taxable value + GST reconciles exactly
  assertEqual(
    summary.totalTaxableAmount + summary.totalTax,
    summary.totalAmount,
    'Taxable Value + GST must strictly equal Total Amount'
  );
  console.log('   ✓ Invoice subtotal and tax reconciliation verified');
}

// 5. Round-off Adjustment Tests
console.log('5. Testing Decimal Round-off Adjustment...');
{
  const oddItems: InvoiceLineItem[] = [
    {
      id: 'odd-1',
      productId: 'p1',
      productName: 'Small Component',
      type: 'product',
      hsnSac: '8428',
      quantity: 3,
      unit: 'Pcs',
      unitPrice: 33.33,
      discountPercent: 0,
      discountAmount: 0,
      isTaxInclusive: false,
      taxableAmount: 99.99,
      gstRate: 18,
      cgstRate: 9,
      cgstAmount: 9,
      sgstRate: 9,
      sgstAmount: 9,
      igstRate: 0,
      igstAmount: 0,
      totalAmount: 117.99,
    },
  ];

  const summaryOdd = calculateInvoiceSummary(oddItems, false);
  const rawSum = summaryOdd.totalTaxableAmount + summaryOdd.totalTax;
  assertEqual(
    summaryOdd.totalAmount,
    Math.round(rawSum),
    'Total Amount must be rounded to nearest integer'
  );
  assertClose(
    summaryOdd.roundOff,
    Math.round((summaryOdd.totalAmount - rawSum) * 100) / 100,
    'Round-off adjustment difference verified'
  );
  console.log('   ✓ Round-off calculation verified');
}

// 6. Amount in Words INR Tests
console.log('6. Testing Amounts in Words (Indian System)...');
{
  assertEqual(amountToWordsINR(0), 'INR Zero Rupees Only', 'Zero words');
  assertEqual(amountToWordsINR(1), 'INR One Rupee Only', 'One rupee singular');
  assertEqual(
    amountToWordsINR(28320),
    'INR Twenty-Eight Thousand Three Hundred and Twenty Rupees Only',
    '28,320 in words'
  );
  assertEqual(
    taxAmountToWordsINR(4320),
    'Rupees Four Thousand Three Hundred and Twenty Rupees Only',
    '4,320 tax in words'
  );
  assertEqual(
    amountToWordsINR(100000),
    'INR One Lakh Rupees Only',
    '1 Lakh in words'
  );
  assertEqual(
    amountToWordsINR(12500050.75),
    'INR One Crore Twenty-Five Lakh Fifty Rupees and Seventy-Five Paise Only',
    '1.25 Crore with Paise in words'
  );
  assertEqual(
    amountToWordsINR(0.50),
    'INR Fifty Paise Only',
    '50 Paise only without zero rupee prefix'
  );
  console.log('   ✓ Amount in words conversions verified');
}

// 7. Indian Number & Date Formatting
console.log('7. Testing INR & Date Formatting...');
{
  assertEqual(formatINR(125000), '₹1,25,000.00', 'Indian comma grouping for 1,25,000');
  assertEqual(formatINR(10000000), '₹1,00,00,000.00', 'Indian comma grouping for 1 Crore');
  assertEqual(formatDate('2026-10-11'), '11/10/2026', 'DD/MM/YYYY date format');
  console.log('   ✓ Indian numbering and date formatting verified');
}

console.log('\n--- ALL 7 BILLFLOW FINANCIAL CALCULATION TESTS PASSED SUCCESSFULLY! ---');
