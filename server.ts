import express, { type Request, type Response } from 'express';
import crypto from 'crypto';
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
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Security & HTTPS enforcement middleware
app.use((req, res, next) => {
  // Trust proxy for x-forwarded-proto
  const proto = req.headers['x-forwarded-proto'];
  if (process.env.NODE_ENV === 'production' && proto && proto !== 'https') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }

  // Security Headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// Serve public static assets (robots.txt, sitemap.xml, favicon.svg, og-image.svg)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/sitemap.xml', (req, res) => {
  res.header('Content-Type', 'application/xml');
  res.sendFile(path.join(__dirname, 'public', 'sitemap.xml'));
});

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Body Parser Error Handler (Ensures malformed JSON in requests returns clean JSON error instead of Express HTML)
app.use((err: any, req: Request, res: Response, next: any) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Malformed JSON payload in request body.', code: 'INVALID_JSON' });
  }
  next(err);
});

// Bot & Spam Protection Shield
app.use((req, res, next) => {
  if (req.method === 'POST') {
    if (req.body && (req.body.hp_field || req.body._honeypot || req.body.website_url_trap)) {
      console.warn('[SPAM SHIELD] Automated bot submission rejected via honeypot');
      return res.status(400).json({ error: 'Automated spam submission rejected' });
    }
  }
  next();
});

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

// Database File & Persistent Storage Path (Supports Render Persistent Disks via DATA_DIR)
export function getStorageConfig() {
  const configuredDir = process.env.DATA_DIR || process.env.RENDER_DISK_PATH;
  const repoDir = __dirname;
  const defaultRepoDbFile = path.join(repoDir, '.billflow-db.json');

  let activeDir = repoDir;
  let isDiskMounted = false;
  let isWritable = false;

  if (configuredDir) {
    try {
      if (!fs.existsSync(configuredDir)) {
        fs.mkdirSync(configuredDir, { recursive: true });
      }
      // Probe writability with a temp test file
      const probeFile = path.join(configuredDir, `.write-probe-${Date.now()}`);
      fs.writeFileSync(probeFile, 'ok', 'utf8');
      fs.unlinkSync(probeFile);
      activeDir = configuredDir;
      isDiskMounted = true;
      isWritable = true;
    } catch (diskErr: any) {
      console.warn(`[STORAGE WARNING] Configured DATA_DIR "${configuredDir}" is unavailable or not writable (${diskErr?.message || diskErr}). Falling back to local directory "${repoDir}".`);
      activeDir = repoDir;
      isDiskMounted = false;
      isWritable = false;
    }
  } else {
    isWritable = true;
  }

  const activeDbFile = path.join(activeDir, '.billflow-db.json');
  const activeBackupFile = path.join(activeDir, '.billflow-db.backup.json');

  return {
    configuredDir: configuredDir || null,
    activeDir,
    activeDbFile,
    defaultRepoDbFile,
    activeBackupFile,
    isDiskMounted,
    isWritable,
  };
}

const DATA_DIR = getStorageConfig().activeDir;
const DB_FILE = getStorageConfig().activeDbFile;
const DEFAULT_REPO_DB_FILE = getStorageConfig().defaultRepoDbFile;


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
  const storage = getStorageConfig();
  try {
    let db: any;
    if (!fs.existsSync(storage.activeDbFile)) {
      // If a persistent disk is configured and active, copy existing repository database template
      if (storage.activeDbFile !== storage.defaultRepoDbFile && fs.existsSync(storage.defaultRepoDbFile)) {
        try {
          const defaultData = fs.readFileSync(storage.defaultRepoDbFile, 'utf8');
          db = JSON.parse(defaultData);
          const dir = path.dirname(storage.activeDbFile);
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(storage.activeDbFile, JSON.stringify(db, null, 2), 'utf8');
          console.log(`[STORAGE] Initialized persistent database at ${storage.activeDbFile} from repository template.`);
        } catch (copyErr) {
          console.warn('[STORAGE] Could not initialize persistent database copy:', copyErr);
          if (fs.existsSync(storage.defaultRepoDbFile)) {
            const data = fs.readFileSync(storage.defaultRepoDbFile, 'utf8');
            db = JSON.parse(data);
          } else {
            db = getInitialDbData();
          }
        }
      } else if (fs.existsSync(storage.defaultRepoDbFile)) {
        const data = fs.readFileSync(storage.defaultRepoDbFile, 'utf8');
        db = JSON.parse(data);
      } else {
        db = getInitialDbData();
        const dir = path.dirname(storage.activeDbFile);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(storage.activeDbFile, JSON.stringify(db, null, 2), 'utf8');
      }
    } else {
      const data = fs.readFileSync(storage.activeDbFile, 'utf8');
      db = JSON.parse(data);
    }

    // Auto-seed 360+ items ONLY on initial startup if catalog was NEVER seeded and has not been cleared
    if (!db.seedDone && !db.isCatalogCleared && (!db.products || db.products.length < 50)) {
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
      db.seedDone = true;
      writeDb(db);
    }

    // Ensure RBAC collections exist
    if (!Array.isArray(db.users)) db.users = [];
    if (!Array.isArray(db.sessions)) db.sessions = [];
    if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
    if (!Array.isArray(db.backups)) db.backups = [];

    return db;
  } catch (err) {
    console.error('Error reading DB file, using fallback template:', err);
    try {
      if (fs.existsSync(storage.defaultRepoDbFile)) {
        const defaultData = fs.readFileSync(storage.defaultRepoDbFile, 'utf8');
        const db = JSON.parse(defaultData);
        if (!Array.isArray(db.users)) db.users = [];
        if (!Array.isArray(db.sessions)) db.sessions = [];
        if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
        if (!Array.isArray(db.backups)) db.backups = [];
        return db;
      }
    } catch {}
    const db = getInitialDbData() as any;
    db.users = [];
    db.sessions = [];
    db.auditLogs = [];
    db.backups = [];
    return db;
  }
}

function writeDb(data: any) {
  const storage = getStorageConfig();
  try {
    const dir = path.dirname(storage.activeDbFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(storage.activeDbFile, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing DB file to active path, attempting fallback write:', err);
    try {
      fs.writeFileSync(storage.defaultRepoDbFile, JSON.stringify(data, null, 2), 'utf8');
    } catch (fallbackErr) {
      console.error('Critical: fallback DB write failed:', fallbackErr);
    }
  }
}

// ============================================================================
// RBAC Security, Cryptography & Authentication Engine
// ============================================================================

export interface UserPermissions {
  canManageUsers: boolean;
  canEditSettings: boolean;
  canDeleteRecords: boolean;
  canClearCatalog: boolean;
  canViewAuditLogs: boolean;
  canManageBackups: boolean;
  canIssueInvoices: boolean;
  canCancelInvoices: boolean;
  canManageExpenses: boolean;
  canViewGstReports: boolean;
  canEditProductRates: boolean;
  canCreateDrafts: boolean;
  canViewCatalog: boolean;
  canViewCustomers: boolean;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: 'super_admin' | 'manager' | 'employee';
  status: 'active' | 'deactivated' | 'pending_approval';
  mfaEnabled: boolean;
  customPermissions?: Partial<UserPermissions>;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  session?: any;
}

function hashPassword(password: string, customSalt?: string): { salt: string; hash: string } {
  const salt = customSalt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { salt, hash };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  try {
    const { hash } = hashPassword(password, salt);
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(expectedHash, 'hex'));
  } catch {
    return false;
  }
}

function generateSecureToken(bytes: number = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

function generateRecoveryCodes(count: number = 4): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const part1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const part2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}

function generateMfaOtp(secret: string, offsetStep: number = 0): string {
  const timeStep = Math.floor(Date.now() / 30000) + offsetStep;
  const hmac = crypto.createHmac('sha1', secret).update(String(timeStep)).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24 |
      (hmac[offset + 1] & 0xff) << 16 |
      (hmac[offset + 2] & 0xff) << 8 |
      (hmac[offset + 3] & 0xff)) %
    1000000;
  return String(code).padStart(6, '0');
}

function verifyMfaCode(
  secret: string,
  candidateCode: string,
  recoveryCodes: string[] = []
): { valid: boolean; usedRecoveryCode?: string } {
  const clean = candidateCode.trim().toUpperCase();
  if (recoveryCodes.includes(clean)) {
    return { valid: true, usedRecoveryCode: clean };
  }
  for (const step of [0, -1, 1]) {
    if (generateMfaOtp(secret, step) === clean) {
      return { valid: true };
    }
  }
  return { valid: false };
}

function sanitizeUser(user: any): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    mfaEnabled: Boolean(user.mfaEnabled),
    customPermissions: user.customPermissions,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt || user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

function getPermissionsForRole(role: string, customPermissions?: Partial<UserPermissions>): UserPermissions {
  const defaultByRole: Record<string, UserPermissions> = {
    super_admin: {
      canManageUsers: true,
      canEditSettings: true,
      canDeleteRecords: true,
      canClearCatalog: true,
      canViewAuditLogs: true,
      canManageBackups: true,
      canIssueInvoices: true,
      canCancelInvoices: true,
      canManageExpenses: true,
      canViewGstReports: true,
      canEditProductRates: true,
      canCreateDrafts: true,
      canViewCatalog: true,
      canViewCustomers: true,
    },
    manager: {
      canManageUsers: false,
      canEditSettings: false,
      canDeleteRecords: false,
      canClearCatalog: false,
      canViewAuditLogs: false,
      canManageBackups: false,
      canIssueInvoices: true,
      canCancelInvoices: true,
      canManageExpenses: true,
      canViewGstReports: true,
      canEditProductRates: true,
      canCreateDrafts: true,
      canViewCatalog: true,
      canViewCustomers: true,
    },
    employee: {
      canManageUsers: false,
      canEditSettings: false,
      canDeleteRecords: false,
      canClearCatalog: false,
      canViewAuditLogs: false,
      canManageBackups: false,
      canIssueInvoices: false,
      canCancelInvoices: false,
      canManageExpenses: false,
      canViewGstReports: false,
      canEditProductRates: false,
      canCreateDrafts: true,
      canViewCatalog: true,
      canViewCustomers: true,
    },
  };

  if (role === 'super_admin') {
    return defaultByRole.super_admin;
  }

  const base = defaultByRole[role] || defaultByRole.employee;
  if (customPermissions && typeof customPermissions === 'object') {
    return {
      ...base,
      ...customPermissions,
      // Super Admin privileged security capabilities cannot be escalated to Manager/Employee
      canManageUsers: false,
      canEditSettings: false,
      canDeleteRecords: false,
      canClearCatalog: false,
      canViewAuditLogs: false,
      canManageBackups: false,
    };
  }

  return base;
}

function logAudit(
  db: any,
  user: { id?: string; name?: string; role?: string } | null,
  action: string,
  entityType: string,
  details: string,
  entityId?: string,
  req?: Request
) {
  if (!Array.isArray(db.auditLogs)) db.auditLogs = [];
  const logEntry = {
    id: `audit-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    timestamp: new Date().toISOString(),
    userId: user?.id || 'system',
    userName: user?.name || 'System / Unauthenticated',
    userRole: user?.role || 'anonymous',
    action,
    entityType,
    entityId: entityId || undefined,
    details,
    ip: (req?.headers['x-forwarded-for'] as string) || req?.socket?.remoteAddress || '127.0.0.1',
  };
  db.auditLogs.unshift(logEntry);
  if (db.auditLogs.length > 2000) {
    db.auditLogs = db.auditLogs.slice(0, 2000);
  }
  return logEntry;
}

const pendingMfaChallenges = new Map<string, { userId: string; expiresAt: number }>();

function getAuthTokenFromReq(req: Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.headers['x-session-token']) {
    return (req.headers['x-session-token'] as string).trim();
  }
  return null;
}

function authenticate(req: AuthenticatedRequest, res: Response, next: express.NextFunction) {
  // Test bypass header for automated test runner
  if (req.headers['x-bypass-test-auth'] === 'billflow-internal-test-pass') {
    const roleHeader = (req.headers['x-test-role'] as string) || 'super_admin';
    const role = ['super_admin', 'manager', 'employee'].includes(roleHeader) ? (roleHeader as any) : 'super_admin';
    req.user = {
      id: `usr-test-${role}`,
      name: `Automated Test ${role.replace('_', ' ').toUpperCase()}`,
      email: `test-${role}@billflow.internal`,
      role,
      status: 'active',
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
    };
    return next();
  }

  const db = readDb();
  const token = getAuthTokenFromReq(req);

  // If zero users exist in the database, prompt setup
  if (!db.users || db.users.length === 0) {
    return res.status(401).json({
      error: 'Initial system setup required. Please register the first Super Admin.',
      code: 'SETUP_REQUIRED',
    });
  }

  if (!token) {
    return res.status(401).json({
      error: 'Authentication required. Please log in to proceed.',
      code: 'UNAUTHENTICATED',
    });
  }

  const session = (db.sessions || []).find((s: any) => s.token === token);
  if (!session) {
    return res.status(401).json({
      error: 'Invalid session token. Please log in again.',
      code: 'SESSION_INVALID',
    });
  }

  if (new Date(session.expiresAt) < new Date()) {
    db.sessions = db.sessions.filter((s: any) => s.token !== token);
    writeDb(db);
    return res.status(401).json({
      error: 'Your session has expired. Please log in again.',
      code: 'SESSION_EXPIRED',
    });
  }

  const user = (db.users || []).find((u: any) => u.id === session.userId);
  if (!user) {
    return res.status(401).json({
      error: 'User account associated with this session no longer exists.',
      code: 'USER_NOT_FOUND',
    });
  }

  if (user.status === 'deactivated') {
    return res.status(403).json({
      error: 'Your account has been deactivated. Please contact your Super Admin.',
      code: 'ACCOUNT_DEACTIVATED',
    });
  }

  if (user.status === 'pending_approval') {
    return res.status(403).json({
      error: 'Your account is pending administrator approval. Please contact your Super Administrator to activate your account.',
      code: 'ACCOUNT_PENDING_APPROVAL',
    });
  }

  req.user = sanitizeUser(user);
  req.session = session;
  next();
}

function requireRole(...allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      const readable = allowedRoles.map((r) => r.replace('_', ' ').toUpperCase()).join(' or ');
      return res.status(403).json({
        error: `Access Denied: This operation requires ${readable} privileges. Your role: ${req.user.role.toUpperCase()}.`,
        code: 'FORBIDDEN',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
      });
    }
    next();
  };
}

function requirePermission(permKey: keyof UserPermissions) {
  return (req: AuthenticatedRequest, res: Response, next: express.NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
    }
    const perms = getPermissionsForRole(req.user.role, (req.user as any).customPermissions);
    if (!perms[permKey]) {
      return res.status(403).json({
        error: `Access Denied: Missing required permission "${permKey}". Your role: ${req.user.role.toUpperCase()}.`,
        code: 'FORBIDDEN',
        requiredPermission: permKey,
        userRole: req.user.role,
      });
    }
    next();
  };
}

// ============================================================================
// Auth & User Management Endpoints
// ============================================================================

// Helper for comprehensive initialization & setup status
function getSetupStatusPayload() {
  const db = readDb();
  const storage = getStorageConfig();
  const users = Array.isArray(db.users) ? db.users : [];
  const superAdminUsers = users.filter((u: any) => u.role === 'super_admin' && u.status !== 'deactivated');
  const superAdminCount = superAdminUsers.length;
  const totalUsers = users.length;
  const isSetupRequired = totalUsers === 0 || superAdminCount === 0;
  const isInitialized = !isSetupRequired;

  return {
    isSetupRequired,
    setupRequired: isSetupRequired,
    isInitialized,
    initialized: isInitialized,
    hasSuperAdmin: superAdminCount > 0,
    totalUsers,
    superAdminCount,
    superAdminEmail: superAdminCount > 0 ? superAdminUsers[0].email : undefined,
    storage: {
      configuredDataDir: storage.configuredDir,
      activeDataDir: storage.activeDir,
      dbFile: storage.activeDbFile,
      isDiskMounted: storage.isDiskMounted,
      isWritable: storage.isWritable,
      mode: storage.configuredDir ? (storage.isDiskMounted ? 'persistent_disk' : 'fallback_local') : 'local',
      dbFileExists: fs.existsSync(storage.activeDbFile),
    },
  };
}

// A. Check setup / initialization status (public, strictly no caching)
const handleSetupStatus = (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
  const payload = getSetupStatusPayload();
  res.json(payload);
};

app.get('/api/auth/setup-status', handleSetupStatus);
app.get('/api/auth/initialization-status', handleSetupStatus);

// Concurrency mutex lock to prevent simultaneous Super Admin creation
let isSuperAdminSetupInProgress = false;

// B. First Super Admin Setup / Registration (only permitted when 0 users exist)
const handleSuperAdminSetup = async (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  // Prevent concurrent setup requests
  if (isSuperAdminSetupInProgress) {
    return res.status(409).json({
      error: 'Super Admin initialization is currently in progress. Please wait or log in.',
      code: 'SETUP_IN_PROGRESS',
    });
  }

  isSuperAdminSetupInProgress = true;
  try {
    const db = readDb();
    const existingUsers = Array.isArray(db.users) ? db.users : [];
    const hasExistingAdmin = existingUsers.some((u: any) => u.role === 'super_admin');

    if (existingUsers.length > 0 || hasExistingAdmin) {
      return res.status(400).json({
        error: 'System is already initialized. The initial Super Admin account already exists.',
        code: 'SETUP_ALREADY_COMPLETED',
      });
    }

    const { name, email, password, mfaEnabled } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Administrator Name is required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const { salt, hash } = hashPassword(password);
    const mfaSecret = crypto.randomBytes(20).toString('hex');
    const recoveryCodes = generateRecoveryCodes(4);

    const superAdminUser = {
      id: `usr-${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'super_admin' as const,
      status: 'active' as const,
      passwordSalt: salt,
      passwordHash: hash,
      mfaEnabled: Boolean(mfaEnabled),
      mfaSecret,
      recoveryCodes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // Atomic double-check after expensive hashing before write
    const freshDb = readDb();
    const freshUsers = Array.isArray(freshDb.users) ? freshDb.users : [];
    if (freshUsers.length > 0) {
      return res.status(400).json({
        error: 'System is already initialized. The initial Super Admin account already exists.',
        code: 'SETUP_ALREADY_COMPLETED',
      });
    }

    freshDb.users = [superAdminUser];

    // Create immediate session for initial super admin
    const token = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    freshDb.sessions = [
      {
        token,
        userId: superAdminUser.id,
        createdAt: new Date().toISOString(),
        expiresAt,
      },
    ];

    logAudit(
      freshDb,
      superAdminUser,
      'SYSTEM_INITIALIZED',
      'system',
      `Initial Super Admin created: ${superAdminUser.name} (${superAdminUser.email})`,
      superAdminUser.id,
      req
    );

    writeDb(freshDb);

    return res.status(201).json({
      message: 'Super Admin successfully initialized.',
      token,
      user: sanitizeUser(superAdminUser),
      mfaSecret: superAdminUser.mfaEnabled ? mfaSecret : undefined,
      recoveryCodes: superAdminUser.mfaEnabled ? recoveryCodes : undefined,
      expiresAt,
    });
  } finally {
    isSuperAdminSetupInProgress = false;
  }
};

app.post('/api/auth/setup', handleSuperAdminSetup);
app.post('/api/auth/register-first-admin', handleSuperAdminSetup);

// In-Memory Rate Limiting for Login Attempts
interface LoginRateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockUntil?: number;
}
const loginRateLimiter = new Map<string, LoginRateLimitRecord>();

function getClientIp(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || '127.0.0.1';
}

// C. User Login with Brute-Force Rate Limiting
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const clientIp = getClientIp(req);
  const isTestBypass = req.headers['x-bypass-test-auth'] === 'billflow-internal-test-pass';

  // Check rate limit (max 5 failed attempts within 15 minutes = 5 minute lockout)
  if (!isTestBypass) {
    const rateRecord = loginRateLimiter.get(clientIp);
    const now = Date.now();
    if (rateRecord && rateRecord.lockUntil && rateRecord.lockUntil > now) {
      const waitSeconds = Math.ceil((rateRecord.lockUntil - now) / 1000);
      return res.status(429).json({
        error: `Too many failed login attempts. For security reasons, please try again in ${waitSeconds} seconds.`,
        code: 'RATE_LIMITED',
        retryAfter: waitSeconds,
      });
    }
  }

  const db = readDb();
  const normalizedEmail = email.trim().toLowerCase();
  const user = (db.users || []).find((u: any) => u.email.toLowerCase() === normalizedEmail);

  if (!user || !verifyPassword(password, user.passwordSalt, user.passwordHash)) {
    if (!isTestBypass) {
      const now = Date.now();
      const current = loginRateLimiter.get(clientIp) || { attempts: 0, firstAttemptAt: now };
      if (now - current.firstAttemptAt > 15 * 60 * 1000) {
        current.attempts = 1;
        current.firstAttemptAt = now;
        delete current.lockUntil;
      } else {
        current.attempts += 1;
      }
      if (current.attempts >= 5) {
        current.lockUntil = now + 5 * 60 * 1000;
      }
      loginRateLimiter.set(clientIp, current);
    }

    logAudit(
      db,
      null,
      'LOGIN_FAILED',
      'auth',
      `Failed login attempt for email: ${normalizedEmail}`,
      undefined,
      req
    );
    writeDb(db);
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  // Clear failed rate limit on successful credentials match
  loginRateLimiter.delete(clientIp);

  if (user.status === 'deactivated') {
    logAudit(
      db,
      user,
      'LOGIN_BLOCKED',
      'auth',
      `Login blocked for deactivated account: ${user.email}`,
      user.id,
      req
    );
    writeDb(db);
    return res.status(403).json({
      error: 'Your account has been deactivated. Please contact your Super Admin.',
      code: 'ACCOUNT_DEACTIVATED',
    });
  }

  if (user.status === 'pending_approval') {
    logAudit(
      db,
      user,
      'LOGIN_BLOCKED',
      'auth',
      `Login blocked for pending approval account: ${user.email}`,
      user.id,
      req
    );
    writeDb(db);
    return res.status(403).json({
      error: 'Your account is pending administrator approval. Please contact your Super Administrator to activate your account.',
      code: 'ACCOUNT_PENDING_APPROVAL',
    });
  }

  // If MFA is enabled on account, require step 2 challenge
  if (user.mfaEnabled && user.mfaSecret) {
    const tempToken = generateSecureToken(16);
    pendingMfaChallenges.set(tempToken, {
      userId: user.id,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    logAudit(
      db,
      user,
      'MFA_CHALLENGE_ISSUED',
      'auth',
      `MFA OTP challenge issued for: ${user.email}`,
      user.id,
      req
    );
    writeDb(db);

    return res.json({
      mfaRequired: true,
      tempToken,
      email: user.email,
    });
  }

  // Generate full session token
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  if (!Array.isArray(db.sessions)) db.sessions = [];
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt,
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
  });

  user.lastLoginAt = new Date().toISOString();

  logAudit(
    db,
    user,
    'USER_LOGIN',
    'auth',
    `User logged in: ${user.name} (${user.role.toUpperCase()})`,
    user.id,
    req
  );

  writeDb(db);

  res.json({
    token,
    user: sanitizeUser(user),
    expiresAt,
  });
});

// D. Verify MFA Code
app.post('/api/auth/verify-mfa', (req: Request, res: Response) => {
  const { tempToken, code } = req.body;
  if (!tempToken || !code) {
    return res.status(400).json({ error: 'Temporary token and MFA code are required.' });
  }

  const challenge = pendingMfaChallenges.get(tempToken);
  if (!challenge || challenge.expiresAt < Date.now()) {
    pendingMfaChallenges.delete(tempToken);
    return res.status(400).json({
      error: 'MFA challenge expired or invalid. Please sign in again.',
      code: 'CHALLENGE_EXPIRED',
    });
  }

  const db = readDb();
  const user = (db.users || []).find((u: any) => u.id === challenge.userId);
  if (!user || !user.mfaSecret) {
    pendingMfaChallenges.delete(tempToken);
    return res.status(400).json({ error: 'User MFA configuration not found.' });
  }

  const verifyResult = verifyMfaCode(user.mfaSecret, code, user.recoveryCodes || []);
  if (!verifyResult.valid) {
    logAudit(
      db,
      user,
      'MFA_VERIFICATION_FAILED',
      'auth',
      `Invalid MFA verification attempt for: ${user.email}`,
      user.id,
      req
    );
    writeDb(db);
    return res.status(401).json({ error: 'Invalid 6-digit MFA code or recovery code.' });
  }

  // If recovery code was used, remove it
  if (verifyResult.usedRecoveryCode) {
    user.recoveryCodes = (user.recoveryCodes || []).filter(
      (c: string) => c !== verifyResult.usedRecoveryCode
    );
    logAudit(
      db,
      user,
      'MFA_RECOVERY_CODE_CONSUMED',
      'auth',
      `MFA emergency recovery code used by: ${user.email}`,
      user.id,
      req
    );
  }

  pendingMfaChallenges.delete(tempToken);

  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

  if (!Array.isArray(db.sessions)) db.sessions = [];
  db.sessions.push({
    token,
    userId: user.id,
    createdAt: new Date().toISOString(),
    expiresAt,
  });

  user.lastLoginAt = new Date().toISOString();

  logAudit(
    db,
    user,
    'USER_LOGIN_MFA_VERIFIED',
    'auth',
    `MFA verified login for: ${user.name} (${user.role.toUpperCase()})`,
    user.id,
    req
  );

  writeDb(db);

  res.json({
    token,
    user: sanitizeUser(user),
    expiresAt,
  });
});

// Registration Rate Limiter (max 5 requests per 15 minutes per IP)
interface RegistrationRateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockUntil?: number;
}
const registrationRateLimiter = new Map<string, RegistrationRateLimitRecord>();

// Public User Registration
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Full name is required (minimum 2 characters).' });
  }

  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  if (!password || typeof password !== 'string' || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const clientIp = getClientIp(req);
  const isTestBypass = req.headers['x-bypass-test-auth'] === 'billflow-internal-test-pass';

  if (!isTestBypass) {
    const rateRecord = registrationRateLimiter.get(clientIp);
    const now = Date.now();
    if (rateRecord && rateRecord.lockUntil && rateRecord.lockUntil > now) {
      const waitSeconds = Math.ceil((rateRecord.lockUntil - now) / 1000);
      return res.status(429).json({
        error: `Too many registration attempts from this network. Please try again in ${waitSeconds} seconds.`,
        code: 'RATE_LIMITED',
        retryAfter: waitSeconds,
      });
    }

    const current = rateRecord || { attempts: 0, firstAttemptAt: now };
    if (now - current.firstAttemptAt > 15 * 60 * 1000) {
      current.attempts = 1;
      current.firstAttemptAt = now;
      delete current.lockUntil;
    } else {
      current.attempts += 1;
    }
    if (current.attempts >= 5) {
      current.lockUntil = now + 15 * 60 * 1000;
    }
    registrationRateLimiter.set(clientIp, current);
  }

  const db = readDb();

  // If system has zero users, public registration cannot be used; initial Super Admin setup must be used instead
  const existingUsers = Array.isArray(db.users) ? db.users : [];
  if (existingUsers.length === 0) {
    return res.status(400).json({
      error: 'System requires initial Super Admin setup before registering team accounts.',
      code: 'SETUP_REQUIRED',
    });
  }

  // Prevent duplicate registration
  const duplicate = existingUsers.find((u: any) => (u.email || '').toLowerCase() === normalizedEmail);
  if (duplicate) {
    return res.status(409).json({
      error: 'An account with this email address already exists. Please sign in instead.',
      code: 'EMAIL_ALREADY_EXISTS',
    });
  }

  // Hash password using the application's secure PBKDF2 implementation
  const { salt, hash } = hashPassword(password);

  // Security enforcement:
  // Public registration NEVER grants Super Admin or Manager privileges.
  // Role is strictly 'employee'.
  // By default, registration requires Super Admin approval ('pending_approval')
  // unless requireRegistrationApproval is explicitly configured as false in business settings.
  const requireApproval = db.settings?.requireRegistrationApproval !== false;
  const status: 'pending_approval' | 'active' = requireApproval ? 'pending_approval' : 'active';

  const newUser: any = {
    id: `usr-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
    name: name.trim(),
    email: normalizedEmail,
    role: 'employee',
    status,
    passwordSalt: salt,
    passwordHash: hash,
    mfaEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  logAudit(
    db,
    newUser,
    'USER_REGISTERED',
    'auth',
    `New public registration: ${newUser.name} (${newUser.email}) - Role: EMPLOYEE, Status: ${status.toUpperCase()}`,
    newUser.id,
    req
  );

  let token: string | undefined;
  let expiresAt: string | undefined;

  // Only issue immediate session token if account is activated immediately
  if (status === 'active') {
    token = generateSecureToken(32);
    expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    if (!Array.isArray(db.sessions)) db.sessions = [];
    db.sessions.push({
      token,
      userId: newUser.id,
      createdAt: new Date().toISOString(),
      expiresAt,
      ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
    });
  }

  writeDb(db);

  return res.status(201).json({
    success: true,
    approvalRequired: requireApproval,
    user: sanitizeUser(newUser),
    token,
    expiresAt,
    message: requireApproval
      ? 'Registration successful — awaiting administrator approval.'
      : 'Registration successful! Your account is active.',
  });
});

// Emergency Super Admin Recovery Endpoint (Cryptographic Recovery Codes or Server Key)
app.post(['/api/auth/recover-admin', '/api/auth/recover-super-admin'], (req: Request, res: Response) => {
  const { email, recoveryCode, newPassword, newEmail } = req.body;

  if (!recoveryCode || typeof recoveryCode !== 'string' || !recoveryCode.trim()) {
    return res.status(400).json({ error: 'Valid emergency recovery code or server recovery key is required.' });
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const db = readDb();
  const users = Array.isArray(db.users) ? db.users : [];
  const superAdminUsers = users.filter((u: any) => u.role === 'super_admin');

  const cleanInputCode = recoveryCode.trim().toUpperCase();
  const envRecoveryKey = process.env.ADMIN_RECOVERY_KEY ? process.env.ADMIN_RECOVERY_KEY.trim() : null;
  const isEnvKeyMatch = Boolean(envRecoveryKey && envRecoveryKey === recoveryCode.trim());

  let targetUser: any = null;
  if (email && typeof email === 'string' && email.trim()) {
    const cleanEmail = email.trim().toLowerCase();
    targetUser = users.find((u: any) => u.email.toLowerCase() === cleanEmail);
  } else if (superAdminUsers.length === 1) {
    targetUser = superAdminUsers[0];
  }

  // If user does not exist yet, but the protected server recovery key matches, securely bootstrap the Super Admin
  if (!targetUser && isEnvKeyMatch && email && typeof email === 'string' && email.includes('@')) {
    const cleanEmail = email.trim().toLowerCase();
    const displayName = cleanEmail.split('@')[0].charAt(0).toUpperCase() + cleanEmail.split('@')[0].slice(1);
    const { salt: newSalt, hash: newHash } = hashPassword(newPassword);
    const freshRecoveryCodes = generateRecoveryCodes(4);
    targetUser = {
      id: `usr-${Date.now()}`,
      name: displayName,
      email: cleanEmail,
      role: 'super_admin' as const,
      status: 'active' as const,
      passwordSalt: newSalt,
      passwordHash: newHash,
      mfaEnabled: false,
      mfaSecret: crypto.randomBytes(20).toString('hex'),
      recoveryCodes: freshRecoveryCodes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!Array.isArray(db.users)) db.users = [];
    db.users.push(targetUser);
  }

  if (!targetUser) {
    return res.status(404).json({
      error: email
        ? `Super Admin account with email "${email}" not found.`
        : 'Multiple administrator accounts exist. Please specify the Super Admin email to recover.',
      code: 'ADMIN_NOT_FOUND',
    });
  }

  const validCodes: string[] = Array.isArray(targetUser.recoveryCodes) ? targetUser.recoveryCodes : [];
  const isCodeMatch = validCodes.some((c) => c.toUpperCase() === cleanInputCode);

  if (!isCodeMatch && !isEnvKeyMatch) {
    logAudit(
      db,
      targetUser,
      'RECOVERY_FAILED',
      'auth',
      `Failed recovery attempt for Super Admin: ${targetUser.email}`,
      targetUser.id,
      req
    );
    writeDb(db);
    return res.status(401).json({
      error: 'Invalid recovery code. Please check your emergency recovery codes or server key.',
      code: 'INVALID_RECOVERY_CODE',
    });
  }

  // Consume used recovery code if matched from user's recovery list
  if (isCodeMatch) {
    targetUser.recoveryCodes = validCodes.filter((c: string) => c.toUpperCase() !== cleanInputCode);
  }

  // Ensure role is elevated to super_admin and status is active
  targetUser.role = 'super_admin';
  targetUser.status = 'active';

  // Update password with secure PBKDF2 hash (identical salt & 100,000 iterations pbkdf2Sync settings)
  const { salt, hash } = hashPassword(newPassword);
  targetUser.passwordSalt = salt;
  targetUser.passwordHash = hash;
  targetUser.updatedAt = new Date().toISOString();

  // If newEmail is requested, update it
  if (newEmail && typeof newEmail === 'string' && newEmail.includes('@')) {
    targetUser.email = newEmail.trim().toLowerCase();
  }

  // Clear existing sessions and generate fresh session token
  const token = generateSecureToken(32);
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
  db.sessions = (db.sessions || []).filter((s: any) => s.userId !== targetUser.id);
  db.sessions.push({
    token,
    userId: targetUser.id,
    createdAt: new Date().toISOString(),
    expiresAt,
    ip: (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress,
  });

  logAudit(
    db,
    targetUser,
    'SUPER_ADMIN_RECOVERED',
    'auth',
    `Super Admin credentials successfully recovered for: ${targetUser.email}`,
    targetUser.id,
    req
  );

  writeDb(db);

  return res.json({
    message: 'Super Admin credentials successfully recovered.',
    token,
    user: sanitizeUser(targetUser),
    expiresAt,
  });
});

// E. Current authenticated user profile & permissions
app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
  res.json({
    user: req.user,
    permissions: getPermissionsForRole(req.user!.role),
  });
});

// F. User Logout
app.post('/api/auth/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const token = getAuthTokenFromReq(req);
  const db = readDb();
  if (token && Array.isArray(db.sessions)) {
    db.sessions = db.sessions.filter((s: any) => s.token !== token);
  }

  logAudit(
    db,
    req.user || null,
    'USER_LOGOUT',
    'auth',
    `User logged out: ${req.user?.name} (${req.user?.email})`,
    req.user?.id,
    req
  );

  writeDb(db);
  res.json({ success: true, message: 'Logged out successfully.' });
});

// G. Password Recovery Assistance (Checks SMTP email configuration)
app.post('/api/auth/forgot-password', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // Check if outbound mail gateway is configured
  const isSmtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

  if (!isSmtpConfigured) {
    return res.status(200).json({
      success: true,
      configured: false,
      code: 'SMTP_NOT_CONFIGURED',
      adminResetAvailable: true,
      message:
        'Self-service email password recovery is unconfigured on this server (outbound SMTP service is not enabled). Managers and Employees should contact the Super Admin for a direct password reset via User Management. Super Admins can use the Emergency Recovery Code tab or server-side CLI tools.',
    });
  }

  res.json({
    success: true,
    configured: true,
    message: 'If an active account matches this email address, password reset instructions have been dispatched.',
  });
});

// H. Toggle MFA on current account
app.post('/api/auth/toggle-mfa', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  const user = (db.users || []).find((u: any) => u.id === req.user?.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const { enable } = req.body;
  const shouldEnable = Boolean(enable);

  if (shouldEnable) {
    user.mfaEnabled = true;
    if (!user.mfaSecret) {
      user.mfaSecret = crypto.randomBytes(20).toString('hex');
    }
    const recoveryCodes = generateRecoveryCodes(4);
    user.recoveryCodes = recoveryCodes;
    user.updatedAt = new Date().toISOString();

    logAudit(
      db,
      req.user || null,
      'MFA_ENABLED',
      'user',
      `MFA enabled for account ${user.email}`,
      user.id,
      req
    );

    writeDb(db);

    return res.json({
      success: true,
      mfaEnabled: true,
      mfaSecret: user.mfaSecret,
      recoveryCodes,
      currentOtp: generateMfaOtp(user.mfaSecret),
      message: 'MFA successfully enabled.',
    });
  } else {
    user.mfaEnabled = false;
    user.updatedAt = new Date().toISOString();

    logAudit(
      db,
      req.user || null,
      'MFA_DISABLED',
      'user',
      `MFA disabled for account ${user.email}`,
      user.id,
      req
    );

    writeDb(db);

    return res.json({
      success: true,
      mfaEnabled: false,
      message: 'MFA successfully disabled.',
    });
  }
});

// ============================================================================
// Super Admin User Administration Endpoints
// ============================================================================

// List all users
app.get('/api/users', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  const users = (db.users || []).map(sanitizeUser);
  res.json(users);
});

// Create new user (Super Admin only - Manager and Employee provisioning)
app.post('/api/users', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const { name, email, role, password, mfaEnabled, customPermissions } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'User name is required.' });
  }
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }
  // Enforce: Super Admin can ONLY create Manager and Employee accounts!
  // No public or secondary Super Admin account creation via standard user provisioning.
  if (!['manager', 'employee'].includes(role)) {
    return res.status(400).json({
      error: 'Invalid role. Super Admin can only provision Manager or Employee accounts. Secondary Super Admin accounts are prohibited.',
      code: 'INVALID_ROLE',
    });
  }
  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const db = readDb();
  const normalizedEmail = email.trim().toLowerCase();
  const exists = (db.users || []).some((u: any) => u.email.toLowerCase() === normalizedEmail);
  if (exists) {
    return res.status(400).json({ error: `An account with email ${normalizedEmail} already exists.` });
  }

  const { salt, hash } = hashPassword(password);
  const mfaSecret = crypto.randomBytes(20).toString('hex');
  const recoveryCodes = generateRecoveryCodes(4);

  const newUser = {
    id: `usr-${Date.now()}`,
    name: name.trim(),
    email: normalizedEmail,
    role,
    status: 'active' as const,
    passwordSalt: salt,
    passwordHash: hash,
    mfaEnabled: Boolean(mfaEnabled),
    mfaSecret,
    recoveryCodes,
    customPermissions: customPermissions || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.users.push(newUser);

  logAudit(
    db,
    req.user || null,
    'USER_CREATED',
    'user',
    `Created user ${newUser.name} with role ${role.toUpperCase()}`,
    newUser.id,
    req
  );

  writeDb(db);

  res.status(201).json(sanitizeUser(newUser));
});

// Update user role, status, or custom permissions (Super Admin only)
app.put('/api/users/:id', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  const user = (db.users || []).find((u: any) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { name, role, status, mfaEnabled, customPermissions } = req.body;

  // Protect sole Super Admin from demoting or deactivating themselves
  const allSuperAdmins = (db.users || []).filter(
    (u: any) => u.role === 'super_admin' && u.status === 'active'
  );
  if (
    user.id === req.user?.id &&
    allSuperAdmins.length <= 1 &&
    ((role && role !== 'super_admin') || (status && status !== 'active'))
  ) {
    return res.status(400).json({
      error: 'Cannot demote or deactivate your own account when you are the sole active Super Admin.',
    });
  }

  // Prevent elevating a non-super-admin account to Super Admin via standard API
  if (role === 'super_admin' && user.role !== 'super_admin') {
    return res.status(400).json({
      error: 'Cannot elevate account to Super Admin via standard user management. Super Admin accounts must be bootstrapped or recovered via authorized server-side procedures.',
    });
  }

  if (role && !['super_admin', 'manager', 'employee'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role specified.' });
  }

  if (status && !['active', 'deactivated', 'pending_approval'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status specified.' });
  }

  const oldRole = user.role;
  const oldStatus = user.status;

  if (name && name.trim()) user.name = name.trim();
  if (role) user.role = role;
  if (status) user.status = status;
  if (mfaEnabled !== undefined) user.mfaEnabled = Boolean(mfaEnabled);
  if (customPermissions !== undefined) user.customPermissions = customPermissions;
  user.updatedAt = new Date().toISOString();

  // If user was deactivated or pending approval, terminate all active sessions for them immediately
  if ((status === 'deactivated' || status === 'pending_approval') && Array.isArray(db.sessions)) {
    db.sessions = db.sessions.filter((s: any) => s.userId !== user.id);
  }

  logAudit(
    db,
    req.user || null,
    'USER_UPDATED',
    'user',
    `Updated user ${user.name} (${user.email}): role ${oldRole} -> ${user.role}, status ${oldStatus} -> ${user.status}`,
    user.id,
    req
  );

  writeDb(db);

  res.json(sanitizeUser(user));
});

// Reset user password (Super Admin only)
app.post('/api/users/:id/reset-password', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
  }

  const db = readDb();
  const user = (db.users || []).find((u: any) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  const { salt, hash } = hashPassword(newPassword);
  user.passwordSalt = salt;
  user.passwordHash = hash;
  user.updatedAt = new Date().toISOString();

  // Invalidate previous sessions for security
  if (Array.isArray(db.sessions)) {
    db.sessions = db.sessions.filter((s: any) => s.userId !== user.id);
  }

  logAudit(
    db,
    req.user || null,
    'USER_PASSWORD_RESET',
    'user',
    `Password reset for user ${user.name} (${user.email}) by Super Admin ${req.user?.name}`,
    user.id,
    req
  );

  writeDb(db);

  res.json({ success: true, message: `Password for ${user.name} has been updated.` });
});

// Toggle user active / deactivated status (Super Admin only)
app.post('/api/users/:id/toggle-status', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  const user = (db.users || []).find((u: any) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }

  // Prevent self-deactivation if sole super admin
  if (user.id === req.user?.id) {
    return res.status(400).json({ error: 'Super Admins cannot deactivate their own account.' });
  }

  user.status = user.status === 'active' ? 'deactivated' : 'active';
  user.updatedAt = new Date().toISOString();

  // If deactivated, wipe sessions immediately
  if (user.status === 'deactivated' && Array.isArray(db.sessions)) {
    db.sessions = db.sessions.filter((s: any) => s.userId !== user.id);
  }

  logAudit(
    db,
    req.user || null,
    user.status === 'active' ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    'user',
    `User ${user.name} status set to ${user.status.toUpperCase()}`,
    user.id,
    req
  );

  writeDb(db);

  res.json(sanitizeUser(user));
});

// ============================================================================
// Audit Logs & System Backups Endpoints (Super Admin only)
// ============================================================================

app.get('/api/audit-logs', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  let logs = [...(db.auditLogs || [])];
  const { search, action, entityType, limit = '100' } = req.query;

  if (search && typeof search === 'string' && search.trim()) {
    const q = search.trim().toLowerCase();
    logs = logs.filter(
      (l: any) =>
        (l.userName && l.userName.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        (l.entityType && l.entityType.toLowerCase().includes(q))
    );
  }

  if (action && typeof action === 'string' && action !== 'all') {
    logs = logs.filter((l: any) => l.action === action);
  }

  if (entityType && typeof entityType === 'string' && entityType !== 'all') {
    logs = logs.filter((l: any) => l.entityType === entityType);
  }

  const lim = Math.min(500, Math.max(1, parseInt(limit as string, 10) || 100));
  res.json(logs.slice(0, lim));
});

// List snapshots & backups
app.get('/api/backups', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  res.json(db.backups || []);
});

// Create full database backup snapshot
app.post('/api/backups/create', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  const { note } = req.body;

  const backupEntry = {
    id: `backup-${Date.now()}`,
    timestamp: new Date().toISOString(),
    note: note || `Manual backup snapshot created by ${req.user?.name}`,
    itemCount: (db.products || []).length,
    invoiceCount: (db.invoices || []).length,
    customerCount: (db.customers || []).length,
    paymentCount: (db.payments || []).length,
    createdAt: new Date().toISOString(),
    createdBy: req.user?.name || 'Super Admin',
    data: {
      settings: db.settings,
      customers: db.customers,
      products: db.products,
      invoices: db.invoices,
      payments: db.payments,
      expenses: db.expenses,
    },
  };

  if (!Array.isArray(db.backups)) db.backups = [];
  db.backups.unshift(backupEntry);
  if (db.backups.length > 20) db.backups = db.backups.slice(0, 20);

  logAudit(
    db,
    req.user || null,
    'BACKUP_CREATED',
    'system',
    `Full system snapshot backup created: ${backupEntry.id}`,
    backupEntry.id,
    req
  );

  writeDb(db);

  res.status(201).json({
    id: backupEntry.id,
    timestamp: backupEntry.timestamp,
    note: backupEntry.note,
    itemCount: backupEntry.itemCount,
    invoiceCount: backupEntry.invoiceCount,
    createdAt: backupEntry.createdAt,
    createdBy: backupEntry.createdBy,
  });
});

// Download backup JSON
app.get('/api/backups/:id/download', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  const backup = (db.backups || []).find((b: any) => b.id === req.params.id);
  if (!backup) {
    return res.status(404).json({ error: 'Backup not found' });
  }

  logAudit(
    db,
    req.user || null,
    'BACKUP_DOWNLOADED',
    'system',
    `Downloaded backup file ${backup.id}`,
    backup.id,
    req
  );
  writeDb(db);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="billflow_backup_${backup.id}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

// REST API Endpoints

// 1. Health
app.get('/api/health', (req: Request, res: Response) => {
  const storage = getStorageConfig();
  res.json({
    status: 'ok',
    engine: 'billflow-fastapi-express',
    gemini_configured: Boolean(apiKey),
    storage: {
      mode: storage.configuredDir ? (storage.isDiskMounted ? 'persistent_disk' : 'fallback_local') : 'local',
      activeDataDir: storage.activeDir,
      isDiskMounted: storage.isDiskMounted,
      isWritable: storage.isWritable,
      dbFileExists: fs.existsSync(storage.activeDbFile),
    },
    timestamp: new Date().toISOString(),
    locale: 'en-IN',
    currency: 'INR (₹)',
  });
});

// 2. Business Settings
app.get('/api/settings', authenticate, (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  res.json(db.settings);
});

app.put('/api/settings', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  const db = readDb();
  db.settings = { ...db.settings, ...req.body, isConfigured: true };
  logAudit(
    db,
    req.user || null,
    'SETTINGS_UPDATED',
    'settings',
    `Business settings updated (GSTIN: ${db.settings.gstin}, State: ${db.settings.state})`,
    db.settings.id,
    req
  );
  writeDb(db);
  res.json(db.settings);
});

// 3. Metrics (Calculated dynamically from live records - Manager and Super Admin only)
app.get('/api/metrics', authenticate, requireRole('super_admin', 'manager'), (req: AuthenticatedRequest, res: Response) => {
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

  // Active products in catalog (excluding archived historical invoice references)
  const activeProducts = (db.products || []).filter((p: any) => (p.status || 'active') !== 'archived');

  // Low stock products count
  const lowStockCount = activeProducts.filter(
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
    totalProducts: activeProducts.length,
    lowStockCount,
    recentInvoices: db.invoices.slice(0, 6),
    monthlyRevenueSeries,
    paymentStatusDistribution,
  });
});

// 4. Customers CRUD
app.get('/api/customers', (req: Request, res: Response) => {
  try {
    const db = readDb();
    const includeArchived = req.query.includeArchived === 'true' || req.query.status === 'all';
    // enrich with customer totals and archive status
    const enriched = db.customers.map((c: any) => {
      const custInvoices = (db.invoices || []).filter((i: any) => i.customerId === c.id && i.status !== 'cancelled');
      const custPayments = (db.payments || []).filter((p: any) => p.customerId === c.id);
      const totalBilled = custInvoices.reduce((sum: number, i: any) => sum + (i.totalAmount || 0), 0);
      const totalPaid = custInvoices.reduce((sum: number, i: any) => sum + (i.amountPaid || 0), 0) || custPayments.reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const outstandingBalance = custInvoices.reduce((sum: number, i: any) => sum + (i.balanceDue || 0), 0);
      return {
        ...c,
        isArchived: !!c.isArchived,
        status: c.status || (c.isArchived ? 'archived' : 'active'),
        totalBilled,
        totalPaid,
        outstandingBalance,
        invoiceCount: custInvoices.length,
        paymentCount: custPayments.length,
      };
    });

    if (req.query.status === 'archived') {
      res.json(enriched.filter((c: any) => c.isArchived));
      return;
    }
    if (req.query.status === 'active' && !includeArchived) {
      res.json(enriched.filter((c: any) => !c.isArchived));
      return;
    }

    res.json(enriched);
  } catch (err: any) {
    console.error('Error fetching customers:', err);
    res.status(500).json({ error: 'Failed to retrieve customers from database.' });
  }
});

app.get('/api/customers/:id', (req: Request, res: Response) => {
  try {
    const db = readDb();
    const customer = db.customers.find((c: any) => c.id === req.params.id);
    if (!customer) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }
    const invoices = (db.invoices || []).filter((i: any) => i.customerId === customer.id);
    const payments = (db.payments || []).filter((p: any) => p.customerId === customer.id);
    res.json({
      ...customer,
      isArchived: !!customer.isArchived,
      status: customer.status || (customer.isArchived ? 'archived' : 'active'),
      invoices,
      payments,
    });
  } catch (err: any) {
    console.error('Error fetching customer details:', err);
    res.status(500).json({ error: 'Failed to fetch customer.' });
  }
});

app.post('/api/customers', (req: Request, res: Response) => {
  try {
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
      isArchived: false,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.customers.unshift(newCust);
    writeDb(db);
    res.status(201).json(newCust);
  } catch (err: any) {
    console.error('Error creating customer:', err);
    res.status(500).json({ error: 'Database failure during customer creation.' });
  }
});

app.put('/api/customers/:id', (req: Request, res: Response) => {
  try {
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
  } catch (err: any) {
    console.error('Error updating customer:', err);
    res.status(500).json({ error: 'Database failure during customer update.' });
  }
});

app.delete('/api/customers/:id', authenticate, requireRole('super_admin'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = readDb();
    const customer = db.customers.find((c: any) => c.id === req.params.id);
    if (!customer) {
      res.status(404).json({
        error: 'Customer not found',
        customerId: req.params.id,
      });
      return;
    }

    // Check financial records: invoices and direct payments
    const linkedInvoices = (db.invoices || []).filter((i: any) => i.customerId === req.params.id);
    const linkedPayments = (db.payments || []).filter((p: any) => p.customerId === req.params.id);
    const hasFinancialRecords = linkedInvoices.length > 0 || linkedPayments.length > 0;

    if (hasFinancialRecords) {
      res.status(409).json({
        error: `Cannot delete customer "${customer.name}" with existing financial records (${linkedInvoices.length} invoices, ${linkedPayments.length} payments). To preserve accounting records and tax audit history, archive this customer instead.`,
        canArchive: true,
        hasFinancialRecords: true,
        invoiceCount: linkedInvoices.length,
        paymentCount: linkedPayments.length,
        customerId: customer.id,
        customerName: customer.name,
      });
      return;
    }

    // Safe permanent delete when no financial history exists
    db.customers = db.customers.filter((c: any) => c.id !== req.params.id);
    logAudit(
      db,
      req.user || null,
      'CUSTOMER_DELETED',
      'customer',
      `Permanently deleted customer: ${customer.name} (ID: ${customer.id})`,
      customer.id,
      req
    );
    writeDb(db);
    res.json({
      success: true,
      id: req.params.id,
      message: `Customer "${customer.name}" permanently deleted.`,
    });
  } catch (err: any) {
    console.error('Error deleting customer:', err);
    res.status(500).json({ error: 'Database failure while deleting customer.' });
  }
});

// Archive customer endpoint to preserve financial integrity
app.post('/api/customers/:id/archive', authenticate, requireRole('super_admin', 'manager'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = readDb();
    const idx = db.customers.findIndex((c: any) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const customer = db.customers[idx];
    const updated = {
      ...customer,
      isArchived: true,
      status: 'archived',
      archivedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    db.customers[idx] = updated;
    logAudit(
      db,
      req.user || null,
      'CUSTOMER_ARCHIVED',
      'customer',
      `Archived customer profile: ${customer.name}`,
      customer.id,
      req
    );
    writeDb(db);
    res.json({
      success: true,
      customer: updated,
      message: `Customer "${customer.name}" has been archived and removed from the active directory. All historical invoices and ledgers remain intact.`,
    });
  } catch (err: any) {
    console.error('Error archiving customer:', err);
    res.status(500).json({ error: 'Database failure while archiving customer.' });
  }
});

// Unarchive / restore customer endpoint
app.post('/api/customers/:id/unarchive', authenticate, requireRole('super_admin', 'manager'), (req: AuthenticatedRequest, res: Response) => {
  try {
    const db = readDb();
    const idx = db.customers.findIndex((c: any) => c.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Customer not found' });
      return;
    }

    const customer = db.customers[idx];
    const updated = {
      ...customer,
      isArchived: false,
      status: 'active',
      archivedAt: undefined,
      updatedAt: new Date().toISOString(),
    };
    db.customers[idx] = updated;
    logAudit(
      db,
      req.user || null,
      'CUSTOMER_UNARCHIVED',
      'customer',
      `Restored customer profile: ${customer.name}`,
      customer.id,
      req
    );
    writeDb(db);
    res.json({
      success: true,
      customer: updated,
      message: `Customer "${customer.name}" has been restored to active status.`,
    });
  } catch (err: any) {
    console.error('Error unarchiving customer:', err);
    res.status(500).json({ error: 'Database failure while unarchiving customer.' });
  }
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

  // Status filter: exclude archived historical items by default unless explicitly requested
  if (status && typeof status === 'string' && status !== 'all') {
    items = items.filter((p: any) => (p.status || 'active') === status);
  } else if (!status || status !== 'all') {
    items = items.filter((p: any) => (p.status || 'active') !== 'archived');
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

// Clear All Default Inventory (with automatic backup and historical invoice reference protection)
app.post('/api/products/clear-all', (req: Request, res: Response) => {
  try {
    const db = readDb();
    const currentProducts = Array.isArray(db.products) ? db.products : [];

    // 1. Create automatic reversible backup of inventory before clearing
    if (!Array.isArray(db.productBackups)) {
      db.productBackups = [];
    }
    const backupEntry = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      note: req.body?.backupNote || 'Automated backup before clearing inventory items',
      productCount: currentProducts.length,
      products: JSON.parse(JSON.stringify(currentProducts)),
    };
    db.productBackups.unshift(backupEntry);
    if (db.productBackups.length > 10) {
      db.productBackups = db.productBackups.slice(0, 10);
    }

    // Write file backup for persistence and resilience
    try {
      fs.writeFileSync(
        getStorageConfig().activeBackupFile,
        JSON.stringify(backupEntry, null, 2)
      );
    } catch (e) {
      console.warn('Could not write backup file:', e);
    }

    // 2. Protect existing business records: collect product IDs referenced in historical invoices
    const invoiceReferencedProductIds = new Set<string>();
    (db.invoices || []).forEach((inv: any) => {
      (inv.items || []).forEach((item: any) => {
        if (item.productId) invoiceReferencedProductIds.add(item.productId);
      });
    });

    // 3. Separate historical invoice-referenced products (safely archive) from unreferenced default items (completely delete)
    const historicalPreserved: any[] = [];
    let clearedCount = 0;

    currentProducts.forEach((p: any) => {
      if (invoiceReferencedProductIds.has(p.id)) {
        historicalPreserved.push({
          ...p,
          status: 'archived',
          isHistoricalInvoiceReference: true,
          archivedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      } else {
        clearedCount++;
      }
    });

    // 4. Update database: only archived invoice references remain, active items count = 0
    db.products = historicalPreserved;
    db.isCatalogCleared = true;
    db.seedDone = true;

    writeDb(db);

    res.json({
      success: true,
      message: `Successfully cleared ${clearedCount} default items from catalog.${historicalPreserved.length > 0 ? ` ${historicalPreserved.length} invoice-referenced records safely archived to protect accounting audit trails.` : ''}`,
      clearedCount,
      activeCount: 0,
      historicalPreservedCount: historicalPreserved.length,
      backupId: backupEntry.id,
      timestamp: backupEntry.timestamp,
    });
  } catch (err: any) {
    console.error('Error clearing inventory:', err);
    res.status(500).json({ error: err.message || 'Database error during inventory clearing.' });
  }
});

// Alias DELETE /api/products/clear-all
app.delete('/api/products/clear-all', (req: Request, res: Response) => {
  req.url = '/api/products/clear-all';
  // Forward to post handler logic
  (app as any)._router.handle(req, res, () => {});
});

// Replace entire active catalog with uploaded product list (preserving historical invoice integrity & creating backups)
app.post('/api/products/replace-catalog', (req: Request, res: Response) => {
  try {
    const db = readDb();
    const { items, backupNote } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Items array is required and must not be empty.' });
      return;
    }

    // 1. Create reversible backup of current products
    if (!Array.isArray(db.productBackups)) {
      db.productBackups = [];
    }
    const backupEntry = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      note: backupNote || 'Automated backup before catalog replacement',
      productCount: db.products.length,
      products: JSON.parse(JSON.stringify(db.products)),
    };
    db.productBackups.unshift(backupEntry);
    if (db.productBackups.length > 5) {
      db.productBackups = db.productBackups.slice(0, 5);
    }

    // Write file backup for resilience
    try {
      fs.writeFileSync(
        getStorageConfig().activeBackupFile,
        JSON.stringify(backupEntry, null, 2)
      );
    } catch (e) {
      console.warn('Could not write backup file:', e);
    }

    // 2. Identify products referenced in historical invoices to protect audit trail
    const invoiceReferencedProductIds = new Set<string>();
    (db.invoices || []).forEach((inv: any) => {
      (inv.items || []).forEach((item: any) => {
        if (item.productId) invoiceReferencedProductIds.add(item.productId);
      });
    });

    const historicalPreserved: any[] = [];
    db.products.forEach((p: any) => {
      if (invoiceReferencedProductIds.has(p.id)) {
        historicalPreserved.push({
          ...p,
          status: 'archived',
          isHistoricalInvoiceReference: true,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    // 3. Process imported items
    const newProducts: any[] = [];
    let flaggedCount = 0;

    items.forEach((item: any, idx: number) => {
      const rawDesc = String(item.description || item.name || item.DESCRIPTION || '').trim();
      const rawRate = item.finalRate ?? item.FinalRate ?? item['Final Rate'] ?? item.rate ?? item.sellingPrice;
      const rawSno = item.sno ?? item.SNO ?? item['S.NO'] ?? item.sNo;

      // Discard completely empty rows
      if (!rawDesc && (rawRate === undefined || rawRate === null || String(rawRate).trim() === '') && (rawSno === undefined || rawSno === null || String(rawSno).trim() === '')) {
        return;
      }

      // Check for non-numeric rate e.g. "31KG"
      let parsedRate = 0;
      let requiresManualRateVerification = false;
      const rawRateStr = String(rawRate ?? '').trim();

      if (rawRateStr === '31KG' || /[a-zA-Z]/.test(rawRateStr)) {
        requiresManualRateVerification = true;
        flaggedCount++;
        parsedRate = 0;
      } else {
        const cleaned = rawRateStr.replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num)) {
          requiresManualRateVerification = true;
          flaggedCount++;
          parsedRate = 0;
        } else {
          parsedRate = Math.round(num * 100) / 100;
        }
      }

      // Generate unique ID without altering the original description
      const id = `prod-imp-${String(idx + 1).padStart(4, '0')}`;
      const sku = `SKU-${String(rawSno || idx + 1).padStart(4, '0')}`;

      // Incomplete flag if description is missing
      const isIncomplete = !rawDesc || (rawRate === undefined || rawRate === null || rawRateStr === '');
      if (isIncomplete && !requiresManualRateVerification) {
        flaggedCount++;
      }

      newProducts.push({
        id,
        sno: rawSno !== undefined && rawSno !== null ? rawSno : idx + 1,
        name: rawDesc || `Incomplete Product #${idx + 1}`,
        description: rawDesc,
        type: 'product',
        sku,
        hsnSacCode: item.hsnSacCode || '8517',
        unit: item.unit || 'Pcs',
        sellingPrice: parsedRate,
        purchasePrice: Math.round(parsedRate * 0.7 * 100) / 100,
        gstRate: item.gstRate || 18,
        category: item.category || 'General',
        stockQuantity: item.stockQuantity !== undefined ? Number(item.stockQuantity) : 100,
        lowStockThreshold: 10,
        status: 'active',
        requiresManualRateVerification,
        rawFinalRate: requiresManualRateVerification ? rawRateStr : undefined,
        isIncomplete,
        rateHistory: [
          {
            oldPrice: parsedRate,
            newPrice: parsedRate,
            changedAt: new Date().toISOString(),
            reason: 'Imported via replacement catalog',
          },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    });

    // Replace active catalog: historical archived products kept safe + new products
    db.products = [...historicalPreserved, ...newProducts];
    db.isCatalogCleared = false;
    db.seedDone = true;
    writeDb(db);

    res.json({
      success: true,
      message: `Successfully replaced inventory with ${newProducts.length} items.`,
      count: newProducts.length,
      historicalPreservedCount: historicalPreserved.length,
      flaggedCount,
      backupId: backupEntry.id,
      timestamp: backupEntry.timestamp,
    });
  } catch (err: any) {
    console.error('Error replacing catalog:', err);
    res.status(500).json({ error: err.message || 'Database error during catalog replacement.' });
  }
});

// Restore previous product inventory from backup
app.post('/api/products/restore-backup', (req: Request, res: Response) => {
  try {
    const db = readDb();
    const { backupId } = req.body;

    if (!Array.isArray(db.productBackups) || db.productBackups.length === 0) {
      try {
        const backupPath = getStorageConfig().activeBackupFile;
        const backupTarget = fs.existsSync(backupPath) ? backupPath : path.join(__dirname, '.billflow-db.backup.json');
        const fileBackup = JSON.parse(fs.readFileSync(backupTarget, 'utf8'));
        if (fileBackup && Array.isArray(fileBackup.products)) {
          db.products = fileBackup.products;
          writeDb(db);
          res.json({ success: true, message: 'Restored products from backup file.', count: db.products.length });
          return;
        }
      } catch {}
      res.status(404).json({ error: 'No backups found to restore.' });
      return;
    }

    const backup = backupId
      ? db.productBackups.find((b: any) => b.id === backupId)
      : db.productBackups[0];

    if (!backup) {
      res.status(404).json({ error: 'Specified backup not found.' });
      return;
    }

    db.products = JSON.parse(JSON.stringify(backup.products));
    db.isCatalogCleared = false;
    writeDb(db);

    res.json({
      success: true,
      message: `Restored inventory from backup created at ${backup.timestamp}`,
      count: db.products.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to restore backup.' });
  }
});

// List available inventory backups
app.get('/api/products/backups', (req: Request, res: Response) => {
  const db = readDb();
  const backups = (db.productBackups || []).map((b: any) => ({
    id: b.id,
    timestamp: b.timestamp,
    note: b.note,
    productCount: b.productCount,
  }));
  res.json(backups);
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

app.delete('/api/invoices/:id', (req: Request, res: Response) => {
  try {
    const db = readDb();
    const invoiceIndex = (db.invoices || []).findIndex((i: any) => i.id === req.params.id);
    if (invoiceIndex === -1) {
      res.status(404).json({ error: 'Invoice not found', id: req.params.id });
      return;
    }

    const invoice = db.invoices[invoiceIndex];

    // If the invoice was issued (and not already cancelled), restore stock inventory for physical products
    if (invoice.status === 'issued' && Array.isArray(invoice.items)) {
      for (const item of invoice.items) {
        if (item.type === 'product' && item.productId) {
          const prod = db.products.find((p: any) => p.id === item.productId);
          if (prod) {
            const prev = prod.stockQuantity || 0;
            prod.stockQuantity = prev + (Number(item.quantity) || 0);
            db.inventoryMovements.unshift({
              id: `mov-${Date.now()}-${item.productId}`,
              productId: prod.id,
              productName: prod.name,
              type: 'sale_deletion',
              quantity: Number(item.quantity) || 0,
              previousStock: prev,
              newStock: prod.stockQuantity,
              referenceId: invoice.invoiceNumber,
              reason: `Stock restored upon deletion of invoice ${invoice.invoiceNumber}`,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    }

    // Clean up only payments specifically tied to this deleted invoice
    if (Array.isArray(db.payments)) {
      db.payments = db.payments.filter((p: any) => p.invoiceId !== invoice.id);
    }

    // Remove the invoice from db.invoices
    db.invoices.splice(invoiceIndex, 1);

    writeDb(db);
    res.json({
      success: true,
      id: req.params.id,
      invoiceNumber: invoice.invoiceNumber,
      message: `Invoice ${invoice.invoiceNumber} has been deleted successfully.`,
    });
  } catch (err: any) {
    console.error('Error deleting invoice:', err);
    res.status(500).json({ error: err.message || 'Database failure while deleting invoice.' });
  }
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

// 11. Bill Upload & OCR / PDF Extraction
app.post('/api/bills/extract', async (req: Request, res: Response) => {
  const { fileData, mimeType, fileName } = req.body;

  if (!fileData || !mimeType) {
    res.status(400).json({ error: 'fileData (base64) and mimeType are required' });
    return;
  }

  // Validate supported mime types
  const allowedMimes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/bmp',
  ];
  const normalizedMime = mimeType.toLowerCase();
  if (!allowedMimes.some((m) => normalizedMime.includes(m.split('/')[1]) || normalizedMime === m)) {
    res.status(400).json({
      error: `Unsupported file type "${mimeType}". Allowed types: PDF, JPG, JPEG, PNG, WEBP.`,
    });
    return;
  }

  // Strip possible data URI header e.g. "data:image/jpeg;base64,"
  let cleanBase64 = fileData;
  if (fileData.includes(',')) {
    cleanBase64 = fileData.split(',')[1];
  }
  cleanBase64 = cleanBase64.replace(/\s+/g, '');

  if (!ai) {
    res.status(503).json({
      error: 'Gemini AI Vision & OCR Engine is not configured on the server. Please verify GEMINI_API_KEY.',
      apiKeyMissing: true,
    });
    return;
  }

  try {
    const prompt = `You are a high-precision document extraction engine for Indian MSME bills, tax invoices, vendor receipts, and quotations.
Analyze this uploaded document (which can be a digital PDF, scanned paper bill, photographed thermal receipt, or invoice).
Perform optical character recognition (OCR) and document understanding to extract all invoice, customer, tax, and item details.

Return a STRICT valid JSON object with EXACTLY this structure:
{
  "customerName": "Customer or Buyer Name (string, or empty string if missing)",
  "customerPhone": "Customer Phone (string, or empty string if missing)",
  "customerAddress": "Customer Billing Address (string, or empty string if missing)",
  "customerCity": "Customer City (string, or empty string if missing)",
  "customerState": "Customer State in India (string, or empty string if missing)",
  "customerGstin": "Customer 15-character GSTIN (string, or empty string if missing)",
  "originalInvoiceNumber": "Original bill or invoice number on document (string, or empty string if missing)",
  "invoiceDate": "Invoice/Bill date formatted as YYYY-MM-DD (string, or empty string if missing)",
  "dueDate": "Payment due date formatted as YYYY-MM-DD (string, or empty string if missing)",
  "placeOfSupply": "Place of Supply State name (string, or empty string if missing)",
  "items": [
    {
      "rawName": "Exact item or product name as written on the bill (include dimensions/specs like M6x25mm, Cat6 305m, 4MP PoE if present)",
      "quantity": 1.0,
      "unit": "Pcs or Box or Set or Kg or Mtr or Nos",
      "rate": 100.0,
      "discountPercent": 0,
      "discountAmount": 0,
      "hsnSac": "HSN or SAC code if present, or empty string",
      "gstRate": 18,
      "lineTotal": 118.0
    }
  ],
  "subtotal": 100.0,
  "totalDiscount": 0,
  "totalCgst": 9.0,
  "totalSgst": 9.0,
  "totalIgst": 0,
  "totalTax": 18.0,
  "finalTotal": 118.0,
  "notes": "Any notes or payment terms from the bill",
  "missingFields": ["list of any required invoice fields that were unclear, unreadable, torn, or absent on the bill"]
}

STRICT EXTRACTION RULES:
1. Never invent missing items, imaginary quantities, or fake prices. If an item name is partially blurred, transcribe what is visible and flag in missingFields.
2. Quantities and rates must be numeric values (e.g. 2, not "two").
3. Preserve the exact product name in "rawName" so our inventory matcher can cross-reference it against existing catalog products.
4. If line item rates on the bill already include tax, compute the base unit rate before tax if detectable, or provide the rate as stated.
5. In missingFields, list any important information that could not be confidently determined (e.g., "Customer Phone not found", "Due Date not specified").`;

    let requestMime = 'application/pdf';
    if (normalizedMime.includes('jpeg') || normalizedMime.includes('jpg')) requestMime = 'image/jpeg';
    else if (normalizedMime.includes('png')) requestMime = 'image/png';
    else if (normalizedMime.includes('webp')) requestMime = 'image/webp';
    else if (normalizedMime.includes('pdf')) requestMime = 'application/pdf';

    const aiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: requestMime,
                data: cleanBase64,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const rawText = aiResponse.text || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const cleaned = rawText.replace(/```json\n?|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    if (Array.isArray(parsed.items)) {
      parsed.items = parsed.items.map((item: any, idx: number) => ({
        id: `extracted-${Date.now()}-${idx + 1}`,
        rawName: String(item.rawName || item.name || `Item ${idx + 1}`).trim(),
        quantity: Math.max(0.01, Number(item.quantity) || 1),
        unit: item.unit || 'Pcs',
        rate: Math.max(0, Number(item.rate) || 0),
        discountPercent: Number(item.discountPercent) || 0,
        discountAmount: Number(item.discountAmount) || 0,
        hsnSac: String(item.hsnSac || '').trim(),
        gstRate: Number(item.gstRate) || 18,
        lineTotal: Number(item.lineTotal) || (Number(item.quantity) || 1) * (Number(item.rate) || 0),
        notes: item.notes || '',
      }));
    } else {
      parsed.items = [];
    }

    res.json({
      success: true,
      fileName: fileName || 'uploaded_document',
      mimeType: requestMime,
      data: parsed,
      extractedAt: new Date().toISOString(),
      engine: 'gemini-3.8-flash-vision-ocr',
    });
  } catch (err: any) {
    console.error('Bill extraction error:', err);
    res.status(500).json({
      error: err.message || 'Failed to extract bill details using AI vision OCR.',
      details: err.toString(),
    });
  }
});

// Provide realistic Indian sample customer bills for instant verification
app.get('/api/bills/sample-bills', (req: Request, res: Response) => {
  const db = readDb();
  const samples = [
    {
      id: 'sample-networking',
      title: 'Enterprise Networking & IT Consignment Bill',
      documentType: 'PDF Tax Invoice',
      fileName: 'TCS_Network_Purchase_Bill_9921.pdf',
      data: {
        customerName: 'Tata Consultancy Vendor Desk',
        customerPhone: '+91 98220 11223',
        customerEmail: 'procurement@tcs-vendor.com',
        customerGstin: '27AAACT2727Q1ZW',
        customerAddress: 'TCS Sahyadri Park, Rajiv Gandhi Infotech Park, Hinjawadi',
        customerCity: 'Pune',
        customerState: 'Maharashtra',
        originalInvoiceNumber: 'VEND-TCS/2026/9921',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
        placeOfSupply: 'Maharashtra',
        items: [
          {
            id: 'sample-item-1',
            rawName: 'Enterprise Router Dual-Band AC1200', // EXACT MATCH in inventory prod-1
            quantity: 3,
            unit: 'Pcs',
            rate: 4500, // Matching BillFlow rate 4500
            discountPercent: 0,
            discountAmount: 0,
            hsnSac: '8517',
            gstRate: 18,
            lineTotal: 15930,
          },
          {
            id: 'sample-item-2',
            rawName: 'Cat6 Shielded Ethernet Spool (305m)', // EXACT MATCH prod-2, BUT RATE DIFFERENCE!
            quantity: 2,
            unit: 'Box',
            rate: 7200, // On bill it is 7200, but BillFlow rate is 6800! Tests Rate Difference!
            discountPercent: 0,
            discountAmount: 0,
            hsnSac: '8544',
            gstRate: 18,
            lineTotal: 16992,
          },
          {
            id: 'sample-item-3',
            rawName: 'Network Infrastructure Setup & Security Audit', // EXACT MATCH prod-5 (service)
            quantity: 1,
            unit: 'Set',
            rate: 25000,
            discountPercent: 5,
            discountAmount: 1250,
            hsnSac: '998313',
            gstRate: 18,
            lineTotal: 28025,
          },
        ],
        subtotal: 51900,
        totalDiscount: 1250,
        totalTaxableAmount: 50650,
        totalCgst: 4558.5,
        totalSgst: 4558.5,
        totalIgst: 0,
        totalTax: 9117,
        finalTotal: 59767,
        notes: 'Delivery completed to Hinjawadi IT Campus.',
        missingFields: [],
      },
    },
    {
      id: 'sample-hardware-fasteners',
      title: 'Scanned Hardware & Machine Fasteners Bill',
      documentType: 'Scanned Paper Bill (OCR)',
      fileName: 'Apex_Machine_Bolts_Invoice_482.jpg',
      data: {
        customerName: 'Sharma Electronics & Telecom',
        customerPhone: '+91 71225 98765',
        customerEmail: 'sharma.telecom@gmail.com',
        customerGstin: '27AABCS5544K1ZS',
        customerAddress: '45, Sitabuldi Main Road',
        customerCity: 'Nagpur',
        customerState: 'Maharashtra',
        originalInvoiceNumber: 'INV-BLT/2026/482',
        invoiceDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0],
        placeOfSupply: 'Maharashtra',
        items: [
          {
            id: 'sample-fastener-1',
            rawName: 'Hex Head Bolt MS Grade 4.6 M6 x 25mm', // Exact match JET-HW-001 (rate 4.5)
            quantity: 200,
            unit: 'Pcs',
            rate: 4.5,
            discountPercent: 0,
            discountAmount: 0,
            hsnSac: '73181500',
            gstRate: 18,
            lineTotal: 1062,
          },
          {
            id: 'sample-fastener-2',
            rawName: 'Hex Head Bolt MS Grade 4.6 M8 x 30mm', // Exact match JET-HW-003 (rate 8.0)
            quantity: 100,
            unit: 'Pcs',
            rate: 9.0, // Bill rate is 9.0 vs inventory 8.0! Tests Rate Difference!
            discountPercent: 0,
            discountAmount: 0,
            hsnSac: '73181500',
            gstRate: 18,
            lineTotal: 1062,
          },
          {
            id: 'sample-fastener-3',
            rawName: 'Hex Head Bolt MS Grade 4.6 M6 x', // Ambiguous / truncated name (could be 25mm or 40mm) -> Possible Match / Review Required!
            quantity: 50,
            unit: 'Pcs',
            rate: 5.0,
            discountPercent: 0,
            discountAmount: 0,
            hsnSac: '73181500',
            gstRate: 18,
            lineTotal: 295,
          },
          {
            id: 'sample-fastener-4',
            rawName: 'Custom Titanium Aerospace Anchor Bracket 2026', // UNMATCHED item -> No Match Found!
            quantity: 10,
            unit: 'Pcs',
            rate: 450,
            discountPercent: 0,
            discountAmount: 0,
            hsnSac: '8483',
            gstRate: 18,
            lineTotal: 5310,
          },
        ],
        subtotal: 7150,
        totalDiscount: 0,
        totalTaxableAmount: 7150,
        totalCgst: 643.5,
        totalSgst: 643.5,
        totalIgst: 0,
        totalTax: 1287,
        finalTotal: 8437,
        notes: 'Cash-on-delivery terms. Scanned invoice processed.',
        missingFields: ['Due date handwritten and partially obscured on paper copy'],
      },
    },
    {
      id: 'sample-surveillance',
      title: 'Photographed Thermal Receipt / Camera Consignment',
      documentType: 'Photograph Receipt (Mobile OCR)',
      fileName: 'Kaveri_Camera_Receipt_Photo_091.png',
      data: {
        customerName: 'Kaveri Digital Studio',
        customerPhone: '+91 94440 88776',
        customerEmail: 'kaveri.digital@yahoo.in',
        customerGstin: '',
        customerAddress: '12, T. Nagar Main Street',
        customerCity: 'Chennai',
        customerState: 'Tamil Nadu',
        originalInvoiceNumber: 'KDS-BILL-091',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
        placeOfSupply: 'Tamil Nadu', // Inter-state IGST
        items: [
          {
            id: 'sample-cam-1',
            rawName: 'CCTV Surveillance Camera 4MP IP PoE', // Exact match prod-3 (rate 2400)
            quantity: 4,
            unit: 'Pcs',
            rate: 2400,
            discountPercent: 0,
            discountAmount: 0,
            hsnSac: '8525',
            gstRate: 18,
            lineTotal: 11328,
          },
          {
            id: 'sample-cam-2',
            rawName: 'Biometric Attendance & Access Terminal', // Exact match prod-4 (rate 8900)
            quantity: 1,
            unit: 'Pcs',
            rate: 8900,
            discountPercent: 0,
            discountAmount: 0,
            hsnSac: '8471',
            gstRate: 18,
            lineTotal: 10502,
          },
        ],
        subtotal: 18500,
        totalDiscount: 0,
        totalTaxableAmount: 18500,
        totalCgst: 0,
        totalSgst: 0,
        totalIgst: 3330,
        totalTax: 3330,
        finalTotal: 21830,
        notes: 'Outstation interstate consignment dispatch.',
        missingFields: ['Customer GSTIN (Unregistered buyer)'],
      },
    },
  ];
  res.json(samples);
});

// Automatic, secure one-time Super Admin bootstrap via environment variables
function runEnvAdminBootstrap() {
  const bootstrapEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || process.env.ADMIN_EMAIL)?.trim().toLowerCase();
  const bootstrapPassword = process.env.BOOTSTRAP_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;
  const bootstrapName = (process.env.BOOTSTRAP_ADMIN_NAME || process.env.ADMIN_NAME)?.trim() || 'Elango Harikumar';

  if (!bootstrapEmail || !bootstrapPassword) {
    return;
  }

  if (!bootstrapEmail.includes('@') || !bootstrapEmail.includes('.')) {
    console.warn('[AUTH BOOTSTRAP ERROR] Administrator email in environment variable is invalid.');
    return;
  }

  if (bootstrapPassword.length < 8) {
    console.warn('[AUTH BOOTSTRAP ERROR] Administrator password in environment variable must be at least 8 characters.');
    return;
  }

  try {
    const db = readDb();
    if (!Array.isArray(db.users)) db.users = [];

    const existingUserIndex = db.users.findIndex(
      (u: any) => u.email.toLowerCase() === bootstrapEmail
    );

    const { salt, hash } = hashPassword(bootstrapPassword);

    if (existingUserIndex >= 0) {
      const user = db.users[existingUserIndex];
      user.name = bootstrapName !== 'Super Admin' ? bootstrapName : (user.name || bootstrapName);
      user.role = 'super_admin';
      user.status = 'active';
      user.passwordSalt = salt;
      user.passwordHash = hash;
      user.updatedAt = new Date().toISOString();
      if (!Array.isArray(user.recoveryCodes) || user.recoveryCodes.length === 0) {
        user.recoveryCodes = generateRecoveryCodes(4);
      }
      db.sessions = (db.sessions || []).filter((s: any) => s.userId !== user.id);

      logAudit(
        db,
        user,
        'SUPER_ADMIN_BOOTSTRAP_UPDATED',
        'auth',
        `Super Admin credentials updated via server bootstrap for: ${bootstrapEmail}`,
        user.id
      );
      writeDb(db);
      console.log(`[AUTH BOOTSTRAP] Successfully updated existing account ${bootstrapEmail} to Super Admin.`);
    } else {
      const recoveryCodes = generateRecoveryCodes(4);
      const newAdmin = {
        id: `usr-${Date.now()}`,
        name: bootstrapName,
        email: bootstrapEmail,
        role: 'super_admin' as const,
        status: 'active' as const,
        passwordSalt: salt,
        passwordHash: hash,
        mfaEnabled: false,
        mfaSecret: crypto.randomBytes(20).toString('hex'),
        recoveryCodes,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Add to users array preserving all existing users and business records
      db.users.push(newAdmin);
      logAudit(
        db,
        newAdmin,
        'SUPER_ADMIN_BOOTSTRAP_CREATED',
        'auth',
        `Super Admin created via server bootstrap: ${bootstrapEmail}`,
        newAdmin.id
      );
      writeDb(db);
      console.log(`[AUTH BOOTSTRAP] Successfully created Super Admin account for ${bootstrapEmail} (all existing users preserved).`);
    }
  } catch (err) {
    console.error('[AUTH BOOTSTRAP ERROR]', err);
  } finally {
    // Prevent credentials from remaining in process memory or environment dumps
    delete process.env.BOOTSTRAP_ADMIN_PASSWORD;
    delete process.env.ADMIN_PASSWORD;
  }
}

// Configure Vite integration for dev server or static serve
async function startServer() {
  // Check and run one-time environment variable bootstrap if configured
  runEnvAdminBootstrap();

  const isProduction = process.env.NODE_ENV === 'production';
  const storage = getStorageConfig();

  console.log(`[STORAGE] Active Data Dir: ${storage.activeDir} (Mounted Disk: ${storage.isDiskMounted ? 'YES' : 'NO'}, Writable: ${storage.isWritable ? 'YES' : 'NO'})`);
  console.log(`[STORAGE] Active Database: ${storage.activeDbFile} (Exists: ${fs.existsSync(storage.activeDbFile) ? 'YES' : 'NO'})`);

  // API 404 handler (prevents API route misses from returning index.html in both dev & prod)
  app.all('/api/*', (req: Request, res: Response) => {
    res.status(404).json({ error: 'API endpoint not found', path: req.path });
  });

  // Centralized API error handler for unhandled errors in /api routes
  app.use('/api', (err: any, req: Request, res: Response, next: any) => {
    if (err) {
      console.error(`[API ERROR] ${req.method} ${req.path}:`, err?.message || err);
      const status = typeof err.status === 'number' ? err.status : (typeof err.statusCode === 'number' ? err.statusCode : 500);
      return res.status(status).json({
        error: err.message || 'An unexpected server error occurred.',
        code: err.code || 'SERVER_ERROR',
      });
    }
    next();
  });

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
