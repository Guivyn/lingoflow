import { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../theme/tokens";

export interface SettingSectionProps {
  title: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}

/**
 * 设置文档分区：衬线标题 + 强调分割线 + 行控件。
 * 设置页以文档呈现，不使用 Card 包裹。
 */
export default function SettingSection({
  title,
  extra,
  children,
}: SettingSectionProps) {
  const theme = useTheme();

  return (
    <Box component="section" sx={{ mb: `${tokens.spacing.sm}px` }}>
      <Typography
        component="h2"
        sx={{
          fontFamily: tokens.font.display,
          fontSize: tokens.font.sizeSection,
          fontWeight: tokens.font.weightSemibold,
          letterSpacing: tokens.font.trackingSection,
          lineHeight: 1.3,
          color: theme.palette.text.primary,
          margin: 0,
        }}
      >
        {title}
        {extra ? (
          <Typography
            component="span"
            sx={{
              ml: `${tokens.spacing.md}px`,
              fontFamily: tokens.font.family,
              fontSize: tokens.font.sizeCaption,
              fontWeight: tokens.font.weightNormal,
              letterSpacing: tokens.font.trackingNormal,
              color: theme.palette.text.disabled,
            }}
          >
            {extra}
          </Typography>
        ) : null}
      </Typography>
      <Box
        sx={{
          borderTop: `1px solid ${theme.palette.divider}`,
          mt: `${tokens.spacing.md}px`,
        }}
      />
      <Box sx={{ mt: `${tokens.spacing.lg}px` }}>{children}</Box>
    </Box>
  );
}
