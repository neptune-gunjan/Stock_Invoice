import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../services/api";

function InvoiceDetails() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();

  const [invoice, setInvoice] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [payments, setPayments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const [downloading, setDownloading] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  async function loadInvoice() {
    try {
      setLoading(true);
      setError("");
      setPaymentError("");

      // Load invoice details
      const response = await api.get(
        `/invoices/${invoiceId}`
      );

      const invoiceData = response.data;

      setInvoice(invoiceData);

      // Load payments separately
      try {
        const paymentResponse = await api.get(
          `/invoices/${invoiceId}/payments`
        );

        setPayments(
          Array.isArray(paymentResponse.data)
            ? paymentResponse.data
            : []
        );
      } catch (err) {
        console.error(
          "Unable to load payments:",
          err
        );

        // Fallback if payments are included
        // inside invoice response
        setPayments(
          Array.isArray(invoiceData.payments)
            ? invoiceData.payments
            : []
        );

        setPaymentError(
          "Unable to load payment history."
        );
      }

      // Load customer information
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

          setCustomer(null);
        }
      } else {
        setCustomer(null);
      }
    } catch (err) {
      console.error(
        "Unable to load invoice:",
        err
      );

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

      const blob = new Blob(
        [response.data],
        {
          type: "application/pdf",
        }
      );

      const url =
        window.URL.createObjectURL(blob);

      window.open(url, "_blank");

      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 10000);
    } catch (err) {
      console.error(
        "Unable to download invoice:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to open invoice PDF."
      );
    } finally {
      setDownloading(false);
    }
  }

  async function cancelInvoice() {
    if (!invoice) {
      return;
    }

    // Prevent cancelling twice
    if (invoice.status === "cancelled") {
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to cancel ${invoice.invoice_number}?\n\n` +
        "This will cancel the invoice and restore the sold stock quantity."
    );

    if (!confirmed) {
      return;
    }

    try {
      setCancelling(true);
      setError("");
      setPaymentError("");

      const response = await api.patch(
        `/invoices/${invoiceId}/cancel`
      );

      // Replace invoice with cancelled invoice
      // returned by backend
      setInvoice(response.data);

      // Reload payments after cancellation
      // for consistency
      try {
        const paymentResponse =
          await api.get(
            `/invoices/${invoiceId}/payments`
          );

        setPayments(
          Array.isArray(paymentResponse.data)
            ? paymentResponse.data
            : []
        );
      } catch (paymentErr) {
        console.error(
          "Unable to reload payments:",
          paymentErr
        );
      }
    } catch (err) {
      console.error(
        "Unable to cancel invoice:",
        err
      );

      setError(
        err.response?.data?.detail ||
          "Unable to cancel invoice."
      );
    } finally {
      setCancelling(false);
    }
  }

  function printInvoice() {
    window.print();
  }

  function formatDate(dateString) {
    if (!dateString) {
      return "-";
    }

    const date = new Date(dateString);

    if (Number.isNaN(date.getTime())) {
      return "-";
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function currency(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
  }

  function capitalize(value) {
    if (!value) {
      return "-";
    }

    return (
      String(value).charAt(0).toUpperCase() +
      String(value).slice(1)
    );
  }

  function statusClass(status) {
    if (!status) {
      return "status-badge";
    }

    return `status-badge ${String(
      status
    ).toLowerCase()}`;
  }

  function paymentMethodClass(method) {
    if (!method) {
      return "status-badge";
    }

    return `status-badge ${String(
      method
    )
      .toLowerCase()
      .replace(/\s+/g, "-")}`;
  }

  // Calculate payment totals from actual
  // payment records
  const calculatedPaidAmount =
    payments.reduce(
      (total, payment) =>
        total +
        Number(payment.amount || 0),
      0
    );

  const calculatedRemainingAmount =
    Math.max(
      Number(invoice?.total_amount || 0) -
        calculatedPaidAmount,
      0
    );

  // Prefer actual payment records when available
  const paidAmount =
    payments.length > 0
      ? calculatedPaidAmount
      : Number(invoice?.paid_amount || 0);

  const remainingAmount =
    payments.length > 0
      ? calculatedRemainingAmount
      : Number(
          invoice?.remaining_amount || 0
        );

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
          onClick={() =>
            navigate("/invoices")
          }
        >
          ← Back to Invoices
        </button>
      </div>
    );
  }

  return (
    <div className="invoice-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <div className="page-header invoice-header">
        <div>
          <button
            className="secondary-button no-print"
            onClick={() =>
              navigate("/invoices")
            }
          >
            ← Back to Invoices
          </button>

          <h1 style={{ marginTop: "16px" }}>
            {invoice.invoice_number}
          </h1>

          <p>
            Created on{" "}
            {formatDate(
              invoice.created_at
            )}
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
          {/* Cancel Invoice */}
          {invoice.status !== "cancelled" && (
            <button
              className="secondary-button"
              onClick={cancelInvoice}
              disabled={
                cancelling ||
                downloading
              }
              style={{
                borderColor: "#dc2626",
                color: "#dc2626",
              }}
            >
              {cancelling
                ? "Cancelling..."
                : "Cancel Invoice"}
            </button>
          )}

          {/* Print */}
          <button
            className="secondary-button"
            onClick={printInvoice}
            disabled={cancelling}
          >
            🖨 Print
          </button>

          {/* PDF */}
          <button
            className="primary-button"
            onClick={downloadInvoice}
            disabled={
              downloading ||
              cancelling
            }
          >
            {downloading
              ? "Opening PDF..."
              : "Download PDF"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="alert error no-print">
          {error}
        </div>
      )}

      {/* Cancelled warning */}
      {invoice.status === "cancelled" && (
        <div
          className="alert error no-print"
          style={{
            marginTop: "20px",
          }}
        >
          This invoice has been cancelled.
          The sold stock quantity has been
          restored.
          <br />
          No further payments can be recorded
          for this invoice.
        </div>
      )}

      {/* =====================================================
          STATUS SUMMARY
      ====================================================== */}

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
              {capitalize(
                invoice.status
              )}
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
            {currency(
              invoice.total_amount
            )}
          </div>
        </div>

      </div>

      {/* =====================================================
          CUSTOMER INFORMATION
      ====================================================== */}

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

            <p
              style={{
                wordBreak: "break-all",
              }}
            >
              {invoice.customer_id || "-"}
            </p>
          </div>

        </div>
      </div>

      {/* =====================================================
          INVOICE INFORMATION
      ====================================================== */}

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
              {formatDate(
                invoice.created_at
              )}
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

      {/* =====================================================
          INVOICE ITEMS
      ====================================================== */}

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

            <p style={{ marginTop: "5px" }}>
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

      {/* =====================================================
          PAYMENT SUMMARY
      ====================================================== */}

      <div className="dashboard-card">
        <h2>Payment Summary</h2>

        <div
          style={{
            maxWidth: "480px",
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
              {currency(
                invoice.subtotal
              )}
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
              -{" "}
              {currency(
                invoice.discount
              )}
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
              Tax{" "}
              {invoice.tax_rate !==
                null &&
              invoice.tax_rate !==
                undefined
                ? `(${invoice.tax_rate}%)`
                : ""}
            </span>

            <strong>
              {currency(
                invoice.tax_amount
              )}
            </strong>
          </div>

          <hr />

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

          <hr />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
            }}
          >
            <span>
              Paid Amount
            </span>

            <strong>
              {currency(paidAmount)}
            </strong>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0",
            }}
          >
            <span>
              Remaining Amount
            </span>

            <strong>
              {currency(
                remainingAmount
              )}
            </strong>
          </div>

        </div>
      </div>

      {/* =====================================================
          PAYMENT HISTORY
      ====================================================== */}

      <div className="dashboard-card">

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2>
              Payment History
            </h2>

            <p style={{ marginTop: "5px" }}>
              {payments.length} payment
              {payments.length !== 1
                ? "s"
                : ""}{" "}
              recorded
            </p>
          </div>

          <div>
            <strong>
              Total Paid:{" "}
              {currency(paidAmount)}
            </strong>
          </div>
        </div>

        {paymentError && (
          <div
            className="alert error no-print"
            style={{
              marginTop: "15px",
            }}
          >
            {paymentError}
          </div>
        )}

        {payments.length === 0 ? (
          <div
            className="empty-state"
            style={{
              marginTop: "20px",
            }}
          >
            No payments recorded.
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
                  <th>Amount</th>
                  <th>Payment Method</th>
                  <th>Paid At</th>
                  <th>Reference Number</th>
                </tr>
              </thead>

              <tbody>
                {payments.map(
                  (payment, index) => (
                    <tr key={payment.id}>
                      <td>
                        {index + 1}
                      </td>

                      <td>
                        <strong>
                          {currency(
                            payment.amount
                          )}
                        </strong>
                      </td>

                      <td>
                        <span
                          className={paymentMethodClass(
                            payment.payment_method
                          )}
                        >
                          {capitalize(
                            payment.payment_method
                          )}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          payment.paid_at
                        )}
                      </td>

                      <td>
                        {payment.reference_number ||
                          "-"}
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Payment total verification */}
        {payments.length > 0 && (
          <div
            style={{
              marginTop: "20px",
              padding: "15px",
              borderRadius: "8px",
              background:
                remainingAmount === 0
                  ? "rgba(34, 197, 94, 0.10)"
                  : "rgba(234, 179, 8, 0.10)",
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: "15px",
              flexWrap: "wrap",
            }}
          >
            <strong>
              {remainingAmount === 0
                ? "✓ Invoice fully paid"
                : "Payment pending"}
            </strong>

            <span>
              {currency(paidAmount)} paid of{" "}
              {currency(
                invoice.total_amount
              )}
            </span>
          </div>
        )}

      </div>

      {/* =====================================================
          BOTTOM ACTIONS
      ====================================================== */}

      <div
        className="no-print"
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >

        {/* Cancel */}
        {invoice.status !== "cancelled" && (
          <button
            className="secondary-button"
            onClick={cancelInvoice}
            disabled={
              cancelling ||
              downloading
            }
            style={{
              borderColor: "#dc2626",
              color: "#dc2626",
            }}
          >
            {cancelling
              ? "Cancelling..."
              : "Cancel Invoice"}
          </button>
        )}

        {/* Print */}
        <button
          className="secondary-button"
          onClick={printInvoice}
          disabled={cancelling}
        >
          🖨 Print
        </button>

        {/* Download PDF */}
        <button
          className="primary-button"
          onClick={downloadInvoice}
          disabled={
            downloading ||
            cancelling
          }
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

