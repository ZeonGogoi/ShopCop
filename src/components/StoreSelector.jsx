import React, { useState, useEffect } from 'react'
import './StoreSelector.css'

const STORE_DATA = {
    grocery: {
        label: 'Grocery',
        icon: '🥦',
        stores: [
            { id: 'walmart', name: 'Walmart', icon: '🛒' },
            { id: 'target', name: 'Target', icon: '🎯' },
            { id: 'publix', name: 'Publix', icon: '🥖' },
            { id: 'wholefoods', name: 'Whole Foods', icon: '🥬' },
            { id: 'kroger', name: 'Kroger', icon: '🏪' },
            { id: 'acme', name: 'Acme', icon: '🍎' },
            { id: 'shoprite', name: 'ShopRite', icon: '🛍️' }
        ]
    },
    wholesale: {
        label: 'Wholesale',
        icon: '📦',
        stores: [
            { id: 'costco', name: 'Costco', icon: '🏭' },
            { id: 'samsclub', name: "Sam's Club", icon: '💳' },
            { id: 'bjs', name: "BJ's", icon: '🏬' }
        ]
    },
    tech: {
        label: 'Tech',
        icon: '🔌',
        stores: [
            { id: 'bestbuy', name: 'Best Buy', icon: '📺' },
            { id: 'microcenter', name: 'Micro Center', icon: '💻' },
            { id: 'gamestop', name: 'GameStop', icon: '🎮' }
        ]
    },
    home: {
        label: 'Home',
        icon: '🛋️',
        stores: [
            { id: 'homedepot', name: 'Home Depot', icon: '🔨' },
            { id: 'lowes', name: "Lowe's", icon: '🏠' },
            { id: 'ikea', name: 'IKEA', icon: '🪑' },
            { id: 'bobs', name: "Bob's Furniture", icon: '🛌' }
        ]
    }
}

const StoreSelector = ({ currentStore, onStoreChange }) => {
    const [activeCategory, setActiveCategory] = useState('grocery')
    const [isLocating, setIsLocating] = useState(false)
    const [locationMsg, setLocationMsg] = useState('')

    // Effect to ensure currentStore belongs to activeCategory, otherwise switch
    useEffect(() => {
        const categoryHasStore = STORE_DATA[activeCategory].stores.find(s => s.id === currentStore)
        if (!categoryHasStore) {
            // Check if the currentStore exists in ANY category, if so, switch to that category
            let foundCategory = null
            Object.entries(STORE_DATA).forEach(([catKey, catData]) => {
                if (catData.stores.find(s => s.id === currentStore)) {
                    foundCategory = catKey
                }
            })

            if (foundCategory) {
                setActiveCategory(foundCategory)
            } else {
                // Default to first store in current category if store is completely unknown
                onStoreChange(STORE_DATA[activeCategory].stores[0].id)
            }
        }
    }, [activeCategory, currentStore, onStoreChange])

    const handleAutoLocate = () => {
        setIsLocating(true)
        setLocationMsg('Getting coordinates...')

        if (!navigator.geolocation) {
            setLocationMsg('Geolocation is not supported by your browser')
            setIsLocating(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords
                setLocationMsg('Finding nearest store...')

                try {
                    const nearestStoreId = await findNearestStore(latitude, longitude)
                    if (nearestStoreId) {
                        onStoreChange(nearestStoreId)
                        setLocationMsg('Found nearby store!')
                        setTimeout(() => setLocationMsg(''), 3000)
                    } else {
                        setLocationMsg('No supported stores found nearby.')
                    }
                } catch (error) {
                    console.error('Auto-location error:', error)
                    setLocationMsg('Failed to find stores.')
                } finally {
                    setIsLocating(false)
                }
            },
            (error) => {
                console.error('Geolocation error:', error)
                setLocationMsg('Location access denied or failed.')
                setIsLocating(false)
            }
        )
    }

    const findNearestStore = async (lat, lon) => {
        // Collect all store names to search for
        const allStores = []
        Object.values(STORE_DATA).forEach(cat => {
            cat.stores.forEach(store => allStores.push(store))
        })

        // Build regex for Overpass: "Walmart|Target|Costco..."
        // Escape special chars like ' if needed (Overpass handles simplified regex)
        const namesRegex = allStores.map(s => s.name.replace(/'/g, ".?")).join('|')

        // Overpass API Query: Look for nodes/ways with matching names within 5km
        const query = `
            [out:json][timeout:25];
            (
              node["name"~"${namesRegex}",i](around:5000,${lat},${lon});
              way["name"~"${namesRegex}",i](around:5000,${lat},${lon});
            );
            out center;
        `

        const response = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query
        })

        const data = await response.json()

        if (!data.elements || data.elements.length === 0) return null

        // Find closest element
        let closestStore = null
        let minDist = Infinity

        data.elements.forEach(el => {
            // Logic to handle way centers vs nodes
            const elLat = el.lat || el.center.lat
            const elLon = el.lon || el.center.lon
            const dist = getDistanceFromLatLonInKm(lat, lon, elLat, elLon)

            if (dist < minDist) {
                minDist = dist
                closestStore = el
            }
        })

        if (!closestStore) return null

        // Map back to our internal ID
        const matchedName = closestStore.tags.name.toLowerCase()
        const foundStore = allStores.find(s => matchedName.includes(s.name.toLowerCase()) || s.name.toLowerCase().includes(matchedName))

        return foundStore ? foundStore.id : null
    }

    // Haversine formula for distance
    const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
        const R = 6371 // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1)
        const dLon = deg2rad(lon2 - lon1)
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
        return R * c
    }

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180)
    }

    return (
        <div className="store-selector-container">
            <div className="selector-header">
                <label className="section-label">I'm shopping for:</label>
                <button
                    className={`locate-btn ${isLocating ? 'pulsing' : ''}`}
                    onClick={handleAutoLocate}
                    disabled={isLocating}
                    title="Find nearest store"
                >
                    {isLocating ? '📍 ...' : '📍 Auto Locate'}
                </button>
            </div>

            {locationMsg && <div className="location-msg">{locationMsg}</div>}

            <div className="category-tabs">
                {Object.entries(STORE_DATA).map(([key, data]) => (
                    <button
                        key={key}
                        className={`category-tab ${activeCategory === key ? 'active' : ''}`}
                        onClick={() => {
                            setActiveCategory(key)
                            // When switching category, automatically select first store in that category
                            // This prevents the useEffect from reverting the category change
                            onStoreChange(data.stores[0].id)
                        }}
                    >
                        <span className="cat-icon">{data.icon}</span>
                        <span className="cat-label">{data.label}</span>
                    </button>
                ))}
            </div>

            <div className="store-dropdown-wrapper">
                <select
                    className="store-select"
                    value={currentStore}
                    onChange={(e) => onStoreChange(e.target.value)}
                >
                    {STORE_DATA[activeCategory].stores.map(store => (
                        <option key={store.id} value={store.id}>
                            {store.icon} {store.name}
                        </option>
                    ))}
                </select>
                <div className="select-chevron">▼</div>
            </div>
        </div>
    )
}

export default StoreSelector
