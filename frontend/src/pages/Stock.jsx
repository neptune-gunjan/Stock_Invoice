import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

const EMPTY_FORM = {
  name: "",
  sku: "",
  unit: "",
  unit_price: "",
  quantity_available: "",
  low_stock_threshold: "",
  aliases: "",
};

function Stock() {
  const navigate = useNavigate();

  const [stock, setStock] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

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

  function openAddModal() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(item) {
    setEditingItem(item);

    setForm({
      name: item.name || "",
      sku: item.sku || "",
      unit: item.unit || "",
      unit_price:
        item.unit_price !== null &&
        item.unit_price !== undefined
          ? String(item.unit_price)
          : "",
      quantity_available:
        item.quantity_available !== null &&
        item.quantity_available !== undefined
          ? String(item.quantity_available)
          : "",
      low_stock_threshold:
        item.low_stock_threshold !== null &&
        item.low_stock_threshold !== undefined
          ? String(item.low_stock_threshold)
          : "",
      aliases: Array.isArray(item.aliases)
        ? item.aliases.join(", ")
        : "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingItem(null);
    setForm(EMPTY_FORM);
  }

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      unit: form.unit.trim(),
      unit_price: Number(form.unit_price),
      quantity_available: Number(
        form.quantity_available
      ),
      low_stock_threshold: Number(
        form.low_stock_threshold || 0
      ),
      aliases: form.aliases
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean),
    };
  }

  function validateForm() {
    if (!form.name.trim()) {
      return "Product name is required.";
    }

    if (!form.unit.trim()) {
      return "Unit is required.";
    }

    if (
      form.unit_price === "" ||
      Number.isNaN(Number(form.unit_price))
    ) {
      return "Unit price must be a valid number.";
    }

    if (Number(form.unit_price) < 0) {
      return "Unit price cannot be negative.";
    }

    if (
      form.quantity_available === "" ||
      Number.isNaN(
        Number(form.quantity_available)
      )
    ) {
      return "Quantity must be a valid number.";
    }

    if (Number(form.quantity_available) < 0) {
      return "Quantity cannot be negative.";
    }

    if (
      form.low_stock_threshold !== "" &&
      Number.isNaN(
        Number(form.low_stock_threshold)
      )
    ) {
      return "Low-stock threshold must be a valid number.";
    }

    if (Number(form.low_stock_threshold || 0) < 0) {
      return "Low-stock threshold cannot be negative.";
    }

    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSaving(true);

      const payload = buildPayload();

      if (editingItem) {
        await api.patch(
          `/stock/${editingItem.id}`,
          payload
        );

        setSuccess(
          "Product updated successfully."
        );
      } else {
        await api.post("/stock", payload);

        setSuccess(
          "Product added successfully."
        );
      }

      setShowModal(false);
      setEditingItem(null);
      setForm(EMPTY_FORM);

      await loadStock();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to save product."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${item.name}" from stock?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setError("");
      setSuccess("");

      await api.delete(`/stock/${item.id}`);

      setSuccess(
        `${item.name} removed successfully.`
      );

      await loadStock();
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          "Unable to remove product."
      );
    }
  }

  const filteredStock = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return stock;
    }

    return stock.filter((item) => {
      const name =
        item.name?.toLowerCase() || "";

      const sku =
        item.sku?.toLowerCase() || "";

      const unit =
        item.unit?.toLowerCase() || "";

      const aliases = Array.isArray(item.aliases)
        ? item.aliases
            .join(" ")
            .toLowerCase()
        : "";

      return (
        name.includes(query) ||
        sku.includes(query) ||
        unit.includes(query) ||
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
        Number(item.quantity_available) > 0 &&
        Number(item.quantity_available) >
          Number(item.low_stock_threshold)
    ).length;

    return {
      totalProducts,
      inStock,
      lowStock,
      outOfStock,
    };
  }, [stock]);

  function getStockStatus(item) {
    const quantity = Number(
      item.quantity_available || 0
    );

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
            Manage your products, quantities and
            stock levels.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="secondary-button"
            onClick={loadStock}
            disabled={loading}
          >
            {loading
              ? "Refreshing..."
              : "↻ Refresh"}
          </button>

          <button
            className="primary-button"
            onClick={openAddModal}
          >
            + Add Product
          </button>

          <button
            className="secondary-button"
            onClick={() => navigate("/upload")}
          >
            Import CSV / XLSX
          </button>
        </div>
      </div>

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert success">
          {success}
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
              {filteredStock.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <input
            type="text"
            className="search-input"
            placeholder="Search product, SKU, unit or alias..."
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
              : "No stock found. Add your first product."}
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
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredStock.map((item) => {
                  const status =
                    getStockStatus(item);

                  return (
                    <tr key={item.id}>
                      <td>
                        <strong>
                          {item.name}
                        </strong>

                        {item.aliases?.length >
                          0 && (
                          <div
                            style={{
                              fontSize: "12px",
                              opacity: 0.65,
                              marginTop: "4px",
                            }}
                          >
                            {item.aliases.join(
                              ", "
                            )}
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
                            item.quantity_available ||
                              0
                          )}
                        </strong>
                      </td>

                      <td>
                        {Number(
                          item.low_stock_threshold ||
                            0
                        )}
                      </td>

                      <td>
                        {formatPrice(
                          item.unit_price
                        )}
                      </td>

                      <td>
                        <span
                          className={
                            status.className
                          }
                        >
                          {status.label}
                        </span>
                      </td>

                      <td>
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                            alignItems: "center",
                          }}
                        >
                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              openEditModal(item)
                            }
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className="secondary-button"
                            onClick={() =>
                              handleDelete(item)
                            }
                            style={{
                              color: "#b42318",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div
          onClick={closeModal}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
            zIndex: 1000,
          }}
        >
          <div
            className="dashboard-card"
            onClick={(e) =>
              e.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: "700px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "white",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>
                  {editingItem
                    ? "Edit Product"
                    : "Add Product"}
                </h2>

                <p
                  style={{
                    marginTop: "6px",
                    opacity: 0.7,
                  }}
                >
                  {editingItem
                    ? "Update product and stock information."
                    : "Add a new product to your stock catalog."}
                </p>
              </div>

              <button
                type="button"
                className="secondary-button"
                onClick={closeModal}
                disabled={saving}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(2, minmax(0, 1fr))",
                  gap: "16px",
                }}
              >
                <div>
                  <label>
                    Product Name *
                  </label>

                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Basmati Rice"
                    required
                    style={{
                      width: "100%",
                      marginTop: "6px",
                    }}
                  />
                </div>

                <div>
                  <label>
                    SKU
                  </label>

                  <input
                    type="text"
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="e.g. RICE-001"
                    style={{
                      width: "100%",
                      marginTop: "6px",
                    }}
                  />
                </div>

                <div>
                  <label>
                    Unit *
                  </label>

                  <input
                    type="text"
                    name="unit"
                    value={form.unit}
                    onChange={handleChange}
                    placeholder="kg, pcs, box, litre..."
                    required
                    style={{
                      width: "100%",
                      marginTop: "6px",
                    }}
                  />
                </div>

                <div>
                  <label>
                    Unit Price *
                  </label>

                  <input
                    type="number"
                    name="unit_price"
                    value={form.unit_price}
                    onChange={handleChange}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                    style={{
                      width: "100%",
                      marginTop: "6px",
                    }}
                  />
                </div>

                <div>
                  <label>
                    Available Quantity *
                  </label>

                  <input
                    type="number"
                    name="quantity_available"
                    value={
                      form.quantity_available
                    }
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    required
                    style={{
                      width: "100%",
                      marginTop: "6px",
                    }}
                  />
                </div>

                <div>
                  <label>
                    Low Stock Threshold
                  </label>

                  <input
                    type="number"
                    name="low_stock_threshold"
                    value={
                      form.low_stock_threshold
                    }
                    onChange={handleChange}
                    placeholder="0"
                    min="0"
                    step="0.01"
                    style={{
                      width: "100%",
                      marginTop: "6px",
                    }}
                  />
                </div>

                <div
                  style={{
                    gridColumn: "1 / -1",
                  }}
                >
                  <label>
                    Aliases
                  </label>

                  <input
                    type="text"
                    name="aliases"
                    value={form.aliases}
                    onChange={handleChange}
                    placeholder="e.g. rice, basmati, basmati chawal"
                    style={{
                      width: "100%",
                      marginTop: "6px",
                    }}
                  />

                  <small
                    style={{
                      display: "block",
                      marginTop: "5px",
                      opacity: 0.65,
                    }}
                  >
                    Separate multiple aliases
                    with commas.
                  </small>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "24px",
                }}
              >
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingItem
                    ? "Update Product"
                    : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Stock;