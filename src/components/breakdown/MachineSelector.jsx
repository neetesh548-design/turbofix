/**
 * MachineSelector — step 1, "which machine?"
 *
 * Two ways in, because the shop floor has two situations. Standing at
 * the machine: scan the sticker, done, no typing. Not at the machine
 * (a supervisor walking the floor, a vendor on the phone): type three
 * letters and pick from the list.
 *
 * The scanner is progressive enhancement and says so. `BarcodeDetector`
 * exists in Chrome and Android WebView and nowhere else worth relying
 * on, and camera permission is denied often enough on shared shop
 * phones that a scan-only flow would strand people. So: the button
 * only appears when the API is actually there, any failure drops
 * straight back to search with an explanation, and a manual "type the
 * code from the sticker" box is always one tap away.
 *
 * Props:
 * - machines (array)   the machines this reporter may report on
 * - value (object)     currently selected machine, or null
 * - onSelect (fn)      called with the machine object (or null to clear)
 * - autoFocus (bool)   focus the search box on mount
 * - disabled (bool)
 * - emptyHint (string) copy for "no machines match", role-specific
 */

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Camera, Check, MapPin, Search, ShieldAlert, User, X } from 'lucide-react';
import {
  assignedTechnician,
  machineFromQr,
  machineIdOf,
  machineNameOf,
  searchMachines,
} from '../../utils/breakdownRouter.js';

/** Feature-detect once per render tree, not once per keystroke. */
function scannerAvailable() {
  return typeof window !== 'undefined'
    && typeof window.BarcodeDetector !== 'undefined'
    && Boolean(navigator?.mediaDevices?.getUserMedia);
}

export default function MachineSelector({
  machines = [],
  value = null,
  onSelect,
  autoFocus = false,
  disabled = false,
  emptyHint = 'No machine matches that. Try the asset code on the sticker.',
}) {
  const [query, setQuery] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [manualOpen, setManualOpen] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const loopRef = useRef(null);
  const listId = useId();

  const canScan = useMemo(scannerAvailable, []);
  const results = useMemo(() => searchMachines(machines, query), [machines, query]);

  const stopScan = useCallback(() => {
    if (loopRef.current) {
      clearInterval(loopRef.current);
      loopRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setScanning(false);
  }, []);

  // A live camera left running behind a route change is the fastest way
  // to drain a shop phone. Tear it down on unmount, always.
  useEffect(() => stopScan, [stopScan]);

  const acceptCode = useCallback((payload) => {
    const match = machineFromQr(machines, payload);
    if (!match) {
      setScanError('That code is not a machine in your workspace. Search by name instead.');
      return false;
    }
    onSelect?.(match);
    setScanError('');
    setManualOpen(false);
    setManualCode('');
    return true;
  }, [machines, onSelect]);

  const startScan = useCallback(async () => {
    setScanError('');
    if (!canScan) {
      setManualOpen(true);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setScanning(true);

      // The <video> only exists once `scanning` renders it.
      requestAnimationFrame(async () => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        loopRef.current = setInterval(async () => {
          if (!videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            const payload = codes?.[0]?.rawValue;
            if (payload && acceptCode(payload)) stopScan();
          } catch {
            // A single failed frame is normal (video not ready yet).
          }
        }, 350);
      });
    } catch {
      stopScan();
      setScanError('Camera not available. Search for the machine, or type the code from the sticker.');
      setManualOpen(true);
    }
  }, [acceptCode, canScan, stopScan]);

  if (value) {
    const technician = assignedTechnician(value);
    return (
      <div className="brk-machine-chosen" data-testid="breakdown-machine-chosen">
        <div className="brk-machine-chosen-main">
          <span className="brk-machine-tick" aria-hidden="true"><Check size={14} /></span>
          <div className="brk-machine-chosen-text">
            <strong>{machineNameOf(value)}</strong>
            <small>
              {machineIdOf(value)}
              {value.location ? <> · <MapPin size={11} aria-hidden="true" /> {value.location}</> : null}
            </small>
          </div>
          <button
            type="button"
            className="brk-btn brk-btn-ghost brk-btn-sm"
            onClick={() => { onSelect?.(null); setQuery(''); }}
            disabled={disabled}
            data-testid="breakdown-machine-change"
          >
            Change
          </button>
        </div>
        <p className="brk-machine-meta">
          {technician
            ? <><User size={12} aria-hidden="true" /> Goes to {technician.name}</>
            : <><ShieldAlert size={12} aria-hidden="true" /> Nobody assigned — your supervisor picks it up</>}
        </p>
      </div>
    );
  }

  return (
    <div className="brk-machine-picker">
      <div className="brk-search-row">
        <div className="brk-search">
          <Search size={15} aria-hidden="true" />
          <input
            id={`${listId}-search`}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Machine name, asset code or bay"
            autoFocus={autoFocus}
            disabled={disabled}
            autoComplete="off"
            aria-label="Search machines"
            data-testid="breakdown-machine-search"
          />
        </div>
        <button
          type="button"
          className="brk-btn brk-btn-scan"
          onClick={startScan}
          disabled={disabled}
          data-testid="breakdown-scan"
        >
          <Camera size={15} aria-hidden="true" />
          <span>Scan QR</span>
        </button>
      </div>

      {scanning && (
        <div className="brk-scanner" data-testid="breakdown-scanner">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video ref={videoRef} muted playsInline aria-label="QR scanner viewfinder" />
          <div className="brk-scanner-frame" aria-hidden="true" />
          <button type="button" className="brk-scanner-close" onClick={stopScan} aria-label="Stop scanning">
            <X size={16} />
          </button>
          <p>Point at the QR sticker on the machine</p>
        </div>
      )}

      {scanError && <p className="brk-inline-error" role="alert">{scanError}</p>}

      <ul className="brk-machine-list" data-testid="breakdown-machine-list">
        {results.map((machine) => {
          const technician = assignedTechnician(machine);
          return (
            <li key={machineIdOf(machine)}>
              <button
                type="button"
                className="brk-machine-option"
                onClick={() => onSelect?.(machine)}
                disabled={disabled}
              >
                <span className="brk-machine-option-text">
                  <strong>{machineNameOf(machine)}</strong>
                  <small>
                    {machine.location || machineIdOf(machine)}
                    {technician ? ` · ${technician.name}` : ' · unassigned'}
                  </small>
                </span>
                {machine.criticality === 'critical' && <span className="brk-tag danger">Critical asset</span>}
              </button>
            </li>
          );
        })}
        {!results.length && <li className="brk-machine-empty">{emptyHint}</li>}
      </ul>

      {manualOpen ? (
        <div className="brk-manual">
          <label htmlFor={`${listId}-manual`}>Type the code printed under the QR</label>
          <div className="brk-manual-row">
            <input
              id={`${listId}-manual`}
              value={manualCode}
              onChange={(event) => setManualCode(event.target.value)}
              placeholder="e.g. CNC-04"
              autoComplete="off"
            />
            <button
              type="button"
              className="brk-btn brk-btn-sm"
              onClick={() => acceptCode(manualCode)}
              disabled={!manualCode.trim()}
            >
              Find
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="brk-link-btn" onClick={() => setManualOpen(true)}>
          Can’t scan? Type the code from the sticker
        </button>
      )}
    </div>
  );
}
