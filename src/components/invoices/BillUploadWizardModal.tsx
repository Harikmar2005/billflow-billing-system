import React, { useState, useEffect, useRef } from 'react';
import { useBilling } from '../../context/BillingContext';
import {
  Customer,
  Product,
  ExtractedBillData,
  ExtractedBillItem,
  MatchedBillItem,
  InvoiceLineItem,
  SampleCustomerBill,
} from '../../types';
import { api } from '../../services/api';
import { formatINR, formatDate, calculateLineItem, calculateInvoiceSummary } from '../../utils/billing';
import {
  matchAllExtractedBillItems,
  updateMatchedItemRate,
  assignProductToMatchedItem,
} from '../../utils/billMatcher';
import {
  Upload,
  FileText,
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ArrowLeft,
  Search,
  Sparkles,
  RefreshCw,
  Eye,
  Trash2,
  AlertCircle,
  FileUp,
  Image as ImageIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Loader2,
  Building,
  UserCheck,
  UserPlus,
  HelpCircle,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';

interface BillUploadWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToManualEditor: (data: {
    customerId: string;
    placeOfSupply: string;
    placeOfSupplyCode: string;
    isInterState: boolean;
    items: InvoiceLineItem[];
    notes?: string;
  }) => void;
}

export const BillUploadWizardModal: React.FC<BillUploadWizardModalProps> = ({
  isOpen,
  onClose,
  onApplyToManualEditor,
}) => {
  const {
    customers,
    products,
    settings,
    createCustomer,
    createInvoice,
    setPreviewInvoice,
    setCurrentView,
    addToast,
    refreshAllData,
  } = useBilling();

  const businessState = settings?.state || 'Maharashtra';
  const businessStateCode = settings?.stateCode || '27';
  const prefix = settings?.invoicePrefix || 'BF/2026-27/';
  const nextNum = settings?.nextInvoiceNumber || 105;

  // Wizard Step: 1 | 2 | 3 | 4
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Upload state
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [fileMimeType, setFileMimeType] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [filePreviewUrl, setFilePreviewUrl] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractProgress, setExtractProgress] = useState<number>(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample Bills
  const [sampleBills, setSampleBills] = useState<SampleCustomerBill[]>([]);
  const [loadingSamples, setLoadingSamples] = useState<boolean>(false);

  // Step 2: Extracted Details State
  const [extractedData, setExtractedData] = useState<ExtractedBillData | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerGstin, setCustomerGstin] = useState<string>('');
  const [customerAddress, setCustomerAddress] = useState<string>('');
  const [placeOfSupply, setPlaceOfSupply] = useState<string>(businessState);
  const [originalInvoiceNo, setOriginalInvoiceNo] = useState<string>('');
  const [invoiceDate, setInvoiceDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerMatchReason, setCustomerMatchReason] = useState<string>('');
  const [isCreatingCustomer, setIsCreatingCustomer] = useState<boolean>(false);

  // Step 3: Product Matching State
  const [matchedItems, setMatchedItems] = useState<MatchedBillItem[]>([]);
  const [activeProductSelectRowId, setActiveProductSelectRowId] = useState<string | null>(null);
  const [productSearchQuery, setProductSearchQuery] = useState<string>('');
  const [customRateInputs, setCustomRateInputs] = useState<Record<string, number>>({});

  // Step 4: Preview State
  const [immediatePayment, setImmediatePayment] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<string>('upi');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [isFinalizing, setIsFinalizing] = useState<boolean>(false);

  // Fetch samples on open
  useEffect(() => {
    if (isOpen) {
      api.getSampleBills().then((samples) => {
        setSampleBills(samples);
      }).catch((e) => console.warn('Could not load sample bills:', e));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Inter-state tax condition based on selected place of supply
  const isInterState = placeOfSupply.toLowerCase() !== businessState.toLowerCase();

  // Step 1: File selection handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const processFile = (file: File) => {
    setUploadError(null);

    // Validate size: max 20MB
    const maxSize = 20 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError(`File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed size is 20MB.`);
      return;
    }

    // Validate type
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    const isImageOrPdf = validTypes.includes(file.type) || file.name.endsWith('.pdf') || /\.(jpe?g|png|webp)$/i.test(file.name);
    if (!isImageOrPdf) {
      setUploadError(`Unsupported format "${file.type || file.name}". Please upload a PDF, JPG, PNG, or Scanned receipt.`);
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setFileMimeType(file.type || (file.name.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'));

    // Create thumbnail preview
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreviewUrl(previewUrl);
    } else {
      setFilePreviewUrl('');
    }

    // Read base64
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setFileBase64(result);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileBase64('');
    setFileMimeType('');
    setFileName('');
    setFilePreviewUrl('');
    setUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Run Real AI OCR / PDF Extraction
  const handleStartExtraction = async () => {
    if (!fileBase64 || !fileMimeType) {
      setUploadError('Please choose or drop a bill file first.');
      return;
    }

    try {
      setIsExtracting(true);
      setUploadError(null);
      setExtractProgress(25);

      const progressTimer = setInterval(() => {
        setExtractProgress((prev) => (prev < 85 ? prev + 15 : prev));
      }, 500);

      const res = await api.extractBill(fileBase64, fileMimeType, fileName);
      clearInterval(progressTimer);
      setExtractProgress(100);

      populateExtractedBill(res.data);
      setCurrentStep(2);
      addToast(`Extracted bill details from "${fileName}"`, 'success');
    } catch (err: any) {
      console.error('Extraction error:', err);
      const errMsg = err?.data?.error || err?.message || 'Failed to extract bill details';
      setUploadError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setIsExtracting(false);
      setExtractProgress(0);
    }
  };

  // Instant Sample Bill Loader for Verification
  const handleLoadSampleBill = (sample: SampleCustomerBill) => {
    setSelectedFile(null);
    setFileName(sample.fileName);
    setFileMimeType(sample.fileName.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    setFilePreviewUrl('');
    populateExtractedBill(sample.data);
    setCurrentStep(2);
    addToast(`Loaded test bill: ${sample.title}`, 'info');
  };

  // Populate Step 2 & Step 3 from Extracted Data
  const populateExtractedBill = (data: ExtractedBillData) => {
    setExtractedData(data);
    setCustomerName(data.customerName || '');
    setCustomerPhone(data.customerPhone || '');
    setCustomerEmail(data.customerEmail || '');
    const cleanGstin = (data.customerGstin || '').toUpperCase().trim();
    setCustomerGstin(cleanGstin);
    setCustomerAddress(data.customerAddress || '');
    setOriginalInvoiceNo(data.originalInvoiceNumber || '');
    if (data.invoiceDate) setInvoiceDate(data.invoiceDate);
    if (data.dueDate) setDueDate(data.dueDate);

    const pos = data.placeOfSupply || data.customerState || businessState;
    setPlaceOfSupply(pos);

    // Customer Auto-Matching Logic (GSTIN -> Phone -> Exact Name)
    matchCustomer(data.customerName, cleanGstin, data.customerPhone);

    // Run authoritative inventory item matching
    const matched = matchAllExtractedBillItems(data.items || [], products);
    setMatchedItems(matched);
  };

  const matchCustomer = (name?: string, gstin?: string, phone?: string) => {
    let matchedCust: Customer | null = null;
    let reason = '';

    // Priority 1: Exact GSTIN match
    if (gstin && gstin.length >= 15) {
      matchedCust = customers.find((c) => c.gstin && c.gstin.toUpperCase() === gstin) || null;
      if (matchedCust) reason = `Matched by 15-digit GSTIN (${gstin})`;
    }

    // Priority 2: Phone number match (clean 10 digits)
    if (!matchedCust && phone) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-10);
      if (cleanPhone.length >= 10) {
        matchedCust = customers.find((c) => (c.phone || '').replace(/\D/g, '').slice(-10) === cleanPhone) || null;
        if (matchedCust) reason = `Matched by Phone (${phone})`;
      }
    }

    // Priority 3: Exact Customer Name
    if (!matchedCust && name) {
      const normName = name.trim().toLowerCase();
      matchedCust = customers.find((c) => c.name.trim().toLowerCase() === normName) || null;
      if (matchedCust) reason = `Matched by Registered Name (${matchedCust.name})`;
    }

    if (matchedCust) {
      setSelectedCustomerId(matchedCust.id);
      setCustomerMatchReason(reason);
      setCustomerName(matchedCust.name);
      if (matchedCust.gstin) setCustomerGstin(matchedCust.gstin);
      if (matchedCust.phone) setCustomerPhone(matchedCust.phone);
      if (matchedCust.billingAddress) setCustomerAddress(matchedCust.billingAddress);
      if (matchedCust.state) setPlaceOfSupply(matchedCust.state);
    } else {
      setSelectedCustomerId('');
      setCustomerMatchReason('New customer (not found in database)');
    }
  };

  // Quick Create New Customer from reviewed details
  const handleCreateCustomerFromExtracted = async () => {
    if (!customerName.trim()) {
      addToast('Customer Name is required', 'error');
      return;
    }

    try {
      setIsCreatingCustomer(true);
      const newCust = await createCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        email: customerEmail.trim(),
        billingAddress: customerAddress.trim(),
        city: extractedData?.customerCity || 'Mumbai',
        state: placeOfSupply,
        stateCode: '27',
        pincode: '',
        gstin: customerGstin.trim(),
      });
      setSelectedCustomerId(newCust.id);
      setCustomerMatchReason(`Created new customer profile for "${newCust.name}"`);
      addToast(`Customer "${newCust.name}" saved to database`, 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to create customer', 'error');
    } finally {
      setIsCreatingCustomer(false);
    }
  };

  // Step 3 Item Mapping Actions
  const handleRateSourceChange = (item: MatchedBillItem, source: 'inventory' | 'bill' | 'custom') => {
    const customVal = customRateInputs[item.id] ?? item.approvedRate;
    const updated = updateMatchedItemRate(item, source, customVal);
    setMatchedItems((prev) => prev.map((m) => (m.id === item.id ? updated : m)));
  };

  const handleCustomRateValueChange = (item: MatchedBillItem, val: number) => {
    setCustomRateInputs((prev) => ({ ...prev, [item.id]: val }));
    const updated = updateMatchedItemRate(item, 'custom', val);
    setMatchedItems((prev) => prev.map((m) => (m.id === item.id ? updated : m)));
  };

  const handleManualProductAssign = (item: MatchedBillItem, prod: Product) => {
    const updated = assignProductToMatchedItem(item, prod, item.selectedRateSource);
    setMatchedItems((prev) => prev.map((m) => (m.id === item.id ? updated : m)));
    setActiveProductSelectRowId(null);
    setProductSearchQuery('');
  };

  const handleQuantityChange = (itemId: string, newQty: number) => {
    const validQty = Math.max(0.01, newQty);
    setMatchedItems((prev) =>
      prev.map((m) => {
        if (m.id === itemId) {
          const lineTotal = Math.round(validQty * m.approvedRate * (1 - m.discountPercent / 100) * 100) / 100;
          return { ...m, quantity: validQty, lineTotal };
        }
        return m;
      })
    );
  };

  const handleRemoveMatchedRow = (itemId: string) => {
    if (matchedItems.length <= 1) {
      addToast('Invoice must have at least one line item', 'info');
      return;
    }
    setMatchedItems((prev) => prev.filter((m) => m.id !== itemId));
  };

  // Convert MatchedBillItem[] into verified InvoiceLineItem[] with full GST math
  const getPreparedInvoiceLineItems = (): InvoiceLineItem[] => {
    return matchedItems.map((item, idx) => {
      const calc = calculateLineItem(
        item.quantity,
        item.approvedRate,
        item.discountPercent,
        item.gstRate,
        false, // Standard B2B/B2C exclusive rate calculation
        isInterState
      );

      return {
        id: `item-gen-${Date.now()}-${idx + 1}`,
        productId: item.matchedProduct?.id || '',
        productName: item.matchedProduct ? item.matchedProduct.name : item.extractedItem.rawName,
        type: item.matchedProduct?.type || 'product',
        hsnSac: item.hsnSac || '8517',
        quantity: item.quantity,
        unit: item.unit || 'Pcs',
        unitPrice: item.approvedRate,
        standardPrice: item.inventoryRate,
        isPriceOverridden: item.isPriceOverridden,
        overrideReason: item.overrideReason,
        discountPercent: item.discountPercent,
        discountAmount: calc.discountAmount,
        isTaxInclusive: false,
        taxableAmount: calc.taxableAmount,
        gstRate: item.gstRate,
        cgstRate: calc.cgstRate,
        cgstAmount: calc.cgstAmount,
        sgstRate: calc.sgstRate,
        sgstAmount: calc.sgstAmount,
        igstRate: calc.igstRate,
        igstAmount: calc.igstAmount,
        totalAmount: calc.totalAmount,
      };
    });
  };

  // Check unresolved blocking criteria
  const unresolvedItems = matchedItems.filter((m) => !m.isResolved || !m.matchedProduct);
  const totalExtractedCount = matchedItems.length;
  const exactMatchCount = matchedItems.filter((m) => m.matchStatus === 'exact' && m.matchedProduct).length;
  const reviewCount = matchedItems.filter((m) => m.matchStatus === 'review' || (m.candidateProducts && m.candidateProducts.length > 0 && !m.matchedProduct)).length;
  const unmatchedCount = matchedItems.filter((m) => m.matchStatus === 'unmatched' || !m.matchedProduct).length;
  const rateDiffCount = matchedItems.filter((m) => Math.abs(m.billRate - m.inventoryRate) >= 0.01 && m.matchedProduct).length;

  // Invoice calculations for Step 4
  const preparedLineItems = getPreparedInvoiceLineItems();
  const summary = calculateInvoiceSummary(preparedLineItems, isInterState);

  // Step 4 Actions: Direct Finalize & Save
  const handleFinalizeAndGenerateInvoice = async () => {
    if (unresolvedItems.length > 0) {
      addToast(`Please map all ${unresolvedItems.length} unresolved line items before generating the invoice`, 'error');
      setCurrentStep(3);
      return;
    }

    let customer = customers.find((c) => c.id === selectedCustomerId);
    if (!customer) {
      // Auto-create or require customer
      if (customerName.trim()) {
        try {
          customer = await createCustomer({
            name: customerName.trim(),
            phone: customerPhone.trim(),
            email: customerEmail.trim(),
            billingAddress: customerAddress.trim(),
            city: extractedData?.customerCity || 'Mumbai',
            state: placeOfSupply,
            stateCode: '27',
            pincode: '',
            gstin: customerGstin.trim(),
          });
        } catch {
          addToast('Could not save customer profile. Please select an existing customer.', 'error');
          return;
        }
      } else {
        addToast('Please select or create a customer before generating invoice', 'error');
        setCurrentStep(2);
        return;
      }
    }

    try {
      setIsFinalizing(true);
      const invoicePayload = {
        invoiceNumber: `${prefix}${nextNum}`,
        customerId: customer.id,
        customerName: customer.name,
        customerGstin: customer.gstin || '',
        customerPhone: customer.phone || '',
        customerEmail: customer.email || '',
        billingAddress: customer.billingAddress || `${customer.city || ''}, ${customer.state || ''}`,
        placeOfSupply,
        placeOfSupplyCode: '27',
        isInterState,
        invoiceDate,
        dueDate,
        status: 'issued' as const,
        paymentStatus: immediatePayment >= summary.totalAmount ? ('paid' as const) : immediatePayment > 0 ? ('partially_paid' as const) : ('unpaid' as const),
        items: preparedLineItems,
        subtotal: summary.subtotal,
        totalDiscount: summary.totalDiscount,
        totalTaxableAmount: summary.totalTaxableAmount,
        totalCgst: summary.totalCgst,
        totalSgst: summary.totalSgst,
        totalIgst: summary.totalIgst,
        totalTax: summary.totalTax,
        roundOff: summary.roundOff,
        totalAmount: summary.totalAmount,
        amountPaid: immediatePayment,
        balanceDue: Math.max(0, summary.totalAmount - immediatePayment),
        notes: `Auto-generated from uploaded bill (${fileName || 'Customer Bill'}). ${originalInvoiceNo ? `Ref: ${originalInvoiceNo}` : ''}`,
        terms: settings?.defaultTerms || '1. Standard 1-year manufacturer warranty. 2. Subject to local jurisdiction.',
        paymentMethod: immediatePayment > 0 ? paymentMethod : undefined,
        paymentReference: immediatePayment > 0 ? paymentRef : undefined,
      };

      const created = await createInvoice(invoicePayload as any);
      addToast(`Invoice ${created.invoiceNumber} generated & stock deducted!`, 'success');
      setPreviewInvoice(created);
      onClose();
      setCurrentView('invoices');
    } catch (err: any) {
      console.error('Invoice generation error:', err);
      addToast(err.message || 'Failed to issue auto-generated invoice', 'error');
    } finally {
      setIsFinalizing(false);
    }
  };

  // Step 4 Alternative: Transfer into standard CreateInvoiceView manual editor
  const handleTransferToManualEditor = () => {
    if (unresolvedItems.length > 0) {
      addToast(`Please map all ${unresolvedItems.length} unresolved line items before generating the invoice`, 'error');
      setCurrentStep(3);
      return;
    }

    onApplyToManualEditor({
      customerId: selectedCustomerId,
      placeOfSupply,
      placeOfSupplyCode: '27',
      isInterState,
      items: preparedLineItems,
      notes: `Extracted from customer bill: ${fileName || 'Uploaded Bill'}. ${originalInvoiceNo ? `Ref: ${originalInvoiceNo}` : ''}`,
    });
    onClose();
    addToast('Extracted & verified items applied to invoice editor form', 'success');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-5xl rounded-2xl border border-teal-500/30 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-xs">
        {/* Header with Step Stepper */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-600 text-white shadow-md">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Upload Customer Bill & Auto-Generate Invoice
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-semibold border border-teal-300 dark:border-teal-800">
                    AI OCR + Inventory Matcher
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Extract customer bills, match line items against your 360+ inventory products, verify rates, and issue a compliant GST tax invoice.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Indicator */}
          <div className="grid grid-cols-4 gap-2 pt-1 font-sans">
            {[
              { num: 1, title: 'Upload Bill' },
              { num: 2, title: 'Review Details' },
              { num: 3, title: 'Match Products & Rates' },
              { num: 4, title: 'Preview & Generate' },
            ].map((step) => {
              const isCurrent = currentStep === step.num;
              const isCompleted = currentStep > step.num;
              return (
                <div
                  key={step.num}
                  onClick={() => {
                    if (isCompleted || (step.num === 3 && extractedData) || (step.num === 4 && matchedItems.length > 0)) {
                      setCurrentStep(step.num);
                    }
                  }}
                  className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${
                    isCurrent
                      ? 'border-teal-500 bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200 font-bold shadow-sm'
                      : isCompleted
                      ? 'border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      : 'border-slate-200 dark:border-slate-800 opacity-50 cursor-not-allowed text-slate-400'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCurrent
                        ? 'bg-teal-600 text-white'
                        : isCompleted
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {isCompleted ? <Check className="w-3 h-3" /> : step.num}
                  </div>
                  <span className="truncate hidden sm:inline text-xs">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ======================================================== */}
          {/* STEP 1: UPLOAD BILL */}
          {/* ======================================================== */}
          {currentStep === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Drag and Drop Zone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragActive
                    ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 scale-[1.01]'
                    : 'border-slate-300 dark:border-slate-700 hover:border-teal-400 bg-slate-50/50 dark:bg-slate-950/40'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bill-file-upload-input"
                />

                {!selectedFile ? (
                  <div className="space-y-3 py-4">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-600 dark:text-teal-400 shadow-inner">
                      <FileUp className="w-7 h-7" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        Drag and drop your customer bill here, or{' '}
                        <label
                          htmlFor="bill-file-upload-input"
                          className="text-teal-600 dark:text-teal-400 underline cursor-pointer hover:text-teal-700"
                        >
                          browse files
                        </label>
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supports PDF customer bills, JPG/PNG receipts, photographed paper bills & scanned invoices (up to 20MB).
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 pt-2 text-[11px] font-mono text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">.PDF</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">.JPG</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">.JPEG</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">.PNG</span>
                      <span className="px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800">Scanned OCR</span>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-2">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                      {filePreviewUrl ? (
                        <img
                          src={filePreviewUrl}
                          alt="Bill preview"
                          className="w-24 h-24 object-cover rounded-xl border border-slate-300 dark:border-slate-700 shadow-sm"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center justify-center text-rose-600 dark:text-rose-400">
                          <FileText className="w-10 h-10" />
                        </div>
                      )}

                      <div className="text-left space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{fileName}</span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold">
                            Ready
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-mono">
                          Size: {(selectedFile.size / 1024).toFixed(1)} KB • Type: {fileMimeType}
                        </p>
                        <div className="flex items-center gap-3 pt-1">
                          <label
                            htmlFor="bill-file-upload-input"
                            className="text-xs font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 cursor-pointer underline"
                          >
                            Replace File
                          </label>
                          <button
                            type="button"
                            onClick={handleRemoveFile}
                            className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 underline"
                          >
                            Remove File
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress indicator during extraction */}
                    {isExtracting && (
                      <div className="max-w-md mx-auto space-y-2 pt-2">
                        <div className="flex items-center justify-between text-xs text-teal-700 dark:text-teal-300 font-semibold">
                          <span className="flex items-center gap-1.5">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Extracting text, customer & line items with AI OCR...
                          </span>
                          <span className="font-mono">{extractProgress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-teal-500 to-indigo-500 transition-all duration-300"
                            style={{ width: `${extractProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Upload Error Banner */}
              {uploadError && (
                <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold">Extraction Failed</p>
                    <p className="mt-0.5">{uploadError}</p>
                  </div>
                </div>
              )}

              {/* Main Extraction CTA button */}
              {selectedFile && !isExtracting && (
                <div className="flex justify-center">
                  <button
                    onClick={handleStartExtraction}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 text-white font-bold text-sm shadow-lg shadow-teal-500/20 transition-all hover:scale-[1.02]"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Analyze & Extract Bill Details</span>
                  </button>
                </div>
              )}

              {/* Sample Customer Bills Section for Instant Verification */}
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-xs text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                      Or Instant Test with Pre-configured Sample Customer Bills:
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Try these realistic Indian customer bills to test exact matches, OCR review, rate difference detection, and invoice generation without searching for files.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {sampleBills.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => handleLoadSampleBill(s)}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500/60 bg-white dark:bg-slate-900 hover:bg-teal-50/40 dark:hover:bg-teal-950/20 text-left transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:text-teal-600">
                          {s.documentType}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                      <p className="font-bold text-xs text-slate-900 dark:text-slate-100 group-hover:text-teal-600 line-clamp-1">
                        {s.title}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5 font-mono">
                        {s.fileName} • {s.data.items.length} items
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 2: REVIEW EXTRACTED DETAILS */}
          {/* ======================================================== */}
          {currentStep === 2 && (
            <div className="space-y-6">
              {/* Top notification if missing fields */}
              {extractedData?.missingFields && extractedData.missingFields.length > 0 && (
                <div className="p-3.5 rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Missing or Unclear Fields Flagged for Verification</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                    {extractedData.missingFields.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Customer Verification Section */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                    <h3 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      Customer Identification & Matching
                    </h3>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      selectedCustomerId
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                    }`}
                  >
                    {customerMatchReason}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Tata Consultancy Services"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Customer GSTIN
                    </label>
                    <input
                      type="text"
                      value={customerGstin}
                      onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                      placeholder="27AABCA1234F1Z9"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Customer Phone
                    </label>
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98200 12345"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Billing Address
                    </label>
                    <input
                      type="text"
                      value={customerAddress}
                      onChange={(e) => setCustomerAddress(e.target.value)}
                      placeholder="Street, locality, city, pincode"
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Link Existing Database Customer
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSelectedCustomerId(id);
                        const c = customers.find((cust) => cust.id === id);
                        if (c) {
                          setCustomerName(c.name);
                          setCustomerGstin(c.gstin || '');
                          setCustomerPhone(c.phone || '');
                          setCustomerAddress(c.billingAddress || '');
                          setPlaceOfSupply(c.state || businessState);
                          setCustomerMatchReason(`Linked to existing: ${c.name}`);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                    >
                      <option value="">-- Choose Existing Customer --</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.gstin ? `(${c.gstin})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {!selectedCustomerId && customerName.trim() && (
                  <div className="flex items-center justify-between pt-2 text-[11px]">
                    <span className="text-slate-500">
                      Customer not in directory? Save this customer profile permanently for future billing:
                    </span>
                    <button
                      type="button"
                      onClick={handleCreateCustomerFromExtracted}
                      disabled={isCreatingCustomer}
                      className="px-3 py-1 rounded-md bg-teal-600 hover:bg-teal-700 text-white font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>{isCreatingCustomer ? 'Saving...' : 'Save as New Customer'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Invoice Meta Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Original Bill / Ref Number
                  </label>
                  <input
                    type="text"
                    value={originalInvoiceNo}
                    onChange={(e) => setOriginalInvoiceNo(e.target.value)}
                    placeholder="e.g. VEND-9921"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Bill / Invoice Date
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Place of Supply (GST)
                  </label>
                  <input
                    type="text"
                    value={placeOfSupply}
                    onChange={(e) => setPlaceOfSupply(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-medium"
                  />
                </div>
              </div>

              {/* Extracted items summary box */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Extracted Line Items ({matchedItems.length})
                  </span>
                  <span className="text-slate-500 font-mono">
                    All items will be matched against your authoritative 360+ item catalog in Step 3
                  </span>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-800/80 max-h-48 overflow-y-auto">
                  {matchedItems.map((m, i) => (
                    <div key={m.id} className="py-2 flex items-center justify-between gap-4 text-xs font-mono">
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-slate-400 text-[10px] w-4">{i + 1}.</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {m.extractedItem.rawName}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-slate-600 dark:text-slate-400">
                        <span>{m.quantity} {m.unit}</span>
                        <span>@ ₹{m.billRate.toFixed(2)}</span>
                        <span className="font-bold text-slate-900 dark:text-slate-100">₹{m.lineTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Upload</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-2 shadow-md"
                >
                  <span>Proceed to Match Products & Verify Rates</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 3: MATCH PRODUCTS AND VERIFY RATES */}
          {/* ======================================================== */}
          {currentStep === 3 && (
            <div className="space-y-5">
              {/* Matching KPI Summary Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                  <span className="text-[11px] text-slate-500 block">Total Items</span>
                  <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100">
                    {totalExtractedCount}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block font-medium">Exact Matches</span>
                  <span className="text-lg font-bold font-mono text-emerald-700 dark:text-emerald-400">
                    {exactMatchCount}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 block font-medium">Review Required</span>
                  <span className="text-lg font-bold font-mono text-amber-700 dark:text-amber-400">
                    {reviewCount}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20">
                  <span className="text-[11px] text-rose-700 dark:text-rose-400 block font-medium">No Match Found</span>
                  <span className="text-lg font-bold font-mono text-rose-700 dark:text-rose-400">
                    {unmatchedCount}
                  </span>
                </div>

                <div className="p-3 rounded-xl border border-sky-200 dark:border-sky-900/50 bg-sky-50/50 dark:bg-sky-950/20">
                  <span className="text-[11px] text-sky-700 dark:text-sky-400 block font-medium">Rate Differences</span>
                  <span className="text-lg font-bold font-mono text-sky-700 dark:text-sky-400">
                    {rateDiffCount}
                  </span>
                </div>
              </div>

              {/* Informational Guidance */}
              <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 text-teal-900 dark:text-teal-200 text-xs flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                  <span>
                    <strong>Authoritative Rate Rule:</strong> Existing BillFlow inventory rates are populated by default. Mismatched rates are highlighted and can be approved or overridden below.
                  </span>
                </span>
                <span className="font-mono text-[11px] font-semibold text-teal-700 dark:text-teal-300">
                  Inventory: 360+ Products
                </span>
              </div>

              {/* Mapping Table */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[900px]">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 font-semibold font-mono text-[11px] border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-3">ITEM ON BILL</th>
                      <th className="py-3 px-3">MATCHED INVENTORY PRODUCT</th>
                      <th className="py-3 px-3 text-center">MATCH STATUS</th>
                      <th className="py-3 px-3 text-center">QTY</th>
                      <th className="py-3 px-3 text-right">BILL RATE</th>
                      <th className="py-3 px-3 text-right">INVENTORY RATE</th>
                      <th className="py-3 px-3 text-center">RATE TO USE</th>
                      <th className="py-3 px-3 text-right">LINE TOTAL (₹)</th>
                      <th className="py-3 px-3 text-center">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                    {matchedItems.map((item, idx) => {
                      const hasRateDiff = item.matchedProduct && Math.abs(item.billRate - item.inventoryRate) >= 0.01;
                      const isRowUnresolved = !item.matchedProduct || item.matchStatus === 'unmatched';

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors ${
                            isRowUnresolved
                              ? 'bg-rose-50/40 dark:bg-rose-950/20'
                              : hasRateDiff
                              ? 'bg-amber-50/30 dark:bg-amber-950/10'
                              : ''
                          }`}
                        >
                          {/* 1. Item Name from uploaded bill */}
                          <td className="py-3 px-3 font-sans max-w-[200px]">
                            <div className="font-semibold text-slate-900 dark:text-slate-100 truncate" title={item.extractedItem.rawName}>
                              {item.extractedItem.rawName}
                            </div>
                            {item.extractedItem.hsnSac && (
                              <span className="font-mono text-[10px] text-slate-400">
                                HSN: {item.extractedItem.hsnSac}
                              </span>
                            )}
                          </td>

                          {/* 2. Matched Inventory Product */}
                          <td className="py-3 px-3 font-sans">
                            {item.matchedProduct ? (
                              <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                  <span className="truncate max-w-[240px]">{item.matchedProduct.name}</span>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                                  <span>SKU: {item.matchedProduct.sku}</span>
                                  <span>•</span>
                                  <span>Stock: {item.matchedProduct.stockQuantity} {item.matchedProduct.unit}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1 text-[11px]">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  Not Linked to Inventory
                                </span>
                                {item.candidateProducts && item.candidateProducts.length > 0 && (
                                  <div className="flex flex-wrap gap-1">
                                    {item.candidateProducts.slice(0, 2).map((cand) => (
                                      <button
                                        key={cand.id}
                                        type="button"
                                        onClick={() => handleManualProductAssign(item, cand)}
                                        className="text-[10px] font-sans px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-200"
                                      >
                                        Use: {cand.name.slice(0, 22)}...
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Searchable dropdown picker toggle */}
                            {activeProductSelectRowId === item.id && (
                              <div className="mt-2 p-2.5 rounded-xl border border-teal-500 bg-white dark:bg-slate-950 shadow-xl space-y-2 z-20">
                                <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                                  <Search className="w-3.5 h-3.5 text-slate-400" />
                                  <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search 360+ catalog products by name, SKU, or HSN..."
                                    value={productSearchQuery}
                                    onChange={(e) => setProductSearchQuery(e.target.value)}
                                    className="w-full bg-transparent text-xs outline-none"
                                  />
                                </div>

                                <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-[11px]">
                                  {products
                                    .filter((p) => {
                                      const q = productSearchQuery.toLowerCase();
                                      return (
                                        !q ||
                                        p.name.toLowerCase().includes(q) ||
                                        p.sku.toLowerCase().includes(q) ||
                                        p.hsnSacCode.includes(q)
                                      );
                                    })
                                    .slice(0, 15)
                                    .map((p) => (
                                      <div
                                        key={p.id}
                                        onClick={() => handleManualProductAssign(item, p)}
                                        className="py-1.5 px-2 hover:bg-teal-50 dark:hover:bg-teal-950/50 cursor-pointer flex items-center justify-between gap-2 rounded"
                                      >
                                        <div className="truncate">
                                          <p className="font-semibold text-slate-900 dark:text-slate-100">{p.name}</p>
                                          <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku} • GST {p.gstRate}%</p>
                                        </div>
                                        <span className="font-mono font-bold text-teal-600 dark:text-teal-400 shrink-0">
                                          ₹{p.sellingPrice.toFixed(2)}
                                        </span>
                                      </div>
                                    ))}
                                </div>

                                <div className="flex justify-end pt-1">
                                  <button
                                    type="button"
                                    onClick={() => setActiveProductSelectRowId(null)}
                                    className="text-[10px] text-slate-500 hover:underline"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 3. Match Status */}
                          <td className="py-3 px-3 text-center font-sans">
                            {item.matchStatus === 'exact' && item.matchedProduct ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                Exact Match
                              </span>
                            ) : item.matchStatus === 'rate_diff' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-800">
                                Rate Difference
                              </span>
                            ) : item.matchStatus === 'review' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                Review Required
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                                No Match Found
                              </span>
                            )}
                          </td>

                          {/* 4. Quantity */}
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleQuantityChange(item.id, parseFloat(e.target.value) || 1)}
                              className="w-16 px-1.5 py-1 rounded text-center border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 font-bold"
                            />
                            <span className="block text-[10px] text-slate-400 mt-0.5">{item.unit}</span>
                          </td>

                          {/* 5. Rate on uploaded bill */}
                          <td className="py-3 px-3 text-right">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">
                              ₹{item.billRate.toFixed(2)}
                            </span>
                          </td>

                          {/* 6. Existing BillFlow Rate */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-bold text-slate-900 dark:text-slate-100">
                              {item.matchedProduct ? `₹${item.inventoryRate.toFixed(2)}` : '—'}
                            </span>
                          </td>

                          {/* 7. Rate To Use Selector */}
                          <td className="py-3 px-3 text-center font-sans">
                            <div className="flex flex-col items-center gap-1">
                              <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-950 text-[10px]">
                                <button
                                  type="button"
                                  onClick={() => handleRateSourceChange(item, 'inventory')}
                                  disabled={!item.matchedProduct}
                                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                    item.selectedRateSource === 'inventory'
                                      ? 'bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-400 shadow-sm'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                  }`}
                                  title={`Use authoritative catalog rate ₹${item.inventoryRate}`}
                                >
                                  Inventory
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRateSourceChange(item, 'bill')}
                                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                    item.selectedRateSource === 'bill'
                                      ? 'bg-white dark:bg-slate-800 text-sky-700 dark:text-sky-400 shadow-sm'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                  }`}
                                  title={`Use uploaded bill rate ₹${item.billRate}`}
                                >
                                  Bill Rate
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRateSourceChange(item, 'custom')}
                                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                                    item.selectedRateSource === 'custom'
                                      ? 'bg-white dark:bg-slate-800 text-amber-700 dark:text-amber-400 shadow-sm'
                                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                  }`}
                                >
                                  Custom
                                </button>
                              </div>

                              {item.selectedRateSource === 'custom' ? (
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  value={customRateInputs[item.id] ?? item.approvedRate}
                                  onChange={(e) => handleCustomRateValueChange(item, parseFloat(e.target.value) || 0)}
                                  className="w-20 px-1.5 py-0.5 rounded text-center border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-mono font-bold text-xs"
                                />
                              ) : (
                                <span className="font-mono text-[11px] font-bold text-teal-700 dark:text-teal-400">
                                  ₹{item.approvedRate.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* 8. Line Total */}
                          <td className="py-3 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {formatINR(item.lineTotal)}
                          </td>

                          {/* 9. Action */}
                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveProductSelectRowId(activeProductSelectRowId === item.id ? null : item.id);
                                  setProductSearchQuery(item.extractedItem.rawName);
                                }}
                                className="p-1 rounded text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/50"
                                title="Change product mapping"
                              >
                                <Search className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveMatchedRow(item.id)}
                                className="p-1 rounded text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                                title="Delete line item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Blocking Warning if items unresolved */}
              {unresolvedItems.length > 0 && (
                <div className="p-3.5 rounded-xl border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 text-xs flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      <strong>Resolution Required:</strong> {unresolvedItems.length} line item(s) are not yet linked to an authoritative catalog product. Use the search icon to assign products or remove them before invoice generation.
                    </span>
                  </span>
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Extracted Details</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  disabled={unresolvedItems.length > 0}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-2 shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Review & Generate Invoice</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* STEP 4: PREVIEW AND GENERATE INVOICE */}
          {/* ======================================================== */}
          {currentStep === 4 && (
            <div className="space-y-6">
              {/* Full Invoice Preview Card */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-md p-6 space-y-6">
                {/* Header Information */}
                <div className="flex flex-col sm:flex-row justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
                  <div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 font-semibold uppercase">
                      TAX INVOICE PREVIEW
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                      {prefix}{nextNum}
                    </h3>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">
                      Billed on {formatDate(invoiceDate)} • Due {formatDate(dueDate)}
                    </p>
                  </div>

                  <div className="text-right sm:max-w-xs">
                    <span className="text-[10px] text-slate-400 font-mono block">SUPPLIER</span>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100">
                      {settings?.businessName || 'Apex Infotech & Hardware Solutions'}
                    </h4>
                    <p className="text-[11px] text-slate-500">{settings?.address}, {settings?.city} ({settings?.stateCode})</p>
                    <p className="text-[11px] font-mono font-semibold text-teal-600 dark:text-teal-400">
                      GSTIN: {settings?.gstin}
                    </p>
                  </div>
                </div>

                {/* Customer Details Box */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-1">
                      BILLED TO (CUSTOMER)
                    </span>
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">{customerName}</h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">{customerAddress}</p>
                    {customerPhone && <p className="text-xs text-slate-500 font-mono mt-0.5">Phone: {customerPhone}</p>}
                    {customerGstin ? (
                      <p className="text-xs font-mono font-bold text-teal-600 dark:text-teal-400 mt-1">
                        GSTIN: {customerGstin}
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-1">Unregistered Buyer</p>
                    )}
                  </div>

                  <div className="sm:text-right space-y-1 text-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      SUPPLY & TAX ALLOCATION
                    </span>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Place of Supply: <span className="font-mono text-teal-600 dark:text-teal-400">{placeOfSupply}</span>
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Tax Regime: {isInterState ? 'Inter-State Consignment (IGST 100%)' : 'Intra-State Supply (CGST 50% + SGST 50%)'}
                    </p>
                    {originalInvoiceNo && (
                      <p className="text-[11px] font-mono text-slate-500">
                        Extracted Ref Bill: #{originalInvoiceNo}
                      </p>
                    )}
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 font-mono text-[11px] border-b border-slate-200 dark:border-slate-700">
                      <tr>
                        <th className="py-2.5 px-3">#</th>
                        <th className="py-2.5 px-3">PRODUCT / SERVICE</th>
                        <th className="py-2.5 px-3">HSN/SAC</th>
                        <th className="py-2.5 px-3 text-center">QTY</th>
                        <th className="py-2.5 px-3 text-right">APPROVED RATE (₹)</th>
                        <th className="py-2.5 px-3 text-right">TAXABLE (₹)</th>
                        <th className="py-2.5 px-3 text-center">GST %</th>
                        <th className="py-2.5 px-3 text-right">TOTAL (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
                      {preparedLineItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                          <td className="py-2.5 px-3 font-sans">
                            <span className="font-bold text-slate-900 dark:text-slate-100">{item.productName}</span>
                            {item.isPriceOverridden && (
                              <span className="ml-2 text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                                Overridden Rate
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{item.hsnSac}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{item.quantity} {item.unit}</td>
                          <td className="py-2.5 px-3 text-right font-medium">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-right font-medium">₹{item.taxableAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-3 text-center text-teal-600 dark:text-teal-400 font-bold">{item.gstRate}%</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                            {formatINR(item.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Summary & Tax Reconciliation */}
                <div className="flex flex-col sm:flex-row justify-between gap-6 pt-4 border-t border-slate-200 dark:border-slate-800">
                  <div className="sm:max-w-sm space-y-3">
                    <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                      PAYMENT SETTLEMENT AT CREATION
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Amount Paid Now (₹)</label>
                        <input
                          type="number"
                          min="0"
                          max={summary.totalAmount}
                          value={immediatePayment}
                          onChange={(e) => setImmediatePayment(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-slate-500 block mb-1">Method</label>
                        <select
                          value={paymentMethod}
                          onChange={(e) => setPaymentMethod(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                        >
                          <option value="upi">UPI / QR Code</option>
                          <option value="bank_transfer">Bank NEFT/RTGS</option>
                          <option value="cash">Cash</option>
                          <option value="card">Card POS</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1 font-mono text-[11px]">
                      <span className="text-slate-500">Balance Due:</span>
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {formatINR(Math.max(0, summary.totalAmount - immediatePayment))}
                      </span>
                    </div>
                  </div>

                  {/* Financial Breakdown Table */}
                  <div className="w-full sm:w-80 space-y-1.5 font-mono text-xs">
                    <div className="flex justify-between text-slate-600 dark:text-slate-400">
                      <span>Subtotal (Before Tax):</span>
                      <span>₹{summary.subtotal.toFixed(2)}</span>
                    </div>
                    {summary.totalDiscount > 0 && (
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Total Discounts:</span>
                        <span>-₹{summary.totalDiscount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-700 dark:text-slate-300 font-semibold">
                      <span>Taxable Value:</span>
                      <span>₹{summary.totalTaxableAmount.toFixed(2)}</span>
                    </div>

                    {isInterState ? (
                      <div className="flex justify-between text-sky-600 dark:text-sky-400">
                        <span>Integrated GST (IGST):</span>
                        <span>₹{summary.totalIgst.toFixed(2)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-teal-600 dark:text-teal-400">
                          <span>Central GST (CGST):</span>
                          <span>₹{summary.totalCgst.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-teal-600 dark:text-teal-400">
                          <span>State GST (SGST):</span>
                          <span>₹{summary.totalSgst.toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    <div className="flex justify-between text-slate-500 text-[11px]">
                      <span>Round Off:</span>
                      <span>₹{summary.roundOff.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-base font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-300 dark:border-slate-700">
                      <span>Grand Total:</span>
                      <span className="text-teal-700 dark:text-teal-400">{formatINR(summary.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Navigation and Generation Actions */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-full sm:w-auto px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium flex items-center justify-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Rate Matcher</span>
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={handleTransferToManualEditor}
                    className="flex-1 sm:flex-none px-4 py-2 rounded-xl border border-teal-500/50 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-teal-700 dark:text-teal-300 font-semibold transition-all flex items-center justify-center gap-1.5"
                    title="Load items into full manual invoice form"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span>Load into Full Editor</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalizeAndGenerateInvoice}
                    disabled={isFinalizing}
                    className="flex-1 sm:flex-none px-6 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-lg shadow-teal-500/25 transition-all flex items-center justify-center gap-2"
                  >
                    {isFinalizing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating & Saving...</span>
                      </>
                    ) : (
                      <>
                        <FileCheck2 className="w-4 h-4" />
                        <span>Confirm & Generate Invoice</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
