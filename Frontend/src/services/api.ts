/**
 * API Service - Cheema Dairy Frontend
 * Complete API layer - backend ke sab endpoints covered hain
 */

/// <reference types="vite/client" />
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';

// ─── Token Management ─────────────────────────────────────────────────────────
export const getToken = (): string | null => localStorage.getItem('dairy_token');
export const setToken = (token: string) => localStorage.setItem('dairy_token', token);
export const removeToken = () => localStorage.removeItem('dairy_token');

// ─── Online Check ─────────────────────────────────────────────────────────────
export const isOnline = (): boolean => navigator.onLine;

// Backend reachable hai ya nahi — consecutive failures track karo
let _backendFailCount = 0;
let _backendPaused = false;
let _backendResumeTimer: ReturnType<typeof setTimeout> | null = null;

export const markBackendFail = () => {
  _backendFailCount++;
  if (_backendFailCount >= 3 && !_backendPaused) {
    _backendPaused = true;
    // 30 second ke baad dobara try karo
    if (_backendResumeTimer) clearTimeout(_backendResumeTimer);
    _backendResumeTimer = setTimeout(() => {
      _backendPaused = false;
      _backendFailCount = 0;
    }, 30000);
  }
};
export const markBackendSuccess = () => {
  _backendFailCount = 0;
  _backendPaused = false;
  if (_backendResumeTimer) { clearTimeout(_backendResumeTimer); _backendResumeTimer = null; }
};
export const isBackendReachable = (): boolean => navigator.onLine && !_backendPaused;

// ─── Core Fetch ───────────────────────────────────────────────────────────────
interface ApiOptions { method?: string; body?: unknown; token?: string | null; }
export interface ApiResult<T = unknown> { success: boolean; message: string; data: T; }

export const apiRequest = async <T = unknown>(
  endpoint: string, options: ApiOptions = {}
): Promise<ApiResult<T>> => {
  const { method = 'GET', body, token = getToken() } = options;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store',
    'Pragma': 'no-cache',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const config: RequestInit = { method, headers, cache: 'no-store' };
  if (body) config.body = JSON.stringify(body);
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch (networkErr) {
    markBackendFail();
    throw networkErr;
  }
  markBackendSuccess();
  const json = await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent('dairy-unauthorized'));
    }
    const errorType = json.errorType ? `${json.errorType}: ` : '';
    throw new Error(`${errorType}${json.message || 'Request failed'}`);
  }
  return json;
};

// Helper - query string banao
const qs = (params?: Record<string, string | number | boolean>) =>
  params ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString() : '';

// ─── Auth API ─────────────────────────────────────────────────────────────────
export const authApi = {
  login: async (username: string, password: string) => {
    const result = await apiRequest<{ token: string; user: unknown }>('/auth/login', {
      method: 'POST', body: { username, password },
    });
    if ((result.data as any)?.token) setToken((result.data as any).token);
    return result;
  },
  logout: async () => {
    try {
      // No token needed — backend pe protect middleware nahi logout pe
      await fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch {
      // Network error — ignore, local logout ho jayega
    } finally {
      removeToken();
    }
  },
  getMe: () => apiRequest('/auth/me'),
  updatePreferences: (preferences: { theme?: string; sidebarCollapsed?: boolean }) =>
    apiRequest('/auth/preferences', { method: 'PUT', body: preferences }),
};

// ─── Users API ────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (params?: Record<string, string>) => apiRequest(`/users${qs(params)}`),
  getById: (id: string) => apiRequest(`/users/${id}`),
  create: (data: unknown) => apiRequest('/users', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => apiRequest(`/users/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => apiRequest(`/users/${id}`, { method: 'DELETE' }),
  toggleStatus: (id: string) => apiRequest(`/users/${id}/toggle-status`, { method: 'PATCH' }),
};

// ─── Vehicles API ─────────────────────────────────────────────────────────────
export const vehiclesApi = {
  getAll: (params?: Record<string, string>) => apiRequest(`/vehicles${qs(params)}`),
  create: (data: unknown) => apiRequest('/vehicles', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => apiRequest(`/vehicles/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => apiRequest(`/vehicles/${id}`, { method: 'DELETE' }),
};

// ─── Routes API ───────────────────────────────────────────────────────────────
export const routesApi = {
  getAll: () => apiRequest('/routes'),
  getMyRoutes: () => apiRequest('/routes/my-routes'),
  getById: (id: string) => apiRequest(`/routes/${id}`),
  create: (data: unknown) => apiRequest('/routes', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => apiRequest(`/routes/${id}`, { method: 'PUT', body: data }),
  assignTesters: (id: string, testerIds: string[]) =>
    apiRequest(`/routes/${id}/assign-testers`, { method: 'PATCH', body: { assignedMilkTesterIds: testerIds } }),
  delete: (id: string) => apiRequest(`/routes/${id}`, { method: 'DELETE' }),
};

// ─── Route Collections API ────────────────────────────────────────────────────
export const routeCollectionsApi = {
  getAll: (params?: Record<string, string>) => apiRequest(`/route-collections${qs(params)}`),
  getById: (id: string) => apiRequest(`/route-collections/${id}`),
  create: (data: unknown) => apiRequest('/route-collections', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => apiRequest(`/route-collections/${id}`, { method: 'PUT', body: data }),
  submit: (id: string) => apiRequest(`/route-collections/${id}/submit`, { method: 'PATCH' }),
  receive: (id: string, data: unknown) => apiRequest(`/route-collections/${id}/receive`, { method: 'PATCH', body: data }),
  updateLabTest: (id: string, data: unknown) => apiRequest(`/route-collections/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => apiRequest(`/route-collections/${id}`, { method: 'DELETE' }),
};

// ─── Milk Records API ─────────────────────────────────────────────────────────
export const milkRecordsApi = {
  getAll: (params?: Record<string, string>) => apiRequest(`/milk-records${qs(params)}`),
  create: (data: unknown) => apiRequest('/milk-records', { method: 'POST', body: data }),
  createBulk: (data: unknown) => apiRequest('/milk-records/bulk', { method: 'POST', body: data }),
  delete: (id: string) => apiRequest(`/milk-records/${id}`, { method: 'DELETE' }),
};

// ─── Dispatches API ───────────────────────────────────────────────────────────
export const dispatchesApi = {
  getAll: (params?: Record<string, string>) => apiRequest(`/dispatches${qs(params)}`),
  getById: (id: string) => apiRequest(`/dispatches/${id}`),
  create: (data: unknown) => apiRequest('/dispatches', { method: 'POST', body: data }),
  updateStatus: (id: string, status: string) => apiRequest(`/dispatches/${id}/status`, { method: 'PATCH', body: { status } }),
  markSold: (id: string, data: unknown) => apiRequest(`/dispatches/${id}/mark-sold`, { method: 'PATCH', body: data }),
  addDestinationEntry: (id: string, data: unknown) => apiRequest(`/dispatches/${id}/destination-entry`, { method: 'POST', body: data }),
  receive: (id: string, data: unknown) => apiRequest(`/dispatches/${id}/receive`, { method: 'PATCH', body: data }),
  delete: (id: string) => apiRequest(`/dispatches/${id}`, { method: 'DELETE' }),
};

// ─── Advances API ─────────────────────────────────────────────────────────────
export const advancesApi = {
  getAll: (params?: Record<string, string>) => apiRequest(`/advances${qs(params)}`),
  getDriverBalance: (driverId: string, openingBalance?: number) =>
    apiRequest(`/advances/balance/${driverId}${openingBalance ? `?openingBalance=${openingBalance}` : ''}`),
  create: (data: unknown) => apiRequest('/advances', { method: 'POST', body: data }),
  update: (id: string, data: unknown) => apiRequest(`/advances/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => apiRequest(`/advances/${id}`, { method: 'DELETE' }),
};

// ─── Accounts API ─────────────────────────────────────────────────────────────
export const accountsApi = {
  getAll: (params?: Record<string, string>) => apiRequest(`/accounts${qs(params)}`),
  getSummary: (params?: Record<string, string>) => apiRequest(`/accounts/summary${qs(params)}`),
  create: (data: unknown) => apiRequest('/accounts', { method: 'POST', body: data }),
  delete: (id: string) => apiRequest(`/accounts/${id}`, { method: 'DELETE' }),
};

// ─── Lab Reports API ──────────────────────────────────────────────────────────
export const labApi = {
  getAll: (params?: Record<string, string>) => apiRequest(`/lab-reports${qs(params)}`),
  create: (data: unknown) => apiRequest('/lab-reports', { method: 'POST', body: data }),
  delete: (id: string) => apiRequest(`/lab-reports/${id}`, { method: 'DELETE' }),
};

// ─── Ledger API - Purchase ────────────────────────────────────────────────────
export const ledgerApi = {
  // Purchase Ledger
  getPurchase: (params?: Record<string, string>) => apiRequest(`/ledger/purchase${qs(params)}`),
  getPurchaseBySupplier: (supplierProfileId: string) => apiRequest(`/ledger/purchase/by-supplier/${supplierProfileId}`),
  getPurchaseSummary: () => apiRequest('/ledger/purchase/summary'),
  getSupplierBalance: (supplierProfileId: string) => apiRequest(`/ledger/purchase/by-supplier/${supplierProfileId}`),
  createPurchase: (data: unknown) => apiRequest('/ledger/purchase', { method: 'POST', body: data }),
  bulkCreatePurchase: (data: unknown) => apiRequest('/ledger/purchase/bulk', { method: 'POST', body: data }),
  updatePurchase: (id: string, data: unknown) => apiRequest(`/ledger/purchase/${id}`, { method: 'PUT', body: data }),
  deletePurchase: (id: string) => apiRequest(`/ledger/purchase/${id}`, { method: 'DELETE' }),

  // Sale Ledger
  getSale: (params?: Record<string, string>) => apiRequest(`/ledger/sale${qs(params)}`),
  getSaleByCustomer: (customerProfileId: string) => apiRequest(`/ledger/sale/by-customer/${customerProfileId}`),
  getSaleSummary: () => apiRequest('/ledger/sale/summary'),
  getCustomerBalance: (customerProfileId: string) => apiRequest(`/ledger/sale/by-customer/${customerProfileId}`),
  createSale: (data: unknown) => apiRequest('/ledger/sale', { method: 'POST', body: data }),
  bulkCreateSale: (data: unknown) => apiRequest('/ledger/sale/bulk', { method: 'POST', body: data }),
  updateSale: (id: string, data: unknown) => apiRequest(`/ledger/sale/${id}`, { method: 'PUT', body: data }),
  deleteSale: (id: string) => apiRequest(`/ledger/sale/${id}`, { method: 'DELETE' }),

  // Supplier Profiles (cheema_saved_suppliers)
  getSuppliers: (params?: Record<string, string>) => apiRequest(`/ledger/suppliers${qs(params)}`),
  createSupplier: (data: unknown) => apiRequest('/ledger/suppliers', { method: 'POST', body: data }),
  updateSupplier: (id: string, data: unknown) => apiRequest(`/ledger/suppliers/${id}`, { method: 'PUT', body: data }),
  deleteSupplier: (id: string) => apiRequest(`/ledger/suppliers/${id}`, { method: 'DELETE' }),

  // Customer Profiles (cheema_saved_customers)
  getCustomers: (params?: Record<string, string>) => apiRequest(`/ledger/customers${qs(params)}`),
  createCustomer: (data: unknown) => apiRequest('/ledger/customers', { method: 'POST', body: data }),
  updateCustomer: (id: string, data: unknown) => apiRequest(`/ledger/customers/${id}`, { method: 'PUT', body: data }),
  deleteCustomer: (id: string) => apiRequest(`/ledger/customers/${id}`, { method: 'DELETE' }),

  // Reset All (Admin)
  resetAll: () => apiRequest('/ledger/reset-all', { method: 'POST' }),

  // Purchase Drafts
  getDraftsForDate: (date: string) => apiRequest(`/ledger/purchase-drafts/${date}`),
  getDraft: (date: string, supplierId: string) => apiRequest(`/ledger/purchase-drafts/${date}/${supplierId}`),
  saveDraft: (data: { date: string; supplierId: string; draftData: unknown }) =>
    apiRequest('/ledger/purchase-drafts', { method: 'POST', body: data }),
  deleteDraft: (date: string, supplierId: string) =>
    apiRequest(`/ledger/purchase-drafts/${date}/${supplierId}`, { method: 'DELETE' }),
};

// ─── Settings API (localStorage replacements) ─────────────────────────────────
export const settingsApi = {
  getAll: () => apiRequest('/settings'),
  get: (key: string) => apiRequest(`/settings/${key}`),
  set: (key: string, value: unknown, description?: string) =>
    apiRequest(`/settings/${key}`, { method: 'PUT', body: { value, description } }),
  bulkSet: (settings: Record<string, unknown>) =>
    apiRequest('/settings/bulk', { method: 'POST', body: { settings } }),
  delete: (key: string) => apiRequest(`/settings/${key}`, { method: 'DELETE' }),
};

// ─── Dashboard API ────────────────────────────────────────────────────────────
export const dashboardApi = {
  getSummary: () => apiRequest('/dashboard/summary'),
  getPnL: (params?: Record<string, string>) => apiRequest(`/dashboard/pnl${qs(params)}`),
  getDriverReport: (driverId: string, params?: Record<string, string>) =>
    apiRequest(`/dashboard/driver-report/${driverId}${qs(params)}`),
};

// ─── Sync Logs API ────────────────────────────────────────────────────────────
export const syncLogsApi = {
  getAll: () => apiRequest('/sync-logs'),
  create: (data: unknown) => apiRequest('/sync-logs', { method: 'POST', body: data }),
};
