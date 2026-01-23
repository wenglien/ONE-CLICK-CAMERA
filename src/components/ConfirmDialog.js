import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText, variant = 'danger' }) => {
    const { currentLanguage } = useLanguage();

    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            button: 'bg-red-500 hover:bg-red-600',
            icon: 'text-red-400',
            border: 'border-red-500/30'
        },
        warning: {
            button: 'bg-amber-500 hover:bg-amber-600',
            icon: 'text-amber-400',
            border: 'border-amber-500/30'
        },
        info: {
            button: 'bg-blue-500 hover:bg-blue-600',
            icon: 'text-blue-400',
            border: 'border-blue-500/30'
        }
    };

    const styles = variantStyles[variant] || variantStyles.danger;

    return (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
            <div className="relative w-full max-w-sm liquid-glass-dark overflow-hidden shadow-2xl border border-white/10 animate-scaleIn">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors z-20"
                    aria-label={currentLanguage === 'zh-TW' ? '關閉' : 'Close'}
                >
                    <X className="w-4 h-4 text-white" />
                </button>

                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-full bg-${variant === 'danger' ? 'red' : variant === 'warning' ? 'amber' : 'blue'}-500/20 flex items-center justify-center`}>
                            <AlertTriangle className={`w-6 h-6 ${styles.icon}`} />
                        </div>
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                    </div>

                    <p className="text-gray-300 mb-6 leading-relaxed">{message}</p>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
                        >
                            {cancelText || (currentLanguage === 'zh-TW' ? '取消' : 'Cancel')}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`flex-1 py-3 rounded-xl text-white font-medium transition-colors ${styles.button}`}
                        >
                            {confirmText || (currentLanguage === 'zh-TW' ? '確認' : 'Confirm')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
