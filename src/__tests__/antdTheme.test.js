import { describe, expect, it } from 'vitest';
import { generateAntDTheme } from '../config/antd-theme';

describe('generateAntDTheme', () => {
  it('uses the TurboFix semantic palette and accessible primary text', () => {
    const config = generateAntDTheme(false);

    expect(config.token.colorPrimary).toBe('#25D366');
    expect(config.token.colorSuccess).toBe('#047857');
    expect(config.token.colorWarning).toBe('#B45309');
    expect(config.token.colorError).toBe('#DC2626');
    expect(config.token.colorInfo).toBe('#2563EB');
    expect(config.components.Button.primaryColor).toBe('#0F172A');
  });

  it('keeps headings and controls within the shared design rules', () => {
    const config = generateAntDTheme(true);

    expect(config.token.fontSizeHeading1).toBe(32);
    expect(config.token.controlHeight).toBeGreaterThanOrEqual(44);
    expect(config.token.controlHeightSM).toBeGreaterThanOrEqual(44);
    expect(config.components.Input.controlHeight).toBeGreaterThanOrEqual(44);
    expect(config.components.Select.controlHeight).toBeGreaterThanOrEqual(44);
    expect(config.token.boxShadow).toBe('none');
  });
});
