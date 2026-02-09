import React, { useState, useEffect, useRef, useCallback } from "react";

// --- COMPONENTS ---

// The BarcodeScanner component
function BarcodeScanner({ onDetected }) {
  const scannerRef = useRef(null);
  const isScanning = useRef(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const initializeScanner = () => {
        const readerElement = document.getElementById("reader");
        if (!readerElement) {
          console.error("The element with id 'reader' was not found.");
          if (isMounted) {
            setLoading(false);
            setErrorMessage("Scanner container not found.");
          }
          return;
        }

        if (!window.Html5Qrcode) {
            if (isMounted) {
                setErrorMessage("Scanner library failed to load.");
                setLoading(false);
            }
            return;
        }

        const scanner = new window.Html5Qrcode("reader");
        scannerRef.current = scanner;

        window.Html5Qrcode.getCameras()
          .then((devices) => {
            if (!isMounted) return;
            const backCamera =
              devices.find((d) => d.label.toLowerCase().includes("back")) || devices[0];
            if (!backCamera) {
              throw new Error("No camera found. Please grant camera permissions.");
            }
            scanner
              .start(
                backCamera.id,
                { fps: 10, qrbox: { width: 250, height: 150 } },
                (decodedText) => {
                  const isbn = decodedText.replace(/[^0-9X]/gi, "");
                  if ((isbn.length === 10 || isbn.length === 13) && (isbn.startsWith("978") || isbn.startsWith("979"))) {
                    if (isScanning.current) {
                      isScanning.current = false;
                      scanner.stop().then(() => onDetected(isbn));
                    }
                  }
                },
                (err) => { /* Ignore scan errors */ }
              )
              .then(() => {
                if (isMounted) { isScanning.current = true; setLoading(false); }
              })
              .catch((err) => {
                 if (isMounted) {
                    console.error("Scanner start error:", err);
                    setErrorMessage("Failed to start camera. Check permissions.");
                    setLoading(false);
                }
              });
          })
          .catch((err) => {
            if (isMounted) {
                console.error("Camera initialization error:", err);
                setErrorMessage(err.message || "Could not access camera.");
                setLoading(false);
            }
          });
    };

    // Load the script dynamically since we can't use import
    if (!window.Html5Qrcode) {
        const script = document.createElement('script');
        script.src = "https://unpkg.com/html5-qrcode";
        script.async = true;
        script.onload = () => {
            if (isMounted) initializeScanner();
        };
        script.onerror = () => {
             if (isMounted) {
                 setErrorMessage("Failed to load scanner script.");
                 setLoading(false);
             }
        };
        document.body.appendChild(script);
    } else {
        initializeScanner();
    }

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((error) => {
            console.warn("Error stopping scanner:", error);
        });
      }
    };
  }, [onDetected]);

  return (
    <div>
      {loading && <p style={{ color: "#007bff", paddingTop: "20px" }}>📸 Initializing camera...</p>}
      {errorMessage && <p style={{ color: "#dc3545", paddingTop: "20px" }}>⚠️ {errorMessage}</p>}
      <div id="reader" style={{ width: "100%", borderRadius: "10px", overflow: "hidden" }} />
    </div>
  );
}

// Loading Animation Component
function RunningCharacterLoader() {
  return (
    <div style={loadingStyles.container}>
      <div style={loadingStyles.spinner}></div>
      <p style={loadingStyles.text}>📖 Searching for book...</p>
    </div>
  );
}

// --- CATEGORY DATA ---

const CATEGORIES = [
  "PRELOVED_NON_FICTION", "ACTIVITY", "TEEN_FICTION", "NON_FICTION",
  "FICTION", "PRELOVED_FICTION", "COFFEE_TABLE", "PRELOVED_TEEN_FICTION", "ACADEMIC",
  "KIDS", "DICTIONARIES"
];

const SUB_CATEGORIES = [
  "SELF-HELP_EDUCATIONAL", "CHILDRENS_LEARNING_ACTIVITY", "FANTASY_YOUNG_ADULT",
  "REFERENCE_INFORMATIONAL", "GENERAL_STORY_ADVENTURE", "GENERAL",
  "CLASSIC_CHILDRENS_ADVENTURE", "VISUAL_LIFESTYLE", "FANTASY_ADVENTURE",
  "EDUCATIONAL_STUDY_MATERIAL"
];

// --- MAIN APP COMPONENT ---

export default function App() {
  const [view, setView] = useState("scan");
  const [isbn, setIsbn] = useState("");
  const [manualIsbn, setManualIsbn] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [entryMethod, setEntryMethod] = useState("scan");
  
  // Existing Fields
  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [location, setLocation] = useState("");

  // --- NEW FIELDS ---
  const [condition, setCondition] = useState(""); // New, Pre-Owned
  const [bookType, setBookType] = useState("");   // Good, Almost New

  const [saveMessage, setSaveMessage] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const manualInputRef = useRef(null);

  useEffect(() => {
    if (view === "manualIsbn" && manualInputRef.current) {
      manualInputRef.current.focus();
    }
  }, [view]);

  const resetForNextScan = useCallback(() => {
    setIsbn(""); 
    setManualIsbn(""); 
    setTitle("");
    setAuthor("");
    setCategory(""); 
    setSubCategory(""); 
    setPrice("");
    setQuantity("1"); 
    setLocation("");
    // Reset new fields
    setCondition("");
    setBookType("");

    setIsSaved(false); 
    setSaveMessage(""); 
    setIsSaving(false); 
    setIsLoading(false);
    
    if (entryMethod === 'manual') {
      setView("manualIsbn");
    } else {
      setView("scan");
    }
  }, [entryMethod]);

  const fetchTitle = async (isbnToUse, method) => {
    if (!isbnToUse || isbnToUse.trim().length !== 13) return;
    
    setEntryMethod(method);
    setView("priceEntry");
    setIsLoading(true);
    const startTime = Date.now();
    try {
      const response = await fetch("https://testocr.pythonanywhere.com/receive_isbn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isbn: isbnToUse.trim() }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      setIsbn(isbnToUse.trim());

      setTitle(data.title || "");
      setAuthor(data.author || "");

    } catch (error) {
      console.error("Error fetching title:", error);
      setTitle("");
      setAuthor("");
    } finally {
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 300 - elapsed);
      setTimeout(() => setIsLoading(false), delay);
    }
  };

  const sendToBackend = async () => {
    // Validation: ensure condition is selected. 
    // If condition is Pre-Owned, ensure bookType is selected.
    if (!isbn || !title || !author || !price || !quantity || !location || !condition) {
      setSaveMessage("❌ PLEASE FILL IN ALL REQUIRED FIELDS.");
      setTimeout(() => setSaveMessage(""), 3000);
      return;
    }

    if (condition === "Pre-Owned" && !bookType) {
        setSaveMessage("❌ PLEASE SELECT BOOK TYPE.");
        setTimeout(() => setSaveMessage(""), 3000);
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
          b_author: author,
          price: parseFloat(price),
          quantity: parseInt(quantity), 
          location, 
          category: category || null, 
          sub_category: subCategory || null,
          // Sending new fields to backend
          condition: condition,
          book_type: condition === "Pre-Owned" ? bookType : null
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();
      setIsSaved(true);
      setSaveMessage("✅ SAVED SUCCESSFULLY");
    } catch (error)
    {
      console.error("Error saving data:", error);
      setSaveMessage("❌ ERROR WHILE SAVING");
    } finally {
      setIsSaving(false);
    }
  };

  const handleManualIsbnChange = (e) => {
    const newIsbn = e.target.value;
    setManualIsbn(newIsbn);
    if (newIsbn.length === 13) {
      fetchTitle(newIsbn, 'manual');
    }
  };

  // --- HOVER EFFECT HANDLERS ---
  const handleButtonHover = (e, enter) => {
    e.currentTarget.style.transform = enter ? "scale(1.05)" : "scale(1)";
  };

  const handleConditionChange = (e) => {
    const val = e.target.value;
    setCondition(val);
    // If user switches away from Pre-Owned, clear the Book Type
    if (val !== "Pre-Owned") {
        setBookType("");
    }
  };

  // --- RENDER ---

  const MainMenu = () => (
    <>
      <h1 style={styles.header}>📚 ISBN Scanner</h1>
      <p style={styles.subText}>Scan to Store Book</p>
      <button
        style={{ ...styles.button, ...styles.primaryButton }}
        onClick={() => setView("liveScanner")}
        onMouseEnter={(e) => handleButtonHover(e, true)}
        onMouseLeave={(e) => handleButtonHover(e, false)}
      >
        📷 Scan ISBN
      </button>
      <p style={{ ...styles.subText, margin: "20px 0 8px 0" }}>OR</p>
      <button
        style={{ ...styles.button, ...styles.manualButton }}
        onClick={() => setView("manualIsbn")}
        onMouseEnter={(e) => handleButtonHover(e, true)}
        onMouseLeave={(e) => handleButtonHover(e, false)}
      >
        ✏️ Enter Manually
      </button>
    </>
  );

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {view === "scan" && <MainMenu />}

        {view === "manualIsbn" && (
          <>
            <h3 style={styles.subHeader}>Manual ISBN Entry</h3>
            <input
              ref={manualInputRef}
              value={manualIsbn}
              onChange={handleManualIsbnChange}
              placeholder="Scan or Enter 13-digit ISBN"
              style={styles.input}
              maxLength={13}
            />
            <p style={styles.instructionText}>
              System will automatically search when 13 digits are entered.
            </p>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => setView("scan")}
              onMouseEnter={(e) => handleButtonHover(e, true)}
              onMouseLeave={(e) => handleButtonHover(e, false)}
            >
              ← Main Menu
            </button>
          </>
        )}

        {view === "liveScanner" && (
          <>
            <h3 style={styles.subHeader}>Focus on Barcode</h3>
            <div style={styles.scannerArea}>
              <BarcodeScanner onDetected={(isbn) => fetchTitle(isbn, 'scan')} />
            </div>
            <p style={styles.instructionText}>Position the barcode within the frame</p>
            <button
              style={{ ...styles.button, ...styles.secondaryButton }}
              onClick={() => setView("scan")}
              onMouseEnter={(e) => handleButtonHover(e, true)}
              onMouseLeave={(e) => handleButtonHover(e, false)}
            >
              ← Main Menu
            </button>
          </>
        )}

        {view === "priceEntry" && (
          <>
            {isLoading ? <RunningCharacterLoader /> : (
              <>
                <p style={styles.inputLabel}>📖 ISBN:</p>
                <input 
                  value={isbn} 
                  style={{...styles.input, ...styles.disabledInput}} 
                  readOnly 
                />

                <p style={styles.inputLabel}>📚 Title:</p>
                <input 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Enter book title" 
                  style={styles.input} 
                  required 
                />
                
                <p style={styles.inputLabel}>👤 Author:</p>
                <input 
                  value={author} 
                  onChange={(e) => setAuthor(e.target.value)} 
                  placeholder="Enter author name" 
                  style={styles.input} 
                  required
                />

                <p style={styles.inputLabel}>💰 Enter Price:</p>
                <input type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00" style={styles.input} min={0} step="0.01" required />

                <p style={styles.inputLabel}>📦 Enter Quantity:</p>
                <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)}
                  placeholder="1" style={styles.input} min={1} required />

                {/* --- NEW DROP DOWNS START HERE --- */}
                
                <p style={styles.inputLabel}>✨ Book Condition:</p>
                <select value={condition} onChange={handleConditionChange} style={styles.input} required>
                    <option value="">-- SELECT CONDITION --</option>
                    <option value="New">New</option>
                    <option value="Pre-Owned">Pre-Owned</option>
                </select>

                {condition === "Pre-Owned" && (
                    <>
                        <p style={styles.inputLabel}>🧐 Book Type:</p>
                        <select value={bookType} onChange={(e) => setBookType(e.target.value)} style={styles.input} required>
                            <option value="">-- SELECT TYPE --</option>
                            <option value="Good">Good</option>
                            <option value="Almost New">Almost New</option>
                        </select>
                    </>
                )}

                {/* --- NEW DROP DOWNS END HERE --- */}

                <p style={styles.inputLabel}>📍 Select Location:</p>
                <select value={location} onChange={(e) => setLocation(e.target.value)}
                  style={styles.input} required >
                  <option value="">-- SELECT LOCATION --</option>
                  <option value="GRANDMALL">🏬 GRAND MALL</option>
                  <option value="DLF">🏢 DLF</option>
                  <option value="MARINAMALL">🛍️ MARINA MALL</option>
                  <option value="SKYWALK">🌉 SKYWALK</option>
                  <option value="WAREHOUSE">📦 WAREHOUSE</option>
                  <option value="GARUDA-BNGLR">✈️ Garuda-Bnglr</option>
                  <option value="KNK"> KNK</option>
                  <option value="BLRExpo"> BLRExpo</option>
                  <option value="ECOMMERCE"> ECOMMERCE</option>
                </select>

                <p style={styles.inputLabel}>📊 Select Category:</p>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  style={styles.input} >
                  <option value="">-- SELECT CATEGORY --</option>
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>

                <p style={styles.inputLabel}>📑 Select Sub-Category:</p>
                <select value={subCategory} onChange={(e) => setSubCategory(e.target.value)}
                  style={styles.input} >
                  <option value="">-- SELECT SUB-CATEGORY --</option>
                  {SUB_CATEGORIES.map(subCat => (
                    <option key={subCat} value={subCat}>{subCat}</option>
                  ))}
                </select>

                <button
                  style={{ ...styles.button, ...styles.saveButton, opacity: isSaving || isSaved ? 0.7 : 1 }}
                  onClick={sendToBackend} disabled={isSaving || isSaved}
                  onMouseEnter={(e) => handleButtonHover(e, true)}
                  onMouseLeave={(e) => handleButtonHover(e, false)}
                >
                  {isSaving ? "💾 SAVING..." : (isSaved ? "✅ SAVED" : "💾 SAVE BOOK")}
                </button>

                {saveMessage && (
                  <div style={styles.messageContainer}>
                    <span style={{...styles.message, color: saveMessage.startsWith("❌") ? "#dc3545" : "#28a745" }}>
                      {saveMessage}
                    </span>
                  </div>
                )}

                <button
                  style={{ ...styles.button, ...styles.secondaryButton, marginTop: "10px" }}
                  onClick={resetForNextScan}
                  onMouseEnter={(e) => handleButtonHover(e, true)}
                  onMouseLeave={(e) => handleButtonHover(e, false)}
                >
                  {isSaved ? "➡️ Finish / Scan Next" : "⬅️ Cancel / Back"}
                </button>

              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// --- STYLES ---

const loadingStyles = {
  container: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px", textAlign: "center", minHeight: "500px" },
  spinner: { width: "60px", height: "60px", border: "5px solid #f3f3f3", borderTop: "5px solid #007bff", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: "20px" },
  text: { fontSize: 18, fontWeight: 600, color: "#007bff", margin: "10px 0", fontFamily: "'Inter', 'Segoe UI', sans-serif" },
};

const styles = {
  container: {
    minHeight: "100vh",
    background: "#f0f2f5", 
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    padding: "20px"
  },
  card: {
    width: "100%",
    maxWidth: "420px",
    background: "rgba(255, 255, 255, 0.25)", 
    padding: "30px",
    borderRadius: "24px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
    textAlign: "center",
    margin: "0 8px",
    position: "relative",
    backdropFilter: "blur(20px)", 
    border: "1px solid rgba(255, 255, 255, 0.5)", 
    color: "#333"
  },
  header: {
    fontSize: "30px",
    color: "#007bff",
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 8,
    textShadow: "0 2px 10px rgba(0,123,255,0.1)"
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
    marginTop: 10,
  },
  inputLabel: {
    fontWeight: 600,
    color: "#444",
    textAlign: "left",
    margin: "12px 0 6px 4px",
    fontSize: "15px"
  },
  input: {
    padding: "14px",
    width: "calc(100% - 28px)",
    borderRadius: "10px",
    border: "1px solid rgba(255, 255, 255, 0.6)",
    background: "rgba(255, 255, 255, 0.5)", 
    fontSize: "15px",
    marginBottom: "16px",
    transition: "all 0.3s ease",
    outline: "none",
    color: "#333",
    WebkitAppearance: "none",
    boxSizing: "border-box",
    textAlign: "left",
    paddingRight: "14px",
  },
  disabledInput: {
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    color: "#666",
    cursor: "not-allowed",
  },
  button: {
    color: "#fff",
    border: "none",
    borderRadius: "16px",
    padding: "16px 30px",
    fontSize: "17px",
    fontWeight: 600,
    cursor: "pointer",
    marginTop: "14px",
    marginBottom: 10,
    boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
    transition: "transform 0.2s ease",
    minWidth: "140px",
    textAlign: "center",
  },
  primaryButton: {
    background: "linear-gradient(90deg,#007bff,#2186eb)",
    boxShadow: "0 4px 15px rgba(0,123,255,0.3)",
  },
  manualButton: {
    background: "linear-gradient(90deg,#17a2b8,#20c997)",
    boxShadow: "0 4px 15px rgba(23,162,184,0.3)",
  },
  saveButton: {
    background: "linear-gradient(90deg,#28a745,#20c997)",
    boxShadow: "0 4px 15px rgba(40,167,69,0.3)",
  },
  secondaryButton: {
    background: "linear-gradient(90deg,#ffc107,#fd7e14)",
    boxShadow: "0 4px 15px rgba(255,193,7,0.3)",
  },
  scannerArea: {
    border: "1px solid rgba(0, 0, 0, 0.2)",
    borderRadius: "18px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    width: "90%",
    maxWidth: "320px",
    margin: "0 auto 18px",
    position: "relative",
    overflow: "hidden",
    height: "240px",
    background: "rgba(0, 0, 0, 0.05)"
  },
  messageContainer: {
    margin: "16px 0",
    padding: "12px",
    borderRadius: "8px",
    background: "rgba(0, 0, 0, 0.05)",
  },
  message: {
    fontWeight: 600,
    fontSize: "15px",
  },
};
