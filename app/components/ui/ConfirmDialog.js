'use client';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Supprimer', loading = false }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-300">{message}</p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={loading}>Annuler</Button>
          <Button variant="danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Suppression...' : confirmLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
