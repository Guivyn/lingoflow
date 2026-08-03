import { useI18n } from "../../hooks/I18n";
import {
  OPT_LANGS_FROM_REVERSED as OPT_LANGS_FROM,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
  OPT_TRANBOX_TRIGGER_CLICK,
  OPT_TRANBOX_TRIGGER_ALL,
  OPT_TRANBOX_BTN_POSITION_FIXED,
  OPT_TRANBOX_BTN_POSITION_ALL,
  OPT_TRANBOX_INTERACT_CLICK,
  OPT_TRANBOX_INTERACT_DBLCLICK,
  OPT_DICT_BING,
  OPT_DICT_ALL,
  OPT_SUG_ALL,
  OPT_SUG_YOUDAO,
  PROMPT_MODE_FOLLOW_API,
  getDictionaryPromptOptions,
  getPromptDisplayName,
} from "../../config";
import { useCallback, useMemo } from "react";
import { limitNumber } from "../../libs/utils";
import { useTranbox } from "../../hooks/Tranbox";
import { isExt } from "../../libs/client";
import { useApiList } from "../../hooks/Api";
import { usePromptList } from "../../hooks/Prompt";
import {
  Box,
  Input,
  MenuItem,
  PageHeading,
  Select,
  SettingRow,
  SettingSection,
  ShortcutInput,
  Stack,
  Switch,
  ValidationInput,
} from "../../ui";

/**
 * 划词翻译框 (Tranbox) 样式与交互配置面板组件
 */
export default function Tranbox() {
  const i18n = useI18n();
  // 查词翻译框配置管理 Hook
  const { tranboxSetting, updateTranbox } = useTranbox();
  // 启用的 API 引擎
  // AI 词典只能调用大模型接口，因此这里额外读取已启用的 AI API 列表。
  const { enabledApis, aiEnabledApis } = useApiList();
  const { prompts } = usePromptList();
  // 仅展示词典分类提示词，避免误选翻译或字幕断句提示词。
  const dictionaryPromptOptions = useMemo(
    () => getDictionaryPromptOptions(prompts),
    [prompts]
  );

  // 基础表单输入值变动处理
  const handleChange = (e) => {
    e.preventDefault();
    let { name, value } = e.target;
    // 特殊处理：限制小按钮与翻译框偏移量的安全输入界限在 [-200, 200] 像素内以防 UI 飞出视区
    switch (name) {
      case "btnOffsetX":
      case "btnOffsetY":
      case "boxOffsetX":
      case "boxOffsetY":
        value = limitNumber(value, -200, 200);
        break;
      default:
    }
    updateTranbox({
      [name]: value,
    });
  };

  // 快捷键组合变更处理回调
  const handleShortcutInput = useCallback(
    (val) => {
      updateTranbox({ tranboxShortcut: val });
    },
    [updateTranbox]
  );

  // 解构当前划词翻译配置
  const {
    transOpen,
    apiSlugs,
    singleWordNoTrans = false,
    fromLang,
    toLang,
    toLang2 = "en",
    tranboxShortcut,
    btnOffsetX,
    btnOffsetY,
    boxOffsetX = 0,
    boxOffsetY = 10,
    hideTranBtn = false,
    hideClickAway = false,
    simpleStyle = false,
    followSelection = false,
    autoHeight = false,
    triggerMode = OPT_TRANBOX_TRIGGER_CLICK,
    tranboxInteractMode = "-",
    btnPositionMode = OPT_TRANBOX_BTN_POSITION_FIXED,
    enDict = OPT_DICT_BING,
    enSug = OPT_SUG_YOUDAO,
    aiDictApiSlug = "-",
    aiDictPromptSlug = PROMPT_MODE_FOLLOW_API,
    blacklist = "",
  } = tranboxSetting;

  return (
    <Box>
      <Stack spacing={3}>
        <PageHeading
          title={i18n("selection_translate")}
          description={i18n("toggle_selection_translate")}
        />

        <SettingSection
          title={i18n("basic_setting", "基础设置")}
          extra={i18n("basic_params_helper", "触发方式、交互与外观")}
        >
          <SettingRow title={i18n("toggle_selection_translate")}>
            <Switch
              size="small"
              name="transOpen"
              checked={transOpen}
              onChange={() => {
                updateTranbox({ transOpen: !transOpen });
              }}
            />
          </SettingRow>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              columnGap: "6px",
            }}
          >
            <SettingRow title={i18n("translate_service_multiple")}>
              <Select
                fullWidth
                variant="standard"
                name="apiSlugs"
                value={apiSlugs}
                onChange={handleChange}
                multiple
              >
                {enabledApis.map((api) => (
                  <MenuItem key={api.apiSlug} value={api.apiSlug}>
                    {api.apiName}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("single_word_no_trans")}>
              <Select
                fullWidth
                variant="standard"
                name="singleWordNoTrans"
                value={singleWordNoTrans}
                onChange={handleChange}
              >
                <MenuItem value={false}>{i18n("disable")}</MenuItem>
                <MenuItem value={true}>{i18n("enable")}</MenuItem>
              </Select>
            </SettingRow>
            <SettingRow title={i18n("trigger_mode")}>
              <Select
                fullWidth
                variant="standard"
                name="triggerMode"
                value={triggerMode}
                onChange={handleChange}
              >
                {OPT_TRANBOX_TRIGGER_ALL.map((item) => (
                  <MenuItem key={item} value={item}>
                    {i18n(`trigger_${item}`)}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("tranbtn_position_mode")}>
              <Select
                fullWidth
                variant="standard"
                name="btnPositionMode"
                value={btnPositionMode}
                onChange={handleChange}
              >
                {OPT_TRANBOX_BTN_POSITION_ALL.map((item) => (
                  <MenuItem key={item} value={item}>
                    {i18n(`tranbtn_position_${item}`)}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("hide_tran_button")}>
              <Select
                fullWidth
                variant="standard"
                name="hideTranBtn"
                value={hideTranBtn}
                onChange={handleChange}
              >
                <MenuItem value={false}>{i18n("show")}</MenuItem>
                <MenuItem value={true}>{i18n("hide")}</MenuItem>
              </Select>
            </SettingRow>
            <SettingRow title={i18n("hide_click_away")}>
              <Select
                fullWidth
                variant="standard"
                name="hideClickAway"
                value={hideClickAway}
                onChange={handleChange}
              >
                <MenuItem value={false}>{i18n("disable")}</MenuItem>
                <MenuItem value={true}>{i18n("enable")}</MenuItem>
              </Select>
            </SettingRow>
            <SettingRow title={i18n("use_simple_style")}>
              <Select
                fullWidth
                variant="standard"
                name="simpleStyle"
                value={simpleStyle}
                onChange={handleChange}
              >
                <MenuItem value={false}>{i18n("disable")}</MenuItem>
                <MenuItem value={true}>{i18n("enable")}</MenuItem>
              </Select>
            </SettingRow>
            <SettingRow title={i18n("follow_selection")}>
              <Select
                fullWidth
                variant="standard"
                name="followSelection"
                value={followSelection}
                onChange={handleChange}
              >
                <MenuItem value={false}>{i18n("disable")}</MenuItem>
                <MenuItem value={true}>{i18n("enable")}</MenuItem>
              </Select>
            </SettingRow>
            <SettingRow title={i18n("tranbox_auto_height")}>
              <Select
                fullWidth
                variant="standard"
                name="autoHeight"
                value={autoHeight}
                onChange={handleChange}
              >
                <MenuItem value={false}>{i18n("disable")}</MenuItem>
                <MenuItem value={true}>{i18n("enable")}</MenuItem>
              </Select>
            </SettingRow>
            <SettingRow title={i18n("tranbox_interact_mode")}>
              <Select
                fullWidth
                variant="standard"
                name="tranboxInteractMode"
                value={tranboxInteractMode}
                onChange={handleChange}
              >
                <MenuItem value="-">{i18n("disable")}</MenuItem>
                <MenuItem value={OPT_TRANBOX_INTERACT_CLICK}>
                  {i18n("tranbox_interact_click")}
                </MenuItem>
                <MenuItem value={OPT_TRANBOX_INTERACT_DBLCLICK}>
                  {i18n("tranbox_interact_dblclick")}
                </MenuItem>
              </Select>
            </SettingRow>
            {!isExt && (
              <SettingRow title={i18n("trigger_tranbox_shortcut")}>
                <ShortcutInput
                  value={tranboxShortcut}
                  onChange={handleShortcutInput}
                />
              </SettingRow>
            )}
          </Box>
        </SettingSection>

        <SettingSection
          title={i18n("lang_dict", "语言与词典")}
          extra={i18n("lang_dict_helper", "目标语言、本地词典与 AI 词典")}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              columnGap: "6px",
            }}
          >
            <SettingRow title={i18n("from_lang")}>
              <Select
                fullWidth
                variant="standard"
                name="fromLang"
                value={fromLang}
                onChange={handleChange}
              >
                {OPT_LANGS_FROM.map(([lang, name]) => (
                  <MenuItem key={lang} value={lang}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("to_lang")}>
              <Select
                fullWidth
                variant="standard"
                name="toLang"
                value={toLang}
                onChange={handleChange}
              >
                {OPT_LANGS_TO.map(([lang, name]) => (
                  <MenuItem key={lang} value={lang}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow
              title={i18n("to_lang2")}
              description={i18n("to_lang2_helper")}
            >
              <Select
                fullWidth
                variant="standard"
                name="toLang2"
                value={toLang2}
                onChange={handleChange}
              >
                <MenuItem value={"-"}>{i18n("disable")}</MenuItem>
                {OPT_LANGS_TO.map(([lang, name]) => (
                  <MenuItem key={lang} value={lang}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("english_dict")}>
              <Select
                fullWidth
                variant="standard"
                name="enDict"
                value={enDict}
                onChange={handleChange}
              >
                <MenuItem value={"-"}>{i18n("disable")}</MenuItem>
                {OPT_DICT_ALL.map((item) => (
                  <MenuItem value={item} key={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("english_suggest")}>
              <Select
                fullWidth
                variant="standard"
                name="enSug"
                value={enSug}
                onChange={handleChange}
              >
                <MenuItem value={"-"}>{i18n("disable")}</MenuItem>
                {OPT_SUG_ALL.map((item) => (
                  <MenuItem value={item} key={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("ai_dict_api", "AI词典接口")}>
              <Select
                fullWidth
                variant="standard"
                name="aiDictApiSlug"
                value={aiDictApiSlug}
                onChange={handleChange}
              >
                <MenuItem value={"-"}>{i18n("disable")}</MenuItem>
                {aiEnabledApis.map((api) => (
                  <MenuItem value={api.apiSlug} key={api.apiSlug}>
                    {api.apiName}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
            <SettingRow title={i18n("ai_dict_prompt", "AI词典提示词")}>
              <Select
                fullWidth
                variant="standard"
                name="aiDictPromptSlug"
                value={aiDictPromptSlug}
                onChange={handleChange}
              >
                <MenuItem value={PROMPT_MODE_FOLLOW_API}>
                  {i18n("follow_api_prompt", "接口默认")}
                </MenuItem>
                {dictionaryPromptOptions.map((prompt) => (
                  <MenuItem value={prompt.slug} key={prompt.slug}>
                    {getPromptDisplayName(prompt, i18n)}
                  </MenuItem>
                ))}
              </Select>
            </SettingRow>
          </Box>
        </SettingSection>

        <SettingSection
          title={i18n("position_advanced", "位置与高级")}
          extra={i18n("position_advanced_helper", "偏移量、快捷键与黑名单")}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              columnGap: "6px",
            }}
          >
            <SettingRow title={i18n("tranbtn_offset_x")}>
              <ValidationInput
                fullWidth
                variant="standard"
                type="number"
                name="btnOffsetX"
                value={btnOffsetX}
                onChange={handleChange}
                min={-200}
                max={200}
              />
            </SettingRow>
            <SettingRow title={i18n("tranbtn_offset_y")}>
              <ValidationInput
                fullWidth
                variant="standard"
                type="number"
                name="btnOffsetY"
                value={btnOffsetY}
                onChange={handleChange}
                min={-200}
                max={200}
              />
            </SettingRow>
            <SettingRow title={i18n("tranbox_offset_x")}>
              <ValidationInput
                fullWidth
                variant="standard"
                type="number"
                name="boxOffsetX"
                value={boxOffsetX}
                onChange={handleChange}
                min={-200}
                max={200}
              />
            </SettingRow>
            <SettingRow title={i18n("tranbox_offset_y")}>
              <ValidationInput
                fullWidth
                variant="standard"
                type="number"
                name="boxOffsetY"
                value={boxOffsetY}
                onChange={handleChange}
                min={-200}
                max={200}
              />
            </SettingRow>
          </Box>

          <SettingRow
            title={i18n("blacklist")}
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
        </SettingSection>
      </Stack>
    </Box>
  );
}
