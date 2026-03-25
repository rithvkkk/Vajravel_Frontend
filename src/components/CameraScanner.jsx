import { useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { FiX } from 'react-icons/fi';

export default function CameraScanner({ onScan, onClose }) {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner('reader', {
      fps: 10,
      qrbox: { width: 250, height: 100 },
      rememberLastUsedCamera: true
    }, false);

    scanner.render((decodedText) => {
      // Stop scanner immediately on success
      scanner.clear();
      onScan(decodedText);
    }, () => {
      // Ignored continuous scanning errors
    });

    return () => {
      try {
        scanner.clear();
      } catch(e) {}
    };
  }, [onScan]);

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 450, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div className="modal-title" style={{ margin: 0, fontSize: 18 }}>Scan with Camera</div>
          <button className="icon-btn" onClick={onClose}><FiX /></button>
        </div>
        
        {/* The target div for html5-qrcode */}
        <div id="reader" style={{ width: '100%', background: '#000', borderRadius: 8, overflow: 'hidden', border: 'none' }}></div>
        
        <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text3)', marginTop: 16 }}>
          Position the product barcode or QR code inside the frame. The scanner will automatically detect and add it.
        </div>
      </div>
    </div>
  );
}
