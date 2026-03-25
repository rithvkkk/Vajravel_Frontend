import { useEffect } from 'react';

export default function useBarcodeScanner(onScan) {
  useEffect(() => {
    let barcode = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e) => {
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      // If typing in the search box, we still want Enter to act as a scan if they typed the SKU and hit enter manually
      // but purely for rapid scanner events, we allow it globally if not in an input.
      if (activeTag === 'input' && e.key !== 'Enter') return;

      const currentTime = Date.now();
      // Scanners type fast (usually < 20ms per character). Threshold is 50ms.
      // But if they are in an input box and they press Enter, we want to capture the input value as the barcode
      if (activeTag === 'input' && e.key === 'Enter') {
        // Only trigger scan if we are looking at the search box
        if (document.activeElement.placeholder?.toLowerCase().includes('search')) {
            const val = document.activeElement.value.trim();
            if (val.length > 2) {
                onScan(val);
                // Optional: clear input but we leave it to the component
            }
        }
        return;
      }

      if (currentTime - lastKeyTime > 50) {
        barcode = ''; 
      }

      if (e.key === 'Enter') {
        if (barcode.length > 2) {
          onScan(barcode);
        }
        barcode = '';
      } else if (e.key.length === 1) {
        barcode += e.key;
      }

      lastKeyTime = currentTime;
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onScan]);
}
