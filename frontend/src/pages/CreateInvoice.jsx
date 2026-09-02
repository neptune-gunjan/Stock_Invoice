
import { useEffect, useState } from "react";
import api from "../services/api";

export default function CreateInvoice() {
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");

    const [stock, setStock] = useState([]);
    const [items, setItems] = useState([]);

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const [jobId, setJobId] = useState(null);

    const [loading, setLoading] = useState(false);
    const [confirming, setConfirming] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [transaction, setTransaction] = useState(null);

    useEffect(() => {
        loadStock();
    }, []);


    async function loadStock() {
    try {
        const response = await api.get("/stock");

        console.log("========== STOCK API RESPONSE ==========");
        console.log(response.data);
        console.log("Stock count:", response.data.length);
        console.log("========================================");

        setStock(response.data);

    } catch (err) {
        console.error(err);

        setError(
        err.response?.data?.detail ||
        "Unable to load stock."
        );
    }
    }


    function handleFileChange(event) {
        const selectedFile = event.target.files[0];

        if (!selectedFile) {
        return;
        }

        if (!selectedFile.type.startsWith("image/")) {
        setError("Please select an image file.");
        return;
        }

        setFile(selectedFile);
        setPreview(URL.createObjectURL(selectedFile));

        setItems([]);
        setJobId(null);
        setTransaction(null);

        setError("");
        setSuccess("");
    }

    async function extractItems() {
        if (!file) {
        setError("Please select an image first.");
        return;
        }

        try {
        setLoading(true);
        setError("");
        setSuccess("");
        setItems([]);
        setTransaction(null);

        const formData = new FormData();
        formData.append("file", file);

        const response = await api.post(
            "/extract",
            formData
        );

        const job = response.data;

        console.log("Extraction:", job);

        setJobId(job.id);

        //   const matchResponse = await api.post(
        //     `/match/${job.id}`
        //   );

        //   console.log(
        //     "Matched:",
        //     matchResponse.data
        //   );

        //   setItems(matchResponse.data);
        setItems(job.items || []);
        setSuccess(
            "Items extracted successfully. Please review them."
        );
        } catch (err) {
        console.error(err);

        setError(
            err.response?.data?.detail ||
            "Extraction or matching failed."
        );
        } finally {
        setLoading(false);
        }
    }

    function updateItem(index, field, value) {
        setItems((previous) => {
        const updated = [...previous];

        updated[index] = {
            ...updated[index],
            [field]: value,
        };

        return updated;
        });
    }

    function removeItem(index) {
        setItems((previous) =>
        previous.filter(
            (_, itemIndex) =>
            itemIndex !== index
        )
        );
    }

    function addItem() {
        setItems((previous) => [
        ...previous,
        {
            id: null,
            raw_text: "",
            qty: 1,
            matched_stock_id: "",
            needs_review: true,
        },
        ]);
    }

    function getTotal() {
        return items.reduce(
        (total, item) => {
            const product = stock.find(
            (stockItem) =>
                stockItem.id ===
                item.matched_stock_id
            );

            const qty =
            Number(item.qty) || 0;

            if (!product) {
            return total;
            }

            return (
            total +
            Number(product.unit_price) *
                qty
            );
        },
        0
        );
    }

    async function createCustomer() {
        if (!customerName.trim()) {
        return null;
        }

        const response = await api.post(
        "/customers",
        {
            name: customerName.trim(),
            phone:
            customerPhone.trim() ||
            null,
        }
        );

        return response.data.id;
    }

    async function confirmTransaction() {
        setError("");
        setSuccess("");

        if (items.length === 0) {
        setError("Add at least one item.");
        return;
        }

        const transactionItems = [];

        for (const item of items) {
        if (!item.matched_stock_id) {
            setError(
            `Please select a stock item for "${
                item.raw_text || "item"
            }".`
            );

            return;
        }

        const qty = Number(item.qty);

        if (!qty || qty <= 0) {
            setError(
            "Quantity must be greater than 0."
            );

            return;
        }

        transactionItems.push({
            stock_id: item.matched_stock_id,
            qty: qty,

            ...(item.id
            ? {
                extracted_item_id:
                    item.id,
                }
            : {}),
        });
        }

        try {
        setConfirming(true);

        const customerId =
            await createCustomer();

        const payload = {
            items: transactionItems,
        };

        if (jobId) {
            payload.extraction_job_id =
            jobId;
        }

        if (customerId) {
            payload.customer_id =
            customerId;
        }

        console.log(
            "Confirm payload:",
            payload
        );

        const response = await api.post(
            "/confirm",
            payload
        );

        console.log(
            "Transaction:",
            response.data
        );

        setTransaction(response.data);

        setSuccess(
            "Transaction confirmed successfully!"
        );

        await loadStock();
        } catch (err) {
        console.error(err);

        setError(
            err.response?.data?.detail ||
            "Transaction confirmation failed."
        );
        } finally {
        setConfirming(false);
        }
    }

    async function downloadInvoice(invoiceId) {
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
        console.error(err);

        setError(
            err.response?.data?.detail ||
            "Unable to open invoice PDF."
        );
        } finally {
        setDownloading(false);
        }
    }

    return (
        <div className="invoice-page">

        <div className="page-header">
            <div>
            <h1>Create Invoice</h1>

            <p>
                Upload a handwritten product list
                and create an invoice.
            </p>
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

        {/* Upload */}

        <div className="dashboard-card">

            <h3>
            1. Upload Product List
            </h3>

            <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            />

            {preview && (
            <div>
                <img
                src={preview}
                alt="Selected product list"
                style={{
                    maxWidth: "400px",
                    maxHeight: "300px",
                    marginTop: "20px",
                    borderRadius: "8px",
                }}
                />
            </div>
            )}

            <div
            style={{
                marginTop: "20px",
            }}
            >
            <button
                className="primary-button"
                onClick={extractItems}
                disabled={loading || !file}
            >
                {loading
                ? "Extracting..."
                : "Extract & Match Items"}
            </button>
            </div>

        </div>

        {/* Review */}

        {items.length > 0 && (
            <div
            className="dashboard-card"
            style={{
                marginTop: "20px",
            }}
            >

            <h3>
                2. Review Items
            </h3>

            <div
                className="customer-fields"
                style={{
                display: "flex",
                gap: "10px",
                marginTop: "20px",
                marginBottom: "20px",
                flexWrap: "wrap",
                }}
            >

                <input
                type="text"
                placeholder="Customer name"
                value={customerName}
                onChange={(e) =>
                    setCustomerName(
                    e.target.value
                    )
                }
                />

                <input
                type="text"
                placeholder="Phone number"
                value={customerPhone}
                onChange={(e) =>
                    setCustomerPhone(
                    e.target.value
                    )
                }
                />

            </div>

            <div
                style={{
                overflowX: "auto",
                }}
            >

                <table>

                <thead>
                    <tr>
                    <th>Raw Text</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Total</th>
                    <th></th>
                    </tr>
                </thead>

                <tbody>

                    {items.map(
                    (item, index) => {

                        const product =
                        stock.find(
                            (stockItem) =>
                            stockItem.id ===
                            item.matched_stock_id
                        );

                        const qty =
                        Number(item.qty) || 0;

                        const rate =
                        product
                            ? Number(
                                product.unit_price
                            )
                            : 0;

                        const lineTotal =
                        rate * qty;

                        return (
                        <tr
                            key={
                            item.id ||
                            index
                            }
                        >

                            <td>
                            {item.raw_text ||
                                "Manual"}
                            </td>

                            <td>

                            <select
                                value={
                                item.matched_stock_id ||
                                ""
                                }
                                onChange={(e) =>
                                updateItem(
                                    index,
                                    "matched_stock_id",
                                    e.target.value
                                )
                                }
                            >

                                <option value="">
                                Select product
                                </option>

                                {stock.map(
                                (product) => (
                                    <option
                                    key={
                                        product.id
                                    }
                                    value={
                                        product.id
                                    }
                                    >
                                    {product.name} (
                                    {product.unit})
                                    </option>
                                )
                                )}

                            </select>

                            </td>

                            <td>

                            <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={
                                item.qty ?? 1
                                }
                                onChange={(e) =>
                                updateItem(
                                    index,
                                    "qty",
                                    e.target.value
                                )
                                }
                                style={{
                                width: "80px",
                                }}
                            />

                            </td>

                            <td>
                            ₹
                            {rate.toFixed(2)}
                            </td>

                            <td>
                            ₹
                            {lineTotal.toFixed(2)}
                            </td>

                            <td>

                            <button
                                type="button"
                                className="danger-button"
                                onClick={() =>
                                removeItem(
                                    index
                                )
                                }
                            >
                                ✕
                            </button>

                            </td>

                        </tr>
                        );
                    }
                    )}

                </tbody>

                </table>

            </div>

            <button
                className="secondary-button"
                onClick={addItem}
                style={{
                marginTop: "15px",
                }}
            >
                + Add Item
            </button>

            <div
                style={{
                textAlign: "right",
                marginTop: "20px",
                fontSize: "20px",
                fontWeight: "700",
                }}
            >
                Total: ₹
                {getTotal().toFixed(2)}
            </div>

            <div
                style={{
                marginTop: "20px",
                textAlign: "right",
                }}
            >

                <button
                className="primary-button"
                onClick={
                    confirmTransaction
                }
                disabled={confirming}
                >
                {confirming
                    ? "Confirming..."
                    : "Confirm Transaction"}
                </button>

            </div>

            </div>
        )}

        {/* Result */}

        {transaction && (
            <div
            className="dashboard-card"
            style={{
                marginTop: "20px",
            }}
            >

            <h3>
                ✓ Invoice Created
            </h3>

            <p>
                Invoice ID:
                <br />

                <code>
                {transaction.invoice_number}
                </code>
            </p>

            <p>
                Total:
                <strong>
                {" "}
                ₹
                {Number(
                    transaction.total_amount
                ).toFixed(2)}
                </strong>
            </p>

            <button
                className="primary-button"
                onClick={() =>
                downloadInvoice(
                    transaction.invoice_id
                )
                }
                disabled={downloading}
            >
                {downloading
                ? "Opening PDF..."
                : "Download PDF Invoice"}
            </button>

            </div>
        )}

        </div>
    );
    }

