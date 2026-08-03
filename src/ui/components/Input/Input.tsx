import MuiTextField, { TextFieldProps } from "@mui/material/TextField";

export type InputProps = TextFieldProps;

/**
 * 设计系统文本输入，默认使用紧凑尺寸与描边样式。
 */
export default function Input({
  size = "medium",
  variant = "outlined",
  ...props
}: InputProps) {
  return <MuiTextField size={size} variant={variant} {...props} />;
}
