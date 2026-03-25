import { useRef, useState, useEffect } from 'react';
import { FiPrinter, FiDownload, FiX } from 'react-icons/fi';
import html2pdf from 'html2pdf.js';
import { db } from '../db';

export default function Receipt({ sale, onClose }) {
  const receiptRef = useRef(null);
  const [settings, setSettings] = useState({
    storeName: 'VAJRAVEL CRACKERS',
    phone: '9876543210',
    gstin: '33ABCDE1234F1ZK'
  });

  useEffect(() => {
    async function load() {
      const s = await db.settings.toArray();
      const map = Object.fromEntries(s.map(i => [i.key, i.val]));
      setSettings(prev => ({ ...prev, ...map }));
    }
    load();
  }, []);

  if (!sale) return null;

  const formatDate = (iso) => {
    if (!iso) return new Date().toLocaleString('en-IN');
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  const handlePrint = () => {
    const printContent = receiptRef.current.innerHTML;
    const printWindow = window.open('', '_blank', 'width=302,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${sale.invoiceNumber}</title>
        <style>
          ${RECEIPT_PRINT_STYLES}
        </style>
      </head>
      <body>
        ${printContent}
        <script>
          window.onload = () => { window.print(); window.close(); }
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownloadPDF = () => {
    const element = receiptRef.current;
    
    // Add temporary styles for PDF generation
    const originalStyles = element.style.cssText;
    element.style.padding = '20px';
    element.style.background = '#fff';
    element.style.color = '#000';
    element.style.width = '80mm';
    element.style.fontFamily = "'Courier New', Courier, monospace";

    const opt = {
      margin: 5,
      filename: `Receipt_${sale.invoiceNumber}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: [80, 200], orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // Restore styles after generation
      element.style.cssText = originalStyles;
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 420, padding: 0, overflow: 'hidden' }}>
        {/* Action bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)'
        }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15 }}>Receipt Preview</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" onClick={handlePrint}><FiPrinter /> Print</button>
            <button className="btn btn-ghost btn-sm" onClick={handleDownloadPDF}><FiDownload /> Save PDF</button>
            <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={onClose}><FiX /></button>
          </div>
        </div>

        {/* Receipt */}
        <div style={{ padding: '0 18px 18px', maxHeight: '70vh', overflowY: 'auto' }}>
          <div ref={receiptRef}>
            <div className="receipt-body">
              {/* Header with Logo */}
              <div className="receipt-header">
                <img src="/logo.jpg" alt={settings.storeName} className="receipt-logo" />
                <div className="receipt-company">{settings.storeName.toUpperCase()}</div>
                <div className="receipt-tagline">Est. 2019 · Premium Fireworks</div>
                <div className="receipt-contact">Sivakasi, Tamil Nadu</div>
                <div className="receipt-contact">📞 {settings.phone}</div>
              </div>

              <div className="receipt-divider">{'─'.repeat(40)}</div>

              {/* Invoice Info */}
              <div className="receipt-info-row">
                <span>Invoice</span>
                <span className="receipt-bold">{sale.invoiceNumber}</span>
              </div>
              <div className="receipt-info-row">
                <span>Date</span>
                <span>{formatDate(sale.createdAt)}</span>
              </div>
              <div className="receipt-info-row">
                <span>Customer</span>
                <span>{sale.customerName || 'Walk-in Customer'}</span>
              </div>
              {sale.customerPhone && (
                <div className="receipt-info-row">
                  <span>Phone</span>
                  <span>{sale.customerPhone}</span>
                </div>
              )}
              <div className="receipt-info-row">
                <span>Payment</span>
                <span className="receipt-bold">{(sale.paymentMethod || 'cash').toUpperCase()}</span>
              </div>

              <div className="receipt-divider">{'═'.repeat(40)}</div>

              {/* Items header */}
              <div className="receipt-items-header">
                <span style={{ flex: 2 }}>Item</span>
                <span style={{ flex: 0.5, textAlign: 'center' }}>Qty</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Price</span>
                <span style={{ flex: 1, textAlign: 'right' }}>Total</span>
              </div>
              <div className="receipt-divider-thin">{'─'.repeat(40)}</div>

              {/* Items */}
              {(sale.items || []).map((item, i) => (
                <div key={i} className="receipt-item-row">
                  <span style={{ flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.productName || item.name || `Item #${item.productId}`}
                    {item.isGift && <span style={{ fontSize: 9, marginLeft: 4, fontWeight: 900 }}>(GIFT)</span>}
                  </span>
                  <span style={{ flex: 0.5, textAlign: 'center' }}>{item.quantity}</span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    {item.isGift ? '₹0' : `₹${Number(item.price).toLocaleString('en-IN')}`}
                  </span>
                  <span style={{ flex: 1, textAlign: 'right' }}>
                    ₹{Number(item.isGift ? 0 : (item.total || item.price * item.quantity)).toLocaleString('en-IN')}
                  </span>
                </div>
              ))}

              <div className="receipt-divider">{'═'.repeat(40)}</div>

              {/* Totals */}
              <div className="receipt-info-row">
                <span>Items Total</span>
                <span>₹{Number(sale.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="receipt-info-row" style={{ fontSize: 10, fontStyle: 'italic' }}>
                <span>Includes GST (18%)</span>
                <span>₹{Number(sale.tax || (sale.total - (sale.total / 1.18))).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>
              {sale.discount > 0 && (
                <div className="receipt-info-row" style={{ color: '#22c997' }}>
                  <span>Discount</span>
                  <span>-₹{Number(sale.discount).toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="receipt-divider-thin">{'─'.repeat(40)}</div>
              <div className="receipt-total-row">
                <span>TOTAL BILL</span>
                <span>₹{Number(sale.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="receipt-divider">{'─'.repeat(40)}</div>

              {/* Footer */}
              <div className="receipt-footer">
                <div>🙏 Thank you for shopping!</div>
                <div style={{ marginTop: 4 }}>Visit again — {settings.storeName}</div>
                <div style={{ marginTop: 8, fontSize: 10, opacity: 0.6 }}>GSTIN: {settings.gstin}</div>
                <div style={{ fontSize: 10, opacity: 0.6 }}>Powered by Vajravel POS</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const RECEIPT_PRINT_STYLES = `
  @page {
    size: 80mm auto;
    margin: 2mm;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 12px;
    color: #000;
    background: #fff;
    width: 76mm;
    padding: 2mm;
  }
  .receipt-body { width: 100%; }
  .receipt-header { text-align: center; margin-bottom: 8px; }
  .receipt-logo { width: 60px; height: 60px; border-radius: 50%; object-fit: cover; margin-bottom: 6px; }
  .receipt-company { font-size: 16px; font-weight: 900; letter-spacing: 1px; margin-bottom: 2px; }
  .receipt-tagline { font-size: 10px; color: #666; margin-bottom: 2px; }
  .receipt-contact { font-size: 10px; color: #555; }
  .receipt-divider { text-align: center; color: #999; font-size: 10px; margin: 6px 0; overflow: hidden; white-space: nowrap; }
  .receipt-divider-thin { text-align: center; color: #ccc; font-size: 10px; margin: 4px 0; overflow: hidden; white-space: nowrap; }
  .receipt-info-row { display: flex; justify-content: space-between; font-size: 11px; padding: 2px 0; }
  .receipt-bold { font-weight: 700; }
  .receipt-items-header { display: flex; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 0; }
  .receipt-item-row { display: flex; font-size: 11px; padding: 3px 0; border-bottom: 1px dotted #eee; }
  .receipt-item-row:last-child { border-bottom: none; }
  .receipt-total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: 900; padding: 6px 0; }
  .receipt-footer { text-align: center; font-size: 11px; color: #555; margin-top: 8px; padding-top: 4px; }
`;
