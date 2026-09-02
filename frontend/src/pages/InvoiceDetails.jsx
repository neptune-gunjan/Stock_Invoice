import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function InvoiceDetails() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [customer, setCustomer] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [downloading, setDownloading] =
    useState(false);

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

      const invoiceData = response.data;

      setInvoice(invoiceData);

      /*
       * Load customer information
       */
      if (invoiceData.customer_id) {
        try {
          const customerResponse =
            await api.get("/customers");

          const customers =
            customerResponse.data || [];

          const foundCustomer =
            customers.find(
              (item) =>
                item.id ===
                invoiceData.customer_id
            );

          setCustomer(foundCustomer || null);
        } catch (customerError) {
          console.error(
            "Unable to load customer:",
            customerError
          );
        }
      }
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

      const url =
        window.URL.createObjectURL(blob);

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

  function printInvoice() {
    window.print();
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

  function statusClass(status) {
    if (!status) {
      return "status-badge";
    }

    return `status-badge ${String(
      status
    ).toLowerCase()}`;
  }

  function capitalize(value) {
    if (!value) return "-";

    return String(value)
      .charAt(0)
      .toUpperCase() +
      String(value).slice(1);
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

      <div className="page-header invoice-header">
        <div>
          <button
            className="secondary-button no-print"
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

        <div
          className="no-print"
          style={{
            display: "flex",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
          <button
            className="secondary-button"
            onClick={printInvoice}
          >
            🖨 Print
          </button>

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
      </div>

      {error && (
        <div className="alert error no-print">
          {error}
        </div>
      )}

      {/* Status Summary */}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="card-label">
            Invoice Status
          </div>

          <div style={{ marginTop: "10px" }}>
            <span
              className={statusClass(
                invoice.status
              )}
            >
              {capitalize(invoice.status)}
            </span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-label">
            Payment Status
          </div>

          <div style={{ marginTop: "10px" }}>
            <span
              className={statusClass(
                invoice.payment_status
              )}
            >
              {capitalize(
                invoice.payment_status
              )}
            </span>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-label">
            Payment Method
          </div>

          <div className="card-value">
            {invoice.payment_method
              ? capitalize(
                  invoice.payment_method
                )
              : "-"}
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

      {/* Customer Information */}

      <div className="dashboard-card">
        <h2>Customer Information</h2>

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
            <strong>Name</strong>

            <p>
              {customer?.name ||
                (invoice.customer_id
                  ? "Unknown Customer"
                  : "Walk-in Customer")}
            </p>
          </div>

          <div>
            <strong>Phone</strong>

            <p>
              {customer?.phone || "-"}
            </p>
          </div>

          <div>
            <strong>Email</strong>

            <p>
              {customer?.email || "-"}
            </p>
          </div>

          <div>
            <strong>GSTIN</strong>

            <p>
              {customer?.gstin || "-"}
            </p>
          </div>

          <div>
            <strong>Customer ID</strong>

            <p>
              {invoice.customer_id || "-"}
            </p>
          </div>
        </div>
      </div>

      {/* Invoice Information */}

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

            <p>
              {invoice.invoice_number}
            </p>
          </div>

          <div>
            <strong>Invoice Date</strong>

            <p>
              {formatDate(invoice.created_at)}
            </p>
          </div>

          <div>
            <strong>Transaction ID</strong>

            <p
              style={{
                wordBreak: "break-all",
              }}
            >
              {invoice.transaction_id || "-"}
            </p>
          </div>

          <div>
            <strong>Invoice ID</strong>

            <p
              style={{
                wordBreak: "break-all",
              }}
            >
              {invoice.id}
            </p>
          </div>
        </div>
      </div>

      {/* Items */}

      <div className="dashboard-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div>
            <h2>Invoice Items</h2>

            <p
              style={{
                marginTop: "5px",
              }}
            >
              {invoice.items?.length || 0} item
              {invoice.items?.length !== 1
                ? "s"
                : ""}
            </p>
          </div>
        </div>

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
                  <th>#</th>
                  <th>Product</th>
                  <th>Unit</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Line Total</th>
                </tr>
              </thead>

              <tbody>
                {invoice.items.map(
                  (item, index) => (
                    <tr key={item.id}>
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {item.stock_name ||
                            "-"}
                        </strong>
                      </td>

                      <td>
                        {item.unit || "-"}
                      </td>

                      <td>
                        {item.qty}
                      </td>

                      <td>
                        {currency(
                          item.unit_price
                        )}
                      </td>

                      <td>
                        <strong>
                          {currency(
                            item.line_total
                          )}
                        </strong>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Summary */}

      <div className="dashboard-card">
        <h2>Payment Summary</h2>

        <div
          style={{
            maxWidth: "480px",
            marginLeft: "auto",
            marginTop: "20px",
          }}
        >
          {/* Subtotal */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <span>
              Subtotal
            </span>

            <strong>
              {currency(invoice.subtotal)}
            </strong>
          </div>

          {/* Discount */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <span>
              Discount
            </span>

            <strong>
              - {currency(invoice.discount)}
            </strong>
          </div>

          {/* Tax */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "10px 0",
            }}
          >
            <span>
              Tax{" "}
              {invoice.tax_rate !== null &&
              invoice.tax_rate !== undefined
                ? `(${invoice.tax_rate}%)`
                : ""}
            </span>

            <strong>
              {currency(invoice.tax_amount)}
            </strong>
          </div>

          <hr />

          {/* Total */}

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "18px 0",
              fontSize: "22px",
            }}
          >
            <span>
              <strong>
                Grand Total
              </strong>
            </span>

            <strong>
              {currency(
                invoice.total_amount
              )}
            </strong>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}

      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: "10px",
          marginTop: "20px",
          flexWrap: "wrap",
        }}
      >
        <button
          className="secondary-button"
          onClick={() => navigate("/invoices")}
        >
          ← Back to Invoices
        </button>

        <button
          className="secondary-button"
          onClick={printInvoice}
        >
          🖨 Print
        </button>

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
    </div>
  );
}

export default InvoiceDetails;