/**
 * Ant Design Theme Configuration for TurboFix
 * Centralizes design tokens, colors, typography, and layout rules
 */

import { theme } from 'antd';

// TurboFix Brand Colors
const brandColors = {
  primary: '#25D366',
  success: '#047857',
  warning: '#B45309',
  error: '#DC2626',
  info: '#2563EB',
  primaryText: '#0F172A',
};

// Color palette for dark/light modes
const colors = {
  light: {
    bg: '#FFFFFF',
    bgSecondary: '#F5F5F5',
    bgTertiary: '#FAFAFA',
    text: '#000000E0',
    textSecondary: '#00000073',
    border: '#D9D9D9',
    divider: '#F0F0F0',
  },
  dark: {
    bg: '#141414',
    bgSecondary: '#1F1F1F',
    bgTertiary: '#262626',
    text: '#FFFFFFE0',
    textSecondary: '#FFFFFF73',
    border: '#434343',
    divider: '#303030',
  },
};

/**
 * Generate Ant Design theme configuration
 * @param {boolean} isDark - Whether to use dark mode
 * @returns {Object} Ant Design theme config
 */
export const generateAntDTheme = (isDark = false) => {
  const mode = isDark ? 'dark' : 'light';
  const palette = colors[mode];

  return {
    token: {
      // Primary color (green for TurboFix actions)
      colorPrimary: brandColors.primary,

      // Semantic colors
      colorSuccess: brandColors.success,
      colorWarning: brandColors.warning,
      colorError: brandColors.error,
      colorInfo: brandColors.info,

      // Background colors
      colorBgBase: palette.bg,
      colorBgContainer: palette.bgSecondary,
      colorBgElevated: palette.bgTertiary,
      colorBgLayout: palette.bg,

      // Text colors
      colorTextBase: palette.text,
      colorTextSecondary: palette.textSecondary,

      // Border and divider
      colorBorder: palette.border,
      colorBorderSecondary: palette.divider,

      // Typography
      fontFamily: '"Outfit", Arial, Roboto, sans-serif',
      fontSize: 14,
      fontSizeHeading1: 32,
      fontSizeHeading2: 24,
      fontSizeHeading3: 20,
      fontSizeHeading4: 16,
      fontSizeHeading5: 14,
      fontSizeHeading6: 12,

      // Spacing
      margin: 16,
      marginXS: 8,
      marginSM: 12,
      marginLG: 24,
      marginXL: 32,
      padding: 16,
      paddingXS: 8,
      paddingSM: 12,
      paddingLG: 24,
      paddingXL: 32,

      // Border radius
      borderRadius: 6,
      borderRadiusLG: 8,
      borderRadiusSM: 4,
      borderRadiusXS: 2,

      // Industrial surfaces use borders instead of decorative elevation.
      boxShadow: 'none',

      // Transitions
      motionUnit: 0.1,
      motionEaseInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
      motionEaseIn: 'cubic-bezier(0.55, 0.055, 0.675, 0.19)',
      motionEaseOut: 'cubic-bezier(0.215, 0.61, 0.355, 1)',
      motionEaseInCirc: 'cubic-bezier(0.6, 0.04, 0.98, 0.335)',
      motionEaseOutCirc: 'cubic-bezier(0.075, 0.82, 0.165, 1)',

      // Height
      controlHeight: 44,
      controlHeightLG: 48,
      controlHeightSM: 44,

      // Z-index
      zIndexPopupBase: 1000,

      // Line height
      lineHeight: 1.5714285714285714,
      lineHeightHeading1: 1.2,
      lineHeightHeading2: 1.35,
      lineHeightHeading3: 1.4,
      lineHeightHeading4: 1.45,
      lineHeightHeading5: 1.5,
      lineHeightHeading6: 1.55,
    },

    algorithm: isDark ? theme.darkAlgorithm : undefined,

    components: {
      // Button customization
      Button: {
        primaryColor: brandColors.primaryText,
        borderRadius: 6,
        controlHeight: 44,
        controlHeightSM: 44,
        controlHeightLG: 48,
        fontWeight: 600,
      },

      // Card customization
      Card: {
        borderRadiusLG: 10,
        boxShadow: 'none',
      },

      // Input customization
      Input: {
        borderRadius: 6,
        controlHeight: 44,
        fontSize: 14,
      },

      // Select customization
      Select: {
        borderRadius: 6,
        controlHeight: 44,
      },

      // Table customization
      Table: {
        headerBg: palette.bgSecondary,
        headerTextColor: palette.text,
        rowHoverBg: palette.bgTertiary,
        borderRadius: 6,
        cellPaddingBlock: 12,
        cellPaddingInline: 16,
      },

      // Statistic customization (for KPI cards)
      Statistic: {
        titleFontSize: 14,
        contentFontSize: 32,
      },

      // Tag customization
      Tag: {
        borderRadiusLG: 6,
      },

      // Modal customization
      Modal: {
        borderRadiusLG: 8,
        boxShadow: 'none',
      },

      // Dropdown customization
      Dropdown: {
        borderRadiusLG: 8,
      },

      // Tooltip customization
      Tooltip: {
        borderRadius: 6,
      },

      // Alert customization
      Alert: {
        borderRadius: 6,
        paddingContentBlockSM: 8,
      },

      // Notification customization
      Notification: {
        borderRadius: 8,
        boxShadow: 'none',
      },

      // Progress customization
      Progress: {
        borderRadius: 4,
      },

      // Layout customization
      Layout: {
        headerBg: palette.bgSecondary,
        headerHeight: 64,
        siderBg: palette.bgSecondary,
        triggerBg: palette.bgTertiary,
      },

      // Menu customization
      Menu: {
        itemBg: palette.bgSecondary,
        itemSelectedBg: brandColors.primary + '20',
        itemSelectedColor: brandColors.primary,
      },

      // Tabs customization
      Tabs: {
        titleFontSizeLG: 16,
        titleFontSize: 14,
      },
    },
  };
};

/**
 * Get the current theme config based on system preference or user selection
 * @returns {Object} Ant Design theme config
 */
export const getAntDTheme = () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark' ||
                 (window.matchMedia('(prefers-color-scheme: dark)').matches &&
                  !localStorage.getItem('tf_theme'));

  return generateAntDTheme(isDark);
};
