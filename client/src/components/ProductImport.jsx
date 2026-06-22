import { useState, useRef } from 'react'
import api from '../lib/api'
import { toast } from '../store/toastStore'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Loader2 } from 'lucide-react'

export function ProductImport({ open, onClose, onSuccess }) {
  const [file, setFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const inputRef = useRef()

  const downloadTemplate = async () => {
    try {
      const res = await api.get('/products/excel-template', { responseType: 'blob' })
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a'); a.href = url; a.download = 'plantilla_productos.xlsx'; a.click()
      URL.revokeObjectURL(url)
    } catch { toast.error('Error al descargar plantilla') }
  }

  const handleUpload = async () => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const res = await api.post('/products/import-excel', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setResult(res.data)
      if (res.data.created > 0) { toast.success(`${res.data.created} productos importados`); onSuccess?.() }
      else toast.error('No se importaron productos')
    } catch (err) { toast.error(err.response?.data?.error || 'Error al importar') }
    finally { setUploading(false) }
  }

  const reset = () => { setFile(null); setResult(null); if (inputRef.current) inputRef.current.value = '' }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) { reset(); onClose() } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-verde-700" />Importar Productos desde Excel</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="bg-verde-50 border border-verde-200 rounded-lg p-4 text-sm">
            <p className="font-medium text-verde-800 mb-2">Columnas requeridas en el Excel:</p>
            <div className="grid grid-cols-3 gap-1 text-xs text-verde-700">
              {['SKU *','Nombre *','Descripción','Categoría','Marca','Modelo','Precio Costo','Precio Venta','Stock Mínimo'].map(c => (
                <span key={c} className="bg-white rounded px-2 py-1 border border-verde-200">{c}</span>
              ))}
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={downloadTemplate}>
            <Download className="h-4 w-4 mr-2" />Descargar Plantilla Excel
          </Button>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-verde-400 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
            onDragOver={e => e.preventDefault()}
          >
            <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
            {file ? <p className="text-sm font-medium text-verde-700">{file.name}</p> : <p className="text-sm text-muted-foreground">Arrastra tu Excel aquí o haz clic para seleccionar</p>}
            <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => setFile(e.target.files[0])} />
          </div>
          {result && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2 text-green-600"><CheckCircle className="h-4 w-4" /><span className="text-sm font-medium">{result.created} productos importados/actualizados</span></div>
              {result.errors?.length > 0 && (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-red-500"><XCircle className="h-4 w-4" /><span className="text-sm font-medium">{result.errors.length} errores</span></div>
                  <div className="max-h-32 overflow-y-auto text-xs text-red-600 bg-red-50 rounded p-2">
                    {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose() }}>Cerrar</Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
