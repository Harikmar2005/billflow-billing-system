import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useBilling } from '../../context/BillingContext';
import { Product, GST_RATES, PRODUCT_UNITS } from '../../types';
import { formatINR } from '../../utils/billing';
import { SEED_PRODUCTS_DATA, getExpandedSeedCatalogue } from '../../data/seedCatalog';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle,
  AlertTriangle,
  Download,
  ArrowRight,
  Layers,
  RefreshCw,
  Info,
  Check
} from 'lucide-react';

interface ProductImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ColumnMapping {
  name: string;
  sku: string;
  description: string;
  hsnSacCode: string;
  sellingPrice: string;
  unit: string;
  gstRate: string;
  category: string;
  stockQuantity: string;
}

interface ParsedRow {
  rowNum: number;
  name: string;
  sku: string;
  description: string;
  hsnSacCode: string;
  sellingPrice: number;
  unit: string;
  gstRate: number;
  category: string;
  stockQuantity: number;
  status: 'new' | 'update' | 'invalid';
  existingProduct?: Product;
  errors: string[];
}

export const ProductImportModal: React.FC<ProductImportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { products, bulkImportProducts, addToast } = useBilling();

  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'result'>('upload');
  const [fileName, setFileName] = useState('');
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);

  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    name: '',
    sku: '',
    description: '',
    hsnSacCode: '',
    sellingPrice: '',
    unit: '',
    gstRate: '',
    category: '',
    stockQuantity: '',
  });

  const [updateExisting, setUpdateExisting] = useState(true);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [previewFilter, setPreviewFilter] = useState<'all' | 'new' | 'update' | 'invalid'>('all');

  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    totalProcessed: number;
    added: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: Array<{ row: number; item: string; error: string }>;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Auto-detect columns based on name similarity
  const autoDetectMapping = (headers: string[]): ColumnMapping => {
    const findHeader = (patterns: string[]): string => {
      for (const pattern of patterns) {
        const found = headers.find(
          (h) => h.toLowerCase().replace(/[^a-z0-9]/g, '') === pattern.toLowerCase().replace(/[^a-z0-9]/g, '')
        );
        if (found) return found;
      }
      for (const pattern of patterns) {
        const found = headers.find((h) => h.toLowerCase().includes(pattern.toLowerCase()));
        if (found) return found;
      }
      return '';
    };

    return {
      name: findHeader(['itemname', 'productname', 'name', 'item', 'title', 'description']),
      sku: findHeader(['itemcode', 'code', 'sku', 'productcode', 'itemid', 'partno']),
      description: findHeader(['description', 'details', 'specs', 'notes']),
      hsnSacCode: findHeader(['hsncode', 'hsn', 'sac', 'hsnsac', 'taxcode']),
      sellingPrice: findHeader(['sellingrate', 'rate', 'price', 'sellingprice', 'standardrate', 'unitprice', 'mrp']),
      unit: findHeader(['unit', 'uom', 'unitofmeasure']),
      gstRate: findHeader(['gstrate', 'gst%', 'gst', 'tax%', 'taxrate', 'vat']),
      category: findHeader(['category', 'group', 'productcategory', 'type']),
      stockQuantity: findHeader(['stockquantity', 'stock', 'quantity', 'qty', 'openingstock']),
    };
  };

  // Process selected file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary' });

        // First sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // Raw rows as array of objects
        const data: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (data.length === 0) {
          addToast('Spreadsheet contains no data rows', 'error');
          return;
        }

        // Extract header keys
        const headers = Object.keys(data[0] || {});
        setRawHeaders(headers);
        setRawRows(data);

        // Auto-detect mappings
        const detected = autoDetectMapping(headers);
        setColumnMapping(detected);

        // If 'name' is found, proceed to preview, otherwise mapping
        if (detected.name && detected.sellingPrice) {
          validateAndParse(data, detected);
          setStep('preview');
        } else {
          setStep('mapping');
        }
      } catch (err: any) {
        console.error('File parse error:', err);
        addToast(`Failed to parse file: ${err.message || 'Invalid format'}`, 'error');
      }
    };

    reader.readAsBinaryString(file);
  };

  // Validate and parse raw rows according to mapping
  const validateAndParse = (rows: any[], mapping: ColumnMapping) => {
    const existingBySku = new Map<string, Product>();
    const existingByName = new Map<string, Product>();

    products.forEach((p) => {
      if (p.sku) existingBySku.set(p.sku.toUpperCase().trim(), p);
      if (p.name) existingByName.set(p.name.toLowerCase().trim(), p);
    });

    const parsed: ParsedRow[] = rows.map((row, idx) => {
      const rowNum = idx + 1;
      const errors: string[] = [];

      const name = String(row[mapping.name] || '').trim();
      if (!name) {
        errors.push('Missing item name');
      }

      const rawRate = row[mapping.sellingPrice];
      let sellingPrice = parseFloat(String(rawRate || '').replace(/[^0-9.-]/g, ''));
      if (isNaN(sellingPrice) || sellingPrice < 0) {
        errors.push(`Invalid selling rate '${rawRate}'`);
        sellingPrice = 0;
      }

      let gstRate = parseFloat(String(row[mapping.gstRate] || '18').replace(/[^0-9.]/g, ''));
      if (isNaN(gstRate) || !GST_RATES.includes(gstRate)) {
        gstRate = 18; // default to 18% standard
      }

      const sku = String(row[mapping.sku] || `SKU-${1000 + rowNum}`).trim().toUpperCase();
      const hsnSacCode = String(row[mapping.hsnSacCode] || '8517').trim();
      const unit = String(row[mapping.unit] || 'Pcs').trim();
      const category = String(row[mapping.category] || 'General').trim();
      const description = String(row[mapping.description] || '').trim();
      const stockQuantity = parseInt(String(row[mapping.stockQuantity] || '50'), 10) || 0;

      // Duplicate detection by SKU or exact Name
      const match = existingBySku.get(sku) || existingByName.get(name.toLowerCase());

      let status: 'new' | 'update' | 'invalid' = 'new';
      if (errors.length > 0) {
        status = 'invalid';
      } else if (match) {
        status = 'update';
      }

      return {
        rowNum,
        name,
        sku,
        description,
        hsnSacCode,
        sellingPrice,
        unit,
        gstRate,
        category,
        stockQuantity,
        status,
        existingProduct: match,
        errors,
      };
    });

    setParsedRows(parsed);
  };

  const handleApplyMapping = () => {
    if (!columnMapping.name) {
      addToast('Please map the Item Name column', 'error');
      return;
    }
    if (!columnMapping.sellingPrice) {
      addToast('Please map the Selling Rate column', 'error');
      return;
    }
    validateAndParse(rawRows, columnMapping);
    setStep('preview');
  };

  // Perform bulk import
  const handleExecuteImport = async () => {
    try {
      setImporting(true);
      const validRows = parsedRows.filter((r) => r.status !== 'invalid');

      if (validRows.length === 0) {
        addToast('No valid rows available to import', 'error');
        return;
      }

      const payloadItems = validRows.map((r) => ({
        name: r.name,
        sku: r.sku,
        description: r.description,
        hsnSacCode: r.hsnSacCode,
        sellingPrice: r.sellingPrice,
        unit: r.unit,
        gstRate: r.gstRate,
        category: r.category,
        stockQuantity: r.stockQuantity,
      }));

      const res = await bulkImportProducts(payloadItems, updateExisting);
      setImportSummary({
        totalProcessed: parsedRows.length,
        added: res.summary.added,
        updated: res.summary.updated,
        skipped: res.summary.skipped,
        failed: res.summary.failed + parsedRows.filter((r) => r.status === 'invalid').length,
        errors: [
          ...parsedRows
            .filter((r) => r.status === 'invalid')
            .map((r) => ({ row: r.rowNum, item: r.name || 'Unnamed', error: r.errors.join('; ') })),
          ...(res.errors || []),
        ],
      });
      setStep('result');
    } catch (err: any) {
      addToast(err.message || 'Failed to complete import', 'error');
    } finally {
      setImporting(false);
    }
  };

  // Download 350+ Sample Spreadsheet for testing & template
  const handleDownloadSampleTemplate = (format: 'xlsx' | 'csv') => {
    const catalog = getExpandedSeedCatalogue();
    const rows = catalog.map((item, idx) => ({
      'Item Code': item.sku,
      'Item Name': item.name,
      'Description': item.description,
      'HSN Code': item.hsnSacCode,
      'Selling Rate': item.sellingPrice,
      'Unit': item.unit,
      'GST %': item.gstRate,
      'Category': item.category,
      'Stock': item.stockQuantity,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Product Master');

    if (format === 'xlsx') {
      XLSX.writeFile(workbook, 'BillFlow_Product_Catalogue_350_Items.xlsx');
      addToast('Downloaded 350+ items Excel template (.xlsx)', 'success');
    } else {
      XLSX.writeFile(workbook, 'BillFlow_Product_Catalogue_350_Items.csv', { bookType: 'csv' });
      addToast('Downloaded 350+ items CSV template (.csv)', 'success');
    }
  };

  // Download error report
  const handleDownloadErrorReport = () => {
    if (!importSummary?.errors || importSummary.errors.length === 0) return;

    const errorRows = importSummary.errors.map((e) => ({
      'Row Number': e.row,
      'Item Name / Description': e.item,
      'Validation Error': e.error,
    }));

    const worksheet = XLSX.utils.json_to_sheet(errorRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Import Errors');
    XLSX.writeFile(workbook, 'BillFlow_Import_Errors_Report.csv', { bookType: 'csv' });
    addToast('Downloaded Error Report (.csv)', 'info');
  };

  const filteredPreviewRows = parsedRows.filter((r) => {
    if (previewFilter === 'all') return true;
    return r.status === previewFilter;
  });

  const countNew = parsedRows.filter((r) => r.status === 'new').length;
  const countUpdate = parsedRows.filter((r) => r.status === 'update').length;
  const countInvalid = parsedRows.filter((r) => r.status === 'invalid').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">
                Import Product Master & Item Rates (Excel / CSV)
              </h2>
              <p className="text-[11px] text-slate-400">
                Upload 300+ item catalog with predefined rates, HSN codes, and duplicate detection
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* STEP 1: UPLOAD */}
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 rounded-xl p-8 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    Click to select or drop your Excel (.xlsx) or CSV file
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Supports 300+ items catalog with Item Code, Name, HSN, Predefined Rate, GST %
                  </p>
                </div>
              </div>

              {/* Sample Template Download Block */}
              <div className="p-4 rounded-lg bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-teal-800 dark:text-teal-300 text-xs flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5" />
                    Download Pre-Filled Sample Template (350+ Industrial Items)
                  </span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    Use our verified template containing 350+ commercial items, HSN codes, and standard rates to test importing immediately.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadSampleTemplate('xlsx')}
                    className="px-3 py-1.5 rounded text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm transition-colors"
                  >
                    Download .XLSX
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSampleTemplate('csv')}
                    className="px-3 py-1.5 rounded text-xs font-semibold border border-teal-600 text-teal-700 dark:text-teal-300 hover:bg-teal-100/50 dark:hover:bg-teal-900/40 transition-colors"
                  >
                    Download .CSV
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: COLUMN MAPPING */}
          {step === 'mapping' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    Map Columns from "{fileName}"
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Verify which spreadsheet headers match the Product Master fields.
                  </p>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Change File
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                {[
                  { key: 'name', label: 'Item Name *', required: true },
                  { key: 'sellingPrice', label: 'Predefined Selling Rate (₹) *', required: true },
                  { key: 'sku', label: 'Item Code / SKU (For duplicate matching)' },
                  { key: 'hsnSacCode', label: 'HSN / SAC Code' },
                  { key: 'unit', label: 'Unit of Measure (Pcs, Box, Kg...)' },
                  { key: 'gstRate', label: 'GST Percentage (0, 5, 12, 18, 28)' },
                  { key: 'category', label: 'Category' },
                  { key: 'description', label: 'Item Description' },
                  { key: 'stockQuantity', label: 'Stock Quantity' },
                ].map((col) => (
                  <div key={col.key} className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block">
                      {col.label}
                    </label>
                    <select
                      value={(columnMapping as any)[col.key]}
                      onChange={(e) =>
                        setColumnMapping({ ...columnMapping, [col.key]: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                    >
                      <option value="">-- Select Column --</option>
                      {rawHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('upload')}
                  className="px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleApplyMapping}
                  className="px-4 py-1.5 text-xs font-semibold rounded bg-teal-600 hover:bg-teal-700 text-white flex items-center gap-1.5"
                >
                  <span>Preview Imported Items</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: PREVIEW & DUPLICATE DETECTION */}
          {step === 'preview' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm flex items-center gap-2">
                    Import Preview & Validation
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {parsedRows.length} Total Rows
                    </span>
                  </h3>
                  <p className="text-slate-500 text-[11px]">
                    Review proposed item additions, rate updates, and validation checks before importing.
                  </p>
                </div>

                {/* Filter pills */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-md text-[11px] font-semibold">
                  <button
                    onClick={() => setPreviewFilter('all')}
                    className={`px-2 py-0.5 rounded ${
                      previewFilter === 'all'
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    All ({parsedRows.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('new')}
                    className={`px-2 py-0.5 rounded ${
                      previewFilter === 'new'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    New ({countNew})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('update')}
                    className={`px-2 py-0.5 rounded ${
                      previewFilter === 'update'
                        ? 'bg-white dark:bg-slate-700 text-amber-600 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Update ({countUpdate})
                  </button>
                  {countInvalid > 0 && (
                    <button
                      onClick={() => setPreviewFilter('invalid')}
                      className={`px-2 py-0.5 rounded ${
                        previewFilter === 'invalid'
                          ? 'bg-white dark:bg-slate-700 text-rose-600 shadow-sm'
                          : 'text-slate-500'
                      }`}
                    >
                      Invalid ({countInvalid})
                    </button>
                  )}
                </div>
              </div>

              {/* Duplicate Handling Policy */}
              <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-2">
                <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide block">
                  Duplicate Matching Policy (Matched by Item Code / SKU or Name):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className="flex items-start gap-2 p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={updateExisting}
                      onChange={() => setUpdateExisting(true)}
                      className="mt-0.5 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        Update Existing Product Rates
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Updates selling price and details when SKU matches; logs rate change in history.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 cursor-pointer">
                    <input
                      type="radio"
                      name="dupPolicy"
                      checked={!updateExisting}
                      onChange={() => setUpdateExisting(false)}
                      className="mt-0.5 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <span className="font-bold text-slate-900 dark:text-slate-100 block">
                        Skip Existing (Keep Current Rates)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Only import brand new items and protect existing catalog rates.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-x-auto max-h-72">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 sticky top-0 text-[10px] font-mono text-slate-600 dark:text-slate-300">
                    <tr>
                      <th className="p-2 w-12 text-center">Row</th>
                      <th className="p-2 w-24">Status</th>
                      <th className="p-2 w-28">Item Code</th>
                      <th className="p-2">Item Name</th>
                      <th className="p-2 w-36 text-right">Selling Rate</th>
                      <th className="p-2 w-20 text-center">HSN</th>
                      <th className="p-2 w-16">Unit</th>
                      <th className="p-2 w-16 text-center">GST %</th>
                      <th className="p-2 w-28">Category</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {filteredPreviewRows.slice(0, 100).map((r) => {
                      const isRateChange =
                        r.existingProduct &&
                        r.existingProduct.sellingPrice !== r.sellingPrice;

                      return (
                        <tr
                          key={r.rowNum}
                          className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                            r.status === 'invalid'
                              ? 'bg-rose-50/40 dark:bg-rose-950/20'
                              : r.status === 'update'
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : ''
                          }`}
                        >
                          <td className="p-2 text-center text-slate-400">{r.rowNum}</td>
                          <td className="p-2">
                            {r.status === 'new' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                NEW
                              </span>
                            )}
                            {r.status === 'update' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                {updateExisting ? 'UPDATE' : 'SKIP'}
                              </span>
                            )}
                            {r.status === 'invalid' && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                INVALID
                              </span>
                            )}
                          </td>
                          <td className="p-2 font-bold text-slate-800 dark:text-slate-200">
                            {r.sku}
                          </td>
                          <td className="p-2 font-sans font-medium text-slate-900 dark:text-slate-100">
                            <div>{r.name}</div>
                            {r.errors.length > 0 && (
                              <div className="text-[10px] text-rose-600 font-sans mt-0.5">
                                {r.errors.join(', ')}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <span className="font-bold text-teal-700 dark:text-teal-400">
                              {formatINR(r.sellingPrice)}
                            </span>
                            {isRateChange && (
                              <div className="text-[9.5px] text-amber-600 dark:text-amber-400">
                                was {formatINR(r.existingProduct?.sellingPrice)}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-center text-slate-500">{r.hsnSacCode}</td>
                          <td className="p-2 text-slate-600 dark:text-slate-400">{r.unit}</td>
                          <td className="p-2 text-center text-slate-600 dark:text-slate-400">
                            {r.gstRate}%
                          </td>
                          <td className="p-2 text-slate-500 font-sans truncate max-w-[120px]">
                            {r.category}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 100 && (
                <p className="text-[10px] text-slate-400 text-center">
                  Showing first 100 of {parsedRows.length} rows in preview.
                </p>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setStep('mapping')}
                  className="px-3 py-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Edit Column Mapping
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3 py-1.5 rounded text-slate-500 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    disabled={importing || countNew + countUpdate === 0}
                    className="px-4 py-1.5 rounded font-semibold bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white shadow-sm flex items-center gap-1.5"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Importing {parsedRows.length} Items...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          Confirm & Import ({countNew} New, {updateExisting ? countUpdate : 0} Updates)
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: IMPORT SUMMARY RESULT */}
          {step === 'result' && importSummary && (
            <div className="space-y-6 text-center py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Product Master Import Completed!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Catalogue items and predefined selling rates have been synchronized with the database.
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-center">
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total</span>
                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                    {importSummary.totalProcessed}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/30">
                  <span className="text-[10px] uppercase font-bold text-emerald-600 block">Added</span>
                  <span className="text-lg font-bold font-mono text-emerald-600">
                    {importSummary.added}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/30">
                  <span className="text-[10px] uppercase font-bold text-amber-600 block">Updated</span>
                  <span className="text-lg font-bold font-mono text-amber-600">
                    {importSummary.updated}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Skipped/Failed</span>
                  <span className="text-lg font-bold font-mono text-slate-600 dark:text-slate-400">
                    {importSummary.skipped + importSummary.failed}
                  </span>
                </div>
              </div>

              {/* Error report button if any failed */}
              {importSummary.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 max-w-md mx-auto text-left space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{importSummary.errors.length} rows had errors and were skipped</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadErrorReport}
                    className="w-full py-1.5 px-3 rounded bg-white dark:bg-slate-900 border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 hover:bg-rose-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Detailed Error Report (.csv)</span>
                  </button>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2 rounded-md font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                >
                  Done & View Catalogue
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
