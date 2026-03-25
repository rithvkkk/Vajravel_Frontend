import { useState, useEffect } from 'react';
import { api } from '../api';
import { FiSearch, FiTrash2, FiPlus, FiMinus, FiCheck, FiX, FiCamera } from 'react-icons/fi';
import Receipt from '../components/Receipt';
import useBarcodeScanner from '../hooks/useBarcodeScanner';
import CameraScanner from '../components/CameraScanner';

const CATEGORY_EMOJIS = {
  'Ground Chakkar': '🌀',
  'Rockets': '🚀',
  'Flower Pots': '🌸',
  'Sparklers': '✨',
  'Bombs': '💣',
  'Fancy Items': '🦋',
  'Gift Boxes': '🎁',
};

export default function POS() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showCheckout, setShowCheckout] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [completeSale, setCompleteSale] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    api.getProducts().then(setProducts).catch(() => {});
    api.getCategories().then(setCategories).catch(() => {});
  }, []);

  const addToCart = (product) => {
    if (product.stock <= 0) return;
    const existing = cart.find(c => c.productId === product.id);
    if (existing) {
      if (existing.quantity >= product.stock) return;
      setCart(cart.map(c => c.productId === product.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCart([...cart, { productId: product.id, name: product.name, price: product.price, quantity: 1, maxStock: product.stock, isGift: false }]);
    }
  };

  const updateQty = (productId, delta) => {
    setCart(cart.map(c => {
      if (c.productId === productId) {
        const newQty = c.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > c.maxStock) return c;
        return { ...c, quantity: newQty };
      }
      return c;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(c => c.productId !== productId));
  };

  const toggleGift = (productId) => {
    setCart(cart.map(c => c.productId === productId ? { ...c, isGift: !c.isGift } : c));
  };

  const subtotal = cart.reduce((s, c) => s + (c.isGift ? 0 : c.price) * c.quantity, 0);
  const tax = subtotal * 0.18; // 18% GST (assuming subtotal is base)
  // If GST is INCLUDED in the product price, then:
  // base = total / 1.18
  // but let's stick to adding it on top if the user said "gst is included in the bill"
  // Wait, "gst is included in the bill" usually means the total shown = price * qty.
  const total = subtotal; 
  const baseAmount = total / 1.18;
  const inclusiveTax = total - baseAmount;
  const discount = 0;

  const handlePrint = async () => {
    if (cart.length === 0 || isProcessing) return;
    setIsProcessing(true);
    try {
      const payload = {
        customerName: customerName || 'Walk-in Customer',
        customerPhone,
        items: cart.map(c => ({ 
          productId: c.productId, 
          quantity: c.quantity, 
          price: c.price,
          isGift: !!c.isGift 
        })),
        subtotal,
        discount,
        tax: inclusiveTax, // Use the inclusive tax calculated above
        total,
        paymentMethod,
      };
      console.log('Sending sale payload:', payload);
      const sale = await api.createSale(payload);
      console.log('Received sale response:', sale);
      
      setCompleteSale(sale);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setShowCheckout(false);
      // Refresh products for updated stock
      api.getProducts().then(setProducts);
    } catch(err) {
      console.error('POS Checkout Error:', err);
      alert('Checkout Error: ' + (err.message || 'Unknown error occurred. Check browser console.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScan = (sku) => {
    const product = products.find(p => p.sku === sku);
    if (product) {
      addToCart(product);
      setShowCamera(false);
    } else {
      alert(`Product not found for SKU: ${sku}`);
    }
  };
  useBarcodeScanner(handleScan);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || p.categoryName === activeCategory;
    return matchSearch && matchCat;
  });

  return (
    <div className="pos-layout">
      {/* LEFT — PRODUCTS */}
      <div className="pos-products">
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <div className="search-box" style={{ flex: 1 }}>
            <FiSearch className="search-icon" />
            <input placeholder="Search products by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-ghost" title="Scan with Camera" onClick={() => setShowCamera(true)}>
            <FiCamera size={16} /> Scan
          </button>
        </div>

        <div className="filter-tabs">
          <button className={`ftab ${activeCategory === 'All' ? 'active' : ''}`} onClick={() => setActiveCategory('All')}>All</button>
          {categories.map(c => (
            <button key={c.id} className={`ftab ${activeCategory === c.name ? 'active' : ''}`} onClick={() => setActiveCategory(c.name)}>
              {CATEGORY_EMOJIS[c.name] || '📦'} {c.name}
            </button>
          ))}
        </div>

        <div className="product-grid">
          {filtered.map(p => (
            <div key={p.id} className="product-tile" onClick={() => addToCart(p)} style={{ opacity: p.stock <= 0 ? 0.4 : 1, pointerEvents: p.stock <= 0 ? 'none' : 'auto' }}>
              <div className="p-emoji">{CATEGORY_EMOJIS[p.categoryName] || '📦'}</div>
              <div className="p-name">{p.name}</div>
              <div className="p-price">₹{Number(p.price).toLocaleString('en-IN')}</div>
              <div className="p-stock">{p.stock > 0 ? `${p.stock} ${p.unit} in stock` : 'Out of stock'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT — CART */}
      <div className="pos-cart">
        <div className="pos-cart-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16 }}>Current Bill</div>
              <div style={{ fontSize: 12, color: 'var(--text3)' }}>{cart.length} item{cart.length !== 1 ? 's' : ''}</div>
            </div>
            {cart.length > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={() => setCart([])}>
                <FiTrash2 /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="pos-cart-items">
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🛒</div>
              <div style={{ fontSize: 13 }}>Tap products to add them here</div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.productId} className="cart-item">
                <div className="cart-item-info">
                  <div className="cart-item-name">
                    {item.name} {item.isGift && <span className="tag tag-amber" style={{ fontSize: 9 }}>GIFT</span>}
                  </div>
                  <div className="cart-item-price">
                    {item.isGift ? <span style={{ textDecoration: 'line-through', opacity: 0.5 }}>₹{item.price}</span> : `₹${Number(item.price).toLocaleString('en-IN')}`} × {item.quantity}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                   <button className="qty-btn" title="Mark as Gift" onClick={() => toggleGift(item.productId)} style={{ color: item.isGift ? 'var(--amber)' : 'var(--text3)' }}>
                     {item.isGift ? '🎁' : '➕🎁'}
                   </button>
                </div>
                <div className="cart-item-qty">
                  <button className="qty-btn" onClick={() => updateQty(item.productId, -1)}><FiMinus /></button>
                  <span style={{ fontWeight: 600, fontSize: 14, minWidth: 20, textAlign: 'center' }}>{item.quantity}</span>
                  <button className="qty-btn" onClick={() => updateQty(item.productId, 1)}><FiPlus /></button>
                </div>
                <span style={{ fontWeight: 600, minWidth: 70, textAlign: 'right', fontFamily: "'Syne',sans-serif" }}>
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </span>
                <button className="qty-btn" style={{ color: 'var(--red)', borderColor: 'var(--red-light)' }} onClick={() => removeFromCart(item.productId)}>
                  <FiX />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="pos-cart-footer">
          <div className="cart-summary">
            <div className="cart-row"><span>Items Total</span><span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            <div className="cart-row" style={{ fontSize: 11, color: 'var(--text3)' }}>
              <span>Includes GST (18%)</span>
              <span>₹{inclusiveTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>
            {discount > 0 && <div className="cart-row" style={{ color: 'var(--teal)' }}><span>Discount</span><span>-₹{discount.toLocaleString('en-IN')}</span></div>}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              <div className="cart-row total"><span>Total Bill</span><span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px 0', fontSize: 15, borderRadius: 12 }}
            disabled={cart.length === 0}
            onClick={() => setShowCheckout(true)} // This now just opens the modal
          >
            <FiCheck /> Checkout — ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </button>
        </div>
      </div>

      {/* CHECKOUT MODAL */}
      {showCheckout && (
        <div className="modal-overlay" onClick={() => setShowCheckout(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">Complete Sale</div>

            <div className="input-group">
              <label>Customer Name</label>
              <input className="input-field" placeholder="Walk-in Customer" value={customerName} onChange={e => setCustomerName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Phone Number</label>
              <input className="input-field" placeholder="Optional" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Payment Method</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['cash', 'upi', 'card'].map(m => (
                  <button key={m} className={`ftab ${paymentMethod === m ? 'active' : ''}`} onClick={() => setPaymentMethod(m)}>
                    {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'} {m.charAt(0).toUpperCase() + m.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div className="cart-summary">
                <div className="cart-row"><span>Items</span><span>{cart.reduce((a, c) => a + c.quantity, 0)}</span></div>
                <div className="cart-row total"><span>Net Payable</span><span>₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                <div className="cart-row" style={{ fontSize: 11, color: 'var(--text3)' }}><span>(Inclusive of all taxes)</span></div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowCheckout(false)} disabled={isProcessing}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 2, justifyContent: 'center', padding: '12px 0', opacity: isProcessing ? 0.7 : 1 }} disabled={isProcessing} onClick={handlePrint}>
                <FiCheck /> {isProcessing ? 'Processing Bill...' : 'Confirm & Print Bill'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {completeSale && ( // Changed from lastSale to completeSale
        <Receipt sale={completeSale} onClose={() => setCompleteSale(null)} />
      )}

      {showCamera && (
        <CameraScanner
          onScan={handleScan}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
}

