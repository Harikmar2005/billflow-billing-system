import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { getExpandedSeedCatalogue } from './src/data/seedCatalog.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '5mb' }));

// Initialize Gemini Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Database File Path
const DB_FILE = path.join(__dirname, '.billflow-db.json');

// Initial seed data generator with realistic Indian business context
function getInitialDbData() {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  const prevMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const prevMonthStr = prevMonthDate.toISOString().split('T')[0];

  return {
    settings: {
      id: 'biz-settings-1',
      businessName: 'Apex Infotech & Hardware Solutions',
      tradeName: 'Apex Retail & Networks',
      email: 'billing@apexinfotech.in',
      phone: '+91 98201 54321',
      address: 'Shop No. 12, Ground Floor, Lamington Road, Grant Road',
      city: 'Mumbai',
      state: 'Maharashtra',
      stateCode: '27',
      pincode: '400007',
      gstin: '27AABCA1234F1Z9',
      pan: 'AABCA1234F',
      isGstRegistered: true,
      gstScheme: 'regular',
      invoicePrefix: 'BF/2026-27/',
      nextInvoiceNumber: 105,
      currency: '₹',
      bankName: 'HDFC Bank Ltd',
      accountNumber: '50200049281734',
      ifscCode: 'HDFC0000060',
      branchName: 'Fort, Mumbai',
      upiId: 'apexinfotech@hdfcbank',
      defaultNotes: 'Thank you for choosing Apex Infotech. Products carry standard 1-year manufacturer warranty.',
      defaultTerms: '1. Goods once sold will not be returned without warranty RMA.\n2. Payment due within specified due date.\n3. Subject to Mumbai Jurisdiction only.',
      isConfigured: true,
    },
    customers: [
      {
        id: 'cust-1',
        name: 'Tata Consultancy Vendor Desk',
        phone: '+91 98220 11223',
        email: 'procurement@tcs-vendor.com',
        billingAddress: 'TCS Sahyadri Park, Rajiv Gandhi Infotech Park, Hinjawadi',
        city: 'Pune',
        state: 'Maharashtra',
        stateCode: '27',
        pincode: '411057',
        gstin: '27AAACT2727Q1ZW',
        pan: 'AAACT2727Q',
        createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'cust-2',
        name: 'Infosys Tech Hub',
        phone: '+91 80285 20364',
        email: 'infra-accounts@infosys.com',
        billingAddress: 'Plot No. 44, Electronic City, Hosur Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        stateCode: '29',
        pincode: '560100',
        gstin: '29AAACI1681G1ZQ',
        pan: 'AAACI1681G',
        createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'cust-3',
        name: 'Sharma Electronics & Telecom',
        phone: '+91 71225 98765',
        email: 'sharma.telecom@gmail.com',
        billingAddress: '45, Sitabuldi Main Road',
        city: 'Nagpur',
        state: 'Maharashtra',
        stateCode: '27',
        pincode: '440012',
        gstin: '27AABCS5544K1ZS',
        pan: 'AABCS5544K',
        createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'cust-4',
        name: 'Kaveri Digital Studio',
        phone: '+91 94440 88776',
        email: 'kaveri.digital@yahoo.in',
        billingAddress: '12, T. Nagar Main Street',
        city: 'Chennai',
        state: 'Tamil Nadu',
        stateCode: '33',
        pincode: '600017',
        gstin: '',
        pan: 'BPKPK9988C',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
    products: [
      {
        id: 'prod-1',
        name: 'Enterprise Router Dual-Band AC1200',
        type: 'product',
        sku: 'RTR-AC1200',
        hsnSacCode: '8517',
        description: 'High-throughput gigabit router with VPN tunnel support',
        unit: 'Pcs',
        sellingPrice: 4500,
        purchasePrice: 3200,
        gstRate: 18,
        stockQuantity: 32,
        lowStockThreshold: 5,
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'prod-2',
        name: 'Cat6 Shielded Ethernet Spool (305m)',
        type: 'product',
        sku: 'CBL-CAT6-305',
        hsnSacCode: '8544',
        description: 'Pure copper 23AWG high-speed network cable reel',
        unit: 'Box',
        sellingPrice: 6800,
        purchasePrice: 4900,
        gstRate: 18,
        stockQuantity: 18,
        lowStockThreshold: 4,
        createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'prod-3',
        name: 'CCTV Surveillance Camera 4MP IP PoE',
        type: 'product',
        sku: 'CAM-4MP-POE',
        hsnSacCode: '8525',
        description: 'Night vision IR weatherproof bullet camera',
        unit: 'Pcs',
        sellingPrice: 2400,
        purchasePrice: 1700,
        gstRate: 18,
        stockQuantity: 3, // LOW STOCK!
        lowStockThreshold: 5,
        createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'prod-4',
        name: 'Biometric Attendance & Access Terminal',
        type: 'product',
        sku: 'BIO-ATT-900',
        hsnSacCode: '8471',
        description: 'Fingerprint + RFID cloud connected employee attendance unit',
        unit: 'Pcs',
        sellingPrice: 8900,
        purchasePrice: 6400,
        gstRate: 18,
        stockQuantity: 14,
        lowStockThreshold: 3,
        createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'prod-5',
        name: 'Network Infrastructure Setup & Security Audit',
        type: 'service',
        sku: 'SRV-NET-AUDIT',
        hsnSacCode: '998313',
        description: 'Onsite structured cabling, firewall configuration, and vulnerability scan',
        unit: 'Set',
        sellingPrice: 25000,
        purchasePrice: 0,
        gstRate: 18,
        stockQuantity: 0,
        lowStockThreshold: 0,
        createdAt: new Date(Date.now() - 40 * 86400000).toISOString(),
        updatedAt: now.toISOString(),
      },
    ],
    invoices: [
      {
        id: 'inv-1',
        invoiceNumber: 'BF/2026-27/101',
        customerId: 'cust-1',
        customerName: 'Tata Consultancy Vendor Desk',
        customerGstin: '27AAACT2727Q1ZW',
        customerPhone: '+91 98220 11223',
        customerEmail: 'procurement@tcs-vendor.com',
        billingAddress: 'TCS Sahyadri Park, Rajiv Gandhi Infotech Park, Hinjawadi, Pune - 411057',
        placeOfSupply: 'Maharashtra',
        placeOfSupplyCode: '27',
        isInterState: false, // Intra-state: CGST + SGST
        invoiceDate: new Date(Date.now() - 15 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        status: 'issued',
        paymentStatus: 'paid',
        items: [
          {
            id: 'item-1',
            productId: 'prod-1',
            productName: 'Enterprise Router Dual-Band AC1200',
            type: 'product',
            hsnSac: '8517',
            quantity: 4,
            unit: 'Pcs',
            unitPrice: 4500,
            discountPercent: 0,
            discountAmount: 0,
            isTaxInclusive: false,
            taxableAmount: 18000,
            gstRate: 18,
            cgstRate: 9,
            cgstAmount: 1620,
            sgstRate: 9,
            sgstAmount: 1620,
            igstRate: 0,
            igstAmount: 0,
            totalAmount: 21240,
          },
          {
            id: 'item-2',
            productId: 'prod-5',
            productName: 'Network Infrastructure Setup & Security Audit',
            type: 'service',
            hsnSac: '998313',
            quantity: 1,
            unit: 'Set',
            unitPrice: 25000,
            discountPercent: 5,
            discountAmount: 1250,
            isTaxInclusive: false,
            taxableAmount: 23750,
            gstRate: 18,
            cgstRate: 9,
            cgstAmount: 2137.5,
            sgstRate: 9,
            sgstAmount: 2137.5,
            igstRate: 0,
            igstAmount: 0,
            totalAmount: 28025,
          },
        ],
        subtotal: 43000,
        totalDiscount: 1250,
        totalTaxableAmount: 41750,
        totalCgst: 3757.5,
        totalSgst: 3757.5,
        totalIgst: 0,
        totalTax: 7515,
        roundOff: 0,
        totalAmount: 49265,
        amountPaid: 49265,
        balanceDue: 0,
        notes: 'Delivery completed to Pune Hinjawadi Facility Desk.',
        terms: 'Payment received in full via NEFT. Thank you.',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        id: 'inv-2',
        invoiceNumber: 'BF/2026-27/102',
        customerId: 'cust-2',
        customerName: 'Infosys Tech Hub',
        customerGstin: '29AAACI1681G1ZQ',
        customerPhone: '+91 80285 20364',
        customerEmail: 'infra-accounts@infosys.com',
        billingAddress: 'Plot No. 44, Electronic City, Hosur Road, Bengaluru - 560100',
        placeOfSupply: 'Karnataka',
        placeOfSupplyCode: '29',
        isInterState: true, // Inter-state: IGST
        invoiceDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
        status: 'issued',
        paymentStatus: 'partially_paid',
        items: [
          {
            id: 'item-3',
            productId: 'prod-2',
            productName: 'Cat6 Shielded Ethernet Spool (305m)',
            type: 'product',
            hsnSac: '8544',
            quantity: 4,
            unit: 'Box',
            unitPrice: 6800,
            discountPercent: 0,
            discountAmount: 0,
            isTaxInclusive: false,
            taxableAmount: 27200,
            gstRate: 18,
            cgstRate: 0,
            cgstAmount: 0,
            sgstRate: 0,
            sgstAmount: 0,
            igstRate: 18,
            igstAmount: 4896,
            totalAmount: 32096,
          },
        ],
        subtotal: 27200,
        totalDiscount: 0,
        totalTaxableAmount: 27200,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 4896,
        totalTax: 4896,
        roundOff: 0,
        totalAmount: 32096,
        amountPaid: 20000,
        balanceDue: 12096,
        notes: 'Inter-state consignment dispatched via BlueDart Express.',
        terms: 'Balance payable within 30 days.',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
      {
        id: 'inv-3',
        invoiceNumber: 'BF/2026-27/103',
        customerId: 'cust-3',
        customerName: 'Sharma Electronics & Telecom',
        customerGstin: '27AABCS5544K1ZS',
        customerPhone: '+91 71225 98765',
        customerEmail: 'sharma.telecom@gmail.com',
        billingAddress: '45, Sitabuldi Main Road, Nagpur - 440012',
        placeOfSupply: 'Maharashtra',
        placeOfSupplyCode: '27',
        isInterState: false,
        invoiceDate: todayStr,
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        status: 'issued',
        paymentStatus: 'unpaid',
        items: [
          {
            id: 'item-4',
            productId: 'prod-4',
            productName: 'Biometric Attendance & Access Terminal',
            type: 'product',
            hsnSac: '8471',
            quantity: 2,
            unit: 'Pcs',
            unitPrice: 8900,
            discountPercent: 0,
            discountAmount: 0,
            isTaxInclusive: false,
            taxableAmount: 17800,
            gstRate: 18,
            cgstRate: 9,
            cgstAmount: 1602,
            sgstRate: 9,
            sgstAmount: 1602,
            igstRate: 0,
            igstAmount: 0,
            totalAmount: 21004,
          },
        ],
        subtotal: 17800,
        totalDiscount: 0,
        totalTaxableAmount: 17800,
        totalCgst: 1602,
        totalSgst: 1602,
        totalIgst: 0,
        totalTax: 3204,
        roundOff: 0,
        totalAmount: 21004,
        amountPaid: 0,
        balanceDue: 21004,
        notes: 'Handed over to local courier counter.',
        terms: 'Immediate net 14 payment terms.',
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
      {
        id: 'inv-4',
        invoiceNumber: 'BF/2026-27/104',
        customerId: 'cust-4',
        customerName: 'Kaveri Digital Studio',
        customerGstin: '',
        customerPhone: '+91 94440 88776',
        customerEmail: 'kaveri.digital@yahoo.in',
        billingAddress: '12, T. Nagar Main Street, Chennai - 600017',
        placeOfSupply: 'Tamil Nadu',
        placeOfSupplyCode: '33',
        isInterState: true,
        invoiceDate: new Date(Date.now() - 35 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0], // Overdue!
        status: 'issued',
        paymentStatus: 'overdue',
        items: [
          {
            id: 'item-5',
            productId: 'prod-3',
            productName: 'CCTV Surveillance Camera 4MP IP PoE',
            type: 'product',
            hsnSac: '8525',
            quantity: 3,
            unit: 'Pcs',
            unitPrice: 2400,
            discountPercent: 0,
            discountAmount: 0,
            isTaxInclusive: false,
            taxableAmount: 7200,
            gstRate: 18,
            cgstRate: 0,
            cgstAmount: 0,
            sgstRate: 0,
            sgstAmount: 0,
            igstRate: 18,
            igstAmount: 1296,
            totalAmount: 8496,
          },
        ],
        subtotal: 7200,
        totalDiscount: 0,
        totalTaxableAmount: 7200,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 1296,
        totalTax: 1296,
        roundOff: 0,
        totalAmount: 8496,
        amountPaid: 0,
        balanceDue: 8496,
        notes: 'Billed to unregistered buyer in Chennai.',
        terms: 'Overdue payment notice sent.',
        createdAt: new Date(Date.now() - 35 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 35 * 86400000).toISOString(),
      },
    ],
    payments: [
      {
        id: 'pay-1',
        invoiceId: 'inv-1',
        invoiceNumber: 'BF/2026-27/101',
        customerId: 'cust-1',
        customerName: 'Tata Consultancy Vendor Desk',
        amount: 49265,
        paymentDate: new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        referenceNumber: 'NEFT-HDFC26981249',
        notes: 'Full payment received through RTGS/NEFT gateway',
        createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
      },
      {
        id: 'pay-2',
        invoiceId: 'inv-2',
        invoiceNumber: 'BF/2026-27/102',
        customerId: 'cust-2',
        customerName: 'Infosys Tech Hub',
        amount: 20000,
        paymentDate: new Date(Date.now() - 4 * 86400000).toISOString().split('T')[0],
        paymentMethod: 'upi',
        referenceNumber: 'UPI/409281729104',
        notes: 'Advance installment received via Google Pay UPI',
        createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
      },
    ],
    expenses: [
      {
        id: 'exp-1',
        category: 'rent',
        description: 'Office & Showroom Rent for Grant Road Shop',
        amount: 35000,
        expenseDate: new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0],
        paymentMethod: 'bank_transfer',
        vendorName: 'Lamington Properties Pvt Ltd',
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
      {
        id: 'exp-2',
        category: 'utilities',
        description: 'High-speed Fiber Broadband & Cloud Server',
        amount: 4800,
        expenseDate: new Date(Date.now() - 8 * 86400000).toISOString().split('T')[0],
        paymentMethod: 'upi',
        vendorName: 'Tata Tele Business Services',
        createdAt: new Date(Date.now() - 8 * 86400000).toISOString(),
      },
      {
        id: 'exp-3',
        category: 'transport',
        description: 'BlueDart and Delhivery Courier Freight Charges',
        amount: 3200,
        expenseDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0],
        paymentMethod: 'card',
        vendorName: 'Blue Dart Express',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ],
    inventoryMovements: [
      {
        id: 'mov-1',
        productId: 'prod-1',
        productName: 'Enterprise Router Dual-Band AC1200',
        type: 'sale',
        quantity: -4,
        previousStock: 36,
        newStock: 32,
        referenceId: 'BF/2026-27/101',
        reason: 'Invoice BF/2026-27/101 finalization',
        createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
      },
      {
        id: 'mov-2',
        productId: 'prod-2',
        productName: 'Cat6 Shielded Ethernet Spool (305m)',
        type: 'sale',
        quantity: -4,
        previousStock: 22,
        newStock: 18,
        referenceId: 'BF/2026-27/102',
        reason: 'Invoice BF/2026-27/102 finalization',
        createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
      },
    ],
  };
}

// Database Helper
function readDb() {
  try {
    let db: any;
    if (!fs.existsSync(DB_FILE)) {
      db = getInitialDbData();
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
    } else {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      db = JSON.parse(data);
    }

    // Auto-seed 360+ items if catalog has fewer than 50 products
    if (!db.products || db.products.length < 50) {
      const seedCatalogue = getExpandedSeedCatalogue();
      const existingSkus = new Set((db.products || []).map((p: any) => (p.sku || '').toLowerCase()));
      const seeded = seedCatalogue.map((item, idx) => ({
        id: `prod-seed-${idx + 1}`,
        ...item,
        status: item.status || 'active',
        rateHistory: [
          {
            oldPrice: item.sellingPrice,
            newPrice: item.sellingPrice,
            changedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
            reason: 'Initial master catalog rate setup',
          },
        ],
        createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      const newItems = seeded.filter((s) => !existingSkus.has((s.sku || '').toLowerCase()));
      db.products = [...(db.products || []), ...newItems];
      writeDb(db);
    }

    return db;
  } catch (err) {
    console.error('Error reading DB file, using defaults:', err);
    return getInitialDbData();
  }
}

function writeDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing DB file:', err);
  }
}

// REST API Endpoints

// 1. Health
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    engine: 'billflow-fastapi-express',
    gemini_configured: Boolean(apiKey),
    timestamp: new Date().toISOString(),
    locale: 'en-IN',
    currency: 'INR (₹)',
  });
});

// 2. Business Settings
app.get('/api/settings', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.settings);
});

app.put('/api/settings', (req: Request, res: Response) => {
  const db = readDb();
  db.settings = { ...db.settings, ...req.body, isConfigured: true };
  writeDb(db);
  res.json(db.settings);
});

// 3. Metrics (Calculated dynamically from live records)
app.get('/api/metrics', (req: Request, res: Response) => {
  const db = readDb();
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7);

  // Active (issued) invoices
  const activeInvoices = db.invoices.filter((i: any) => i.status !== 'cancelled');

  // Today sales
  const todaySales = activeInvoices
    .filter((i: any) => i.invoiceDate === todayStr)
    .reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0);

  // Monthly sales (current month)
  const monthlySales = activeInvoices
    .filter((i: any) => (i.invoiceDate || '').startsWith(thisMonthStr))
    .reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0);

  // Total paid across all invoices
  const totalPaid = db.payments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

  // Total outstanding balance
  const totalOutstanding = activeInvoices.reduce((sum: number, i: any) => sum + (i.balanceDue || 0), 0);

  // Overdue count and amount
  const overdueInvoices = activeInvoices.filter((i: any) => i.paymentStatus === 'overdue' || (i.balanceDue > 0 && i.dueDate < todayStr));
  const overdueAmount = overdueInvoices.reduce((sum: number, i: any) => sum + (i.balanceDue || 0), 0);

  // Low stock products count
  const lowStockCount = db.products.filter(
    (p: any) => p.type === 'product' && p.stockQuantity <= (p.lowStockThreshold || 5)
  ).length;

  // Monthly revenue chart series (last 6 months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyRevenueSeries = [];
  const currentMonthIdx = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  for (let m = 5; m >= 0; m--) {
    const d = new Date(currentYear, currentMonthIdx - m, 1);
    const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const mLabel = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;

    const monthInvoices = activeInvoices.filter((i: any) => (i.invoiceDate || '').startsWith(mStr));
    const mRevenue = monthInvoices.reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0);

    const monthPayments = db.payments.filter((p: any) => (p.paymentDate || '').startsWith(mStr));
    const mCollections = monthPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    monthlyRevenueSeries.push({
      month: mLabel,
      revenue: Math.round(mRevenue),
      collections: Math.round(mCollections),
    });
  }

  // Payment status distribution
  const paidCount = activeInvoices.filter((i: any) => i.paymentStatus === 'paid').length;
  const partialCount = activeInvoices.filter((i: any) => i.paymentStatus === 'partially_paid').length;
  const unpaidCount = activeInvoices.filter((i: any) => i.paymentStatus === 'unpaid').length;
  const overdueCount = activeInvoices.filter((i: any) => i.paymentStatus === 'overdue').length;

  const paymentStatusDistribution = [
    { name: 'Paid', count: paidCount, amount: activeInvoices.filter((i: any) => i.paymentStatus === 'paid').reduce((s: number, i: any) => s + i.totalAmount, 0), color: '#0d9488' },
    { name: 'Partial', count: partialCount, amount: activeInvoices.filter((i: any) => i.paymentStatus === 'partially_paid').reduce((s: number, i: any) => s + i.balanceDue, 0), color: '#0284c7' },
    { name: 'Unpaid', count: unpaidCount, amount: activeInvoices.filter((i: any) => i.paymentStatus === 'unpaid').reduce((s: number, i: any) => s + i.balanceDue, 0), color: '#eab308' },
    { name: 'Overdue', count: overdueCount, amount: overdueAmount, color: '#f43f5e' },
  ];

  res.json({
    todaySales: Math.round(todaySales * 100) / 100,
    monthlySales: Math.round(monthlySales * 100) / 100,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    totalPaid: Math.round(totalPaid * 100) / 100,
    overdueCount: overdueInvoices.length,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    totalCustomers: db.customers.length,
    totalProducts: db.products.length,
    lowStockCount,
    recentInvoices: db.invoices.slice(0, 6),
    monthlyRevenueSeries,
    paymentStatusDistribution,
  });
});

// 4. Customers CRUD
app.get('/api/customers', (req: Request, res: Response) => {
  const db = readDb();
  // enrich with customer totals
  const enriched = db.customers.map((c: any) => {
    const custInvoices = db.invoices.filter((i: any) => i.customerId === c.id && i.status !== 'cancelled');
    const totalBilled = custInvoices.reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0);
    const totalPaid = custInvoices.reduce((sum: number, i: any) => sum + (i.amountPaid || 0), 0);
    const outstandingBalance = custInvoices.reduce((sum: number, i: any) => sum + (i.balanceDue || 0), 0);
    return {
      ...c,
      totalBilled,
      totalPaid,
      outstandingBalance,
      invoiceCount: custInvoices.length,
    };
  });
  res.json(enriched);
});

app.get('/api/customers/:id', (req: Request, res: Response) => {
  const db = readDb();
  const customer = db.customers.find((c: any) => c.id === req.params.id);
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }
  const invoices = db.invoices.filter((i: any) => i.customerId === customer.id);
  res.json({ ...customer, invoices });
});

app.post('/api/customers', (req: Request, res: Response) => {
  const db = readDb();
  const { name, phone, email, billingAddress, city, state, stateCode, pincode, gstin, pan } = req.body;
  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Customer name is required' });
    return;
  }

  const newCust = {
    id: `cust-${Date.now()}`,
    name: name.trim(),
    phone: phone || '',
    email: email || '',
    billingAddress: billingAddress || '',
    city: city || '',
    state: state || 'Maharashtra',
    stateCode: stateCode || '27',
    pincode: pincode || '',
    gstin: gstin ? gstin.toUpperCase().trim() : '',
    pan: pan ? pan.toUpperCase().trim() : '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.customers.unshift(newCust);
  writeDb(db);
  res.status(201).json(newCust);
});

app.put('/api/customers/:id', (req: Request, res: Response) => {
  const db = readDb();
  const idx = db.customers.findIndex((c: any) => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Customer not found' });
    return;
  }

  const updated = {
    ...db.customers[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };
  db.customers[idx] = updated;
  writeDb(db);
  res.json(updated);
});

app.delete('/api/customers/:id', (req: Request, res: Response) => {
  const db = readDb();
  const hasInvoices = db.invoices.some((i: any) => i.customerId === req.params.id);
  if (hasInvoices) {
    res.status(400).json({ error: 'Cannot delete customer with existing invoice history.' });
    return;
  }
  db.customers = db.customers.filter((c: any) => c.id !== req.params.id);
  writeDb(db);
  res.json({ success: true, id: req.params.id });
});

// 5. Products & Inventory CRUD
app.get('/api/products', (req: Request, res: Response) => {
  const db = readDb();
  let items = [...(db.products || [])];

  const { search, category, status, type, sort = 'name', order = 'asc', page, limit } = req.query;

  // Search filter
  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    items = items.filter(
      (p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.hsnSacCode && p.hsnSacCode.includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }

  // Category filter
  if (category && typeof category === 'string' && category !== 'all') {
    items = items.filter((p: any) => p.category === category);
  }

  // Status filter
  if (status && typeof status === 'string' && status !== 'all') {
    items = items.filter((p: any) => (p.status || 'active') === status);
  }

  // Type filter
  if (type && typeof type === 'string' && type !== 'all') {
    items = items.filter((p: any) => p.type === type);
  }

  // Sorting
  items.sort((a: any, b: any) => {
    let valA = a[sort as string];
    let valB = b[sort as string];

    if (sort === 'sellingPrice' || sort === 'stockQuantity') {
      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
    } else {
      valA = String(valA || '').toLowerCase();
      valB = String(valB || '').toLowerCase();
    }

    if (valA < valB) return order === 'desc' ? 1 : -1;
    if (valA > valB) return order === 'desc' ? -1 : 1;
    return 0;
  });

  const total = items.length;

  // Pagination support
  if (limit) {
    const lim = Math.max(1, parseInt(limit as string, 10) || 20);
    const pg = Math.max(1, parseInt((page as string) || '1', 10));
    const totalPages = Math.ceil(total / lim);
    const paginatedItems = items.slice((pg - 1) * lim, pg * lim);

    // Collect all distinct categories
    const categories = Array.from(
      new Set(
        (db.products || [])
          .map((p: any) => p.category)
          .filter(Boolean)
      )
    ).sort();

    res.json({
      items: paginatedItems,
      total,
      page: pg,
      limit: lim,
      totalPages,
      categories,
    });
    return;
  }

  res.json(items);
});

// Fast autocomplete search endpoint for billing line item selection
app.get('/api/products/search', (req: Request, res: Response) => {
  const db = readDb();
  const q = ((req.query.q as string) || '').trim().toLowerCase();
  const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

  let matches = (db.products || []).filter((p: any) => (p.status || 'active') === 'active');

  if (q) {
    matches = matches.filter(
      (p: any) =>
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.hsnSacCode && p.hsnSacCode.includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q))
    );
  }

  res.json(matches.slice(0, limit));
});

// Get unique categories list
app.get('/api/products/categories', (req: Request, res: Response) => {
  const db = readDb();
  const categories = Array.from(
    new Set((db.products || []).map((p: any) => p.category).filter(Boolean))
  ).sort();
  res.json(categories);
});

app.post('/api/products', (req: Request, res: Response) => {
  const db = readDb();
  const {
    name,
    type,
    sku,
    hsnSacCode,
    description,
    unit,
    sellingPrice,
    purchasePrice,
    gstRate,
    category,
    stockQuantity,
    lowStockThreshold,
    status,
  } = req.body;

  if (!name || !name.trim()) {
    res.status(400).json({ error: 'Product name is required' });
    return;
  }

  const cleanSku = (sku || `SKU-${Date.now().toString().slice(-4)}`).trim().toUpperCase();

  // Duplicate SKU check
  const duplicate = db.products.find(
    (p: any) => p.sku && p.sku.toUpperCase() === cleanSku
  );
  if (duplicate) {
    res.status(400).json({ error: `Product with Item Code / SKU '${cleanSku}' already exists.` });
    return;
  }

  const finalRate = Number(sellingPrice) || 0;
  const newProd = {
    id: `prod-${Date.now()}`,
    name: name.trim(),
    type: type || 'product',
    sku: cleanSku,
    hsnSacCode: hsnSacCode || '8517',
    description: description || '',
    unit: unit || 'Pcs',
    sellingPrice: finalRate,
    purchasePrice: Number(purchasePrice) || 0,
    gstRate: Number(gstRate) || 18,
    category: category ? category.trim() : 'General',
    stockQuantity: type === 'service' ? 0 : Number(stockQuantity) || 0,
    lowStockThreshold: Number(lowStockThreshold) || 5,
    status: status || 'active',
    rateHistory: [
      {
        oldPrice: finalRate,
        newPrice: finalRate,
        changedAt: new Date().toISOString(),
        reason: 'Initial creation',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.products.unshift(newProd);
  writeDb(db);
  res.status(201).json(newProd);
});

app.put('/api/products/:id', (req: Request, res: Response) => {
  const db = readDb();
  const idx = db.products.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const existing = db.products[idx];
  const newSellingPrice = req.body.sellingPrice !== undefined ? Number(req.body.sellingPrice) : existing.sellingPrice;

  // Rate history tracking
  let rateHistory = existing.rateHistory || [];
  if (existing.sellingPrice !== newSellingPrice) {
    rateHistory = [
      {
        oldPrice: existing.sellingPrice,
        newPrice: newSellingPrice,
        changedAt: new Date().toISOString(),
        reason: req.body.rateChangeReason || 'Manual rate adjustment by user',
      },
      ...rateHistory,
    ];
  }

  const updated = {
    ...existing,
    ...req.body,
    sellingPrice: newSellingPrice,
    rateHistory,
    updatedAt: new Date().toISOString(),
  };

  db.products[idx] = updated;
  writeDb(db);
  res.json(updated);
});

// Toggle status active / inactive
app.patch('/api/products/:id/status', (req: Request, res: Response) => {
  const db = readDb();
  const idx = db.products.findIndex((p: any) => p.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const current = db.products[idx].status || 'active';
  const newStatus = req.body.status || (current === 'active' ? 'inactive' : 'active');
  db.products[idx].status = newStatus;
  db.products[idx].updatedAt = new Date().toISOString();

  writeDb(db);
  res.json(db.products[idx]);
});

// Bulk Import Products (Spreadsheet & CSV)
app.post('/api/products/bulk-import', (req: Request, res: Response) => {
  const db = readDb();
  const { items, updateExisting = false } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'No items provided for import' });
    return;
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  const errors: Array<{ row: number; item: string; error: string }> = [];

  const existingMap = new Map<string, any>();
  db.products.forEach((p: any) => {
    if (p.sku) existingMap.set(p.sku.toUpperCase().trim(), p);
    if (p.name) existingMap.set(p.name.toLowerCase().trim(), p);
  });

  const validGstRates = [0, 5, 12, 18, 28];

  items.forEach((row: any, index: number) => {
    const rowNum = index + 1;
    const name = String(row.name || row['Item Name'] || '').trim();

    if (!name) {
      failed++;
      errors.push({ row: rowNum, item: 'Unnamed Row', error: 'Missing product / item name' });
      return;
    }

    const rawRate = row.sellingPrice ?? row['Selling Rate'] ?? row.rate ?? row['Rate'];
    const sellingPrice = parseFloat(rawRate);
    if (isNaN(sellingPrice) || sellingPrice < 0) {
      failed++;
      errors.push({ row: rowNum, item: name, error: `Invalid rate value: '${rawRate}'` });
      return;
    }

    let gstRate = parseFloat(row.gstRate ?? row['GST %'] ?? row.taxRate ?? 18);
    if (isNaN(gstRate) || !validGstRates.includes(gstRate)) {
      gstRate = 18; // Standard default fallback
    }

    const sku = String(row.sku ?? row['Item Code'] ?? row['SKU'] ?? `SKU-IMP-${Date.now().toString().slice(-4)}-${rowNum}`).trim().toUpperCase();
    const hsnSacCode = String(row.hsnSacCode ?? row['HSN Code'] ?? row.hsn ?? '8517').trim();
    const unit = String(row.unit ?? row['Unit'] ?? 'Pcs').trim();
    const category = String(row.category ?? row['Category'] ?? 'General').trim();
    const description = String(row.description ?? row['Description'] ?? '').trim();
    const stockQuantity = parseInt(row.stockQuantity ?? row['Stock'] ?? '50', 10) || 0;

    // Check duplicate
    const matched = existingMap.get(sku) || existingMap.get(name.toLowerCase());

    if (matched) {
      if (updateExisting) {
        // Update product rates and fields
        const oldRate = matched.sellingPrice;
        matched.sellingPrice = sellingPrice;
        matched.hsnSacCode = hsnSacCode || matched.hsnSacCode;
        matched.unit = unit || matched.unit;
        matched.gstRate = gstRate;
        matched.category = category || matched.category;
        if (description) matched.description = description;
        if (stockQuantity > 0) matched.stockQuantity = stockQuantity;
        matched.updatedAt = new Date().toISOString();

        if (oldRate !== sellingPrice) {
          matched.rateHistory = [
            {
              oldPrice: oldRate,
              newPrice: sellingPrice,
              changedAt: new Date().toISOString(),
              reason: 'Updated via Excel/CSV spreadsheet import',
            },
            ...(matched.rateHistory || []),
          ];
        }

        updated++;
      } else {
        skipped++;
      }
    } else {
      // Create new
      const newProduct = {
        id: `prod-imp-${Date.now()}-${rowNum}`,
        name,
        type: (row.type === 'service' || category.toLowerCase().includes('service')) ? 'service' : 'product',
        sku,
        hsnSacCode,
        description,
        unit,
        sellingPrice,
        purchasePrice: Math.round(sellingPrice * 0.7 * 100) / 100,
        gstRate,
        category,
        stockQuantity,
        lowStockThreshold: Math.max(5, Math.floor(stockQuantity * 0.1)),
        status: 'active',
        rateHistory: [
          {
            oldPrice: sellingPrice,
            newPrice: sellingPrice,
            changedAt: new Date().toISOString(),
            reason: 'Initial creation via bulk import',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.products.push(newProduct);
      existingMap.set(sku, newProduct);
      existingMap.set(name.toLowerCase(), newProduct);
      added++;
    }
  });

  writeDb(db);

  res.json({
    success: true,
    summary: {
      totalProcessed: items.length,
      added,
      updated,
      skipped,
      failed,
    },
    errors,
  });
});

// Bulk Rate Update (by Category or Selected IDs)
app.post('/api/products/bulk-rate-update', (req: Request, res: Response) => {
  const db = readDb();
  const { productIds, category, adjustmentType, value, reason } = req.body;

  if (!adjustmentType || isNaN(value)) {
    res.status(400).json({ error: 'Adjustment type and numerical value are required' });
    return;
  }

  let count = 0;
  const updatedProducts: any[] = [];

  db.products.forEach((prod: any) => {
    let shouldUpdate = false;
    if (Array.isArray(productIds) && productIds.length > 0) {
      shouldUpdate = productIds.includes(prod.id);
    } else if (category && category !== 'all') {
      shouldUpdate = prod.category === category;
    } else {
      shouldUpdate = true; // Update all
    }

    if (shouldUpdate) {
      const oldPrice = prod.sellingPrice || 0;
      let newPrice = oldPrice;

      if (adjustmentType === 'percentage') {
        newPrice = Math.round((oldPrice * (1 + value / 100)) * 100) / 100;
      } else if (adjustmentType === 'fixed') {
        newPrice = Math.max(0, Math.round((oldPrice + value) * 100) / 100);
      }

      if (oldPrice !== newPrice) {
        prod.sellingPrice = newPrice;
        prod.rateHistory = [
          {
            oldPrice,
            newPrice,
            changedAt: new Date().toISOString(),
            reason: reason || `Bulk ${adjustmentType === 'percentage' ? `${value}%` : `₹${value}`} rate adjustment`,
          },
          ...(prod.rateHistory || []),
        ];
        prod.updatedAt = new Date().toISOString();
        count++;
        updatedProducts.push({ id: prod.id, name: prod.name, sku: prod.sku, oldPrice, newPrice });
      }
    }
  });

  writeDb(db);

  res.json({
    success: true,
    updatedCount: count,
    items: updatedProducts.slice(0, 50),
  });
});

app.post('/api/products/:id/adjust-stock', (req: Request, res: Response) => {
  const db = readDb();
  const { quantityDelta, reason } = req.body;
  const prod = db.products.find((p: any) => p.id === req.params.id);
  if (!prod) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  const prevStock = prod.stockQuantity || 0;
  const newStock = Math.max(0, prevStock + Number(quantityDelta));
  prod.stockQuantity = newStock;
  prod.updatedAt = new Date().toISOString();

  // Record movement audit
  db.inventoryMovements.unshift({
    id: `mov-${Date.now()}`,
    productId: prod.id,
    productName: prod.name,
    type: Number(quantityDelta) >= 0 ? 'adjustment_add' : 'adjustment_remove',
    quantity: Number(quantityDelta),
    previousStock: prevStock,
    newStock,
    reason: reason || 'Manual stock adjustment by admin',
    createdAt: new Date().toISOString(),
  });

  writeDb(db);
  res.json(prod);
});

app.delete('/api/products/:id', (req: Request, res: Response) => {
  const db = readDb();
  db.products = db.products.filter((p: any) => p.id !== req.params.id);
  writeDb(db);
  res.json({ success: true, id: req.params.id });
});

// 6. Invoices CRUD & Workflow
app.get('/api/invoices', (req: Request, res: Response) => {
  const db = readDb();
  const { customerId, status, paymentStatus, startDate, endDate } = req.query;
  let list = db.invoices;

  if (customerId) list = list.filter((i: any) => i.customerId === customerId);
  if (status) list = list.filter((i: any) => i.status === status);
  if (paymentStatus) list = list.filter((i: any) => i.paymentStatus === paymentStatus);
  if (startDate) list = list.filter((i: any) => i.invoiceDate >= startDate);
  if (endDate) list = list.filter((i: any) => i.invoiceDate <= endDate);

  res.json(list);
});

app.get('/api/invoices/:id', (req: Request, res: Response) => {
  const db = readDb();
  const invoice = db.invoices.find((i: any) => i.id === req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }
  const payments = db.payments.filter((p: any) => p.invoiceId === invoice.id);
  res.json({ ...invoice, payments });
});

app.post('/api/invoices', (req: Request, res: Response) => {
  const db = readDb();
  const payload = req.body;

  if (!payload.customerId || !payload.items || payload.items.length === 0) {
    res.status(400).json({ error: 'Customer and at least one item are required' });
    return;
  }

  // Generate unique sequential invoice number
  const prefix = db.settings.invoicePrefix || 'BF/2026-27/';
  const num = db.settings.nextInvoiceNumber || 101;
  const invoiceNumber = payload.invoiceNumber || `${prefix}${num}`;
  db.settings.nextInvoiceNumber = num + 1;

  const newInvoice = {
    id: `inv-${Date.now()}`,
    ...payload,
    invoiceNumber,
    status: payload.status || 'issued',
    paymentStatus: payload.amountPaid >= payload.totalAmount ? 'paid' : payload.amountPaid > 0 ? 'partially_paid' : 'unpaid',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // If issued, deduct inventory for physical products and record movement
  if (newInvoice.status === 'issued') {
    for (const item of newInvoice.items) {
      if (item.type === 'product' && item.productId) {
        const prod = db.products.find((p: any) => p.id === item.productId);
        if (prod) {
          const prev = prod.stockQuantity || 0;
          prod.stockQuantity = Math.max(0, prev - item.quantity);
          db.inventoryMovements.unshift({
            id: `mov-${Date.now()}-${item.productId}`,
            productId: prod.id,
            productName: prod.name,
            type: 'sale',
            quantity: -item.quantity,
            previousStock: prev,
            newStock: prod.stockQuantity,
            referenceId: invoiceNumber,
            reason: `Invoice ${invoiceNumber} issued`,
            createdAt: new Date().toISOString(),
          });
        }
      }
    }
  }

  // If initial payment was made simultaneously
  if (payload.amountPaid > 0) {
    db.payments.unshift({
      id: `pay-${Date.now()}`,
      invoiceId: newInvoice.id,
      invoiceNumber: newInvoice.invoiceNumber,
      customerId: newInvoice.customerId,
      customerName: newInvoice.customerName,
      amount: payload.amountPaid,
      paymentDate: newInvoice.invoiceDate,
      paymentMethod: payload.paymentMethod || 'cash',
      referenceNumber: payload.paymentReference || 'Initial Settlement',
      notes: 'Payment recorded during invoice creation',
      createdAt: new Date().toISOString(),
    });
  }

  db.invoices.unshift(newInvoice);
  writeDb(db);
  res.status(201).json(newInvoice);
});

app.post('/api/invoices/:id/cancel', (req: Request, res: Response) => {
  const db = readDb();
  const { reason } = req.body;
  const invoice = db.invoices.find((i: any) => i.id === req.params.id);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  if (invoice.status === 'cancelled') {
    res.status(400).json({ error: 'Invoice is already cancelled' });
    return;
  }

  invoice.status = 'cancelled';
  invoice.cancellationReason = reason || 'Cancelled by business owner';
  invoice.cancelledAt = new Date().toISOString();
  invoice.updatedAt = new Date().toISOString();

  // Restore inventory for physical products
  for (const item of invoice.items) {
    if (item.type === 'product' && item.productId) {
      const prod = db.products.find((p: any) => p.id === item.productId);
      if (prod) {
        const prev = prod.stockQuantity || 0;
        prod.stockQuantity = prev + item.quantity;
        db.inventoryMovements.unshift({
          id: `mov-${Date.now()}-${item.productId}`,
          productId: prod.id,
          productName: prod.name,
          type: 'sale_cancellation',
          quantity: item.quantity,
          previousStock: prev,
          newStock: prod.stockQuantity,
          referenceId: invoice.invoiceNumber,
          reason: `Stock restored upon cancellation of ${invoice.invoiceNumber}: ${reason || ''}`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  writeDb(db);
  res.json(invoice);
});

// 7. Payments
app.get('/api/payments', (req: Request, res: Response) => {
  const db = readDb();
  const { invoiceId } = req.query;
  let list = db.payments;
  if (invoiceId) list = list.filter((p: any) => p.invoiceId === invoiceId);
  res.json(list);
});

app.post('/api/payments', (req: Request, res: Response) => {
  const db = readDb();
  const { invoiceId, amount, paymentDate, paymentMethod, referenceNumber, notes } = req.body;
  const invoice = db.invoices.find((i: any) => i.id === invoiceId);
  if (!invoice) {
    res.status(404).json({ error: 'Invoice not found' });
    return;
  }

  const payAmt = Number(amount) || 0;
  if (payAmt <= 0) {
    res.status(400).json({ error: 'Payment amount must be greater than zero' });
    return;
  }

  const newPayment = {
    id: `pay-${Date.now()}`,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    customerId: invoice.customerId,
    customerName: invoice.customerName,
    amount: payAmt,
    paymentDate: paymentDate || new Date().toISOString().split('T')[0],
    paymentMethod: paymentMethod || 'cash',
    referenceNumber: referenceNumber || '',
    notes: notes || '',
    createdAt: new Date().toISOString(),
  };

  db.payments.unshift(newPayment);

  // Recalculate invoice totals
  const totalPaid = (invoice.amountPaid || 0) + payAmt;
  invoice.amountPaid = totalPaid;
  invoice.balanceDue = Math.max(0, invoice.totalAmount - totalPaid);
  invoice.paymentStatus = invoice.balanceDue === 0 ? 'paid' : 'partially_paid';
  invoice.updatedAt = new Date().toISOString();

  writeDb(db);
  res.status(201).json({ payment: newPayment, invoice });
});

// 8. Expenses
app.get('/api/expenses', (req: Request, res: Response) => {
  const db = readDb();
  res.json(db.expenses);
});

app.post('/api/expenses', (req: Request, res: Response) => {
  const db = readDb();
  const { category, description, amount, expenseDate, paymentMethod, vendorName } = req.body;
  if (!category || !amount) {
    res.status(400).json({ error: 'Category and amount are required' });
    return;
  }

  const newExp = {
    id: `exp-${Date.now()}`,
    category,
    description: description || '',
    amount: Number(amount) || 0,
    expenseDate: expenseDate || new Date().toISOString().split('T')[0],
    paymentMethod: paymentMethod || 'cash',
    vendorName: vendorName || '',
    createdAt: new Date().toISOString(),
  };

  db.expenses.unshift(newExp);
  writeDb(db);
  res.status(201).json(newExp);
});

app.delete('/api/expenses/:id', (req: Request, res: Response) => {
  const db = readDb();
  db.expenses = db.expenses.filter((e: any) => e.id !== req.params.id);
  writeDb(db);
  res.json({ success: true, id: req.params.id });
});

// 9. Inventory Movements
app.get('/api/inventory-movements', (req: Request, res: Response) => {
  const db = readDb();
  const { productId } = req.query;
  let list = db.inventoryMovements;
  if (productId) list = list.filter((m: any) => m.productId === productId);
  res.json(list);
});

// 10. AI Business Assistant (Ground-truthed strictly in actual DB numbers)
app.post('/api/ai/assistant', async (req: Request, res: Response) => {
  const { query } = req.body;
  const db = readDb();

  const activeInvoices = db.invoices.filter((i: any) => i.status !== 'cancelled');
  const totalSales = activeInvoices.reduce((s: number, i: any) => s + i.totalAmount, 0);
  const totalCollections = db.payments.reduce((s: number, p: any) => s + p.amount, 0);
  const totalOutstanding = activeInvoices.reduce((s: number, i: any) => s + i.balanceDue, 0);
  const totalExpenses = db.expenses.reduce((s: number, e: any) => s + e.amount, 0);
  const overdueInvoices = activeInvoices.filter((i: any) => i.paymentStatus === 'overdue' || (i.balanceDue > 0 && i.dueDate < new Date().toISOString().split('T')[0]));

  const topCustomers = db.customers.map((c: any) => {
    const custInv = activeInvoices.filter((i: any) => i.customerId === c.id);
    const billed = custInv.reduce((s: number, i: any) => s + i.totalAmount, 0);
    const balance = custInv.reduce((s: number, i: any) => s + i.balanceDue, 0);
    return { name: c.name, billed, balance };
  }).sort((a: any, b: any) => b.billed - a.billed);

  const lowStockProds = db.products.filter((p: any) => p.type === 'product' && p.stockQuantity <= p.lowStockThreshold);

  try {
    if (ai) {
      const systemInstruction = `You are BillFlow AI, an intelligent business advisor for Indian MSMEs, retailers, and wholesalers.
You have access to the actual verified database state of "${db.settings.businessName}":
- Total Billed Sales: ₹${totalSales.toLocaleString('en-IN')}
- Total Cash Received: ₹${totalCollections.toLocaleString('en-IN')}
- Total Outstanding Receivables: ₹${totalOutstanding.toLocaleString('en-IN')}
- Total Business Expenses: ₹${totalExpenses.toLocaleString('en-IN')}
- Overdue Invoices Count: ${overdueInvoices.length} (Totaling ₹${overdueInvoices.reduce((s: number, i: any) => s + i.balanceDue, 0).toLocaleString('en-IN')})
- Overdue Invoices List: ${overdueInvoices.map((i: any) => `${i.invoiceNumber} for ${i.customerName} (₹${i.balanceDue})`).join('; ')}
- Top Customers by Billed Volume: ${topCustomers.slice(0, 3).map((c: any) => `${c.name} (Billed ₹${c.billed}, Due ₹${c.balance})`).join(', ')}
- Low Stock Items: ${lowStockProds.map((p: any) => `${p.name} (${p.stockQuantity} ${p.unit} remaining, threshold ${p.lowStockThreshold})`).join('; ') || 'None'}

STRICT RULES:
1. Always ground your calculations strictly on the numbers above. Never invent or hallucinate financial transactions.
2. Use Indian currency format (₹, Lakhs, Crores) and professional, clear Indian business terminology.
3. If asked about taxes, remind the user that BillFlow is a billing aid and advises consulting their Chartered Accountant for official GST return filings.`;

      const aiResponse = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: query || 'Provide an executive summary of current business health, collections, and overdue receivables.',
        config: {
          systemInstruction,
        },
      });

      res.json({
        answer: aiResponse.text || 'Unable to generate analysis.',
        model: 'gemini-3.8-flash',
        generatedAt: new Date().toISOString(),
      });
    } else {
      // Deterministic rule-based business responses when Gemini key is not configured
      let answer = '';
      const q = (query || '').toLowerCase();

      if (q.includes('overdue') || q.includes('pending') || q.includes('due')) {
        answer = `### ⚠️ Overdue Receivables Summary\nCurrently there are **${overdueInvoices.length} overdue invoices** totaling **₹${overdueInvoices.reduce((s: number, i: any) => s + i.balanceDue, 0).toLocaleString('en-IN')}**.\n\n${overdueInvoices.map((i: any) => `- **${i.invoiceNumber}** (${i.customerName}): ₹${i.balanceDue.toLocaleString('en-IN')} due since ${i.dueDate}`).join('\n')}\n\n**Action:** Consider sending payment reminder notices with UPI payment details.`;
      } else if (q.includes('stock') || q.includes('inventory') || q.includes('product')) {
        answer = `### 📦 Inventory Status\n${lowStockProds.length > 0 ? `⚠️ **${lowStockProds.length} item(s) are running below safe stock thresholds:**\n` + lowStockProds.map((p: any) => `- **${p.name}**: Only ${p.stockQuantity} ${p.unit} left (Threshold: ${p.lowStockThreshold})`).join('\n') : 'All physical products are above low-stock thresholds.'}`;
      } else {
        answer = `### 📊 Business Overview for ${db.settings.businessName}\n- **Total Billed Sales:** ₹${totalSales.toLocaleString('en-IN')}\n- **Total Collections Received:** ₹${totalCollections.toLocaleString('en-IN')}\n- **Outstanding Balance:** ₹${totalOutstanding.toLocaleString('en-IN')}\n- **Total Expenses Recorded:** ₹${totalExpenses.toLocaleString('en-IN')}\n- **Top Customer:** ${topCustomers[0]?.name || 'N/A'} (Billed ₹${(topCustomers[0]?.billed || 0).toLocaleString('en-IN')})`;
      }

      res.json({
        answer,
        model: 'billflow-rule-engine',
        generatedAt: new Date().toISOString(),
      });
    }
  } catch (err: any) {
    console.error('AI assistant error:', err);
    res.status(500).json({ error: err.message || 'Failed to query assistant' });
  }
});

// Configure Vite integration for dev server or static serve
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 BillFlow India Billing Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start BillFlow server:', err);
});
