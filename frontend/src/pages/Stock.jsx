import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Stock() {
  const navigate = useNavigate();

  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadStock() {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/stock");
      setStock(response.data || []);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to load stock."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStock();
  }, []);

  const filteredStock = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return stock;
    }

    return stock.filter((item) => {
      const name = item.name?.toLowerCase() || "";
      const sku = item.sku?.toLowerCase() || "";

      const aliases = Array.isArray(item.aliases)
        ? item.aliases.join(" ").toLowerCase()
        : "";

      return (
        name.includes(query) ||
        sku.includes(query) ||
        aliases.includes(query)
      );
    });
  }, [stock, search]);

  const summary = useMemo(() => {
    const totalProducts = stock.length;

    const lowStock = stock.filter(
      (item) =>
        Number(item.quantity_available) <=
        Number(item.low_stock_threshold)
    ).length;

    const outOfStock = stock.filter(
      (item) =>
        Number(item.quantity_available) <= 0
    ).length;

    const inStock = stock.filter(
      (item) =>
        Number(item.quantity_available) > 0
    ).length;

    return {
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [stock]);

  function getStockStatus(item) {
    const quantity = Number(item.quantity_available || 0);
    const threshold = Number(
      item.low_stock_threshold || 0
    );

    if (quantity <= 0) {
      return {
        label: "Out of Stock",
        className: "status-badge error",
      };
    }

    if (quantity <= threshold) {
      return {
        label: "Low Stock",
        className: "status-badge warning",
      };
    }

    return {
      label: "In Stock",
      className: "status-badge success",
    };
  }

  function formatPrice(value) {
    return `₹${Number(value || 0).toFixed(2)}`;
  }

  return (
    <div className="invoice-page">
      <div className="page-header">
        <div>
          <h1>Stock Management</h1>
          <p>
            Manage your products, quantities and stock levels.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="secondary-button"
            onClick={loadStock}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "↻ Refresh"}
          </button>

          <button
            className="primary-button"
            onClick={() => navigate("/upload")}
          >
            + Add Products
          </button>
        </div>
      </div>

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <div className="dashboard-card-label">
            Total Products
          </div>
          <div className="dashboard-card-value">
            {summary.totalProducts}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-label">
            In Stock
          </div>
          <div className="dashboard-card-value">
            {summary.inStock}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-label">
            Low Stock
          </div>
          <div className="dashboard-card-value">
            {summary.lowStock}
          </div>
        </div>

        <div className="dashboard-card">
          <div className="dashboard-card-label">
            Out of Stock
          </div>
          <div className="dashboard-card-value">
            {summary.outOfStock}
          </div>
        </div>
      </div>

      <div className="dashboard-card invoice-table-card">
        <div className="table-toolbar">
          <div>
            <h2>Products</h2>
            <p>
              {filteredStock.length} product
              {filteredStock.length !== 1 ? "s" : ""}
            </p>
          </div>

          <input
            type="text"
            className="search-input"
            placeholder="Search product, SKU or alias..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        {loading ? (
          <div className="empty-state">
            Loading stock...
          </div>
        ) : filteredStock.length === 0 ? (
          <div className="empty-state">
            {search
              ? "No products match your search."
              : "No stock found."}
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Unit</th>
                  <th>Available Qty</th>
                  <th>Threshold</th>
                  <th>Unit Price</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {filteredStock.map((item) => {
                  const status = getStockStatus(item);

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.name}</strong>

                        {item.aliases?.length > 0 && (
                          <div
                            style={{
                              fontSize: "12px",
                              opacity: 0.65,
                              marginTop: "4px",
                            }}
                          >
                            {item.aliases.join(", ")}
                          </div>
                        )}
                      </td>

                      <td>
                        {item.sku || "—"}
                      </td>

                      <td>
                        {item.unit || "—"}
                      </td>

                      <td>
                        <strong>
                          {Number(
                            item.quantity_available || 0
                          )}
                        </strong>
                      </td>

                      <td>
                        {Number(
                          item.low_stock_threshold || 0
                        )}
                      </td>

                      <td>
                        {formatPrice(item.unit_price)}
                      </td>

                      <td>
                        <span className={status.className}>
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Stock;