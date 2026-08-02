import { ReactNode, useId } from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import MuiSelect, { SelectProps as MuiSelectProps } from "@mui/material/Select";

export interface SelectOption<T extends string | number = string> {
  value: T;
  label: string;
}

export interface SelectProps<T extends string | number>
  extends Omit<MuiSelectProps<T>, "label"> {
  label?: string;
  options: ReadonlyArray<SelectOption<T>>;
  helperText?: ReactNode;
}

/**
 * 设计系统下拉选择，承载选项列表与表单辅助文案。
 */
export default function Select<T extends string | number>({
  id,
  label,
  options,
  helperText,
  size = "small",
  sx,
  ...props
}: SelectProps<T>) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const labelId = `${selectId}-label`;

  return (
    <FormControl fullWidth size={size} sx={sx}>
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
        {...props}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {helperText ? <FormHelperText>{helperText}</FormHelperText> : null}
    </FormControl>
  );
}
