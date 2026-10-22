import { ReactNode, useId, useState } from "react";
import Box from "@mui/material/Box";
import ButtonBase from "@mui/material/ButtonBase";
import ExpandMore from "@mui/icons-material/ExpandMore";
import { tokens } from "../../theme/tokens";

/** Keep fields mounted so closing a section never discards an unsaved draft. */
export default function AdvancedSettings({
  title,
  children,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <Box sx={{ mt: 2, borderTop: 1, borderColor: "divider" }}>
      <ButtonBase
        disableRipple
        id={`${id}-button`}
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
        sx={{
          width: "100%",
          py: 1.75,
          display: "flex",
          justifyContent: "space-between",
          fontSize: tokens.font.sizeData,
        }}
      >
        {title}
        <ExpandMore
          sx={{
            fontSize: 18,
            color: "text.secondary",
            transform: open ? "rotate(180deg)" : "none",
            transition: `transform ${tokens.motion.medium}ms ${tokens.motion.easing}`,
          }}
        />
      </ButtonBase>
      <Box
        sx={{
          display: "grid",
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          visibility: open ? "visible" : "hidden",
          transition: `grid-template-rows ${tokens.motion.medium}ms ${tokens.motion.easing}, opacity ${tokens.motion.fast}ms ${tokens.motion.easing}, visibility ${tokens.motion.medium}ms`,
        }}
      >
        <Box
          id={id}
          role="region"
          aria-labelledby={`${id}-button`}
          aria-hidden={!open}
          {...{ inert: open ? undefined : "" }}
          sx={{ overflow: "hidden", minHeight: 0 }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
