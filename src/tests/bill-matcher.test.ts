import { SEED_PRODUCTS_DATA } from '../data/seedCatalog';
import {
  matchExtractedItemToInventory,
  extractItemSpecifications,
  hasConflictingSpecs,
  updateMatchedItemRate,
  assignProductToMatchedItem,
} from '../utils/billMatcher';
import { Product, ExtractedBillItem } from '../types';

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

console.log('--- STARTING BILLFLOW INVENTORY MATCHER & SPECIFICATION TESTS ---\n');

// Prepare full product list
const mockInventory: Product[] = SEED_PRODUCTS_DATA.map((item, idx) => ({
  id: `prod-test-${idx + 1}`,
  ...item,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}));

// Test 1: Exact product match retrieves correct inventory item and rate
console.log('1. Testing exact product match and authoritative rate retrieval...');
{
  const extractedItem: ExtractedBillItem = {
    id: 'ext-1',
    rawName: 'Enterprise Router Dual-Band AC1200',
    quantity: 2,
    rate: 4500,
  };

  // Find router in inventory
  const routerProduct: Product = {
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
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const match = matchExtractedItemToInventory(extractedItem, [routerProduct, ...mockInventory]);
  assertEqual(match.matchStatus, 'exact', 'Match status should be exact');
  assertEqual(match.matchedProduct?.id, 'prod-1', 'Should match prod-1 router');
  assertEqual(match.inventoryRate, 4500, 'Inventory rate should be 4500');
  assertEqual(match.approvedRate, 4500, 'Approved rate defaults to inventory rate 4500');
  assertEqual(match.isResolved, true, 'Row is resolved for exact match');
  console.log('   ✓ Exact match and authoritative rate verified');
}

// Test 2: Dimensional collision prevention (M6 x 25mm MUST NEVER match M6 x 40mm)
console.log('2. Testing dimensional collision prevention (M6x25mm vs M6x40mm)...');
{
  const specs25 = extractItemSpecifications('Hex Head Bolt MS Grade 4.6 M6 x 25mm');
  const specs40 = extractItemSpecifications('Hex Head Bolt MS Grade 4.6 M6 x 40mm');

  assert(hasConflictingSpecs(specs25, specs40), 'Dimensions M6x25mm and M6x40mm must be detected as conflicting');

  const bolt25: Product = {
    id: 'bolt-25',
    name: 'Hex Head Bolt MS Grade 4.6 M6 x 25mm',
    type: 'product',
    sku: 'JET-HW-001',
    hsnSacCode: '73181500',
    description: '',
    unit: 'Pcs',
    sellingPrice: 4.5,
    purchasePrice: 2.8,
    gstRate: 18,
    stockQuantity: 1000,
    lowStockThreshold: 100,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const bolt40: Product = {
    id: 'bolt-40',
    name: 'Hex Head Bolt MS Grade 4.6 M6 x 40mm',
    type: 'product',
    sku: 'JET-HW-002',
    hsnSacCode: '73181500',
    description: '',
    unit: 'Pcs',
    sellingPrice: 5.5,
    purchasePrice: 3.2,
    gstRate: 18,
    stockQuantity: 1000,
    lowStockThreshold: 100,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const extracted25: ExtractedBillItem = {
    id: 'ext-bolt-25',
    rawName: 'Hex Head Bolt MS Grade 4.6 M6 x 25mm',
    quantity: 100,
    rate: 4.5,
  };

  // Searching in catalog that only contains bolt40 should NOT match bolt40!
  const mismatchResult = matchExtractedItemToInventory(extracted25, [bolt40]);
  assert(mismatchResult.matchedProduct?.id !== 'bolt-40', 'Must NEVER match M6x40mm when bill requested M6x25mm');
  assertEqual(mismatchResult.matchStatus, 'unmatched', 'Should be unmatched when only conflicting dimension is available');

  // Searching when bolt25 is present should match bolt25
  const matchResult = matchExtractedItemToInventory(extracted25, [bolt25, bolt40]);
  assertEqual(matchResult.matchedProduct?.id, 'bolt-25', 'Must correctly match bolt-25');
  console.log('   ✓ Dimensional collision prevention verified');
}

// Test 3: Rate difference detection and authoritative default
console.log('3. Testing rate difference detection and override options...');
{
  const cableProduct: Product = {
    id: 'prod-2',
    name: 'Cat6 Shielded Ethernet Spool (305m)',
    type: 'product',
    sku: 'CBL-CAT6-305',
    hsnSacCode: '8544',
    description: '',
    unit: 'Box',
    sellingPrice: 6800, // BillFlow predefined selling price is 6800
    purchasePrice: 4900,
    gstRate: 18,
    stockQuantity: 20,
    lowStockThreshold: 5,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Extracted item from bill lists 7200 (higher rate on bill)
  const extractedItem: ExtractedBillItem = {
    id: 'ext-cbl',
    rawName: 'Cat6 Shielded Ethernet Spool (305m)',
    quantity: 2,
    rate: 7200,
  };

  const match = matchExtractedItemToInventory(extractedItem, [cableProduct]);
  assertEqual(match.matchStatus, 'rate_diff', 'Status should be rate_diff');
  assertEqual(match.inventoryRate, 6800, 'Inventory rate must be 6800');
  assertEqual(match.billRate, 7200, 'Bill rate must be 7200');
  assertEqual(match.approvedRate, 6800, 'Default approved rate must be the authoritative inventory rate');
  assertEqual(match.selectedRateSource, 'inventory', 'Default rate source is inventory');

  // Test selecting bill rate
  const userApprovedBillRate = updateMatchedItemRate(match, 'bill');
  assertEqual(userApprovedBillRate.approvedRate, 7200, 'Approved rate switched to bill rate 7200');
  assertEqual(userApprovedBillRate.isPriceOverridden, true, 'Flagged as price overridden');

  // Test selecting custom rate
  const customRate = updateMatchedItemRate(match, 'custom', 7000);
  assertEqual(customRate.approvedRate, 7000, 'Approved rate set to custom 7000');
  assertEqual(customRate.isPriceOverridden, true, 'Flagged as price overridden');
  console.log('   ✓ Rate difference detection and selection options verified');
}

// Test 4: Ambiguous items requiring review
console.log('4. Testing ambiguous items requiring review...');
{
  const extractedTruncated: ExtractedBillItem = {
    id: 'ext-trunc',
    rawName: 'Hex Head Bolt MS Grade 4.6 M6', // No dimension specified (could be 25mm or 40mm)
    quantity: 50,
    rate: 5.0,
  };

  const bolt25: Product = {
    id: 'bolt-25',
    name: 'Hex Head Bolt MS Grade 4.6 M6 x 25mm',
    type: 'product',
    sku: 'JET-HW-001',
    hsnSacCode: '73181500',
    description: '',
    unit: 'Pcs',
    sellingPrice: 4.5,
    purchasePrice: 2.8,
    gstRate: 18,
    stockQuantity: 1000,
    lowStockThreshold: 100,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const bolt40: Product = {
    id: 'bolt-40',
    name: 'Hex Head Bolt MS Grade 4.6 M6 x 40mm',
    type: 'product',
    sku: 'JET-HW-002',
    hsnSacCode: '73181500',
    description: '',
    unit: 'Pcs',
    sellingPrice: 5.5,
    purchasePrice: 3.2,
    gstRate: 18,
    stockQuantity: 1000,
    lowStockThreshold: 100,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const match = matchExtractedItemToInventory(extractedTruncated, [bolt25, bolt40]);
  assertEqual(match.matchStatus, 'review', 'Must require manual review when multiple candidates match');
  assertEqual(match.matchedProduct, null, 'Must NOT auto-assign ambiguous candidate');
  assert(Boolean(match.candidateProducts && match.candidateProducts.length >= 2), 'Must provide candidates');

  // User manually assigns bolt25
  const resolved = assignProductToMatchedItem(match, bolt25, 'inventory');
  assertEqual(resolved.matchedProduct?.id, 'bolt-25', 'Manually resolved to bolt-25');
  assertEqual(resolved.isResolved, true, 'Item is now resolved');
  console.log('   ✓ Ambiguity handling and manual resolution verified');
}

// Test 5: Unmatched item handling
console.log('5. Testing completely unmatched item handling...');
{
  const unknownItem: ExtractedBillItem = {
    id: 'ext-unknown',
    rawName: 'Ultra High Voltage Quantum Stabilizer Tube Q900',
    quantity: 1,
    rate: 95000,
  };

  const match = matchExtractedItemToInventory(unknownItem, mockInventory);
  assertEqual(match.matchStatus, 'unmatched', 'Must be flagged as unmatched');
  assertEqual(match.matchedProduct, null, 'No product assigned');
  assertEqual(match.isResolved, false, 'Unmatched item is unresolved and blocks generation');
  console.log('   ✓ Unmatched item handling verified');
}

console.log('\n--- ALL 5 BILLFLOW INVENTORY MATCHER TESTS PASSED! ---');
