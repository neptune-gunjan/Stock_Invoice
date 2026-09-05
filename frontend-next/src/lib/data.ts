/**
 * Backend-shaped API types, endpoint functions, and React Query hooks.
 *
 * Field names mirror the FastAPI response models (snake_case), so the
 * frontend uses the same data shape as the backend.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from '@tanstack/react-query';

import { apiBlob, apiJson, apiVoid } from './api';
import { getStoredUser } from './auth';

/* ============================================================================
 * Types
 * ========================================================================== */

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

  paid_amount: number;
  remaining_amount: number;
  payment_status: string;

  created_at: string;
  items: TransactionItem[];
}

export interface CustomerSummary {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  total_invoices: number;
  total_purchase: number;
  total_paid: number;
  total_due: number;
  last_purchase_at: string | null;
  customer_since: string;
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
  paid_amount?: number;
  remaining_amount?: number;
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
  sku: string | null;
  unit: string;
  quantity_available: number;
  low_stock_threshold: number;
}

export interface PaymentInput {
  amount: number;
  payment_method: string;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: string;
  created_at: string;
}

export interface Business {
  id: string;
  business_name: string;
  owner_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  invoice_prefix: string;
  logo_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SalesData {
  date: string;
  sales: number | string;
  invoice_count: number;
}

/* ============================================================================
 * API Endpoints
 * ========================================================================== */

export const endpoints = {
  /* --------------------------------------------------------------------------
   * Stock
   * ------------------------------------------------------------------------ */

  listStock: () =>
    apiJson<StockItem[]>('/stock'),

  createStock: (input: StockInput) =>
    apiJson<StockItem>('/stock', {
      method: 'POST',
      body: input,
    }),

  updateStock: (id: string, input: Partial<StockInput>) =>
    apiJson<StockItem>(`/stock/${id}`, {
      method: 'PATCH',
      body: input,
    }),

  deleteStock: (id: string) =>
    apiVoid(`/stock/${id}`, {
      method: 'DELETE',
    }),

  importStock: (file: File) => {
    const form = new FormData();
    form.append('file', file);

    return apiJson<StockItem[]>('/stock/import', {
      method: 'POST',
      body: form,
    });
  },

  /* --------------------------------------------------------------------------
   * Extraction
   * ------------------------------------------------------------------------ */

  extract: (file: File) => {
    const form = new FormData();
    form.append('file', file);

    return apiJson<ExtractionJob>('/extract', {
      method: 'POST',
      body: form,
    });
  },

  matchJob: (jobId: string) =>
    apiJson<ExtractedItem[]>(`/match/${jobId}`, {
      method: 'POST',
    }),

  getJob: (jobId: string) =>
    apiJson<ExtractionJob>(`/extract/${jobId}`),

  /* --------------------------------------------------------------------------
   * Confirmation / Transaction
   * ------------------------------------------------------------------------ */

  confirm: (payload: ConfirmRequest) =>
    apiJson<Transaction>('/confirm', {
      method: 'POST',
      body: payload,
    }),

  getTransaction: (transactionId: string) =>
    apiJson<Transaction>(`/transactions/${transactionId}`),

  /* --------------------------------------------------------------------------
   * Invoices
   * ------------------------------------------------------------------------ */

  listInvoices: () =>
    apiJson<Invoice[]>('/invoices'),

  getInvoice: (id: string) =>
    apiJson<InvoiceDetail>(`/invoices/${id}`),

  invoicePdf: (id: string) =>
    apiBlob(`/invoices/${id}/pdf`),

  cancelInvoice: (invoiceId: string) =>
    apiJson<Invoice>(`/invoices/${invoiceId}/cancel`, {
      method: 'PATCH',
    }),

  /* --------------------------------------------------------------------------
   * Customers
   * ------------------------------------------------------------------------ */

  listCustomers: () =>
    apiJson<Customer[]>('/customers'),

  createCustomer: (name: string, phone?: string) =>
    apiJson<Customer>('/customers', {
      method: 'POST',
      body: {
        name,
        phone: phone || null,
      },
    }),

  customerTransactions: (customerId: string) =>
    apiJson<Transaction[]>(
      `/customers/${customerId}/transactions`,
    ),

  customerSummary: (customerId: string) =>
    apiJson<CustomerSummary>(
      `/customers/${customerId}/summary`,
    ),

  /* --------------------------------------------------------------------------
   * Payments
   * ------------------------------------------------------------------------ */

  listPayments: (invoiceId: string) =>
    apiJson<Payment[]>(`/invoices/${invoiceId}/payments`),

  addPayment: (invoiceId: string, input: PaymentInput) =>
    apiJson<Payment>(`/invoices/${invoiceId}/payments`, {
      method: 'POST',
      body: input,
    }),

  getPayment: (paymentId: string) =>
    apiJson<Payment>(`/invoices/payments/${paymentId}`),

  /* --------------------------------------------------------------------------
   * Dashboard
   * ------------------------------------------------------------------------ */

  dashboardSummary: () =>
    apiJson<DashboardSummary>('/dashboard'),

  recentInvoices: () =>
    apiJson<RecentInvoice[]>('/dashboard/recent-invoices'),

  lowStock: () =>
    apiJson<LowStockProduct[]>('/dashboard/low-stock'),

  dashboardSales: () =>
    apiJson<SalesData[]>('/dashboard/sales'),

  /* --------------------------------------------------------------------------
   * Business
   * ------------------------------------------------------------------------ */

  getBusiness: () =>
    apiJson<Business>('/business'),

  createBusiness: (input: Partial<Business>) =>
    apiJson<Business>('/business', {
      method: 'POST',
      body: input,
    }),

  updateBusiness: (
    businessId: string,
    input: Partial<Business>,
  ) =>
    apiJson<Business>(`/business/${businessId}`, {
      method: 'PATCH',
      body: input,
    }),
};

/* ============================================================================
 * React Query Keys
 * ========================================================================== */

export const queryKeys = {
  stock: ['stock'] as const,

  invoices: ['invoices'] as const,

  invoice: (id: string) =>
    ['invoices', id] as const,

  invoicePayments: (id: string) =>
    ['invoices', id, 'payments'] as const,

  customers: ['customers'] as const,

  customerTransactions: (id: string) =>
    ['customers', id, 'transactions'] as const,

  customerSummary: (id: string) =>
    ['customers', id, 'summary'] as const,

  dashboard: ['dashboard'] as const,

  recentInvoices: ['dashboard', 'recent-invoices'] as const,

  lowStock: ['dashboard', 'low-stock'] as const,

  dashboardSales: ['dashboard', 'sales'] as const,

  extractionJob: (id: string) =>
    ['extraction-job', id] as const,

  payment: (id: string) =>
    ['payments', id] as const,

  business: ['business'] as const,

  transaction: (id: string) =>
    ['transactions', id] as const,
};

/* ============================================================================
 * Stock Queries
 * ========================================================================== */

export function useStock(
  options?: Partial<UseQueryOptions<StockItem[]>>,
) {
  return useQuery({
    queryKey: queryKeys.stock,
    queryFn: endpoints.listStock,
    ...options,
  });
}

/* ============================================================================
 * Invoice Queries
 * ========================================================================== */

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: endpoints.listInvoices,
  });
}

export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoice(id ?? ''),
    queryFn: () => endpoints.getInvoice(id as string),
    enabled: Boolean(id),
  });
}

export function useInvoicePayments(
  invoiceId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.invoicePayments(invoiceId ?? ''),
    queryFn: () =>
      endpoints.listPayments(invoiceId as string),
    enabled: Boolean(invoiceId),
  });
}

/* ============================================================================
 * Customer Queries
 * ========================================================================== */

export function useCustomers() {
  return useQuery({
    queryKey: queryKeys.customers,
    queryFn: endpoints.listCustomers,
  });
}

export function useCustomerTransactions(
  customerId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.customerTransactions(customerId ?? ''),
    queryFn: () =>
      endpoints.customerTransactions(customerId as string),
    enabled: Boolean(customerId),
  });
}

export function useCustomerSummary(customerId: string) {
  return useQuery({
    queryKey: queryKeys.customerSummary(customerId),
    queryFn: () => endpoints.customerSummary(customerId),
    enabled: Boolean(customerId),
  });
}

/* ============================================================================
 * Dashboard Queries
 * ========================================================================== */

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: endpoints.dashboardSummary,
  });
}

export function useRecentInvoices() {
  return useQuery({
    queryKey: queryKeys.recentInvoices,
    queryFn: endpoints.recentInvoices,
  });
}

export function useLowStock() {
  return useQuery({
    queryKey: queryKeys.lowStock,
    queryFn: endpoints.lowStock,
  });
}

export function useDashboardSales() {
  return useQuery({
    queryKey: queryKeys.dashboardSales,
    queryFn: endpoints.dashboardSales,
  });
}

/* ============================================================================
 * Extraction Queries
 * ========================================================================== */

export function useExtractionJob(
  jobId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.extractionJob(jobId ?? ''),
    queryFn: () =>
      endpoints.getJob(jobId as string),
    enabled: Boolean(jobId),
  });
}

/* ============================================================================
 * Payment Queries
 * ========================================================================== */

export function usePayment(
  paymentId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.payment(paymentId ?? ''),
    queryFn: () =>
      endpoints.getPayment(paymentId as string),
    enabled: Boolean(paymentId),
  });
}

/* ============================================================================
 * Business Queries
 * ========================================================================== */

export function useBusiness() {
  return useQuery({
    queryKey: queryKeys.business,
    queryFn: endpoints.getBusiness,
    refetchOnMount: 'always',
  });
}

/* ============================================================================
 * Transaction Queries
 * ========================================================================== */

export function useTransaction(
  transactionId: string | undefined,
) {
  return useQuery({
    queryKey: queryKeys.transaction(transactionId ?? ''),
    queryFn: () =>
      endpoints.getTransaction(transactionId as string),
    enabled: Boolean(transactionId),
  });
}

/* ============================================================================
 * Stock Mutations
 * ========================================================================== */

export function useStockMutations() {
  const queryClient = useQueryClient();

  const invalidateStock = () => {
    return queryClient.invalidateQueries({
      queryKey: queryKeys.stock,
    });
  };

  const create = useMutation({
    mutationFn: endpoints.createStock,

    onSuccess: invalidateStock,
  });

  const update = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: Partial<StockInput>;
    }) => endpoints.updateStock(id, input),

    onSuccess: invalidateStock,
  });

  const remove = useMutation({
    mutationFn: endpoints.deleteStock,

    onSuccess: invalidateStock,
  });

  return {
    create,
    update,
    remove,
  };
}

/* ============================================================================
 * Extraction Mutations
 * ========================================================================== */

export function useExtract() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: endpoints.extract,

    onSuccess: (job) => {
      queryClient.setQueryData(
        queryKeys.extractionJob(job.id),
        job,
      );
    },
  });
}

export function useMatchJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: endpoints.matchJob,

    onSuccess: (_, jobId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.extractionJob(jobId),
      });
    },
  });
}

/* ============================================================================
 * Invoice Mutations
 * ========================================================================== */

export function useInvoiceMutations() {
  const queryClient = useQueryClient();

  const cancel = useMutation({
    mutationFn: endpoints.cancelInvoice,

    onSuccess: (_, invoiceId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.invoice(invoiceId),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.recentInvoices,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.stock,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.lowStock,
      });
    },
  });

  const addPayment = useMutation({
    mutationFn: ({
      invoiceId,
      input,
    }: {
      invoiceId: string;
      input: PaymentInput;
    }) =>
      endpoints.addPayment(invoiceId, input),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.invoice(
          variables.invoiceId,
        ),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.invoicePayments(
          variables.invoiceId,
        ),
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.recentInvoices,
      });
    },
  });

  return {
    cancel,
    addPayment,
  };
}

/* ============================================================================
 * Transaction Mutations
 * ========================================================================== */

export function useConfirmTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: endpoints.confirm,

    onSuccess: (transaction) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stock,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.invoices,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.recentInvoices,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.lowStock,
      });

      queryClient.setQueryData(
        queryKeys.transaction(transaction.id),
        transaction,
      );
    },
  });
}

/* ============================================================================
 * Import Stock
 * ========================================================================== */

export function useImportStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: endpoints.importStock,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.stock,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.lowStock,
      });
    },
  });
}

/* ============================================================================
 * Business Mutations
 * ========================================================================== */

export function useBusinessMutations() {
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: endpoints.createBusiness,

    onSuccess: (business) => {
      queryClient.setQueryData(
        queryKeys.business,
        business,
      );
    },
  });

  const update = useMutation({
    mutationFn: ({
      businessId,
      input,
    }: {
      businessId: string;
      input: Partial<Business>;
    }) =>
      endpoints.updateBusiness(
        businessId,
        input,
      ),

    onSuccess: (business) => {
      queryClient.setQueryData(
        queryKeys.business,
        business,
      );
    },
  });

  return {
    create,
    update,
  };
}

/* ============================================================================
 * Convenience Helpers
 * ========================================================================== */

/**
 * Signed-in user's display information.
 *
 * User information is read from the locally stored login response.
 */
export function useProfile() {
  const user = getStoredUser();

  return {
    ownerName: user?.name ?? 'Shop owner',
    email: user?.email ?? '',
    businessId: user?.business_id ?? null,
    isActive: user?.is_active ?? false,
  };
}

/**
 * Format a numeric amount as Indian Rupees.
 */
export function money(
  value: number | null | undefined,
): string {
  return `₹${Number(value ?? 0).toFixed(2)}`;
}

