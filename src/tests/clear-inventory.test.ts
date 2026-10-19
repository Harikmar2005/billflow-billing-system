import fs from 'fs';
import path from 'path';

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

const BASE_URL = 'http://localhost:3000';

async function runClearInventoryTests() {
  console.log('--- STARTING BILLFLOW CLEAR INVENTORY VERIFICATION TESTS ---\n');

  // Step 0: Check initial state
  console.log('0. Checking initial application state...');
  const initialMetricsRes = await fetch(`${BASE_URL}/api/metrics`);
  const initialMetrics = await initialMetricsRes.json();
  const initialInvoicesRes = await fetch(`${BASE_URL}/api/invoices`);
  const initialInvoices = await initialInvoicesRes.json();
  const initialCustRes = await fetch(`${BASE_URL}/api/customers`);
  const initialCustomers = await initialCustRes.json();

  // If catalog is already cleared from a previous run, restore backup first to test clearing again
  if (initialMetrics.totalProducts === 0) {
    console.log('   Catalog was already empty. Restoring backup to test clearing cycle...');
    await fetch(`${BASE_URL}/api/products/restore-backup`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
  }

  const readyMetricsRes = await fetch(`${BASE_URL}/api/metrics`);
  const readyMetrics = await readyMetricsRes.json();
  console.log(`   Catalog ready for clear test: ${readyMetrics.totalProducts} products`);
  assert(readyMetrics.totalProducts > 0, 'Catalog should have products before clearing');
  assert(initialInvoices.length > 0, 'Initial invoices must exist to verify audit protection');

  // Step 1: Execute Clear All Inventory
  console.log('\n1. Testing Clear All Inventory execution (/api/products/clear-all)...');
  const clearRes = await fetch(`${BASE_URL}/api/products/clear-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ backupNote: 'Automated test backup before clearing inventory' }),
  });
  assert(clearRes.ok, `Clear endpoint should succeed: status ${clearRes.status}`);
  const clearData = await clearRes.json();
  console.log(`   Cleared result: removed ${clearData.clearedCount} default items, archived ${clearData.historicalPreservedCount} invoice items.`);
  assert(clearData.success === true, 'Clear response must indicate success');
  assert(clearData.clearedCount > 0, 'Should have cleared default items');
  assertEqual(clearData.activeCount, 0, 'Active products count must be 0 after clear');

  // Step 2: Verify active catalog returns 0 items
  console.log('\n2. Verifying active catalog and metrics count zero items...');
  const prodsRes = await fetch(`${BASE_URL}/api/products`);
  const prods = await prodsRes.json();
  assertEqual(prods.length, 0, 'Active catalog GET /api/products must return 0 items');

  const postMetricsRes = await fetch(`${BASE_URL}/api/metrics`);
  const postMetrics = await postMetricsRes.json();
  assertEqual(postMetrics.totalProducts, 0, 'Dashboard totalProducts metric must be 0');
  assertEqual(postMetrics.lowStockCount, 0, 'Dashboard lowStockCount metric must be 0');
  console.log('   ✓ Active products: 0, Dashboard metrics: 0');

  // Step 3: Verify automatic backup creation
  console.log('\n3. Verifying automatic snapshot backup was created...');
  const backupsRes = await fetch(`${BASE_URL}/api/products/backups`);
  const backups = await backupsRes.json();
  assert(Array.isArray(backups) && backups.length > 0, 'Backups list must contain at least 1 backup');
  console.log(`   ✓ Found backup: "${backups[0].note}" with ${backups[0].productCount} products saved`);

  // Step 4: Verify persistence - restarting / re-reading DB does NOT reseed default products
  console.log('\n4. Verifying persistence and prevention of auto-reseeding...');
  const dbFile = path.resolve('.billflow-db.json');
  const rawDb = JSON.parse(fs.readFileSync(dbFile, 'utf8'));
  assertEqual(rawDb.isCatalogCleared, true, 'db.isCatalogCleared must be true');
  assertEqual(rawDb.seedDone, true, 'db.seedDone must be true');

  // Simulate multiple fetches to ensure server does not reseed
  const reloadProdsRes = await fetch(`${BASE_URL}/api/products`);
  const reloadProds = await reloadProdsRes.json();
  assertEqual(reloadProds.length, 0, 'Reloading products must continue returning 0 items without reseeding');
  console.log('   ✓ Persisted empty catalog verified: no auto-reseeding occurred');

  // Step 5: Verify business data protection (invoices, customers, payments)
  console.log('\n5. Verifying business data protection (invoices, customers, payments)...');
  const checkInvoicesRes = await fetch(`${BASE_URL}/api/invoices`);
  const checkInvoices = await checkInvoicesRes.json();
  assertEqual(checkInvoices.length, initialInvoices.length, 'Invoices count must be 100% preserved');

  const checkCustRes = await fetch(`${BASE_URL}/api/customers`);
  const checkCust = await checkCustRes.json();
  assertEqual(checkCust.length, initialCustomers.length, 'Customers count must be 100% preserved');

  // Verify historical invoice items still have their description, quantity, price, tax
  const inv1 = checkInvoices[0];
  assert(inv1.items && inv1.items.length > 0, 'Invoice items must be preserved');
  assert(inv1.totalAmount > 0, 'Invoice totalAmount must be preserved');
  console.log(`   ✓ Invoices intact (${checkInvoices.length}), Customers intact (${checkCust.length}), financial totals intact`);

  // Step 6: Verify importing user's custom catalog into the cleared database
  console.log('\n6. Verifying subsequent catalog import into cleared inventory...');
  const sampleImportItems = [
    {
      sno: 1,
      description: 'Hex Head Bolt MS Grade 4.6 M6 x 25mm Half Thread Zinc Plated',
      finalRate: '3.50',
    },
    {
      sno: 2,
      description: 'Nylon Lock Nut SS 304 M8 DIN 985',
      finalRate: '6.20',
    },
    {
      sno: 3,
      description: 'Special Heavy Industrial Casting Part Batch X',
      finalRate: '31KG', // Non-numeric rate
    },
    {
      sno: 4,
      description: 'Spring Washer High Tensile B7 M10',
      finalRate: '4.80',
    },
  ];

  const replaceRes = await fetch(`${BASE_URL}/api/products/replace-catalog`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: sampleImportItems,
      backupNote: 'Import user catalog after clearing defaults',
    }),
  });
  assert(replaceRes.ok, 'Replace catalog endpoint must succeed');
  const replaceData = await replaceRes.json();
  console.log(`   Import result: imported ${replaceData.count} items (${replaceData.flaggedCount} flagged for review).`);
  assertEqual(replaceData.count, 4, 'Should import all 4 valid rows');
  assertEqual(replaceData.flaggedCount, 1, '31KG row should be flagged for manual review');

  // Verify newly imported items are active and searchable
  const newProdsRes = await fetch(`${BASE_URL}/api/products`);
  const newProds = await newProdsRes.json();
  assertEqual(newProds.length, 4, 'Active catalog should now have 4 items');

  const searchRes = await fetch(`${BASE_URL}/api/products/search?q=Nylon+Lock`);
  const searchItems = await searchRes.json();
  assert(searchItems.length > 0, 'Search should find imported Nylon Lock Nut');
  assertEqual(searchItems[0].sellingPrice, 6.2, 'Authoritative rate for Nylon Lock Nut should be 6.20');
  console.log('   ✓ Newly imported products active, authoritative rates populated, and searchable');

  // Step 7: Verify new invoice creation using newly imported catalog item
  console.log('\n7. Verifying invoice creation using newly imported catalog item...');
  const newInvoicePayload = {
    customerId: initialCustomers[0].id,
    customerName: initialCustomers[0].name,
    customerPhone: initialCustomers[0].phone,
    customerEmail: initialCustomers[0].email,
    customerGstin: initialCustomers[0].gstin || '',
    billingAddress: initialCustomers[0].billingAddress,
    placeOfSupply: initialCustomers[0].state || 'Maharashtra',
    placeOfSupplyCode: initialCustomers[0].stateCode || '27',
    isInterState: false,
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    items: [
      {
        id: `item-test-${Date.now()}`,
        productId: searchItems[0].id,
        productName: searchItems[0].name,
        type: 'product',
        hsnSac: searchItems[0].hsnSacCode || '8517',
        quantity: 50,
        unit: 'Pcs',
        unitPrice: searchItems[0].sellingPrice,
        discountPercent: 0,
        discountAmount: 0,
        isTaxInclusive: false,
        taxableAmount: 50 * searchItems[0].sellingPrice,
        gstRate: 18,
        cgstRate: 9,
        cgstAmount: Math.round(50 * searchItems[0].sellingPrice * 0.09 * 100) / 100,
        sgstRate: 9,
        sgstAmount: Math.round(50 * searchItems[0].sellingPrice * 0.09 * 100) / 100,
        igstRate: 0,
        igstAmount: 0,
        totalAmount: Math.round(50 * searchItems[0].sellingPrice * 1.18 * 100) / 100,
      },
    ],
    subtotal: 50 * searchItems[0].sellingPrice,
    totalDiscount: 0,
    totalTaxableAmount: 50 * searchItems[0].sellingPrice,
    totalCgst: Math.round(50 * searchItems[0].sellingPrice * 0.09 * 100) / 100,
    totalSgst: Math.round(50 * searchItems[0].sellingPrice * 0.09 * 100) / 100,
    totalIgst: 0,
    totalTax: Math.round(50 * searchItems[0].sellingPrice * 0.18 * 100) / 100,
    roundOff: 0,
    totalAmount: Math.round(50 * searchItems[0].sellingPrice * 1.18 * 100) / 100,
    amountPaid: 0,
    balanceDue: Math.round(50 * searchItems[0].sellingPrice * 1.18 * 100) / 100,
    status: 'issued',
  };

  const createInvRes = await fetch(`${BASE_URL}/api/invoices`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newInvoicePayload),
  });
  assert(createInvRes.ok, `Invoice creation should succeed: ${createInvRes.status}`);
  const createdInv = await createInvRes.json();
  console.log(`   ✓ New invoice ${createdInv.invoiceNumber} created using imported product rate (₹${searchItems[0].sellingPrice})`);

  console.log('\n--- ALL CLEAR INVENTORY & IMPORT WORKFLOW TESTS PASSED SUCCESSFULLY! ---');
}

runClearInventoryTests().catch((err) => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
