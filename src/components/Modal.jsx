import React, { useState } from 'react';

const Modal = ({ isOpen, onClose, children }) => {
    const [showModal, setShowModal] = useState(isOpen);

    const handleClose = () => {
        setShowModal(false);
        onClose();
    };

    return (
        <div
            className={`modal ${showModal ? 'modal-open' : 'modal-close'}`}
            onClick={handleClose}
        >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <button className="close" onClick={handleClose}>
                        ×
                    </button>
                </div>
                <div className="modal-body">{children}</div>
                <div className="modal-footer">
                    <button className="btn btn-primary" onClick={handleClose}>
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Modal;