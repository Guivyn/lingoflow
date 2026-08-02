/**
 * Options 设计系统基础令牌。
 * 页面代码不直接消费 MUI 主题，统一从这里读取语义化 token；
 * 后续需要演进为 MUI theme 扩展时，只需在这里补齐映射。
 */
export const tokens = {
  color: {
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    primarySoft: "#dbeafe",
    background: "#f6f7f9",
    surface: "#ffffff",
    surfaceMuted: "#f3f4f6",
    text: "#1f2937",
    textSecondary: "#6b7280",
    textDisabled: "#9ca3af",
    border: "#e5e7eb",
    danger: "#dc2626",
    dangerHover: "#b91c1c",
    success: "#16a34a",
    warning: "#d97706",
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radius: {
    sm: 4,
    md: 8,
  },
  font: {
    family:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    sizeSm: "13px",
    sizeMd: "14px",
    sizeLg: "16px",
    sizeTitle: "18px",
    weightNormal: 400,
    weightMedium: 500,
    weightSemibold: 600,
  },
  shadow: {
    sm: "0 1px 2px rgba(0, 0, 0, 0.06)",
    md: "0 4px 12px rgba(0, 0, 0, 0.08)",
  },
  layout: {
    sidebarWidth: 256,
    headerHeight: 64,
    contentMaxWidth: 1080,
  },
  zIndex: {
    sticky: 10,
    drawer: 1200,
  },
} as const;

export type DesignTokens = typeof tokens;
