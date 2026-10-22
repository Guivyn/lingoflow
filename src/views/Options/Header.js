import AppBar from "@mui/material/AppBar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import DarkModeButton from "./DarkModeButton";
import Typography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import ProductSignature from "../../ui/components/ProductSignature";
import { tokens } from "../../ui";

/**
 * 设置页面的导航头部组件：字标 + 版本 + 明暗切换。
 *
 * @param {Object} props
 * @param {Function} props.onDrawerToggle - 点击菜单按钮切换侧边栏展开/收起的回调函数 (移动端临时抽屉)
 * @param {string} [props.saveStatusText] - 当前存储写入状态的本地化提示。
 */
function Header(props) {
  const { onDrawerToggle, saveStatusText } = props;
  const theme = useTheme();

  return (
    <AppBar
      position="sticky"
      sx={{
        zIndex: 1300, // 确保 Header 在侧边栏和抽屉之上的层级
        bgcolor: theme.palette.background.default,
        color: theme.palette.text.primary,
        boxShadow: "none",
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: tokens.layout.headerHeight }}>
        {/* 窄窗口使用菜单按钮展开导航抽屉。 */}
        <Box sx={{ display: { md: "none", xs: "block" } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={onDrawerToggle}
            edge="start"
          >
            <MenuIcon />
          </IconButton>
        </Box>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 2, flexGrow: 1 }}
        >
          <ProductSignature />
        </Box>
        <Typography
          role="status"
          aria-live="polite"
          title={saveStatusText}
          sx={{
            mr: 2,
            maxWidth: { xs: 70, sm: 170 },
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontSize: tokens.font.sizeCaption,
            color: "text.secondary",
          }}
        >
          {saveStatusText}
        </Typography>
        <Typography
          component="div"
          sx={{
            mr: 1,
            fontFamily: tokens.font.mono,
            fontSize: tokens.font.sizeCaption,
            color: theme.palette.text.disabled,
          }}
        >
          v{process.env.REACT_APP_VERSION}
        </Typography>
        <DarkModeButton />
      </Toolbar>
    </AppBar>
  );
}

export default Header;
