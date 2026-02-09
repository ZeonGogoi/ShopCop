import React, { useState, useRef, useEffect } from 'react'
import './App.css'
import BarcodeScanner from './components/BarcodeScanner'
import ShoppingCart from './components/ShoppingCart'
import StoreSelector from './components/StoreSelector'
import Modal from './components/Modal'

const TAX_RATE = 0.08 // 8% tax rate

function App() {
  const [isScanning, setIsScanning] = useState(false)
  const [cart, setCart] = useState([])
  const [manualCode, setManualCode] = useState('')
  const [showManualInput, setShowManualInput] = useState(false)
  const [activeStore, setActiveStore] = useState('walmart')
  const [showStoreModal, setShowStoreModal] = useState(false)
  const [scanningMessage, setScanningMessage] = useState('') // New state for scanning messages
  const [isProcessing, setIsProcessing] = useState(false) // New state to indicate processing
  const scannerRef = useRef(null)

  const handleScan = async (barcode) => {
    if (isProcessing) return // Prevent multiple scans while one is in progress
    setIsProcessing(true)
    setScanningMessage('Identifying Product...')

    try {
      // 1. First try to find it in "Real Time" via our Proxy
      const PROXY_URL = '/api/price'
      const response = await fetch(`${PROXY_URL}?barcode=${barcode}&store=${activeStore}`)
      const data = await response.json()

      if (data.success && data.product) {
        setScanningMessage('Found! Updating Cart...')
        // Real price found!
        const isEstimated = data.product.source && data.product.source.includes('Estimated');

        addToCart({
          barcode,
          name: data.product.name,
          price: data.product.price,
          image: data.product.image || '',
          quantity: 1,
          isRealPrice: !isEstimated, // True only if NOT estimated
          source: data.product.source
        })
        setScanningMessage('')
      } else {
        setScanningMessage('Product not found. Falling back to mock data.')
        // Fallback to simple generation if proxy fails
        console.warn('Proxy scrape failed, falling back to mock.', data.message)
        addToCartWithFallback(barcode)
        setScanningMessage('')
      }

    } catch (error) {
      console.error('Error fetching real price:', error)
      setScanningMessage('Error fetching. Using offline mode.')
      addToCartWithFallback(barcode)
      setScanningMessage('')
    } finally {
      setIsProcessing(false) // Re-enable scanning
    }
  }

  const addToCartWithFallback = (barcode) => {
    const price = generatePrice(barcode)
    addToCart({
      barcode,
      name: `Product (${barcode})`,
      price,
      image: '',
      quantity: 1,
      isRealPrice: false
    })
  }

  const addToCart = (newItem) => {
    setCart(prevCart => {
      const existingItemIndex = prevCart.findIndex(item => item.barcode === newItem.barcode)
      if (existingItemIndex >= 0) {
        const updatedCart = [...prevCart]
        updatedCart[existingItemIndex].quantity += 1
        return updatedCart
      } else {
        return [...prevCart, { ...newItem, id: Date.now() }]
      }
    })
  }

  // Generate a consistent pseudo-random price based on barcode
  const generatePrice = (barcode) => {
    const seed = parseInt(barcode.slice(-4)) || 1000
    const price = 0.99 + (seed % 4900) / 100
    return parseFloat(price.toFixed(2))
  }

  const removeItem = (id) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const updateQuantity = (id, change) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        const newQuantity = Math.max(1, item.quantity + change)
        return { ...item, quantity: newQuantity }
      }
      return item
    }))
  }

  const updatePrice = (id, newPrice) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        return { ...item, price: parseFloat(newPrice) || 0 }
      }
      return item
    }))
  }

  const updateName = (id, newName) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        return { ...item, name: newName }
      }
      return item
    }))
  }

  const clearCart = () => {
    setCart([])
  }

  const handleManualSubmit = (e) => {
    e.preventDefault()
    if (manualCode.trim().length > 3) {
      handleScan(manualCode)
      setManualCode('')
      setShowManualInput(false)
    }
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = subtotal * TAX_RATE
  const total = subtotal + tax

  return (
    <div className="app">
      <header className="app-header">
        <h1>🛒 ShopCop</h1>
        <p>Smart Shopping Companion</p>
      </header>

      <div className="app-container">
        <div className="scanner-section">

          <button
            className="current-store-btn"
            onClick={() => setShowStoreModal(true)}
          >
            <span className="store-label">Shopping at:</span>
            <span className="store-value">
              {/* Find the icon and name for the active store - simplified lookup for display */}
              {activeStore.charAt(0).toUpperCase() + activeStore.slice(1)} ▾
            </span>
          </button>

          <Modal
            isOpen={showStoreModal}
            onClose={() => setShowStoreModal(false)}
            title="Select Store"
          >
            <StoreSelector
              currentStore={activeStore}
              onStoreChange={(storeId) => {
                setActiveStore(storeId)
                // Optional: Close modal on selection if preferred, but keeping open allows browsing
                // setShowStoreModal(false) 
              }}
            />
          </Modal>

          <BarcodeScanner
            isScanning={isScanning}
            setIsScanning={setIsScanning}
            onScan={handleScan}
            scannerRef={scannerRef}
          />

          {/* Scanning message overlay */}
          {scanningMessage && (
            <div className="scanning-status-overlay">
              <span className="spinner">⏳</span> {scanningMessage}
            </div>
          )}

          <div className="manual-entry-section">
            <button
              className="manual-toggle-btn"
              onClick={() => setShowManualInput(!showManualInput)}
            >
              {showManualInput ? 'Hide Manual Entry' : '⌨️ Enter Barcode Manually'}
            </button>

            {showManualInput && (
              <form onSubmit={handleManualSubmit} className="manual-form">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter barcode..."
                  className="manual-input"
                />
                <button type="submit" className="manual-submit-btn">Add</button>
              </form>
            )}
          </div>
        </div>

        <div className="cart-section">
          <ShoppingCart
            cart={cart}
            removeItem={removeItem}
            updateQuantity={updateQuantity}
            updatePrice={updatePrice}
            updateName={updateName}
            clearCart={clearCart}
            subtotal={subtotal}
            tax={tax}
            total={total}
          />
        </div>
      </div>
    </div>
  )
}

export default App