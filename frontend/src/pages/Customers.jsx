import { useEffect, useState } from "react";
import api from "../services/api";

export default function Customers() {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [transactions, setTransactions] = useState([]);

    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    useEffect(() => {
        loadCustomers();
    }, []);

    async function loadCustomers() {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/customers");

            setCustomers(response.data || []);
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.detail ||
                "Unable to load customers."
            );
        } finally {
            setLoading(false);
        }
    }

    async function addCustomer(event) {
        event.preventDefault();

        if (!name.trim()) {
            setError("Customer name is required.");
            return;
        }

        try {
            setSaving(true);
            setError("");
            setSuccess("");

            const response = await api.post(
                "/customers",
                {
                    name: name.trim(),
                    phone: phone.trim() || null,
                }
            );

            const newCustomer = response.data;

            setCustomers((previous) => [
                newCustomer,
                ...previous,
            ]);

            setName("");
            setPhone("");

            setSuccess(
                "Customer added successfully."
            );
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.detail ||
                "Unable to add customer."
            );
        } finally {
            setSaving(false);
        }
    }

    async function loadCustomerHistory(customer) {
        try {
            setSelectedCustomer(customer);
            setHistoryLoading(true);
            setError("");
            setTransactions([]);

            const response = await api.get(
                `/customers/${customer.id}/transactions`
            );

            setTransactions(response.data || []);
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.detail ||
                "Unable to load customer transaction history."
            );
        } finally {
            setHistoryLoading(false);
        }
    }

    async function downloadInvoice(invoiceId) {
        if (!invoiceId) {
            setError(
                "Invoice PDF is not available for this transaction."
            );
            return;
        }

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
                    <h1>Customers</h1>

                    <p>
                        Manage customers and view
                        their transaction history.
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

            {/* Add Customer */}

            <div className="dashboard-card">

                <h3>
                    Add Customer
                </h3>

                <form
                    onSubmit={addCustomer}
                    style={{
                        display: "flex",
                        gap: "10px",
                        marginTop: "20px",
                        flexWrap: "wrap",
                    }}
                >

                    <input
                        type="text"
                        placeholder="Customer name"
                        value={name}
                        onChange={(e) =>
                            setName(e.target.value)
                        }
                    />

                    <input
                        type="text"
                        placeholder="Phone number"
                        value={phone}
                        onChange={(e) =>
                            setPhone(e.target.value)
                        }
                    />

                    <button
                        type="submit"
                        className="primary-button"
                        disabled={saving}
                    >
                        {saving
                            ? "Adding..."
                            : "Add Customer"}
                    </button>

                </form>

            </div>

            {/* Customer List */}

            <div
                className="dashboard-card"
                style={{
                    marginTop: "20px",
                }}
            >

                <h3>
                    Customer List
                </h3>

                {loading ? (
                    <p>Loading customers...</p>
                ) : customers.length === 0 ? (
                    <p>
                        No customers found.
                    </p>
                ) : (
                    <div
                        style={{
                            overflowX: "auto",
                            marginTop: "15px",
                        }}
                    >

                        <table>

                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Created</th>
                                    <th>Action</th>
                                </tr>
                            </thead>

                            <tbody>

                                {customers.map(
                                    (customer) => (
                                        <tr
                                            key={
                                                customer.id
                                            }
                                        >

                                            <td>
                                                <strong>
                                                    {
                                                        customer.name
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    customer.phone ||
                                                    "—"
                                                }
                                            </td>

                                            <td>
                                                {customer.created_at
                                                    ? new Date(
                                                        customer.created_at
                                                    ).toLocaleDateString()
                                                    : "—"}
                                            </td>

                                            <td>

                                                <button
                                                    type="button"
                                                    className="secondary-button"
                                                    onClick={() =>
                                                        loadCustomerHistory(
                                                            customer
                                                        )
                                                    }
                                                >
                                                    View History
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

            {/* Transaction History */}

            {selectedCustomer && (
                <div
                    className="dashboard-card"
                    style={{
                        marginTop: "20px",
                    }}
                >

                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "15px",
                            flexWrap: "wrap",
                        }}
                    >

                        <div>

                            <h3>
                                Transaction History
                            </h3>

                            <p>
                                <strong>
                                    Customer:
                                </strong>{" "}
                                {
                                    selectedCustomer.name
                                }
                            </p>

                            {selectedCustomer.phone && (
                                <p>
                                    <strong>
                                        Phone:
                                    </strong>{" "}
                                    {
                                        selectedCustomer.phone
                                    }
                                </p>
                            )}

                        </div>

                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => {
                                setSelectedCustomer(null);
                                setTransactions([]);
                            }}
                        >
                            Close
                        </button>

                    </div>

                    {historyLoading ? (
                        <p>
                            Loading transaction history...
                        </p>
                    ) : transactions.length === 0 ? (
                        <p>
                            No transactions found for
                            this customer.
                        </p>
                    ) : (
                        <div
                            style={{
                                overflowX: "auto",
                                marginTop: "15px",
                            }}
                        >

                            <table>

                                <thead>
                                    <tr>
                                        <th>
                                            Invoice
                                        </th>

                                        <th>
                                            Date
                                        </th>

                                        <th>
                                            Items
                                        </th>

                                        <th>
                                            Subtotal
                                        </th>

                                        <th>
                                            Discount
                                        </th>

                                        <th>
                                            Tax
                                        </th>

                                        <th>
                                            Total
                                        </th>

                                        <th>
                                            Action
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {transactions.map(
                                        (transaction) => (
                                            <tr
                                                key={
                                                    transaction.id
                                                }
                                            >

                                                <td>
                                                    <strong>
                                                        {
                                                            transaction.invoice_number ||
                                                            transaction.invoice_id ||
                                                            "Invoice"
                                                        }
                                                    </strong>
                                                </td>

                                                <td>
                                                    {transaction.created_at
                                                        ? new Date(
                                                            transaction.created_at
                                                        ).toLocaleDateString()
                                                        : "—"}
                                                </td>

                                                <td>
                                                    {
                                                        (
                                                            transaction.items ||
                                                            []
                                                        ).length
                                                    }
                                                </td>

                                                <td>
                                                    ₹
                                                    {Number(
                                                        transaction.subtotal ||
                                                        0
                                                    ).toFixed(2)}
                                                </td>

                                                <td>
                                                    ₹
                                                    {Number(
                                                        transaction.discount ||
                                                        0
                                                    ).toFixed(2)}
                                                </td>

                                                <td>
                                                    ₹
                                                    {Number(
                                                        transaction.tax ||
                                                        0
                                                    ).toFixed(2)}
                                                </td>

                                                <td>
                                                    <strong>
                                                        ₹
                                                        {Number(
                                                            transaction.total_amount ||
                                                            0
                                                        ).toFixed(2)}
                                                    </strong>
                                                </td>

                                                <td>

                                                    <button
                                                        type="button"
                                                        className="primary-button"
                                                        onClick={() =>
                                                            downloadInvoice(
                                                                transaction.invoice_id
                                                            )
                                                        }
                                                        disabled={
                                                            downloading ||
                                                            !transaction.invoice_id
                                                        }
                                                    >
                                                        {downloading
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
            )}

        </div>
    );
}

