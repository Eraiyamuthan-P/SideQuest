'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'INFO') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      
      {/* Toast container floating top-right */}
      <div
        style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '380px',
          width: 'calc(100% - 4rem)',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => {
          let accentColor = 'var(--accent-primary)';
          let borderGlow = 'rgba(99, 102, 241, 0.2)';
          if (t.type === 'SUCCESS') {
            accentColor = 'var(--success)';
            borderGlow = 'rgba(34, 197, 94, 0.25)';
          } else if (t.type === 'WARNING') {
            accentColor = 'var(--warning)';
            borderGlow = 'rgba(245, 158, 11, 0.25)';
          } else if (t.type === 'ERROR') {
            accentColor = 'var(--danger)';
            borderGlow = 'rgba(239, 68, 68, 0.25)';
          }

          return (
            <div
              key={t.id}
              onClick={() => removeToast(t.id)}
              style={{
                background: 'rgba(30, 41, 59, 0.85)',
                backdropFilter: 'blur(16px)',
                border: `1px solid rgba(255, 255, 255, 0.08)`,
                borderLeft: `4px solid ${accentColor}`,
                borderRadius: '8px',
                padding: '1rem',
                color: '#ffffff',
                boxShadow: `0 10px 30px rgba(0, 0, 0, 0.3), 0 0 10px ${borderGlow}`,
                fontSize: '0.875rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                cursor: 'pointer',
                pointerEvents: 'auto',
                animation: 'toastFadeIn var(--motion-fast) var(--ease-default) forwards',
                userSelect: 'none',
                lineHeight: '1.4',
              }}
            >
              <span>{t.message}</span>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes toastFadeIn {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
