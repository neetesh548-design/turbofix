
import React, { useEffect } from 'react';

export default function QRGenerator() {
  useEffect(() => {
    // Basic script execution simulation can go here
  }, []);

  return (
    <div dangerouslySetInnerHTML={{ __html: `
<div class="wrap">
  <h1>TurboFix — QR Tag Generator</h1>
  <p class="sub">Generate one printable QR tag per machine. Scanning a tag opens WhatsApp with the machine ID and name pre-filled — the worker just adds what's wrong.</p>

  <div class="panel">
    <div class="field">
      <label for="waNumber">TurboFix WhatsApp number</label>
      <div class="hint">Full international number, digits only, no + or spaces (e.g. 919876543210)</div>
      <input type="text" id="waNumber" placeholder="919876543210">
    </div>
    <div class="field">
      <label for="machineList">Machine list</label>
      <div class="hint">One machine per line: <code>machine_id, machine_name</code> — e.g. <code>TF-ACME3-M001, CNC Lathe 1</code></div>
      <textarea id="machineList" placeholder="TF-ACME3-M001, CNC Lathe 1&#10;TF-ACME3-M002, Hydraulic Press 2"></textarea>
    </div>
    <button id="generateBtn">Generate QR Tags</button>
    <div id="error"></div>
  </div>

  <div id="tags"></div>
  <button id="printAllBtn" style="display:none">Print All Tags</button>
</div>


` }} />
  );
}
