import { ReactNode } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../theme/tokens";

export interface PageHeadingProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

/**
 * 设置页文档开篇：衬线大标题 + 短说明 + 可选操作区。
 */
export default function PageHeading({
  title,
  description,
  actions,
}: PageHeadingProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: `${tokens.spacing.lg}px`,
        mb: `${tokens.spacing.xl}px`,
      }}
    >
      <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>
        <Typography
          component="h1"
          sx={{
            fontFamily: tokens.font.display,
            fontSize: tokens.font.sizeDisplay,
            fontWeight: tokens.font.weightSemibold,
            letterSpacing: tokens.font.trackingDisplay,
            lineHeight: 1.2,
            color: theme.palette.text.primary,
            margin: 0,
          }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography
            sx={{
              mt: `${tokens.spacing.sm}px`,
              maxWidth: 640,
              fontFamily: tokens.font.family,
              fontSize: tokens.font.sizeSm,
              lineHeight: 1.6,
              color: theme.palette.text.secondary,
              letterSpacing: tokens.font.trackingNormal,
            }}
          >
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? (
        <Box sx={{ flex: "0 0 auto" }}>{actions}</Box>
      ) : null}
    </Box>
  );
}
