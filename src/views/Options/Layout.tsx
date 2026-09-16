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
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));

  const handleDrawerToggle = () => {
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <Box sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh" }}>
      <CssBaseline />
      <Header onDrawerToggle={handleDrawerToggle} />
      {saveStatus === "error" && (
        <Alert severity="error" sx={{ mx: 2, mt: 1 }}>
          设置保存失败，请重试。 Settings could not be saved; please retry.
        </Alert>
      )}

      <Box sx={{ display: "flex" }}>
        <Box
          component="nav"
          sx={{ width: { sm: navWidth }, flexShrink: { sm: 0 } }}
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
            width: "100%",
            px: `${tokens.spacing.xxl}px`,
            py: `${tokens.spacing.xxl}px`,
            maxWidth: tokens.layout.contentMaxWidth + navWidth,
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
