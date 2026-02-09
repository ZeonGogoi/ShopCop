import React, { useEffect } from 'react'
import './Modal.css'

const Modal = ({ isOpen, onClose, children, title }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <button className="modal-close-btn" onClick={onClose}>&times;</button>
                {title && <h2 style={{ marginTop: 0, paddingRight: '30px' }}>{title}</h2>}
                {children}
            </div>
        </div>
    )
}

export default Modal
