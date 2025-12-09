import React, { useEffect, useState, useContext } from 'react';
import AuthContext from '../contexts/AuthContext';
import { apiFetch } from '../services/api';
import ConfirmModal from '../components/ConfirmModal';
import { useLanguage } from '../contexts/LanguageContext';

export default function Documents() {
  const { t } = useLanguage();
  const auth = useContext(AuthContext);
  const [list, setList] = useState([]);
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [confirmState, setConfirmState] = useState({ open: false, message: '', id: null, action: null });

  const loadList = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/documents');
      if (res.ok && Array.isArray(res.data.documents)) {
        setList(res.data.documents.map(d => ({
          id: d._id,
          title: d.title,
          storagePath: d.storagePath,
          sha256: d.sha256,
          signature: d.signature,
          anchoredTx: d.anchoredTx,
          revoked: d.revoked
        })));
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    loadList();
  }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!file) return alert(t('chooseFileAlert'));
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title || file.name);
    setLoading(true);
    const res = await apiFetch('/api/documents/issue', { method: 'POST', body: fd });
    setLoading(false);
    if (!res.ok) return alert(res.data?.error || t('uploadFailed'));
    alert(t('uploaded'));
    await loadList();
  };

  const handleVerify = async (id) => {
    const r = await apiFetch(`/api/documents/${id}/verify`, { method: 'POST' });
    if (!r.ok) return alert(r.data?.error || t('verifyFailed'));
    alert(JSON.stringify(r.data.verification, null, 2));
  };

  // Perform revoke (actual API call)
  const performRevoke = async (id) => {
    const r = await apiFetch(`/api/documents/${id}/revoke`, { method: 'POST' });
    if (!r.ok) return alert(r.data?.error || t('revokeFailed'));
    alert(t('revoked'));
    await loadList();
  };

  // Show confirm modal for actions like revoke
  const showConfirm = (message, id, action) => setConfirmState({ open: true, message, id, action });

  const handleConfirm = async () => {
    const { id, action } = confirmState;
    setConfirmState({ open: false, message: '', id: null, action: null });
    if (action === 'revoke') {
      await performRevoke(id);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">{t('myDocuments')}</h2>

      <form onSubmit={onSubmit} className="mb-6">
        <input type="text" placeholder={t('titleOptional')} value={title} onChange={e=>setTitle(e.target.value)} className="mb-2 p-2 border" />
        <input type="file" onChange={e=>setFile(e.target.files[0])} className="mb-2" />
        <button className="btn bg-blue-600 text-white px-4 py-2" disabled={loading}>{loading ? t('uploading') : t('upload')}</button>
      </form>

      <div>
        {loading && <p>{t('loading')}</p>}
        {!loading && list.length === 0 && <p>{t('noDocuments')}</p>}
        <ul>
          {list.map(item => (
            <li key={item.id} className="mb-4 border-b pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <button className="text-blue-600 hover:underline mr-3" onClick={() => setPreview(item)}>{item.title}</button>
                  {item.anchoredTx && (
                    <a href={`https://explorer.example/tx/${item.anchoredTx}`} target="_blank" rel="noreferrer" className="text-sm text-gray-500">{t('tx')}</a>
                  )}
                </div>
                <div className="text-sm text-gray-500">{item.revoked ? t('revoked') : ''}</div>
              </div>
              <div className="text-sm text-gray-500 mt-1">Hash: {item.sha256}</div>
              <div className="flex items-center gap-3 mt-2">
                <button className="btn text-sm px-3 py-1 bg-gray-200" onClick={() => handleVerify(item.id)}>{t('verify')}</button>
                <button className="btn text-sm px-3 py-1 bg-red-200" onClick={() => showConfirm(t('revokeConfirm'), item.id, 'revoke')}>{t('revoke')}</button>
                {item.signature && <span className="text-xs text-green-600">{t('signed')}</span>}
                {item.revoked && <span className="text-xs text-red-600">{t('revoked')}</span>}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setPreview(null)}>
          <div className="bg-white w-3/4 h-4/5 p-4 overflow-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">{preview.title}</h3>
              <button className="text-sm" onClick={() => setPreview(null)}>{t('close')}</button>
            </div>
            <div className="h-full">
              <object data={preview.storagePath || `/api/documents/${preview.id}/file`} type="application/pdf" width="100%" height="100%">{t('previewNotAvailable')} <a href={preview.storagePath || `/api/documents/${preview.id}/file`} target="_blank" rel="noreferrer">{t('download')}</a></object>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal open={confirmState.open} message={confirmState.message} onConfirm={handleConfirm} onCancel={() => setConfirmState({ open: false, message: '', id: null, action: null })} />
    </div>
  );
}
