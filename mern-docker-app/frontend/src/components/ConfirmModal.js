import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function ConfirmModal({ open, message = 'Are you sure?', onConfirm, onCancel }) {
  const { t } = useLanguage();
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg w-11/12 max-w-md p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">{t('confirm')}</h3>
        </div>
        <div className="mb-6 text-sm text-gray-700">{message}</div>
        <div className="flex justify-end gap-3">
          <button className="px-3 py-1 bg-gray-200 rounded" onClick={onCancel}>{t('cancel')}</button>
          <button className="px-3 py-1 bg-red-600 text-white rounded" onClick={onConfirm}>{t('yesProceed')}</button>
        </div>
      </div>
    </div>
  );
}
