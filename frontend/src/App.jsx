import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import CreateInvoice from "./pages/CreateInvoice";
import Customers from "./pages/Customers";
import Invoices from "./pages/Invoices";
import InvoiceDetails from "./pages/InvoiceDetails";
import Stock from "./pages/Stock";
import Upload from "./pages/Upload";


function ProtectedRoute({ children }) {
  const token = localStorage.getItem("access_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}


function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* Login */}
        <Route
          path="/login"
          element={<Login />}
        />


        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />


        {/* Create Invoice */}
        <Route
          path="/create-invoice"
          element={
            <ProtectedRoute>
              <CreateInvoice />
            </ProtectedRoute>
          }
        />


        {/* Upload Product List */}
        <Route
          path="/upload"
          element={
            <ProtectedRoute>
              <Upload />
            </ProtectedRoute>
          }
        />


        {/* Stock */}
        <Route
          path="/stock"
          element={
            <ProtectedRoute>
              <Stock />
            </ProtectedRoute>
          }
        />


        {/* Customers */}
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          }
        />


        {/* Invoices */}
        <Route
          path="/invoices"
          element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          }
        />

        <Route
          path="/invoices/:invoiceId"
          element={
            <ProtectedRoute>
              <InvoiceDetails />
            </ProtectedRoute>
          }
        />


        {/* Default */}
        <Route
          path="/"
          element={
            <Navigate
              to={
                localStorage.getItem("access_token")
                  ? "/dashboard"
                  : "/login"
              }
              replace
            />
          }
        />


        {/* 404 */}
        <Route
          path="*"
          element={
            <Navigate
              to="/"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}


export default App;

