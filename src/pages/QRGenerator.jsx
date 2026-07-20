
import React, { useEffect, useState } from 'react';
import MainLayout from '../layouts/MainLayout';

export default function QRGenerator() {
  const [waNumber, setWaNumber] = useState('');
  const [machineList, setMachineList] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [tags, setTags] = useState([]);

  useEffect(() => {
    document.title = 'QR Tag Generator | TurboFix';
    window.scrollTo(0, 0);
  }, []);

  const handleGenerate = () => {
    setErrorMsg('');
    setTags([]);
    const number = waNumber.trim().replace(/\D/g, '');
    if (!number) {
      setErrorMsg('Please enter a valid WhatsApp number (digits only).');
      return;
    }
    const lines = machineList.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      setErrorMsg('Please enter at least one machine.');
      return;
    }

    const generated = [];
    for (const line of lines) {
      const parts = line.split(',');
      if (parts.length < 2) continue;
      const id = parts[0].trim();
      const name = parts[1].trim();
      if (!id || !name) continue;
      const text = `Issue with ${id} (${name})`;
      const link = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(link)}`;
      generated.push({ id, name, qrUrl });
    }
    setTags(generated);
  };

  return (
    <MainLayout>
      <section style={{ padding: '120px 0' }}>
        <div className="container wrap" style={{ maxWidth: '800px', margin: '0 auto', background: 'var(--card)', padding: '40px', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <h1 style={{ marginBottom: '12px' }}>TurboFix — QR Tag Generator</h1>
          <p className="sub" style={{ color: 'var(--slate)', marginBottom: '32px' }}>
            Generate one printable QR tag per machine. Scanning a tag opens WhatsApp with the machine ID and name pre-filled — the worker just adds what's wrong.
          </p>

          <div className="panel">
            <div className="field" style={{ marginBottom: '24px' }}>
              <label htmlFor="waNumber" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>TurboFix WhatsApp number</label>
              <div className="hint" style={{ color: 'var(--slate-light)', fontSize: '13px', marginBottom: '8px' }}>
                Full international number, digits only, no + or spaces (e.g. 919876543210)
              </div>
              <input 
                type="text" 
                id="waNumber" 
                placeholder="919876543210" 
                value={waNumber}
                onChange={(e) => setWaNumber(e.target.value)}
                style={{ width: '100%', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--ink)' }} 
              />
            </div>
            <div className="field" style={{ marginBottom: '24px' }}>
              <label htmlFor="machineList" style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Machine list</label>
              <div className="hint" style={{ color: 'var(--slate-light)', fontSize: '13px', marginBottom: '8px' }}>
                One machine per line: <code>machine_id, machine_name</code> — e.g. <code>TF-ACME3-M001, CNC Lathe 1</code>
              </div>
              <textarea 
                id="machineList" 
                placeholder="TF-ACME3-M001, CNC Lathe 1&#10;TF-ACME3-M002, Hydraulic Press 2" 
                value={machineList}
                onChange={(e) => setMachineList(e.target.value)}
                style={{ width: '100%', height: '120px', padding: '12px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--ink)' }}
              />
            </div>
            <button 
              id="generateBtn" 
              onClick={handleGenerate}
              className="btn btn-primary" 
              style={{ background: 'var(--brand)', color: 'white', padding: '12px 24px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: 600 }}
            >
              Generate QR Tags
            </button>
            {errorMsg && <div id="error" style={{ color: 'var(--red)', marginTop: '12px' }}>{errorMsg}</div>}
          </div>

          <div id="tags" style={{ marginTop: '32px', display: 'flex', flexWrap: 'wrap', gap: '16px' }}>
            {tags.map((tag, idx) => (
              <div key={idx} style={{ border: '1px solid var(--border)', padding: '16px', borderRadius: '8px', background: 'var(--bg)', textAlign: 'center', minWidth: '180px' }}>
                <img src={tag.qrUrl} alt={`QR for ${tag.name}`} style={{ marginBottom: '8px' }} />
                <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{tag.name}</div>
                <div style={{ fontSize: '12px', color: 'var(--slate)' }}>{tag.id}</div>
              </div>
            ))}
          </div>
          {tags.length > 0 && (
            <button 
              onClick={() => window.print()} 
              className="btn btn-secondary" 
              style={{ marginTop: '24px', display: 'block', background: 'var(--border)', padding: '8px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}
            >
              Print All Tags
            </button>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
