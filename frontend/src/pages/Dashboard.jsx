import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import api from "../services/api";

function StatCard({ title, value, icon }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>

      <div>
        <p>{title}</p>
        <h2>{value}</h2>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [salesData, setSalesData] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError("");

      const [
        summaryResponse,
        salesResponse,
        invoicesResponse,
      ] = await Promise.all([
        api.get("/dashboard"),
        api.get("/dashboard/sales"),
        api.get("/invoices"),
      ]);

      setSummary(summaryResponse.data);
      setSalesData(salesResponse.data);
      setInvoices(invoicesResponse.data);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to load dashboard data."
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h3>Unable to load dashboard</h3>
        <p>{error}</p>

        <button onClick={loadDashboard}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">

      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>
            Overview of your sales, invoices and stock.
          </p>
        </div>

        <button
          className="primary-button"
          onClick={() => {
            window.location.href = "/create-invoice";
          }}
        >
          + Create Invoice
        </button>
      </div>


      {/* Statistics */}

      <div className="stats-grid">

        <StatCard
          title="Total Sales"
          value={`₹${Number(
            summary.total_sales
          ).toFixed(2)}`}
          icon="₹"
        />

        <StatCard
          title="Total Paid"
          value={`₹${Number(
            summary.total_paid
          ).toFixed(2)}`}
          icon="✓"
        />

        <StatCard
          title="Outstanding"
          value={`₹${Number(
            summary.outstanding_amount
          ).toFixed(2)}`}
          icon="!"
        />

        <StatCard
          title="Total Invoices"
          value={summary.total_invoices}
          icon="▤"
        />

        <StatCard
          title="Customers"
          value={summary.total_customers}
          icon="♙"
        />

        <StatCard
          title="Products"
          value={summary.total_products}
          icon="□"
        />

        <StatCard
          title="Low Stock"
          value={summary.low_stock_products}
          icon="⚠"
        />

      </div>


      {/* Sales Chart */}

      <div className="dashboard-grid">

        <div className="dashboard-card sales-card">

          <div className="card-header">
            <div>
              <h3>Sales Overview</h3>
              <p>Daily sales</p>
            </div>
          </div>

          <div className="chart-container">

            {salesData.length === 0 ? (
              <div className="empty-state">
                No sales data available.
              </div>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={320}
              >
                <AreaChart data={salesData}>

                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="date"
                  />

                  <YAxis />

                  <Tooltip
                    formatter={(value) =>
                      `₹${Number(value).toFixed(2)}`
                    }
                  />

                  <Area
                    type="monotone"
                    dataKey="sales"
                    strokeWidth={3}
                    fillOpacity={0.15}
                  />

                </AreaChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>


        {/* Recent invoices */}

        <div className="dashboard-card">

          <div className="card-header">

            <div>
              <h3>Recent Invoices</h3>
              <p>Latest transactions</p>
            </div>

            <button
              className="text-button"
              onClick={() => {
                window.location.href = "/invoices";
              }}
            >
              View all
            </button>

          </div>


          <div className="invoice-list">

            {invoices.length === 0 ? (
              <div className="empty-state">
                No invoices found.
              </div>
            ) : (

              invoices
                .slice(0, 5)
                .map((invoice) => (

                  <div
                    className="invoice-row"
                    key={invoice.id}
                  >

                    <div>

                      <strong>
                        {invoice.invoice_number}
                      </strong>

                      <span>
                        {invoice.customer_name ||
                          "Walk-in Customer"}
                      </span>

                    </div>


                    <div className="invoice-right">

                      <strong>
                        ₹{Number(
                          invoice.total_amount
                        ).toFixed(2)}
                      </strong>

                      <span className="paid">
                        {invoice.payment_status}
                      </span>

                    </div>

                  </div>

                ))
            )}

          </div>

        </div>

      </div>


      {/* Quick actions */}

      <div className="dashboard-card quick-actions">

        <h3>Quick Actions</h3>

        <div className="quick-action-grid">

          <button
            onClick={() =>
              (window.location.href =
                "/create-invoice")
            }
          >
            🧾
            <span>Create Invoice</span>
          </button>

          <button
            onClick={() =>
              (window.location.href =
                "/upload")
            }
          >
            📷
            <span>Upload Product List</span>
          </button>

          <button
            onClick={() =>
              (window.location.href =
                "/stock")
            }
          >
            📦
            <span>Manage Stock</span>
          </button>

          <button
            onClick={() =>
              (window.location.href =
                "/customers")
            }
          >
            👥
            <span>Customers</span>
          </button>

        </div>

      </div>

    </div>
  );
}
