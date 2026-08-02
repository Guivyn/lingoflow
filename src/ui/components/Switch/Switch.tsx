import MuiSwitch, { SwitchProps as MuiSwitchProps } from "@mui/material/Switch";

export interface SwitchProps extends MuiSwitchProps {}

/**
 * 设计系统开关，默认使用紧凑尺寸。
 */
export default function Switch({ size = "small", ...props }: SwitchProps) {
  return <MuiSwitch size={size} {...props} />;
}
