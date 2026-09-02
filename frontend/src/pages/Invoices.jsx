import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Invoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    loadInvoices();
    loadCustomers();
    }, []);

  async function loadInvoices() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/invoices");
      setInvoices(response.data || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to load invoices."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
        const response = await api.get("/customers");
        setCustomers(response.data || []);
    } catch (err) {
        console.error("Unable to load customers:", err);
    }
    }

  async function downloadInvoice(invoiceId) {
    try {
      setDownloading(invoiceId);
      setError("");

      const response = await api.get(
        `/invoices/${invoiceId}/pdf`,
        {
          responseType: "blob",
        }
      );

      const blob = new Blob([response.data], {
        type: "application/pdf",
      });

      const url = window.URL.createObjectURL(blob);

      window.open(url, "_blank");

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to open invoice PDF."
      );
    } finally {
      setDownloading(null);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "-";

    return new Date(dateString).toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  function formatCurrency(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
  }

  function getCustomerName(invoice) {
    if (!invoice.customer_id) {
        return "Walk-in Customer";
    }

    const customer = customers.find(
        (item) => item.id === invoice.customer_id
    );

    return customer?.name || "Unknown Customer";
    }

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const customerName =
        getCustomerName(invoice);

        const matchesSearch =
        !query ||
        invoice.invoice_number
            ?.toLowerCase()
            .includes(query) ||
        customerName
            ?.toLowerCase()
            .includes(query) ||
        invoice.customer_id
            ?.toLowerCase()
            .includes(query) ||
        invoice.payment_method
            ?.toLowerCase()
            .includes(query);

      const matchesPayment =
        paymentFilter === "all" ||
        invoice.payment_status === paymentFilter;

      const matchesStatus =
        statusFilter === "all" ||
        invoice.status === statusFilter;

      return (
        matchesSearch &&
        matchesPayment &&
        matchesStatus
      );
    });
  }, [
    invoices,
    customers,
    search,
    paymentFilter,
    statusFilter,
  ]);

  const totalInvoices = invoices.length;

  const totalSales = invoices.reduce(
    (sum, invoice) =>
      sum + Number(invoice.total_amount || 0),
    0
  );

  const paidInvoices = invoices.filter(
    (invoice) => invoice.payment_status === "paid"
  ).length;

  const pendingInvoices = invoices.filter(
    (invoice) =>
      invoice.payment_status === "pending"
  ).length;

  return (
    <div className="invoice-page">
      <div className="page-header">
        <div>
          <h1>Invoices</h1>
          <p>
            Manage and view all your invoices.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() =>
            navigate("/create-invoice")
          }
        >
          + Create Invoice
        </button>
      </div>

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      {/* Summary */}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-label">
            Total Invoices
          </div>

          <div className="card-value">
            {totalInvoices}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-label">
            Total Sales
          </div>

          <div className="card-value">
            {formatCurrency(totalSales)}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-label">
            Paid
          </div>

          <div className="card-value">
            {paidInvoices}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-label">
            Pending
          </div>

          <div className="card-value">
            {pendingInvoices}
          </div>
        </div>
      </div>

      {/* Filters */}

      <div className="dashboard-card">
        <div
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            type="text"
            placeholder="Search invoice number, customer..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
            style={{
              flex: "1",
              minWidth: "240px",
            }}
          />

          <select
            value={paymentFilter}
            onChange={(e) =>
              setPaymentFilter(e.target.value)
            }
          >
            <option value="all">
              All Payments
            </option>
            <option value="paid">Paid</option>
            <option value="pending">
              Pending
            </option>
            <option value="partial">
              Partial
            </option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value)
            }
          >
            <option value="all">
              All Status
            </option>
            <option value="issued">
              Issued
            </option>
            <option value="draft">
              Draft
            </option>
            <option value="cancelled">
              Cancelled
            </option>
          </select>

          <button
            className="secondary-button"
            onClick={loadInvoices}
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Invoice table */}

      <div className="dashboard-card">
        <div className="page-header">
          <div>
            <h2>Invoice History</h2>
            <p>
              {filteredInvoices.length} invoice
              {filteredInvoices.length !== 1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading invoices...
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="empty-state">
            No invoices found.
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Subtotal</th>
                  <th>Discount</th>
                  <th>Tax</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Method</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map(
                  (invoice) => (
                    <tr key={invoice.id}>
                      <td>
                        <button
                            className="secondary-button"
                            onClick={() =>
                            navigate(`/invoices/${invoice.id}`)
                            }
                        >
                            {invoice.invoice_number}
                        </button>
                        </td>

                      <td>
                        {getCustomerName(invoice)}
                      </td>

                      <td>
                        {formatDate(
                          invoice.created_at
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          invoice.subtotal
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          invoice.discount
                        )}
                      </td>

                      <td>
                        {formatCurrency(
                          invoice.tax_amount
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatCurrency(
                            invoice.total_amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={`status-badge ${invoice.payment_status}`}
                        >
                          {invoice.payment_status}
                        </span>
                      </td>

                      <td>
                        {invoice.payment_method ||
                          "-"}
                      </td>

                      <td>
                        <button
                          className="secondary-button"
                          onClick={() =>
                            downloadInvoice(
                              invoice.id
                            )
                          }
                          disabled={
                            downloading ===
                            invoice.id
                          }
                        >
                          {downloading ===
                          invoice.id
                            ? "Opening..."
                            : "PDF"}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Invoices;