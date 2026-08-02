import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Toolbar from "@mui/material/Toolbar";
import { NavLink, useMatch } from "react-router-dom";
import SettingsIcon from "@mui/icons-material/Settings";
import DesignServicesIcon from "@mui/icons-material/DesignServices";
import { useI18n } from "../../hooks/I18n";
import ApiIcon from "@mui/icons-material/Api";
import SelectAllIcon from "@mui/icons-material/SelectAll";
import MouseIcon from "@mui/icons-material/Mouse";
import SubtitlesIcon from "@mui/icons-material/Subtitles";
import FormatColorText from "@mui/icons-material/FormatColorText";

/**
 * 单个侧边栏路由导航菜单项组件
 */
function LinkItem({ label, url, icon }) {
  // 检查当前 URL 路由是否与该菜单项匹配，匹配的会被激活高亮显示
  const match = useMatch(url);
  return (
    <ListItemButton component={NavLink} to={url} selected={!!match}>
      <ListItemIcon>{icon}</ListItemIcon>
      <ListItemText>{label}</ListItemText>
    </ListItemButton>
  );
}

/**
 * 侧边栏导航列表栏组件 (Navigator)
 */
export default function Navigator(props) {
  const i18n = useI18n();
  // 选项设置页的菜单列表项配置
  const memus = [
    {
      id: "providers_setting",
      label: i18n("providers_setting", "Providers"),
      url: "/providers",
      icon: <ApiIcon />,
    },
    {
      id: "basic_setting",
      label: i18n("basic_setting"),
      url: "/",
      icon: <SettingsIcon />,
    },
    {
      id: "rules_setting",
      label: i18n("rules_setting"),
      url: "/rules",
      icon: <DesignServicesIcon />,
    },
    {
      id: "apis_setting",
      label: i18n("apis_setting"),
      url: "/apis",
      icon: <ApiIcon />,
    },
    {
      id: "styles_setting",
      label: i18n("styles_setting"),
      url: "/styles",
      icon: <FormatColorText />,
    },
    {
      id: "selection_translate",
      label: i18n("selection_translate"),
      url: "/tranbox",
      icon: <SelectAllIcon />,
    },
    {
      id: "mousehover_translate",
      label: i18n("mousehover_translate"),
      url: "/mousehover",
      icon: <MouseIcon />,
    },
    {
      id: "subtitle_translate",
      label: i18n("subtitle_translate"),
      url: "/subtitle",
      icon: <SubtitlesIcon />,
    },
  ];
  return (
    <Drawer {...props}>
      <Toolbar variant="dense" />
      <List component="nav">
        {memus.map(({ id, label, url, icon }) => (
          <LinkItem key={id} label={label} url={url} icon={icon} />
        ))}
      </List>
    </Drawer>
  );
}
