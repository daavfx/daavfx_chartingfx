import React, { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
    message: string;
    type: ToastType;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle size={18} className="text-emerald-400" />;
            case 'error': return <AlertCircle size={18} className="text-red-400" />;
            default: return <Info size={18} className="text-blue-400" />;
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-[120] animate-slideUp">
            <div className="flex items-center gap-3 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl">
                {getIcon()}
                <span className="text-sm text-white">{message}</span>
            </div>
        </div>
    );
};

export default Toast;