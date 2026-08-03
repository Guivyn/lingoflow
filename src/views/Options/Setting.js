import {
  Box,
  Input,
  Link,
  MenuItem,
  Select,
  SettingRow,
  SettingSection,
  ShortcutInput,
  Stack,
  tokens,
  ValidationInput,
} from "../../ui";
import { useSetting } from "../../hooks/Setting";
import { useI18n } from "../../hooks/I18n";
import { useAlert } from "../../hooks/Alert";
import { isExt } from "../../libs/client";

import {
  TRANS_NEWLINE_LENGTH,
  CACHE_NAME,
  OPT_LANGDETECTOR_ALL,
  OPT_SHORTCUT_TRANSLATE,
  OPT_SHORTCUT_TRANSONLY,
  OPT_SHORTCUT_STYLE,
  OPT_SHORTCUT_POPUP,
  OPT_SHORTCUT_SETTING,
  DEFAULT_BLACKLIST,
  DEFAULT_CSPLIST,
  DEFAULT_ORILIST,
  MSG_CONTEXT_MENUS,
  MSG_UPDATE_CSP,
  DEFAULT_HTTP_TIMEOUT,
} from "../../config";
import { useShortcut } from "../../hooks/Shortcut";
import { useFab } from "../../hooks/Fab";
import { sendBgMsg } from "../../libs/msg";
import { appLog, LogLevel } from "../../libs/log";
import LanguageSettings from "./LanguageSettings";

/**
 * 包装单个快捷键录入表单项组件
 */
function ShortcutItem({ action, label }) {
  const { shortcut, setShortcut } = useShortcut(action);
  return (
    <ShortcutInput value={shortcut} onChange={setShortcut} label={label} />
  );
}

/**
 * 基本查词/运行设置中心页面 (Settings)
 */
export default function Settings() {
  const i18n = useI18n();
  const { setting, updateSetting } = useSetting();
  const alert = useAlert();
  const { fab, updateFab } = useFab();

  // 基础表单输入状态更改回调
  const handleChange = (e) => {
    e.preventDefault();
    const { name, value } = e.target;

    // 特定联动：若是浏览器扩展模式，且修改了右键菜单或CSP规则列表，立即向后台 content script / background 发送同步消息
    switch (name) {
      case "contextMenuType":
        isExt && sendBgMsg(MSG_CONTEXT_MENUS, value);
        break;
      case "csplist":
        isExt && sendBgMsg(MSG_UPDATE_CSP, { csplist: value });
        break;
      case "orilist":
        isExt && sendBgMsg(MSG_UPDATE_CSP, { orilist: value });
        break;
      default:
    }
    updateSetting({
      [name]: value,
    });
  };

  // 清除本地网络请求翻译缓存
  const handleClearCache = () => {
    try {
      caches.delete(CACHE_NAME);
      alert.success(i18n("clear_success"));
    } catch (err) {
      appLog("clear cache", err);
    }
  };

  // 解构当前基础查词偏好设置
  const {
    minLength,
    maxLength,
    clearCache,
    newlineLength = TRANS_NEWLINE_LENGTH,
    httpTimeout = DEFAULT_HTTP_TIMEOUT,
    contextMenuType = 1,
    touchModes = [2],
    blacklist = DEFAULT_BLACKLIST.join(",\n"),
    csplist = DEFAULT_CSPLIST.join(",\n"),
    orilist = DEFAULT_ORILIST.join(",\n"),
    transInterval = 100,
    langDetector = "-",
    logLevel = 1,
    preInit = true,
  } = setting;
  // 解构 FAB 悬浮球的显隐状态及点击后的默认交互行为
  const {
    isHide = false,
    fabClickAction = 0,
    hideExceptionList = "",
  } = fab || {};

  return (
    <Box>
      <Stack spacing={`${tokens.spacing.xl}px`}>
        <LanguageSettings />

        {/* 基础参数：文档式两列设置行 */}
        <SettingSection
          title={i18n("basic_params", "基础参数")}
          extra={i18n("basic_params_helper", "扫描、缓存与触发方式")}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              columnGap: "6px",
            }}
          >
            <SettingRow title={i18n("if_pre_init")}>
              <Select
                fullWidth
                variant="standard"
                name="preInit"
                value={preInit}
                onChange={handleChange}
              >
                <MenuItem value={true}>{i18n("enable")}</MenuItem>
                <MenuItem value={false}>{i18n("disable")}</MenuItem>
              </Select>
            </SettingRow>
            <SettingRow title={i18n("fab_click_action")}>
              <Select
                fullWidth
                variant="standard"
                name="fabClickAction"
                value={fabClickAction}
                onChange={(e) => updateFab({ fabClickAction: e.target.value })}
              >
                <MenuItem value={0}>{i18n("fab_click_menu")}</MenuItem>
                <MenuItem value={1}>{i18n("fab_click_translate")}</MenuItem>
              </Select>
            </SettingRow>
            <SettingRow title={i18n("min_translate_length")}>
              <ValidationInput
                fullWidth
                variant="standard"
                label={i18n("min_translate_length")}
                type="number"
                name="minLength"
                value={minLength}
                onChange={handleChange}
                min={1}
                max={100}
              />
            </SettingRow>
            <SettingRow title={i18n("max_translate_length")}>
              <ValidationInput
                fullWidth
                variant="standard"
                label={i18n("max_translate_length")}
                type="number"
                name="maxLength"
                value={maxLength}
                onChange={handleChange}
                min={100}
                max={100000}
              />
            </SettingRow>
            <SettingRow title={i18n("num_of_newline_characters")}>
              <ValidationInput
                fullWidth
                variant="standard"
                label={i18n("num_of_newline_characters")}
                type="number"
                name="newlineLength"
                value={newlineLength}
                onChange={handleChange}
                min={1}
                max={1000}
              />
            </SettingRow>
            <SettingRow title={i18n("translate_interval")}>
              <ValidationInput
                fullWidth
                variant="standard"
                label={i18n("translate_interval")}
                type="number"
                name="transInterval"
                value={transInterval}
                onChange={handleChange}
                min={1}
                max={2000}
              />
            </SettingRow>
            <SettingRow title={i18n("http_timeout")}>
              <ValidationInput
                fullWidth
                variant="standard"
                label={i18n("http_timeout")}
                type="number"
                name="httpTimeout"
                value={httpTimeout}
                onChange={handleChange}
                min={1}
                max={600}
              />
            </SettingRow>
            <SettingRow title={i18n("touch_translate_shortcut")}>
              <Select
                fullWidth
                variant="standard"
                name="touchModes"
                value={touchModes}
                onChange={handleChange}
                multiple
              >
                {[0, 2, 3, 4, 5, 6, 7].map((item) => (
                  <MenuItem key={item} value={item}>
                    {i18n(`touch_tap_${item}`)}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("context_menus")}>
              <Select
                fullWidth
                variant="standard"
                name="contextMenuType"
                value={contextMenuType}
                onChange={handleChange}
              >
                <MenuItem value={0}>{i18n("hide_context_menus")}</MenuItem>
                <MenuItem value={1}>{i18n("simple_context_menus")}</MenuItem>
                <MenuItem value={2}>{i18n("secondary_context_menus")}</MenuItem>
              </Select>
            </SettingRow>
            <SettingRow title={i18n("detected_lang")}>
              <Select
                fullWidth
                variant="standard"
                name="langDetector"
                value={langDetector}
                onChange={handleChange}
              >
                <MenuItem value={"-"}>{i18n("disable")}</MenuItem>
                {OPT_LANGDETECTOR_ALL.map((item) => (
                  <MenuItem value={item} key={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("log_level")}>
              <Select
                fullWidth
                variant="standard"
                name="logLevel"
                value={logLevel}
                onChange={handleChange}
              >
                {Object.values(LogLevel).map(({ value, name }) => (
                  <MenuItem value={value} key={value}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
          </Box>
        </SettingSection>

        {/* 网站与缓存：黑名单、例外与缓存策略 */}
        <SettingSection
          title={i18n("website_cache", "网站与缓存")}
          extra={i18n("website_cache_helper", "黑名单、例外与缓存策略")}
        >
          <SettingRow title={i18n("hide_fab_button")}>
            <Select
              fullWidth
              variant="standard"
              name="isHide"
              value={isHide}
              onChange={(e) => {
                updateFab({ isHide: e.target.value });
              }}
            >
              <MenuItem value={false}>{i18n("show")}</MenuItem>
              <MenuItem value={true}>{i18n("hide")}</MenuItem>
            </Select>
          </SettingRow>
          <SettingRow
            title={i18n("fab_exception_list")}
            description={i18n("fab_exception_list_helper")}
            align="start"
            controlMinWidth={420}
            controlMaxWidth="100%"
          >
            <Input
              fullWidth
              variant="standard"
              multiline
              maxRows={10}
              name="hideExceptionList"
              value={hideExceptionList}
              onChange={(e) => updateFab({ hideExceptionList: e.target.value })}
            />
          </SettingRow>
          <SettingRow
            title={i18n("translate_blacklist")}
            description={i18n("pattern_helper")}
            align="start"
            controlMinWidth={420}
            controlMaxWidth="100%"
          >
            <Input
              fullWidth
              variant="standard"
              name="blacklist"
              value={blacklist}
              onChange={handleChange}
              maxRows={10}
              multiline
            />
          </SettingRow>

          {/* 扩展专属的高级网络设置 (只在 Extension 模式下展示) */}
          {isExt ? (
            <>
              <SettingRow title={i18n("if_clear_cache")}>
                <Select
                  fullWidth
                  variant="standard"
                  name="clearCache"
                  value={clearCache}
                  onChange={handleChange}
                  helperText={
                    <Link component="button" onClick={handleClearCache}>
                      {i18n("clear_all_cache_now")}
                    </Link>
                  }
                >
                  <MenuItem value={false}>
                    {i18n("clear_cache_never")}
                  </MenuItem>
                  <MenuItem value={true}>
                    {i18n("clear_cache_restart")}
                  </MenuItem>
                </Select>
              </SettingRow>
              <SettingRow
                title={i18n("disabled_orilist")}
                description={i18n("pattern_helper")}
                align="start"
                controlMinWidth={420}
                controlMaxWidth="100%"
              >
                <Input
                  fullWidth
                  variant="standard"
                  name="orilist"
                  value={orilist}
                  onChange={handleChange}
                  multiline
                />
              </SettingRow>
              <SettingRow
                title={i18n("disabled_csplist")}
                description={
                  i18n("pattern_helper") + " " + i18n("disabled_csplist_helper")
                }
                align="start"
                controlMinWidth={420}
                controlMaxWidth="100%"
              >
                <Input
                  fullWidth
                  variant="standard"
                  name="csplist"
                  value={csplist}
                  onChange={handleChange}
                  multiline
                />
              </SettingRow>
            </>
          ) : (
            <SettingSection title={i18n("shortcuts", "快捷键")}>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
                  columnGap: "6px",
                }}
              >
                <SettingRow title={i18n("toggle_translate_shortcut")}>
                  <ShortcutItem action={OPT_SHORTCUT_TRANSLATE} />
                </SettingRow>
                <SettingRow title={i18n("toggle_transonly_shortcut")}>
                  <ShortcutItem action={OPT_SHORTCUT_TRANSONLY} />
                </SettingRow>
                <SettingRow title={i18n("toggle_style_shortcut")}>
                  <ShortcutItem action={OPT_SHORTCUT_STYLE} />
                </SettingRow>
                <SettingRow title={i18n("toggle_popup_shortcut")}>
                  <ShortcutItem action={OPT_SHORTCUT_POPUP} />
                </SettingRow>
                <SettingRow title={i18n("open_setting_shortcut")}>
                  <ShortcutItem action={OPT_SHORTCUT_SETTING} />
                </SettingRow>
              </Box>
            </SettingSection>
          )}
        </SettingSection>
      </Stack>
    </Box>
  );
}
