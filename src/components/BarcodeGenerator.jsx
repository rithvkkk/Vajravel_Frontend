import { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';

export default function BarcodeGenerator({ value, format = 'CODE128', width = 2, height = 40, fontSize = 12 }) {
  const svgRef = useRef(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format,
          width,
          height,
          displayValue: true,
          fontSize,
          margin: 10,
          background: '#ffffff'
        });
      } catch (err) {
        console.error('Barcode generation failed:', err);
      }
    }
  }, [value, format, width, height, fontSize]);

  return (
    <div style={{ background: '#fff', padding: 8, borderRadius: 4, display: 'inline-block' }}>
      <svg ref={svgRef}></svg>
    </div>
  );
}
