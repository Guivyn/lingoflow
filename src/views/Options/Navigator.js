import { useState } from "react";
import InputBase from "@mui/material/InputBase";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import { NavLink, useMatch } from "react-router-dom";
import Typography from "@mui/material/Typography";
import { useI18n } from "../../hooks/I18n";
import { useTheme } from "@mui/material/styles";
import { tokens } from "../../ui";

/**
 * 单个侧边栏路由导航菜单项组件
 */
function LinkItem({ label, url }) {
  // 检查当前 URL 路由是否与该菜单项匹配，匹配的会被激活高亮显示
  const match = useMatch(url);
  const theme = useTheme();
  return (
    <ListItemButton
      component={NavLink}
      to={url}
      selected={!!match}
      sx={{
        borderRadius: `${tokens.radius.sm}px`,
        minHeight: 44,
        py: `${tokens.spacing.xs}px`,
        px: `${tokens.spacing.lg}px`,
        color: match
          ? theme.palette.text.primary
          : theme.palette.text.secondary,
        fontWeight: match
          ? tokens.font.weightSemibold
          : tokens.font.weightNormal,
        "&:hover": {
          bgcolor: theme.palette.surfaceMuted,
          color: theme.palette.text.primary,
        },
        "&.Mui-selected": {
          bgcolor: theme.palette.surfaceMuted,
          boxShadow: `inset 2px 0 ${theme.palette.primary.main}`,
        },
      }}
    >
      <ListItemText
        primary={label}
        primaryTypographyProps={{
          fontFamily: tokens.font.display,
          fontSize: tokens.font.sizeNav,
          lineHeight: 1.3,
        }}
      />
    </ListItemButton>
  );
}

/**
 * 侧边栏导航列表栏组件 (Navigator)
 */
export default function Navigator(props) {
  const i18n = useI18n();
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const groups = [
    {
      label: i18n("nav_general", "常规"),
      items: [
        {
          id: "general",
          label: i18n("general_settings", "常规设置"),
          url: "/",
        },
        { id: "styles", label: i18n("styles_setting"), url: "/styles" },
      ],
    },
    {
      label: i18n("nav_translation", "翻译"),
      items: [
        {
          id: "services",
          label: i18n("translation_services", "翻译服务"),
          url: "/providers",
        },
        { id: "rules", label: i18n("rules_setting"), url: "/rules" },
        {
          id: "selection",
          label: i18n("selection_translate"),
          url: "/tranbox",
        },
        { id: "subtitle", label: i18n("subtitle_translate"), url: "/subtitle" },
      ],
    },
    {
      label: i18n("nav_management", "管理"),
      items: [
        {
          id: "shortcuts",
          label: i18n("shortcuts", "快捷键"),
          url: "/shortcuts",
        },
        {
          id: "data",
          label: i18n("data_settings", "数据与缓存"),
          url: "/data",
        },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.label.toLowerCase().includes(query.trim().toLowerCase())
      ),
    }))
    .filter((group) => group.items.length);
  return (
    <Drawer
      {...props}
      sx={{
        "& .MuiDrawer-paper": {
          bgcolor: "background.default",
          border: 0,
          pt: "58px",
          px: 2.5,
        },
      }}
    >
      <Box
        sx={{
          bgcolor: "surfaceMuted",
          borderRadius: "6px",
          mt: 3,
          mb: 1,
          px: 1.25,
          py: 0.75,
        }}
      >
        <InputBase
          type="search"
          fullWidth
          placeholder={i18n("search_setting_pages", "搜索设置页面")}
          inputProps={{
            "aria-label": i18n("search_setting_pages", "搜索设置页面"),
          }}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{
            fontSize: tokens.font.sizeCaption,
            fontFamily: tokens.font.display,
          }}
        />
      </Box>
      {!groups.length && (
        <Typography
          sx={{
            p: 2,
            fontSize: tokens.font.sizeCaption,
            color: "text.secondary",
            fontFamily: tokens.font.display,
          }}
        >
          {i18n("no_settings_found", "没有匹配的设置页面")}
        </Typography>
      )}
      {groups.map((group) => (
        <List
          key={group.label}
          component="nav"
          disablePadding
          sx={{ px: 0, pt: 1.5, pb: 0.5 }}
        >
          <Typography
            component="div"
            sx={{
              px: 1.5,
              pt: 0.5,
              pb: 0.5,
              color: theme.palette.text.disabled,
              fontFamily: tokens.font.display,
              fontSize: tokens.font.sizeKeycap,
              fontWeight: tokens.font.weightSemibold,
              letterSpacing: tokens.font.trackingCaption,
            }}
          >
            {group.label}
          </Typography>
          {group.items.map(({ id, label, url }) => (
            <LinkItem key={id} label={label} url={url} />
          ))}
        </List>
      ))}
      <Box sx={{ mt: "auto", pt: 3, pb: 2 }}>
        <LinkItem
          label={i18n("about_lingoflow", "关于 LingoFlow")}
          url="/about"
        />
      </Box>
    </Drawer>
  );
}
