import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Navigator from "./Navigator";
import Header from "./Header";
import { tokens } from "../../ui";
import { useSetting } from "../../hooks/Setting";
import { useOptionsSaveFeedback } from "../../hooks/OptionsSaveFeedback";
import "../../ui/theme/variables.css";

/**
 * 设置中心后台页面的通风格子骨架布局组件 (Layout)。
 * 新架构下 Layout 作为 Options 的统一壳层：侧边栏 + 路由占位。
 */
export default function Layout() {
  const navWidth = tokens.layout.sidebarWidth;
  const location = useLocation();
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const { saveStatus } = useSetting();
  const saveFeedback = useOptionsSaveFeedback(saveStatus);
  const isSm = useMediaQuery(theme.breakpoints.up("md"));

  const handleDrawerToggle = () => {
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <Box
      className="lf-options"
      sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh" }}
    >
      <CssBaseline />
      <Header
        onDrawerToggle={handleDrawerToggle}
        saveStatusText={saveFeedback.statusText}
      />

      <Box sx={{ display: "flex" }}>
        <Box
          component="nav"
          sx={{ width: { md: navWidth }, flexShrink: { md: 0 } }}
        >
          <Navigator
            PaperProps={{ style: { width: navWidth } }}
            variant={isSm ? "permanent" : "temporary"}
            open={isSm ? true : open}
            onClose={handleDrawerToggle}
          />
        </Box>

        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            px: { xs: 2.5, md: 6.875 },
            py: { xs: 3, md: 4.25 },
            maxWidth: tokens.layout.contentMaxWidth + navWidth,
          }}
        >
          {saveFeedback.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {saveFeedback.error}
            </Alert>
          )}
          <Box
            key={location.pathname}
            sx={{
              animation: `lf-panel-enter ${tokens.motion.panel}ms ${tokens.motion.easing}`,
            }}
          >
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
