import { useState, useEffect, useMemo } from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import Grid from "@mui/material/Grid";
import Menu from "@mui/material/Menu";
import IconButton from "@mui/material/IconButton";
import SettingsIcon from "@mui/icons-material/Settings";
import { sendBgMsg, sendTabMsg } from "../../libs/msg";
import { isExt } from "../../libs/client";
import { useI18n } from "../../hooks/I18n";
import TextField from "@mui/material/TextField";
import {
  MSG_TRANS_TOGGLE,
  MSG_TRANS_PUTRULE,
  MSG_TRANS_PUTSETTING,
  MSG_RELOAD_SETTING,
  MSG_COMMAND_SHORTCUTS,
  OPT_LANGS_FROM_REVERSED as OPT_LANGS_FROM,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
} from "../../config";
import { appLog } from "../../libs/log";
import { setSetting as persistSetting } from "../../libs/storage";
import { persistRule } from "../../libs/rules";
import { useAllTextStyles } from "../../hooks/CustomStyles";
import { tokens } from "../../ui/theme/tokens";

// 弹窗语言菜单只保留常见语言；当前站点若使用其他语言，会临时追加保留。
const POPUP_COMMON_LANGS = new Set([
  "auto",
  "en",
  "zh-CN",
  "zh-TW",
  "ja",
  "ko",
  "fr",
  "de",
  "es",
  "pt",
  "ru",
  "it",
  "vi",
  "th",
  "id",
  "ar",
]);

const langShortName = (name) => String(name).split(" - ")[0];

/**
 * Popup 弹窗内容主组件
 *
 * @param {Object} props
 * @param {Object} props.rule - 当前网页的翻译规则（包含启用状态、源/目标语言、样式、各种开关）
 * @param {Object} props.setting - 全局通用设置（包含快捷键、API服务列表、划词/悬浮翻译等配置）
 * @param {Function} props.setRule - 更新当前网页规则状态的 React setter
 * @param {Function} props.setSetting - 更新全局设置状态的 React setter
 * @param {Function} props.handleOpenSetting - 打开配置中心页面的回调函数
 * @param {Function} [props.processActions] - 自定义动作处理器（若在非标准扩展环境，如 Shadow DOM 内部运行）
 */
export default function PopupCont({
  rule,
  setting,
  setRule,
  setSetting,
  handleOpenSetting,
  processActions,
}) {
  const i18n = useI18n();
  // 注册的快捷键指令映射表
  const [commands, setCommands] = useState({});
  // 语言胶囊下拉菜单锚点与当前编辑的语言方向
  const [langAnchor, setLangAnchor] = useState(null);
  const [langMenuFor, setLangMenuFor] = useState("from");
  // 可用的译文显示样式列表
  const { allTextStyles } = useAllTextStyles();

  const openLangMenu = (which) => (event) => {
    setLangMenuFor(which);
    setLangAnchor(event.currentTarget);
  };

  const closeLangMenu = () => setLangAnchor(null);

  // 切换“网页双语翻译”开启/关闭状态
  const handleTransToggle = async (e) => {
    try {
      const nextRule = {
        ...rule,
        transOpen: e.target.checked ? "true" : "false",
      };
      setRule(nextRule);
      await persistRule(nextRule);

      if (!processActions) {
        await sendTabMsg(MSG_TRANS_TOGGLE);
      } else {
        processActions({ action: MSG_TRANS_TOGGLE });
      }
    } catch (err) {
      appLog("toggle trans", err);
    }
  };

  // 切换“划词翻译框”的开启/关闭状态
  const handleTransboxToggle = async (e) => {
    try {
      const checked = e.target.checked;
      setSetting((pre) => ({
        ...(pre || {}),
        tranboxSetting: {
          ...(pre?.tranboxSetting || {}),
          transOpen: checked,
        },
      }));

      const nextSetting = {
        ...(setting || {}),
        tranboxSetting: {
          ...(setting?.tranboxSetting || {}),
          transOpen: checked,
        },
      };
      try {
        await persistSetting(nextSetting);
      } catch (err) {
        appLog("persist tranbox toggle", err);
      }

      const payload = { tranboxSetting: nextSetting.tranboxSetting };
      if (!processActions) {
        await sendTabMsg(MSG_TRANS_PUTSETTING, payload);
      } else {
        processActions({ action: MSG_TRANS_PUTSETTING, args: payload });
      }
    } catch (err) {
      appLog("toggle transbox", err);
    }
  };

  // 切换“英文自动翻译”：持久保存并让当前页面立即按新开关生效
  const handleAutoTransEnglishToggle = async (e) => {
    const autoTransEnglish = e.target.checked;
    const nextSetting = { ...(setting || {}), autoTransEnglish };
    setSetting(nextSetting);

    try {
      await persistSetting(nextSetting);
    } catch (err) {
      appLog("persist autoTransEnglish", err);
    }

    // 让所有已打开标签页从存储重读配置，避免旧标签页继续使用过期状态。
    if (isExt) {
      sendBgMsg(MSG_RELOAD_SETTING).catch((err) => {
        appLog("broadcast autoTransEnglish reload", err);
      });
    }

    try {
      if (!processActions) {
        await sendTabMsg(MSG_TRANS_PUTSETTING, { autoTransEnglish });
      } else {
        processActions({
          action: MSG_TRANS_PUTSETTING,
          args: { autoTransEnglish },
        });
      }
    } catch (err) {
      appLog("apply autoTransEnglish", err);
    }
  };

  // 统一处理翻译规则通用设置项的更新（如自动扫描、扫描全部节点、保留排版、仅显示译文等）
  const handleChange = async (e) => {
    try {
      let { name, value } = e.target;
      const nextRule = { ...rule, [name]: value };
      setRule(nextRule);
      await persistRule(nextRule);

      if (!processActions) {
        await sendTabMsg(MSG_TRANS_PUTRULE, { [name]: value });
      } else {
        processActions({ action: MSG_TRANS_PUTRULE, args: { [name]: value } });
      }
    } catch (err) {
      appLog("update rule", err);
    }
  };

  // 监听全局快捷键配置变更，将其转为前端显示的文本字符串形式（如 "Alt+T"）
  useEffect(() => {
    (async () => {
      try {
        const commands = {};
        if (isExt) {
          // 扩展环境：向后台 Background 发送消息查询系统级绑定的快捷键
          const res = await sendBgMsg(MSG_COMMAND_SHORTCUTS);
          res.forEach(({ name, shortcut }) => {
            commands[name] = shortcut;
          });
        } else {
          // 油猴脚本等非扩展环境：从传入的全局 settings.shortcuts 中读取并格式化
          const shortcuts = setting?.shortcuts;
          if (shortcuts) {
            Object.entries(shortcuts).forEach(([key, val]) => {
              commands[key] = val.join("+");
            });
          }
        }
        setCommands(commands);
      } catch (err) {
        appLog("query cmds", err);
      }
    })();
  }, [setting?.shortcuts]);

  // 过滤并根据排序权重对当前所有可用的翻译 API 服务进行排序，生成供下拉菜单展示的 API 列表
  const optApis = useMemo(
    () =>
      (setting?.transApis || [])
        .filter((api) => !api.isDisabled)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
        .map((api) => ({
          key: api.apiSlug,
          name: api.apiName || api.apiSlug,
        })),
    [setting?.transApis]
  );

  // 快捷提取各种交互开关的当前启用状态
  const tranboxEnabled = setting?.tranboxSetting?.transOpen;

  const {
    transOpen,
    apiSlug,
    fromLang,
    toLang,
    textStyle,
    autoScan,
    transOnly,
    scanAll,
  } = rule || {};

  const fromLangLabel =
    OPT_LANGS_FROM.find(([value]) => value === fromLang)?.[1] || fromLang;
  const toLangLabel =
    OPT_LANGS_TO.find(([value]) => value === toLang)?.[1] || toLang;
  const sourceOptions = OPT_LANGS_FROM.filter(
    ([value]) => POPUP_COMMON_LANGS.has(value) || value === fromLang
  );
  const targetOptions = OPT_LANGS_TO.filter(
    ([value]) => POPUP_COMMON_LANGS.has(value) || value === toLang
  );
  const compactLabelSx = {
    "& .MuiFormControlLabel-label": {
      fontSize: tokens.font.sizeData,
    },
  };
  const langCapsuleBaseSx = {
    cursor: "pointer",
    border: "none",
    borderRadius: tokens.radius.full,
    px: `${tokens.spacing.xl}px`,
    py: `${tokens.spacing.sm}px`,
    fontFamily: tokens.font.mono,
    fontSize: tokens.font.sizeLg,
    fontWeight: tokens.font.weightSemibold,
    lineHeight: 1.2,
  };

  return (
    <Stack sx={{ p: 1.5 }} spacing={1.5}>
      {/* 双语状态条：源语蓝 / 译语陶土，点击换语言 */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={1.5}
        sx={{ width: "100%" }}
      >
        <Box
          component="button"
          type="button"
          onClick={openLangMenu("from")}
          aria-haspopup="listbox"
          aria-expanded={langMenuFor === "from" && Boolean(langAnchor)}
          sx={{
            ...langCapsuleBaseSx,
            bgcolor: "info.light",
            color: "info.main",
          }}
        >
          {fromLang === "auto" ? "Auto" : langShortName(fromLangLabel)}
        </Box>
        <Typography
          component="span"
          sx={{
            fontFamily: tokens.font.mono,
            fontSize: tokens.font.sizeSm,
            color: "text.disabled",
          }}
        >
          ⇄
        </Typography>
        <Box
          component="button"
          type="button"
          onClick={openLangMenu("to")}
          aria-haspopup="listbox"
          aria-expanded={langMenuFor === "to" && Boolean(langAnchor)}
          sx={{
            ...langCapsuleBaseSx,
            bgcolor: "primary.light",
            color: "primary.main",
          }}
        >
          {langShortName(toLangLabel)}
        </Box>
      </Stack>

      {/* 主开关：整行状态 */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Box>
          <Typography
            component="div"
            sx={{
              fontSize: tokens.font.sizeMd,
              fontWeight: tokens.font.weightMedium,
              color: "text.primary",
            }}
          >
            {i18n("translate_alt")}
          </Typography>
          <Typography
            component="div"
            sx={{
              fontFamily: tokens.font.mono,
              fontSize: tokens.font.sizeCaption,
              color: "text.secondary",
            }}
          >
            {`${transOpen === "true" ? i18n("status_enabled") : i18n("status_disabled")}${commands["toggleTranslate"] ? ` · ${commands["toggleTranslate"]}` : ""}`}
          </Typography>
        </Box>
        <Switch checked={transOpen === "true"} onChange={handleTransToggle} />
      </Stack>

      {/* 次级开关 2x2 */}
      <Grid container columns={12} spacing={0.5} sx={{ pl: 1.5 }}>
        <Grid item xs={6}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                name="autoScan"
                value={autoScan === "true" ? "false" : "true"}
                checked={autoScan !== "false"}
                onChange={handleChange}
              />
            }
            label={i18n("autoscan_alt")}
            sx={compactLabelSx}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                name="scanAll"
                value={scanAll === "true" ? "false" : "true"}
                checked={scanAll === "true"}
                onChange={handleChange}
              />
            }
            label={i18n("scan_all_nodes")}
            sx={compactLabelSx}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                name="transOnly"
                value={transOnly === "true" ? "false" : "true"}
                checked={transOnly === "true"}
                onChange={handleChange}
              />
            }
            label={i18n("transonly_alt")}
            sx={compactLabelSx}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                name="autoTransEnglish"
                checked={setting?.autoTransEnglish !== false}
                onChange={handleAutoTransEnglishToggle}
              />
            }
            label={i18n("auto_trans_english")}
            sx={compactLabelSx}
          />
        </Grid>
        <Grid item xs={6}>
          <FormControlLabel
            control={
              <Switch
                size="small"
                name="tranboxEnabled"
                value={!tranboxEnabled}
                checked={tranboxEnabled}
                onChange={handleTransboxToggle}
              />
            }
            label={i18n("selection_translate")}
            sx={compactLabelSx}
          />
        </Grid>
      </Grid>

      {/* 服务与样式 */}
      <Box>
        <Stack direction="row" spacing={1}>
          <TextField
            select
            SelectProps={{ MenuProps: { disablePortal: true } }}
            size="small"
            value={apiSlug}
            name="apiSlug"
            label={i18n("translate_service")}
            onChange={handleChange}
            fullWidth
          >
            {optApis.map(({ key, name }) => (
              <MenuItem key={key} value={key}>
                {name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            SelectProps={{ MenuProps: { disablePortal: true } }}
            size="small"
            value={textStyle}
            name="textStyle"
            label={
              commands["toggleStyle"]
                ? `${i18n("text_style_alt")}(${commands["toggleStyle"]})`
                : i18n("text_style_alt")
            }
            onChange={handleChange}
            fullWidth
          >
            {allTextStyles.map((item) => (
              <MenuItem key={item.styleSlug} value={item.styleSlug}>
                {item.styleName}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Box>

      {/* 底部操作：赞赏支持与设置 */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
      >
        <Button
          variant="text"
          onClick={() => {
            window.open(
              "https://github.com/Guivyn/lingoflow#%E8%B5%9E%E8%B5%8F",
              "_blank"
            );
          }}
        >
          {i18n("appreciate_support")}
        </Button>
        <IconButton
          onClick={handleOpenSetting}
          title={i18n("setting")}
          aria-label={i18n("setting")}
          sx={{ p: 0.5 }}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Stack>

      {/* 语言菜单 */}
      <Menu
        anchorEl={langAnchor}
        open={Boolean(langAnchor)}
        onClose={closeLangMenu}
      >
        {(langMenuFor === "from" ? sourceOptions : targetOptions).map(
          ([value, name]) => (
            <MenuItem
              key={value}
              value={value}
              selected={(langMenuFor === "from" ? fromLang : toLang) === value}
              onClick={() => {
                handleChange({ target: { name: langMenuFor, value } });
                closeLangMenu();
              }}
            >
              {value === "auto" ? "Auto" : langShortName(name)}
            </MenuItem>
          )
        )}
      </Menu>
    </Stack>
  );
}
