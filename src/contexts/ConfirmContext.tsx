import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import { Modal } from '../components/Modal';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'warning';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [options, setOptions] = useState<ConfirmOptions>({
        title: '',
        message: '',
        confirmText: 'Confirmar',
        cancelText: 'Cancelar',
        type: 'info'
    });

    const resolveRef = useRef<(value: boolean) => void>(() => { });

    const confirm = useCallback((opts: ConfirmOptions) => {
        setOptions({
            confirmText: 'Confirmar',
            cancelText: 'Cancelar',
            type: 'info',
            ...opts
        });
        setIsOpen(true);
        return new Promise<boolean>((resolve) => {
            resolveRef.current = resolve;
        });
    }, []);

    const handleConfirm = () => {
        setIsOpen(false);
        resolveRef.current(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        resolveRef.current(false);
    };

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <Modal isOpen={isOpen} onClose={handleCancel} title={options.title}>
                <div className="space-y-4">
                    <p className="text-gray-600 leading-relaxed">
                        {options.message}
                    </p>
                    <div className="flex justify-end gap-3 pt-2">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                        >
                            {options.cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`px-4 py-2 text-white rounded-lg transition-colors font-medium shadow-sm ${options.type === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-100'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-100'
                                }`}
                        >
                            {options.confirmText}
                        </button>
                    </div>
                </div>
            </Modal>
        </ConfirmContext.Provider>
    );
};

export const useConfirm = () => {
    const context = useContext(ConfirmContext);
    if (!context) {
        throw new Error('useConfirm must be used within a ConfirmProvider');
    }
    return context;
};
