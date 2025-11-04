import { useState } from "react";
import BarcodeScanner from "./components/BarcodeScanner";

export default function App() {
  const [view, setView] = useState("scan");
  const [isbn, setIsbn] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [titleFromBackend, setTitleFromBackend] = useState("");
  const [manualTitle, setManualTitle] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [showManualTitle, setShowManualTitle] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // NEW
  const [location, setLocation] = useState("");


  const fetchTitle = async (isbnToUse) => {
    console.log("fetchTitle triggered with ISBN:", isbnToUse);
    try {
      const response = await fetch("https://testocrtest.pythonanywhere.com/receive_isbn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: isbnToUse }),
      });

      const data = await response.json();
      setIsbn(isbnToUse);

      if (data.title) {
        setTitleFromBackend(data.title);
        setManualTitle("");
        setShowManualTitle(false);
      } else {
        setTitleFromBackend("");
        setShowManualTitle(true);
      }

      setView("priceEntry");
    } catch (error) {
      console.error("❌ Fetch error:", error);
      setTitleFromBackend("");
      setShowManualTitle(true);
      setView("priceEntry");
    }
  };

  const sendToBackend = async () => {
    const title = titleFromBackend || manualTitle;
    if (!isbn || !title || !price || !quantity) return;

    setIsSaving(true); // Disable Save button

    try {
      const response = await fetch("https://testocrtest.pythonanywhere.com/save_title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn, b_title: title, price, quantity }),
      });

      const data = await response.json();
      setIsSaved(true);
      setSaveMessage("✅ Saved successfully");
      console.log("✅ Saved:", data);
    } catch (error) {
      console.error("❌ Save error:", error);
      setSaveMessage("❌ Error while saving");
    } finally {
      setIsSaving(false); // Optional: keep disabled or reset
    }
  };

  const handleBack = () => {
    setView("scan");
    setIsbn("");
    setManualIsbn("");
    setTitleFromBackend("");
    setManualTitle("");
    setPrice("");
    setQuantity("1");
    setShowManualTitle(false);
    setIsSaved(false);
    setSaveMessage("");
    setIsSaving(false); // Reset saving state on back
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {view === "scan" && (
          <>
            <h1 style={styles.header}>📚 ISBN Scanner</h1>
            <p style={styles.subText}>Scan to Store Book</p>
            <button style={styles.primaryButton} onClick={() => setView("liveScanner")}>Scan ISBN</button>
            <br/>
            <p style={styles.subText}>OR</p>
            <button style={styles.manualButton} onClick={() => setView("manualIsbn")}>Enter Manually</button>
          </>
        )}

        {view === "manualIsbn" && (
          <>
            <h3>Manual ISBN Entry</h3>
            <input
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
              placeholder="Enter ISBN"
              style={styles.input}
            />
            <button style={styles.primaryButton} onClick={() => fetchTitle(manualIsbn.trim())}>Next</button>
            <button style={styles.secondaryButton} onClick={handleBack}>Back</button>
          </>
        )}

        {view === "liveScanner" && (
          <>
            <h3>Focus on Barcode</h3>
            <BarcodeScanner onDetected={(isbn) => fetchTitle(isbn)} />
            <button style={styles.secondaryButton} onClick={handleBack}>Back</button>
          </>
        )}

        {view === "priceEntry" && (
          <>
            <p><strong>ISBN:</strong> {isbn}</p>
            {titleFromBackend && <p><strong>Title:</strong> {titleFromBackend}</p>}
            {showManualTitle && (
              <>
                <p>Enter Book Title:</p>
                <input
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder="Enter title"
                  style={styles.input}
                />
              </>
            )}
            <p>Enter Price:</p>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Enter price"
              style={styles.input}
            />
            <p>Enter Quantity:</p>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              style={styles.input}
            />

            {!isSaved && (
              <button
                style={{ 
                  ...styles.saveButton, 
                  opacity: isSaving ? 0.6 : 1, 
                  cursor: isSaving ? "not-allowed" : "pointer" 
                }}
                onClick={sendToBackend}
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : "💾 Save"}
              </button>
            )}
            {saveMessage && <p style={{ color: "green", marginTop: 12 }}>{saveMessage}</p>}
            <button style={styles.secondaryButton} onClick={handleBack}>Return to Scanner</button>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(to right, #e0f7fa, #fefefe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Segoe UI', sans-serif",
    padding: "20px",
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    padding: "30px",
    borderRadius: "20px",
    boxShadow: "0 15px 35px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  header: { fontSize: "26px", color: "#007bff" },
  subText: { color: "#666", marginBottom: "20px" },
  input: {
    padding: "10px",
    width: "90%",
    borderRadius: "8px",
    border: "1px solid #ccc",
    marginBottom: "12px",
  },
  primaryButton: {
    background: "#007bff",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 28px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "10px",
  },
  manualButton: {
    background: "#17a2b8",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 22px",
    fontSize: "15px",
    cursor: "pointer",
    marginTop: "10px",
  },
  saveButton: {
    background: "#28a745",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 22px",
    fontSize: "16px",
    cursor: "pointer",
    marginTop: "10px",
  },
  secondaryButton: {
    background: "#ffc107",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "12px 22px",
    fontSize: "15px",
    cursor: "pointer",
    marginTop: "20px",
  },
};
