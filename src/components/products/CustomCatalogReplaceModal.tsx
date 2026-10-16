import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { useBilling } from '../../context/BillingContext';
import { formatINR } from '../../utils/billing';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ShieldCheck,
  Clipboard,
  FileText,
  Search,
  Check,
  AlertCircle,
  HelpCircle,
  Layers,
  Sparkles,
  Download
} from 'lucide-react';

interface CustomCatalogReplaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export interface ParsedItemRow {
  sno: string | number;
  description: string;
  finalRateRaw: string;
  parsedRate: number;
  requiresManualVerification: boolean;
  isIncomplete: boolean;
  flags: string[];
}

export const CustomCatalogReplaceModal: React.FC<CustomCatalogReplaceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { replaceProductCatalog, restoreProductBackup, getProductBackups, addToast } = useBilling();

  const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedRows, setParsedRows] = useState<ParsedItemRow[]>([]);
  const [backups, setBackups] = useState<Array<{ id: string; timestamp: string; note: string; productCount: number }>>([]);
  const [activeTab, setActiveTab] = useState<'preview' | 'backups'>('preview');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'flagged' | 'valid'>('all');
  const [searchFilter, setSearchFilter] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadBackups();
    }
  }, [isOpen]);

  const loadBackups = async () => {
    try {
      const list = await getProductBackups();
      setBackups(list);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  // Parser for tabular text / CSV / TSV / Markdown tables
  const parseTableText = (text: string): ParsedItemRow[] => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith('|---') && !l.startsWith('==='));

    if (lines.length === 0) return [];

    let headerIndex = -1;
    let colSno = -1;
    let colDesc = -1;
    let colRate = -1;

    // Split line into cells (supporting pipes |, tabs \t, or commas ,)
    const splitLine = (line: string): string[] => {
      if (line.includes('|')) {
        let cells = line.split('|').map((c) => c.trim());
        if (line.startsWith('|')) cells.shift();
        if (line.endsWith('|')) cells.pop();
        return cells;
      }
      if (line.includes('\t')) {
        return line.split('\t').map((c) => c.trim());
      }
      // Simple CSV split (handling quotes)
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
      if (matches && matches.length >= 2) {
        return matches.map((m) => m.replace(/^"|"$/g, '').trim());
      }
      return line.split(',').map((c) => c.trim());
    };

    // Find header line
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const cells = splitLine(lines[i]);
      const lower = cells.map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ''));
      const snoIdx = lower.findIndex((c) => c === 'sno' || c === 'slno' || c === 'srno' || c === 'sn' || c === 'id');
      const descIdx = lower.findIndex((c) => c.includes('desc') || c === 'item' || c === 'product' || c === 'name');
      const rateIdx = lower.findIndex((c) => c.includes('finalrate') || c.includes('rate') || c.includes('price'));

      if (descIdx !== -1 && rateIdx !== -1) {
        headerIndex = i;
        colSno = snoIdx;
        colDesc = descIdx;
        colRate = rateIdx;
        break;
      }
    }

    const dataLines = headerIndex !== -1 ? lines.slice(headerIndex + 1) : lines;
    // Default indices if no explicit header found: 0=SNO, 1=DESCRIPTION, 2=Final Rate (or 0=DESCRIPTION, 1=Final Rate)
    const finalSnoIdx = colSno !== -1 ? colSno : 0;
    const finalDescIdx = colDesc !== -1 ? colDesc : 1;
    const finalRateIdx = colRate !== -1 ? colRate : 2;

    const results: ParsedItemRow[] = [];

    dataLines.forEach((line, idx) => {
      const cells = splitLine(line);
      if (cells.length === 0 || cells.every((c) => c === '')) {
        return; // Skip completely empty row
      }

      let snoVal: string | number = '';
      let descVal = '';
      let rateVal = '';

      if (cells.length >= 3) {
        snoVal = cells[finalSnoIdx] || `${idx + 1}`;
        descVal = cells[finalDescIdx] || '';
        rateVal = cells[finalRateIdx] || '';
      } else if (cells.length === 2) {
        // e.g. DESCRIPTION, Final Rate
        descVal = cells[0] || '';
        rateVal = cells[1] || '';
        snoVal = `${idx + 1}`;
      } else {
        descVal = cells[0] || '';
        snoVal = `${idx + 1}`;
      }

      // Check for completely empty row
      if (!descVal && !rateVal) {
        return;
      }

      const flags: string[] = [];
      let requiresManualVerification = false;
      let isIncomplete = false;
      let parsedRate = 0;

      // Rule: Check for non-numeric rate e.g. "31KG"
      const trimmedRate = rateVal.trim();
      if (trimmedRate === '31KG' || /[a-zA-Z]/.test(trimmedRate)) {
        requiresManualVerification = true;
        flags.push(`Rate "${trimmedRate}" contains units/text — manual verification required`);
      } else {
        const cleaned = trimmedRate.replace(/[^0-9.-]/g, '');
        const num = parseFloat(cleaned);
        if (isNaN(num) || trimmedRate === '') {
          requiresManualVerification = true;
          flags.push('Missing or invalid numerical rate');
        } else {
          parsedRate = Math.round(num * 100) / 100;
        }
      }

      // Rule: Incomplete row (blank serial or blank description)
      if (!descVal) {
        isIncomplete = true;
        flags.push('Missing product description');
      }
      if (snoVal === '' || snoVal === undefined || snoVal === null) {
        isIncomplete = true;
        flags.push('Blank serial number');
      }

      results.push({
        sno: snoVal,
        description: descVal,
        finalRateRaw: rateVal,
        parsedRate,
        requiresManualVerification,
        isIncomplete,
        flags,
      });
    });

    return results;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const text = String(evt.target?.result || '');
        const rows = parseTableText(text);
        setParsedRows(rows);
        if (rows.length === 0) {
          addToast('No product data rows found in file', 'error');
        } else {
          addToast(`Parsed ${rows.length} items from ${file.name}`, 'success');
        }
      };
      reader.readAsText(file);
    } else {
      // Excel .xlsx or .xls
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const bstr = evt.target?.result;
          const workbook = XLSX.read(bstr, { type: 'binary' });
          const firstSheet = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheet];
          const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          if (data.length === 0) {
            addToast('Spreadsheet contains no rows', 'error');
            return;
          }

          // Convert rows
          const rows: ParsedItemRow[] = data.map((row, idx) => {
            const rawSno = row['S.NO'] ?? row['SNO'] ?? row['S.No'] ?? row['Sl.No'] ?? row['sno'] ?? idx + 1;
            const rawDesc = String(
              row['DESCRIPTION'] ?? row['Description'] ?? row['Item Name'] ?? row['name'] ?? ''
            ).trim();
            const rawRate = String(
              row['Final Rate'] ?? row['FinalRate'] ?? row['FINAL RATE'] ?? row['Rate'] ?? row['Selling Rate'] ?? ''
            ).trim();

            const flags: string[] = [];
            let requiresManualVerification = false;
            let isIncomplete = false;
            let parsedRate = 0;

            if (rawRate === '31KG' || /[a-zA-Z]/.test(rawRate)) {
              requiresManualVerification = true;
              flags.push(`Rate "${rawRate}" contains units/text — manual verification required`);
            } else {
              const cleaned = rawRate.replace(/[^0-9.-]/g, '');
              const num = parseFloat(cleaned);
              if (isNaN(num) || rawRate === '') {
                requiresManualVerification = true;
                flags.push('Missing or invalid numeric rate');
              } else {
                parsedRate = Math.round(num * 100) / 100;
              }
            }

            if (!rawDesc) {
              isIncomplete = true;
              flags.push('Missing product description');
            }

            return {
              sno: rawSno,
              description: rawDesc,
              finalRateRaw: rawRate,
              parsedRate,
              requiresManualVerification,
              isIncomplete,
              flags,
            };
          });

          setParsedRows(rows);
          addToast(`Successfully parsed ${rows.length} items from ${file.name}`, 'success');
        } catch (err: any) {
          addToast(`Failed to parse Excel file: ${err.message}`, 'error');
        }
      };
      reader.readAsBinaryString(file);
    }
  };

  const handleParsePastedText = () => {
    if (!pasteText.trim()) {
      addToast('Please paste a table or text containing S.NO, DESCRIPTION, Final Rate', 'error');
      return;
    }
    const rows = parseTableText(pasteText);
    setParsedRows(rows);
    if (rows.length === 0) {
      addToast('Could not find valid rows in pasted text', 'error');
    } else {
      addToast(`Parsed ${rows.length} rows successfully`, 'success');
    }
  };

  // Preload test dataset covering all user rules & edge cases
  const handleLoadSampleDataset = () => {
    const sampleTable = `| S.NO | DESCRIPTION | Final Rate |
| 1 | ISO 4014 - M12 x 1.75 - 60 Grade 8.8 Hex Bolt | 48.50 |
| 2 | ISO 4014 - M12 x 1.75 - 60 Grade 8.8 Hex Bolt | 48.50 |
| 3 | DIN 933-M8x30 SS304 Hexagon Head Machine Screw | 14.00 |
| 4 | DIN 933-M8x30 SS304 Hexagon Head Machine Screw | 14.00 |
| 5 | Industrial Heavy Duty Grease Cartridge 31KG | 31KG |
| 6 | Brass Ball Valve Full Bore Screwed 25mm (1 Inch) | 480.00 |
| 7 | High Tensile Socket Head Cap Screw M10 x 45mm | 26.50 |
| 8 | PVC Flexible Conduit Pipe 20mm Heavy (50 Mtr Roll) | 1250.00 |
| 9 | Stainless Steel Lock Nut Nyloc M12 DIN 985 | 8.20 |
| 10 | Mild Steel Plain Washer Heavy Duty M16 x 3mm | 3.40 |
| 11 | Industrial Safety Helmet Ratchet Suspension Yellow | 265.00 |
| 12 | Copper Lugs Heavy Duty Tubular Cable Terminal 70 sq.mm | 52.00 |
| 13 | Cat6 UTP 4-Pair Network Cable Reel (305 Metre) | 7400.00 |
| 14 | Biometric Attendance Time & Access Terminal Face/RFID | 9800.00 |
| 15 |  | 150.00 |
| 16 | Mild Steel Threaded Rod M16 x 1000mm Grade 4.6 | 145.00 |
| 17 | Teflon Thread Seal Tape 12mm x 10m High Density | 18.00 |
| 18 | MS Anchor Fastener Wedge Type M12 x 120mm | 38.00 |
| 19 | Fibre Optic Patch Cord SC-SC Simplex 3 Metre Singlemode | 185.00 |
| 20 | Handheld Digital Multimeter True RMS 600V CAT III | 1650.00 |`;

    setPasteText(sampleTable);
    const rows = parseTableText(sampleTable);
    setParsedRows(rows);
    setInputMode('paste');
    addToast('Loaded demonstration catalogue with 20 items (including 31KG rate verification & duplicate preservation)', 'info');
  };

  const handleUpdateRowRate = (index: number, newRateStr: string) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      target.finalRateRaw = newRateStr;
      const num = parseFloat(newRateStr.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) {
        target.parsedRate = num;
        target.requiresManualVerification = false;
        target.flags = target.flags.filter((f) => !f.includes('unit') && !f.includes('rate'));
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleUpdateRowDesc = (index: number, newDesc: string) => {
    setParsedRows((prev) => {
      const copy = [...prev];
      const target = { ...copy[index] };
      target.description = newDesc;
      if (newDesc.trim()) {
        target.isIncomplete = false;
        target.flags = target.flags.filter((f) => !f.includes('description'));
      }
      copy[index] = target;
      return copy;
    });
  };

  const handleExecuteReplace = async () => {
    if (parsedRows.length === 0) {
      addToast('No rows parsed to import', 'error');
      return;
    }

    const hasFlagged = parsedRows.some((r) => r.requiresManualVerification);
    if (hasFlagged) {
      const proceed = window.confirm(
        'Some items have non-numeric rates (such as "31KG"). They will be imported with an attention flag and 0 rate until verified in the catalog. Do you want to proceed?'
      );
      if (!proceed) return;
    }

    try {
      setIsSubmitting(true);
      const payload = parsedRows.map((r) => ({
        sno: r.sno,
        description: r.description,
        finalRate: r.requiresManualVerification ? r.finalRateRaw : r.parsedRate,
        rate: r.parsedRate,
      }));

      const res = await replaceProductCatalog(
        payload,
        `Catalog update from ${fileName || 'user table'} (${parsedRows.length} items)`
      );

      addToast(
        `Successfully replaced inventory! ${res.count} items active. ${res.historicalPreservedCount} invoice items archived safely.`,
        'success'
      );
      loadBackups();
      onClose();
    } catch (err: any) {
      addToast(err.message || 'Failed to replace inventory catalog', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestore = async (backupId: string) => {
    if (window.confirm('Restore inventory catalog to this previous snapshot? Current products will be reverted.')) {
      try {
        setIsSubmitting(true);
        await restoreProductBackup(backupId);
        addToast('Inventory restored successfully from backup', 'success');
        onClose();
      } catch (err: any) {
        addToast(err.message || 'Failed to restore backup', 'error');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const filteredPreview = parsedRows.filter((r) => {
    if (filterType === 'flagged') {
      if (!r.requiresManualVerification && !r.isIncomplete) return false;
    } else if (filterType === 'valid') {
      if (r.requiresManualVerification || r.isIncomplete) return false;
    }

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      return (
        String(r.sno).toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.finalRateRaw.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const totalFlagged = parsedRows.filter((r) => r.requiresManualVerification || r.isIncomplete).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-5xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden text-xs">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight flex items-center gap-2">
                Update &amp; Replace Inventory from Product List
                <span className="px-2 py-0.5 rounded text-[10px] bg-teal-500/20 text-teal-300 font-mono">
                  S.NO | DESCRIPTION | Final Rate
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Replaces demo items with authoritative product records, safeguards historical invoices, and verifies non-numeric rates.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab(activeTab === 'preview' ? 'backups' : 'preview')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold border transition-colors flex items-center gap-1.5 ${
                activeTab === 'backups'
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Backups ({backups.length})</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        {activeTab === 'preview' ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Input Options Bar */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInputMode('upload')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    inputMode === 'upload'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File (.xlsx / .csv)</span>
                </button>

                <button
                  onClick={() => setInputMode('paste')}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    inputMode === 'paste'
                      ? 'bg-teal-600 text-white shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  <span>Paste Table / Text</span>
                </button>

                <button
                  type="button"
                  onClick={handleLoadSampleDataset}
                  className="px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                  title="Loads 20 products demonstrating 31KG verification, part numbers, and duplicates"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Load Uploaded Inventory Sample</span>
                </button>
              </div>

              {parsedRows.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-slate-500 font-mono">
                    Total: <strong className="text-slate-800 dark:text-slate-200">{parsedRows.length}</strong>
                  </span>
                  {totalFlagged > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {totalFlagged} Require Review
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Input Details */}
            {parsedRows.length === 0 ? (
              <div className="p-6 flex-1 flex flex-col items-center justify-center space-y-4 text-center">
                {inputMode === 'upload' ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full max-w-lg border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 rounded-xl p-8 cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx, .xls, .csv, .txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Select or drop your Product List file
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1 font-mono">
                        Supports columns: S.NO | DESCRIPTION | Final Rate
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-2xl space-y-3 text-left">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Paste table data directly (supports Markdown, TSV, or comma-separated rows):
                    </label>
                    <textarea
                      rows={8}
                      value={pasteText}
                      onChange={(e) => setPasteText(e.target.value)}
                      placeholder="S.NO	DESCRIPTION	Final Rate
1	ISO 4014 - M12 x 1.75 - 60	48.50
2	DIN 933-M8x30 Hex Screw	14.00
3	Grease Drum 31KG	31KG"
                      className="w-full p-3 font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleParsePastedText}
                        className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm"
                      >
                        Parse Pasted Rows
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Review & Mapping Table */
              <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-3">
                {/* Search & Filter subheader */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Search parsed items..."
                        className="pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 w-48 sm:w-64"
                      />
                    </div>

                    <div className="flex items-center p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-semibold">
                      <button
                        onClick={() => setFilterType('all')}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          filterType === 'all'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        All ({parsedRows.length})
                      </button>
                      <button
                        onClick={() => setFilterType('flagged')}
                        className={`px-2.5 py-1 rounded transition-colors flex items-center gap-1 ${
                          filterType === 'flagged'
                            ? 'bg-amber-500 text-white shadow-sm'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        Needs Review ({totalFlagged})
                      </button>
                      <button
                        onClick={() => setFilterType('valid')}
                        className={`px-2.5 py-1 rounded transition-colors ${
                          filterType === 'valid'
                            ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                            : 'text-slate-500'
                        }`}
                      >
                        Valid ({parsedRows.length - totalFlagged})
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setParsedRows([]);
                      setPasteText('');
                      setFileName('');
                    }}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                  >
                    Reset &amp; Upload Different File
                  </button>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-950 text-slate-600 dark:text-slate-400 font-mono text-[11px] sticky top-0 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3 w-16">S.NO</th>
                        <th className="py-2.5 px-3">DESCRIPTION (PRODUCT NAME)</th>
                        <th className="py-2.5 px-3 w-32">SOURCE RATE</th>
                        <th className="py-2.5 px-3 w-36">BILLFLOW RATE (₹)</th>
                        <th className="py-2.5 px-3 w-48">VALIDATION STATUS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                      {filteredPreview.map((row, idx) => {
                        const originalIdx = parsedRows.indexOf(row);
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                              row.requiresManualVerification || row.isIncomplete
                                ? 'bg-amber-50/40 dark:bg-amber-950/10'
                                : ''
                            }`}
                          >
                            {/* S.NO */}
                            <td className="py-2 px-3 text-slate-500">
                              {row.sno || '-'}
                            </td>

                            {/* DESCRIPTION */}
                            <td className="py-2 px-3 font-sans">
                              {row.isIncomplete && !row.description ? (
                                <input
                                  type="text"
                                  placeholder="Missing description - enter name"
                                  onChange={(e) => handleUpdateRowDesc(originalIdx, e.target.value)}
                                  className="w-full p-1 border border-amber-400 rounded bg-amber-50/50 dark:bg-slate-900 text-xs font-sans"
                                />
                              ) : (
                                <div className="font-medium text-slate-900 dark:text-slate-100">
                                  {row.description}
                                </div>
                              )}
                            </td>

                            {/* SOURCE RATE */}
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-400">
                              <span className={row.finalRateRaw === '31KG' ? 'font-bold text-amber-600' : ''}>
                                {row.finalRateRaw || '-'}
                              </span>
                            </td>

                            {/* BILLFLOW SELLING PRICE (EDITABLE IF FLAGGED) */}
                            <td className="py-2 px-3">
                              {row.requiresManualVerification ? (
                                <div className="flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={row.parsedRate > 0 ? row.parsedRate : ''}
                                    placeholder="Verify rate..."
                                    onChange={(e) => handleUpdateRowRate(originalIdx, e.target.value)}
                                    className="w-24 p-1 rounded border border-amber-400 dark:border-amber-600 bg-white dark:bg-slate-900 text-right text-xs font-bold text-amber-700 dark:text-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                  />
                                </div>
                              ) : (
                                <span className="font-bold text-slate-900 dark:text-slate-100">
                                  {formatINR(row.parsedRate)}
                                </span>
                              )}
                            </td>

                            {/* VALIDATION STATUS & FLAGS */}
                            <td className="py-2 px-3 font-sans">
                              {row.flags.length > 0 ? (
                                <div className="space-y-0.5">
                                  {row.flags.map((flag, fIdx) => (
                                    <div
                                      key={fIdx}
                                      className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-1"
                                    >
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      <span>{flag}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                  <Check className="w-3 h-3" />
                                  <span>Ready to import</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Audit & Data Protection Note */}
                <div className="p-3 rounded-lg bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" />
                  <div className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                    <p className="font-bold text-teal-900 dark:text-teal-200">
                      Audit Trail &amp; Invoice Protection Guarantee
                    </p>
                    <p>
                      Replacing the catalog removes default/demo products, creates an instant reversible backup, and automatically retains items referenced in historical invoices in an archived state so past customer invoices, tax audits, and receipts remain 100% intact.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Footer Actions */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <div className="flex items-center gap-3">
                {parsedRows.length > 0 && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleExecuteReplace}
                    className="px-4 py-2 rounded-lg font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-sm flex items-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {isSubmitting ? 'Replacing Catalog...' : `Replace Active Inventory (${parsedRows.length} Items)`}
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* BACKUPS VIEW */
          <div className="p-6 flex-1 overflow-y-auto space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-teal-500" />
                <span>Reversible Inventory Backups</span>
              </h3>
              <p className="text-[11px] text-slate-500">
                BillFlow automatically creates a safety snapshot before any bulk replacement. You can roll back anytime.
              </p>
            </div>

            {backups.length === 0 ? (
              <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-800 rounded-lg">
                No previous backups recorded yet. A backup is automatically created when you replace your catalog.
              </div>
            ) : (
              <div className="space-y-3">
                {backups.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-xs">
                        {b.note}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Saved at: {new Date(b.timestamp).toLocaleString()} | {b.productCount} items
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleRestore(b.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white transition-colors flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore Backup</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className="px-4 py-2 rounded-lg font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Back to Import
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
