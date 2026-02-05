/**
 * Documents API Client
 * Handles all billing API calls (invoices, quotes, credit notes)
 */

import { baseClient } from './baseClient';

const ENDPOINT = '/documents';

// ============================================================================
// CRUD
// ============================================================================

/**
 * List documents with filters and pagination
 * @param {Object} params
 * @param {string} params.documentType - 'invoice' | 'quote' | 'credit_note'
 * @param {string} params.status - Filter by status
 * @param {string} params.patientId - Filter by patient
 * @param {string} params.search - Search term (number, buyer name)
 * @param {string} params.dateFrom - Start date (YYYY-MM-DD)
 * @param {string} params.dateTo - End date (YYYY-MM-DD)
 * @param {number} params.page - Page number
 * @param {number} params.limit - Items per page
 * @param {string} params.sortBy - Sort field
 * @param {string} params.sortOrder - 'ASC' | 'DESC'
 */
export const getDocuments = async (params = {}) => {
  return baseClient.get(ENDPOINT, { query: params });
};

/**
 * Get a single document with its items
 * @param {string} id - Document ID
 */
export const getDocument = async (id) => {
  return baseClient.get(`${ENDPOINT}/${id}`);
};

/**
 * Create a new document (invoice, quote, or credit note)
 * @param {Object} data - Document data with items
 */
export const createDocument = async (data) => {
  return baseClient.post(ENDPOINT, data);
};

/**
 * Update an existing document (draft only)
 * @param {string} id - Document ID
 * @param {Object} data - Updated data
 */
export const updateDocument = async (id, data) => {
  return baseClient.put(`${ENDPOINT}/${id}`, data);
};

/**
 * Soft-delete a document (draft only)
 * @param {string} id - Document ID
 */
export const deleteDocument = async (id) => {
  return baseClient.delete(`${ENDPOINT}/${id}`);
};

// ============================================================================
// Status actions
// ============================================================================

/**
 * Mark a document as sent
 * @param {string} id - Document ID
 */
export const sendDocument = async (id) => {
  return baseClient.patch(`${ENDPOINT}/${id}/send`);
};

/**
 * Accept a quote
 * @param {string} id - Document ID
 */
export const acceptDocument = async (id) => {
  return baseClient.patch(`${ENDPOINT}/${id}/accept`);
};

/**
 * Reject a quote
 * @param {string} id - Document ID
 */
export const rejectDocument = async (id) => {
  return baseClient.patch(`${ENDPOINT}/${id}/reject`);
};

/**
 * Mark an invoice as paid (supports partial payments)
 * @param {string} id - Document ID
 * @param {Object} data - { amountPaid }
 */
export const payDocument = async (id, data = {}) => {
  return baseClient.patch(`${ENDPOINT}/${id}/pay`, data);
};

// ============================================================================
// Conversion & duplication
// ============================================================================

/**
 * Convert a quote to an invoice
 * @param {string} id - Quote ID
 */
export const convertToInvoice = async (id) => {
  return baseClient.post(`${ENDPOINT}/${id}/convert`);
};

/**
 * Create a credit note from an invoice
 * @param {string} id - Invoice ID
 */
export const createCreditNote = async (id) => {
  return baseClient.post(`${ENDPOINT}/${id}/credit-note`);
};

/**
 * Duplicate a document
 * @param {string} id - Document ID
 */
export const duplicateDocument = async (id) => {
  return baseClient.post(`${ENDPOINT}/${id}/duplicate`);
};

// ============================================================================
// PDF
// ============================================================================

/**
 * Get PDF for a document (binary response)
 * Uses direct fetch instead of baseClient to handle binary Blob response.
 * @param {string} id - Document ID
 * @returns {Promise<Blob>} PDF blob
 */
export const getDocumentPDF = async (id) => {
  const { API_BASE_URL, getAuthToken, getCompanyId } = baseClient;
  const url = `${API_BASE_URL}${ENDPOINT}/${id}/pdf`;
  const headers = {};

  const token = getAuthToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const companyId = getCompanyId();
  if (companyId) {
    headers['X-Company-ID'] = companyId;
  }

  const response = await fetch(url, { method: 'GET', headers });
  if (!response.ok) {
    throw new Error(`PDF download failed: ${response.status} ${response.statusText}`);
  }

  return response.blob();
};

// ============================================================================
// Stats
// ============================================================================

/**
 * Get document statistics (totals by status, revenue, overdue)
 * @param {Object} params - { documentType }
 */
export const getDocumentStats = async (params = {}) => {
  return baseClient.get(`${ENDPOINT}/stats`, { query: params });
};

/**
 * Get monthly revenue stats
 * @param {Object} params - { year, months }
 */
export const getMonthlyStats = async (params = {}) => {
  return baseClient.get(`${ENDPOINT}/stats/monthly`, { query: params });
};

/**
 * Preview the next document number
 * @param {string} type - 'invoice' | 'quote' | 'credit_note'
 */
export const getNextNumber = async (type) => {
  return baseClient.get(`${ENDPOINT}/next-number`, { query: { type } });
};

// ============================================================================
// Billing settings
// ============================================================================

/**
 * Get billing settings for the clinic
 */
export const getBillingSettings = async () => {
  return baseClient.get(`${ENDPOINT}/billing-settings`);
};

/**
 * Update billing settings
 * @param {Object} settings - Billing settings data
 */
export const updateBillingSettings = async (settings) => {
  return baseClient.put(`${ENDPOINT}/billing-settings`, settings);
};

// ============================================================================
// Helpers — Data transformation
// ============================================================================

/**
 * Build the document payload from frontend form data and billing settings.
 * Maps frontend field names (clientId, invoiceDate, etc.) to backend format
 * (buyerName, issueDate, etc.) and injects seller snapshot from billing settings.
 *
 * @param {string} documentType - 'invoice' | 'quote'
 * @param {Object} formData - Form data from the modal
 * @param {Object} billingSettings - Billing settings (seller info, defaults)
 * @param {Object} selectedClient - Selected client/patient object
 * @returns {Object} Backend-ready payload
 */
export const buildDocumentPayload = (documentType, formData, billingSettings, selectedClient) => {
  const seller = billingSettings?.seller || {};

  // Validate required seller info
  if (!seller.name) {
    const err = new Error('Veuillez configurer les informations du vendeur (nom) dans les paramètres de facturation avant de créer un document.');
    err.code = 'MISSING_SELLER_NAME';
    throw err;
  }

  // Map items: resolve null taxRate to default
  const defaultTaxRate = billingSettings?.defaultTaxRate || 20;
  const items = (formData.items || [])
    .filter(item => item.description?.trim() && item.unitPrice > 0)
    .map((item, index) => ({
      description: item.description,
      quantity: item.quantity || 1,
      unit: item.unit || 'unit',
      unitPrice: item.unitPrice,
      discountPercent: item.discountPercent || 0,
      taxRate: item.taxRate != null ? item.taxRate : defaultTaxRate,
      taxCategoryCode: item.taxCategoryCode || 'S',
      sortOrder: index,
      productServiceId: item.catalogItemId || item.productServiceId || null,
      productSnapshot: item.productSnapshot || null
    }));

  const payload = {
    documentType,

    // Seller snapshot from billing settings
    sellerName: seller.name || '',
    sellerAddress: seller.address || null,
    sellerSiren: seller.siren || null,
    sellerVatNumber: seller.vatNumber || null,
    sellerLegalForm: seller.legalForm || null,
    sellerCapital: seller.capital || null,
    sellerRcs: seller.rcs || null,
    sellerEmail: seller.email || null,
    sellerPhone: seller.phone || null,

    // Buyer from selected client/patient
    buyerName: selectedClient?.displayName || selectedClient?.name || formData.clientName || '',
    buyerAddress: selectedClient ? {
      line1: selectedClient.address || '',
      line2: '',
      postalCode: selectedClient.postalCode || '',
      city: selectedClient.city || '',
      country: selectedClient.country || billingSettings?.defaultCountry || ''
    } : null,
    buyerEmail: selectedClient?.email || formData.clientEmail || null,
    buyerPhone: selectedClient?.phone || null,
    buyerSiren: selectedClient?.siren || null,

    // Items
    items,

    // Discount
    discountType: formData.discountType || 'none',
    discountValue: formData.discountValue || 0,

    // Notes
    notes: formData.notes || null,
    terms: formData.terms || null,
    legalMentions: billingSettings?.legalMentions || null,

    // Conditions
    currency: billingSettings?.defaultCurrency || 'EUR',
    paymentMethod: formData.paymentMethod || null,
    bankDetails: billingSettings?.bankDetails || null,
    latePenaltyRate: billingSettings?.latePenaltyRate || null,
    purchaseOrder: formData.purchaseOrder || null,

    // E-invoicing
    transactionCategory: formData.transactionCategory || 'services',
    facturxProfile: billingSettings?.facturxProfile || null,

    // Medical extensions
    patientId: selectedClient?.id || formData.patientId || null,
    appointmentId: formData.appointmentId || null,
    practitionerId: formData.practitionerId || null
  };

  // Date fields depend on document type
  if (documentType === 'invoice') {
    payload.issueDate = formData.invoiceDate || new Date().toISOString().split('T')[0];
    payload.dueDate = formData.dueDate || null;
    payload.paymentTerms = formData.paymentTerms != null
      ? `${formData.paymentTerms} jours`
      : null;
  } else if (documentType === 'quote') {
    payload.issueDate = formData.quoteDate || new Date().toISOString().split('T')[0];
    payload.validUntil = formData.validUntil || null;
  }

  return payload;
};

/**
 * Transform a backend document to the frontend display format used by modules.
 * Maps snake_case/camelCase backend fields to the flat object the table expects.
 *
 * @param {Object} doc - Backend document object
 * @returns {Object} Frontend-friendly document
 */
export const transformDocumentForDisplay = (doc) => {
  if (!doc) return null;

  return {
    // Identity
    id: doc.id,
    number: doc.documentNumber || doc.document_number,
    documentType: doc.documentType || doc.document_type,

    // Client/buyer info (flattened for the table)
    clientName: doc.buyerName || doc.buyer_name || '',
    clientEmail: doc.buyerEmail || doc.buyer_email || '',
    clientId: doc.patientId || doc.patient_id || null,

    // Dates
    invoiceDate: doc.issueDate || doc.issue_date,
    quoteDate: doc.issueDate || doc.issue_date,
    dueDate: doc.dueDate || doc.due_date,
    validUntil: doc.validUntil || doc.valid_until,

    // Amounts
    subtotal: parseFloat(doc.subtotal) || 0,
    discountType: doc.discountType || doc.discount_type || 'none',
    discountValue: parseFloat(doc.discountValue || doc.discount_value) || 0,
    discountAmount: parseFloat(doc.discountAmount || doc.discount_amount) || 0,
    taxAmount: parseFloat(doc.taxAmount || doc.tax_amount) || 0,
    taxDetails: doc.taxDetails || doc.tax_details || [],
    total: parseFloat(doc.total) || 0,
    amountPaid: parseFloat(doc.amountPaid || doc.amount_paid) || 0,
    amountDue: parseFloat(doc.amountDue || doc.amount_due) || 0,

    // Status
    status: doc.status,
    sentAt: doc.sentAt || doc.sent_at,
    paidAt: doc.paidAt || doc.paid_at,
    acceptedAt: doc.acceptedAt || doc.accepted_at,

    // Conversion
    convertedFromId: doc.convertedFromId || doc.converted_from_id,
    convertedToId: doc.convertedToId || doc.converted_to_id,

    // Notes
    notes: doc.notes,
    terms: doc.terms,
    paymentTerms: doc.paymentTerms || doc.payment_terms,

    // Items (for editing)
    items: (doc.items || []).map(item => ({
      id: item.id,
      description: item.description,
      quantity: parseFloat(item.quantity) || 1,
      unitPrice: parseFloat(item.unitPrice || item.unit_price) || 0,
      unit: item.unit || 'unit',
      taxRate: parseFloat(item.taxRate || item.tax_rate) || 0,
      taxCategoryCode: item.taxCategoryCode || item.tax_category_code || 'S',
      discountPercent: parseFloat(item.discountPercent || item.discount_percent) || 0,
      lineNetAmount: parseFloat(item.lineNetAmount || item.line_net_amount) || 0,
      catalogItemId: item.productServiceId || item.product_service_id || null,
      sortOrder: item.sortOrder || item.sort_order || 0
    })),

    // Medical
    patientId: doc.patientId || doc.patient_id,
    appointmentId: doc.appointmentId || doc.appointment_id,
    practitionerId: doc.practitionerId || doc.practitioner_id,

    // Seller info (for PDF/display)
    sellerName: doc.sellerName || doc.seller_name,
    sellerAddress: doc.sellerAddress || doc.seller_address,
    buyerName: doc.buyerName || doc.buyer_name,
    buyerAddress: doc.buyerAddress || doc.buyer_address,

    // Timestamps
    createdAt: doc.createdAt || doc.created_at,
    updatedAt: doc.updatedAt || doc.updated_at
  };
};

export default {
  getDocuments,
  getDocument,
  createDocument,
  updateDocument,
  deleteDocument,
  sendDocument,
  acceptDocument,
  rejectDocument,
  payDocument,
  convertToInvoice,
  createCreditNote,
  duplicateDocument,
  getDocumentPDF,
  getDocumentStats,
  getMonthlyStats,
  getNextNumber,
  getBillingSettings,
  updateBillingSettings,
  buildDocumentPayload,
  transformDocumentForDisplay
};
