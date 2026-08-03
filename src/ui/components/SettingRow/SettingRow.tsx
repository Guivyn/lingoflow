import { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../theme/tokens";

export interface SettingRowProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  align?: "center" | "start";
  controlMinWidth?: number | string;
  controlMaxWidth?: number | string;
}

/**
 * 设置文档行：左侧标签，右侧控件，hover 给浅底色。
 * 控件默认无边框，由控件自身在 focus 时给出细线。
 */
export default function SettingRow({
  title,
  description,
  children,
  align = "center",
  controlMinWidth = 180,
  controlMaxWidth = "46%",
}: SettingRowProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: align === "center" ? "center" : "flex-start",
        justifyContent: "space-between",
        gap: `${tokens.spacing.lg}px`,
        minHeight: 36,
        px: `${tokens.spacing.sm}px`,
        py: `${tokens.spacing.xs}px`,
        "&:hover": {
          bgcolor: theme.palette.surfaceMuted,
          borderRadius: `${tokens.radius.sm}px`,
        },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: tokens.font.sizeSm,
            fontWeight: tokens.font.weightMedium,
            color: theme.palette.text.primary,
            letterSpacing: tokens.font.trackingNormal,
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography
            sx={{
              fontSize: tokens.font.sizeCaption,
              color: theme.palette.text.disabled,
              mt: 0.25,
            }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>
      <Box
        sx={{
          flex: "0 0 auto",
          minWidth: controlMinWidth,
          maxWidth: controlMaxWidth,
          textAlign: "right",
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
