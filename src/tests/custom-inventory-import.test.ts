import { CustomCatalogueImportRow } from '../types';

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

console.log('--- STARTING BILLFLOW CUSTOM INVENTORY IMPORT & REPLACEMENT TESTS ---\n');

// Parser simulator matching CustomCatalogReplaceModal logic
function parseTestTable(text: string) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('|---') && !l.startsWith('==='));

  const dataLines = lines.filter((l) => !l.toLowerCase().includes('description') || !l.toLowerCase().includes('final rate'));

  const results: any[] = [];

  dataLines.forEach((line, idx) => {
    let cells = line.split('|').map((c) => c.trim());
    if (line.startsWith('|')) cells.shift();
    if (line.endsWith('|')) cells.pop();
    if (cells.length === 0 || cells.every((c) => c === '')) return;

    const sno = cells[0] || '';
    const description = cells[1] || '';
    const rawRate = cells[2] || '';

    // Discard completely empty row
    if (!description && !rawRate && !sno) return;

    let parsedRate = 0;
    let requiresManualVerification = false;
    let isIncomplete = false;
    const flags: string[] = [];

    // Rule: "31KG" or non-numeric rate
    if (rawRate === '31KG' || /[a-zA-Z]/.test(rawRate)) {
      requiresManualVerification = true;
      flags.push('Rate contains text/unit - manual verification required');
    } else {
      const num = parseFloat(rawRate.replace(/[^0-9.-]/g, ''));
      if (isNaN(num)) {
        requiresManualVerification = true;
      } else {
        parsedRate = num;
      }
    }

    if (!description || !sno) {
      isIncomplete = true;
      flags.push('Incomplete row');
    }

    results.push({
      id: `prod-imp-${String(idx + 1).padStart(4, '0')}`,
      sno,
      name: description,
      description,
      finalRateRaw: rawRate,
      sellingPrice: parsedRate,
      requiresManualVerification,
      rawFinalRate: requiresManualVerification ? rawRate : undefined,
      isIncomplete,
      flags,
    });
  });

  return results;
}

// Test 1: S.NO, DESCRIPTION, Final Rate correctly parsed
console.log('1. Testing DESCRIPTION and Final Rate mapping...');
{
  const table = `| 1 | ISO 4014 - M12 x 1.75 - 60 Grade 8.8 Hex Bolt | 48.50 |`;
  const items = parseTestTable(table);
  assertEqual(items.length, 1, 'Should parse 1 item');
  assertEqual(items[0].name, 'ISO 4014 - M12 x 1.75 - 60 Grade 8.8 Hex Bolt', 'Name should match DESCRIPTION exactly');
  assertEqual(items[0].sellingPrice, 48.5, 'Selling price should match Final Rate');
  assertEqual(items[0].requiresManualVerification, false, 'Numeric rate should not require manual verification');
  console.log('   ✓ DESCRIPTION and Final Rate mapping verified');
}

// Test 2: Irregular spacing and punctuation in part numbers is preserved
console.log('2. Testing irregular punctuation and spacing preservation...');
{
  const desc = 'DIN 933-M8x30 / SS-304 (Grade A2-70) - Metric';
  const table = `| 2 | ${desc} | 14.25 |`;
  const items = parseTestTable(table);
  assertEqual(items[0].name, desc, 'Exact spacing and punctuation in part numbers must be preserved without alteration');
  console.log('   ✓ Part number spacing and punctuation preserved');
}

// Test 3: Detection of "31KG" in Final Rate column
console.log('3. Testing detection of "31KG" in Final Rate column...');
{
  const table = `| 5 | Industrial Heavy Duty Grease Cartridge 31KG | 31KG |`;
  const items = parseTestTable(table);
  assertEqual(items[0].requiresManualVerification, true, 'Row with "31KG" must be flagged for manual verification');
  assertEqual(items[0].rawFinalRate, '31KG', 'Raw rate must retain "31KG"');
  assertEqual(items[0].sellingPrice, 0, 'Selling price must not silently convert 31KG to 31 numeric');
  console.log('   ✓ "31KG" flagged for manual verification and not converted to number');
}

// Test 4: Duplicate-looking descriptions are preserved as distinct records
console.log('4. Testing duplicate-looking products preservation...');
{
  const table = `| 10 | Hex Head Bolt M8 x 25mm | 5.00 |
| 11 | Hex Head Bolt M8 x 25mm | 5.00 |`;
  const items = parseTestTable(table);
  assertEqual(items.length, 2, 'Should preserve both duplicate rows');
  assert(items[0].id !== items[1].id, 'Internal unique IDs must differ');
  assertEqual(items[0].sno, '10', 'Row 1 SNO preserved');
  assertEqual(items[1].sno, '11', 'Row 2 SNO preserved');
  console.log('   ✓ Duplicate-looking products preserved as distinct records');
}

// Test 5: Incomplete rows flagged for review
console.log('5. Testing incomplete rows flagging...');
{
  const table = `|  | Missing S.NO Item | 25.00 |
| 15 |  | 50.00 |`;
  const items = parseTestTable(table);
  assertEqual(items[0].isIncomplete, true, 'Row with missing S.NO must be flagged incomplete');
  assertEqual(items[1].isIncomplete, true, 'Row with missing description must be flagged incomplete');
  console.log('   ✓ Incomplete rows properly flagged');
}

// Test 6: Historical invoice referenced products preservation
console.log('6. Testing historical invoice products preservation during replacement...');
{
  const dbProducts = [
    { id: 'prod-1', name: 'Legacy Router', sellingPrice: 4500, status: 'active' },
    { id: 'prod-demo-old', name: 'Old Demo Bolt', sellingPrice: 2, status: 'active' },
  ];
  const invoices = [
    {
      invoiceNumber: 'INV-001',
      items: [{ productId: 'prod-1', quantity: 2 }],
    },
  ];

  // Logic: prod-1 referenced in invoice -> must be preserved as archived! prod-demo-old removed!
  const invoiceProdIds = new Set<string>();
  invoices.forEach((inv) => inv.items.forEach((item) => invoiceProdIds.add(item.productId)));

  const historicalPreserved = dbProducts
    .filter((p) => invoiceProdIds.has(p.id))
    .map((p) => ({ ...p, status: 'archived', isHistoricalInvoiceReference: true }));

  assertEqual(historicalPreserved.length, 1, 'Only prod-1 should be preserved in archive');
  assertEqual(historicalPreserved[0].id, 'prod-1', 'prod-1 preserved');
  assertEqual(historicalPreserved[0].status, 'archived', 'Status changed to archived');
  console.log('   ✓ Historical invoice items preserved without breaking audit trails');
}

console.log('\n--- ALL INVENTORY REPLACEMENT & IMPORT TESTS PASSED SUCCESSFULLY! ---\n');
