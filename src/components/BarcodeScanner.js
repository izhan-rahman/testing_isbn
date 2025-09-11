import { useEffect, useRef, useState } from "react";
// ✅ FIX: The import uses a direct URL to resolve the module error.
import { Html5Qrcode } from "https://unpkg.com/html5-qrcode@2.3.8/esm/html5-qrcode.js";

export default function BarcodeScanner({ onDetected }) {
  const scannerRef = useRef(null);
  const isScanning = useRef(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const readerElement = document.getElementById("reader");
    if (!readerElement) {
        console.error("The element with id 'reader' was not found.");
        setLoading(false);
        setErrorMessage("Scanner container not found.");
        return;
    }

    let isMounted = true;
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    Html5Qrcode.getCameras()
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
                  scanner.stop().then(() => {
                    onDetected(isbn);
                  });
                }
              }
            },
            (err) => {
              // This callback is for scan errors, which can be ignored silently.
            }
          )
          .then(() => {
            if (isMounted) {
              isScanning.current = true;
              setLoading(false);
            }
          })
          .catch((err) => {
             if (isMounted) {
                console.error("Scanner start error:", err);
                setErrorMessage("Failed to start the camera. Please check permissions.");
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

    // Cleanup function to stop the scanner when the component unmounts
    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((error) => {
            console.warn("Error stopping the scanner:", error);
        });
      }
    };
  }, [onDetected]);

  return (
    <div>
      {loading && <p style={{ color: "#007bff", paddingTop: "20px" }}>📸 Initializing camera...</p>}
      {errorMessage && <p style={{ color: "#dc3545", paddingTop: "20px" }}>⚠️ {errorMessage}</p>}
      <div id="reader" style={{ width: "100%", borderRadius: "10px" }} />
    </div>
  );
}
