import React, { useState, useEffect, useRef } from "react";
import BarcodeScanner from "./components/BarcodeScanner";

// This is a self-contained CSS loading animation, so no external GIF is needed.
function RunningCharacterLoader() {
  return (
    <div style={loadingStyles.container}>
      <div style={loadingStyles.spinner}></div>
      <p style={loadingStyles.text}>📖 Searching for book...</p>
      <div style={loadingStyles.dots}>
        <span style={{ ...loadingStyles.dot, animationDelay: "0s" }}></span>
        <span style={{ ...loadingStyles.dot, animationDelay: "0.2s" }}></span>
        <span style={{ ...loadingStyles.dot, animationDelay: "0.4s" }}></span>
      </div>
    </div>
  );
}

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
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ FEATURE: Default location state is set to "GRANDMALL"
  const [location, setLocation] = useState("GRANDMALL");

  // ✅ FEATURE: Create a ref for the manual input field
  const manualInputRef = useRef(null);

  // ✅ FEATURE: Add a useEffect to focus the input when the view changes
  useEffect(() => {
    if (view === "manualIsbn" && manualInputRef.current) {
      manualInputRef.current.focus();
    }
  }, [view]);

  const fetchTitle = async (isbnToUse) => {
    if (!isbnToUse || !isbnToUse.trim()) {
      console.warn("Please enter a valid ISBN");
      return;
    }

    setView("priceEntry");
    setIsLoading(true);

    const startTime = Date.now();
    try {
      const response = await fetch("https://testocr.pythonanywhere.com/receive_isbn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: isbnToUse.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setIsbn(isbnToUse.trim());

      if (data.title) {
        setTitleFromBackend(data.title);
        setManualTitle("");
        setShowManualTitle(false);
      } else {
        setTitleFromBackend("");
        setShowManualTitle(true);
      }
    } catch (error) {
      console.error("Error fetching title:", error);
      setTitleFromBackend("");
      setShowManualTitle(true);
    } finally {
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 300 - elapsed);
      setTimeout(() => setIsLoading(false), delay);
    }
  };

  const sendToBackend = async () => {
    const title = titleFromBackend || manualTitle;
    if (!isbn || !title || !price || !quantity || !location) {
      console.warn("Please fill in all fields including location.");
      return;
    }

    setIsSaving(true);
    setSaveMessage("");

    try {
      const response = await fetch("https://testocr.pythonanywhere.com/save_title", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isbn,
          b_title: title,
          price: parseFloat(price),
          quantity: parseInt(quantity),
          location
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      await response.json();
      setIsSaved(true);
      setSaveMessage("✅ Saved successfully");

      setTimeout(() => {
        setSaveMessage("");
      }, 3000);

    } catch (error) {
      console.error("Error saving data:", error);
      setSaveMessage("❌ Error while saving");
    } finally {
      setIsSaving(false);
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
    setLocation("GRANDMALL"); // Reset location back to default
    setShowManualTitle(false);
    setIsSaved(false);
    setSaveMessage("");
    setIsSaving(false);
    setIsLoading(false);
  };

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {view === "scan" && (
          <>
            <h1 style={styles.header}>📚 ISBN Scanner</h1>
            <p style={styles.subText}>Scan to Store Book</p>
            <button
              style={styles.primaryButton}
              onClick={() => setView("liveScanner")}
              onMouseOver={(e) => e.target.style.transform = "scale(1.02)"}
              onMouseOut={(e) => e.target.style.transform = "scale(1)"}
            >
              📷 Scan ISBN
            </button>
            <p style={{ ...styles.subText, margin: "20px 0 8px 0" }}>OR</p>
            <button
              style={styles.manualButton}
              onClick={() => setView("manualIsbn")}
              onMouseOver={(e) => e.target.style.transform = "scale(1.02)"}
              onMouseOut={(e) => e.target.style.transform = "scale(1)"}
            >
              ✏️ Enter Manually
            </button>
          </>
        )}

        {view === "manualIsbn" && (
          <>
            <h3 style={styles.subHeader}>Manual ISBN Entry</h3>
            <input
              ref={manualInputRef}
              value={manualIsbn}
              onChange={(e) => setManualIsbn(e.target.value)}
              onKeyPress={(e) => handleKeyPress(e, () => fetchTitle(manualIsbn.trim()))}
              placeholder="Enter ISBN (e.g., 9781234567890)"
              style={styles.input}
              maxLength={13}
            />
            <button
              style={styles.primaryButton}
              onClick={() => fetchTitle(manualIsbn.trim())}
              disabled={!manualIsbn.trim()}
            >
              🔍 Search Book
            </button>
            <button style={styles.secondaryButton} onClick={handleBack}>
              ← Back
            </button>
          </>
        )}

        {view === "liveScanner" && (
          <>
            <h3 style={styles.subHeader}>Focus on Barcode</h3>
            <div style={styles.scannerArea}>
              <BarcodeScanner onDetected={fetchTitle} />
              <div style={styles.scannerLine} />
            </div>
            <p style={styles.instructionText}>
              Position the barcode within the frame
            </p>
            <button style={styles.secondaryButton} onClick={handleBack}>
              ← Back
            </button>
          </>
        )}

        {view === "priceEntry" && (
          <>
            {isLoading ? (
              <RunningCharacterLoader />
            ) : (
              <>
                <div style={styles.bookInfo}>
                  <p style={styles.bookDetail}>
                    <span style={styles.label}>📖 ISBN:</span> {isbn}
                  </p>
                  {titleFromBackend && (
                    <p style={styles.bookDetail}>
                      <span style={styles.label}>📚 Title:</span> {titleFromBackend}
                    </p>
                  )}
                </div>

                {showManualTitle && (
                  <>
                    <p style={styles.inputLabel}>📝 Enter Book Title:</p>
                    <input
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Enter book title"
                      style={styles.input}
                      required
                    />
                  </>
                )}

                <p style={styles.inputLabel}>💰 Enter Price:</p>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                  style={styles.input}
                  min={0}
                  step="0.01"
                  required
                />

                <p style={styles.inputLabel}>📦 Enter Quantity:</p>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1"
                  style={styles.input}
                  min={1}
                  required
                />

                <p style={styles.inputLabel}>📍 Select Location:</p>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  style={{ ...styles.input, paddingRight: 10, cursor: "pointer" }}
                  required
                >
                  <option value="">-- Select Location --</option>
                  <option value="DLF">🏢 DLF</option>
                  <option value="GRANDMALL">🏬 GRAND MALL</option>
                  <option value="MARINAMALL">🛍️ MARINA MALL</option>
                  <option value="SKYWALK">🌉 SKYWALK</option>
                  <option value="WAREHOUSE">📦 WAREHOUSE</option>
                  <option value="GARUDA-BNGLR">✈️ Garuda-Bnglr</option>
                </select>

                {!isSaved && (
                  <button
                    style={{
                      ...styles.saveButton,
                      opacity: isSaving ? 0.6 : 1,
                      cursor: isSaving ? "not-allowed" : "pointer",
                    }}
                    onClick={sendToBackend}
                    disabled={isSaving}
                  >
                    {isSaving ? "💾 Saving..." : "💾 Save Book"}
                  </button>
                )}

                {saveMessage && (
                  <div style={styles.messageContainer}>
                    <span style={styles.message}>
                      {saveMessage}
                    </span>
                  </div>
                )}

                <button style={styles.secondaryButton} onClick={handleBack}>
                  🔄 Return to Scanner
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

const loadingStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    textAlign: "center",
  },
  spinner: {
    width: "60px",
    height: "60px",
    border: "5px solid #f3f3f3",
    borderTop: "5px solid #007bff",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    marginBottom: "20px",
  },
  text: {
    fontSize: 18,
    fontWeight: 600,
    color: "#007bff",
    margin: "10px 0",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  dots: {
    display: "flex",
    justifyContent: "center",
    marginTop: 10,
  },
  dot: {
    width: 8,
    height: 8,
    backgroundColor: "#007bff",
    borderRadius: "50%",
    margin: "0 3px",
    animation: "dotPulse 1.4s infinite ease-in-out",
  },
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #c3cfe2 0%, #eef2f3 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: "20px"
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "#fff",
    padding: "30px",
    borderRadius: "24px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
    textAlign: "center",
    margin: "0 8px",
    position: "relative",
    animation: "fadeIn 0.7s"
  },
  header: {
    fontSize: "30px",
    color: "#007bff",
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 8,
    textShadow: "0 2px 10px #e3f2fd99"
  },
  subHeader: {
    fontSize: "20px",
    color: "#333",
    fontWeight: 600,
    marginBottom: 20,
  },
  subText: {
    color: "#666",
    marginBottom: "18px",
    fontWeight: 500,
    letterSpacing: 0.5,
  },
  instructionText: {
    color: "#666",
    fontSize: "14px",
    fontStyle: "italic",
    marginBottom: 10,
  },
  bookInfo: {
    background: "#f8f9fa",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "20px",
    border: "1px solid #e9ecef",
  },
  bookDetail: {
    textAlign: "left",
    fontWeight: 500,
    color: "#555",
    marginBottom: 8,
    fontSize: "14px",
  },
  label: {
    color: "#2196f3",
    fontWeight: 600,
  },
  inputLabel: {
    fontWeight: 600,
    color: "#444",
    textAlign: "left",
    margin: "12px 0 6px 2px",
    fontSize: "15px"
  },
  input: {
    padding: "12px",
    width: "90%",
    borderRadius: "10px",
    border: "2px solid #e1e5e9",
    background: "#f8f9fa",
    fontSize: "15px",
    marginBottom: "16px",
    transition: "all 0.3s ease",
    outline: "none",
  },
  primaryButton: {
    background: "linear-gradient(90deg,#007bff,#2186eb)",
    color: "#fff",
    border: "none",
    borderRadius: "16px",
    padding: "16px 30px",
    fontSize: "17px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "14px",
    marginBottom: 10,
    boxShadow: "0 4px 15px rgba(0,123,255,0.3)",
    transition: "all 0.2s ease",
    minWidth: "140px",
  },
  manualButton: {
    background: "linear-gradient(90deg,#17a2b8,#20c997)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "14px 28px",
    fontSize: "16px",
    fontWeight: 500,
    cursor: "pointer",
    marginTop: "6px",
    marginBottom: 8,
    transition: "all 0.2s ease",
    minWidth: "140px",
  },
  saveButton: {
    background: "linear-gradient(90deg,#28a745,#20c997)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "16px 30px",
    fontSize: "17px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "20px",
    boxShadow: "0 4px 15px rgba(40,167,69,0.3)",
    transition: "all 0.2s ease",
    minWidth: "140px",
  },
  secondaryButton: {
    background: "linear-gradient(90deg,#ffc107,#fd7e14)",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: 500,
    cursor: "pointer",
    marginTop: "16px",
    transition: "all 0.2s ease",
    minWidth: "100px",
  },
  scannerArea: {
    border: "4px solid #00bcd4",
    borderRadius: "18px",
    boxShadow: "0 4px 20px rgba(0,188,212,0.3)",
    width: "90%",
    maxWidth: "320px",
    margin: "0 auto 18px",
    position: "relative",
    overflow: "hidden",
    height: "240px",
    background: "#f0fdff"
  },
  scannerLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: "4px",
    top: 0,
    background: "linear-gradient(90deg,#00c6ff,#0072ff,#00c6ff)",
    animation: "scan-line 2s linear infinite"
  },
  messageContainer: {
    margin: "16px 0",
    padding: "12px",
    borderRadius: "8px",
    background: "#f8f9fa",
  },
  message: {
    fontWeight: 600,
    fontSize: "15px",
  },
};
