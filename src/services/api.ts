import {
  BusinessSettings,
  Customer,
  Product,
  Invoice,
  Payment,
  Expense,
  InventoryMovement,
  DashboardMetrics,
} from '../types';

const API_BASE = '/api';

class ApiService {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        let errorMsg = `Server error ${response.status}`;
        let errData: any = null;
        try {
          errData = await response.json();
          if (errData && errData.error) {
            errorMsg = errData.error;
          } else if (errData && errData.detail) {
            errorMsg = typeof errData.detail === 'string' ? errData.detail : JSON.stringify(errData.detail);
          }
        } catch {
          errorMsg = (await response.text()) || errorMsg;
        }
        const errorObj: any = new Error(errorMsg);
        errorObj.status = response.status;
        errorObj.data = errData;
        throw errorObj;
      }
      return (await response.json()) as T;
    } catch (err: any) {
      console.error(`API Error [${endpoint}]:`, err);
      throw err;
    }
  }

  // Health
  async getHealth(): Promise<{ status: string; engine: string; gemini_configured: boolean; timestamp: string }> {
    return this.request('/health');
  }

  // Business Settings
  async getSettings(): Promise<BusinessSettings> {
    return this.request('/settings');
  }

  async updateSettings(updates: Partial<BusinessSettings>): Promise<BusinessSettings> {
    return this.request('/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Dashboard Metrics
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    return this.request('/metrics');
  }

  // Customers
  async getCustomers(): Promise<Customer[]> {
    return this.request('/customers');
  }

  async getCustomer(id: string): Promise<Customer & { invoices: Invoice[] }> {
    return this.request(`/customers/${id}`);
  }

  async createCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
    return this.request('/customers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCustomer(id: string, updates: Partial<Customer>): Promise<Customer> {
    return this.request(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteCustomer(id: string): Promise<{ success: boolean; id: string; message?: string }> {
    return this.request(`/customers/${id}`, {
      method: 'DELETE',
    });
  }

  async archiveCustomer(id: string): Promise<{ success: boolean; customer: Customer; message: string }> {
    return this.request(`/customers/${id}/archive`, {
      method: 'POST',
    });
  }

  async unarchiveCustomer(id: string): Promise<{ success: boolean; customer: Customer; message: string }> {
    return this.request(`/customers/${id}/unarchive`, {
      method: 'POST',
    });
  }

  // Products
  async getProducts(params?: {
    search?: string;
    category?: string;
    status?: string;
    type?: string;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  }): Promise<Product[] | { items: Product[]; total: number; page: number; limit: number; totalPages: number; categories: string[] }> {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.sort) query.set('sort', params.sort);
    if (params?.order) query.set('order', params.order);
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));

    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request(`/products${qs}`);
  }

  async searchProducts(q: string, limit: number = 20): Promise<Product[]> {
    return this.request(`/products/search?q=${encodeURIComponent(q)}&limit=${limit}`);
  }

  async getCategories(): Promise<string[]> {
    return this.request('/products/categories');
  }

  async createProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    return this.request('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProduct(id: string, updates: Partial<Product> & { rateChangeReason?: string }): Promise<Product> {
    return this.request(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async toggleProductStatus(id: string, status?: 'active' | 'inactive'): Promise<Product> {
    return this.request(`/products/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async bulkImportProducts(
    items: any[],
    updateExisting: boolean = false
  ): Promise<{
    success: boolean;
    summary: { totalProcessed: number; added: number; updated: number; skipped: number; failed: number };
    errors: Array<{ row: number; item: string; error: string }>;
  }> {
    return this.request('/products/bulk-import', {
      method: 'POST',
      body: JSON.stringify({ items, updateExisting }),
    });
  }

  async bulkUpdateRates(data: {
    productIds?: string[];
    category?: string;
    adjustmentType: 'percentage' | 'fixed';
    value: number;
    reason?: string;
  }): Promise<{ success: boolean; updatedCount: number; items: any[] }> {
    return this.request('/products/bulk-rate-update', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async adjustStock(productId: string, quantityDelta: number, reason: string): Promise<Product> {
    return this.request(`/products/${productId}/adjust-stock`, {
      method: 'POST',
      body: JSON.stringify({ quantityDelta, reason }),
    });
  }

  async deleteProduct(id: string): Promise<{ success: boolean; id: string }> {
    return this.request(`/products/${id}`, {
      method: 'DELETE',
    });
  }

  // Invoices
  async getInvoices(filters?: {
    customerId?: string;
    status?: string;
    paymentStatus?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters?.customerId) params.set('customerId', filters.customerId);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.paymentStatus) params.set('paymentStatus', filters.paymentStatus);
    if (filters?.startDate) params.set('startDate', filters.startDate);
    if (filters?.endDate) params.set('endDate', filters.endDate);
    const query = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/invoices${query}`);
  }

  async getInvoice(id: string): Promise<Invoice & { payments: Payment[] }> {
    return this.request(`/invoices/${id}`);
  }

  async createInvoice(data: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    return this.request('/invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async cancelInvoice(id: string, reason: string): Promise<Invoice> {
    return this.request(`/invoices/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  // Payments
  async getPayments(invoiceId?: string): Promise<Payment[]> {
    const query = invoiceId ? `?invoiceId=${encodeURIComponent(invoiceId)}` : '';
    return this.request(`/payments${query}`);
  }

  async recordPayment(data: {
    invoiceId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNumber: string;
    notes?: string;
  }): Promise<{ payment: Payment; invoice: Invoice }> {
    return this.request('/payments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Expenses
  async getExpenses(month?: string): Promise<Expense[]> {
    const query = month ? `?month=${encodeURIComponent(month)}` : '';
    return this.request(`/expenses${query}`);
  }

  async createExpense(data: Omit<Expense, 'id' | 'createdAt'>): Promise<Expense> {
    return this.request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: string): Promise<{ success: boolean; id: string }> {
    return this.request(`/expenses/${id}`, {
      method: 'DELETE',
    });
  }

  // Inventory Movements
  async getInventoryMovements(productId?: string): Promise<InventoryMovement[]> {
    const query = productId ? `?productId=${encodeURIComponent(productId)}` : '';
    return this.request(`/inventory-movements${query}`);
  }

  // AI Business Assistant
  async askAiAssistant(query: string): Promise<{ answer: string; model: string; generatedAt: string }> {
    return this.request('/ai/assistant', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  }
}

export const api = new ApiService();
