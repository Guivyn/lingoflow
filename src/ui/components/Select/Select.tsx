import { ReactNode, useId } from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText, {
  FormHelperTextProps,
} from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect, { SelectProps as MuiSelectProps } from "@mui/material/Select";

export interface SelectOption<T extends string | number | boolean = string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string | number | boolean = string>
  extends Omit<MuiSelectProps<T>, "label" | "value"> {
  label?: string;
  options?: ReadonlyArray<SelectOption<T>>;
  helperText?: ReactNode;
  helperTextProps?: FormHelperTextProps;
  value?: T | ReadonlyArray<T> | "";
}

/**
 * 设计系统下拉选择，承载选项列表与表单辅助文案。
 */
export default function Select<T extends string | number | boolean>({
  id,
  label,
  options = [],
  helperText,
  helperTextProps,
  size = "small",
  sx,
  value,
  error,
  children,
  ...props
}: SelectProps<T>) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const labelId = `${selectId}-label`;

  return (
    <FormControl fullWidth size={size} sx={sx} error={error}>
      {label ? (
        <InputLabel
          id={labelId}
          size={size === "small" ? "small" : "normal"}
        >
          {label}
        </InputLabel>
      ) : null}
      <MuiSelect
        id={selectId}
        label={label}
        labelId={label ? labelId : undefined}
        size={size}
        value={value as unknown as T | ""}
        error={error}
        {...props}
      >
        {children}
        {options.map((option) => (
          <MenuItem
            key={String(option.value)}
            value={
              option.value as unknown as string | number | readonly string[]
            }
          >
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText ? (
        <FormHelperText {...helperTextProps}>{helperText}</FormHelperText>
      ) : null}
    </FormControl>
  );
}
