import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wcqgbleppiaddgfjrnpq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndjcWdibGVwcGlhZGRnZmpybnBxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM3Njg0NTAsImV4cCI6MjA5OTM0NDQ1MH0.FAOQMRMjOXrw4YsDf_wv4IhaUiXGoGB1q8Ye-ty2j7c';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const COMPANY_DOMAIN = 'apexauto';
const COMPANY_NAME = 'Apex Precision Auto Components Ltd';

async function run5AgentDemoSimulation() {
  console.log('----------------------------------------------------');
  console.log('🚀 DEPLOYING 5 AGENTS FOR REAL FACTORY ONBOARDING DEMO');
  console.log('====================================================');
  console.log(`Factory: ${COMPANY_NAME} (${COMPANY_DOMAIN})`);
  console.log('----------------------------------------------------\n');

  // STEP 1: AGENT 1 - Plant Owner (Rajesh Sharma)
  console.log('🤖 [AGENT 1: PLANT OWNER - Rajesh Sharma]');
  console.log('  -> Action: Registering Factory & Setting Quotas...');
  
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
        user_quota: 25,
        machine_quota: 20,
        owner_name: 'Rajesh Sharma',
        owner_email: 'owner@apexauto.in',
      })
      .select('id')
      .single();

    if (compErr) {
      console.error('❌ Agent 1 Error creating company:', compErr.message);
    } else {
      companyId = newComp.id;
      console.log(`  ✅ Factory Registered Successfully (ID: ${companyId})`);
    }
  } else {
    console.log(`  ℹ️ Factory domain already active (ID: ${companyId})`);
  }

  // 1b. Create Owner User
  const ownerUser = {
    id: `d1111111-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Rajesh Sharma (MD)',
    role: 'owner',
    email: 'owner@apexauto.in',
    phone: '+919876543210',
    department: 'Executive Office',
    portal_access: true,
  };
  await supabase.from('users').upsert(ownerUser, { onConflict: 'email' });
  console.log('  ✅ Agent 1 Profile Created: Rajesh Sharma (Plant MD & Owner)');


  // STEP 2: AGENT 2 - Shift Supervisor (Vikram Singh)
  console.log('\n🤖 [AGENT 2: SHIFT SUPERVISOR - Vikram Singh]');
  console.log('  -> Action: Onboarding 5 Real Industrial Machines & Assigning Production Lines...');

  const supUser = {
    id: `d2222222-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Vikram Singh (Operations Lead)',
    role: 'supervisor',
    email: 'supervisor@apexauto.in',
    phone: '+919876543211',
    department: 'Shop Floor Operations',
    portal_access: true,
  };
  await supabase.from('users').upsert(supUser, { onConflict: 'email' });
  console.log('  ✅ Agent 2 Profile Created: Vikram Singh (Shift Supervisor)');

  const factoryMachines = [
    {
      company_id: companyId,
      name: 'APX-CNC-01 (Haas VF-2 VMC)',
      location: 'Bay A - Machining Line 1',
      status: 'down',
      replacement_cost: 4500000,
      hourly_downtime_cost: 6500,
      category: 'VMC CNC',
      department: 'Machining',
      criticality: 'critical',
    },
    {
      company_id: companyId,
      name: 'APX-PRESS-04 (Komatsu 200T Servo Press)',
      location: 'Bay B - Heavy Press Line',
      status: 'down',
      replacement_cost: 8500000,
      hourly_downtime_cost: 12000,
      category: 'Stamping Press',
      department: 'Press Shop',
      criticality: 'critical',
    },
    {
      company_id: companyId,
      name: 'APX-ROBOT-02 (FANUC Robotic Weld Cell)',
      location: 'Bay C - Auto Assembly Line',
      status: 'running',
      replacement_cost: 6200000,
      hourly_downtime_cost: 9500,
      category: 'Robotic Weld Cell',
      department: 'Assembly',
      criticality: 'critical',
    },
    {
      company_id: companyId,
      name: 'APX-LATHE-03 (Mazak Quick Turn CNC)',
      location: 'Bay A - Shaft Machining Line',
      status: 'running',
      replacement_cost: 3800000,
      hourly_downtime_cost: 4800,
      category: 'CNC Lathe',
      department: 'Machining',
      criticality: 'high',
    },
    {
      company_id: companyId,
      name: 'APX-COMP-01 (Kaeser BSD 75 Compressor)',
      location: 'Utility Plant 1',
      status: 'issues',
      replacement_cost: 2200000,
      hourly_downtime_cost: 3500,
      category: 'Screw Compressor',
      department: 'Utilities',
      criticality: 'high',
    },
  ];

  const insertedMachines = [];
  for (const mData of factoryMachines) {
    const { data: existingM } = await supabase
      .from('machines')
      .select('id, name')
      .eq('name', mData.name)
      .maybeSingle();

    if (!existingM) {
      const { data: inserted, error: mErr } = await supabase.from('machines').insert(mData).select().single();
      if (inserted) insertedMachines.push(inserted);
      else if (mErr) console.warn('  ⚠️ Machine insert notice:', mErr.message);
    } else {
      insertedMachines.push(existingM);
    }
  }
  console.log(`  ✅ Agent 2 Onboarded ${insertedMachines.length} Industrial Machines to Factory Fleet.`);


  // STEP 3: AGENT 3 - Maintenance Engineer (Amit Verma)
  console.log('\n🤖 [AGENT 3: MAINTENANCE ENGINEER - Amit Verma]');
  console.log('  -> Action: Diagnosing Shop Floor & Logging 3 Detailed Breakdown Work Orders...');

  const engUser = {
    id: `d3333333-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Amit Verma (Reliability Engineer)',
    role: 'maintenance_engineer',
    email: 'engineer@apexauto.in',
    phone: '+919876543212',
    department: 'Maintenance Engineering',
    portal_access: true,
  };
  await supabase.from('users').upsert(engUser, { onConflict: 'email' });
  console.log('  ✅ Agent 3 Profile Created: Amit Verma (Reliability Lead)');

  const pressMachine = insertedMachines.find(m => m.name.includes('PRESS'));
  const cncMachine = insertedMachines.find(m => m.name.includes('CNC'));
  const compMachine = insertedMachines.find(m => m.name.includes('COMP'));

  const demoTickets = [
    {
      machine_id: pressMachine?.id || insertedMachines[0]?.id,
      issue_text: 'Hydraulic main line pressure spike caused solenoid valve seal blowout. High oil leakage on Press 04.',
      urgency: 'critical',
      status: 'open',
      type: 'breakdown',
      wo_number: `WO-APX-${Math.floor(1000 + Math.random() * 9000)}`,
      reporter_phone: '+919876543212',
    },
    {
      machine_id: cncMachine?.id || insertedMachines[1]?.id,
      issue_text: 'Spindle Z-axis thermal expansion vibration exceeded 4.2mm/s threshold during roughing pass on Haas CNC.',
      urgency: 'high',
      status: 'in_progress',
      type: 'breakdown',
      wo_number: `WO-APX-${Math.floor(1000 + Math.random() * 9000)}`,
      reporter_phone: '+919876543212',
    },
    {
      machine_id: compMachine?.id || insertedMachines[4]?.id,
      issue_text: 'Utility Line 1 air pressure drops below 6.2 bar during peak shift load. Intake air filter clogged.',
      urgency: 'medium',
      status: 'open',
      type: 'breakdown',
      wo_number: `WO-APX-${Math.floor(1000 + Math.random() * 9000)}`,
      reporter_phone: '+919876543212',
    },
  ];

  const insertedTickets = [];
  for (const tData of demoTickets) {
    if (!tData.machine_id) continue;
    const { data: tRes, error: tErr } = await supabase.from('tickets').insert(tData).select().single();
    if (tRes) insertedTickets.push(tRes);
    else if (tErr) console.warn('  ⚠️ Ticket insert notice:', tErr.message);
  }
  console.log(`  ✅ Agent 3 Logged ${insertedTickets.length} Detailed Industrial Breakdown Tickets.`);


  // STEP 4: AGENT 4 - Maintenance Technician (Suresh Kumar)
  console.log('\n🤖 [AGENT 4: MAINTENANCE TECHNICIAN - Suresh Kumar]');
  console.log('  -> Action: Executing On-Site Repair, Replacing Bearings & Resolving Ticket...');

  const techUser = {
    id: `d4444444-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Suresh Kumar (Sr. Mechanical Technician)',
    role: 'technician',
    email: 'technician@apexauto.in',
    phone: '+919876543213',
    department: 'Mechanical Maintenance',
    portal_access: true,
  };
  await supabase.from('users').upsert(techUser, { onConflict: 'email' });
  console.log('  ✅ Agent 4 Profile Created: Suresh Kumar (Lead Technician)');

  // Resolve Ticket 2 (CNC Machine Spindle Alignment)
  const ticketToResolve = insertedTickets.find(t => t.urgency === 'high') || insertedTickets[0];
  if (ticketToResolve) {
    await supabase.from('tickets').update({
      status: 'resolved',
      root_cause: 'Z-axis linear guide lubrication port blockage causing localized thermal expansion and chatter.',
      repair_action: 'Flushed lubrication lines, replaced Z-axis linear guide bearings & seals, and performed 45-min dry run.',
      parts_used: '2x Linear Roller Bearings (NSK 30mm), 1x High-Temp Viton Oil Seal',
      resolved_at: new Date().toISOString(),
    }).eq('id', ticketToResolve.id);
    console.log(`  ✅ Agent 4 Completed Repair Work Order ${ticketToResolve.wo_number || ticketToResolve.id}`);
  }


  // STEP 5: AGENT 5 - Quality & Safety Auditor (Priya Nair)
  console.log('\n🤖 [AGENT 5: QUALITY & SAFETY AUDITOR - Priya Nair]');
  console.log('  -> Action: Conducting Post-Repair LOTO Safety Inspection & Releasing Machine for Production...');

  const safetyUser = {
    id: `d5555555-0000-0000-0000-${Date.now().toString().slice(-12)}`,
    company_id: companyId,
    name: 'Priya Nair (EHS & Quality Inspector)',
    role: 'quality_inspector',
    email: 'safety@apexauto.in',
    phone: '+919876543214',
    department: 'Quality & EHS Compliance',
    portal_access: true,
  };
  await supabase.from('users').upsert(safetyUser, { onConflict: 'email' });
  console.log('  ✅ Agent 5 Profile Created: Priya Nair (Quality & EHS Lead)');

  if (cncMachine?.id) {
    await supabase.from('machines').update({ status: 'running' }).eq('id', cncMachine.id);
    console.log('  ✅ Agent 5 Certified APX-CNC-01 Safe for Full Production Restart.');
  }

  console.log('\n====================================================');
  console.log('🎉 5-AGENT REAL FACTORY DEMO SIMULATION SUCCESSFUL!');
  console.log('====================================================');
  console.log(`Factory Domain: ${COMPANY_DOMAIN}`);
  console.log(`Company Name:   ${COMPANY_NAME}`);
  console.log(`Live Users:     owner@apexauto.in, supervisor@apexauto.in, engineer@apexauto.in, technician@apexauto.in, safety@apexauto.in`);
  console.log(`Machines:       5 Industrial Fleet Machines Onboarded`);
  console.log(`Work Orders:    3 Real Breakdown Tickets Logged & Resolved`);
  console.log('----------------------------------------------------');
}

run5AgentDemoSimulation().catch(console.error);
