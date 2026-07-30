import{a as e,n as t,r as n,s as r,t as i}from"./jsx-runtime-jT5RKm57.js";import{m as a}from"./auth-WtaHFDdY.js";import{n as o,r as s,t as c}from"./mediaErrors-B1Y-S--p.js";import{t as l}from"./check-DXQbGA9R.js";import{t as u}from"./circle-alert-BnxZnroA.js";import{n as d}from"./AppShell-CxR2rYd5.js";import{t as f}from"./x-Dbi12M3t.js";import{l as p,o as m,x as h}from"./breakdownRouter-CFwcVeY9.js";import{t as g}from"./send-C4ttsZaT.js";import{t as _}from"./supabaseClient-La4TUPEb.js";import{t as v}from"./api-DZGb_mAl.js";var y=n(`pen-line`,[[`path`,{d:`M13 21h8`,key:`1jsn5i`}],[`path`,{d:`M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z`,key:`1a8usu`}]]),b=n(`rotate-ccw`,[[`path`,{d:`M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8`,key:`1357e3`}],[`path`,{d:`M3 3v5h5`,key:`1xhq8a`}]]),x=r(e(),1),S=i();function C({open:e,imageSrc:t,onClose:n,onSave:r}){let i=(0,x.useRef)(null),[a,o]=(0,x.useState)(!1),[s,c]=(0,x.useState)(`#EF4444`),[u]=(0,x.useState)(4);if((0,x.useEffect)(()=>{if(!e||!t||!i.current)return;let n=i.current,r=n.getContext(`2d`),a=new Image;a.crossOrigin=`anonymous`,a.onload=()=>{n.width=a.width>800?800:a.width,n.height=a.height*n.width/a.width,r.drawImage(a,0,0,n.width,n.height)},a.src=t},[e,t]),!e||!t)return null;let d=e=>{let t=i.current;if(!t)return;let n=t.getBoundingClientRect(),r=t.getContext(`2d`),a=(e.clientX||e.touches?.[0]?.clientX)-n.left,c=(e.clientY||e.touches?.[0]?.clientY)-n.top;r.beginPath(),r.moveTo(a,c),r.strokeStyle=s,r.lineWidth=u,r.lineCap=`round`,o(!0)},p=e=>{if(!a)return;let t=i.current;if(!t)return;let n=t.getBoundingClientRect(),r=t.getContext(`2d`),o=(e.clientX||e.touches?.[0]?.clientX)-n.left,s=(e.clientY||e.touches?.[0]?.clientY)-n.top;r.lineTo(o,s),r.stroke()},m=()=>{o(!1)};return(0,S.jsx)(`div`,{style:{position:`fixed`,inset:0,zIndex:9999,background:`rgba(0,0,0,0.85)`,backdropFilter:`blur(8px)`,display:`flex`,flexDirection:`column`,alignItems:`center`,justifyContent:`center`,padding:16},children:(0,S.jsxs)(`div`,{style:{background:`var(--surface-card, #1E293B)`,borderRadius:16,border:`1px solid rgba(255,255,255,0.1)`,maxWidth:`90vw`,maxHeight:`90vh`,display:`flex`,flexDirection:`column`,overflow:`hidden`},children:[(0,S.jsxs)(`div`,{style:{padding:`12px 16px`,borderBottom:`1px solid rgba(255,255,255,0.08)`,display:`flex`,alignItems:`center`,justifyContent:`space-between`},children:[(0,S.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:8,color:`#F8FAFC`},children:[(0,S.jsx)(y,{size:18,style:{color:`#38BDF8`}}),(0,S.jsx)(`strong`,{style:{fontSize:`0.95rem`},children:`Annotate Photo / Highlight Problem Area`})]}),(0,S.jsx)(`button`,{onClick:n,style:{background:`none`,border:`none`,color:`#94A3B8`,cursor:`pointer`},children:(0,S.jsx)(f,{size:20})})]}),(0,S.jsx)(`div`,{style:{padding:16,display:`flex`,justifyContent:`center`,alignItems:`center`,overflow:`auto`,background:`#0F172A`},children:(0,S.jsx)(`canvas`,{ref:i,onMouseDown:d,onMouseMove:p,onMouseUp:m,onMouseLeave:m,onTouchStart:d,onTouchMove:p,onTouchEnd:m,style:{cursor:`crosshair`,borderRadius:8,touchAction:`none`}})}),(0,S.jsxs)(`div`,{style:{padding:`12px 16px`,borderTop:`1px solid rgba(255,255,255,0.08)`,display:`flex`,flexWrap:`wrap`,alignItems:`center`,justifyContent:`space-between`,gap:12},children:[(0,S.jsxs)(`div`,{style:{display:`flex`,alignItems:`center`,gap:12},children:[(0,S.jsx)(`span`,{style:{color:`#94A3B8`,fontSize:`0.8rem`},children:`Color:`}),[`#EF4444`,`#F59E0B`,`#10B981`,`#38BDF8`].map(e=>(0,S.jsx)(`button`,{onClick:()=>c(e),style:{width:24,height:24,borderRadius:`50%`,background:e,border:s===e?`2px solid #FFFFFF`:`none`,cursor:`pointer`}},e)),(0,S.jsxs)(`button`,{onClick:()=>{let e=i.current;if(!e)return;let n=e.getContext(`2d`),r=new Image;r.crossOrigin=`anonymous`,r.onload=()=>{n.clearRect(0,0,e.width,e.height),n.drawImage(r,0,0,e.width,e.height)},r.src=t},style:{display:`flex`,alignItems:`center`,gap:4,background:`rgba(255,255,255,0.05)`,border:`1px solid rgba(255,255,255,0.1)`,color:`#94A3B8`,borderRadius:6,padding:`4px 10px`,fontSize:`0.78rem`,cursor:`pointer`},children:[(0,S.jsx)(b,{size:14}),` Reset`]})]}),(0,S.jsxs)(`div`,{style:{display:`flex`,gap:8},children:[(0,S.jsx)(`button`,{onClick:n,style:{padding:`6px 14px`,borderRadius:8,background:`transparent`,border:`1px solid rgba(255,255,255,0.15)`,color:`#94A3B8`,cursor:`pointer`},children:`Cancel`}),(0,S.jsxs)(`button`,{onClick:()=>{let e=i.current;e&&(r(e.toDataURL(`image/jpeg`,.85)),n())},style:{padding:`6px 16px`,borderRadius:8,background:`#0EA5E9`,border:`none`,color:`#FFFFFF`,fontWeight:600,display:`flex`,alignItems:`center`,gap:6,cursor:`pointer`},children:[(0,S.jsx)(l,{size:16}),` Save Markup`]})]})]})]})})}var w=`/`;function T({open:e,onClose:n,machines:r,onTicketCreated:i}){let[l,b]=(0,x.useState)(`machine`),[T,E]=(0,x.useState)(``),[D,O]=(0,x.useState)(``),[k,A]=(0,x.useState)(!1),[j,M]=(0,x.useState)(``),[N,P]=(0,x.useState)(!1),[F,I]=(0,x.useState)(!1),[L,R]=(0,x.useState)(``),[z,B]=(0,x.useState)(``),[V,H]=(0,x.useState)(null),U=(0,x.useRef)(null),W=(0,x.useRef)(null),G=(0,x.useRef)([]),K=(0,x.useMemo)(()=>p(D),[D]),q=z||K.urgency,J=h(q),Y=T?`${w}report-breakdown.html?machine=${encodeURIComponent(T)}`:`${w}report-breakdown.html`,X=(0,x.useMemo)(()=>{let e=new Set,t=[];for(let n of r||[]){let r=n.machine_id??n.id;e.has(r)||(e.add(r),t.push({...n,machine_id:r,machine_name:n.machine_name??n.name}))}return t},[r]),Z=async()=>{let e=window.SpeechRecognition||window.webkitSpeechRecognition,t=!1;if(e)try{let n=new e;n.continuous=!0,n.interimResults=!0,n.lang=`en-US`;let r=D;n.onresult=e=>{let t=``;for(let n=e.resultIndex;n<e.results.length;n++)t+=e.results[n][0].transcript;O(r?`${r}\n${t}`:t)},n.onerror=()=>{},n.start(),U.current=n,t=!0}catch(e){console.warn(`SpeechRecognition failed to start:`,e)}if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){if(!t){R(c());return}A(!0);return}try{let e=await navigator.mediaDevices.getUserMedia({audio:!0}),n=new MediaRecorder(e);G.current=[],n.onstart=()=>A(!0),n.ondataavailable=e=>G.current.push(e.data),n.onstop=async()=>{A(!1),!t&&G.current.length>0&&O(e=>e?`${e}\n[Voice message recorded]`:`[Voice message recorded]`),e.getTracks().forEach(e=>e.stop())},n.start(),W.current=n}catch(e){t||R(c(e))}},Q=()=>{if(U.current){try{U.current.stop()}catch{}U.current=null}if(W.current)try{W.current.stop()}catch{}A(!1)},ee=e=>{let t=e.target.files?.[0];if(!t)return;if(t.size>10*1024*1024){R(`Photo must be under 10 MB`);return}let n=new FileReader;n.onload=e=>M(e.target?.result||``),n.readAsDataURL(t),R(``)},te=async()=>{if(!T||!D.trim()){R(`Please select a machine and describe the issue`);return}I(!0),R(``);try{let e={machine_id:T,issue_text:D,urgency:q},t=null;try{let n=await v(`/vault/tickets`,{method:`POST`,body:JSON.stringify(e)});if(!n.ok){let e=await n.json().catch(()=>({}));throw Error(e.detail||`API endpoint error`)}t=await n.json()}catch(e){console.warn(`API endpoint unavailable/failed, executing direct Supabase DB fallback:`,e);let n={machine_id:T,issue_text:D,urgency:q,status:`open`,created_at:new Date().toISOString()},{data:r,error:i}=await _.from(`tickets`).insert(n).select().single();if(i)throw Error(i.message||e.message||`Failed to create ticket`);t=r}H(t),i?.(t),b(`submitting`),setTimeout(()=>{n()},2e3)}catch(e){R(e.message)}finally{I(!1)}};if(!e)return null;let $=X.find(e=>e.machine_id===T);return(0,S.jsxs)(`div`,{className:`quick-report-overlay`,role:`dialog`,"aria-modal":`true`,"aria-labelledby":`quick-report-title`,children:[(0,S.jsx)(`button`,{className:`quick-report-backdrop`,onClick:n,"aria-label":`Close`}),(0,S.jsxs)(`div`,{className:`quick-report-dialog`,children:[(0,S.jsxs)(`header`,{className:`quick-report-header`,children:[(0,S.jsxs)(`div`,{children:[(0,S.jsxs)(`span`,{className:`quick-report-kicker`,children:[(0,S.jsx)(a,{size:16}),` Quick Report`]}),(0,S.jsx)(`h2`,{id:`quick-report-title`,children:`Report a machine issue`}),(0,S.jsx)(`p`,{children:`Scan QR or select machine, then describe the problem`})]}),(0,S.jsx)(`button`,{type:`button`,className:`quick-report-close`,onClick:n,"aria-label":`Close`,children:(0,S.jsx)(f,{size:20})})]}),L&&(0,S.jsxs)(`div`,{className:`quick-report-alert error`,children:[(0,S.jsx)(u,{size:16}),L]}),l===`machine`&&(0,S.jsxs)(`div`,{className:`quick-report-content`,children:[(0,S.jsxs)(`label`,{className:`quick-report-field`,children:[(0,S.jsx)(`span`,{children:`Select Machine`}),(0,S.jsxs)(`select`,{value:T,onChange:e=>E(e.target.value),autoFocus:!0,children:[(0,S.jsx)(`option`,{value:``,children:`Choose a machine...`}),X.map(e=>(0,S.jsxs)(`option`,{value:e.machine_id,children:[e.machine_name,` · `,e.location||e.machine_id]},e.machine_id))]})]}),(0,S.jsxs)(`div`,{className:`quick-report-info`,children:[(0,S.jsx)(`p`,{children:`Use the full report flow for QR machine handoff, voice, photo, routing receipt, and offline save.`}),(0,S.jsx)(`a`,{href:Y,children:`Open full report flow`})]}),(0,S.jsxs)(`div`,{className:`quick-report-actions`,children:[(0,S.jsx)(`button`,{type:`button`,className:`quick-report-button secondary`,onClick:n,children:`Cancel`}),(0,S.jsx)(`button`,{type:`button`,className:`quick-report-button primary`,disabled:!T,onClick:()=>b(`issue`),children:`Next`})]}),(0,S.jsx)(`a`,{className:`quick-report-button secondary quick-report-full-link`,href:Y,children:`Open QR/report page`})]}),l===`issue`&&(0,S.jsxs)(`div`,{className:`quick-report-content`,children:[(0,S.jsx)(`div`,{className:`quick-report-context`,children:(0,S.jsxs)(`span`,{className:`quick-report-machine`,children:[(0,S.jsx)(`strong`,{children:`Machine:`}),` `,$?.machine_name]})}),(0,S.jsxs)(`label`,{className:`quick-report-field`,children:[(0,S.jsx)(`span`,{children:`Describe the Issue`}),(0,S.jsx)(`textarea`,{value:D,onChange:e=>O(e.target.value),placeholder:`What's wrong with the machine? (e.g., Oil leak, noise, not starting, smoke)`,rows:4})]}),K.confidence!==`none`&&(0,S.jsxs)(`div`,{className:`quick-report-suggestion tone-${J.tone}`,role:`status`,children:[(0,S.jsx)(a,{size:14,"aria-hidden":`true`}),(0,S.jsxs)(`span`,{children:[`Reads as `,J.label.toLowerCase(),z?` — you set this`:``,K.categoryLabel&&K.category!==`general`?` · likely ${K.categoryLabel.toLowerCase()}`:``]})]}),(0,S.jsxs)(`fieldset`,{className:`quick-report-urgency`,children:[(0,S.jsx)(`legend`,{children:`How urgent?`}),(0,S.jsx)(`div`,{className:`quick-report-urgency-row`,role:`radiogroup`,"aria-label":`Urgency`,children:m.map(e=>{let t=h(e),n=q===e;return(0,S.jsx)(`button`,{type:`button`,role:`radio`,"aria-checked":n,className:`quick-report-urgency-btn tone-${t.tone}${n?` active`:``}`,onClick:()=>B(e),children:t.label},e)})})]}),(0,S.jsxs)(`div`,{className:`quick-report-actions-inline`,children:[(0,S.jsx)(`button`,{type:`button`,className:`quick-report-button voice ${k?`recording`:``}`,onClick:k?Q:Z,children:k?(0,S.jsxs)(S.Fragment,{children:[(0,S.jsx)(d,{size:16}),` Stop recording`]}):(0,S.jsxs)(S.Fragment,{children:[(0,S.jsx)(o,{size:16}),` Record voice`]})}),(0,S.jsxs)(`label`,{className:`quick-report-button photo`,children:[(0,S.jsx)(s,{size:16}),` Add photo`,(0,S.jsx)(`input`,{type:`file`,accept:`image/*`,onChange:ee,style:{display:`none`}})]})]}),j&&(0,S.jsxs)(`div`,{className:`quick-report-photo-preview`,children:[(0,S.jsx)(`img`,{src:j,alt:`Issue photo`}),(0,S.jsxs)(`div`,{style:{display:`flex`,gap:6,marginTop:6},children:[(0,S.jsxs)(`button`,{type:`button`,style:{display:`flex`,alignItems:`center`,gap:4,background:`rgba(56,189,248,0.15)`,color:`#38BDF8`,border:`1px solid rgba(56,189,248,0.3)`},onClick:()=>P(!0),children:[(0,S.jsx)(y,{size:14}),` Markup`]}),(0,S.jsx)(`button`,{type:`button`,onClick:()=>{M(``)},children:`Remove`})]})]}),(0,S.jsx)(C,{open:N,imageSrc:j,onClose:()=>P(!1),onSave:e=>{M(e)}}),(0,S.jsxs)(`div`,{className:`quick-report-actions`,children:[(0,S.jsx)(`button`,{type:`button`,className:`quick-report-button secondary`,onClick:()=>b(`machine`),children:`Back`}),(0,S.jsx)(`button`,{type:`button`,className:`quick-report-button primary`,disabled:!D.trim(),onClick:()=>b(`review`),children:`Review`})]})]}),l===`review`&&(0,S.jsxs)(`div`,{className:`quick-report-content`,children:[(0,S.jsxs)(`div`,{className:`quick-report-review-card`,children:[(0,S.jsx)(`h3`,{children:`Review Ticket`}),(0,S.jsxs)(`dl`,{children:[(0,S.jsx)(`dt`,{children:`Machine:`}),(0,S.jsx)(`dd`,{children:$?.machine_name}),(0,S.jsx)(`dt`,{children:`Location:`}),(0,S.jsx)(`dd`,{children:$?.location||`Not specified`}),(0,S.jsx)(`dt`,{children:`Urgency:`}),(0,S.jsxs)(`dd`,{children:[J.label,K.categoryLabel&&K.category!==`general`?` · ${K.categoryLabel}`:``]}),(0,S.jsx)(`dt`,{children:`Issue:`}),(0,S.jsx)(`dd`,{className:`issue-text`,children:D}),j&&(0,S.jsxs)(S.Fragment,{children:[(0,S.jsx)(`dt`,{children:`Photo attached:`}),(0,S.jsx)(`dd`,{className:`photo-attached`,children:`✓ Yes`})]})]})]}),(0,S.jsxs)(`div`,{className:`quick-report-actions`,children:[(0,S.jsx)(`button`,{type:`button`,className:`quick-report-button secondary`,onClick:()=>b(`issue`),disabled:F,children:`Edit`}),(0,S.jsxs)(`a`,{href:`https://wa.me/?text=${encodeURIComponent(`🔴 *TURBOFIX BREAKDOWN REPORT*\n• *Machine:* ${$?.machine_name||`Equipment`}\n• *Location:* ${$?.location||`Plant Floor`}\n• *Urgency:* ${J.label}\n• *Issue:* ${D}`)}`,target:`_blank`,rel:`noopener noreferrer`,className:`quick-report-button secondary`,style:{background:`rgba(34,197,94,0.15)`,color:`#4ADE80`,border:`1px solid rgba(34,197,94,0.3)`,textDecoration:`none`,display:`inline-flex`,alignItems:`center`,gap:6,justifyContent:`center`},children:[(0,S.jsx)(g,{size:15}),` WhatsApp`]}),(0,S.jsx)(`button`,{type:`button`,className:`quick-report-button primary`,onClick:te,disabled:F,children:F?`Creating ticket…`:`Submit Report`})]})]}),l===`submitting`&&(0,S.jsxs)(`div`,{className:`quick-report-content quick-report-success`,children:[(0,S.jsx)(t,{size:48}),(0,S.jsx)(`h3`,{children:`Work order created`}),(0,S.jsx)(`p`,{children:V?.wo_number||V?.id?`Reference: ${V.wo_number||String(V.id).slice(0,8)}`:`The report is in the maintenance queue.`}),(0,S.jsx)(`p`,{className:`small`,children:`Closing in a moment...`})]})]}),(0,S.jsx)(`style`,{children:`
        .quick-report-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: flex-end;
          z-index: 9999;
        }

        .quick-report-backdrop {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          cursor: pointer;
          border: none;
          padding: 0;
        }

        .quick-report-dialog {
          position: relative;
          background: var(--bg-primary);
          border-radius: 12px 12px 0 0;
          max-height: 90vh;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
        }

        .quick-report-header {
          padding: 20px;
          border-bottom: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
        }

        .quick-report-header h2 {
          margin: 8px 0 4px;
          font-size: 20px;
        }

        .quick-report-header p {
          margin: 0;
          font-size: 14px;
          color: var(--slate);
        }

        .quick-report-kicker {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 600;
          color: var(--brand);
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .quick-report-close {
          background: transparent;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: var(--slate);
          transition: all 200ms ease;
        }

        .quick-report-close:hover {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }

        .quick-report-content {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .quick-report-alert {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          border-radius: 8px;
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          font-size: 14px;
        }

        .quick-report-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .quick-report-field span {
          font-weight: 600;
          font-size: 14px;
        }

        .quick-report-field select,
        .quick-report-field textarea {
          padding: 10px 12px;
          border: 1px solid var(--border-color);
          border-radius: 6px;
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-family: inherit;
          font-size: 14px;
          resize: none;
        }

        .quick-report-field select:focus,
        .quick-report-field textarea:focus {
          outline: none;
          border-color: var(--brand);
          box-shadow: 0 0 0 3px rgba(34, 163, 90, 0.1);
        }

        .quick-report-info {
          padding: 12px 16px;
          background: rgba(59, 130, 246, 0.1);
          border-left: 3px solid #3b82f6;
          border-radius: 4px;
          font-size: 14px;
        }

        .quick-report-info p {
          margin: 0;
        }

        .quick-report-info a,
        .quick-report-full-link {
          margin-top: 10px;
          color: var(--brand);
          font-weight: 700;
        }

        .quick-report-suggestion {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid;
          font-size: 13px;
        }

        .quick-report-suggestion.tone-danger {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .quick-report-suggestion.tone-warning {
          background: rgba(245, 158, 11, 0.1);
          border-color: rgba(245, 158, 11, 0.3);
          color: #d97706;
        }

        .quick-report-suggestion.tone-ok {
          background: rgba(34, 163, 90, 0.1);
          border-color: rgba(34, 163, 90, 0.3);
          color: var(--brand);
        }

        .quick-report-urgency {
          border: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .quick-report-urgency legend {
          font-weight: 600;
          font-size: 14px;
          padding: 0;
        }

        .quick-report-urgency-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .quick-report-urgency-btn {
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: var(--bg-secondary);
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .quick-report-urgency-btn.active.tone-danger {
          background: rgba(239, 68, 68, 0.15);
          border-color: #ef4444;
          color: #ef4444;
        }

        .quick-report-urgency-btn.active.tone-warning {
          background: rgba(245, 158, 11, 0.15);
          border-color: #d97706;
          color: #d97706;
        }

        .quick-report-urgency-btn.active.tone-ok {
          background: rgba(34, 163, 90, 0.15);
          border-color: var(--brand);
          color: var(--brand);
        }

        .quick-report-context {
          padding: 12px 16px;
          background: var(--bg-secondary);
          border-radius: 6px;
          font-size: 14px;
        }

        .quick-report-machine {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .quick-report-actions-inline {
          display: flex;
          gap: 12px;
        }

        .quick-report-button {
          padding: 10px 16px;
          border-radius: 6px;
          border: none;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 200ms ease;
        }

        .quick-report-button.primary {
          background: var(--brand);
          color: white;
        }

        .quick-report-button.primary:hover:not(:disabled) {
          background: #1e7e34;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(34, 163, 90, 0.3);
        }

        .quick-report-button.primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .quick-report-button.secondary {
          background: var(--bg-secondary);
          color: var(--slate);
          border: 1px solid var(--border-color);
        }

        .quick-report-button.secondary:hover:not(:disabled) {
          background: var(--bg-tertiary);
        }

        .quick-report-button.voice {
          flex: 1;
          background: var(--bg-secondary);
          border: 1px solid #8b5cf6;
          color: #8b5cf6;
        }

        .quick-report-button.voice.recording {
          background: #8b5cf6;
          color: white;
          animation: pulse 1s infinite;
        }

        .quick-report-button.photo {
          flex: 1;
          background: var(--bg-secondary);
          border: 1px solid #06b6d4;
          color: #06b6d4;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .quick-report-photo-preview {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
        }

        .quick-report-photo-preview img {
          width: 100%;
          max-height: 200px;
          object-fit: cover;
          display: block;
        }

        .quick-report-photo-preview button {
          position: absolute;
          top: 8px;
          right: 8px;
          background: rgba(0, 0, 0, 0.7);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
          font-weight: 600;
        }

        .quick-report-review-card {
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: 8px;
        }

        .quick-report-review-card h3 {
          margin: 0 0 16px;
          font-size: 16px;
        }

        .quick-report-review-card dl {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: 12px 16px;
          margin: 0;
        }

        .quick-report-review-card dt {
          font-weight: 600;
          font-size: 13px;
          color: var(--slate);
        }

        .quick-report-review-card dd {
          margin: 0;
          font-size: 14px;
        }

        .quick-report-review-card .issue-text {
          white-space: pre-wrap;
          word-break: break-word;
        }

        .quick-report-review-card .photo-attached {
          color: var(--brand);
          font-weight: 600;
        }

        .quick-report-actions {
          display: flex;
          gap: 12px;
          margin-top: auto;
        }

        .quick-report-actions button {
          flex: 1;
        }

        .quick-report-success {
          text-align: center;
          min-height: 200px;
          justify-content: center;
          align-items: center;
        }

        .quick-report-success svg {
          color: var(--brand);
          margin-bottom: 16px;
        }

        .quick-report-success h3 {
          margin: 0 0 8px;
          font-size: 18px;
        }

        .quick-report-success p {
          margin: 0;
          color: var(--slate);
          font-size: 14px;
        }

        .quick-report-success p.small {
          font-size: 12px;
          margin-top: 8px;
        }

        @media (max-width: 600px) {
          .quick-report-dialog {
            border-radius: 16px 16px 0 0;
          }

          .quick-report-header {
            padding: 16px;
          }

          .quick-report-content {
            padding: 16px;
          }
        }
      `})]})}export{T as t};