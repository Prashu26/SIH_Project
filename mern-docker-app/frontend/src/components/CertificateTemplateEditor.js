import React, { useEffect, useRef, useState, useCallback } from 'react';
import { apiFetch } from '../services/api';

function clamp(v, a=0, b=100){ return Math.max(a, Math.min(b, v)); }

function CertificateTemplateEditor({ token }){
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [backgroundFile, setBackgroundFile] = useState(null);
  const [previewBg, setPreviewBg] = useState(null);
  const canvasRef = useRef();
  const previewWrapperRef = useRef();
  const [previewScale, setPreviewScale] = useState(1);
  const [csvPreview, setCsvPreview] = useState(null); // CSV preview data
  const [batchResults, setBatchResults] = useState(null); // Batch generation results

  const loadTemplates = useCallback(async () => {
    if(!token) return;
    const res = await apiFetch('/api/templates', { token });
    if(res.ok) setTemplates(res.data.templates || []);
  }, [token]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // compute preview scale to fit the wrapper while preserving 1:1 coordinate mapping
  useEffect(() => {
    function updateScale(){
      try{
        const wrap = previewWrapperRef.current;
        if(!wrap) return setPreviewScale(1);
        const available = wrap.clientWidth || wrap.getBoundingClientRect().width || window.innerWidth;
        const s = Math.min(1, available / 1123); // A4 landscape: 297mm = ~1123px
        setPreviewScale(s);
      }catch(e){}
    }
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [previewBg, selected]);



  function handleAdd(){
    const newT = {
      name: `Template ${Date.now()}`,
      fields: [
        { key: 'learnerName', type: 'text', text: 'Learner Name', xPct: 50, yPct: 45, fontFamily: 'Roboto', fontSize: 28, fontWeight: '400', fontStyle: 'normal', color: '#111', zIndex: 2 }
      ],
      watermark: { invisible: true, text: `ID-${Date.now()}`, opacity: 0.02 }
    };
    setTemplates([newT, ...templates]);
    setSelected(newT);
  }

  function handleSelect(t){
    setSelected(t);
    if(t && t.backgroundPath) setPreviewBg(t.backgroundPath);
  }

  function onBgFile(e){
    const f = e.target.files[0];
    if(!f) return;
    setBackgroundFile(f);
    const url = URL.createObjectURL(f);
    setPreviewBg(url);
  }

  function addField(){
    if(!selected) return;
    const f = { key: `txt_${Date.now()}`, type: 'text', text: 'New Text', xPct: 50, yPct: 50, fontFamily: 'Roboto', fontSize: 18, fontWeight: '400', fontStyle: 'normal', color: '#000', zIndex: 5 };
    const upd = { ...selected, fields: [...(selected.fields||[]), f] };
    setSelected(upd);
    setTemplates(templates.map(t => t===selected ? upd : t));
  }

  function updateField(idx, patch){
    const f = {...selected.fields[idx], ...patch};
    const fields = selected.fields.map((ff,i)=> i===idx? f: ff);
    const upd = {...selected, fields};
    setSelected(upd);
    setTemplates(templates.map(t=> t===selected? upd: t));
  }

  async function saveTemplate(){
    if(!selected) return;
    const form = new FormData();
    form.append('name', selected.name);
    form.append('fields', JSON.stringify(selected.fields||[]));
    form.append('defaultFont', selected.defaultFont || 'Roboto');
    form.append('defaultFontSize', selected.defaultFontSize || 14);
    form.append('watermark', JSON.stringify(selected.watermark || { invisible: true }));
    if(backgroundFile) form.append('background', backgroundFile);

    const res = await fetch('/api/templates', { method: 'POST', headers: { Authorization: token ? `Bearer ${token}` : '' }, body: form });
    const data = await res.json();
    if(res.ok) {
      alert('Template saved');
      loadTemplates();
    } else {
      alert('Save failed: ' + (data.error || data.message));
    }
  }

  function startDrag(e, idx){
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const onMove = (mv)=>{
      const x = ((mv.clientX - rect.left)/rect.width)*100;
      const y = ((mv.clientY - rect.top)/rect.height)*100;
      updateField(idx, { xPct: clamp(x), yPct: clamp(y) });
    };
    const onUp = ()=>{
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  // Handle CSV file upload and preview
  function handleCsvFileChange(e) {
    const file = e.target.files[0];
    if (!file) {
      setCsvPreview(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        alert('CSV file must contain header and at least one data row');
        setCsvPreview(null);
        return;
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Check for required columns
      const hasName = headers.some(h => h.toLowerCase() === 'name');
      const hasEmail = headers.some(h => h.toLowerCase() === 'email');
      
      if (!hasName || !hasEmail) {
        alert('⚠️ CSV must contain "name" and "email" columns\n\nFound columns: ' + headers.join(', '));
        setCsvPreview(null);
        return;
      }

      // Parse data rows (show first 3)
      const data = [];
      for (let i = 1; i < Math.min(4, lines.length); i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }

      // Auto-fill course name from first row if present
      const firstRow = data[0];
      if (firstRow && firstRow.course) {
        const courseInput = document.getElementById('batchCourseName');
        if (courseInput && !courseInput.value) {
          courseInput.value = firstRow.course;
        }
      } else if (firstRow && firstRow.courseName) {
        const courseInput = document.getElementById('batchCourseName');
        if (courseInput && !courseInput.value) {
          courseInput.value = firstRow.courseName;
        }
      }

      setCsvPreview({
        headers,
        data,
        totalRows: lines.length - 1,
        templateFields: selected?.fields?.map(f => f.key) || []
      });
    };

    reader.readAsText(file);
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-1 bg-gray-700/50 border border-gray-600 rounded-lg p-4">
        <h3 className="text-white font-semibold mb-3">Templates</h3>
        <div className="space-y-2">
          <button onClick={handleAdd} className="bg-blue-600 text-white px-3 py-2 rounded">New Template</button>
          <div className="mt-3 max-h-64 overflow-auto">
            {templates.map((t, i)=> (
              <div key={i} onClick={()=>handleSelect(t)} className={`p-2 rounded hover:bg-gray-600/40 cursor-pointer ${selected===t? 'bg-gray-600/40':''}`}>{t.name}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="md:col-span-2 bg-gray-700/50 border border-gray-600 rounded-lg p-4">
        <div className="flex gap-3 mb-3">
          <input type="file" accept="image/*" onChange={onBgFile} />
          <button onClick={addField} className="bg-green-600 text-white px-3 py-2 rounded">Add Text</button>
          <button onClick={saveTemplate} className="bg-blue-600 text-white px-3 py-2 rounded">Save</button>
          <button onClick={async ()=>{
            if(!selected) return alert('Select a template first');
            // build sample certificateData from selected fields
            const certificateData = {};
            (selected.fields||[]).forEach(f => { certificateData[f.key] = f.text; });
            try{
              const resp = await fetch(`/api/templates/${selected._id || ''}/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: token ? `Bearer ${token}` : '' }, body: JSON.stringify(certificateData) });
              if(!resp.ok){ const j = await resp.json(); return alert('Preview failed: '+(j.error||j.message)); }
              const blob = await resp.blob();
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank');
              // revoke after short delay to avoid leaving blob URLs around
              setTimeout(() => { try { URL.revokeObjectURL(url); } catch(e){} }, 2000);
            }catch(e){ alert('Preview error: '+e.message); }
          }} className="bg-indigo-600 text-white px-3 py-2 rounded">Preview PDF</button>
          <button onClick={async ()=>{
            if(!selected) return alert('Select a template first');
            if(!selected._id) return alert('Please save the template before generating; click Save first.');
            const certificateData = {};
            (selected.fields||[]).forEach(f => { certificateData[f.key] = f.text; });
            
            // Generate a certificate ID
            const certificateId = `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            certificateData.certificateId = certificateId;
            
            // Ask for recipient email (REQUIRED - PDF will be emailed)
            let recipientEmail = window.prompt('📧 Enter recipient email address (REQUIRED):\n\nThe certificate PDF will be sent to this email.');
            if (!recipientEmail || !recipientEmail.trim()) {
              return alert('❌ Email is required! The certificate will be sent to the recipient\'s email.\n\nPlease try again and enter a valid email address.');
            }
            recipientEmail = recipientEmail.trim();
            
            // Basic email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(recipientEmail)) {
              return alert('❌ Invalid email address!\n\nPlease enter a valid email like: user@example.com');
            }
            
            certificateData.email = recipientEmail;
            // request small single-page PDF
            certificateData.fit = 'small';
            try{
              // Single-step: generate PDF, server calculates hash, returns PDF with hash in headers
              const resp = await fetch(`/api/templates/${selected._id}/generate?fit=small`, { 
                method: 'POST', 
                headers: { 
                  'Content-Type': 'application/json', 
                  'Accept': 'application/pdf',
                  Authorization: token ? `Bearer ${token}` : '' 
                }, 
                body: JSON.stringify(certificateData) 
              });
              
              if (!resp.ok) {
                const txt = await resp.text().catch(()=>null);
                return alert('Generate failed: ' + (txt || resp.statusText));
              }
              
              // Extract hash from response headers
              const pdfHash = resp.headers.get('X-PDF-Hash');
              const pdfHashFormatted = resp.headers.get('X-PDF-Hash-Formatted');
              const pdfWidth = resp.headers.get('X-PDF-Width');
              const pdfHeight = resp.headers.get('X-PDF-Height');
              
              console.log('PDF generated:', { certificateId, pdfHash, pdfHashFormatted, pdfWidth, pdfHeight });
              
              // Save certificate record for verification
              if (pdfHash) {
                try {
                  const saveResp = await fetch(`/api/templates/${selected._id}/save-certificate`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: token ? `Bearer ${token}` : ''
                    },
                    body: JSON.stringify({
                      certificateId,
                      pdfHash,
                      learnerData: {
                        name: certificateData.name || certificateData.learnerName,
                        email: certificateData.email
                      }
                    })
                  });
                  if (saveResp.ok) {
                    console.log('✅ Certificate record saved');
                  } else {
                    console.warn('⚠️ Failed to save certificate record');
                  }
                } catch (saveErr) {
                  console.warn('⚠️ Failed to save certificate record:', saveErr);
                }
              }
              
              // Get PDF blob and download
              const pdfBlob = await resp.blob();
              const url = URL.createObjectURL(pdfBlob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${certificateId}.pdf`;
              document.body.appendChild(a);
              a.click();
              a.remove();
              // revoke after short delay to ensure download has started
              setTimeout(() => { try { URL.revokeObjectURL(url); } catch(e){} }, 2000);

              // Show hash to user
              if (pdfHash) {
                alert(`✅ Certificate Generated Successfully!\n\nCertificate ID: ${certificateId}\nRecipient: ${certificateData.email}\nPDF Hash: ${pdfHash}\n\n📧 EMAIL SENT!\nThe certificate PDF has been sent to: ${certificateData.email}\n\n💾 DOWNLOAD\nThe PDF has also been downloaded to your computer.\n\n✓ The recipient can verify this certificate by uploading the PDF.`);
              } else {
                alert(`✅ Certificate generated!\n\n📧 Sent to: ${certificateData.email}\n💾 Downloaded to your computer`);
              }

            }catch(e){ alert('Generate error: '+e.message); }
          }} className="bg-emerald-600 text-white px-3 py-2 rounded">Generate & Download</button>
        </div>

        <div ref={previewWrapperRef} className="w-full flex justify-center">
          <div style={{ width: Math.round(1123 * previewScale) + 'px', height: Math.round(794 * previewScale) + 'px', overflow: 'hidden' }}>
            <div ref={canvasRef} className="relative border border-gray-600 rounded overflow-hidden" style={{ width: '1123px', height: '794px', transform: `scale(${previewScale})`, transformOrigin: 'top left', backgroundSize: 'cover', backgroundImage: previewBg ? `url(${previewBg})` : 'linear-gradient(180deg,#fff,#eee)' }}>
          {((selected && selected.fields) || []).map((f, idx)=> (
            <div key={f.key}
                 onMouseDown={(e)=> startDrag(e, idx)}
                 style={{ position: 'absolute', left: `${f.xPct}%`, top: `${f.yPct}%`, transform: 'translate(-50%,-50%)', fontSize: `${f.fontSize}px`, color: f.color, fontFamily: f.fontFamily || 'Roboto', fontWeight: f.fontWeight || '400', fontStyle: f.fontStyle || 'normal', cursor: 'grab', zIndex: f.zIndex }}
            >{f.text}</div>
          ))}
              </div>
            </div>
          </div>

        {selected && (
          <div className="mt-4 bg-gray-800 p-3 rounded">
            <h4 className="text-white mb-2">Selected Template: {selected.name}</h4>
            <div className="space-y-2">
              {(selected.fields||[]).map((f, idx)=> (
                <div key={f.key} className="p-2 bg-gray-700/40 rounded">
                  <div className="flex gap-2 items-center mb-2">
                    <input value={f.key} onChange={(e)=> updateField(idx, { key: e.target.value })} placeholder="Field Key" className="w-32 p-1 rounded bg-gray-800" />
                    <input value={f.text} onChange={(e)=> updateField(idx, { text: e.target.value })} placeholder="Text" className="flex-1 p-1 rounded bg-gray-800" />
                    <input type="color" value={f.color} onChange={(e)=> updateField(idx, { color: e.target.value })} className="w-12 h-8 rounded bg-gray-800" />
                  </div>
                  <div className="flex gap-2 items-center">
                    <label className="text-sm text-gray-300">X%</label>
                    <input type="number" value={Math.round(f.xPct)} onChange={(e)=> updateField(idx, { xPct: clamp(Number(e.target.value)) })} className="w-20 p-1 rounded bg-gray-800" />
                    <label className="text-sm text-gray-300">Y%</label>
                    <input type="number" value={Math.round(f.yPct)} onChange={(e)=> updateField(idx, { yPct: clamp(Number(e.target.value)) })} className="w-20 p-1 rounded bg-gray-800" />
                    <label className="text-sm text-gray-300">Size</label>
                    <input type="number" value={f.fontSize} onChange={(e)=> updateField(idx, { fontSize: Number(e.target.value) })} className="w-20 p-1 rounded bg-gray-800" />
                  </div>
                  <div className="flex gap-2 mt-2 items-center">
                    <label className="text-sm text-gray-300">Font</label>
                    <select value={f.fontFamily || 'Roboto'} onChange={(e)=> updateField(idx, { fontFamily: e.target.value })} className="bg-gray-800 p-1 rounded">
                      <option value="Roboto">Roboto</option>
                      <option value="Arial">Arial</option>
                      <option value="Georgia">Georgia</option>
                      <option value="Times New Roman">Times New Roman</option>
                      <option value="Courier New">Courier New</option>
                      <option value="Montserrat">Montserrat</option>
                      <option value="Lato">Lato</option>
                    </select>
                    <label className="text-sm text-gray-300">Weight</label>
                    <select value={f.fontWeight || '400'} onChange={(e)=> updateField(idx, { fontWeight: e.target.value })} className="bg-gray-800 p-1 rounded w-24">
                      <option value="300">300</option>
                      <option value="400">400</option>
                      <option value="700">700</option>
                      <option value="900">900</option>
                    </select>
                    <label className="text-sm text-gray-300">Italic</label>
                    <input type="checkbox" checked={(f.fontStyle||'normal')==='italic'} onChange={(e)=> updateField(idx, { fontStyle: e.target.checked ? 'italic' : 'normal' })} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batch Certificate Generation Section */}
        {selected && selected._id && (
          <div className="mt-6 bg-gray-800/50 border border-gray-600 rounded-lg p-4">
            <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
              <span>📊</span> Batch Certificate Generation
            </h3>
            <p className="text-sm text-gray-400 mb-2">
              Upload a CSV file to generate multiple certificates. Each row will create a user account, generate a PDF certificate, and send login credentials + certificate via email.
            </p>
            <a 
              href="/certificate-batch-template.csv" 
              download 
              className="inline-block text-sm text-blue-400 hover:text-blue-300 mb-4"
            >
              📥 Download CSV Template
            </a>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-300 block mb-1">Course Name (optional)</label>
                <input 
                  type="text" 
                  id="batchCourseName"
                  placeholder="e.g., Full Stack Development" 
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                />
              </div>
              
              <div>
                <label className="text-sm text-gray-300 block mb-1">CSV File (required columns: name, email)</label>
                <input 
                  type="file" 
                  id="batchCsvFile"
                  accept=".csv" 
                  onChange={handleCsvFileChange}
                  className="w-full p-2 rounded bg-gray-700 text-white border border-gray-600"
                />
              </div>
              
              {/* CSV Preview */}
              {csvPreview && (
                <div className="bg-gray-900/70 border border-green-500/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-400 text-xl">✓</span>
                    <strong className="text-green-400 text-sm">CSV Detected: {csvPreview.totalRows} rows</strong>
                  </div>
                  
                  <div className="text-xs text-gray-300 mb-2">
                    <strong>Columns found:</strong> {csvPreview.headers.join(', ')}
                  </div>
                  
                  {csvPreview.templateFields.length > 0 && (
                    <div className="text-xs text-gray-300 mb-2">
                      <strong>Template fields:</strong>
                      <div className="mt-1 space-y-1">
                        {csvPreview.templateFields.map(field => {
                          const matched = csvPreview.headers.some(h => 
                            h.toLowerCase() === field.toLowerCase() || 
                            h.toLowerCase().replace(/[_-]/g, '') === field.toLowerCase().replace(/[_-]/g, '')
                          );
                          return (
                            <div key={field} className="flex items-center gap-2">
                              <span className={matched ? 'text-green-400' : 'text-yellow-400'}>
                                {matched ? '✓' : '⚠'}
                              </span>
                              <span className={matched ? 'text-green-400' : 'text-yellow-400'}>
                                {field}
                              </span>
                              {matched && <span className="text-gray-500 text-xs">- will be filled from CSV</span>}
                              {!matched && <span className="text-gray-500 text-xs">- no matching CSV column</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  
                  <div className="text-xs text-gray-400 mb-2">
                    <strong>Preview (first 3 rows):</strong>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="text-xs text-gray-300 w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          {csvPreview.headers.map((h, i) => (
                            <th key={i} className="px-2 py-1 text-left font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.data.map((row, i) => (
                          <tr key={i} className="border-b border-gray-800">
                            {csvPreview.headers.map((h, j) => (
                              <td key={j} className="px-2 py-1">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {csvPreview.totalRows > 3 && (
                    <div className="text-xs text-gray-500 mt-2">
                      ... and {csvPreview.totalRows - 3} more rows
                    </div>
                  )}
                </div>
              )}
              
              <div className="bg-gray-700/50 p-3 rounded text-xs text-gray-300">
                <strong>CSV Format Example:</strong>
                <pre className="mt-2 bg-gray-900 p-2 rounded overflow-x-auto">
{`name,email,course,grade
John Doe,john@example.com,Web Development,A+
Jane Smith,jane@example.com,Data Science,A`}
                </pre>
                <ul className="mt-2 space-y-1">
                  <li>• <strong>name</strong> and <strong>email</strong> are required</li>
                  <li>• Additional columns will be available as template fields</li>
                  <li>• Each row creates: User Account + Certificate + Email with Credentials</li>
                </ul>
              </div>
              
              <button onClick={async () => {
                  const csvFile = document.getElementById('batchCsvFile').files[0];
                  const courseName = document.getElementById('batchCourseName').value.trim();
                  
                  if (!csvFile) {
                    return alert('❌ Please select a CSV file');
                  }
                  
                  if (!courseName) {
                    if (!window.confirm('No course name provided. Continue with default course?')) {
                      return;
                    }
                  }
                  
                  const confirmMsg = `🚀 Start batch generation?\n\nThis will:\n1. Parse CSV file\n2. Create user accounts (if needed)\n3. Generate PDF certificates\n4. Send emails with PDFs and login credentials\n\nContinue?`;
                  
                  if (!window.confirm(confirmMsg)) return;
                  
                  try {
                    const formData = new FormData();
                    formData.append('csvFile', csvFile);
                    if (courseName) formData.append('courseName', courseName);
                    
                    const progressMsg = document.getElementById('batchProgress');
                    progressMsg.textContent = '⏳ Processing batch... This may take a few minutes.';
                    progressMsg.className = 'text-yellow-400 text-sm mt-2';
                    
                    const resp = await fetch(`/api/templates/${selected._id}/batch-generate`, {
                      method: 'POST',
                      headers: {
                        Authorization: token ? `Bearer ${token}` : ''
                      },
                      body: formData
                    });
                    
                    const data = await resp.json();
                    
                    if (!resp.ok) {
                      progressMsg.textContent = '';
                      return alert(`❌ Batch generation failed:\n\n${data.message || data.error}`);
                    }
                    
                    progressMsg.textContent = '';
                    
                    // Store batch results for download
                    setBatchResults(data.results);
                    
                    let resultMsg = `✅ Batch Processing Complete!\n\n`;
                    resultMsg += `Total: ${data.results.total}\n`;
                    resultMsg += `✓ Succeeded: ${data.results.succeeded}\n`;
                    resultMsg += `✗ Failed: ${data.results.failed}\n\n`;
                    
                    if (data.results.succeeded > 0) {
                      resultMsg += `✅ Certificates generated and saved locally\n`;
                      resultMsg += `📥 Download buttons available below\n\n`;
                    }
                    
                    if (data.results.failed > 0) {
                      resultMsg += `Failed entries:\n`;
                      data.results.failedDetails.slice(0, 5).forEach(f => {
                        resultMsg += `• Row ${f.rowIndex}: ${f.email} - ${f.error}\n`;
                      });
                      if (data.results.failedDetails.length > 5) {
                        resultMsg += `... and ${data.results.failedDetails.length - 5} more\n`;
                      }
                    }
                    
                    alert(resultMsg);
                    
                    document.getElementById('batchCsvFile').value = '';
                    document.getElementById('batchCourseName').value = '';
                    setCsvPreview(null);
                    
                  } catch (e) {
                    const progressMsg = document.getElementById('batchProgress');
                    progressMsg.textContent = '';
                    alert(`❌ Error: ${e.message}`);
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-3 rounded font-semibold hover:from-purple-700 hover:to-blue-700 transition"
              >
                🚀 Generate Batch Certificates
              </button>
              
              <div id="batchProgress" className="text-sm"></div>
              
              {/* Batch Results with Download Buttons */}
              {batchResults && batchResults.succeeded > 0 && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-green-800">📥 Download Certificates ({batchResults.succeeded})</h4>
                    <button
                      onClick={async () => {
                        const downloadBtn = document.getElementById('downloadAllBtn');
                        const originalText = downloadBtn.textContent;
                        try {
                          downloadBtn.textContent = 'Downloading...';
                          downloadBtn.disabled = true;
                          
                          // Download all certificates sequentially
                          for (let i = 0; i < batchResults.successDetails.length; i++) {
                            const cert = batchResults.successDetails[i];
                            downloadBtn.textContent = `Downloading ${i + 1}/${batchResults.successDetails.length}...`;
                            
                            const response = await fetch(`/api/templates/download-certificate/${cert.certificateId}`, {
                              headers: { Authorization: `Bearer ${token}` }
                            });
                            
                            if (response.ok) {
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${cert.email.replace('@', '_')}_${cert.certificateId}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                              
                              // Small delay to avoid overwhelming browser
                              await new Promise(resolve => setTimeout(resolve, 500));
                            }
                          }
                          
                          alert(`✅ Downloaded ${batchResults.successDetails.length} certificates!`);
                        } catch (err) {
                          alert(`Download failed: ${err.message}`);
                        } finally {
                          downloadBtn.textContent = originalText;
                          downloadBtn.disabled = false;
                        }
                      }}
                      id="downloadAllBtn"
                      className="px-4 py-2 bg-gradient-to-r from-green-600 to-blue-600 text-white text-sm font-semibold rounded hover:from-green-700 hover:to-blue-700 transition"
                    >
                      📦 Download All ({batchResults.succeeded})
                    </button>
                  </div>
                  
                  <div className="max-h-60 overflow-y-auto">
                    {batchResults.successDetails.map((cert, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 px-3 mb-2 bg-white rounded border hover:border-blue-300 transition">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{cert.email}</div>
                          <div className="text-xs text-gray-500">ID: {cert.certificateId}</div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              const response = await fetch(`/api/templates/download-certificate/${cert.certificateId}`, {
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (!response.ok) throw new Error('Download failed');
                              
                              const blob = await response.blob();
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${cert.email.replace('@', '_')}_${cert.certificateId}.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              window.URL.revokeObjectURL(url);
                              document.body.removeChild(a);
                            } catch (err) {
                              alert(`Download failed: ${err.message}`);
                            }
                          }}
                          className="ml-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                        >
                          📥 Download
                        </button>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => {
                        // Export list as CSV
                        const csv = [
                          'Email,Certificate ID,Status',
                          ...batchResults.successDetails.map(c => 
                            `${c.email},${c.certificateId},Generated`
                          )
                        ].join('\n');
                        
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `certificate_list_${Date.now()}.csv`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                        document.body.removeChild(a);
                      }}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      📄 Export List (CSV)
                    </button>
                    <button
                      onClick={() => setBatchResults(null)}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ✕ Clear Results
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CertificateTemplateEditor;
