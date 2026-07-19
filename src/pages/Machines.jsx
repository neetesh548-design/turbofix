import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Activity, BookOpen, Bot, CalendarDays, ChevronRight, CircleAlert,
  ClipboardList, Droplets, FileCheck2, MapPin, PackageSearch, Phone, QrCode,
  ShieldCheck, Upload, Users, LayoutGrid, List, Pencil, Mail,
} from 'lucide-react';
import AppShell from '../components/AppShell';
import ContactReveal from '../components/ContactReveal';
import { supabase } from '@/supabaseClient';

const WORKSPACE_TABS = [
  { id: 'info', label: 'Overview', hint: 'Status and response', Icon: Activity },
  { id: 'docs', label: 'Documents', hint: 'Manuals and diagrams', Icon: BookOpen },
  { id: 'parts', label: 'Spare parts', hint: 'BOM and stock', Icon: PackageSearch },
  { id: 'consumables', label: 'Consumables', hint: 'Usage and stock', Icon: Droplets },
  { id: 'pm', label: 'Preventive', hint: 'PM schedule and compliance', Icon: ShieldCheck },
  { id: 'reliability', label: 'Reliability', hint: 'Repeat failures, RCA and CAPA', Icon: Activity },
  { id: 'calendar', label: 'Calendar', hint: 'Order and replace', Icon: CalendarDays },
  { id: 'qr', label: 'QR tag', hint: 'Report from machine', Icon: QrCode },
];

export default function Machines() {
  const [machines, setMachines] = useState([]);
  const [team, setTeam] = useState([]);
  const [escalationPath, setEscalationPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [machineEdit, setMachineEdit] = useState(null);
  const [machineEditSaving, setMachineEditSaving] = useState(false);
  const [machinePhoto, setMachinePhoto] = useState('');
  const [photoSaving, setPhotoSaving] = useState(false);
  const [onboardPhotoFile, setOnboardPhotoFile] = useState(null);
  const [directoryView, setDirectoryView] = useState(() => window.localStorage.getItem('tf_machines_directory_view') || 'list');

  // Report-issue (manual breakdown ticket) modal
  const [reportIssueOpen, setReportIssueOpen] = useState(false);
  const [issueText, setIssueText] = useState('');
  const [issueUrgency, setIssueUrgency] = useState('medium');
  const [issueSaving, setIssueSaving] = useState(false);
  const [reportIssueError, setReportIssueError] = useState('');
  
  // Workspace active tab: 'info' | 'docs' | 'parts' | 'consumables' | 'calendar' | 'qr'
  const [wsTab, setWsTab] = useState('info');

  // Onboarding Form states
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [hourlyDowntimeCost, setHourlyDowntimeCost] = useState('');
  const [maintenanceIntervalDays, setMaintenanceIntervalDays] = useState('90');
  const [lastMaintenanceDate, setLastMaintenanceDate] = useState('');
  const [technicianUserId, setTechnicianUserId] = useState('');
  const [supervisorUserId, setSupervisorUserId] = useState('');
  const [engineerUserId, setEngineerUserId] = useState('');
  const [headUserId, setHeadUserId] = useState('');

  // Machine digital profile (roadmap §3.1) — identity, asset & vendor details
  const [assetCode, setAssetCode] = useState('');
  const [category, setCategory] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [model, setModel] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [installationDate, setInstallationDate] = useState('');
  const [department, setDepartment] = useState('');
  const [productionLine, setProductionLine] = useState('');
  const [criticality, setCriticality] = useState('medium');
  const [warrantyExpiry, setWarrantyExpiry] = useState('');
  const [warrantyNotes, setWarrantyNotes] = useState('');
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [amcProvider, setAmcProvider] = useState('');
  const [amcExpiry, setAmcExpiry] = useState('');
  const [operatingHours, setOperatingHours] = useState('');

  // Sub-tabs State for Selected Machine
  const [docs, setDocs] = useState([]);
  const [parts, setParts] = useState([]);
  const [consumables, setConsumables] = useState([]);
  const [pmSchedules, setPmSchedules] = useState([]);
  const [pmLogs, setPmLogs] = useState([]);
  const [pmLoading, setPmLoading] = useState(false);
  const [pmSaving, setPmSaving] = useState(false);
  const [showPmForm, setShowPmForm] = useState(false);
  const [pmTitle, setPmTitle] = useState('');
  const [pmTrigger, setPmTrigger] = useState('calendar');
  const [pmFrequency, setPmFrequency] = useState('30');
  const [pmInterval, setPmInterval] = useState('');
  const [pmChecklist, setPmChecklist] = useState('');
  const [pmTools, setPmTools] = useState('');
  const [pmSpares, setPmSpares] = useState('');
  const [pmEstMin, setPmEstMin] = useState('');
  const [pmTech, setPmTech] = useState('');
  // Reliability improvement loop (RCA / CAPA / repeat failures) — roadmap P2
  const [rcaReports, setRcaReports] = useState([]);
  const [capaActions, setCapaActions] = useState([]);
  const [repeatTickets, setRepeatTickets] = useState([]);
  const [machineBreakdowns, setMachineBreakdowns] = useState([]);
  const [relLoading, setRelLoading] = useState(false);
  const [relSaving, setRelSaving] = useState(false);
  const [showRcaForm, setShowRcaForm] = useState(false);
  const [rcaTicketId, setRcaTicketId] = useState('');
  const [rcaFailureMode, setRcaFailureMode] = useState('');
  const [rcaWhys, setRcaWhys] = useState(['', '', '', '', '']);
  const [rcaRoot, setRcaRoot] = useState('');
  const [rcaFishbone, setRcaFishbone] = useState('Machine');
  const [capaForRca, setCapaForRca] = useState(null);
  const [capaType, setCapaType] = useState('preventive');
  const [capaDesc, setCapaDesc] = useState('');
  const [capaOwner, setCapaOwner] = useState('');
  const [capaDue, setCapaDue] = useState('');
  const [docsLoading, setDocsLoading] = useState(false);
  const [partsLoading, setPartsLoading] = useState(false);
  const [consumablesLoading, setConsumablesLoading] = useState(false);
  const [machineData, setMachineData] = useState(null);
  const [machineDataLoading, setMachineDataLoading] = useState(false);
  const [enrichingMachineData, setEnrichingMachineData] = useState(false);

  // Sub-tab Form inputs
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadCategory, setUploadCategory] = useState('manual');
  const [newPartName, setNewPartName] = useState('');
  const [newPartNum, setNewPartNum] = useState('');
  const [newPartQty, setNewPartQty] = useState('');
  const [newPartReorder, setNewPartReorder] = useState('');

  const [newConsName, setNewConsName] = useState('');
  const [newConsQty, setNewConsQty] = useState('');
  const [newConsUnit, setNewConsUnit] = useState('L');
  const [newConsBurn, setNewConsBurn] = useState('5');
  const [newConsLead, setNewConsLead] = useState('7');
  const [newConsBuffer, setNewConsBuffer] = useState('3');
  const [newConsFreq, setNewConsFreq] = useState('30');
  const [newConsLastRep, setNewConsLastRep] = useState(new Date().toISOString().split('T')[0]);

  // Calendar Year/Month
  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());

  let signedInUser = null;
  try { signedInUser = JSON.parse(window.localStorage.getItem('tf_user') || 'null'); } catch {}
  const isOwner = signedInUser?.role === 'owner';


  useEffect(() => {
    document.title = 'Machines | TurboFix';
    fetchData();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setReportIssueOpen(false);
        setShowAddForm(false);
        setShowRcaForm(false);
        setShowPmForm(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    window.localStorage.setItem('tf_machines_directory_view', directoryView);
  }, [directoryView]);

  useEffect(() => {
    if (selectedMachine) {
      loadMachineAssets(selectedMachine.machine_id);
    }
  }, [selectedMachine]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [machinesRes, ticketsRes, directoryRes] = await Promise.all([
        supabase.from('machines').select('*'),
        supabase.from('tickets').select('id,machine_id,status,issue_text,created_at'),
        supabase.functions.invoke('onboard_team_member', { body: { action: 'list' } }),
      ]);

      if (machinesRes.error) throw new Error(`Machines could not be loaded: ${machinesRes.error.message}`);
      if (ticketsRes.error) throw new Error(`Machine status could not be loaded: ${ticketsRes.error.message}`);
      if (directoryRes.error || directoryRes.data?.error) throw new Error(`Response team could not be loaded: ${directoryRes.data?.error || directoryRes.error?.message}`);

      const directoryMembers = directoryRes.data?.members || [];
      const machineAssignments = directoryRes.data?.machine_assignments || {};

      const trackRecordByMachine = {};
      const recentCutoff = Date.now() - (30 * 24 * 60 * 60 * 1000);
      (ticketsRes.data || []).forEach(t => {
        const record = trackRecordByMachine[t.machine_id] || { total: 0, open: 0, resolved: 0, recent: 0, last_issue: '', last_issue_at: '' };
        const status = String(t.status || '').toLowerCase();
        const createdAt = t.created_at ? new Date(t.created_at).getTime() : 0;
        record.total += 1;
        if (status === 'open') record.open += 1;
        if (['closed', 'resolved'].includes(status)) record.resolved += 1;
        if (createdAt >= recentCutoff) record.recent += 1;
        if (createdAt >= (record.last_issue_at ? new Date(record.last_issue_at).getTime() : 0)) {
          record.last_issue = t.issue_text || 'Maintenance issue';
          record.last_issue_at = t.created_at || '';
        }
        trackRecordByMachine[t.machine_id] = record;
      });

      const teamById = Object.fromEntries(directoryMembers.map((member) => [member.user_id, {
        user_id: member.user_id,
        name: member.name,
        role: member.role,
        email_masked: member.email_masked,
        phone_masked: member.phone_masked,
        has_email: member.has_email,
        has_phone: member.has_phone,
        can_reveal_contact: member.can_reveal_contact !== false,
      }]));
      const mData = (machinesRes.data || []).map(m => {
        const resolvedAssignments = machineAssignments[m.id] || {};
        const technicianUserId = m.technician_user_id || resolvedAssignments.technician_user_id || null;
        const supervisorId = m.supervisor_id || resolvedAssignments.supervisor_id || null;
        const engineerUserId = m.engineer_user_id || resolvedAssignments.engineer_user_id || null;
        const maintenanceHeadUserId = m.maintenance_head_user_id || resolvedAssignments.maintenance_head_user_id || null;
        return ({
        machine_id: m.id,
        machine_name: m.name,
        location: m.location,
        status: m.status,
        has_open_tickets: (trackRecordByMachine[m.id]?.open || 0) > 0,
        track_record: trackRecordByMachine[m.id] || { total: 0, open: 0, resolved: 0, recent: 0, last_issue: '', last_issue_at: '' },
        assigned_technician_phone: m.assigned_technician_phone,
        supervisor_id: supervisorId,
        factory_id: m.factory_id,
        hourly_downtime_cost: m.hourly_downtime_cost,
        maintenance_interval_days: m.maintenance_interval_days,
        last_maintenance_date: m.last_maintenance_date,
        next_maintenance_due: m.next_maintenance_due,
        image_url: m.image_url,
        asset_code: m.asset_code,
        category: m.category,
        manufacturer: m.manufacturer,
        model: m.model,
        serial_number: m.serial_number,
        installation_date: m.installation_date,
        department: m.department,
        production_line: m.production_line,
        criticality: m.criticality,
        warranty_expiry: m.warranty_expiry,
        warranty_notes: m.warranty_notes,
        vendor_name: m.vendor_name,
        vendor_contact: m.vendor_contact,
        amc_provider: m.amc_provider,
        amc_expiry: m.amc_expiry,
        operating_hours: m.operating_hours,
        technician_user_id: technicianUserId,
        engineer_user_id: engineerUserId,
        maintenance_head_user_id: maintenanceHeadUserId,
        assignments: {
          technician: teamById[technicianUserId] || null,
          supervisor: teamById[supervisorId] || null,
          engineer: teamById[engineerUserId] || null,
          maintenance_head: teamById[maintenanceHeadUserId] || null,
        },
        wa_link: null,
      });
      });
      // Technicians only see the machines assigned to them; owners, supervisors,
      // engineers and maintenance heads see the full plant directory.
      const isTechnician = ['maintenance_technician', 'technician'].includes(signedInUser?.role);
      const visibleMachines = isTechnician
        ? mData.filter((m) => String(m.technician_user_id || '') === String(signedInUser?.user_id || ''))
        : mData;
      setMachines(visibleMachines);
      const queryParams = new URLSearchParams(window.location.search);
      const queryMachineId = queryParams.get('machine') || queryParams.get('machine_id');
      if (queryMachineId) {
        const found = visibleMachines.find(m => String(m.machine_id) === String(queryMachineId));
        if (found) {
          setSelectedMachine(found);
          setWsTab('info');
        }
      }
      window.setTimeout(() => syncLocalMachinePhotos(visibleMachines), 0);

      const teamData = directoryMembers.map(u => ({
        user_id: u.user_id,
        name: u.name,
        role: u.role,
        email_masked: u.email_masked,
        phone_masked: u.phone_masked,
        has_email: u.has_email,
        has_phone: u.has_phone,
        can_reveal_contact: u.can_reveal_contact !== false,
        can_receive_alerts: u.can_receive_alerts,
      }));
      setTeam(teamData);
      const localEscalation = window.localStorage.getItem('tf_settings_escalation_path');
      setEscalationPath(localEscalation ? JSON.parse(localEscalation) : [
        { role: 'maintenance_technician', label: 'Maintenance Technician', threshold_hours: 2 }
      ]);
    } catch (err) {
      setError(err.message || 'An error occurred while loading data.');
    } finally {
      setLoading(false);
    }
  };

  const reportIssue = async () => {
    if (!selectedMachine || !issueText.trim()) return;
    setIssueSaving(true);
    setReportIssueError('');
    try {
      let factoryId = selectedMachine.factory_id;
      if (!factoryId) {
        const { data: factoryRows } = await supabase.from('factories').select('id').limit(1);
        factoryId = factoryRows?.[0]?.id || null;
      }
      const payload = {
        machine_id: selectedMachine.machine_id,
        status: 'open',
        issue_text: issueText.trim(),
        urgency: issueUrgency,
        type: 'breakdown',
        reporter_phone: signedInUser?.phone || null,
      };
      if (factoryId) payload.factory_id = factoryId;
      const { error: insertErr } = await supabase.from('tickets').insert(payload);
      if (insertErr) throw insertErr;
      setReportIssueOpen(false);
      setIssueText('');
      const technicianName = selectedMachine.assignments?.technician?.name;
      setSuccess(technicianName
        ? `Issue reported. ${technicianName} will see it in their work queue.`
        : 'Issue reported. The assigned technician will see it in their work queue.');
      await fetchData();
    } catch (err) {
      setReportIssueError(err.message || 'Could not report the issue.');
    } finally {
      setIssueSaving(false);
    }
  };

  const loadMachineAssets = async (machineId) => {
    const localPhoto = window.localStorage.getItem(`tf_machine_photo_${machineId}`);
    setMachinePhoto(selectedMachine?.image_url || localPhoto || '');

    setMachineDataLoading(true);
    setMachineData(null);
    setMachineDataLoading(false);

    setDocsLoading(true);
    try {
      const { data } = await supabase.from('documents').select('id,title,category,file_url,created_at').eq('machine_id', machineId);
      setDocs((data || []).map(d => ({ document_id: d.id, doc_id: d.id, file_name: d.title, filename: d.title, category: d.category, uploaded_at: d.created_at })));
    } catch {}
    setDocsLoading(false);

    setPartsLoading(true);
    try {
      const { data } = await supabase.from('parts').select('id,part_name,part_number,stock_qty,unit,reorder_level,lead_time_days,machine_id').eq('machine_id', machineId);
      setParts((data || []).map(p => ({ part_id: p.id, part_name: p.part_name, part_number: p.part_number, quantity_on_hand: p.stock_qty, unit: p.unit || 'pcs', reorder_level: p.reorder_level || 0, lead_time_days: p.lead_time_days })));
    } catch {}
    setPartsLoading(false);

    setConsumablesLoading(true);
    try {
      const { data } = await supabase.from('consumables').select('id,name,stock_qty,unit,reorder_level,lead_time_days,buffer_days,frequency_days,last_replaced_at,machine_id').eq('machine_id', machineId);
      setConsumables((data || []).map(c => ({
        consumable_id: c.id, name: c.name, quantity_on_hand: c.stock_qty, unit: c.unit || 'L', reorder_level: c.reorder_level || 0,
        notes: JSON.stringify({ burn_rate: 1, lead_days: c.lead_time_days || 7, buffer_days: c.buffer_days || 3, replacement_schedule_days: c.frequency_days || 30, last_replaced: c.last_replaced_at ? c.last_replaced_at.split('T')[0] : new Date().toISOString().split('T')[0] }),
      })));
    } catch {}
    setConsumablesLoading(false);

    setPmLoading(true);
    try {
      const [schedulesRes, logsRes] = await Promise.all([
        supabase.from('pm_schedules').select('*').eq('machine_id', machineId).order('next_due_at', { ascending: true }),
        supabase.from('pm_logs').select('*').eq('machine_id', machineId).order('completed_at', { ascending: false }),
      ]);
      setPmSchedules(schedulesRes.data || []);
      setPmLogs(logsRes.data || []);
    } catch {
      setPmSchedules([]);
      setPmLogs([]);
    }
    setPmLoading(false);

    setRelLoading(true);
    try {
      const [rcaRes, capaRes, ticketsRes] = await Promise.all([
        supabase.from('rca_reports').select('*').eq('machine_id', machineId).order('created_at', { ascending: false }),
        supabase.from('capa_actions').select('*').eq('machine_id', machineId).order('created_at', { ascending: false }),
        supabase.from('tickets').select('id,issue_text,created_at,repeat_failure_count,repeat_failure_flag,type').eq('machine_id', machineId).order('created_at', { ascending: false }),
      ]);
      setRcaReports(rcaRes.data || []);
      setCapaActions(capaRes.data || []);
      const allT = ticketsRes.data || [];
      const breakdowns = allT.filter((t) => (t.type || 'breakdown') === 'breakdown');
      setMachineBreakdowns(breakdowns);
      setRepeatTickets(breakdowns.filter((t) => t.repeat_failure_flag));
    } catch {
      setRcaReports([]);
      setCapaActions([]);
      setRepeatTickets([]);
      setMachineBreakdowns([]);
    }
    setRelLoading(false);
  };

  const uploadMachinePhoto = async (file, machineIdInput = null) => {
    const targetMachineId = machineIdInput || selectedMachine?.machine_id;
    if (!file || !targetMachineId) return null;
    setPhotoSaving(true);
    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const { data: uploadPlan, error: planError } = await supabase.functions.invoke('onboard_team_member', {
        body: { action: 'create_machine_photo_upload', machine_id: targetMachineId, extension: fileExt },
      });
      if (planError || uploadPlan?.error || !uploadPlan?.token) throw new Error(uploadPlan?.error || planError?.message || 'Photo upload could not be prepared.');
      const { error: uploadErr } = await supabase.storage.from('machine-documents')
        .uploadToSignedUrl(uploadPlan.path, uploadPlan.token, file, { contentType: file.type || 'image/jpeg' });
      if (uploadErr) throw uploadErr;
      const { data: committed, error: commitError } = await supabase.functions.invoke('onboard_team_member', {
        body: { action: 'commit_machine_photo', machine_id: targetMachineId, path: uploadPlan.path },
      });
      if (commitError || committed?.error || !committed?.image_url) throw new Error(committed?.error || commitError?.message || 'Photo could not be linked to the machine.');
      const publicUrl = committed.image_url;
        
      window.localStorage.setItem(`tf_machine_photo_${targetMachineId}`, publicUrl);
      if (!machineIdInput) {
        setMachinePhoto(publicUrl);
        setSelectedMachine(prev => ({ ...prev, image_url: publicUrl }));
      }
      setMachines((current) => current.map((machine) => machine.machine_id === targetMachineId ? { ...machine, image_url: publicUrl } : machine));
      setSuccess('Machine picture updated successfully.');
      return publicUrl;
    } catch (err) {
      // Local fallback
      return new Promise((resolve) => {
        const fileReader = new FileReader();
        fileReader.onload = () => {
          const base64Url = fileReader.result;
          window.localStorage.setItem(`tf_machine_photo_${targetMachineId}`, base64Url);
          if (!machineIdInput) {
            setMachinePhoto(base64Url);
            setSelectedMachine(prev => ({ ...prev, image_url: base64Url }));
          }
          setSuccess('Machine picture updated locally.');
          resolve(base64Url);
        };
        fileReader.readAsDataURL(file);
      });
    } finally {
      setPhotoSaving(false);
    }
  };

  const syncLocalMachinePhotos = async (machineRows) => {
    for (const machine of machineRows) {
      if (machine.image_url) continue;
      const localPhoto = window.localStorage.getItem(`tf_machine_photo_${machine.machine_id}`);
      if (!localPhoto) continue;
      try {
        if (localPhoto.startsWith('http')) {
          const { data, error: adoptError } = await supabase.functions.invoke('onboard_team_member', {
            body: { action: 'adopt_legacy_machine_photo', machine_id: machine.machine_id, image_url: localPhoto },
          });
          if (adoptError || data?.error) throw new Error(data?.error || adoptError?.message);
          setMachines((current) => current.map((item) => item.machine_id === machine.machine_id ? { ...item, image_url: data.image_url } : item));
        } else if (localPhoto.startsWith('data:image/')) {
          const response = await fetch(localPhoto);
          const blob = await response.blob();
          const extension = blob.type.split('/')[1] || 'jpg';
          await uploadMachinePhoto(new File([blob], `legacy-machine-photo.${extension}`, { type: blob.type }), machine.machine_id);
        }
      } catch (syncError) {
        console.warn('Machine photo remains available only in this browser:', syncError);
      }
    }
  };

  const openMachineEdit = () => {
    setError('');
    setMachineEdit({
      name: selectedMachine.machine_name || '',
      location: selectedMachine.location || '',
      status: selectedMachine.status || 'healthy',
      hourly_downtime_cost: selectedMachine.hourly_downtime_cost ?? '',
      maintenance_interval_days: selectedMachine.maintenance_interval_days || 90,
      last_maintenance_date: selectedMachine.last_maintenance_date?.slice(0, 10) || '',
      asset_code: selectedMachine.asset_code || '',
      category: selectedMachine.category || '',
      manufacturer: selectedMachine.manufacturer || '',
      model: selectedMachine.model || '',
      serial_number: selectedMachine.serial_number || '',
      installation_date: selectedMachine.installation_date?.slice(0, 10) || '',
      department: selectedMachine.department || '',
      production_line: selectedMachine.production_line || '',
      criticality: selectedMachine.criticality || 'medium',
      warranty_expiry: selectedMachine.warranty_expiry?.slice(0, 10) || '',
      warranty_notes: selectedMachine.warranty_notes || '',
      vendor_name: selectedMachine.vendor_name || '',
      vendor_contact: selectedMachine.vendor_contact || '',
      amc_provider: selectedMachine.amc_provider || '',
      amc_expiry: selectedMachine.amc_expiry?.slice(0, 10) || '',
      operating_hours: selectedMachine.operating_hours ?? '',
      technician_user_id: selectedMachine.technician_user_id || '',
      supervisor_id: selectedMachine.supervisor_id || '',
      engineer_user_id: selectedMachine.engineer_user_id || '',
      maintenance_head_user_id: selectedMachine.maintenance_head_user_id || '',
    });
  };

  const saveMachineEdit = async (event) => {
    event.preventDefault();
    setMachineEditSaving(true);
    setError('');
    try {
      const { data, error: updateError } = await supabase.functions.invoke('onboard_team_member', {
        body: { action: 'update_machine', machine_id: selectedMachine.machine_id, ...machineEdit },
      });
      if (updateError || data?.error || !data?.machine) throw new Error(data?.error || updateError?.message || 'Machine details could not be updated.');
      const updated = {
        ...selectedMachine,
        machine_name: data.machine.name,
        location: data.machine.location,
        status: data.machine.status,
        hourly_downtime_cost: data.machine.hourly_downtime_cost,
        maintenance_interval_days: data.machine.maintenance_interval_days,
        last_maintenance_date: data.machine.last_maintenance_date,
        next_maintenance_due: data.machine.next_maintenance_due,
        asset_code: data.machine.asset_code,
        category: data.machine.category,
        manufacturer: data.machine.manufacturer,
        model: data.machine.model,
        serial_number: data.machine.serial_number,
        installation_date: data.machine.installation_date,
        department: data.machine.department,
        production_line: data.machine.production_line,
        criticality: data.machine.criticality,
        warranty_expiry: data.machine.warranty_expiry,
        warranty_notes: data.machine.warranty_notes,
        vendor_name: data.machine.vendor_name,
        vendor_contact: data.machine.vendor_contact,
        amc_provider: data.machine.amc_provider,
        amc_expiry: data.machine.amc_expiry,
        operating_hours: data.machine.operating_hours,
        technician_user_id: data.machine.technician_user_id,
        supervisor_id: data.machine.supervisor_id,
        engineer_user_id: data.machine.engineer_user_id,
        maintenance_head_user_id: data.machine.maintenance_head_user_id,
        assignments: {
          technician: team.find((member) => member.user_id === data.machine.technician_user_id) || null,
          supervisor: team.find((member) => member.user_id === data.machine.supervisor_id) || null,
          engineer: team.find((member) => member.user_id === data.machine.engineer_user_id) || null,
          maintenance_head: team.find((member) => member.user_id === data.machine.maintenance_head_user_id) || null,
        },
      };
      setSelectedMachine(updated);
      setMachines((current) => current.map((machine) => machine.machine_id === updated.machine_id ? updated : machine));
      setMachineEdit(null);
      setSuccess('Machine details updated successfully.');
    } catch (saveError) {
      setError(saveError.message || 'Machine details could not be updated.');
    } finally {
      setMachineEditSaving(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const { data: factoryRows } = await supabase.from('factories').select('id').limit(1);
      const factoryId = factoryRows?.[0]?.id;
      if (!factoryId) throw new Error('No factory found. Please set up a factory first.');

      const { data: newRow, error: insertErr } = await supabase.from('machines').insert({
        name, location,
        hourly_downtime_cost: hourlyDowntimeCost ? Number(hourlyDowntimeCost) : 0,
        maintenance_interval_days: maintenanceIntervalDays ? Number(maintenanceIntervalDays) : 90,
        last_maintenance_date: lastMaintenanceDate || null,
        asset_code: assetCode.trim() || null,
        category: category.trim() || null,
        manufacturer: manufacturer.trim() || null,
        model: model.trim() || null,
        serial_number: serialNumber.trim() || null,
        installation_date: installationDate || null,
        department: department.trim() || null,
        production_line: productionLine.trim() || null,
        criticality: criticality || 'medium',
        warranty_expiry: warrantyExpiry || null,
        warranty_notes: warrantyNotes.trim() || null,
        vendor_name: vendorName.trim() || null,
        vendor_contact: vendorContact.trim() || null,
        amc_provider: amcProvider.trim() || null,
        amc_expiry: amcExpiry || null,
        operating_hours: operatingHours ? Number(operatingHours) : 0,
        assigned_technician_phone: technicianUserId ? team.find(t => t.user_id === technicianUserId)?.phone || '' : '',
        technician_user_id: technicianUserId || null,
        supervisor_id: supervisorUserId || null,
        engineer_user_id: engineerUserId || null,
        maintenance_head_user_id: headUserId || null,
        factory_id: factoryId,
      }).select().single();
      if (insertErr) throw new Error(insertErr.message);

      if (onboardPhotoFile) {
        await uploadMachinePhoto(onboardPhotoFile, newRow.id);
      }

      setSuccess(`Machine ${newRow.id} successfully onboarded!`);
      setShowAddForm(false);
      setName(''); setLocation(''); setHourlyDowntimeCost(''); setMaintenanceIntervalDays('90'); setLastMaintenanceDate(''); setTechnicianUserId(''); setSupervisorUserId(''); setEngineerUserId(''); setHeadUserId('');
      setAssetCode(''); setCategory(''); setManufacturer(''); setModel(''); setSerialNumber(''); setInstallationDate(''); setDepartment(''); setProductionLine(''); setCriticality('medium'); setWarrantyExpiry(''); setWarrantyNotes(''); setVendorName(''); setVendorContact(''); setAmcProvider(''); setAmcExpiry(''); setOperatingHours('');
      setOnboardPhotoFile(null);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const getAssignment = (machine, key) => machine?.assignments?.[key] || null;
  const getAssignmentName = (machine, key) => getAssignment(machine, key)?.name || 'Not assigned';
  const assignable = (role) => team.filter((member) => (Array.isArray(role) ? role : [role]).includes(member.role));
  const technicians = assignable(['technician', 'maintenance_technician']);
  const supervisors = assignable('supervisor');
  const engineers = assignable('maintenance_engineer');
  const maintenanceHeads = assignable('maintenance_head');

  // Sub-tab handlers
  const handleUploadDoc = async (e) => {
    e.preventDefault();
    if (!uploadFile || !selectedMachine) return;
    setDocsLoading(true);
    try {
      const filePath = `${selectedMachine.machine_id}/${Date.now()}_${uploadFile.name}`;
      const { error: upErr } = await supabase.storage.from('documents').upload(filePath, uploadFile);
      if (upErr) throw new Error(upErr.message);

      const { error: insertErr } = await supabase.from('documents').insert({
        machine_id: selectedMachine.machine_id,
        title: uploadFile.name.replace(/\.[^.]+$/, ''),
        category: uploadCategory,
        file_url: filePath,
      });
      if (insertErr) throw new Error(insertErr.message);
      setUploadFile(null);
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      alert(err.message);
    } finally {
      setDocsLoading(false);
    }
  };

  const handleInternetEnrichment = async () => {
    alert('Internet enrichment is not yet available in this version.');
  };

  const downloadDoc = async (docId, filename) => {
    try {
      const { data: docRow } = await supabase.from('documents').select('file_url').eq('id', docId).single();
      if (!docRow?.file_url) throw new Error('No file URL');
      const { data: signedData, error: signErr } = await supabase.storage.from('documents').createSignedUrl(docRow.file_url, 300);
      if (signErr) throw new Error(signErr.message);
      window.open(signedData.signedUrl, '_blank');
    } catch (err) {
      alert('Download failed: ' + err.message);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Delete this document?')) return;
    try {
      const { error: delErr } = await supabase.from('documents').delete().eq('id', docId);
      if (!delErr) loadMachineAssets(selectedMachine.machine_id);
    } catch {}
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setPartsLoading(true);
    try {
      const { data: factoryRows } = await supabase.from('factories').select('id').limit(1);
      const factoryId = factoryRows?.[0]?.id;
      const { error: insertErr } = await supabase.from('parts').insert({
        machine_id: selectedMachine.machine_id,
        part_name: newPartName,
        part_number: newPartNum,
        stock_qty: parseFloat(newPartQty) || 0,
        unit: 'pcs',
        reorder_level: parseFloat(newPartReorder) || 0,
        lead_time_days: 7,
        factory_id: factoryId,
      });
      if (insertErr) throw new Error(insertErr.message);
      setNewPartName(''); setNewPartNum(''); setNewPartQty(''); setNewPartReorder('');
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      alert(err.message);
    } finally {
      setPartsLoading(false);
    }
  };

  const handleDeletePart = async (partId) => {
    if (!window.confirm('Delete this spare part?')) return;
    try {
      const { error: delErr } = await supabase.from('parts').delete().eq('id', partId);
      if (!delErr) loadMachineAssets(selectedMachine.machine_id);
    } catch {}
  };

  const handleAddConsumable = async (e) => {
    e.preventDefault();
    if (!selectedMachine) return;
    setConsumablesLoading(true);
    try {
      const { data: factoryRows } = await supabase.from('factories').select('id').limit(1);
      const factoryId = factoryRows?.[0]?.id;
      const { error: insertErr } = await supabase.from('consumables').insert({
        machine_id: selectedMachine.machine_id,
        name: newConsName,
        stock_qty: parseFloat(newConsQty) || 0,
        unit: newConsUnit,
        reorder_level: (parseFloat(newConsBurn) || 1) * ((parseFloat(newConsLead) || 7) + (parseFloat(newConsBuffer) || 3)),
        lead_time_days: parseInt(newConsLead) || 7,
        buffer_days: parseInt(newConsBuffer) || 3,
        frequency_days: parseInt(newConsFreq) || 30,
        last_replaced_at: newConsLastRep || null,
        factory_id: factoryId,
      });
      if (insertErr) throw new Error(insertErr.message);
      setNewConsName(''); setNewConsQty('');
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      alert(err.message);
    } finally {
      setConsumablesLoading(false);
    }
  };

  const handleDeleteConsumable = async (id) => {
    if (!window.confirm('Delete this consumable?')) return;
    try {
      const { error: delErr } = await supabase.from('consumables').delete().eq('id', id);
      if (!delErr) loadMachineAssets(selectedMachine.machine_id);
    } catch {}
  };

  // --- Preventive Maintenance (roadmap §3.5) ---
  const resetPmForm = () => {
    setPmTitle(''); setPmTrigger('calendar'); setPmFrequency('30'); setPmInterval('');
    setPmChecklist(''); setPmTools(''); setPmSpares(''); setPmEstMin(''); setPmTech('');
  };

  const handleAddPm = async (e) => {
    e.preventDefault();
    if (!selectedMachine || !pmTitle.trim()) return;
    setPmSaving(true);
    try {
      const { data: factoryRows } = await supabase.from('factories').select('id').limit(1);
      const factoryId = selectedMachine.factory_id || factoryRows?.[0]?.id || null;
      const checklist = pmChecklist.split('\n').map((line) => line.trim()).filter(Boolean)
        .map((label) => ({ label, mandatory: true }));
      const { error: insertErr } = await supabase.from('pm_schedules').insert({
        machine_id: selectedMachine.machine_id,
        factory_id: factoryId,
        title: pmTitle.trim(),
        trigger_type: pmTrigger,
        frequency_days: pmTrigger === 'calendar' ? (parseInt(pmFrequency, 10) || 30) : null,
        interval_value: pmTrigger !== 'calendar' && pmInterval ? Number(pmInterval) : null,
        checklist,
        required_tools: pmTools.trim() || null,
        required_spares: pmSpares.trim() || null,
        estimated_minutes: pmEstMin ? parseInt(pmEstMin, 10) : null,
        assigned_technician_id: pmTech || null,
      });
      if (insertErr) throw new Error(insertErr.message);
      resetPmForm();
      setShowPmForm(false);
      setSuccess('Preventive maintenance schedule added.');
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setPmSaving(false);
    }
  };

  const handleCompletePm = async (schedule) => {
    if (!selectedMachine) return;
    setPmSaving(true);
    try {
      const now = new Date().toISOString();
      const onTime = schedule.next_due_at ? new Date(now) <= new Date(schedule.next_due_at) : true;
      const { error: logErr } = await supabase.from('pm_logs').insert({
        pm_schedule_id: schedule.id,
        machine_id: selectedMachine.machine_id,
        factory_id: schedule.factory_id,
        due_at: schedule.next_due_at,
        completed_at: now,
        on_time: onTime,
        completed_by: signedInUser?.name || signedInUser?.user_id || 'Staff',
      });
      if (logErr) throw new Error(logErr.message);
      // Advancing last_done_at recomputes next_due_at via the DB trigger.
      const { error: updErr } = await supabase.from('pm_schedules').update({ last_done_at: now }).eq('id', schedule.id);
      if (updErr) throw new Error(updErr.message);
      setSuccess(`"${schedule.title}" marked done${onTime ? ' on time' : ' (was overdue)'}.`);
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setPmSaving(false);
    }
  };

  const handleDeletePm = async (id) => {
    if (!window.confirm('Delete this PM schedule?')) return;
    try {
      const { error: delErr } = await supabase.from('pm_schedules').delete().eq('id', id);
      if (!delErr) loadMachineAssets(selectedMachine.machine_id);
    } catch {}
  };

  const pmCompliancePct = pmLogs.length
    ? Math.round((pmLogs.filter((log) => log.on_time).length / pmLogs.length) * 100)
    : null;

  // First-Time-Fix rate (roadmap P2): a repeat breakdown means the prior fix
  // did not hold, so FTF = breakdowns that did NOT recur / total breakdowns.
  const ftfPct = machineBreakdowns.length
    ? Math.round(((machineBreakdowns.length - repeatTickets.length) / machineBreakdowns.length) * 100)
    : null;

  // --- Reliability improvement loop: RCA → CAPA → PM revision (roadmap P2) ---
  const resetRcaForm = () => {
    setRcaTicketId(''); setRcaFailureMode(''); setRcaWhys(['', '', '', '', '']); setRcaRoot(''); setRcaFishbone('Machine');
  };

  const handleAddRca = async (e) => {
    e.preventDefault();
    if (!selectedMachine || !rcaRoot.trim()) return;
    setRelSaving(true);
    try {
      const { error: insertErr } = await supabase.from('rca_reports').insert({
        machine_id: selectedMachine.machine_id,
        factory_id: selectedMachine.factory_id || null,
        ticket_id: rcaTicketId || null,
        failure_mode: rcaFailureMode.trim() || null,
        five_whys: rcaWhys.map((w) => w.trim()).filter(Boolean),
        root_cause: rcaRoot.trim(),
        fishbone_category: rcaFishbone,
        created_by: signedInUser?.name || signedInUser?.user_id || 'Staff',
      });
      if (insertErr) throw new Error(insertErr.message);
      resetRcaForm();
      setShowRcaForm(false);
      setSuccess('Root-cause analysis saved.');
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setRelSaving(false);
    }
  };

  const handleDeleteRca = async (id) => {
    if (!window.confirm('Delete this RCA and its actions?')) return;
    try {
      const { error: delErr } = await supabase.from('rca_reports').delete().eq('id', id);
      if (!delErr) loadMachineAssets(selectedMachine.machine_id);
    } catch {}
  };

  const handleAddCapa = async (rca) => {
    if (!capaDesc.trim()) return;
    setRelSaving(true);
    try {
      const { error: insertErr } = await supabase.from('capa_actions').insert({
        rca_id: rca.id,
        machine_id: selectedMachine.machine_id,
        factory_id: selectedMachine.factory_id || null,
        action_type: capaType,
        description: capaDesc.trim(),
        owner_user_id: capaOwner || null,
        due_date: capaDue || null,
      });
      if (insertErr) throw new Error(insertErr.message);
      setCapaDesc(''); setCapaOwner(''); setCapaDue(''); setCapaForRca(null);
      setSuccess('Action added.');
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setRelSaving(false);
    }
  };

  const cycleCapaStatus = async (capa) => {
    const next = capa.status === 'open' ? 'done' : capa.status === 'done' ? 'verified' : 'open';
    try {
      const { error: updErr } = await supabase.from('capa_actions')
        .update({ status: next, effectiveness_verified: next === 'verified' }).eq('id', capa.id);
      if (updErr) throw new Error(updErr.message);
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteCapa = async (id) => {
    try {
      const { error: delErr } = await supabase.from('capa_actions').delete().eq('id', id);
      if (!delErr) loadMachineAssets(selectedMachine.machine_id);
    } catch {}
  };

  // The closing arc: fold a preventive action into the machine's PM checklist so
  // the permanent fix lives in the routine and survives staff turnover.
  const applyCapaToPm = async (capa) => {
    if (!selectedMachine) return;
    setRelSaving(true);
    try {
      const item = { label: capa.description, mandatory: true };
      let target = pmSchedules.find((pm) => pm.active !== false);
      if (target) {
        const checklist = Array.isArray(target.checklist) ? target.checklist : [];
        if (!checklist.some((c) => c.label === item.label)) {
          const { error: updErr } = await supabase.from('pm_schedules')
            .update({ checklist: [...checklist, item] }).eq('id', target.id);
          if (updErr) throw new Error(updErr.message);
        }
      } else {
        // No PM schedule yet — create one so the preventive action has a home.
        const { error: insErr } = await supabase.from('pm_schedules').insert({
          machine_id: selectedMachine.machine_id,
          factory_id: selectedMachine.factory_id || null,
          title: 'Preventive actions (from RCA)',
          trigger_type: 'calendar',
          frequency_days: 90,
          checklist: [item],
        });
        if (insErr) throw new Error(insErr.message);
      }
      const { error: capaErr } = await supabase.from('capa_actions').update({ applied_to_pm: true }).eq('id', capa.id);
      if (capaErr) throw new Error(capaErr.message);
      setSuccess('Preventive action added to the PM checklist. The routine now prevents this failure.');
      loadMachineAssets(selectedMachine.machine_id);
    } catch (err) {
      setError(err.message);
    } finally {
      setRelSaving(false);
    }
  };

  const triggerEscalationAlert = async (itemName, currentQty, reorderLevel, unit, machineName) => {
    try {
      const localEscalation = window.localStorage.getItem('tf_settings_escalation_path');
      const escPath = localEscalation ? JSON.parse(localEscalation) : [
        { role: 'maintenance_technician' },
        { role: 'supervisor' }
      ];
      
      const alertPhones = [];
      escPath.forEach(step => {
        const members = team.filter(m => m.role === step.role && m.can_receive_alerts && m.phone);
        members.forEach(m => {
          alertPhones.push(m.phone);
        });
      });
      
      if (alertPhones.length === 0) {
        console.warn('No active team members found in the escalation path to receive alerts.');
        return;
      }
      
      const messageText = `⚠️ TurboFix Stock Alert\nItem: ${itemName}\nMachine: ${machineName}\nStock: ${currentQty} ${unit} (Reorder level: ${reorderLevel} ${unit}). Please arrange purchase.`;
      
      await supabase.functions.invoke('send_notifications', {
        body: {
          event_type: 'custom',
          phones: alertPhones,
          message: messageText
        }
      });
    } catch (err) {
      console.error('Failed to send stock alert notification:', err);
    }
  };

  const handleUpdatePartQty = async (part, delta) => {
    const nextQty = Math.max(0, part.quantity_on_hand + delta);
    setParts(prev => prev.map(p => p.part_id === part.part_id ? { ...p, quantity_on_hand: nextQty } : p));
    try {
      const { error: updateErr } = await supabase.from('parts').update({ stock_qty: nextQty }).eq('id', part.part_id);
      if (updateErr) throw updateErr;
      if (nextQty <= part.reorder_level && delta < 0) {
        await triggerEscalationAlert(part.part_name, nextQty, part.reorder_level, part.unit, selectedMachine?.machine_name || 'Unknown');
      }
    } catch (err) {
      alert(err.message);
      // Rollback
      setParts(prev => prev.map(p => p.part_id === part.part_id ? { ...p, quantity_on_hand: part.quantity_on_hand } : p));
    }
  };

  const handleSetPartQty = async (part, targetValue) => {
    const nextQty = parseFloat(targetValue);
    if (isNaN(nextQty) || nextQty < 0) return;
    setParts(prev => prev.map(p => p.part_id === part.part_id ? { ...p, quantity_on_hand: nextQty } : p));
    try {
      const { error: updateErr } = await supabase.from('parts').update({ stock_qty: nextQty }).eq('id', part.part_id);
      if (updateErr) throw updateErr;
      if (nextQty <= part.reorder_level) {
        await triggerEscalationAlert(part.part_name, nextQty, part.reorder_level, part.unit, selectedMachine?.machine_name || 'Unknown');
      }
    } catch (err) {
      alert(err.message);
      // Rollback
      setParts(prev => prev.map(p => p.part_id === part.part_id ? { ...p, quantity_on_hand: part.quantity_on_hand } : p));
    }
  };

  const handleUpdateConsumableQty = async (consumable, delta) => {
    const nextQty = Math.max(0, consumable.quantity_on_hand + delta);
    setConsumables(prev => prev.map(c => c.consumable_id === consumable.consumable_id ? { ...c, quantity_on_hand: nextQty } : c));
    try {
      const { error: updateErr } = await supabase.from('consumables').update({ stock_qty: nextQty }).eq('id', consumable.consumable_id);
      if (updateErr) throw updateErr;
      if (nextQty <= consumable.reorder_level && delta < 0) {
        await triggerEscalationAlert(consumable.name, nextQty, consumable.reorder_level, consumable.unit, selectedMachine?.machine_name || 'Unknown');
      }
    } catch (err) {
      alert(err.message);
      // Rollback
      setConsumables(prev => prev.map(c => c.consumable_id === consumable.consumable_id ? { ...c, quantity_on_hand: consumable.quantity_on_hand } : c));
    }
  };

  const handleSetConsumableQty = async (consumable, targetValue) => {
    const nextQty = parseFloat(targetValue);
    if (isNaN(nextQty) || nextQty < 0) return;
    setConsumables(prev => prev.map(c => c.consumable_id === consumable.consumable_id ? { ...c, quantity_on_hand: nextQty } : c));
    try {
      const { error: updateErr } = await supabase.from('consumables').update({ stock_qty: nextQty }).eq('id', consumable.consumable_id);
      if (updateErr) throw updateErr;
      if (nextQty <= consumable.reorder_level) {
        await triggerEscalationAlert(consumable.name, nextQty, consumable.reorder_level, consumable.unit, selectedMachine?.machine_name || 'Unknown');
      }
    } catch (err) {
      alert(err.message);
      // Rollback
      setConsumables(prev => prev.map(c => c.consumable_id === consumable.consumable_id ? { ...c, quantity_on_hand: consumable.quantity_on_hand } : c));
    }
  };

  // Mathematical Calculations for Calendar and Cover
  const parseConsumableMeta = (c) => {
    let meta = {
      burn_rate: 1,
      lead_days: 7,
      buffer_days: 3,
      replacement_schedule_days: 30,
      last_replaced: new Date().toISOString().split('T')[0],
    };
    try {
      if (c.notes) {
        const parsed = JSON.parse(c.notes);
        meta = { ...meta, ...parsed };
      }
    } catch {}
    return meta;
  };

  // Calculate dynamic scheduling metrics
  const getConsumableMetrics = (c) => {
    const meta = parseConsumableMeta(c);
    const stock = c.quantity_on_hand || 0;
    const burn = meta.burn_rate || 1;
    const coverDays = Math.round(stock / burn);

    // Order-by date calculation
    const lastReplacedDate = new Date(meta.last_replaced);
    const replaceDueDays = meta.replacement_schedule_days;
    const replaceDueDate = new Date(lastReplacedDate.getTime() + replaceDueDays * 24 * 60 * 60 * 1000);

    const today = new Date();
    const orderByDate = new Date(today.getTime() + (coverDays - meta.lead_days - meta.buffer_days) * 24 * 60 * 60 * 1000);

    let status = 'OK';
    const leadBufferDays = meta.lead_days + meta.buffer_days;
    if (today >= replaceDueDate || today >= orderByDate) {
      status = 'OVERDUE';
    } else if (coverDays <= leadBufferDays) {
      status = 'ORDER SOON';
    }

    return {
      coverDays,
      orderByDate: orderByDate.toISOString().split('T')[0],
      replaceDueDate: replaceDueDate.toISOString().split('T')[0],
      status,
      meta,
    };
  };

  // Calendar Rendering Helpers
  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendarCells = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    const startDow = getFirstDayOfMonth(currentYear, currentMonth);
    const cells = [];

    // Empty spaces for previous month
    for (let i = 0; i < (startDow === 0 ? 6 : startDow - 1); i++) {
      cells.push(<div key={`empty-${i}`} className="cal-cell out" />);
    }

    // Populate calendar cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayEvents = [];

      consumables.forEach((c) => {
        const metrics = getConsumableMetrics(c);
        if (metrics.orderByDate === dateString) {
          dayEvents.push({ type: 'order', label: `Order ${c.name}`, class: 'ev order' });
        }
        if (metrics.replaceDueDate === dateString) {
          dayEvents.push({ type: 'due', label: `${c.name} Due`, class: 'ev due' });
        }
        if (metrics.status === 'OVERDUE' && metrics.replaceDueDate < dateString && day === new Date().getDate() && currentMonth === new Date().getMonth()) {
          dayEvents.push({ type: 'crit', label: `${c.name} Overdue!`, class: 'ev crit' });
        }
      });

      const isToday = day === new Date().getDate() && currentMonth === new Date().getMonth() && currentYear === new Date().getFullYear();

      cells.push(
        <div key={`day-${day}`} className={`cal-cell ${isToday ? 'today' : ''}`}>
          <span className="dn">{day}</span>
          {dayEvents.map((ev, idx) => (
            <span key={idx} className={ev.class} title={ev.label}>{ev.label}</span>
          ))}
        </div>
      );
    }

    return cells;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  // Map step to machine assignee dynamically
  const getAssigneeForStep = (step, idx) => {
    if (step.role === 'owner') return null;
    if (step.role === 'maintenance_technician' || step.role === 'technician') return getAssignment(selectedMachine, 'technician');
    if (step.role === 'supervisor') return getAssignment(selectedMachine, 'supervisor');
    if (step.role === 'maintenance_engineer') return getAssignment(selectedMachine, 'engineer');
    if (step.role === 'maintenance_head') return getAssignment(selectedMachine, 'maintenance_head');
    return ['technician', 'supervisor', 'engineer', 'maintenance_head'][idx]
      ? getAssignment(selectedMachine, ['technician', 'supervisor', 'engineer', 'maintenance_head'][idx])
      : null;
  };

  return (
    <AppShell active="machines">
      {/* Dynamic embedded styles for calendar, pulsing badges, and custom forms */}
      <style dangerouslySetInnerHTML={{ __html: `
        /* Glow pulsing status dot */
        .glow-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
          box-shadow: 0 0 8px currentColor;
        }
        .glow-dot.healthy {
          background-color: #25D366;
          color: #25D366;
          animation: pulse-green 2s infinite;
        }
        .glow-dot.down {
          background-color: #EF4444;
          color: #EF4444;
          animation: pulse-red 2s infinite;
        }
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(37, 211, 102, 0); }
          100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
        }
        @keyframes pulse-red {
          0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        /* Consumables Calendar styles */
        .cal {
          border: 1px solid var(--border);
          border-radius: var(--radius);
          overflow: hidden;
          background: var(--card);
          box-shadow: var(--shadow-md);
          margin-top: 10px;
        }
        .cal-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 18px;
          border-bottom: 1px solid var(--border);
          background: rgba(0, 0, 0, 0.2);
        }
        .cal-bar .m {
          font-family: 'Rajdhani', sans-serif;
          font-weight: 700;
          font-size: 1.15rem;
          color: white;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .cal-bar .leg {
          margin-left: auto;
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: rgba(255, 255, 255, 0.01);
        }
        .cal-dow {
          font-family: 'Rajdhani', sans-serif;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: .06em;
          color: var(--slate);
          text-align: center;
          padding: 8px 0;
          border-bottom: 1px solid var(--border);
          text-transform: uppercase;
        }
        .cal-cell {
          min-height: 76px;
          border-right: 1px solid var(--border);
          border-bottom: 1px solid var(--border);
          padding: 6px;
          font-family: monospace;
          font-size: 0.72rem;
          position: relative;
          transition: background 0.15s ease;
        }
        .cal-cell:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .cal-cell:nth-child(7n){
          border-right: none;
        }
        .cal-cell .dn {
          color: var(--slate);
          font-weight: 500;
        }
        .cal-cell.out .dn {
          opacity: .25;
        }
        .cal-cell.today {
          background: rgba(37, 211, 102, 0.07);
        }
        .cal-cell.today .dn {
          color: var(--brand);
          font-weight: 700;
        }
        .ev {
          display: block;
          margin-top: 4px;
          font-size: 0.65rem;
          line-height: 1.35;
          padding: 2px 6px;
          border-radius: 4px;
          font-weight: 700;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          text-transform: uppercase;
          font-family: 'Rajdhani', sans-serif;
        }
        .ev.order { background: rgba(245, 158, 11, 0.18); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3); }
        .ev.due { background: rgba(59, 130, 246, 0.18); color: #60A5FA; border: 1px solid rgba(59, 130, 246, 0.3); }
        .ev.crit { background: rgba(239, 68, 68, 0.18); color: #F87171; border: 1px solid rgba(239, 68, 68, 0.3); }

        /* Forms inside Details workspace */
        .vault-field label {
          color: var(--slate) !important;
          font-weight: 600 !important;
        }
        .vault-field select, .vault-field input {
          background-color: rgba(0, 0, 0, 0.25) !important;
          border-color: rgba(255, 255, 255, 0.1) !important;
        }
      ` }} />

      <div className="vault-wrap" style={{ maxWidth: selectedMachine ? '1380px' : '1100px', padding: '20px 24px 80px' }}>
        
        {/* VIEW 1: MACHINES DIRECTORY TABLE (when selectedMachine is null) */}
        {!selectedMachine ? (
          <>
            <div className="machines-directory-header">
              <div>
                <h1 style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '2rem', margin: 0, textTransform: 'uppercase' }}>Machines Directory</h1>
                <p style={{ color: 'var(--slate)', fontSize: '0.9rem', margin: '4px 0 0' }}>Click any machine to access its operational workspace (manuals, BOM, consumables, and replenishment calendar).</p>
              </div>
              <div className="machines-directory-actions">
                <div className="machines-view-toggle" role="group" aria-label="Machine directory view">
                  <button type="button" className={directoryView === 'list' ? 'active' : ''} onClick={() => setDirectoryView('list')} aria-pressed={directoryView === 'list'} title="List view"><List /> <span>List</span></button>
                  <button type="button" className={directoryView === 'tiles' ? 'active' : ''} onClick={() => setDirectoryView('tiles')} aria-pressed={directoryView === 'tiles'} title="Tile view"><LayoutGrid /> <span>Tiles</span></button>
                </div>
                <button className="vault-btn vault-btn-ghost machines-onboard-toggle" onClick={() => setShowAddForm(!showAddForm)}>
                  {showAddForm ? 'Cancel' : '+ Onboard Machine'}
                </button>
              </div>
            </div>

            {error && <div className="vault-error show" style={{ marginBottom: '16px' }}>{error}</div>}
            {success && <div className="vault-success" style={{ background: '#065f46', color: '#d1fae5', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{success}</div>}

            {/* Onboard machine form */}
            {showAddForm && (
              <div className="vault-card machine-onboard-card">
                <div className="machine-onboard-header">
                  <div>
                    <span className="machine-onboard-kicker">New machine</span>
                    <h2>Add a machine to your plant</h2>
                    <p>Enter the machine identity, then assign the people who respond when it needs attention.</p>
                  </div>
                  <span className="machine-onboard-time">About 2 minutes</span>
                </div>
                <form onSubmit={handleAddSubmit} className="machine-onboard-form">
                  <section className="machine-form-section">
                    <div className="machine-form-section-heading">
                      <span>1</span>
                      <div><h3>Machine details</h3><p>Use the name technicians recognise on the shop floor.</p></div>
                    </div>
                    <div className="machine-form-grid">
                      <div className="vault-field machine-field-wide">
                        <label htmlFor="machineName">Machine name <strong aria-hidden="true">*</strong></label>
                        <input type="text" id="machineName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Example: CNC Turning Center" required />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="machineLoc">Plant location</label>
                        <input type="text" id="machineLoc" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Example: Bay 2" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="machinePhotoInput">Machine photo</label>
                        <input type="file" id="machinePhotoInput" accept="image/*" onChange={(e) => setOnboardPhotoFile(e.target.files?.[0] || null)} />
                      </div>
                    </div>
                  </section>

                  <details className="machine-form-section machine-owner-details">
                    <summary>Machine identity &amp; asset details <span>Optional · build the digital profile</span></summary>
                    <p>Capture manufacturer, model and warranty once so every future breakdown, spare and report is tied to a complete machine record.</p>
                    <div className="machine-form-grid">
                      <div className="vault-field">
                        <label htmlFor="assetCode">Asset tag / code</label>
                        <input type="text" id="assetCode" value={assetCode} onChange={(e) => setAssetCode(e.target.value)} placeholder="Example: CNC-04" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="category">Category</label>
                        <input type="text" id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Example: CNC / Compressor" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="criticality">Criticality</label>
                        <select id="criticality" value={criticality} onChange={(e) => setCriticality(e.target.value)}>
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                          <option value="critical">Critical</option>
                        </select>
                      </div>
                      <div className="vault-field">
                        <label htmlFor="manufacturer">Manufacturer</label>
                        <input type="text" id="manufacturer" value={manufacturer} onChange={(e) => setManufacturer(e.target.value)} placeholder="Example: Haas" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="model">Model</label>
                        <input type="text" id="model" value={model} onChange={(e) => setModel(e.target.value)} placeholder="Example: VF-2" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="serialNumber">Serial number</label>
                        <input type="text" id="serialNumber" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="department">Department</label>
                        <input type="text" id="department" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Example: Machining" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="productionLine">Production line</label>
                        <input type="text" id="productionLine" value={productionLine} onChange={(e) => setProductionLine(e.target.value)} placeholder="Example: Line A" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="installationDate">Installation date</label>
                        <input type="date" id="installationDate" value={installationDate} onChange={(e) => setInstallationDate(e.target.value)} />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="operatingHours">Operating hours</label>
                        <input type="number" min="0" step="1" id="operatingHours" value={operatingHours} onChange={(e) => setOperatingHours(e.target.value)} placeholder="Example: 4200" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="warrantyExpiry">Warranty expiry</label>
                        <input type="date" id="warrantyExpiry" value={warrantyExpiry} onChange={(e) => setWarrantyExpiry(e.target.value)} />
                      </div>
                      <div className="vault-field machine-field-wide">
                        <label htmlFor="warrantyNotes">Warranty notes</label>
                        <input type="text" id="warrantyNotes" value={warrantyNotes} onChange={(e) => setWarrantyNotes(e.target.value)} placeholder="What the warranty covers" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="vendorName">Vendor</label>
                        <input type="text" id="vendorName" value={vendorName} onChange={(e) => setVendorName(e.target.value)} placeholder="Supplier / dealer" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="vendorContact">Vendor contact</label>
                        <input type="text" id="vendorContact" value={vendorContact} onChange={(e) => setVendorContact(e.target.value)} placeholder="Phone or email" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="amcProvider">AMC provider</label>
                        <input type="text" id="amcProvider" value={amcProvider} onChange={(e) => setAmcProvider(e.target.value)} placeholder="Service contractor" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="amcExpiry">AMC expiry</label>
                        <input type="date" id="amcExpiry" value={amcExpiry} onChange={(e) => setAmcExpiry(e.target.value)} />
                      </div>
                    </div>
                  </details>

                  <details className="machine-form-section machine-owner-details">
                    <summary>Owner insights <span>Optional · set once</span></summary>
                    <p>These values power downtime-cost and preventive-maintenance insights automatically. Technicians never need to enter them.</p>
                    <div className="machine-form-grid">
                      <div className="vault-field">
                        <label htmlFor="hourlyDowntimeCost">Production value at risk (₹/hour)</label>
                        <input type="number" min="0" step="100" id="hourlyDowntimeCost" value={hourlyDowntimeCost} onChange={(e) => setHourlyDowntimeCost(e.target.value)} placeholder="Example: 12000" />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="lastMaintenanceDate">Last maintenance date</label>
                        <input type="date" id="lastMaintenanceDate" value={lastMaintenanceDate} onChange={(e) => setLastMaintenanceDate(e.target.value)} />
                      </div>
                      <div className="vault-field">
                        <label htmlFor="maintenanceIntervalDays">Service interval (days)</label>
                        <input type="number" min="1" id="maintenanceIntervalDays" value={maintenanceIntervalDays} onChange={(e) => setMaintenanceIntervalDays(e.target.value)} />
                      </div>
                    </div>
                  </details>

                  <section className="machine-form-section">
                    <div className="machine-form-section-heading">
                      <span>2</span>
                      <div><h3>Response team</h3><p>Choose who performs the work and who should be informed.</p></div>
                    </div>
                    {technicians.length === 0 && (
                      <div className="machine-team-notice">
                        <strong>No maintenance technician is available.</strong>
                        <span>Onboard a technician in Team before adding this machine.</span>
                        <a href="team.html">Open Team →</a>
                      </div>
                    )}
                    <div className="machine-role-grid">
                      <div className="vault-field">
                        <label htmlFor="technicianUserId">Primary technician <strong aria-hidden="true">*</strong></label>
                        <select id="technicianUserId" value={technicianUserId} onChange={(e) => setTechnicianUserId(e.target.value)} required disabled={technicians.length === 0}>
                          <option value="">Select a technician</option>
                          {technicians.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
                        </select>
                        <small>Receives the job and completes the repair checklist.</small>
                      </div>
                      <div className="vault-field">
                        <label htmlFor="supervisorUserId">Supervisor <span>Optional</span></label>
                        <select id="supervisorUserId" value={supervisorUserId} onChange={(e) => setSupervisorUserId(e.target.value)}>
                          <option value="">No supervisor selected</option>
                          {supervisors.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
                        </select>
                        <small>Reviews progress and approves closure.</small>
                      </div>
                      <div className="vault-field">
                        <label htmlFor="engineerUserId">Maintenance engineer <span>Optional</span></label>
                        <select id="engineerUserId" value={engineerUserId} onChange={(e) => setEngineerUserId(e.target.value)}>
                          <option value="">No engineer selected</option>
                          {engineers.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
                        </select>
                        <small>Supports diagnosis and complex repairs.</small>
                      </div>
                      <div className="vault-field">
                        <label htmlFor="headUserId">Maintenance head <span>Optional</span></label>
                        <select id="headUserId" value={headUserId} onChange={(e) => setHeadUserId(e.target.value)}>
                          <option value="">No maintenance head selected</option>
                          {maintenanceHeads.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}
                        </select>
                        <small>Receives escalation and plant-risk updates.</small>
                      </div>
                    </div>
                  </section>

                  {error && <div className="vault-error show" style={{ marginBottom: '16px', gridColumn: 'span 2' }}>{error}</div>}

                  <div className="machine-form-actions">
                    <div><strong>TurboFix creates the machine ID and QR tag automatically.</strong><span>You can upload manuals, BOM, and diagrams after onboarding.</span></div>
                    <button type="submit" className="vault-btn vault-btn-primary machine-submit" disabled={technicians.length === 0}>Add machine</button>
                  </div>
                </form>
              </div>
            )}

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--slate)' }}>Loading machines...</div>
            ) : machines.length === 0 ? (
              <div className="vault-card" style={{ textAlign: 'center', padding: '40px' }}>
                <p style={{ color: 'var(--slate)', margin: 0 }}>No machines onboarded yet. Click "+ Onboard Machine" to get started.</p>
              </div>
            ) : directoryView === 'tiles' ? (
              <div className="machine-tile-grid">
                {machines.map((m) => {
                  const photo = m.image_url || window.localStorage.getItem(`tf_machine_photo_${m.machine_id}`);
                  return (
                    <article className="machine-tile" key={m.machine_id} onClick={() => { setSelectedMachine(m); setWsTab('info'); }}>
                      <div className="machine-tile-photo">
                        {photo ? <img src={photo} alt={`${m.machine_name} machine`} /> : <div><LayoutGrid /><span>No machine photo</span></div>}
                        <span className={`machine-tile-status ${m.has_open_tickets ? 'down' : 'healthy'}`}><i />{m.has_open_tickets ? 'Down' : 'Healthy'}</span>
                      </div>
                      <div className="machine-tile-content">
                        <div><span className="machine-tile-id">{m.machine_id}</span><h2>{m.machine_name}</h2></div>
                        <p><MapPin /> {m.location || 'Location not added'}</p>
                        <div className="machine-track-record" aria-label={`${m.machine_name} track record`}>
                          <span><strong>{m.track_record.open}</strong><small>Open issues</small></span>
                          <span><strong>{m.track_record.resolved}</strong><small>Resolved</small></span>
                          <span><strong>{m.track_record.recent}</strong><small>Last 30 days</small></span>
                        </div>
                        <div className="machine-track-detail">
                          <span><small>Last reported issue</small><strong>{m.track_record.last_issue || 'No breakdown history'}</strong><em>{m.track_record.last_issue_at ? new Date(m.track_record.last_issue_at).toLocaleDateString() : 'Track record starts with the first ticket'}</em></span>
                          <span><small>Next maintenance</small><strong>{m.next_maintenance_due ? new Date(m.next_maintenance_due).toLocaleDateString() : 'Not scheduled'}</strong></span>
                        </div>
                        <div className="machine-tile-team"><Users /><span><small>Primary technician</small>{getAssignmentName(m, 'technician')}</span></div>
                        <button className="vault-btn vault-btn-primary" onClick={(e) => { e.stopPropagation(); setSelectedMachine(m); setWsTab('info'); }}>Open Workspace <ChevronRight /></button>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="vault-card" style={{ padding: 0, overflowX: 'auto', marginBottom: '30px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <table className="vault-table">
                  <thead>
                    <tr>
                      <th>Machine ID</th>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Escalation Assignees</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machines.map((m) => (
                      <tr key={m.machine_id} style={{ cursor: 'pointer' }} onClick={() => { setSelectedMachine(m); setWsTab('info'); }}>
                        <td style={{ fontFamily: 'monospace', fontWeight: 'bold', color: 'var(--brand)' }}>{m.machine_id}</td>
                        <td style={{ fontWeight: '600', color: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '4px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {m.image_url || window.localStorage.getItem(`tf_machine_photo_${m.machine_id}`) ? (
                                <img src={m.image_url || window.localStorage.getItem(`tf_machine_photo_${m.machine_id}`)} alt={`${m.machine_name || 'Machine'} photo`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              ) : (
                                <span style={{ fontSize: '0.65rem', color: '#64748b' }}>No img</span>
                              )}
                            </div>
                            <span>{m.machine_name}</span>
                          </div>
                        </td>
                        <td style={{ color: '#cbd5e1' }}>{m.location || '—'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="chip mnt" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Tech: {getAssignmentName(m, 'technician')}</span>
                            {getAssignment(m, 'supervisor') && <span className="chip sup" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Sup: {getAssignmentName(m, 'supervisor')}</span>}
                            {getAssignment(m, 'engineer') && <span className="chip owner" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Eng: {getAssignmentName(m, 'engineer')}</span>}
                            {getAssignment(m, 'maintenance_head') && <span className="chip ok" style={{ padding: '2px 8px', fontSize: '10.5px', color: '#e2e8f0', background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}>Head: {getAssignmentName(m, 'maintenance_head')}</span>}
                          </div>
                        </td>
                        <td>
                          {m.has_open_tickets ? (
                            <span className="vault-role-badge read-only" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(239, 68, 68, 0.12)', color: '#F87171', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                              <span className="glow-dot down" /> Down
                            </span>
                          ) : (
                            <span className="vault-role-badge" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(37, 211, 102, 0.12)', color: '#25D366', border: '1px solid rgba(37, 211, 102, 0.2)' }}>
                              <span className="glow-dot healthy" /> Healthy
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button className="vault-btn vault-btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem', background: 'var(--brand)', color: '#000' }} onClick={(e) => { e.stopPropagation(); setSelectedMachine(m); setWsTab('info'); }}>
                            Open Workspace →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                        </table>
              </div>
            )}
          </>
        ) : (
          /* VIEW 2: DEDICATED FULL-PAGE MACHINE WORKSPACE VIEW */
          <div className="machine-workspace-page">
            <nav className="machine-workspace-breadcrumbs" aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '20px', fontFamily: 'Rajdhani, -apple-system, sans-serif', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
              <button type="button" style={{ background: 'none', border: 'none', padding: 0, color: 'var(--brand)', cursor: 'pointer', font: 'inherit', textDecoration: 'none' }} onClick={() => setSelectedMachine(null)}>
                Machines Directory
              </button>
              <span>/</span>
              <span style={{ color: '#fff' }}>{selectedMachine.machine_name}</span>
            </nav>

            <div className="machine-workspace-shell">
              <header className="machine-workspace-hero" style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
                {machinePhoto ? (
                  <div style={{ position: 'relative', width: '90px', height: '90px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0 }}>
                    <img src={machinePhoto} alt={selectedMachine.machine_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <label style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.7)', color: '#25D366', textAlign: 'center', fontSize: '0.62rem', padding: '3px 0', cursor: 'pointer', fontFamily: 'sans-serif', fontWeight: 'bold' }}>
                      CHANGE
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) uploadMachinePhoto(e.target.files[0]); }} disabled={photoSaving} />
                    </label>
                  </div>
                ) : (
                  <label style={{ width: '90px', height: '90px', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, color: '#94a3b8', background: 'rgba(255,255,255,0.02)' }}>
                    <Upload size={18} style={{ marginBottom: '4px' }} />
                    <span style={{ fontSize: '0.68rem' }}>Add photo</span>
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.[0]) uploadMachinePhoto(e.target.files[0]); }} disabled={photoSaving} />
                  </label>
                )}
                <div className="machine-workspace-identity" style={{ flexGrow: 1, minWidth: '200px' }}>
                  <div className="machine-workspace-id-row">
                    <span className="machine-workspace-id">{selectedMachine.machine_id}</span>
                    <span className={`machine-workspace-state ${selectedMachine.has_open_tickets ? 'down' : 'healthy'}`}>
                      <span />{selectedMachine.has_open_tickets ? 'Breakdown active' : 'Operational'}
                    </span>
                  </div>
                  <h2>{selectedMachine.machine_name}</h2>
                  <p><MapPin />{selectedMachine.location || 'Location not set'}</p>
                </div>
                <div className="machine-workspace-actions">
                  {isOwner && <button type="button" className="machine-action secondary" onClick={openMachineEdit}><Pencil />Edit details</button>}
                  <button type="button" className="machine-action secondary" onClick={() => setWsTab('docs')}><Upload />Add document</button>
                  <a className="machine-action secondary" href={`records.html?machine_id=${encodeURIComponent(selectedMachine.machine_id)}&upload=1`}><FileCheck2 />Add old records</a>
                  <a className="machine-action primary" href={`assistant.html?machine_id=${encodeURIComponent(selectedMachine.machine_id)}`}><Bot />Ask TurboFix AI</a>
                </div>
              </header>

              {machineEdit && <form className="machine-owner-edit" onSubmit={saveMachineEdit}>
                <div className="machine-owner-edit-heading"><div><span>Owner edit</span><h3>Machine details</h3><p>These changes appear across the shared company workspace.</p></div><button type="button" onClick={() => setMachineEdit(null)}>Cancel</button></div>
                <div className="machine-owner-edit-grid">
                  <label><span>Machine name</span><input value={machineEdit.name} onChange={(e) => setMachineEdit({ ...machineEdit, name: e.target.value })} required /></label>
                  <label><span>Location</span><input value={machineEdit.location} onChange={(e) => setMachineEdit({ ...machineEdit, location: e.target.value })} /></label>
                  <label><span>Condition</span><select value={machineEdit.status} onChange={(e) => setMachineEdit({ ...machineEdit, status: e.target.value })}><option value="healthy">Running</option><option value="under_maintenance">Under maintenance</option><option value="breakdown">Breakdown</option><option value="waiting_spare">Waiting for spare</option><option value="waiting_vendor">Waiting for vendor</option><option value="shutdown">Shutdown</option><option value="decommissioned">Decommissioned</option></select></label>
                  <label><span>Downtime cost per hour</span><input type="number" min="0" step="0.01" value={machineEdit.hourly_downtime_cost} onChange={(e) => setMachineEdit({ ...machineEdit, hourly_downtime_cost: e.target.value })} /></label>
                  <label><span>Maintenance interval (days)</span><input type="number" min="1" value={machineEdit.maintenance_interval_days} onChange={(e) => setMachineEdit({ ...machineEdit, maintenance_interval_days: e.target.value })} /></label>
                  <label><span>Last maintenance date</span><input type="date" value={machineEdit.last_maintenance_date} onChange={(e) => setMachineEdit({ ...machineEdit, last_maintenance_date: e.target.value })} /></label>
                </div>
                <fieldset className="machine-stakeholder-edit">
                  <legend>Machine identity &amp; asset details</legend>
                  <p>The digital profile — carried into every ticket, report and KPI for this machine.</p>
                  <div className="machine-owner-edit-grid">
                    <label><span>Asset tag / code</span><input value={machineEdit.asset_code} onChange={(e) => setMachineEdit({ ...machineEdit, asset_code: e.target.value })} placeholder="CNC-04" /></label>
                    <label><span>Category</span><input value={machineEdit.category} onChange={(e) => setMachineEdit({ ...machineEdit, category: e.target.value })} /></label>
                    <label><span>Criticality</span><select value={machineEdit.criticality} onChange={(e) => setMachineEdit({ ...machineEdit, criticality: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                    <label><span>Manufacturer</span><input value={machineEdit.manufacturer} onChange={(e) => setMachineEdit({ ...machineEdit, manufacturer: e.target.value })} /></label>
                    <label><span>Model</span><input value={machineEdit.model} onChange={(e) => setMachineEdit({ ...machineEdit, model: e.target.value })} /></label>
                    <label><span>Serial number</span><input value={machineEdit.serial_number} onChange={(e) => setMachineEdit({ ...machineEdit, serial_number: e.target.value })} /></label>
                    <label><span>Department</span><input value={machineEdit.department} onChange={(e) => setMachineEdit({ ...machineEdit, department: e.target.value })} /></label>
                    <label><span>Production line</span><input value={machineEdit.production_line} onChange={(e) => setMachineEdit({ ...machineEdit, production_line: e.target.value })} /></label>
                    <label><span>Installation date</span><input type="date" value={machineEdit.installation_date} onChange={(e) => setMachineEdit({ ...machineEdit, installation_date: e.target.value })} /></label>
                    <label><span>Operating hours</span><input type="number" min="0" step="1" value={machineEdit.operating_hours} onChange={(e) => setMachineEdit({ ...machineEdit, operating_hours: e.target.value })} /></label>
                    <label><span>Warranty expiry</span><input type="date" value={machineEdit.warranty_expiry} onChange={(e) => setMachineEdit({ ...machineEdit, warranty_expiry: e.target.value })} /></label>
                    <label><span>Warranty notes</span><input value={machineEdit.warranty_notes} onChange={(e) => setMachineEdit({ ...machineEdit, warranty_notes: e.target.value })} /></label>
                    <label><span>Vendor</span><input value={machineEdit.vendor_name} onChange={(e) => setMachineEdit({ ...machineEdit, vendor_name: e.target.value })} /></label>
                    <label><span>Vendor contact</span><input value={machineEdit.vendor_contact} onChange={(e) => setMachineEdit({ ...machineEdit, vendor_contact: e.target.value })} /></label>
                    <label><span>AMC provider</span><input value={machineEdit.amc_provider} onChange={(e) => setMachineEdit({ ...machineEdit, amc_provider: e.target.value })} /></label>
                    <label><span>AMC expiry</span><input type="date" value={machineEdit.amc_expiry} onChange={(e) => setMachineEdit({ ...machineEdit, amc_expiry: e.target.value })} /></label>
                  </div>
                </fieldset>
                <fieldset className="machine-stakeholder-edit">
                  <legend>People connected to this machine</legend>
                  <p>Select the responsible people once. TurboFix uses the same connection in the machine workspace and response path.</p>
                  <div className="machine-owner-edit-grid">
                    <label><span>Primary technician</span><select value={machineEdit.technician_user_id} onChange={(e) => setMachineEdit({ ...machineEdit, technician_user_id: e.target.value })}><option value="">{technicians.length ? 'Not assigned' : 'No technician found — add in Team'}</option>{technicians.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}</select></label>
                    <label><span>Supervisor</span><select value={machineEdit.supervisor_id} onChange={(e) => setMachineEdit({ ...machineEdit, supervisor_id: e.target.value })}><option value="">{supervisors.length ? 'Not assigned' : 'No supervisor found — add in Team'}</option>{supervisors.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}</select></label>
                    <label><span>Maintenance engineer</span><select value={machineEdit.engineer_user_id} onChange={(e) => setMachineEdit({ ...machineEdit, engineer_user_id: e.target.value })}><option value="">{engineers.length ? 'Not assigned' : 'No engineer found — add in Team'}</option>{engineers.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}</select></label>
                    <label><span>Maintenance head</span><select value={machineEdit.maintenance_head_user_id} onChange={(e) => setMachineEdit({ ...machineEdit, maintenance_head_user_id: e.target.value })}><option value="">{maintenanceHeads.length ? 'Not assigned' : 'No maintenance head found — add in Team'}</option>{maintenanceHeads.map((member) => <option key={member.user_id} value={member.user_id}>{member.name}</option>)}</select></label>
                  </div>
                  {[technicians, supervisors, engineers, maintenanceHeads].some((people) => people.length === 0) && <a href="team.html">Add missing roles in Team →</a>}
                </fieldset>
                <button className="vault-btn vault-btn-primary" disabled={machineEditSaving}>{machineEditSaving ? 'Saving…' : 'Save changes'}</button>
              </form>}

              <section className="machine-workspace-pulse" aria-label="Machine at a glance">
                <div className={selectedMachine.has_open_tickets ? 'attention' : 'good'}><span><Activity /></span><p><small>Current condition</small><strong>{selectedMachine.has_open_tickets ? 'Needs attention' : 'Running normally'}</strong></p></div>
                <div><span><BookOpen /></span><p><small>Technical documents</small><strong>{docs.length} available</strong></p></div>
                <div className={parts.some((part) => Number(part.quantity_on_hand) <= Number(part.reorder_level)) ? 'warning' : ''}><span><PackageSearch /></span><p><small>Spare parts</small><strong>{parts.length} listed · {parts.filter((part) => Number(part.quantity_on_hand) <= Number(part.reorder_level)).length} low</strong></p></div>
                <div className={machineData?.missing_sections?.length ? 'warning' : 'good'}><span><ShieldCheck /></span><p><small>AI knowledge</small><strong>{machineDataLoading ? 'Checking…' : machineData?.missing_sections?.length ? `${machineData.missing_sections.length} data gap${machineData.missing_sections.length === 1 ? '' : 's'}` : 'Ready for decisions'}</strong></p></div>
              </section>

              <nav className="machine-workspace-tabs" aria-label={`${selectedMachine.machine_name} workspace sections`}>
                {WORKSPACE_TABS.map(({ id, label, hint, Icon }) => {
                  const count = id === 'docs' ? docs.length : id === 'parts' ? parts.length : id === 'consumables' ? consumables.length : null;
                  return <button key={id} type="button" className={wsTab === id ? 'active' : ''} onClick={() => setWsTab(id)}>
                    <span className="machine-tab-icon"><Icon /></span>
                    <span><strong>{label}</strong><small>{hint}</small></span>
                    {count !== null && <b>{count}</b>}
                  </button>;
                })}
              </nav>

              {/* Workspace Contents */}
              
              {/* TAB 1: ESCALATION & ASSIGNEES (Dynamically loaded off escalationPath) */}
              {wsTab === 'info' && (
                <div className="machine-overview-grid">
                  <section className="machine-overview-main">
                    {(() => {
                      const m = selectedMachine;
                      const statusLabels = { healthy: 'Running', running: 'Running', under_maintenance: 'Under maintenance', maintenance: 'Under maintenance', breakdown: 'Breakdown', down: 'Down', waiting_spare: 'Waiting for spare', waiting_vendor: 'Waiting for vendor', shutdown: 'Shutdown', decommissioned: 'Decommissioned' };
                      const critColors = { low: 'var(--slate)', medium: '#60A5FA', high: '#FBBF24', critical: '#F87171' };
                      const expiryBadge = (label, value) => {
                        if (!value) return null;
                        const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
                        const tone = days < 0 ? '#F87171' : days <= 30 ? '#FBBF24' : 'var(--slate)';
                        const note = days < 0 ? 'Expired' : days <= 30 ? `${days}d left` : '';
                        return { label, value: new Date(value).toLocaleDateString('en-IN'), tone, note };
                      };
                      const rows = [
                        ['Asset code', m.asset_code], ['Category', m.category], ['Manufacturer', m.manufacturer],
                        ['Model', m.model], ['Serial number', m.serial_number], ['Department', m.department],
                        ['Production line', m.production_line],
                        ['Installation', m.installation_date ? new Date(m.installation_date).toLocaleDateString('en-IN') : null],
                        ['Operating hours', m.operating_hours ? `${Number(m.operating_hours).toLocaleString('en-IN')} h` : null],
                        ['Vendor', m.vendor_name], ['Vendor contact', m.vendor_contact], ['AMC provider', m.amc_provider],
                      ].filter(([, v]) => v);
                      const badges = [expiryBadge('Warranty', m.warranty_expiry), expiryBadge('AMC', m.amc_expiry)].filter(Boolean);
                      const hasProfile = rows.length > 0 || badges.length > 0 || m.warranty_notes;
                      return (
                        <div className="machine-section-heading" style={{ display: 'block', marginBottom: '18px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                              <span><FileCheck2 /></span>
                              <div><h3>Machine profile</h3><p>Identity, warranty and vendor details for this asset.</p></div>
                            </div>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontFamily: 'Rajdhani, sans-serif', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: '#cbd5e1' }}>{statusLabels[String(m.status || '').toLowerCase()] || 'Running'}</span>
                              {m.criticality && <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '999px', color: critColors[m.criticality] || 'var(--slate)', border: `1px solid ${critColors[m.criticality] || 'var(--slate)'}` }}>{m.criticality}</span>}
                              {isOwner && <button type="button" className="vault-btn vault-btn-ghost" style={{ padding: '4px 10px' }} onClick={openMachineEdit}><Pencil size={13} /> Edit</button>}
                            </div>
                          </div>
                          {hasProfile ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px 18px', marginTop: '14px', padding: '14px 16px', background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '10px' }}>
                              {rows.map(([label, value]) => (
                                <div key={label} style={{ minWidth: 0 }}>
                                  <small style={{ display: 'block', color: 'var(--slate)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</small>
                                  <strong style={{ color: 'white', fontSize: '0.9rem', wordBreak: 'break-word' }}>{value}</strong>
                                </div>
                              ))}
                              {badges.map((b) => (
                                <div key={b.label} style={{ minWidth: 0 }}>
                                  <small style={{ display: 'block', color: 'var(--slate)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{b.label} expiry</small>
                                  <strong style={{ color: b.tone, fontSize: '0.9rem' }}>{b.value}{b.note && <span style={{ fontSize: '0.72rem', marginLeft: '6px' }}>({b.note})</span>}</strong>
                                </div>
                              ))}
                              {m.warranty_notes && (
                                <div style={{ gridColumn: '1 / -1' }}>
                                  <small style={{ display: 'block', color: 'var(--slate)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Warranty notes</small>
                                  <strong style={{ color: 'white', fontSize: '0.88rem', fontWeight: 500 }}>{m.warranty_notes}</strong>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{ marginTop: '12px', padding: '14px 16px', background: 'rgba(0,0,0,0.18)', border: '1px dashed var(--border)', borderRadius: '10px', color: 'var(--slate)', fontSize: '0.85rem' }}>
                              No profile details yet. {isOwner ? <button type="button" onClick={openMachineEdit} style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontWeight: 600, padding: 0 }}>Add manufacturer, model &amp; warranty →</button> : 'Ask an owner to add manufacturer, model and warranty.'}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="machine-section-heading">
                      <div><span><ClipboardList /></span><div><h3>Breakdown response path</h3><p>Who responds first, and when the issue moves to the next level.</p></div></div>
                      <a href="settings.html#response">Change response rules <ChevronRight /></a>
                    </div>
                    <div className="machine-escalation-timeline">
                      {(() => {
                        let accumulatedHours = 0;
                        return escalationPath.map((step, index) => {
                          const triggerHour = accumulatedHours;
                          accumulatedHours += Number(step.threshold_hours || 0);
                          const isLast = index === escalationPath.length - 1;
                          const assignee = getAssigneeForStep(step, index);
                          return <article key={`${step.role}-${index}`} className={index === 0 ? 'active' : ''}>
                            <div className="machine-escalation-marker"><span>{index + 1}</span></div>
                            <div className="machine-escalation-copy">
                              <small>{index === 0 ? 'Immediately after reporting' : `If still open after ${triggerHour} hour${triggerHour === 1 ? '' : 's'}`}</small>
                              <h4>{step.label}</h4>
                              {step.role === 'owner'
                                ? <p><Users />All owner accounts</p>
                                : <ContactReveal member={assignee} compact showIdentity />}
                            </div>
                            <span className="machine-escalation-time">{isLast ? 'Final escalation' : `${step.threshold_hours || 0}h response window`}</span>
                          </article>;
                        });
                      })()}
                      {escalationPath.length === 0 && <div className="machine-workspace-empty"><CircleAlert /><strong>No response path configured</strong><span>Set the response order in Settings before a breakdown occurs.</span></div>}
                    </div>
                  </section>

                  <aside className="machine-overview-side">
                    <section className={`machine-next-action ${selectedMachine.has_open_tickets ? 'urgent' : ''}`}>
                      <span className="machine-side-kicker">Recommended next action</span>
                      {selectedMachine.has_open_tickets ? <><CircleAlert /><h3>Review the open breakdown</h3><p>Confirm the assigned technician has started work and has the required manual and spares.</p><a href="tickets.html">Open breakdown tickets <ChevronRight /></a></> : machineData?.missing_sections?.length ? <><BookOpen /><h3>Complete machine knowledge</h3><p>Add {machineData.missing_sections[0]} so future AI guidance is safer and more specific.</p><button type="button" onClick={() => setWsTab('docs')}>Add missing document <ChevronRight /></button></> : <><ShieldCheck /><h3>Machine is ready</h3><p>Knowledge and response ownership are in place. Continue routine preventive maintenance.</p><a href="shutdown-planner.html">Review shutdown plan <ChevronRight /></a></>}
                    </section>
                    <button type="button" className="vault-btn vault-btn-primary" style={{ width: '100%', marginTop: '12px', background: 'var(--brand)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: 600 }} onClick={() => { setIssueText(''); setIssueUrgency('medium'); setReportIssueError(''); setReportIssueOpen(true); }}>
                      <CircleAlert size={16} /> Report issue
                    </button>
                    <section className="machine-response-team">
                      <div className="machine-side-title"><span><Phone /></span><div><h3>Response team</h3><p>People connected to this machine</p></div></div>
                      <div>
                        {[
                          ['T', 'Primary technician', 'technician'],
                          ['S', 'Supervisor', 'supervisor'],
                          ['E', 'Engineer', 'engineer'],
                          ['H', 'Maintenance head', 'maintenance_head'],
                        ].map(([initial, label, key]) => (
                          <span key={key}>
                            <b>{initial}</b>
                            <div className="machine-response-person"><small>{label}</small><ContactReveal member={getAssignment(selectedMachine, key)} compact showIdentity /></div>
                          </span>
                        ))}
                      </div>
                      <a href="team.html">Manage team assignments <ChevronRight /></a>
                    </section>
                  </aside>
                </div>
              )}

              {/* TAB 2: MANUALS & DOCUMENTS */}
              {wsTab === 'docs' && (
                <div>
                  <div style={{ marginBottom: '16px', padding: '16px', borderRadius: '8px', border: '1px solid rgba(37, 211, 102, 0.25)', background: 'rgba(37, 211, 102, 0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <div>
                        <strong style={{ color: 'white' }}>Machine knowledge file</strong>
                        <div style={{ color: 'var(--slate)', fontSize: '0.82rem', marginTop: '4px' }}>{machineDataLoading ? 'Refreshing…' : machineData?.file_name || 'Generated after the first upload'}</div>
                      </div>
                      {machineData?.approval_required && <button type="button" className="vault-btn vault-btn-ghost" onClick={handleInternetEnrichment} disabled={enrichingMachineData}>{enrichingMachineData ? 'Researching…' : 'Approve internet enrichment'}</button>}
                    </div>
                    {machineData?.missing_sections?.length > 0 && <div style={{ color: '#FBBF24', fontSize: '0.78rem', marginTop: '10px' }}>Missing: {machineData.missing_sections.join(', ')}. TurboFix will only use internet data after your approval.</div>}
                    {machineData?.internet && <div style={{ color: '#25D366', fontSize: '0.78rem', marginTop: '10px' }}>Internet-enriched file created with approved reference data.</div>}
                  </div>
                  <form onSubmit={handleUploadDoc} style={{ display: 'flex', gap: '12px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div style={{ width: '190px' }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--slate)' }}>Document type</label>
                      <select value={uploadCategory} onChange={(e) => setUploadCategory(e.target.value)} style={{ width: '100%' }}>
                        <option value="manual">Machine manual</option>
                        <option value="circuit_diagram">Wiring diagram</option>
                        <option value="hydraulic_diagram">Hydraulic diagram</option>
                        <option value="spare_parts_catalog">BOM / spare list</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 'bold', marginBottom: '6px', color: 'var(--slate)' }}>Upload Manual / Schematic (PDF/Images)</label>
                      <input type="file" onChange={(e) => setUploadFile(e.target.files[0])} required />
                    </div>
                    <button type="submit" className="vault-btn vault-btn-primary" style={{ alignSelf: 'flex-end', height: '38px', padding: '0 20px', background: 'var(--brand)', color: '#000' }}>Upload Doc</button>
                  </form>

                  {docsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>Loading documents...</div>
                  ) : docs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>No documents uploaded.</div>
                  ) : (
                    <table className="vault-table">
                      <thead>
                        <tr>
                          <th>Document Name</th>
                          <th>Uploaded</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {docs.map((d) => (
                          <tr key={d.document_id || d.doc_id}>
                            <td style={{ fontWeight: 'bold', color: 'white' }}>{d.file_name || d.filename}</td>
                            <td style={{ color: 'var(--slate)' }}>{d.uploaded_at ? new Date(d.uploaded_at.replace(' ', 'T')).toLocaleString() : '—'}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem', marginRight: '8px', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} onClick={() => downloadDoc(d.document_id || d.doc_id, d.file_name || d.filename)}>
                                Download
                              </button>
                              <button className="vault-btn vault-btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleDeleteDoc(d.document_id || d.doc_id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 3: SPARE PARTS (BOM) */}
              {wsTab === 'parts' && (
                <div>
                  <div className="machine-workspace-section-intro"><span><PackageSearch /></span><div><h3>Spare parts and reorder levels</h3><p>Add critical BOM items and set the minimum stock that should trigger replenishment.</p></div><strong>{parts.length} part{parts.length === 1 ? '' : 's'} tracked</strong></div>
                  <form onSubmit={handleAddPart} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div className="vault-field">
                      <label>Part Name</label>
                      <input type="text" value={newPartName} onChange={(e) => setNewPartName(e.target.value)} placeholder="e.g. Servo Motor" required />
                    </div>
                    <div className="vault-field">
                      <label>Part Number</label>
                      <input type="text" value={newPartNum} onChange={(e) => setNewPartNum(e.target.value)} placeholder="e.g. SN-4819" required />
                    </div>
                    <div className="vault-field">
                      <label>Stock Qty</label>
                      <input type="number" value={newPartQty} onChange={(e) => setNewPartQty(e.target.value)} placeholder="e.g. 5" required />
                    </div>
                    <div className="vault-field">
                      <label>Reorder Threshold</label>
                      <input type="number" value={newPartReorder} onChange={(e) => setNewPartReorder(e.target.value)} placeholder="e.g. 2" required />
                    </div>
                    <button type="submit" className="vault-btn vault-btn-primary" style={{ height: '38px', marginTop: '22px', background: 'var(--brand)', color: '#000' }}>Add Part</button>
                  </form>

                  {partsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>Loading spare parts...</div>
                  ) : parts.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>No spare parts listed in Bill of Materials.</div>
                  ) : (
                    <table className="vault-table">
                      <thead>
                        <tr>
                          <th>Part Name</th>
                          <th>Part Number</th>
                          <th>Stock Level</th>
                          <th>Reorder Level</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parts.map((p) => (
                          <tr key={p.part_id}>
                            <td style={{ fontWeight: 'bold', color: 'white' }}>{p.part_name}</td>
                            <td style={{ fontFamily: 'monospace', color: 'var(--brand)' }}>{p.part_number}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button type="button" className="vault-btn" style={{ padding: '2px 8px', fontSize: '0.85rem', minWidth: '22px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleUpdatePartQty(p, -1)}>-</button>
                                <input type="number" value={p.quantity_on_hand} style={{ width: '48px', background: '#111827', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', padding: '2px 0' }} onChange={(e) => handleSetPartQty(p, e.target.value)} />
                                <button type="button" className="vault-btn" style={{ padding: '2px 8px', fontSize: '0.85rem', minWidth: '22px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleUpdatePartQty(p, 1)}>+</button>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '2px' }}>{p.unit}</span>
                                {p.quantity_on_hand <= p.reorder_level && (
                                  <span className="vault-role-badge read-only" style={{ marginLeft: '6px', fontSize: '10px', padding: '2px 6px', background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>LOW</span>
                                )}
                              </div>
                            </td>
                            <td style={{ color: 'var(--slate)' }}>{p.reorder_level} {p.unit}</td>
                            <td style={{ textAlign: 'right' }}>
                              <button className="vault-btn vault-btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleDeletePart(p.part_id)}>
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 4: CONSUMABLES */}
              {wsTab === 'consumables' && (
                <div>
                  <div className="machine-workspace-section-intro"><span><Droplets /></span><div><h3>Consumable usage and coverage</h3><p>Enter actual consumption and supplier lead time so TurboFix can calculate order-by dates.</p></div><strong>{consumables.length} item{consumables.length === 1 ? '' : 's'} tracked</strong></div>
                  <form onSubmit={handleAddConsumable} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                    <div className="vault-field" style={{ gridColumn: 'span 2' }}>
                      <label>Consumable Name</label>
                      <input type="text" value={newConsName} onChange={(e) => setNewConsName(e.target.value)} placeholder="e.g. Hydraulic Lubricant Oil" required />
                    </div>
                    <div className="vault-field">
                      <label>Stock Qty</label>
                      <input type="number" value={newConsQty} onChange={(e) => setNewConsQty(e.target.value)} placeholder="e.g. 100" required />
                    </div>
                    <div className="vault-field">
                      <label>Unit</label>
                      <input type="text" value={newConsUnit} onChange={(e) => setNewConsUnit(e.target.value)} placeholder="e.g. L" required />
                    </div>
                    <div className="vault-field">
                      <label>Daily Burn Rate</label>
                      <input type="number" value={newConsBurn} onChange={(e) => setNewConsBurn(e.target.value)} placeholder="e.g. 5" required />
                    </div>
                    <div className="vault-field">
                      <label>Lead Time (days)</label>
                      <input type="number" value={newConsLead} onChange={(e) => setNewConsLead(e.target.value)} placeholder="e.g. 7" required />
                    </div>
                    <div className="vault-field">
                      <label>Buffer Days</label>
                      <input type="number" value={newConsBuffer} onChange={(e) => setNewConsBuffer(e.target.value)} placeholder="e.g. 3" required />
                    </div>
                    <div className="vault-field">
                      <label>Cadence (days)</label>
                      <input type="number" value={newConsFreq} onChange={(e) => setNewConsFreq(e.target.value)} placeholder="e.g. 30" required />
                    </div>
                    <div className="vault-field">
                      <label>Last Replaced Date</label>
                      <input type="date" value={newConsLastRep} onChange={(e) => setNewConsLastRep(e.target.value)} required />
                    </div>
                    <button type="submit" className="vault-btn vault-btn-primary" style={{ height: '38px', gridColumn: 'span 2', marginTop: '22px', background: 'var(--brand)', color: '#000' }}>Add Consumable</button>
                  </form>

                  {consumablesLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>Loading consumables...</div>
                  ) : consumables.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--slate)' }}>No consumables registered for this machine.</div>
                  ) : (
                    <table className="vault-table">
                      <thead>
                        <tr>
                          <th>Consumable Name</th>
                          <th>Stock Level</th>
                          <th>Daily Burn</th>
                          <th>Days Cover</th>
                          <th>Order-By</th>
                          <th>Replace-Due</th>
                          <th>Status</th>
                          <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consumables.map((c) => {
                          const metrics = getConsumableMetrics(c);
                          return (
                            <tr key={c.consumable_id}>
                              <td style={{ fontWeight: 'bold', color: 'white' }}>{c.name}</td>
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <button type="button" className="vault-btn" style={{ padding: '2px 8px', fontSize: '0.85rem', minWidth: '22px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleUpdateConsumableQty(c, -1)}>-</button>
                                  <input type="number" value={c.quantity_on_hand} style={{ width: '48px', background: '#111827', color: 'white', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '4px', textAlign: 'center', fontSize: '0.8rem', padding: '2px 0' }} onChange={(e) => handleSetConsumableQty(c, e.target.value)} />
                                  <button type="button" className="vault-btn" style={{ padding: '2px 8px', fontSize: '0.85rem', minWidth: '22px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'white', borderRadius: '4px', cursor: 'pointer' }} onClick={() => handleUpdateConsumableQty(c, 1)}>+</button>
                                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginLeft: '2px' }}>{c.unit}</span>
                                  {c.quantity_on_hand <= c.reorder_level && (
                                    <span className="vault-role-badge read-only" style={{ marginLeft: '6px', fontSize: '10px', padding: '2px 6px', background: 'rgba(239,68,68,0.15)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)' }}>LOW</span>
                                  )}
                                </div>
                              </td>
                              <td style={{ color: '#cbd5e1' }}>{metrics.meta.burn_rate} {c.unit}/day</td>
                              <td style={{ fontFamily: 'monospace', color: 'white' }}>{metrics.coverDays} days</td>
                              <td style={{ fontFamily: 'monospace', color: 'var(--brand)' }}>{metrics.orderByDate}</td>
                              <td style={{ fontFamily: 'monospace', color: '#60A5FA' }}>{metrics.replaceDueDate}</td>
                              <td>
                                <span className={`pill ${metrics.status === 'OVERDUE' ? 'crit' : metrics.status === 'ORDER SOON' ? 'warn' : 'ok'}`}>
                                  {metrics.status}
                                </span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="vault-btn vault-btn-danger" style={{ padding: '4px 10px', fontSize: '0.75rem' }} onClick={() => handleDeleteConsumable(c.consumable_id)}>
                                  Delete
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}

              {/* TAB: PREVENTIVE MAINTENANCE SCHEDULER (§3.5) */}
              {wsTab === 'pm' && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ margin: 0, color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>Preventive maintenance</h3>
                      <p style={{ margin: '4px 0 0', color: 'var(--slate)', fontSize: '0.85rem' }}>Scheduled PM tasks, reminders and compliance for this machine.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {pmCompliancePct !== null && (
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.6rem', fontWeight: 700, lineHeight: 1, color: pmCompliancePct >= 90 ? '#25D366' : pmCompliancePct >= 70 ? '#FBBF24' : '#F87171' }}>{pmCompliancePct}%</div>
                          <small style={{ color: 'var(--slate)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>PM compliance</small>
                        </div>
                      )}
                      {isOwner && <button className="vault-btn vault-btn-primary" style={{ background: 'var(--brand)', color: '#000' }} onClick={() => setShowPmForm(!showPmForm)}>{showPmForm ? 'Cancel' : '+ Add PM task'}</button>}
                    </div>
                  </div>

                  {showPmForm && (
                    <form onSubmit={handleAddPm} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '18px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                      <div className="vault-field" style={{ gridColumn: '1 / -1' }}>
                        <label>PM task title</label>
                        <input value={pmTitle} onChange={(e) => setPmTitle(e.target.value)} placeholder="Example: Monthly greasing & belt check" required />
                      </div>
                      <div className="vault-field">
                        <label>Trigger basis</label>
                        <select value={pmTrigger} onChange={(e) => setPmTrigger(e.target.value)}>
                          <option value="calendar">Calendar date</option>
                          <option value="operating_hours">Operating hours</option>
                          <option value="cycle_count">Cycle count</option>
                          <option value="meter_reading">Meter reading</option>
                          <option value="production_qty">Production quantity</option>
                          <option value="condition">Condition-based</option>
                        </select>
                      </div>
                      {pmTrigger === 'calendar' ? (
                        <div className="vault-field">
                          <label>Every (days)</label>
                          <input type="number" min="1" value={pmFrequency} onChange={(e) => setPmFrequency(e.target.value)} />
                        </div>
                      ) : (
                        <div className="vault-field">
                          <label>Interval ({pmTrigger === 'operating_hours' ? 'hours' : pmTrigger === 'cycle_count' ? 'cycles' : pmTrigger === 'production_qty' ? 'units' : 'reading'})</label>
                          <input type="number" min="0" value={pmInterval} onChange={(e) => setPmInterval(e.target.value)} placeholder="e.g. 500" />
                        </div>
                      )}
                      <div className="vault-field">
                        <label>Estimated duration (min)</label>
                        <input type="number" min="0" value={pmEstMin} onChange={(e) => setPmEstMin(e.target.value)} placeholder="e.g. 45" />
                      </div>
                      <div className="vault-field">
                        <label>Assigned technician</label>
                        <select value={pmTech} onChange={(e) => setPmTech(e.target.value)}>
                          <option value="">Machine's default technician</option>
                          {technicians.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                        </select>
                      </div>
                      <div className="vault-field" style={{ gridColumn: '1 / -1' }}>
                        <label>Checklist (one step per line)</label>
                        <textarea value={pmChecklist} onChange={(e) => setPmChecklist(e.target.value)} rows={3} placeholder={"Check oil level\nInspect belts for wear\nClean filters"} />
                      </div>
                      <div className="vault-field">
                        <label>Required tools</label>
                        <input value={pmTools} onChange={(e) => setPmTools(e.target.value)} placeholder="e.g. grease gun, torque wrench" />
                      </div>
                      <div className="vault-field">
                        <label>Required spares</label>
                        <input value={pmSpares} onChange={(e) => setPmSpares(e.target.value)} placeholder="e.g. air filter, V-belt" />
                      </div>
                      <div style={{ gridColumn: '1 / -1' }}>
                        <button type="submit" className="vault-btn vault-btn-primary" disabled={pmSaving} style={{ background: 'var(--brand)', color: '#000' }}>{pmSaving ? 'Saving…' : 'Save PM task'}</button>
                      </div>
                    </form>
                  )}

                  {pmLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--slate)' }}>Loading PM schedule…</div>
                  ) : pmSchedules.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px', color: 'var(--slate)', border: '1px dashed var(--border)', borderRadius: '10px' }}>No preventive maintenance scheduled yet. {isOwner ? 'Add a PM task to get automatic reminders before failures happen.' : 'Ask an owner to schedule PM tasks for this machine.'}</div>
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      {pmSchedules.map((pm) => {
                        const due = pm.next_due_at ? new Date(pm.next_due_at) : null;
                        const days = due ? Math.ceil((due.getTime() - Date.now()) / 86400000) : null;
                        const overdue = days !== null && days < 0;
                        const soon = days !== null && days >= 0 && days <= 3;
                        const tone = overdue ? '#F87171' : soon ? '#FBBF24' : '#25D366';
                        const checklist = Array.isArray(pm.checklist) ? pm.checklist : [];
                        const triggerLabel = { calendar: 'Calendar', operating_hours: 'Operating hours', cycle_count: 'Cycle count', meter_reading: 'Meter reading', production_qty: 'Production qty', condition: 'Condition-based' }[pm.trigger_type] || pm.trigger_type;
                        return (
                          <div key={pm.id} style={{ background: 'rgba(0,0,0,0.18)', border: `1px solid ${overdue || soon ? tone : 'var(--border)'}`, borderRadius: '10px', padding: '14px 16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
                              <div style={{ minWidth: 0 }}>
                                <strong style={{ color: 'white', fontSize: '0.98rem' }}>{pm.title}</strong>
                                <div style={{ color: 'var(--slate)', fontSize: '0.78rem', marginTop: '3px' }}>
                                  {triggerLabel}{pm.trigger_type === 'calendar' && pm.frequency_days ? ` · every ${pm.frequency_days}d` : pm.interval_value ? ` · every ${pm.interval_value}` : ''}{pm.estimated_minutes ? ` · ~${pm.estimated_minutes} min` : ''}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                                <span style={{ color: tone, fontWeight: 700, fontSize: '0.82rem' }}>{due ? (overdue ? `Overdue ${Math.abs(days)}d` : days === 0 ? 'Due today' : `Due in ${days}d`) : 'Not scheduled'}</span>
                                {due && <div style={{ color: 'var(--slate)', fontSize: '0.72rem' }}>{due.toLocaleDateString('en-IN')}</div>}
                              </div>
                            </div>
                            {(checklist.length > 0 || pm.required_tools || pm.required_spares) && (
                              <div style={{ marginTop: '10px', display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                                {checklist.length > 0 && <div style={{ color: '#cbd5e1' }}><span style={{ color: 'var(--slate)' }}>Checklist:</span> {checklist.map((c) => c.label).join(' · ')}</div>}
                                {pm.required_tools && <div style={{ color: '#cbd5e1' }}><span style={{ color: 'var(--slate)' }}>Tools:</span> {pm.required_tools}</div>}
                                {pm.required_spares && <div style={{ color: '#cbd5e1' }}><span style={{ color: 'var(--slate)' }}>Spares:</span> {pm.required_spares}</div>}
                              </div>
                            )}
                            <div style={{ marginTop: '12px', display: 'flex', gap: '10px' }}>
                              <button className="vault-btn vault-btn-primary" style={{ padding: '5px 14px', fontSize: '0.78rem', background: 'var(--brand)', color: '#000' }} disabled={pmSaving} onClick={() => handleCompletePm(pm)}>Mark done</button>
                              {isOwner && <button className="vault-btn vault-btn-ghost" style={{ padding: '5px 12px', fontSize: '0.78rem' }} onClick={() => handleDeletePm(pm.id)}>Delete</button>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {pmLogs.length > 0 && (
                    <div style={{ marginTop: '20px' }}>
                      <h4 style={{ color: 'var(--slate)', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 8px' }}>Recent PM history</h4>
                      <div style={{ display: 'grid', gap: '6px' }}>
                        {pmLogs.slice(0, 6).map((log) => (
                          <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', padding: '6px 10px', background: 'rgba(0,0,0,0.15)', borderRadius: '6px' }}>
                            <span>{new Date(log.completed_at).toLocaleDateString('en-IN')} · {log.completed_by || 'Staff'}</span>
                            <span style={{ color: log.on_time ? '#25D366' : '#F87171', fontWeight: 600 }}>{log.on_time ? 'On time' : 'Late'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: RELIABILITY — Repeat failures → RCA → CAPA → PM revision (P2) */}
              {wsTab === 'reliability' && (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <h3 style={{ margin: 0, color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase' }}>Reliability improvement</h3>
                    <p style={{ margin: '4px 0 0', color: 'var(--slate)', fontSize: '0.85rem' }}>Stop recurring failures: find the root cause, act on it, and fold the fix into the PM routine.</p>
                  </div>

                  {/* Repeat-failure signal */}
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    <div style={{ flex: '1 1 200px', background: repeatTickets.length ? 'rgba(248,113,113,0.1)' : 'rgba(0,0,0,0.18)', border: `1px solid ${repeatTickets.length ? '#F87171' : 'var(--border)'}`, borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.8rem', fontWeight: 700, color: repeatTickets.length ? '#F87171' : '#25D366', lineHeight: 1 }}>{repeatTickets.length}</div>
                      <small style={{ color: 'var(--slate)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Repeat breakdowns (90 days)</small>
                    </div>
                    <div style={{ flex: '1 1 200px', background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.8rem', fontWeight: 700, color: 'white', lineHeight: 1 }}>{rcaReports.length}</div>
                      <small style={{ color: 'var(--slate)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Root-cause analyses</small>
                    </div>
                    <div style={{ flex: '1 1 200px', background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.8rem', fontWeight: 700, color: 'white', lineHeight: 1 }}>{capaActions.filter((c) => c.action_type === 'preventive' && c.applied_to_pm).length}</div>
                      <small style={{ color: 'var(--slate)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Preventive fixes in PM</small>
                    </div>
                    <div style={{ flex: '1 1 200px', background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '10px', padding: '14px 16px' }} title="Breakdowns that did not recur, over the last 90 days">
                      <div style={{ fontFamily: 'Rajdhani, sans-serif', fontSize: '1.8rem', fontWeight: 700, lineHeight: 1, color: ftfPct === null ? 'var(--slate)' : ftfPct >= 90 ? '#25D366' : ftfPct >= 70 ? '#FBBF24' : '#F87171' }}>{ftfPct === null ? '—' : `${ftfPct}%`}</div>
                      <small style={{ color: 'var(--slate)', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>First-time fix rate</small>
                    </div>
                  </div>

                  {repeatTickets.length > 0 && (
                    <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '18px' }}>
                      <strong style={{ color: '#F87171', fontSize: '0.85rem' }}>Recurring failures detected — an RCA is recommended.</strong>
                      <div style={{ color: '#cbd5e1', fontSize: '0.8rem', marginTop: '6px' }}>{repeatTickets.slice(0, 3).map((t) => `${new Date(t.created_at).toLocaleDateString('en-IN')}: ${t.issue_text || 'Breakdown'}`).join(' · ')}</div>
                    </div>
                  )}

                  {isOwner && <button className="vault-btn vault-btn-primary" style={{ background: 'var(--brand)', color: '#000', marginBottom: '16px' }} onClick={() => { setShowRcaForm(!showRcaForm); }}>{showRcaForm ? 'Cancel' : '+ New root-cause analysis'}</button>}

                  {showRcaForm && (
                    <form onSubmit={handleAddRca} style={{ background: 'rgba(0,0,0,0.2)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border)', marginBottom: '18px', display: 'grid', gap: '12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                        <div className="vault-field">
                          <label>Related breakdown (optional)</label>
                          <select value={rcaTicketId} onChange={(e) => setRcaTicketId(e.target.value)}>
                            <option value="">Not linked</option>
                            {repeatTickets.map((t) => <option key={t.id} value={t.id}>{new Date(t.created_at).toLocaleDateString('en-IN')} — {(t.issue_text || 'Breakdown').slice(0, 40)}</option>)}
                          </select>
                        </div>
                        <div className="vault-field">
                          <label>Failure mode</label>
                          <input value={rcaFailureMode} onChange={(e) => setRcaFailureMode(e.target.value)} placeholder="e.g. bearing seizure" />
                        </div>
                        <div className="vault-field">
                          <label>Fishbone category</label>
                          <select value={rcaFishbone} onChange={(e) => setRcaFishbone(e.target.value)}>
                            {['Man', 'Machine', 'Method', 'Material', 'Measurement', 'Environment'].map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label style={{ display: 'block', color: 'var(--slate)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px' }}>5 Whys — ask "why" until the root emerges</label>
                        {rcaWhys.map((w, i) => (
                          <input key={i} value={w} onChange={(e) => setRcaWhys(rcaWhys.map((val, idx) => idx === i ? e.target.value : val))} placeholder={`Why ${i + 1}?`} style={{ width: '100%', marginBottom: '6px' }} />
                        ))}
                      </div>
                      <div className="vault-field">
                        <label>Root cause <strong aria-hidden="true">*</strong></label>
                        <textarea value={rcaRoot} onChange={(e) => setRcaRoot(e.target.value)} rows={2} placeholder="The true underlying cause — not the symptom" required />
                      </div>
                      <div><button type="submit" className="vault-btn vault-btn-primary" disabled={relSaving} style={{ background: 'var(--brand)', color: '#000' }}>{relSaving ? 'Saving…' : 'Save RCA'}</button></div>
                    </form>
                  )}

                  {relLoading ? (
                    <div style={{ textAlign: 'center', padding: '24px', color: 'var(--slate)' }}>Loading reliability data…</div>
                  ) : rcaReports.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '28px', color: 'var(--slate)', border: '1px dashed var(--border)', borderRadius: '10px' }}>No root-cause analyses yet. When a failure repeats, capture the root cause here so it can be permanently fixed.</div>
                  ) : (
                    <div style={{ display: 'grid', gap: '14px' }}>
                      {rcaReports.map((rca) => {
                        const actions = capaActions.filter((c) => c.rca_id === rca.id);
                        return (
                          <div key={rca.id} style={{ background: 'rgba(0,0,0,0.18)', border: '1px solid var(--border)', borderRadius: '10px', padding: '16px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                  <strong style={{ color: 'white' }}>{rca.failure_mode || 'Root-cause analysis'}</strong>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', padding: '2px 8px', borderRadius: '999px', color: '#A78BFA', border: '1px solid #A78BFA' }}>{rca.fishbone_category}</span>
                                </div>
                                <div style={{ color: '#cbd5e1', fontSize: '0.85rem', marginTop: '6px' }}><span style={{ color: 'var(--slate)' }}>Root cause:</span> {rca.root_cause}</div>
                                {Array.isArray(rca.five_whys) && rca.five_whys.length > 0 && (
                                  <div style={{ color: 'var(--slate)', fontSize: '0.78rem', marginTop: '4px' }}>{rca.five_whys.map((w, i) => `${i + 1}. ${w}`).join('  →  ')}</div>
                                )}
                              </div>
                              {isOwner && <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 10px', fontSize: '0.75rem', height: 'fit-content' }} onClick={() => handleDeleteRca(rca.id)}>Delete</button>}
                            </div>

                            {/* CAPA actions */}
                            <div style={{ marginTop: '12px', display: 'grid', gap: '6px' }}>
                              {actions.map((capa) => (
                                <div key={capa.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '8px 12px' }}>
                                  <span style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: capa.action_type === 'preventive' ? '#34D399' : '#60A5FA' }}>{capa.action_type}</span>
                                  <span style={{ flex: 1, minWidth: '140px', color: 'white', fontSize: '0.85rem' }}>{capa.description}{capa.due_date && <span style={{ color: 'var(--slate)', fontSize: '0.75rem' }}> · due {new Date(capa.due_date).toLocaleDateString('en-IN')}</span>}</span>
                                  <button className="vault-btn vault-btn-ghost" style={{ padding: '3px 10px', fontSize: '0.72rem' }} onClick={() => cycleCapaStatus(capa)}>{capa.status === 'open' ? 'Open' : capa.status === 'done' ? 'Done' : 'Verified ✓'}</button>
                                  {capa.action_type === 'preventive' && (capa.applied_to_pm
                                    ? <span style={{ fontSize: '0.72rem', color: '#25D366', fontWeight: 600 }}>In PM ✓</span>
                                    : <button className="vault-btn vault-btn-primary" style={{ padding: '3px 10px', fontSize: '0.72rem', background: 'var(--brand)', color: '#000' }} disabled={relSaving} onClick={() => applyCapaToPm(capa)}>Add to PM</button>)}
                                  {isOwner && <button className="vault-btn vault-btn-ghost" style={{ padding: '3px 8px', fontSize: '0.72rem' }} onClick={() => handleDeleteCapa(capa.id)}>✕</button>}
                                </div>
                              ))}
                            </div>

                            {capaForRca === rca.id ? (
                              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                                <select value={capaType} onChange={(e) => setCapaType(e.target.value)} style={{ width: '130px' }}>
                                  <option value="preventive">Preventive</option>
                                  <option value="corrective">Corrective</option>
                                </select>
                                <input value={capaDesc} onChange={(e) => setCapaDesc(e.target.value)} placeholder="Action to take" style={{ flex: 1, minWidth: '160px' }} />
                                <select value={capaOwner} onChange={(e) => setCapaOwner(e.target.value)} style={{ width: '150px' }}>
                                  <option value="">Owner (optional)</option>
                                  {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
                                </select>
                                <input type="date" value={capaDue} onChange={(e) => setCapaDue(e.target.value)} style={{ width: '150px' }} />
                                <button className="vault-btn vault-btn-primary" style={{ background: 'var(--brand)', color: '#000' }} disabled={relSaving} onClick={() => handleAddCapa(rca)}>Add</button>
                                <button className="vault-btn vault-btn-ghost" onClick={() => { setCapaForRca(null); setCapaDesc(''); }}>Cancel</button>
                              </div>
                            ) : (
                              <button className="vault-btn vault-btn-ghost" style={{ marginTop: '10px', padding: '4px 12px', fontSize: '0.78rem' }} onClick={() => { setCapaForRca(rca.id); setCapaType('preventive'); setCapaDesc(''); setCapaOwner(''); setCapaDue(''); }}>+ Add corrective / preventive action</button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: CONSUMABLE REPLENISHMENT CALENDAR */}
              {wsTab === 'calendar' && (
                <div>
                  <div className="cal">
                    <div className="cal-bar">
                      <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} onClick={() => {
                        if (currentMonth === 0) {
                          setCurrentMonth(11);
                          setCurrentYear(y => y - 1);
                        } else {
                          setCurrentMonth(m => m - 1);
                        }
                      }}>← Prev</button>
                      
                      <span className="m">{monthNames[currentMonth]} {currentYear}</span>
                      
                      <button className="vault-btn vault-btn-ghost" style={{ padding: '4px 12px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.12)', color: 'white' }} onClick={() => {
                        if (currentMonth === 11) {
                          setCurrentMonth(0);
                          setCurrentYear(y => y + 1);
                        } else {
                          setCurrentMonth(m => m + 1);
                        }
                      }}>Next →</button>
                      
                      <div className="leg">
                        <span className="chip warn"><span className="dot"></span>Order-by</span>
                        <span className="chip" style={{ color: '#60A5FA' }}><span className="dot" style={{ background: '#60A5FA' }}></span>Replace-due</span>
                        <span className="chip crit"><span className="dot"></span>Overdue</span>
                      </div>
                    </div>
                    
                    <div className="cal-grid">
                      <div className="cal-dow">Mon</div>
                      <div className="cal-dow">Tue</div>
                      <div className="cal-dow">Wed</div>
                      <div className="cal-dow">Thu</div>
                      <div className="cal-dow">Fri</div>
                      <div className="cal-dow">Sat</div>
                      <div className="cal-dow">Sun</div>
                      {renderCalendarCells()}
                    </div>
                  </div>
                  <p className="cal-cap" style={{ color: 'var(--slate)', fontSize: '0.8rem', marginTop: '12px' }}>Replenishment markers are dynamically computed based on stock levels, daily burn rates, lead times, and cycle counts.</p>
                </div>
              )}

              {/* TAB 6: QR CODE */}
              {wsTab === 'qr' && (
                <div className="printable-sticker-tag" style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div className="sticker-brand" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '14px' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 0 3px rgba(245,158,11,0.6))' }}><path d="M13 2L4.5 13.5H11l-1 8.5L19.5 10H12l1-8z" fill="#f59e0b" /></svg>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '1px', color: '#fff', fontFamily: 'Rajdhani, sans-serif' }}>TURBOFIX</span>
                  </div>
                  <h3 className="sticker-title" style={{ margin: '0 0 10px', fontFamily: 'Rajdhani, sans-serif', fontSize: '1.25rem', textTransform: 'uppercase', color: 'white' }}>{selectedMachine.machine_name} Tag</h3>
                  <p className="sticker-desc" style={{ fontSize: '0.85rem', color: 'var(--slate)', marginBottom: '16px' }}>Scan with WhatsApp to report breakdown events directly.</p>
                  
                  <div className="sticker-qr-box" style={{ background: 'white', padding: '14px', borderRadius: '8px', display: 'inline-block', margin: '0 auto 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)' }}>
                    <QRCodeSVG
                      value={selectedMachine.wa_link || `https://wa.me/?text=Issue with ${selectedMachine.machine_id}: `}
                      size={180}
                    />
                  </div>

                  <div className="sticker-id" style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'white', letterSpacing: '1px', fontFamily: 'monospace' }}>
                    {selectedMachine.machine_id}
                  </div>
                  <div className="sticker-loc" style={{ fontSize: '0.8rem', color: 'var(--slate)', marginTop: '4px' }}>
                    Location: {selectedMachine.location || '—'}
                  </div>
                  <div className="sticker-instruction" style={{ fontSize: '0.72rem', color: 'var(--slate)', marginTop: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Scan QR to report breakdown instantly
                  </div>

                  <button className="vault-btn vault-btn-primary sticker-print-btn" style={{ marginTop: '18px', maxWidth: '200px', margin: '18px auto 0', background: 'var(--brand)', color: '#000' }} onClick={() => window.print()}>
                    Print Tag
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {reportIssueOpen && selectedMachine && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }} onClick={() => !issueSaving && setReportIssueOpen(false)}>
            <div style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 4px', color: 'white', fontFamily: 'Rajdhani, sans-serif', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Report issue</h3>
              <p style={{ margin: '0 0 16px', color: 'var(--slate)', fontSize: '0.85rem' }}>{selectedMachine.machine_name} · {selectedMachine.location || 'Plant floor'}{selectedMachine.assignments?.technician?.name ? ` · Technician: ${selectedMachine.assignments.technician.name}` : ' · No technician assigned'}</p>
              {reportIssueError && <div style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#fca5a5', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '0.85rem' }}>{reportIssueError}</div>}
              <label style={{ display: 'block', color: 'var(--slate)', fontSize: '0.8rem', marginBottom: '6px' }}>What is the problem?</label>
              <textarea value={issueText} onChange={(e) => setIssueText(e.target.value)} rows={4} autoFocus placeholder="Describe the breakdown or symptom" style={{ width: '100%', background: '#111827', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', marginBottom: '14px', resize: 'vertical', fontFamily: 'inherit' }} />
              <label style={{ display: 'block', color: 'var(--slate)', fontSize: '0.8rem', marginBottom: '6px' }}>Urgency</label>
              <select value={issueUrgency} onChange={(e) => setIssueUrgency(e.target.value)} style={{ width: '100%', background: '#111827', color: 'white', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '10px', marginBottom: '20px' }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => setReportIssueOpen(false)} disabled={issueSaving} style={{ background: 'transparent', color: 'var(--slate)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '9px 16px', cursor: 'pointer' }}>Cancel</button>
                <a
                  href={`mailto:log-issue@turbofix.com?subject=${encodeURIComponent(`[Breakdown] Machine ${selectedMachine.machine_id} - ${selectedMachine.machine_name}`)}&body=${encodeURIComponent(`Hi TurboFix,\n\nPlease log a breakdown ticket for the following machine:\n\nMachine ID: ${selectedMachine.machine_id}\nMachine Name: ${selectedMachine.machine_name}\nLocation: ${selectedMachine.location || 'Shop floor'}\nUrgency: ${issueUrgency.toUpperCase()}\n\nProblem Description:\n${issueText.trim() || '[Please describe the symptoms/problem here]'}\n\nThank you!`)}`}
                  onClick={() => setReportIssueOpen(false)}
                  style={{ textDecoration: 'none', background: 'rgba(255,255,255,0.06)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', padding: '9px 16px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
                >
                  <Mail size={14} /> Report via Email
                </a>
                <button type="button" onClick={reportIssue} disabled={issueSaving || !issueText.trim()} style={{ background: 'var(--brand)', color: '#000', border: 'none', borderRadius: '8px', padding: '9px 16px', fontWeight: 600, cursor: issueSaving || !issueText.trim() ? 'not-allowed' : 'pointer', opacity: issueSaving || !issueText.trim() ? 0.6 : 1 }}>{issueSaving ? 'Reporting…' : 'Create ticket'}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
