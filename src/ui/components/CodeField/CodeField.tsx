import TextField, { TextFieldProps } from "@mui/material/TextField";

const MONO_FONT =
  'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace';

export type CodeFieldProps = TextFieldProps;

/**
 * 等宽字体代码文本编辑器，用于自定义 CSS / JS Hook / 规则 JSON 等源码输入。
 */
export default function CodeField({ InputProps, ...rest }: CodeFieldProps) {
  return (
    <TextField
      multiline
      {...rest}
      InputProps={{
        ...InputProps,
        sx: [
          { fontFamily: MONO_FONT, fontSize: "0.875rem" },
          ...(Array.isArray(InputProps?.sx) ? InputProps.sx : [InputProps?.sx]),
        ],
      }}
    />
  );
}
