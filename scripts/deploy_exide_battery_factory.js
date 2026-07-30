import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcqgbleppiaddgfjrnpq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWdibGVwcGlhZGRnZmpybnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Njg0NTAsImV4cCI6MjA5OTM0NDQ1MH0.FAOQMRMjOXrw4YsDf_wv4IhaUiXGoGB1q8Ye-ty2j7c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const COMPANY_DOMAIN = 'exidebattery';
const COMPANY_NAME = 'Exide Energy Industries - Lead Acid Battery Division';

async function runExideBatterySimulation() {
  console.log('----------------------------------------------------');
  console.log('🔋 DEPLOYING 5 AGENTS FOR EXIDE LEAD-ACID BATTERY PLANT');
  console.log('====================================================');
  console.log(`Factory: ${COMPANY_NAME} (${COMPANY_DOMAIN})`);
  console.log('----------------------------------------------------\n');

  // STEP 1: AGENT 1 - Plant MD / Operations Director (Anil Subrahmanian)
  console.log('🤖 [AGENT 1: PLANT DIRECTOR - Anil Subrahmanian]');
  console.log('  -> Action: Provisioning Exide Battery Plant Workspace & Allocating Quotas...');
  
  const { data: existingComp } = await supabase
    .from('companies')
    .select('id, domain')
    .ilike('domain', COMPANY_DOMAIN)
    .maybeSingle();

  let companyId = existingComp?.id;

  if (!companyId) {
    const { data: newComp, error: compErr } = await supabase
      .from('companies')
      .insert({
        domain: COMPANY_DOMAIN,
        name: COMPANY_NAME,
        status: 'approved',
        user_quota: 30,
        machine_quota: 25,
        owner_name: 'Anil Subrahmanian',
        owner_email: 'md@exidebattery.in',
      })
      .select('id')
      .single();

    if (compErr) {
      console.error('❌ Agent 1 Error creating Exide company:', compErr.message);
    } else {
      companyId = newComp.id;
      console.log(`  ✅ Exide Battery Factory Registered (ID: ${companyId})`);
    }
  } else {
    console.log(`  ℹ️ Exide Factory Domain Active (ID: ${companyId})`);
  }

  // 1b. Create Owner User
  const ownerUser = {
    id: `e1111111-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Anil Subrahmanian (VP Operations)',
    role: 'owner',
    email: 'owner@exidebattery.in',
    phone: '+919820123401',
    department: 'Plant Executive Office',
    portal_access: true,
  };
  await supabase.from('users').upsert(ownerUser, { onConflict: 'email' });
  console.log('  ✅ Agent 1 Profile Created: Anil Subrahmanian (Exide VP Operations)');


  // STEP 2: AGENT 2 - Shift Supervisor (Ramesh Chander)
  console.log('\n🤖 [AGENT 2: SHIFT SUPERVISOR - Ramesh Chander]');
  console.log('  -> Action: Onboarding 5 Lead-Battery Manufacturing Lines & Equipment...');

  const supUser = {
    id: `e2222222-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Ramesh Chander (Lead Battery Shift Supervisor)',
    role: 'supervisor',
    email: 'supervisor@exidebattery.in',
    phone: '+919820123402',
    department: 'Battery Manufacturing Floor',
    portal_access: true,
  };
  await supabase.from('users').upsert(supUser, { onConflict: 'email' });
  console.log('  ✅ Agent 2 Profile Created: Ramesh Chander (Battery Shift Supervisor)');

  const exideMachines = [
    {
      company_id: companyId,
      name: 'EXD-GRID-CAST-01 (Wirtz Lead Grid Caster)',
      location: 'Grid Casting Shop - Line 1',
      status: 'down',
      replacement_cost: 6500000,
      hourly_downtime_cost: 14500,
      category: 'Grid Caster',
      department: 'Grid Casting',
      criticality: 'critical',
    },
    {
      company_id: companyId,
      name: 'EXD-PASTE-MIX-02 (Eirich Lead Oxide Mixer)',
      location: 'Pasting Shop - Unit 2',
      status: 'down',
      replacement_cost: 8200000,
      hourly_downtime_cost: 18000,
      category: 'Oxide Paste Mixer',
      department: 'Plate Pasting',
      criticality: 'critical',
    },
    {
      company_id: companyId,
      name: 'EXD-COS-ASSY-03 (Sovema Cast-On-Strap Machine)',
      location: 'Battery Assembly Line 3',
      status: 'running',
      replacement_cost: 11500000,
      hourly_downtime_cost: 22000,
      category: 'COS Assembly',
      department: 'Final Assembly',
      criticality: 'critical',
    },
    {
      company_id: companyId,
      name: 'EXD-CURE-OVEN-01 (Flash Curing Chamber)',
      location: 'Plate Curing Bay A',
      status: 'running',
      replacement_cost: 4800000,
      hourly_downtime_cost: 8500,
      category: 'Curing Oven',
      department: 'Plate Curing',
      criticality: 'high',
    },
    {
      company_id: companyId,
      name: 'EXD-FORM-CHG-04 (Digatron Formation Charger)',
      location: 'Formation Tank Bay 2',
      status: 'issues',
      replacement_cost: 7400000,
      hourly_downtime_cost: 11000,
      category: 'Formation Rectifier',
      department: 'Battery Formation',
      criticality: 'high',
    },
  ];

  const insertedMachines = [];
  for (const mData of exideMachines) {
    const { data: existingM } = await supabase
      .from('machines')
      .select('id, name')
      .eq('name', mData.name)
      .maybeSingle();

    if (!existingM) {
      const { data: inserted, error: mErr } = await supabase.from('machines').insert(mData).select().single();
      if (inserted) insertedMachines.push(inserted);
      else if (mErr) console.warn('  ⚠️ Exide Machine insert notice:', mErr.message);
    } else {
      insertedMachines.push(existingM);
    }
  }
  console.log(`  ✅ Agent 2 Onboarded ${insertedMachines.length} Exide Battery Manufacturing Machines.`);


  // STEP 3: AGENT 3 - Senior Reliability Engineer (Dr. Arindam Banerjee)
  console.log('\n🤖 [AGENT 3: RELIABILITY ENGINEER - Dr. Arindam Banerjee]');
  console.log('  -> Action: Diagnosing Battery Line Failures & Logging Critical Breakdown Work Orders...');

  const engUser = {
    id: `e3333333-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Dr. Arindam Banerjee (Sr. Battery Reliability Engineer)',
    role: 'maintenance_engineer',
    email: 'engineer@exidebattery.in',
    phone: '+919820123403',
    department: 'Process & Reliability Engineering',
    portal_access: true,
  };
  await supabase.from('users').upsert(engUser, { onConflict: 'email' });
  console.log('  ✅ Agent 3 Profile Created: Dr. Arindam Banerjee (Reliability Lead)');

  const pasteMixer = insertedMachines.find(m => m.name.includes('PASTE'));
  const gridCaster = insertedMachines.find(m => m.name.includes('GRID'));
  const formationCharger = insertedMachines.find(m => m.name.includes('FORM'));

  const batteryTickets = [
    {
      machine_id: pasteMixer?.id || insertedMachines[1]?.id,
      issue_text: 'Lead oxide paste mixer drive motor thermal overload trip. High paste density viscosity causing mechanical jam in mixing chamber.',
      urgency: 'critical',
      status: 'open',
      type: 'breakdown',
      wo_number: `WO-EXD-${Math.floor(1000 + Math.random() * 9000)}`,
      reporter_phone: '+919820123403',
    },
    {
      machine_id: gridCaster?.id || insertedMachines[0]?.id,
      issue_text: 'Grid mold orifice temperature fluctuation causing grid thickness variation超出 ±0.05mm lead casting tolerance.',
      urgency: 'high',
      status: 'in_progress',
      type: 'breakdown',
      wo_number: `WO-EXD-${Math.floor(1000 + Math.random() * 9000)}`,
      reporter_phone: '+919820123403',
    },
    {
      machine_id: formationCharger?.id || insertedMachines[4]?.id,
      issue_text: 'Formation Tank 2 Rectifier Circuit #4 current ripple exceeded 3.5% limits. Thyristor cooling fan failure.',
      urgency: 'medium',
      status: 'open',
      type: 'breakdown',
      wo_number: `WO-EXD-${Math.floor(1000 + Math.random() * 9000)}`,
      reporter_phone: '+919820123403',
    },
  ];

  const insertedTickets = [];
  for (const tData of batteryTickets) {
    if (!tData.machine_id) continue;
    const { data: tRes, error: tErr } = await supabase.from('tickets').insert(tData).select().single();
    if (tRes) insertedTickets.push(tRes);
    else if (tErr) console.warn('  ⚠️ Exide Ticket insert notice:', tErr.message);
  }
  console.log(`  ✅ Agent 3 Logged ${insertedTickets.length} Critical Exide Battery Breakdown Tickets.`);


  // STEP 4: AGENT 4 - Lead Battery Technician (Manoj Mukherjee)
  console.log('\n🤖 [AGENT 4: LEAD TECHNICIAN - Manoj Mukherjee]');
  console.log('  -> Action: Repairing Lead Grid Caster Thermocouple & Calibrating Casting Mold...');

  const techUser = {
    id: `e4444444-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Manoj Mukherjee (Sr. Lead Battery Technician)',
    role: 'technician',
    email: 'technician@exidebattery.in',
    phone: '+919820123404',
    department: 'Electro-Mechanical Maintenance',
    portal_access: true,
  };
  await supabase.from('users').upsert(techUser, { onConflict: 'email' });
  console.log('  ✅ Agent 4 Profile Created: Manoj Mukherjee (Sr. Battery Technician)');

  // Resolve Ticket 2 (Grid Caster Temperature Fluctuation)
  const ticketToResolve = insertedTickets.find(t => t.urgency === 'high') || insertedTickets[0];
  if (ticketToResolve) {
    await supabase.from('tickets').update({
      status: 'resolved',
      root_cause: 'Lead grid casting mold zone 2 PID temperature controller thermocouple sensor drift.',
      repair_action: 'Replaced Type-K lead-pot thermocouple assembly, recalibrated PID controller to 480°C, and ran 100-grid test cast.',
      parts_used: '1x Heavy-Duty Lead-Pot Thermocouple Probe, 1x Omron E5CC PID Controller Unit',
      resolved_at: new Date().toISOString(),
    }).eq('id', ticketToResolve.id);
    console.log(`  ✅ Agent 4 Completed Repair Work Order ${ticketToResolve.wo_number || ticketToResolve.id}`);
  }


  // STEP 5: AGENT 5 - Battery Quality & EHS Auditor (Sneha Kulkarni)
  console.log('\n🤖 [AGENT 5: QUALITY & EHS AUDITOR - Sneha Kulkarni]');
  console.log('  -> Action: Conducting Lead Acid Safety & Plate Thickness Clearance Audit...');

  const safetyUser = {
    id: `e5555555-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Sneha Kulkarni (Quality & EHS Compliance Manager)',
    role: 'quality_inspector',
    email: 'safety@exidebattery.in',
    phone: '+919820123405',
    department: 'Quality Control & Lead Safety',
    portal_access: true,
  };
  await supabase.from('users').upsert(safetyUser, { onConflict: 'email' });
  console.log('  ✅ Agent 5 Profile Created: Sneha Kulkarni (Quality & EHS Manager)');

  if (gridCaster?.id) {
    await supabase.from('machines').update({ status: 'running' }).eq('id', gridCaster.id);
    console.log('  ✅ Agent 5 Verified Lead Grid Casting Quality (Weight: 142g ±1g) & Released Line 1 for Production.');
  }

  console.log('\n====================================================');
  console.log('🎉 5-AGENT EXIDE BATTERY MANUFACTURING SIMULATION SUCCESSFUL!');
  console.log('====================================================');
  console.log(`Factory Domain: exidebattery`);
  console.log(`Company Name:   ${COMPANY_NAME}`);
  console.log(`Demo Users:     owner@exidebattery.in, supervisor@exidebattery.in, engineer@exidebattery.in, technician@exidebattery.in, safety@exidebattery.in`);
  console.log(`Equipment:      5 High-Capacity Lead-Acid Battery Lines Onboarded`);
  console.log(`Breakdowns:     3 Real Exide Production Work Orders Processed`);
  console.log('----------------------------------------------------');
}

runExideBatterySimulation().catch(console.error);
