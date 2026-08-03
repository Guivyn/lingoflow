import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
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
        color: match ? theme.palette.text.primary : theme.palette.text.secondary,
        fontWeight: match ? tokens.font.weightSemibold : tokens.font.weightNormal,
        "&:hover": {
          bgcolor: theme.palette.surfaceMuted,
          color: theme.palette.text.primary,
        },
        "&.Mui-selected": {
          bgcolor: theme.palette.surfaceMuted,
        },
      }}
    >
      <ListItemText
        primary={label}
        primaryTypographyProps={{
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
  // 选项设置页的菜单列表项配置：按 General / Translation / Display 分组
  const groups = [
    {
      label: "General",
      items: [
        {
          id: "basic_setting",
          label: i18n("basic_setting"),
          url: "/",
        },
      ],
    },
    {
      label: "Translation",
      items: [
        {
          id: "apis_setting",
          label: i18n("apis_setting"),
          url: "/providers",
        },
        {
          id: "rules_setting",
          label: i18n("rules_setting"),
          url: "/rules",
        },
      ],
    },
    {
      label: "Display",
      items: [
        {
          id: "styles_setting",
          label: i18n("styles_setting"),
          url: "/styles",
        },
        {
          id: "selection_translate",
          label: i18n("selection_translate"),
          url: "/tranbox",
        },
        {
          id: "subtitle_translate",
          label: i18n("subtitle_translate"),
          url: "/subtitle",
        },
      ],
    },
  ];
  return (
    <Drawer {...props}>
      <Toolbar variant="dense" />
      <Typography
        component="div"
        sx={{
          px: 2.5,
          pb: 1,
          pt: 1,
          color: theme.palette.text.disabled,
          fontFamily: tokens.font.mono,
          fontSize: tokens.font.sizeData,
          letterSpacing: tokens.font.trackingCaption,
        }}
      >
        {i18n("setting")}
      </Typography>
      {groups.map((group) => (
        <List key={group.label} component="nav" disablePadding sx={{ px: 1, pb: 1.5 }}>
          <Typography
            component="div"
            sx={{
              px: 1.5,
              pt: 0.5,
              pb: 0.5,
              color: theme.palette.text.disabled,
              fontFamily: tokens.font.mono,
              fontSize: tokens.font.sizeSm,
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
    </Drawer>
  );
}
