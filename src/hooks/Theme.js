import { useEffect, useMemo, useState } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import { CssBaseline, GlobalStyles } from "@mui/material";
import { useDarkMode } from "./ColorMode";
import { THEME_DARK, THEME_LIGHT } from "../config";
import { tokens } from "../ui";
import { browser } from "../libs/browser";

// 本地打包的思源宋体标题子集。内容脚本页面里必须用扩展资源绝对 URL 才能跨网页加载。
const DISPLAY_FONT_URL = (() => {
  try {
    const url = browser?.runtime?.getURL?.("fonts/NotoSerifSC-subset.woff2");
    if (url) return url;
  } catch (err) {
    // 非扩展环境（本地开发/预览）回退到 public 根路径。
  }
  return "/fonts/NotoSerifSC-subset.woff2";
})();

/**
 * MUI 主题包装器 React 组件
 * 用于监听系统及用户配置的暗黑模式，并全局提供 Material-UI 主题上下文和基础全局样式
 * @param {object} props { children, options, styles }
 */
export default function Theme({ children, options = {}, styles = {} }) {
  // 获取当前用户设置的深色模式：'light', 'dark' 或是 'auto'
  const { darkMode } = useDarkMode();
  // 保存系统级别的暗黑模式状态，默认为浅色 (light)
  const [systemMode, setSystemMode] = useState(THEME_LIGHT);

  // 监听浏览器系统级的 prefers-color-scheme 暗黑/浅色模式变化，并自动同步状态
  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      setSystemMode(mediaQuery.matches ? THEME_DARK : THEME_LIGHT);
    };
    handleChange(); // 设置初始系统色彩模式
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // 根据用户全局 darkMode 设定和当前的系统色彩模式，动态计算出最终的 MUI 主题配置
  const theme = useMemo(() => {
    let htmlFontSize = 16;
    try {
      // 动态获取当前网页根元素的 font-size（应对用户在浏览器里调大了默认字号的场景，使 rem 布局更自然对齐）
      const s = window.getComputedStyle(document.documentElement).fontSize;
      htmlFontSize = parseInt(s.replace("px", ""));
    } catch (err) {
      // 容错：若解析失败则回退默认的 16px
    }

    // 判断当前最终是否应该呈现暗黑模式
    // ?lf-dark=1 仅用于 QA 截图强制深色，不影响正常设置
    const forceDark =
      new URLSearchParams(window.location.search).get("lf-dark") === "1";
    const isDarkMode =
      forceDark ||
      darkMode === "dark" ||
      (darkMode === "auto" && systemMode === THEME_DARK);

    return createTheme({
      palette: {
        mode: isDarkMode ? THEME_DARK : THEME_LIGHT,
        primary: {
          main: isDarkMode ? "#d08263" : tokens.color.primary,
          dark: isDarkMode ? "#e0977a" : tokens.color.primaryHover,
          light: tokens.color.primarySoft,
        },
        success: {
          main: tokens.color.success,
          light: tokens.color.successSoft,
        },
        warning: {
          main: tokens.color.warning,
        },
        error: {
          main: tokens.color.danger,
        },
        info: {
          main: isDarkMode ? "#7c96e8" : tokens.color.blue,
          light: tokens.color.blueSoft,
        },
        background: {
          default: isDarkMode ? "#1b1915" : tokens.color.background,
          paper: isDarkMode ? "#232019" : tokens.color.surface,
        },
        surface: isDarkMode ? "#232019" : tokens.color.surface,
        surfaceMuted: isDarkMode ? "#2a261f" : tokens.color.surfaceMuted,
        surfaceRaised: isDarkMode ? "#332e27" : tokens.color.surfaceRaised,
        border: isDarkMode ? "#332f28" : tokens.color.border,
        borderStrong: isDarkMode ? "#453f35" : tokens.color.borderStrong,
        text: {
          primary: isDarkMode ? "#efeae1" : tokens.color.text,
          secondary: isDarkMode ? "#aaa398" : tokens.color.textSecondary,
          disabled: isDarkMode ? "#6e685d" : tokens.color.textDisabled,
        },
        divider: isDarkMode ? "#332f28" : tokens.color.border,
      },
      typography: {
        htmlFontSize,
        fontFamily: tokens.font.family,
        fontSize: 15,
        button: {
          textTransform: "none",
          fontWeight: tokens.font.weightMedium,
        },
      },
      shape: {
        borderRadius: tokens.radius.sm,
      },
      components: {
        MuiButton: {
          defaultProps: {
            disableElevation: true,
          },
        },
        MuiPaper: {
          defaultProps: {
            elevation: 0,
          },
        },
        MuiTextField: {
          defaultProps: {
            variant: "standard",
          },
        },
      },
      ...options,
    });
  }, [darkMode, options, systemMode]);

  return (
    <ThemeProvider theme={theme}>
      {/* CssBaseline 提供 Material UI 精简统一的基础样式重置 */}
      <CssBaseline />
      {/* 允许传入全局样式 Styles */}
      <GlobalStyles
        styles={(theme) => ({
          ...styles,
          "@font-face": {
            fontFamily: tokens.font.displayFamily,
            src: `url("${DISPLAY_FONT_URL}") format("woff2-variations")`,
            fontWeight: "500 700",
            fontStyle: "normal",
            fontDisplay: "swap",
            unicodeRange:
              "U+0020-007E, U+00A0-00FF, U+2000-206F, U+3000-303F, U+4E00-9FFF, U+FF00-FFEF",
          },
          ":where(a, button, input, select, textarea, [tabindex]:not([tabindex='-1']), [role='button'], [role='tab'], [role='checkbox'], [role='switch']):focus-visible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: "2px",
          },
          ":where(a, button, input, select, textarea, [tabindex]:not([tabindex='-1']), [role='button'], [role='tab']):not(:disabled)": {
            transition: `background-color ${tokens.motion.fast}ms ${tokens.motion.easing}, color ${tokens.motion.fast}ms ${tokens.motion.easing}, border-color ${tokens.motion.fast}ms ${tokens.motion.easing}, box-shadow ${tokens.motion.fast}ms ${tokens.motion.easing}`,
          },
          "input[type='number']": {
            textAlign: "right",
          },
          "@media (prefers-reduced-motion: reduce)": {
            "*": {
              animationDuration: "0.01ms !important",
              transitionDuration: "0.01ms !important",
            },
          },
        })}
      />
      {children}
    </ThemeProvider>
  );
}
