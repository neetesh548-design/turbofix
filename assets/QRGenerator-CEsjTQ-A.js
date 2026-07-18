import{f as e,l as t,n}from"./index-ByDfQpqD.js";import{t as r}from"./MainLayout-DostxQda.js";var i=e(t(),1),a=n();function o(){return(0,i.useEffect)(()=>{window.scrollTo(0,0)},[]),(0,a.jsx)(r,{children:(0,a.jsx)(`div`,{dangerouslySetInnerHTML:{__html:`
<section style="padding: 120px 0;">
  <div class="container wrap" style="max-width: 800px; margin: 0 auto; background: var(--card); padding: 40px; border-radius: 16px; border: 1px solid var(--border);">
    <h1 style="margin-bottom: 12px;">TurboFix — QR Tag Generator</h1>
    <p class="sub" style="color: var(--slate); margin-bottom: 32px;">Generate one printable QR tag per machine. Scanning a tag opens WhatsApp with the machine ID and name pre-filled — the worker just adds what's wrong.</p>

    <div class="panel">
      <div class="field" style="margin-bottom: 24px;">
        <label for="waNumber" style="display: block; margin-bottom: 8px; font-weight: 600;">TurboFix WhatsApp number</label>
        <div class="hint" style="color: var(--slate-light); font-size: 13px; margin-bottom: 8px;">Full international number, digits only, no + or spaces (e.g. 919876543210)</div>
        <input type="text" id="waNumber" placeholder="919876543210" style="width: 100%; padding: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--ink);">
      </div>
      <div class="field" style="margin-bottom: 24px;">
        <label for="machineList" style="display: block; margin-bottom: 8px; font-weight: 600;">Machine list</label>
        <div class="hint" style="color: var(--slate-light); font-size: 13px; margin-bottom: 8px;">One machine per line: <code>machine_id, machine_name</code> — e.g. <code>TF-ACME3-M001, CNC Lathe 1</code></div>
        <textarea id="machineList" placeholder="TF-ACME3-M001, CNC Lathe 1&#10;TF-ACME3-M002, Hydraulic Press 2" style="width: 100%; height: 120px; padding: 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; color: var(--ink);"></textarea>
      </div>
      <button id="generateBtn" class="btn btn-primary" style="background: var(--brand); color: white; padding: 12px 24px; border-radius: 6px; border: none; cursor: pointer; font-weight: 600;">Generate QR Tags</button>
      <div id="error" style="color: var(--red); margin-top: 12px;"></div>
    </div>

    <div id="tags" style="margin-top: 32px; display: flex; flex-wrap: wrap; gap: 16px;"></div>
    <button id="printAllBtn" class="btn btn-secondary" style="display:none; margin-top: 24px;">Print All Tags</button>
  </div>
</section>
`}})})}export{o as default};