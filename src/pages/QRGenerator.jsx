import React, { useEffect, useMemo, useState } from 'react';
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

  const machineCount = useMemo(() => machineList.split('\n').filter((line) => line.trim()).length, [machineList]);

  const handleGenerate = () => {
    setErrorMsg('');
    setTags([]);

    const number = waNumber.trim().replace(/\D/g, '');
    if (!number) {
      setErrorMsg('Please enter a valid WhatsApp number (digits only).');
      return;
    }

    const lines = machineList.split('\n').filter((line) => line.trim());
    if (lines.length === 0) {
      setErrorMsg('Please add at least one machine line.');
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
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(link)}`;
      generated.push({ id, name, qrUrl });
    }

    setTags(generated);
    if (!generated.length) {
      setErrorMsg('No valid machine rows found. Use: machine_id, machine_name');
    }
  };

  return (
    <MainLayout>
      <section className="qr-generator-page">
        <div className="container qr-generator-shell">
          <div className="qr-generator-hero">
            <div>
              <span className="qr-generator-kicker">Operations utility</span>
              <h1>QR Tag Generator</h1>
              <p>
                Create one printable QR tag per machine. Scanning a tag opens WhatsApp with the machine details already
                filled in, so the worker only adds what’s wrong.
              </p>
            </div>
            <div className="qr-generator-hero-meta">
              <div>
                <span>Machines queued</span>
                <strong>{machineCount}</strong>
              </div>
              <div>
                <span>Output mode</span>
                <strong>WhatsApp → QR</strong>
              </div>
            </div>
          </div>

          <div className="qr-generator-card">
            <div className="qr-generator-grid">
              <label className="qr-generator-field">
                <span>TurboFix WhatsApp number</span>
                <small>Full international number, digits only — no plus sign or spaces.</small>
                <input
                  type="text"
                  id="waNumber"
                  placeholder="919876543210"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                />
              </label>

              <label className="qr-generator-field qr-generator-field-wide">
                <span>Machine list</span>
                <small>
                  One machine per line in this format: <code>machine_id, machine_name</code>
                </small>
                <textarea
                  id="machineList"
                  placeholder="TF-ACME3-M001, CNC Lathe 1&#10;TF-ACME3-M002, Hydraulic Press 2"
                  value={machineList}
                  onChange={(e) => setMachineList(e.target.value)}
                />
              </label>
            </div>

            <div className="qr-generator-actions">
              <button id="generateBtn" onClick={handleGenerate} className="btn btn-primary qr-generator-primary">
                Generate QR Tags
              </button>
              <div className="qr-generator-note">
                <span>{tags.length ? `${tags.length} tag${tags.length === 1 ? '' : 's'} ready` : 'Nothing generated yet'}</span>
                <small>{errorMsg || 'Keep the machine list short and precise for cleaner tags.'}</small>
              </div>
            </div>

            {errorMsg && <div id="error" className="qr-generator-error">{errorMsg}</div>}
          </div>

          <div className="qr-generator-results" id="tags">
            {tags.map((tag) => (
              <article key={`${tag.id}-${tag.name}`} className="qr-generator-tag">
                <div className="qr-generator-tag-qr">
                  <img src={tag.qrUrl} alt={`QR for ${tag.name}`} />
                </div>
                <div className="qr-generator-tag-copy">
                  <strong>{tag.name}</strong>
                  <span>{tag.id}</span>
                </div>
              </article>
            ))}
          </div>

          {tags.length > 0 && (
            <div className="qr-generator-footer">
              <button onClick={() => window.print()} className="btn btn-secondary qr-generator-print">
                Print All Tags
              </button>
            </div>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
