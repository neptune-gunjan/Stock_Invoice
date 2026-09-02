import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import * as XLSX from "xlsx";

function Upload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [uploading, setUploading] = useState(false);

  function reset() {
    setFile(null);
    setPreview([]);
    setHeaders([]);
    setError("");
    setResult(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function parseCSV(text) {
    const lines = text
      .split(/\r?\n/)
      .filter((line) => line.trim());

    if (lines.length === 0) {
      return {
        headers: [],
        rows: [],
      };
    }

    const parseLine = (line) => {
      const values = [];
      let current = "";
      let insideQuotes = false;

      for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
          if (
            insideQuotes &&
            line[i + 1] === '"'
          ) {
            current += '"';
            i += 1;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (
          char === "," &&
          !insideQuotes
        ) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      values.push(current.trim());

      return values;
    };

    const csvHeaders = parseLine(lines[0]);

    const rows = lines
      .slice(1)
      .map((line) => {
        const values = parseLine(line);

        return csvHeaders.reduce(
          (row, header, index) => {
            row[header] = values[index] || "";
            return row;
          },
          {}
        );
      });

    return {
      headers: csvHeaders,
      rows,
    };
  }

  function validateHeaders(fileHeaders) {
    const requiredColumns = [
      "name",
      "unit",
      "unit_price",
      "quantity_available",
    ];

    const normalizedHeaders = fileHeaders.map(
      (header) =>
        String(header).trim().toLowerCase()
    );

    const missingColumns =
      requiredColumns.filter(
        (column) =>
          !normalizedHeaders.includes(column)
      );

    if (missingColumns.length > 0) {
      setError(
        `Missing required columns: ${missingColumns.join(
          ", "
        )}`
      );

      return false;
    }

    return true;
  }

  function handleCSVFile(selectedFile) {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text =
          event.target?.result || "";

        const parsed = parseCSV(text);

        if (parsed.headers.length === 0) {
          setError("The CSV file is empty.");
          return;
        }

        setHeaders(parsed.headers);
        setPreview(
          parsed.rows.slice(0, 5)
        );

        validateHeaders(parsed.headers);
      } catch (err) {
        console.error(err);
        setError(
          "Unable to read the CSV file."
        );
      }
    };

    reader.onerror = () => {
      setError(
        "Unable to read the CSV file."
      );
    };

    reader.readAsText(selectedFile);
  }

  function handleXLSXFile(selectedFile) {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const arrayBuffer =
          event.target?.result;

        if (!arrayBuffer) {
          setError(
            "Unable to read the Excel file."
          );
          return;
        }

        const workbook = XLSX.read(
          arrayBuffer,
          {
            type: "array",
          }
        );

        if (
          !workbook.SheetNames ||
          workbook.SheetNames.length === 0
        ) {
          setError(
            "The Excel file does not contain any sheets."
          );
          return;
        }

        const firstSheetName =
          workbook.SheetNames[0];

        const worksheet =
          workbook.Sheets[firstSheetName];

        if (!worksheet) {
          setError(
            "Unable to read the first Excel sheet."
          );
          return;
        }

        const sheetRows =
          XLSX.utils.sheet_to_json(
            worksheet,
            {
              header: 1,
              defval: "",
              raw: false,
            }
          );

        if (
          !sheetRows ||
          sheetRows.length === 0
        ) {
          setError(
            "The Excel file is empty."
          );
          return;
        }

        const excelHeaders =
          sheetRows[0].map(
            (header) =>
              String(header).trim()
          );

        if (
          excelHeaders.length === 0 ||
          excelHeaders.every(
            (header) => !header
          )
        ) {
          setError(
            "The Excel file does not contain headers."
          );
          return;
        }

        const excelRows = sheetRows
          .slice(1)
          .filter((row) =>
            row.some(
              (value) =>
                String(value).trim() !== ""
            )
          )
          .map((row) => {
            return excelHeaders.reduce(
              (obj, header, index) => {
                obj[header] =
                  row[index] !== undefined
                    ? String(row[index])
                    : "";

                return obj;
              },
              {}
            );
          });

        setHeaders(excelHeaders);
        setPreview(
          excelRows.slice(0, 5)
        );

        validateHeaders(excelHeaders);
      } catch (err) {
        console.error(err);

        setError(
          "Unable to read the Excel file. Please make sure it is a valid XLSX file."
        );
      }
    };

    reader.onerror = () => {
      setError(
        "Unable to read the Excel file."
      );
    };

    reader.readAsArrayBuffer(selectedFile);
  }

  function handleFileChange(event) {
    const selectedFile =
      event.target.files?.[0];

    setError("");
    setResult(null);
    setPreview([]);
    setHeaders([]);

    if (!selectedFile) {
      setFile(null);
      return;
    }

    const fileName =
      selectedFile.name.toLowerCase();

    const isCSV =
      fileName.endsWith(".csv");

    const isXLSX =
      fileName.endsWith(".xlsx");

    if (!isCSV && !isXLSX) {
      setFile(null);

      setError(
        "Please select a CSV or XLSX file only."
      );

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setFile(selectedFile);

    if (isXLSX) {
      handleXLSXFile(selectedFile);
    } else {
      handleCSVFile(selectedFile);
    }
  }

  async function handleUpload() {
    if (!file) {
      setError(
        "Please select a CSV or XLSX file first."
      );
      return;
    }

    setUploading(true);
    setError("");
    setResult(null);

    try {
      const formData = new FormData();

      formData.append(
        "file",
        file
      );

      const response = await api.post(
        "/stock/import",
        formData,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      setResult(response.data);
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.detail ||
          `Unable to import the ${
            file.name
              .toLowerCase()
              .endsWith(".xlsx")
              ? "Excel"
              : "CSV"
          } file.`
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="invoice-page">
      <div className="page-header">
        <div>
          <h1>Import Stock</h1>

          <p>
            Add multiple products to your
            stock using a CSV or Excel file.
          </p>
        </div>

        <div className="page-header-actions">
          <button
            className="secondary-button"
            onClick={() =>
              navigate("/stock")
            }
            disabled={uploading}
          >
            ← Back to Stock
          </button>
        </div>
      </div>

      {error && (
        <div className="alert error">
          {error}
        </div>
      )}

      {result ? (
        <div className="dashboard-card">
          <div className="upload-result">
            <div className="upload-success-icon">
              ✓
            </div>

            <h2>
              Import Completed
            </h2>

            <p>
              Your{" "}
              {file?.name
                ?.toLowerCase()
                .endsWith(".xlsx")
                ? "Excel"
                : "CSV"}{" "}
              file has been processed.
            </p>

            <div className="dashboard-grid upload-summary">
              <div className="dashboard-card">
                <div className="dashboard-card-label">
                  Imported
                </div>

                <div className="dashboard-card-value">
                  {result.imported ?? 0}
                </div>
              </div>

              <div className="dashboard-card">
                <div className="dashboard-card-label">
                  Skipped
                </div>

                <div className="dashboard-card-value">
                  {result.skipped ?? 0}
                </div>
              </div>

              <div className="dashboard-card">
                <div className="dashboard-card-label">
                  Failed
                </div>

                <div className="dashboard-card-value">
                  {result.failed ?? 0}
                </div>
              </div>
            </div>

            {result.errors?.length > 0 && (
              <div className="upload-errors">
                <h3>
                  Import Issues
                </h3>

                {result.errors.map(
                  (item, index) => (
                    <div
                      key={index}
                      className="upload-error-row"
                    >
                      <strong>
                        Row {item.row}
                      </strong>

                      <span>
                        {item.message}
                      </span>
                    </div>
                  )
                )}
              </div>
            )}

            <div className="page-header-actions">
              <button
                className="secondary-button"
                onClick={reset}
              >
                Import Another File
              </button>

              <button
                className="primary-button"
                onClick={() =>
                  navigate("/stock")
                }
              >
                View Stock
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="dashboard-card upload-card">
          <div className="upload-dropzone">
            <div className="upload-icon">
              ↑
            </div>

            <h2>
              Upload Stock File
            </h2>

            <p>
              Select a CSV or XLSX file
              containing your products.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={
                handleFileChange
              }
            />

            <p className="upload-hint">
              Required columns:
              <br />

              <strong>
                name, unit, unit_price,
                quantity_available
              </strong>
            </p>

            <p className="upload-hint">
              Optional columns:
              <br />

              sku, low_stock_threshold,
              aliases
            </p>
          </div>

          {file && (
            <div className="selected-file">
              <div>
                <strong>
                  {file.name}
                </strong>

                <div className="upload-file-size">
                  {(
                    file.size / 1024
                  ).toFixed(1)}{" "}
                  KB
                </div>
              </div>

              <button
                className="secondary-button"
                onClick={reset}
                disabled={uploading}
              >
                Remove
              </button>
            </div>
          )}

          {headers.length > 0 && (
            <div className="upload-preview">
              <div className="table-toolbar">
                <div>
                  <h2>
                    Preview
                  </h2>

                  <p>
                    Showing first{" "}
                    {preview.length} rows
                  </p>
                </div>
              </div>

              {preview.length > 0 ? (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {headers.map(
                          (header, index) => (
                            <th
                              key={`${header}-${index}`}
                            >
                              {header}
                            </th>
                          )
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {preview.map(
                        (
                          row,
                          rowIndex
                        ) => (
                          <tr
                            key={rowIndex}
                          >
                            {headers.map(
                              (
                                header,
                                headerIndex
                              ) => (
                                <td
                                  key={`${header}-${headerIndex}`}
                                >
                                  {row[
                                    header
                                  ] !==
                                  undefined &&
                                  row[
                                    header
                                  ] !==
                                  ""
                                    ? row[
                                        header
                                      ]
                                    : "—"}
                                </td>
                              )
                            )}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="upload-hint">
                  No product rows found.
                </p>
              )}
            </div>
          )}

          <div className="upload-actions">
            <button
              className="secondary-button"
              onClick={() =>
                navigate("/stock")
              }
              disabled={uploading}
            >
              Cancel
            </button>

            <button
              className="primary-button"
              onClick={handleUpload}
              disabled={
                !file ||
                uploading ||
                error.startsWith(
                  "Missing required columns"
                )
              }
            >
              {uploading
                ? "Importing..."
                : "Import Products"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Upload;