import React, { useState } from 'react'
import { getCategory } from '../utils/categorizer'
import './ShoppingCart.css'

const ShoppingCart = ({ cart, removeItem, updateQuantity, updatePrice, updateName, clearCart, subtotal, tax, total }) => {
  const [activeTab, setActiveTab] = useState('cart') // 'cart' or 'list'
  const [editingId, setEditingId] = useState(null)
  const [editNameVal, setEditNameVal] = useState('')

  const handleNameClick = (item) => {
    setEditingId(item.id)
    setEditNameVal(item.name)
  }

  const saveName = (id) => {
    if (editNameVal.trim()) {
      updateName(id, editNameVal.trim())
    }
    setEditingId(null)
  }

  const handleKeyDown = (e, id) => {
    if (e.key === 'Enter') {
      saveName(id)
    }
  }

  const handlePriceClick = (item) => {
    const newPrice = prompt(`Edit price for ${item.name}:`, item.price)
    if (newPrice !== null && !isNaN(newPrice)) {
      updatePrice(item.id, newPrice)
    }
  }

  // Group items for Shopping List view
  const getGroupedItems = () => {
    const groups = {}
    cart.forEach(item => {
      const cat = getCategory(item.name)
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    })
    return groups
  }

  const groupedItems = getGroupedItems()
  const sortedCategories = Object.keys(groupedItems).sort()

  return (
    <div className="shopping-cart-container">
      {/* Tabs Header */}
      <div className="cart-tabs">
        <button
          className={`tab-btn ${activeTab === 'cart' ? 'active' : ''}`}
          onClick={() => setActiveTab('cart')}
        >
          Cart
        </button>
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          Shopping List
        </button>
      </div>

      <div className="cart-header">
        <h2>{activeTab === 'cart' ? 'Current Cart' : 'Shopping List'} <span className="item-count">({cart.reduce((acc, item) => acc + item.quantity, 0)})</span></h2>
        {cart.length > 0 && activeTab === 'cart' && (
          <button className="clear-cart-btn" onClick={clearCart}>
            Clear
          </button>
        )}
      </div>

      <div className="cart-content-area">
        {cart.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">{activeTab === 'cart' ? '🛒' : '📝'}</span>
            <p>Your list is empty.</p>
            <span className="empty-sub">Scan items to start tallying.</span>
          </div>
        ) : (
          <>
            {activeTab === 'cart' ? (
              // --- REGULAR CART VIEW ---
              <div className="cart-list">
                {cart.map((item) => (
                  <div key={item.id} className="cart-item-card">
                    <div className="item-thumb">
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="placeholder-thumb">{item.name.charAt(0)}</div>
                      )}
                    </div>

                    <div className="item-info">
                      {editingId === item.id ? (
                        <div className="name-edit-wrapper">
                          <input
                            autoFocus
                            className="name-edit-input"
                            value={editNameVal}
                            onChange={(e) => setEditNameVal(e.target.value)}
                            onBlur={() => saveName(item.id)}
                            onKeyDown={(e) => handleKeyDown(e, item.id)}
                          />
                        </div>
                      ) : (
                        <h3
                          className="item-name editable"
                          title="Click to edit name"
                          onClick={() => handleNameClick(item)}
                        >
                          {item.name} <span className="edit-icon">✎</span>
                        </h3>
                      )}

                      <div
                        className={`item-unit-price editable ${item.isRealPrice ? 'real-price' : 'est-price'}`}
                        onClick={() => handlePriceClick(item)}
                        title={item.isRealPrice ? "Verified Online Price" : "Estimated Price - Click to Edit"}
                      >
                        {item.isRealPrice ? '✅ ' : '⚠️ '}
                        ${item.price.toFixed(2)}
                      </div>

                      <div className="item-controls-row">
                        <div className="qty-control">
                          <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                        </div>
                        <button className="remove-item-btn" onClick={() => removeItem(item.id)}>
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="item-total-price">
                      ${(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // --- SHOPPING LIST VIEW (CATEGORIZED) ---
              <div className="shopping-list-view">
                {sortedCategories.map(category => (
                  <div key={category} className="list-category-group">
                    <h3 className="category-header">{category}</h3>
                    <div className="category-items">
                      {groupedItems[category].map(item => (
                        <div key={item.id} className="list-item-row">
                          <div className="list-item-main">
                            <span className="list-item-qty">{item.quantity}x</span>
                            <span
                              className="list-item-name"
                              onClick={() => handleNameClick(item)}
                            >
                              {item.name}
                            </span>
                          </div>
                          <span className="list-item-price">${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="cart-summary-section">
        <div className="summary-line">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        <div className="summary-line">
          <span>Tax ({(TAX_RATE * 100).toFixed(0)}%)</span>
          <span>${tax.toFixed(2)}</span>
        </div>
        <div className="summary-line total">
          <span>Total</span>
          <span className="total-amount">${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

const TAX_RATE = 0.08

export default ShoppingCart
