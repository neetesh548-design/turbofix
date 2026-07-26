import { describe, it, expect } from 'vitest';
import { defaultRoles, getRoleLabel, canViewWorkspace, roleContribution } from '../lib/roles';

describe('src/lib/roles', () => {
  describe('getRoleLabel', () => {
    it('should return label for predefined default roles', () => {
      expect(getRoleLabel('supervisor')).toBe('Maintenance Supervisor');
      expect(getRoleLabel('owner')).toBe('Owner / Plant Director');
      expect(getRoleLabel('maintenance_technician')).toBe('Maintenance Technician');
    });

    it('should return label for custom role if present in customRoles array', () => {
      const customRoles = [
        { role_name: 'quality_inspector', role_label: 'Quality Inspector' }
      ];
      expect(getRoleLabel('quality_inspector', customRoles)).toBe('Quality Inspector');
    });

    it('should fallback to replacing underscores with spaces for unknown roles', () => {
      expect(getRoleLabel('plant_lead')).toBe('plant lead');
      expect(getRoleLabel('electrical_specialist')).toBe('electrical specialist');
    });

    it('should handle null/undefined role gracefully', () => {
      expect(getRoleLabel(null)).toBe('Unknown Role');
      expect(getRoleLabel(undefined)).toBe('Unknown Role');
    });
  });

  describe('canViewWorkspace', () => {
    it('should return true for workspaces permitted for technician', () => {
      expect(canViewWorkspace('maintenance_technician', 'machines')).toBe(true);
      expect(canViewWorkspace('maintenance_technician', 'technician')).toBe(true);
      expect(canViewWorkspace('maintenance_technician', 'records')).toBe(true);
    });

    it('should return false for restricted workspaces for technician', () => {
      expect(canViewWorkspace('maintenance_technician', 'settings')).toBe(false);
      expect(canViewWorkspace('maintenance_technician', 'team')).toBe(false);
    });

    it('should allow owner access to administrative workspaces', () => {
      expect(canViewWorkspace('owner', 'settings')).toBe(true);
      expect(canViewWorkspace('owner', 'team')).toBe(true);
    });

    it('should return true for unmapped or custom roles without restrictions', () => {
      expect(canViewWorkspace('custom_role', 'settings')).toBe(true);
      expect(canViewWorkspace(null, 'settings')).toBe(true);
    });

    // A suggestion scheme only management can open collects nothing. The
    // operator who spots the waste has to be able to reach the form.
    it('should open the kaizen workspace to every mapped role', () => {
      defaultRoles.forEach((role) => {
        expect(canViewWorkspace(role.value, 'kaizen')).toBe(true);
      });
    });

    it('should keep the operator out of workspaces that are not theirs', () => {
      expect(canViewWorkspace('operator', 'settings')).toBe(false);
      expect(canViewWorkspace('operator', 'team')).toBe(false);
      expect(canViewWorkspace('operator', 'tickets')).toBe(false);
    });
  });

  describe('roleContribution', () => {
    it('should return description statement for valid role', () => {
      expect(roleContribution('supervisor')).toBe('Remove blockers and verify normal repair closure.');
      expect(roleContribution('owner')).toContain('Decide only when production risk');
    });

    it('should return default fallback message for unknown roles', () => {
      expect(roleContribution('unknown_role')).toBe('Contribute to safe, reliable issue resolution.');
      expect(roleContribution(null)).toBe('Contribute to safe, reliable issue resolution.');
    });
  });
});
