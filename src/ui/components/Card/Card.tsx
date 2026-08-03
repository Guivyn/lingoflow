import MuiPaper, { PaperProps } from "@mui/material/Paper";
import { tokens } from "../../theme/tokens";

export interface CardProps extends PaperProps {}

/**
 * 设计系统卡片，默认描边样式并统一圆角。
 */
export default function Card({ variant = "outlined", sx, ...props }: CardProps) {
  return (
    <MuiPaper
      variant={variant}
      sx={{ borderRadius: `${tokens.radius.md}px`, ...sx }}
      {...props}
    />
  );
}
