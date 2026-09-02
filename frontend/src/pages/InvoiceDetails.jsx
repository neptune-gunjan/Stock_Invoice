import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function InvoiceDetails() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get(
        `/invoices/${invoiceId}`
      );

      setInvoice(response.data);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to load invoice."
      );
    } finally {
      setLoading(false);
    }
  }

  async function downloadInvoice() {
    try {
      setDownloading(true);
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
      setDownloading(false);
    }
  }

  function formatDate(dateString) {
    if (!dateString) return "-";

    return new Date(dateString).toLocaleString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  function currency(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
  }

  if (loading) {
    return (
      <div className="invoice-page">
        <div className="empty-state">
          Loading invoice...
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="invoice-page">
        <div className="alert error">
          {error || "Invoice not found."}
        </div>

        <button
          className="secondary-button"
          onClick={() => navigate("/invoices")}
        >
          ← Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="invoice-page">
      {/* Header */}

      <div className="page-header">
        <div>
          <button
            className="secondary-button"
            onClick={() => navigate("/invoices")}
          >
            ← Back to Invoices
          </button>

          <h1 style={{ marginTop: "16px" }}>
            {invoice.invoice_number}
          </h1>

          <p>
            Created on{" "}
            {formatDate(invoice.created_at)}
          </p>
        </div>

        <button
          className="primary-button"
          onClick={downloadInvoice}
          disabled={downloading}
        >
          {downloading
            ? "Opening PDF..."
            : "Download PDF"}
        </button>
      </div>

      {/* Invoice information */}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-label">
            Invoice Status
          </div>

          <div className="card-value">
            {invoice.status}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-label">
            Payment Status
          </div>

          <div className="card-value">
            {invoice.payment_status}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-label">
            Payment Method
          </div>

          <div className="card-value">
            {invoice.payment_method || "-"}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-label">
            Total Amount
          </div>

          <div className="card-value">
            {currency(invoice.total_amount)}
          </div>
        </div>
      </div>

      {/* Customer / Invoice info */}

      <div className="dashboard-card">
        <h2>Invoice Information</h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            marginTop: "20px",
          }}
        >
          <div>
            <strong>Invoice Number</strong>
            <p>{invoice.invoice_number}</p>
          </div>

          <div>
            <strong>Customer ID</strong>
            <p>
              {invoice.customer_id ||
                "Walk-in Customer"}
            </p>
          </div>

          <div>
            <strong>Transaction ID</strong>
            <p>
              {invoice.transaction_id}
            </p>
          </div>

          <div>
            <strong>Created At</strong>
            <p>
              {formatDate(invoice.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}

      <div className="dashboard-card">
        <h2>Items</h2>

        {!invoice.items ||
        invoice.items.length === 0 ? (
          <div className="empty-state">
            No invoice items found.
          </div>
        ) : (
          <div
            style={{
              overflowX: "auto",
              marginTop: "20px",
            }}
          >
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>

              <tbody>
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>
                        {item.stock_name}
                      </strong>
                    </td>

                    <td>{item.unit}</td>

                    <td>{item.qty}</td>

                    <td>
                      {currency(item.unit_price)}
                    </td>

                    <td>
                      <strong>
                        {currency(item.line_total)}
                      </strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}

      <div className="dashboard-card">
        <h2>Payment Summary</h2>

        <div
          style={{
            maxWidth: "420px",
            marginLeft: "auto",
            marginTop: "20px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <span>Subtotal</span>

            <strong>
              {currency(invoice.subtotal)}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <span>Discount</span>

            <strong>
              - {currency(invoice.discount)}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <span>
              Tax ({invoice.tax_rate}%)
            </span>

            <strong>
              {currency(invoice.tax_amount)}
            </strong>
          </div>

          <hr />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "15px 0",
              fontSize: "20px",
            }}
          >
            <span>
              <strong>Total</strong>
            </span>

            <strong>
              {currency(invoice.total_amount)}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
}

export default InvoiceDetails;