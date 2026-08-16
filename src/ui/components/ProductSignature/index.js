import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../theme/tokens";

const SIGNAL_ITEMS = [
  { label: "EN", type: "mono", color: "info" },
  { label: "⇄", type: "body", color: "muted" },
  { label: "中", type: "mono", color: "primary" },
];

/**
 * 产品签名：双色 Logo mark + 衬线字标 + EN ⇄ 中 语言信号。
 * Options / Popup / TranBox 共用，避免各表面手绘 Logo 或散写字体。
 *
 * @param {Object} props
 * @param {"header"|"popup"|"tranbox"} props.variant - 表面尺寸档位
 * @param {string} props.version - 可选的版本号文案
 * @param {Object} props.sx - 传递给外层 Box 的样式
 */
export default function ProductSignature({
  variant = "header",
  version = "",
  sx = {},
}) {
  const theme = useTheme();
  const isHeader = variant === "header";
  const isPopup = variant === "popup";
  const markSize = isHeader ? 22 : isPopup ? 18 : 16;
  const titleSize = isHeader
    ? tokens.font.sizeTitle
    : isPopup
      ? tokens.font.sizeSm
      : tokens.font.sizeData;
  const gap = isHeader ? `${tokens.spacing.sm}px` : "6px";
  const showChineseName = variant !== "tranbox";

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap,
        minWidth: 0,
        ...sx,
      }}
    >
      <svg
        width={markSize}
        height={markSize}
        viewBox="0 0 48 48"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <rect
          x="6"
          y="10"
          width="15"
          height="26"
          rx="7.5"
          fill={theme.palette.info.main}
        />
        <rect
          x="25"
          y="16"
          width="15"
          height="16"
          rx="7.5"
          fill={theme.palette.primary.main}
        />
      </svg>

      <Typography
        component="span"
        sx={{
          fontFamily: tokens.font.display,
          fontSize: titleSize,
          fontWeight: tokens.font.weightSemibold,
          lineHeight: 1.2,
          color: theme.palette.text.primary,
          whiteSpace: "nowrap",
        }}
      >
        LingoFlow
      </Typography>

      {showChineseName && (
        <Typography
          component="span"
          sx={{
            fontFamily: tokens.font.family,
            fontSize: isHeader
              ? tokens.font.sizeCaption
              : tokens.font.sizeKeycap,
            color: theme.palette.text.disabled,
            letterSpacing: tokens.font.trackingCaption,
            whiteSpace: "nowrap",
          }}
        >
          灵语
        </Typography>
      )}

      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: `${tokens.spacing.xs}px`,
        }}
      >
        {SIGNAL_ITEMS.map((item) => (
          <Typography
            key={item.label}
            component="span"
            sx={{
              fontFamily:
                item.type === "mono" ? tokens.font.mono : tokens.font.family,
              fontSize: tokens.font.sizeKeycap,
              fontWeight: tokens.font.weightSemibold,
              letterSpacing: tokens.font.trackingCaption,
              lineHeight: 1,
              color:
                item.color === "info"
                  ? theme.palette.info.main
                  : item.color === "primary"
                    ? theme.palette.primary.main
                    : theme.palette.text.disabled,
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
          </Typography>
        ))}
      </Box>

      {isPopup && version ? (
        <Typography
          component="span"
          sx={{
            fontFamily: tokens.font.mono,
            fontSize: tokens.font.sizeKeycap,
            color: theme.palette.text.disabled,
            whiteSpace: "nowrap",
          }}
        >
          v{version}
        </Typography>
      ) : null}
    </Box>
  );
}
