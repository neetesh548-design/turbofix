/**
 * Demo Kaizen ideas — the fallback when Supabase returns nothing.
 *
 * Shaped deliberately, not randomly: the set has to light up all three
 * boards at once. It contains ideas at every funnel stage, a deliberate
 * pile-up at "submitted" so the manager board has a real bottleneck to
 * flag, ideas that beat their forecast and one that undershot it, and
 * enough history for a six-month submission trend to have a slope.
 *
 * Dates are all relative to load time so the demo never goes stale.
 */

const day = 24 * 60 * 60 * 1000;
const ago = (days) => new Date(Date.now() - days * day).toISOString();
const ahead = (days) => new Date(Date.now() + days * day).toISOString().split('T')[0];

/** Free, licence-clear stock imagery standing in for shop-floor photos. */
const PHOTO = {
  scrapBefore: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=640&auto=format&fit=crop',
  scrapAfter: 'https://images.unsplash.com/photo-1581092162613-f54843a91034?w=640&auto=format&fit=crop',
  guardBefore: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=640&auto=format&fit=crop',
  guardAfter: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=640&auto=format&fit=crop',
  airBefore: 'https://images.unsplash.com/photo-1597491853414-998fe05c56c2?w=640&auto=format&fit=crop',
  shopBefore: 'https://images.unsplash.com/photo-1565043666747-69f6646db940?w=640&auto=format&fit=crop',
  shopAfter: 'https://images.unsplash.com/photo-1567789884554-0b844b597180?w=640&auto=format&fit=crop',
};

export const DEMO_KAIZENS = [
  /* ---- standardised: money already banked ---- */
  {
    id: 'KZN-2026-001',
    title: 'Relocate scrap bin to the unloading table',
    proposal:
      'Operator walks 5 metres with punch residue after every 15 cycles. A small bin beside the unloading table removes the walk entirely.',
    machine_id: 'M001',
    category: 'simplification',
    waste_category: 'motion',
    estimated_impact: 'medium',
    estimated_cost: 1500,
    estimated_saving: 18000,
    realized_savings: 24000,
    status: 'closed',
    standardisation_status: 'checklist',
    created_by_name: 'Anil Kumar',
    created_at: ago(96),
    due_date: ahead(-84),
    verified_by_name: 'S. Patil',
    verified_at: ago(78),
    trial_duration_shifts: 6,
    before_photo_url: PHOTO.scrapBefore,
    after_photo_url: PHOTO.scrapAfter,
  },
  {
    id: 'KZN-2026-002',
    title: 'Shadow board for press-shop hand tools',
    proposal:
      'Spanners and allen keys live in a shared drawer; each setup change loses 6-8 minutes to searching. A shadow board at the press gives every tool a marked home.',
    machine_id: 'M004',
    category: '5s',
    waste_category: 'motion',
    estimated_impact: 'medium',
    estimated_cost: 4200,
    estimated_saving: 52000,
    realized_savings: 61000,
    status: 'closed',
    standardisation_status: 'sop',
    created_by_name: 'Anil Kumar',
    created_at: ago(72),
    due_date: ahead(-52),
    verified_by_name: 'S. Patil',
    verified_at: ago(48),
    trial_duration_shifts: 8,
    before_photo_url: PHOTO.shopBefore,
    after_photo_url: PHOTO.shopAfter,
  },
  {
    id: 'KZN-2026-003',
    title: 'Cut coolant top-up frequency with a sight glass',
    proposal:
      'Coolant level is checked by opening the tank, so it gets topped up "just in case". A sight glass on the tank wall makes the level visible without opening it.',
    machine_id: 'M002',
    category: 'material_saving',
    waste_category: 'overprocessing',
    estimated_impact: 'medium',
    estimated_cost: 2600,
    estimated_saving: 40000,
    // Undershot its forecast — the manager table renders this one red.
    realized_savings: 21000,
    status: 'closed',
    standardisation_status: 'checklist',
    created_by_name: 'Ramesh Sawant',
    created_at: ago(64),
    due_date: ahead(-40),
    verified_by_name: 'S. Patil',
    verified_at: ago(35),
    trial_duration_shifts: 5,
  },

  /* ---- verified: proven, waiting to be written into a standard ---- */
  {
    id: 'KZN-2026-004',
    title: 'Install a guard over limit switch LS-2',
    proposal:
      'LS-2 is struck by falling blanks and fails roughly monthly, taking the line down each time. A sheet-metal deflector shields it for the cost of offcut stock.',
    machine_id: 'M002',
    category: 'breakdown_prevention',
    waste_category: 'defects',
    estimated_impact: 'high',
    estimated_cost: 800,
    estimated_saving: 60000,
    realized_savings: 85000,
    status: 'verified',
    standardisation_status: 'pm_checklist',
    created_by_name: 'Ramesh Sawant',
    created_at: ago(41),
    due_date: ahead(-8),
    verified_by_name: 'S. Patil',
    verified_at: ago(3),
    trial_duration_shifts: 4,
    before_photo_url: PHOTO.guardBefore,
    after_photo_url: PHOTO.guardAfter,
  },
  {
    id: 'KZN-2026-005',
    title: 'Pre-stage the next die trolley before changeover',
    proposal:
      'The next die is fetched only after the press stops. Staging it on a trolley during the previous run takes 11 minutes out of every changeover.',
    machine_id: 'M004',
    category: 'productivity',
    waste_category: 'waiting',
    estimated_impact: 'high',
    estimated_cost: 9000,
    estimated_saving: 130000,
    realized_savings: 148000,
    status: 'standardisation_pending',
    standardisation_status: 'sop',
    created_by_name: 'Vijay Deshmukh',
    created_at: ago(38),
    due_date: ahead(-5),
    verified_by_name: 'S. Patil',
    verified_at: ago(2),
    trial_duration_shifts: 10,
  },

  /* ---- in trial ---- */
  {
    id: 'KZN-2026-006',
    title: 'Timer switch on the air-compressor solenoid',
    proposal:
      'The solenoid vents air through lunch and shift breaks. A timer cuts the feed automatically after 15 minutes of no production.',
    machine_id: 'M001',
    category: 'energy_saving',
    waste_category: 'waiting',
    estimated_impact: 'high',
    estimated_cost: 3200,
    estimated_saving: 96000,
    status: 'in_progress',
    standardisation_status: 'no_update_required',
    created_by_name: 'Vijay Deshmukh',
    assigned_to_name: 'Ramesh Sawant',
    created_at: ago(19),
    trial_started_at: ago(9),
    due_date: ahead(5),
    trial_duration_shifts: 12,
    before_photo_url: PHOTO.airBefore,
  },
  {
    id: 'KZN-2026-007',
    title: 'Anti-fatigue matting at the inspection bench',
    proposal:
      'Inspectors stand on bare concrete for a full shift. Matting cuts the standing-fatigue complaints that drive the late-shift rejection spike.',
    machine_id: 'M003',
    category: 'ergonomics',
    waste_category: 'talent',
    estimated_impact: 'medium',
    estimated_cost: 7500,
    estimated_saving: 36000,
    status: 'implemented',
    standardisation_status: 'no_update_required',
    created_by_name: 'Sunita Raut',
    assigned_to_name: 'Anil Kumar',
    created_at: ago(24),
    trial_started_at: ago(14),
    // Already past its target date — the supervisor board flags it overdue.
    due_date: ahead(-2),
    trial_duration_shifts: 9,
  },

  /* ---- approved, trial not started ---- */
  {
    id: 'KZN-2026-008',
    title: 'Colour-code the hydraulic hose couplings',
    proposal:
      'Return and pressure lines look identical and have been cross-connected twice this year. Colour bands make a wrong connection visible before start-up.',
    machine_id: 'M002',
    category: 'safety',
    waste_category: 'defects',
    estimated_impact: 'high',
    estimated_cost: 600,
    estimated_saving: 45000,
    status: 'approved',
    standardisation_status: 'no_update_required',
    created_by_name: 'Sunita Raut',
    created_at: ago(11),
    approved_at: ago(4),
    due_date: ahead(12),
  },
  {
    id: 'KZN-2026-009',
    title: 'Single-page setup sheet at the CNC station',
    proposal:
      'Setup parameters live in a 40-page binder. A laminated one-page card for the top six part numbers covers 80% of the setups.',
    machine_id: 'M003',
    category: 'quality',
    waste_category: 'overprocessing',
    estimated_impact: 'medium',
    estimated_cost: 1200,
    estimated_saving: 28000,
    status: 'planned',
    standardisation_status: 'no_update_required',
    created_by_name: 'Anil Kumar',
    created_at: ago(9),
    approved_at: ago(3),
    due_date: ahead(18),
  },

  /* ---- submitted: the queue, deliberately the largest band ---- */
  {
    id: 'KZN-2026-010',
    title: 'LED task lighting over the deburring bench',
    proposal:
      'Overhead lighting leaves the bench in shadow, so burrs get missed and come back as customer complaints. Two LED task lamps fix it.',
    machine_id: 'M003',
    category: 'quality',
    waste_category: 'defects',
    estimated_impact: 'medium',
    estimated_cost: 3400,
    estimated_saving: 42000,
    status: 'submitted',
    standardisation_status: 'no_update_required',
    created_by_name: 'Sunita Raut',
    created_at: ago(6),
  },
  {
    id: 'KZN-2026-011',
    title: 'Reuse packing crates from inward stores',
    proposal:
      'Inward crates are scrapped while dispatch buys new ones. Sorting the reusable ones at the gate covers roughly a third of dispatch demand.',
    machine_id: 'M001',
    category: 'cost_reduction',
    waste_category: 'inventory',
    estimated_impact: 'medium',
    estimated_cost: 0,
    estimated_saving: 66000,
    status: 'submitted',
    standardisation_status: 'no_update_required',
    created_by_name: 'Vijay Deshmukh',
    created_at: ago(4),
  },
  {
    id: 'KZN-2026-012',
    title: 'Trolley parking bays marked on the floor',
    proposal:
      'Trolleys are parked wherever they land and block the fire aisle. Painted bays give each one a place and keep the aisle clear.',
    machine_id: 'M004',
    category: 'safety',
    waste_category: 'transportation',
    estimated_impact: 'medium',
    estimated_cost: 1800,
    estimated_saving: 15000,
    status: 'submitted',
    standardisation_status: 'no_update_required',
    created_by_name: 'Anil Kumar',
    created_at: ago(3),
  },
  {
    id: 'KZN-2026-013',
    title: 'Batch the weekly grease rounds by aisle',
    proposal:
      'The grease round follows the asset register, which zig-zags across the shop. Re-sequencing it by aisle saves about 25 minutes a round.',
    machine_id: 'M002',
    category: 'productivity',
    waste_category: 'motion',
    estimated_impact: 'low',
    estimated_cost: 0,
    estimated_saving: 12000,
    status: 'need_information',
    standardisation_status: 'no_update_required',
    created_by_name: 'Ramesh Sawant',
    created_at: ago(2),
    review_comment: 'Which aisles are covered? Attach the current round sheet and we can approve this.',
  },
  {
    id: 'KZN-2026-014',
    title: 'Second scrap chute on the blanking press',
    proposal:
      'One chute jams roughly twice a shift and the press waits while it is cleared. A second chute splits the flow.',
    machine_id: 'M004',
    category: 'breakdown_prevention',
    waste_category: 'waiting',
    estimated_impact: 'high',
    estimated_cost: 22000,
    estimated_saving: 90000,
    status: 'submitted',
    standardisation_status: 'no_update_required',
    created_by_name: 'Sunita Raut',
    created_at: ago(1),
  },

  /* ---- rejected: excluded from every savings roll-up ---- */
  {
    id: 'KZN-2026-015',
    title: 'Replace all pneumatic tools with cordless',
    proposal: 'Cordless tools would remove the air-line clutter around the assembly bench.',
    machine_id: 'M003',
    category: 'productivity',
    waste_category: 'motion',
    estimated_impact: 'low',
    estimated_cost: 340000,
    estimated_saving: 30000,
    status: 'rejected',
    standardisation_status: 'no_update_required',
    created_by_name: 'Vijay Deshmukh',
    created_at: ago(30),
    review_comment: 'Payback is over eleven years. Revisit when the compressor is due for replacement.',
  },
];

/** The demo operator, so a signed-out visitor still sees a populated "My ideas". */
export const DEMO_OPERATOR = Object.freeze({ name: 'Anil Kumar', role: 'operator' });

/** Nothing came back from the workspace → show the sample plant. */
export function shouldUseDemoKaizen(ideas) {
  return !Array.isArray(ideas) || ideas.length === 0;
}
