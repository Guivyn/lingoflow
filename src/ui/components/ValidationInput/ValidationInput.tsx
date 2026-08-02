import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import { limitFloat, limitNumber } from "../../../libs/utils";

export interface ValidationInputProps
  extends Omit<TextFieldProps, "onChange" | "onBlur" | "value"> {
  value?: string | number;
  onChange: (event: {
    target: { name?: string; value: number };
    preventDefault: () => void;
  }) => void;
  min?: number;
  max?: number;
  isFloat?: boolean;
}

/**
 * 带范围校验的数字输入框，失焦时自动把非法值回滚并分发校验后的数值。
 */
export default function ValidationInput({
  value,
  onChange,
  name,
  min,
  max,
  isFloat = false,
  ...props
}: ValidationInputProps) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleLocalChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setLocalValue(e.target.value);
  };

  const handleBlur = () => {
    const numValue = Number(localValue);

    if (Number.isNaN(numValue)) {
      setLocalValue(value);
      return;
    }

    const validatedValue = isFloat
      ? limitFloat(numValue, min, max)
      : limitNumber(numValue, min, max);

    if (validatedValue !== numValue) {
      setLocalValue(validatedValue);
    }

    onChange({
      target: {
        name,
        value: validatedValue,
      },
      preventDefault: () => {},
    });
  };

  return (
    <TextField
      {...props}
      type="number"
      name={name}
      value={localValue}
      onChange={handleLocalChange}
      onBlur={handleBlur}
    />
  );
}
