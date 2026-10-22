import { useState, useEffect, useMemo } from "react";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Button from "@mui/material/Button";
import { AdvancedSettings, SegmentedControl } from "../../ui";
import Menu from "@mui/material/Menu";
import IconButton from "@mui/material/IconButton";
import { sendBgMsg, sendTabMsg } from "../../libs/msg";
import { isExt } from "../../libs/client";
import { useI18n } from "../../hooks/I18n";
import TextField from "@mui/material/TextField";
import {
  MSG_TRANS_TOGGLE,
  MSG_TRANS_PUTRULE,
  MSG_TRANS_PUTSETTING,
  MSG_RELOAD_SETTING,
  STOKEY_SETTING,
  MSG_COMMAND_SHORTCUTS,
  OPT_LANGS_FROM_REVERSED as OPT_LANGS_FROM,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
} from "../../config";
import { appLog } from "../../libs/log";
import {
  getSettingWithDefault,
  storage,
  updateStoredSetting,
} from "../../libs/storage";
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
  domain,
}) {
  const i18n = useI18n();
  // 注册的快捷键指令映射表
  const [commands, setCommands] = useState({});
  const [saveError, setSaveError] = useState("");
  // 语言胶囊下拉菜单锚点与当前编辑的语言方向
  const [langAnchor, setLangAnchor] = useState(null);
  const [langMenuFor, setLangMenuFor] = useState("from");
  // 可用的译文显示样式列表
  const { allTextStyles } = useAllTextStyles();

  // 浏览器弹窗与页面内面板都订阅同一设置，外部入口修改后同步开关。
  useEffect(() => {
    let active = true;
    const unsubscribe = storage.subscribe(STOKEY_SETTING, async () => {
      try {
        const nextSetting = await getSettingWithDefault();
        if (active) setSetting(nextSetting);
      } catch (err) {
        appLog("sync popup setting", err);
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [setSetting]);

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
      setSaveError("");

      if (!processActions) {
        await sendTabMsg(MSG_TRANS_TOGGLE);
      } else {
        processActions({ action: MSG_TRANS_TOGGLE });
      }
    } catch (err) {
      setSaveError(i18n("settings_save_failed", "设置未能保存，请重试"));
      appLog("toggle trans", err);
    }
  };

  // 切换“划词翻译框”的开启/关闭状态
  const handleTransboxToggle = async (e) => {
    try {
      const checked = e.target.checked;
      const nextSetting = await updateStoredSetting((current) => ({
        ...current,
        tranboxSetting: {
          ...(current?.tranboxSetting || {}),
          transOpen: checked,
        },
      }));
      setSetting(nextSetting);
      setSaveError("");

      const payload = { tranboxSetting: nextSetting.tranboxSetting };
      if (!processActions) {
        await sendTabMsg(MSG_TRANS_PUTSETTING, payload);
      } else {
        processActions({ action: MSG_TRANS_PUTSETTING, args: payload });
      }
    } catch (err) {
      setSaveError(i18n("settings_save_failed", "设置未能保存，请重试"));
      appLog("toggle transbox", err);
    }
  };

  // 切换“目标语言自动翻译”：持久保存并让当前页面立即按新开关生效
  const handleAutoTransTargetToggle = async (e) => {
    const autoTransTarget = e.target.checked;
    try {
      const nextSetting = await updateStoredSetting({ autoTransTarget });
      setSetting(nextSetting);
      setSaveError("");
    } catch (err) {
      setSaveError(i18n("settings_save_failed", "设置未能保存，请重试"));
      appLog("persist autoTransTarget", err);
      return;
    }

    // 让所有已打开标签页从存储重读配置，避免旧标签页继续使用过期状态。
    if (isExt) {
      sendBgMsg(MSG_RELOAD_SETTING).catch((err) => {
        setSaveError(i18n("settings_save_failed", "设置未能保存，请重试"));
        appLog("broadcast autoTransTarget reload", err);
      });
    }

    try {
      if (!processActions) {
        await sendTabMsg(MSG_TRANS_PUTSETTING, { autoTransTarget });
      } else {
        await processActions({
          action: MSG_TRANS_PUTSETTING,
          args: { autoTransTarget },
        });
      }
    } catch (err) {
      setSaveError(i18n("settings_save_failed", "设置未能保存，请重试"));
      appLog("apply autoTransTarget", err);
    }
  };

  // 统一处理翻译规则通用设置项的更新（如自动扫描、扫描全部节点、保留排版、仅显示译文等）
  const updateRuleFields = async (fields) => {
    try {
      const nextRule = { ...rule, ...fields };
      setRule(nextRule);
      await persistRule(nextRule);
      setSaveError("");

      if (!processActions) {
        await sendTabMsg(MSG_TRANS_PUTRULE, fields);
      } else {
        await processActions({ action: MSG_TRANS_PUTRULE, args: fields });
      }
    } catch (err) {
      setSaveError(i18n("settings_save_failed", "设置未能保存，请重试"));
      appLog("update rule", err);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    return updateRuleFields({ [name]: value });
  };

  const handleSwapLanguages = () => {
    const { fromLang, toLang } = rule;
    const backupLang = setting?.tranboxSetting?.toLang2;
    // Auto 只能用于源语言；反向翻译优先使用已配置的备用目标语言。
    const reverseTarget = OPT_LANGS_TO.some(
      ([value]) => value === backupLang && value !== toLang
    )
      ? backupLang
      : toLang === "en"
        ? "zh-CN"
        : "en";
    closeLangMenu();
    return updateRuleFields({
      fromLang: toLang,
      toLang: fromLang === "auto" ? reverseTarget : fromLang,
    });
  };

  // 监听全局快捷键配置变更，将其转为前端显示的文本字符串形式（如 "Alt+T"）
  useEffect(() => {
    (async () => {
      try {
        const commands = {};
        // 扩展环境：向后台 Background 发送消息查询系统级绑定的快捷键
        const res = await sendBgMsg(MSG_COMMAND_SHORTCUTS);
        res.forEach(({ name, shortcut }) => {
          commands[name] = shortcut;
        });
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
    width: "100%",
    mx: 0,
    py: 0.75,
    justifyContent: "space-between",
    flexDirection: "row-reverse",
    "& .MuiFormControlLabel-label": { fontSize: tokens.font.sizeData },
  };
  const langCapsuleBaseSx = {
    cursor: "pointer",
    border: "none",
    borderRadius: "6px",
    flex: 1,
    minWidth: 0,
    px: 1.5,
    py: 1.25,
    fontFamily: tokens.font.family,
    fontSize: tokens.font.sizeData,
    fontWeight: tokens.font.weightMedium,
    lineHeight: 1.4,
    "&:hover": { filter: "brightness(.98)" },
  };
  const popupRowSx = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 1.5,
    minHeight: 52,
  };
  return (
    <Stack className="lf-popup" sx={{ px: 2.5, pt: 1, pb: 1 }} spacing={0.5}>
      {domain && (
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: tokens.font.sizeCaption,
            pb: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {domain}
        </Typography>
      )}
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
          {fromLang === "auto"
            ? i18n("automatic_detection", "自动检测")
            : langShortName(fromLangLabel)}
        </Box>
        <IconButton
          type="button"
          onClick={handleSwapLanguages}
          title={i18n("swap_languages", "交换语言")}
          aria-label={i18n("swap_languages", "交换语言")}
          size="small"
          sx={{
            fontFamily: tokens.font.mono,
            fontSize: tokens.font.sizeSm,
            color: "text.secondary",
          }}
        >
          ⇄
        </IconButton>
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

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ py: 2 }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{
              m: 0,
              fontFamily: tokens.font.display,
              fontSize: tokens.font.sizeSection,
              fontWeight: 600,
            }}
          >
            {i18n("translate_current_page", "翻译此页")}
          </Typography>
          <Typography
            sx={{
              mt: 0.75,
              fontFamily: tokens.font.mono,
              fontSize: tokens.font.sizeKeycap,
              color: "text.secondary",
            }}
          >
            {transOpen === "true"
              ? i18n("status_enabled")
              : i18n("status_disabled")}
            {commands.toggleTranslate ? " · " + commands.toggleTranslate : ""}
          </Typography>
        </Box>
        <Switch
          inputProps={{ "aria-label": i18n("translate_alt") }}
          checked={transOpen === "true"}
          onChange={handleTransToggle}
        />
      </Stack>
      <Box sx={popupRowSx}>
        <Typography sx={{ fontSize: tokens.font.sizeData }}>
          {i18n("translate_service")}
        </Typography>
        <TextField
          select
          size="small"
          variant="standard"
          name="apiSlug"
          value={optApis.some((a) => a.key === apiSlug) ? apiSlug : ""}
          onChange={handleChange}
          SelectProps={{
            displayEmpty: true,
            inputProps: { "aria-label": i18n("translate_service") },
          }}
          sx={{ width: 185 }}
        >
          {!optApis.some((a) => a.key === apiSlug) && (
            <MenuItem value="" disabled>
              {i18n("choose_service", "请选择服务")}
            </MenuItem>
          )}
          {optApis.map((item) => (
            <MenuItem key={item.key} value={item.key}>
              {item.name}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <Box sx={popupRowSx}>
        <Typography sx={{ fontSize: tokens.font.sizeData }}>
          {i18n("display_mode", "显示方式")}
        </Typography>
        <Box sx={{ width: 185 }}>
          <SegmentedControl
            label={i18n("display_mode", "显示方式")}
            value={transOnly === "true" ? "only" : "bilingual"}
            options={[
              {
                value: "bilingual",
                label: i18n("bilingual_display", "双语对照"),
              },
              { value: "only", label: i18n("translation_only", "仅译文") },
            ]}
            onChange={(value) =>
              updateRuleFields({
                transOnly: value === "only" ? "true" : "false",
              })
            }
          />
        </Box>
      </Box>
      <Box sx={popupRowSx}>
        <Typography sx={{ fontSize: tokens.font.sizeData }}>
          {i18n("text_style_alt")}
        </Typography>
        <TextField
          select
          size="small"
          variant="standard"
          name="textStyle"
          value={
            allTextStyles.some((s) => s.styleSlug === textStyle)
              ? textStyle
              : ""
          }
          onChange={handleChange}
          SelectProps={{
            displayEmpty: true,
            inputProps: { "aria-label": i18n("text_style_alt") },
          }}
          sx={{ width: 185 }}
        >
          {!allTextStyles.some((s) => s.styleSlug === textStyle) && (
            <MenuItem value="">{i18n("none", "无")}</MenuItem>
          )}
          {allTextStyles.map((item) => (
            <MenuItem key={item.styleSlug} value={item.styleSlug}>
              {item.styleName}
            </MenuItem>
          ))}
        </TextField>
      </Box>
      <AdvancedSettings title={i18n("more_options", "更多选项")}>
        <FormControlLabel
          sx={compactLabelSx}
          label={i18n("autoscan_alt")}
          control={
            <Switch
              size="small"
              name="autoScan"
              value={autoScan === "true" ? "false" : "true"}
              checked={autoScan !== "false"}
              onChange={handleChange}
            />
          }
        />
        <FormControlLabel
          sx={compactLabelSx}
          label={i18n("scan_all_nodes")}
          control={
            <Switch
              size="small"
              name="scanAll"
              value={scanAll === "true" ? "false" : "true"}
              checked={scanAll === "true"}
              onChange={handleChange}
            />
          }
        />
        <FormControlLabel
          sx={compactLabelSx}
          label={i18n("auto_trans_target")}
          title={i18n("auto_trans_target_helper")}
          control={
            <Switch
              size="small"
              name="autoTransTarget"
              checked={setting?.autoTransTarget !== false}
              onChange={handleAutoTransTargetToggle}
            />
          }
        />
      </AdvancedSettings>
      <FormControlLabel
        sx={compactLabelSx}
        label={i18n("selection_translate")}
        control={
          <Switch
            size="small"
            name="tranboxEnabled"
            checked={!!tranboxEnabled}
            onChange={handleTransboxToggle}
          />
        }
      />
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ pt: 0.75 }}
      >
        <Button
          size="small"
          onClick={handleOpenSetting}
          sx={{
            color: "text.secondary",
            fontSize: tokens.font.sizeCaption,
            px: 0,
          }}
        >
          {i18n("open_settings", "打开设置")} ↗
        </Button>
        <Typography
          role={saveError ? "alert" : undefined}
          sx={{
            fontSize: tokens.font.sizeKeycap,
            color: saveError ? "error.main" : "text.secondary",
          }}
        >
          {saveError || i18n("settings_auto_save", "修改自动保存")}
        </Typography>
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
                const ruleField =
                  langMenuFor === "from" ? "fromLang" : "toLang";
                handleChange({ target: { name: ruleField, value } });
                closeLangMenu();
              }}
            >
              {value === "auto"
                ? i18n("automatic_detection", "自动检测")
                : langShortName(name)}
            </MenuItem>
          )
        )}
      </Menu>
    </Stack>
  );
}
