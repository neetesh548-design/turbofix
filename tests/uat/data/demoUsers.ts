export const demoUsers = {
  owner: {
    user_id: 'uat_owner_demo',
    name: 'UAT Owner',
    email: 'owner@uat.turbofix.example',
    role: 'owner',
    company_code: 'TFDEMO',
    company_name: 'TurboFix Demo Plant',
    inventory_mode: 'demo',
  },
  supervisor: {
    user_id: 'uat_supervisor_demo',
    name: 'UAT Supervisor',
    email: 'supervisor@uat.turbofix.example',
    role: 'supervisor',
    company_code: 'TFDEMO',
    company_name: 'TurboFix Demo Plant',
    inventory_mode: 'demo',
  },
  technician: {
    user_id: 'u1',
    name: 'UAT Technician',
    email: 'technician@uat.turbofix.example',
    role: 'maintenance_technician',
    company_code: 'TFDEMO',
    company_name: 'TurboFix Demo Plant',
    inventory_mode: 'demo',
  },
  support: {
    user_id: 'uat_support_demo',
    name: 'UAT Support',
    email: 'support@uat.turbofix.example',
    role: 'maintenance_head',
    company_code: 'TFDEMO',
    company_name: 'TurboFix Demo Plant',
    inventory_mode: 'demo',
  },
} as const;

export type DemoUserKey = keyof typeof demoUsers;
