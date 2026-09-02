import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Invoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Sorting
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  function clearFilters() {
    setSearch("");
    setCustomerFilter("all");
    setPaymentFilter("all");
    setStatusFilter("all");
    setFromDate("");
    setToDate("");
    setCurrentPage(1);
  }

  function handleSortChange(value) {
    if (value === sortBy) {
      setSortOrder((previous) =>
        previous === "asc" ? "desc" : "asc"
      );
    } else {
      setSortBy(value);
      setSortOrder(
        value === "date" ? "desc" : "asc"
      );
    }

    setCurrentPage(1);
  }

  /*
   * Filtering
   */
  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLowerCase();

    return invoices.filter((invoice) => {
      const customerName = getCustomerName(invoice);

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

      const matchesCustomer =
        customerFilter === "all" ||
        invoice.customer_id === customerFilter;

      const matchesPayment =
        paymentFilter === "all" ||
        invoice.payment_status === paymentFilter;

      const matchesStatus =
        statusFilter === "all" ||
        invoice.status === statusFilter;

      const invoiceDate = invoice.created_at
        ? new Date(invoice.created_at)
        : null;

      let matchesFromDate = true;
      let matchesToDate = true;

      if (invoiceDate && fromDate) {
        const startDate = new Date(
          `${fromDate}T00:00:00`
        );

        matchesFromDate = invoiceDate >= startDate;
      }

      if (invoiceDate && toDate) {
        const endDate = new Date(
          `${toDate}T23:59:59.999`
        );

        matchesToDate = invoiceDate <= endDate;
      }

      return (
        matchesSearch &&
        matchesCustomer &&
        matchesPayment &&
        matchesStatus &&
        matchesFromDate &&
        matchesToDate
      );
    });
  }, [
    invoices,
    customers,
    search,
    customerFilter,
    paymentFilter,
    statusFilter,
    fromDate,
    toDate,
  ]);

  /*
   * Sorting
   */
  const sortedInvoices = useMemo(() => {
    const sorted = [...filteredInvoices];

    sorted.sort((a, b) => {
      let valueA;
      let valueB;

      if (sortBy === "date") {
        valueA = new Date(a.created_at || 0).getTime();
        valueB = new Date(b.created_at || 0).getTime();
      } else if (sortBy === "amount") {
        valueA = Number(a.total_amount || 0);
        valueB = Number(b.total_amount || 0);
      } else if (sortBy === "invoice") {
        valueA = (
          a.invoice_number || ""
        ).toLowerCase();

        valueB = (
          b.invoice_number || ""
        ).toLowerCase();
      } else if (sortBy === "customer") {
        valueA = getCustomerName(a).toLowerCase();
        valueB = getCustomerName(b).toLowerCase();
      }

      if (valueA < valueB) {
        return sortOrder === "asc" ? -1 : 1;
      }

      if (valueA > valueB) {
        return sortOrder === "asc" ? 1 : -1;
      }

      return 0;
    });

    return sorted;
  }, [
    filteredInvoices,
    sortBy,
    sortOrder,
    customers,
  ]);

  /*
   * Pagination
   */
  const totalPages = Math.max(
    1,
    Math.ceil(
      sortedInvoices.length / itemsPerPage
    )
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedInvoices = useMemo(() => {
    const startIndex =
      (currentPage - 1) * itemsPerPage;

    const endIndex =
      startIndex + itemsPerPage;

    return sortedInvoices.slice(
      startIndex,
      endIndex
    );
  }, [
    sortedInvoices,
    currentPage,
    itemsPerPage,
  ]);

  /*
   * Reset page whenever filters change
   */
  useEffect(() => {
    setCurrentPage(1);
  }, [
    search,
    customerFilter,
    paymentFilter,
    statusFilter,
    fromDate,
    toDate,
    itemsPerPage,
  ]);

  /*
   * Pagination range
   */
  const startItem =
    sortedInvoices.length === 0
      ? 0
      : (currentPage - 1) * itemsPerPage + 1;

  const endItem = Math.min(
    currentPage * itemsPerPage,
    sortedInvoices.length
  );

  /*
   * Summary
   */
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

  const hasActiveFilters =
    search.trim() !== "" ||
    customerFilter !== "all" ||
    paymentFilter !== "all" ||
    statusFilter !== "all" ||
    fromDate !== "" ||
    toDate !== "";

  return (
    <div className="invoice-page">
      {/* Header */}

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

      {/* Error */}

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
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Filter Row */}

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
              value={customerFilter}
              onChange={(e) =>
                setCustomerFilter(e.target.value)
              }
            >
              <option value="all">
                All Customers
              </option>

              {customers.map((customer) => (
                <option
                  key={customer.id}
                  value={customer.id}
                >
                  {customer.name}
                </option>
              ))}
            </select>

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
          </div>

          {/* Date + Buttons */}

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "flex-end",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                From Date
              </label>

              <input
                type="date"
                value={fromDate}
                onChange={(e) =>
                  setFromDate(e.target.value)
                }
              />
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <label
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                To Date
              </label>

              <input
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) =>
                  setToDate(e.target.value)
                }
              />
            </div>

            <button
              className="secondary-button"
              onClick={loadInvoices}
            >
              Refresh
            </button>

            {hasActiveFilters && (
              <button
                className="secondary-button"
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoice History */}

      <div className="dashboard-card">
        <div className="page-header">
          <div>
            <h2>Invoice History</h2>

            <p>
              {sortedInvoices.length} invoice
              {sortedInvoices.length !== 1
                ? "s"
                : ""}{" "}
              found
            </p>
          </div>

          {/* Sorting */}

          <div
            style={{
              display: "flex",
              gap: "10px",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <label
              style={{
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              Sort:
            </label>

            <select
              value={sortBy}
              onChange={(e) =>
                handleSortChange(e.target.value)
              }
            >
              <option value="date">
                Date
              </option>

              <option value="invoice">
                Invoice Number
              </option>

              <option value="customer">
                Customer
              </option>

              <option value="amount">
                Amount
              </option>
            </select>

            <button
              className="secondary-button"
              onClick={() =>
                setSortOrder((previous) =>
                  previous === "asc"
                    ? "desc"
                    : "asc"
                )
              }
              title="Change sort direction"
            >
              {sortOrder === "asc"
                ? "↑ Asc"
                : "↓ Desc"}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">
            Loading invoices...
          </div>
        ) : sortedInvoices.length === 0 ? (
          <div className="empty-state">
            No invoices found.
          </div>
        ) : (
          <>
            {/* Table */}

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
                  {paginatedInvoices.map(
                    (invoice) => (
                      <tr key={invoice.id}>
                        <td>
                          <button
                            className="secondary-button"
                            onClick={() =>
                              navigate(
                                `/invoices/${invoice.id}`
                              )
                            }
                          >
                            {
                              invoice.invoice_number
                            }
                          </button>
                        </td>

                        <td>
                          {getCustomerName(
                            invoice
                          )}
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
                            {
                              invoice.payment_status
                            }
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

            {/* Pagination */}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "16px",
                flexWrap: "wrap",
                marginTop: "20px",
                paddingTop: "16px",
                borderTop:
                  "1px solid #e5e7eb",
              }}
            >
              {/* Result info */}

              <div
                style={{
                  fontSize: "14px",
                  color: "#666",
                }}
              >
                Showing{" "}
                <strong>{startItem}</strong>-
                <strong>{endItem}</strong> of{" "}
                <strong>
                  {sortedInvoices.length}
                </strong>
              </div>

              {/* Page size */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "14px",
                  }}
                >
                  Per page:
                </span>

                <select
                  value={itemsPerPage}
                  onChange={(e) =>
                    setItemsPerPage(
                      Number(e.target.value)
                    )
                  }
                >
                  <option value={10}>
                    10
                  </option>

                  <option value={25}>
                    25
                  </option>

                  <option value={50}>
                    50
                  </option>
                </select>
              </div>

              {/* Navigation */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <button
                  className="secondary-button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage(1)
                  }
                >
                  First
                </button>

                <button
                  className="secondary-button"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage(
                      (page) => page - 1
                    )
                  }
                >
                  Previous
                </button>

                <span
                  style={{
                    minWidth: "90px",
                    textAlign: "center",
                    fontSize: "14px",
                    fontWeight: "600",
                  }}
                >
                  Page {currentPage} of{" "}
                  {totalPages}
                </span>

                <button
                  className="secondary-button"
                  disabled={
                    currentPage === totalPages
                  }
                  onClick={() =>
                    setCurrentPage(
                      (page) => page + 1
                    )
                  }
                >
                  Next
                </button>

                <button
                  className="secondary-button"
                  disabled={
                    currentPage === totalPages
                  }
                  onClick={() =>
                    setCurrentPage(totalPages)
                  }
                >
                  Last
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Invoices;