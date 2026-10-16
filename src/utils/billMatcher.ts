import { Product, ExtractedBillItem, MatchedBillItem, BillItemMatchStatus } from '../types';

/**
 * Text normalization for OCR text and catalog items.
 * Removes extra whitespace, punctuation, brackets, and common OCR noise.
 */
export function normalizeItemText(str: string): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/[|/\\()[\],;:_"-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract physical dimensions and specifications from product text.
 * e.g., "M6 x 25mm", "305m", "4MP", "AC1200", "24-Port", "4.6"
 */
export function extractItemSpecifications(text: string): {
  dimensions: string[];
  numbers: string[];
} {
  const norm = text.toLowerCase();
  const dimensions: string[] = [];
  const numbers: string[] = [];

  // Metric thread dimensions e.g. "m6 x 25mm", "m8 x 30"
  const metricThreadMatch = norm.match(/m\d+\s*x\s*\d+(\.\d+)?\s*(mm)?/g);
  if (metricThreadMatch) {
    dimensions.push(...metricThreadMatch.map((s) => s.replace(/\s+/g, '')));
  }

  // Length or meters e.g. "305m", "100m"
  const lengthMatch = norm.match(/\b\d+\s*(m|meter|mtr)\b/g);
  if (lengthMatch) {
    dimensions.push(...lengthMatch.map((s) => s.replace(/\s+/g, '')));
  }

  // Camera resolution e.g. "4mp", "2mp", "8mp"
  const mpMatch = norm.match(/\b\d+\s*mp\b/g);
  if (mpMatch) {
    dimensions.push(...mpMatch.map((s) => s.replace(/\s+/g, '')));
  }

  // Port counts e.g. "24-port", "8 port", "16 port"
  const portMatch = norm.match(/\b\d+\s*port\b/g);
  if (portMatch) {
    dimensions.push(...portMatch.map((s) => s.replace(/\s+/g, '')));
  }

  // Standalone model numbers and numerical tokens >= 2 chars
  const numTokens = norm.match(/\b[a-z0-9-]{3,}\b/g) || [];
  for (const t of numTokens) {
    if (/\d/.test(t)) {
      numbers.push(t);
    }
  }

  return { dimensions, numbers };
}

/**
 * Check if two items have conflicting specifications (e.g. M6x25mm vs M6x40mm).
 * Returns true if specs conflict (must NEVER be matched).
 */
export function hasConflictingSpecs(specsA: { dimensions: string[]; numbers: string[] }, specsB: { dimensions: string[]; numbers: string[] }): boolean {
  if (specsA.dimensions.length > 0 && specsB.dimensions.length > 0) {
    const hasCommonDim = specsA.dimensions.some((d) => specsB.dimensions.includes(d));
    if (!hasCommonDim) {
      // Both specify dimensions (e.g. metric fastener size or cable spool length) but they do NOT match!
      return true;
    }
  }
  return false;
}

/**
 * Compute token overlap Jaccard similarity score (0 to 1).
 */
export function calculateTokenSimilarity(strA: string, strB: string): number {
  const tokensA = new Set(
    normalizeItemText(strA)
      .split(' ')
      .filter((w) => w.length > 1 && !['pcs', 'nos', 'the', 'and', 'for', 'with', 'box', 'set'].includes(w))
  );
  const tokensB = new Set(
    normalizeItemText(strB)
      .split(' ')
      .filter((w) => w.length > 1 && !['pcs', 'nos', 'the', 'and', 'for', 'with', 'box', 'set'].includes(w))
  );

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionCount = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersectionCount++;
  }

  const unionCount = new Set([...tokensA, ...tokensB]).size;
  return unionCount === 0 ? 0 : intersectionCount / unionCount;
}

/**
 * Match a single extracted bill item against the authoritative inventory.
 */
export function matchExtractedItemToInventory(
  extracted: ExtractedBillItem,
  inventory: Product[]
): MatchedBillItem {
  const raw = extracted.rawName.trim();
  const rawNorm = normalizeItemText(raw);
  const extractedSpecs = extractItemSpecifications(raw);

  let bestMatch: Product | null = null;
  let highestConfidence = 0;
  let matchStatus: BillItemMatchStatus = 'unmatched';
  let matchReason = '';
  const candidateProducts: Product[] = [];

  // Step 1: Check SKU / Item Code direct match
  const skuMatch = inventory.find(
    (p) =>
      (p.sku && p.sku.toLowerCase() === rawNorm) ||
      (p.sku && rawNorm.includes(p.sku.toLowerCase()))
  );
  if (skuMatch) {
    bestMatch = skuMatch;
    highestConfidence = 1.0;
    matchStatus = 'exact';
    matchReason = `Direct SKU code match (${skuMatch.sku})`;
  }

  // Step 2: Exact Product Name match (case-insensitive)
  if (!bestMatch) {
    const exactNameMatch = inventory.find(
      (p) => p.name.trim().toLowerCase() === raw.toLowerCase()
    );
    if (exactNameMatch) {
      bestMatch = exactNameMatch;
      highestConfidence = 1.0;
      matchStatus = 'exact';
      matchReason = 'Exact product name match';
    }
  }

  // Step 3: Exact Normalized Name match
  if (!bestMatch) {
    const exactNormMatch = inventory.find(
      (p) => normalizeItemText(p.name) === rawNorm
    );
    if (exactNormMatch) {
      bestMatch = exactNormMatch;
      highestConfidence = 0.98;
      matchStatus = 'exact';
      matchReason = 'Normalized full name match';
    }
  }

  // Step 4: Strict token & specification matching
  if (!bestMatch) {
    const scoredCandidates: Array<{ product: Product; score: number; reason: string }> = [];

    for (const prod of inventory) {
      const prodSpecs = extractItemSpecifications(prod.name);

      // CRITICAL RULE: If both have dimensions and they differ (e.g. M6x25mm vs M6x40mm), reject!
      if (hasConflictingSpecs(extractedSpecs, prodSpecs)) {
        continue;
      }

      const tokenSim = calculateTokenSimilarity(raw, prod.name);

      // HSN code match boost
      let hsnBoost = 0;
      if (
        extracted.hsnSac &&
        prod.hsnSacCode &&
        (extracted.hsnSac.startsWith(prod.hsnSacCode) || prod.hsnSacCode.startsWith(extracted.hsnSac))
      ) {
        hsnBoost = 0.1;
      }

      // Spec matching bonus
      let specBonus = 0;
      if (
        extractedSpecs.dimensions.length > 0 &&
        prodSpecs.dimensions.length > 0 &&
        extractedSpecs.dimensions.some((d) => prodSpecs.dimensions.includes(d))
      ) {
        specBonus = 0.25;
      }

      const totalScore = Math.min(1.0, tokenSim + hsnBoost + specBonus);

      // Only consider if similarity is substantial
      if (totalScore >= 0.65) {
        scoredCandidates.push({
          product: prod,
          score: totalScore,
          reason: `High similarity (${Math.round(totalScore * 100)}%)`,
        });
      }
    }

    // Sort by score descending
    scoredCandidates.sort((a, b) => b.score - a.score);

    if (scoredCandidates.length > 0) {
      const top = scoredCandidates[0];
      const second = scoredCandidates[1];

      // Collect top 5 candidates for manual review
      candidateProducts.push(...scoredCandidates.slice(0, 5).map((c) => c.product));

      // If top candidate is extremely high and significantly better than #2 -> high confidence
      if (top.score >= 0.88 && (!second || top.score - second.score >= 0.15)) {
        bestMatch = top.product;
        highestConfidence = top.score;
        matchStatus = top.score >= 0.95 ? 'exact' : 'review';
        matchReason = top.score >= 0.95 ? 'High confidence match' : 'Possible Match — Review Required';
      } else {
        // Multiple close candidates or moderate confidence -> DO NOT AUTO-ASSIGN!
        // "Do not automatically select a fuzzy match if multiple inventory products could be correct."
        matchStatus = 'review';
        matchReason = `Ambiguous: ${scoredCandidates.length} potential matches found — manual review required`;
        highestConfidence = top.score;
        // Keep bestMatch null so user must pick from candidateProducts!
        bestMatch = null;
      }
    } else {
      matchStatus = 'unmatched';
      highestConfidence = 0;
      matchReason = 'No matching product found in inventory catalog';
    }
  }

  // Rates and line calculation
  const billRate = extracted.rate || 0;
  const inventoryRate = bestMatch ? bestMatch.sellingPrice : 0;
  // Authoritative rate is the BillFlow inventory rate
  const approvedRate = bestMatch ? bestMatch.sellingPrice : billRate;

  // Check rate difference
  let hasRateDiff = false;
  if (bestMatch && Math.abs(billRate - inventoryRate) >= 0.01) {
    hasRateDiff = true;
    if (matchStatus === 'exact') {
      matchStatus = 'rate_diff';
      matchReason = `Rate Difference: Bill ₹${billRate.toFixed(2)} vs Inventory ₹${inventoryRate.toFixed(2)}`;
    }
  }

  const qty = extracted.quantity || 1;
  const lineTotal = Math.round(qty * approvedRate * 100) / 100;

  return {
    id: `match-${extracted.id}`,
    extractedItem: extracted,
    matchedProduct: bestMatch,
    matchStatus,
    matchConfidence: highestConfidence,
    matchReason,
    candidateProducts: candidateProducts.length > 0 ? candidateProducts : undefined,
    quantity: qty,
    unit: bestMatch ? bestMatch.unit : extracted.unit || 'Pcs',
    billRate,
    inventoryRate,
    selectedRateSource: 'inventory',
    approvedRate,
    isPriceOverridden: false,
    overrideReason: undefined,
    hsnSac: bestMatch ? bestMatch.hsnSacCode : extracted.hsnSac || '8517',
    gstRate: bestMatch ? bestMatch.gstRate : extracted.gstRate || 18,
    discountPercent: extracted.discountPercent || 0,
    lineTotal,
    isResolved: matchStatus === 'exact' || (matchStatus === 'rate_diff' && bestMatch !== null),
  };
}

/**
 * Batch match all items from an extracted bill against the inventory.
 */
export function matchAllExtractedBillItems(
  extractedItems: ExtractedBillItem[],
  inventory: Product[]
): MatchedBillItem[] {
  return extractedItems.map((item) => matchExtractedItemToInventory(item, inventory));
}

/**
 * Update an existing MatchedBillItem when user chooses a different rate or product.
 */
export function updateMatchedItemRate(
  item: MatchedBillItem,
  rateSource: 'inventory' | 'bill' | 'custom',
  customRateValue?: number
): MatchedBillItem {
  let rateToUse = item.inventoryRate;
  let isOverridden = false;
  let overrideReason: string | undefined = undefined;

  if (rateSource === 'bill') {
    rateToUse = item.billRate;
    isOverridden = true;
    overrideReason = `Approved uploaded bill rate (₹${item.billRate})`;
  } else if (rateSource === 'custom' && customRateValue !== undefined) {
    rateToUse = customRateValue;
    isOverridden = true;
    overrideReason = `Manual user override rate (₹${customRateValue})`;
  } else {
    // Inventory rate
    rateToUse = item.matchedProduct ? item.matchedProduct.sellingPrice : item.inventoryRate;
    isOverridden = false;
    overrideReason = undefined;
  }

  const lineTotal = Math.round(item.quantity * rateToUse * (1 - item.discountPercent / 100) * 100) / 100;

  return {
    ...item,
    selectedRateSource: rateSource,
    approvedRate: rateToUse,
    isPriceOverridden: isOverridden,
    overrideReason,
    lineTotal,
    isResolved: item.matchedProduct !== null,
  };
}

/**
 * Re-link a matched item to a specific inventory product selected manually by user.
 */
export function assignProductToMatchedItem(
  item: MatchedBillItem,
  product: Product,
  preferredRateSource: 'inventory' | 'bill' | 'custom' = 'inventory'
): MatchedBillItem {
  const inventoryRate = product.sellingPrice;
  const billRate = item.billRate;

  let approvedRate = inventoryRate;
  let isOverridden = false;
  let overrideReason: string | undefined = undefined;

  if (preferredRateSource === 'bill') {
    approvedRate = billRate;
    isOverridden = true;
    overrideReason = `Approved uploaded bill rate (₹${billRate})`;
  }

  const hasRateDiff = Math.abs(billRate - inventoryRate) >= 0.01;
  const matchStatus: BillItemMatchStatus = hasRateDiff ? 'rate_diff' : 'exact';

  const lineTotal = Math.round(item.quantity * approvedRate * (1 - item.discountPercent / 100) * 100) / 100;

  return {
    ...item,
    matchedProduct: product,
    matchStatus,
    matchConfidence: 1.0,
    matchReason: 'Manually verified and matched by user',
    inventoryRate,
    unit: product.unit,
    hsnSac: product.hsnSacCode,
    gstRate: product.gstRate,
    approvedRate,
    selectedRateSource: preferredRateSource,
    isPriceOverridden: isOverridden,
    overrideReason,
    lineTotal,
    isResolved: true,
  };
}
