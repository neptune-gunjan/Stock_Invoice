/**
 * Backend-shaped types, endpoint functions, and React Query hooks.
 *
 * Field names mirror the FastAPI response models (snake_case) so there is
 * exactly one shape to reason about between the wire and the components.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { apiBlob, apiJson, apiVoid } from './api';
import { getStoredUser } from './auth';

/* ----------------------------------------------------------------------------
 * Types
 * ------------------------------------------------------------------------- */

export interface StockItem {
  id: string;
  name: string;
  sku: string | null;
  aliases: string[];
  unit: string;
  unit_price: number;
  quantity_available: number;
  low_stock_threshold: number;
  created_at: string;
  updated_at: string;
}

export interface StockInput {
  name: string;
  sku?: string | null;
  unit: string;
  unit_price: number;
  quantity_available: number;
  low_stock_threshold?: number;
  aliases?: string[];
}

export interface ExtractedItem {
  id: string;
  extraction_job_id: string;
  raw_text: string;
  qty: number | null;
  unit: string | null;
  matched_stock_id: string | null;
  matched_stock_name: string | null;
  confidence_score: number | null;
  needs_review: boolean;
  created_at: string;
}

export interface ExtractionJob {
  id: string;
  image_path: string;
  status: 'pending' | 'success' | 'failed';
  error_message: string | null;
  created_at: string;
  items: ExtractedItem[];
}

export interface ConfirmItemInput {
  stock_id: string;
  qty: number;
  extracted_item_id?: string | null;
}

export interface ConfirmRequest {
  extraction_job_id?: string | null;
  customer_id?: string | null;
  items: ConfirmItemInput[];
  discount?: number;
  tax_rate?: number;
}

export interface TransactionItem {
  id: string;
  stock_id: string;
  stock_name: string;
  unit: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface Transaction {
  id: string;
  invoice_id: string;
  invoice_number: string;
  customer_id: string | null;
  status: string;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  created_at: string;
  items: TransactionItem[];
}

export interface Invoice {
  id: string;
  invoice_number: string;
  transaction_id: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method: string | null;
  pdf_path: string | null;
  created_at: string;
}

export interface InvoiceItem {
  id: string;
  stock_id: string;
  stock_name: string;
  unit: string;
  qty: number;
  unit_price: number;
  line_total: number;
}

export interface InvoiceDetail extends Invoice {
  items: InvoiceItem[];
  paid_amount: number;
  remaining_amount: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  created_at: string;
}

export interface DashboardSummary {
  total_sales: number;
  total_invoices: number;
  total_paid: number;
  outstanding_amount: number;
  total_customers: number;
  total_products: number;
  low_stock_products: number;
}

export interface RecentInvoice {
  id: string;
  invoice_number: string;
  customer_name: string | null;
  total_amount: number;
  payment_status: string;
  created_at: string;
}

export interface LowStockProduct {
  id: string;
  name: string;
  sku: string;
  unit: string;
  quantity_available: number;
  low_stock_threshold: number;
}

/* ----------------------------------------------------------------------------
 * Endpoint functions
 * ------------------------------------------------------------------------- */

export const endpoints = {
  listStock: () => apiJson<StockItem[]>('/stock'),
  createStock: (input: StockInput) => apiJson<StockItem>('/stock', { method: 'POST', body: input }),
  updateStock: (id: string, input: Partial<StockInput>) =>
    apiJson<StockItem>(`/stock/${id}`, { method: 'PATCH', body: input }),
  deleteStock: (id: string) => apiVoid(`/stock/${id}`, { method: 'DELETE' }),

  extract: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiJson<ExtractionJob>('/extract', { method: 'POST', body: form });
  },
  matchJob: (jobId: string) => apiJson<ExtractedItem[]>(`/match/${jobId}`, { method: 'POST' }),
  getJob: (jobId: string) => apiJson<ExtractionJob>(`/extract/${jobId}`),

  confirm: (payload: ConfirmRequest) =>
    apiJson<Transaction>('/confirm', { method: 'POST', body: payload }),

  listInvoices: () => apiJson<Invoice[]>('/invoices'),
  getInvoice: (id: string) => apiJson<InvoiceDetail>(`/invoices/${id}`),
  invoicePdf: (id: string) => apiBlob(`/invoices/${id}/pdf`),

  listCustomers: () => apiJson<Customer[]>('/customers'),
  createCustomer: (name: string, phone?: string) =>
    apiJson<Customer>('/customers', { method: 'POST', body: { name, phone: phone || null } }),

  dashboardSummary: () => apiJson<DashboardSummary>('/dashboard'),
  recentInvoices: () => apiJson<RecentInvoice[]>('/dashboard/recent-invoices'),
  lowStock: () => apiJson<LowStockProduct[]>('/dashboard/low-stock'),
};

/* ----------------------------------------------------------------------------
 * React Query hooks
 * ------------------------------------------------------------------------- */

export const queryKeys = {
  stock: ['stock'] as const,
  invoices: ['invoices'] as const,
  invoice: (id: string) => ['invoices', id] as const,
  customers: ['customers'] as const,
  dashboard: ['dashboard'] as const,
  recentInvoices: ['dashboard', 'recent-invoices'] as const,
  lowStock: ['dashboard', 'low-stock'] as const,
};

export function useStock(options?: Partial<UseQueryOptions<StockItem[]>>) {
  return useQuery({ queryKey: queryKeys.stock, queryFn: endpoints.listStock, ...options });
}

export function useInvoices() {
  return useQuery({ queryKey: queryKeys.invoices, queryFn: endpoints.listInvoices });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoice(id ?? ''),
    queryFn: () => endpoints.getInvoice(id as string),
    enabled: Boolean(id),
  });
}

export function useCustomers() {
  return useQuery({ queryKey: queryKeys.customers, queryFn: endpoints.listCustomers });
}

export function useDashboard() {
  return useQuery({ queryKey: queryKeys.dashboard, queryFn: endpoints.dashboardSummary });
}

export function useRecentInvoices() {
  return useQuery({ queryKey: queryKeys.recentInvoices, queryFn: endpoints.recentInvoices });
}

export function useLowStock() {
  return useQuery({ queryKey: queryKeys.lowStock, queryFn: endpoints.lowStock });
}

export function useStockMutations() {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: queryKeys.stock });

  const create = useMutation({ mutationFn: endpoints.createStock, onSuccess: invalidate });
  const update = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<StockInput> }) =>
      endpoints.updateStock(id, input),
    onSuccess: invalidate,
  });
  const remove = useMutation({ mutationFn: endpoints.deleteStock, onSuccess: invalidate });

  return { create, update, remove };
}

/* ----------------------------------------------------------------------------
 * Convenience
 * ------------------------------------------------------------------------- */

/** The signed-in user's display info, read from the cached login response. */
export function useProfile() {
  const user = getStoredUser();
  return {
    ownerName: user?.name ?? 'Shop owner',
    email: user?.email ?? '',
    shopName: 'Your shop',
  };
}

export const money = (n: number) => `₹${Number(n || 0).toFixed(2)}`;
