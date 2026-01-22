import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, Printer, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL + '/api';

export default function PublicDocumentViewer() {
  const { publicUrl } = useParams();
  const [document, setDocument] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    loadDocument();
  }, [publicUrl]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      // Get the PDF URL directly from the backend
      const url = `${API_URL}/public/documents/${publicUrl}`;
      setPdfUrl(url);
      setLoading(false);
    } catch (error) {
      console.error('Error loading document:', error);
      setError('No se pudo cargar el documento. Verifique que la URL sea correcta.');
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (pdfUrl) {
      const printWindow = window.open(pdfUrl);
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-slate-600">Cargando documento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Documento no disponible</h1>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100" data-testid="public-document-viewer">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold text-slate-900">Visualización de Documento</h1>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handlePrint}
              className="bg-primary hover:bg-primary/90"
              data-testid="print-document-button"
            >
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {pdfUrl && (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              className="w-full"
              style={{ height: 'calc(100vh - 140px)', minHeight: '600px' }}
              title="Documento PDF"
              onContextMenu={(e) => e.preventDefault()}
              data-testid="pdf-viewer-iframe"
            />
          )}
        </div>
        
        {/* Warning message */}
        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <AlertCircle className="inline h-4 w-4 mr-2" />
            Este documento es de solo visualización. La descarga está deshabilitada por seguridad.
          </p>
        </div>
      </div>

      {/* CSS to disable right-click and some keyboard shortcuts */}
      <style>{`
        iframe {
          pointer-events: auto;
        }
        
        @media print {
          body * {
            visibility: hidden;
          }
          iframe, iframe * {
            visibility: visible;
          }
          iframe {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
          }
        }
      `}</style>
    </div>
  );
}
