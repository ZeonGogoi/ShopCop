import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import './BarcodeScanner.css'

const BarcodeScanner = ({ isScanning, setIsScanning, onScan, scannerRef }) => {
  const [message, setMessage] = useState('')
  const html5QrCodeRef = useRef(null)



  // Ref to track if component is mounted to prevent state updates on unmount
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Ref to track last scan time for cooldown
  const lastScanTimeRef = useRef(0)
  const COOLDOWN_MS = 2500

  const handleSuccessfulScan = useCallback((barcode) => {
    if (!isMountedRef.current) return

    // Cooldown check - strictly prevent multiple triggers
    const now = Date.now()
    if (now - lastScanTimeRef.current < COOLDOWN_MS) {
      return
    }
    lastScanTimeRef.current = now

    setMessage(`Scanned: ${barcode}`)
    onScan(barcode)

    // Clear message after 2 seconds
    setTimeout(() => {
      if (isMountedRef.current) {
        setMessage('')
      }
    }, 2000)
  }, [onScan])

  // Cleanup function to safely stop the scanner
  const safeStopScanner = async () => {
    if (!html5QrCodeRef.current) return

    try {
      // Check if it's running before trying to stop
      if (html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop()
      }
      html5QrCodeRef.current.clear()
    } catch (err) {
      console.error('Error stopping scanner:', err)
    } finally {
      html5QrCodeRef.current = null
      if (isMountedRef.current) {
        setMessage('')
      }
    }
  }

  const startScanner = useCallback(async () => {
    // If already scanning, don't restart
    if (html5QrCodeRef.current?.isScanning) return

    try {
      // Ensure clean state before starting
      if (html5QrCodeRef.current) {
        await safeStopScanner()
      }

      const html5QrCode = new Html5Qrcode("reader")
      html5QrCodeRef.current = html5QrCode

      const config = {
        fps: 10,
        qrbox: { width: 300, height: 150 }, // Wider box for 1D barcodes
        aspectRatio: 1.0,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        videoConstraints: {
          facingMode: "environment",
          focusMode: "continuous", // Ask for continuous focus
          advanced: [{ focusMode: "continuous" }]
        }
      }

      await html5QrCode.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          handleSuccessfulScan(decodedText)
        },
        () => { }
      )

      if (isMountedRef.current) {
        setMessage('Camera active. Point at barcode.')
      }
    } catch (err) {
      console.error('Error starting scanner:', err)
      if (isMountedRef.current) {
        setMessage('Could not access camera. Try "Manual Entry".')
      }
      // If start fails, ensure we reset state
      if (setIsScanning && isMountedRef.current) {
        setIsScanning(false)
      }
    }
  }, [handleSuccessfulScan, setIsScanning])

  useEffect(() => {
    let ignore = false

    const manageScanner = async () => {
      if (isScanning) {
        await startScanner()
      } else {
        await safeStopScanner()
      }
    }

    manageScanner()

    return () => {
      ignore = true
      safeStopScanner()
    }
  }, [isScanning, startScanner])

  return (
    <div className="barcode-scanner-card">
      <div className="scanner-header">
        <h2>Scanner</h2>
        <div className={`status-indicator ${isScanning ? 'active' : ''}`}>
          {isScanning ? 'LIVE' : 'OFF'}
        </div>
      </div>

      <div className="scanner-viewport-container">
        <div id="reader" className={`scanner-viewport ${isScanning ? 'active' : ''}`}>
          {!isScanning && (
            <div className="scanner-placeholder">
              <span className="scanner-icon">📷</span>
              <p>Camera is off</p>
            </div>
          )}
        </div>
      </div>

      {message && (
        <div className="scan-message-toast">
          {message}
        </div>
      )}

      <button
        className={`scan-toggle-btn ${isScanning ? 'stop' : 'start'}`}
        onClick={() => setIsScanning(!isScanning)}
      >
        {isScanning ? 'Stop Camera' : 'Start Camera'}
      </button>

      <div className="scanner-tips">
        <p>Supports EAN-13, UPC-A, & more</p>
      </div>
    </div>
  )
}

export default BarcodeScanner
