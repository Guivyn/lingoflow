import { useEffect, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import Autocomplete, {
  AutocompleteProps,
} from "@mui/material/Autocomplete";
import TextField, { TextFieldProps } from "@mui/material/TextField";

export interface ReusableAutocompleteProps
  extends Omit<
    AutocompleteProps<string, false, false, true>,
    | "value"
    | "onChange"
    | "inputValue"
    | "onInputChange"
    | "onBlur"
    | "renderInput"
  > {
  name?: string;
  label?: string;
  value?: string;
  onChange?: (event: {
    target: { name?: string; value: string };
    preventDefault: () => void;
  }) => void;
  textFieldProps?: TextFieldProps;
}

/**
 * 可复用 Autocomplete：标准化 name 属性与合成 onChange 事件，兼容表单处理器。
 */
export default function ReusableAutocomplete({
  name,
  label,
  value,
  onChange,
  textFieldProps = {},
  ...rest
}: ReusableAutocompleteProps) {
  const [inputValue, setInputValue] = useState(value || "");
  const isChangeCommitted = useRef(false);

  useEffect(() => {
    setInputValue(value || "");
  }, [value]);

  const triggerOnChange = (newValue: string) => {
    if (onChange) {
      const syntheticEvent = {
        target: {
          name,
          value: newValue,
        },
        preventDefault: () => {},
      };
      onChange(syntheticEvent);
    }
  };

  const handleBlur = () => {
    if (isChangeCommitted.current) {
      isChangeCommitted.current = false;
      return;
    }

    if (inputValue !== value) {
      triggerOnChange(inputValue);
    }
  };

  const handleChange = (
    _event: SyntheticEvent,
    newValue: string | null
  ) => {
    isChangeCommitted.current = true;
    triggerOnChange(newValue || "");
  };

  const handleInputChange = (
    _event: SyntheticEvent,
    newInputValue: string
  ) => {
    isChangeCommitted.current = false;
    setInputValue(newInputValue);
  };

  return (
    <Autocomplete
      value={value || ""}
      onChange={handleChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onBlur={handleBlur}
      {...rest}
      renderInput={(params) => (
        <TextField {...params} {...textFieldProps} name={name} label={label} />
      )}
    />
  );
}
