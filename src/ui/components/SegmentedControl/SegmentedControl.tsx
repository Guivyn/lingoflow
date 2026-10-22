import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import { tokens } from "../../theme/tokens";

export default function SegmentedControl({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  label: string;
}) {
  const index = Math.max(
    0,
    options.findIndex((item) => item.value === value)
  );
  return (
    <Box
      role="group"
      aria-label={label}
      sx={{
        display: "flex",
        position: "relative",
        isolation: "isolate",
        bgcolor: "surfaceMuted",
        p: "3px",
        borderRadius: "7px",
        width: "100%",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: 3,
          bottom: 3,
          left: 3,
          width: `calc((100% - 6px) / ${options.length})`,
          borderRadius: "5px",
          bgcolor: "background.paper",
          boxShadow: tokens.shadow.sm,
          transform: `translateX(${index * 100}%)`,
          transition: `transform ${tokens.motion.selected}ms ${tokens.motion.easing}`,
          zIndex: -1,
        }}
      />
      {options.map((item) => (
        <ButtonBase
          disableRipple
          key={item.value}
          aria-pressed={value === item.value}
          onClick={() => onChange(item.value)}
          sx={{
            flex: 1,
            py: 1,
            px: 1.25,
            borderRadius: "5px",
            whiteSpace: "nowrap",
            fontSize: tokens.font.sizeCaption,
            color: value === item.value ? "text.primary" : "text.secondary",
            fontWeight: value === item.value ? 600 : 400,
          }}
        >
          {item.label}
        </ButtonBase>
      ))}
    </Box>
  );
}
