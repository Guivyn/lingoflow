import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import CssBaseline from "@mui/material/CssBaseline";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import Navigator from "./Navigator";
import Header from "./Header";
import { tokens } from "../../ui";
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
  const isSm = useMediaQuery(theme.breakpoints.up("sm"));

  const handleDrawerToggle = () => {
    setOpen((prev) => !prev);
  };

  useEffect(() => {
    setOpen(false);
  }, [location]);

  return (
    <Box>
      <CssBaseline />
      <Header onDrawerToggle={handleDrawerToggle} />

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

        <Box component="main" sx={{ flex: 1, p: 2, width: "100%" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
