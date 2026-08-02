import { ReactNode } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { tokens } from "../../theme/tokens";

export interface SettingItemProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}

/**
 * 设置项容器：左侧标题/说明，右侧承载控件。
 */
export default function SettingItem({
  title,
  description,
  children,
}: SettingItemProps) {
  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={1.5}
      alignItems={{ xs: "stretch", sm: "center" }}
      justifyContent="space-between"
      sx={{ minWidth: 0 }}
    >
      <Box sx={{ minWidth: 0, flex: "1 1 auto" }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: tokens.font.weightMedium }}
        >
          {title}
        </Typography>
        {description ? (
          <Typography variant="caption" color="text.secondary">
            {description}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ flex: "0 0 auto", minWidth: { xs: "100%", sm: 260 } }}>
        {children}
      </Box>
    </Stack>
  );
}
