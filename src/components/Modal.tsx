import React, { useEffect } from 'react';
import { X } from 'phosphor-react';
import { createPortal } from 'react-dom';

import { twMerge } from 'tailwind-merge';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    className?: string;
    showCloseButton?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    children,
    className,
    showCloseButton = true
}) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div
                className={twMerge(
                    "bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all animate-in fade-in zoom-in-95 duration-200",
                    className
                )}
            >
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between p-4 border-b border-gray-100">
                        {title && <h3 className="text-lg font-semibold text-gray-800">{title}</h3>}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="p-1 rounded-full hover:bg-gray-100 text-gray-500 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        )}
                    </div>
                )}
                <div className="p-4">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};
