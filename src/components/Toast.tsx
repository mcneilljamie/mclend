import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, Loader } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'loading';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  txHash?: string;
}

let toastCounter = 0;
const listeners: Set<(toasts: Toast[]) => void> = new Set();
let toasts: Toast[] = [];

function notifyListeners() {
  listeners.forEach((listener) => listener([...toasts]));
}

export const toastManager = {
  show: (type: ToastType, message: string, txHash?: string) => {
    const id = `toast-${++toastCounter}`;
    toasts.push({ id, type, message, txHash });
    notifyListeners();

    if (type !== 'loading') {
      setTimeout(() => {
        toastManager.dismiss(id);
      }, 5000);
    }

    return id;
  },
  dismiss: (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  },
  update: (id: string, type: ToastType, message: string, txHash?: string) => {
    const toast = toasts.find((t) => t.id === id);
    if (toast) {
      toast.type = type;
      toast.message = message;
      toast.txHash = txHash;
      notifyListeners();

      if (type !== 'loading') {
        setTimeout(() => {
          toastManager.dismiss(id);
        }, 5000);
      }
    }
  },
};

export function ToastContainer() {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    listeners.add(setCurrentToasts);
    return () => {
      listeners.delete(setCurrentToasts);
    };
  }, []);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {currentToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
}

function ToastItem({ toast }: { toast: Toast }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <AlertCircle className="w-5 h-5 text-red-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    loading: <Loader className="w-5 h-5 text-gray-500 animate-spin" />,
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200',
    loading: 'bg-gray-50 border-gray-200',
  };

  return (
    <div
      className={`${bgColors[toast.type]} border rounded-lg p-4 shadow-lg flex items-start gap-3 animate-slide-in`}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900">{toast.message}</p>
        {toast.txHash && (
          <a
            href={`https://etherscan.io/tx/${toast.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:text-blue-800 underline mt-1 block"
          >
            View on Etherscan
          </a>
        )}
      </div>
      {toast.type !== 'loading' && (
        <button
          onClick={() => toastManager.dismiss(toast.id)}
          className="text-gray-400 hover:text-gray-600 flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
