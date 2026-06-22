import { useToastStore } from '../store/toastStore'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

export function Toaster() {
  const { toasts, removeToast } = useToastStore()
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map(t => (
        <div key={t.id} className={`flex items-center gap-3 rounded-lg px-4 py-3 shadow-lg text-white max-w-sm animate-in slide-in-from-right-5 ${t.type === 'success' ? 'bg-verde-700' : t.type === 'error' ? 'bg-rojo-500' : 'bg-blue-600'}`}>
          {t.type === 'success' && <CheckCircle className="h-5 w-5 shrink-0" />}
          {t.type === 'error' && <XCircle className="h-5 w-5 shrink-0" />}
          {t.type === 'info' && <Info className="h-5 w-5 shrink-0" />}
          <p className="text-sm flex-1">{t.message}</p>
          <button onClick={() => removeToast(t.id)}><X className="h-4 w-4" /></button>
        </div>
      ))}
    </div>
  )
}
