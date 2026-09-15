import React, { useState } from 'react';
import { Camera, Download, Copy, Check, X, Loader2 } from 'lucide-react';

interface ExportScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  view3D: boolean;
  onCapture: () => Promise<Blob | null>;
}

export const ExportScreenshotModal: React.FC<ExportScreenshotModalProps> = ({
  isOpen,
  onClose,
  view3D,
  onCapture,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const blob = await onCapture();
      if (!blob) {
        setFeedback({ type: 'error', message: 'Could not generate screenshot. Please try again.' });
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `roomplan-${view3D ? '3d' : '2d'}-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: 'Screenshot downloaded successfully!' });
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      setFeedback({ type: 'error', message: 'Screenshot download failed.' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = async () => {
    setIsProcessing(true);
    setFeedback(null);
    try {
      const blob = await onCapture();
      if (!blob) {
        setFeedback({ type: 'error', message: 'Could not generate screenshot. Please try again.' });
        return;
      }

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        setCopied(true);
        setFeedback({ type: 'success', message: 'Screenshot copied to clipboard!' });
        setTimeout(() => {
          setCopied(false);
          onClose();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: 'Clipboard API not supported in this browser context.' });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        message: 'Clipboard permission denied. Use Download Image instead.',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      id="export-screenshot-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="export-screenshot-modal"
        className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">Export Screenshot</h2>
              <p className="text-xs text-slate-500 font-medium">
                {view3D ? '3D View Perspective' : '2D Floor Plan'}
              </p>
            </div>
          </div>
          <button
            id="export-screenshot-close"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div
            id="export-screenshot-feedback"
            className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {feedback.type === 'success' ? (
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : null}
            <span>{feedback.message}</span>
          </div>
        )}

        <div className="space-y-2.5">
          <button
            id="btn-screenshot-download"
            disabled={isProcessing}
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl font-semibold text-sm shadow-sm transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Image (PNG)
          </button>

          <button
            id="btn-screenshot-copy"
            disabled={isProcessing}
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 active:scale-[0.98] text-slate-700 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-500" />
            )}
            {copied ? 'Copied to Clipboard!' : 'Copy to Clipboard'}
          </button>
        </div>

        <div className="pt-1 text-center text-[11px] text-slate-400">
          Captures high-resolution canvas with all current room elements
        </div>
      </div>
    </div>
  );
};
