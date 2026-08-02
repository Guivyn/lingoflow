import MuiButton, { ButtonProps as MuiButtonProps } from "@mui/material/Button";
import { tokens } from "../../theme/tokens";

export interface ButtonProps extends MuiButtonProps {}

/**
 * 设计系统按钮，默认使用紧凑尺寸与统一圆角。
 */
export default function Button({
  size = "small",
  sx,
  ...props
}: ButtonProps) {
  return (
    <MuiButton
      size={size}
      sx={{
        borderRadius: tokens.radius.sm,
        textTransform: "none",
        ...sx,
      }}
      {...props}
    />
  );
}
