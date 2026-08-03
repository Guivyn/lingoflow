import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AddIcon,
  Box,
  Button,
  CancelIcon,
  ClearAllIcon,
  CodeField,
  DeleteIcon,
  EditIcon,
  ExpandMoreIcon,
  Grid,
  Input,
  MenuItem,
  PageHeading,
  SaveIcon,
  Select,
  SettingSection,
  ShowMoreButton,
  Stack,
  Switch,
  Tab,
  Tabs,
  tokens,
  Typography,
  ValidationInput,
} from "../../ui";
import {
  GLOBAL_KEY,
  DEFAULT_RULE,
  GLOBAL_RULE,
  OPT_LANGS_FROM_REVERSED as OPT_LANGS_FROM,
  OPT_LANGS_TO_REVERSED as OPT_LANGS_TO,
  DEFAULT_TRANS_TAG,
  OPT_SPLIT_PARAGRAPH_DISABLE,
  OPT_SPLIT_PARAGRAPH_ALL,
} from "../../config";
import { useState, useEffect, useMemo } from "react";
import { useI18n } from "../../hooks/I18n";
import { useRules } from "../../hooks/Rules";
import { useAlert } from "../../hooks/Alert";
import { debounce } from "../../libs/utils";
import { useApiList } from "../../hooks/Api";
import { useConfirm } from "../../hooks/Confirm";
import { useAllTextStyles } from "../../hooks/CustomStyles";

// 计算规则的初始表单值
const calculateInitialValues = (rule) => {
  const base = rule?.pattern === "*" ? GLOBAL_RULE : DEFAULT_RULE;
  return { ...base, ...(rule || {}) };
};

// 规则编辑/添加表单字段组件
function RuleFields({ rule, rules, setShow, setKeyword }) {
  // 判断当前是编辑已有规则模式还是添加新规则模式
  const editMode = useMemo(() => !!rule, [rule]);

  const i18n = useI18n();
  // 编辑模式下默认禁用输入框，点击编辑按钮后才允许修改
  const [disabled, setDisabled] = useState(editMode);
  // 表单错误信息状态
  const [errors, setErrors] = useState({});
  // 记录表单的初始值，以便在取消编辑时恢复
  const [initialFormValues, setInitialFormValues] = useState(() =>
    calculateInitialValues(rule)
  );
  // 当前表单输入值的状态
  const [formValues, setFormValues] = useState(initialFormValues);
  // 是否展示高级选项（订阅规则查看时不显示 rules，默认展示高级；自定义规则默认折叠高级选项）
  const [showMore, setShowMore] = useState(!rules);
  // 获取当前已启用的翻译服务 API 列表
  const { enabledApis } = useApiList();
  // 获取自定义文本样式列表
  const { allTextStyles } = useAllTextStyles();

  // 当传入的 rule 发生改变时（如切换了编辑的规则），同步更新表单的初始值和当前值
  useEffect(() => {
    const newInitialValues = calculateInitialValues(rule);
    setInitialFormValues(newInitialValues);
    setFormValues(newInitialValues);
  }, [rule]);

  // 从当前表单状态中解构各个字段，提供默认值
  const {
    pattern, // 匹配的域名或 URL 规则
    selector, // 翻译的目标 CSS 选择器
    keepSelector = "", // 保留不翻译的 CSS 选择器
    blockSelector = "", // 自定义块级元素 CSS 选择器
    rootsSelector = "", // 翻译的根容器 CSS 选择器
    ignoreSelector = "", // 忽略不翻译的 CSS 选择器
    terms, // 专有名词对照表（普通）
    aiTerms, // AI 专有名词对照表
    termsStyle = "", // 专有名词样式
    textExtStyle = "", // 译文额外 CSS 样式
    selectStyle = "", // 针对特定选择器的样式
    parentStyle = "", // 针对选择器父元素的样式
    grandStyle = "", // 针对选择器祖父元素的样式
    injectJs = "", // 页面注入 JS 脚本
    injectCss = "", // 页面注入 CSS 样式
    enableScripts = false, // 是否允许该规则执行 JS/Hook 脚本
    apiSlug, // 指定的翻译服务标识
    fromLang, // 源语言
    toLang, // 目标语言
    textStyle, // 预设译文样式 slug
    transOpen, // 是否开启翻译
    // bgColor,
    // textDiyStyle,
    transOnly = "false", // 是否仅显示译文
    transOnlyRevert = "false", // 是否在鼠标悬停时恢复原文
    transOnlyRevertDelay = "0.5", // 鼠标悬停恢复原文的延迟时间（秒）
    autoScan = "true", // 是否自动扫描页面
    hasRichText = "true", // 是否包含富文本
    hasShadowroot = "false", // 是否包含 Shadow Root
    scanAll = "false", // 是否扫描所有节点
    isPlainText = "false", // 是否启用 <pre> 纯文本翻译
    // transTiming = OPT_TIMING_PAGESCROLL,
    transTag = DEFAULT_TRANS_TAG, // 翻译结果容器标签 (span / font)
    transTitle = "false", // 是否翻译网页标题
    // detectRemote = "true",
    // skipLangs = [],
    // fixerSelector = "",
    // fixerFunc = "-",
    transStartHook = "", // 翻译开始前的钩子函数
    transEndHook = "", // 翻译结束后的钩子函数
    // transRemoveHook = "",
    splitParagraph = OPT_SPLIT_PARAGRAPH_DISABLE, // 段落切分策略
    splitLength = 0, // 段落切分最大长度
    transOrder, // 文本顺序：由 DEFAULT_RULE / GLOBAL_RULE 提供初始值
  } = formValues;

  // 判断当前表单值是否与初始值不同，决定是否激活“保存”按钮
  const isModified = useMemo(() => {
    return JSON.stringify(initialFormValues) !== JSON.stringify(formValues);
  }, [initialFormValues, formValues]);

  // 校验当前输入的 pattern 是否与已有的其他规则冲突（重复的域名规则）
  const hasSamePattern = (str) => {
    for (const item of rules.list) {
      if (item.pattern === str && rule?.pattern !== str) {
        return true;
      }
    }
    return false;
  };

  // 输入框聚焦事件：清空对应输入框的错误提示
  const handleFocus = (e) => {
    e.preventDefault();
    const { name } = e.target;
    setErrors((pre) => ({ ...pre, [name]: "" }));
  };

  // 防抖处理：在新增规则时，随着用户输入 pattern，自动将其作为过滤关键字同步给父组件进行列表过滤显示
  const handlePatternChange = useMemo(
    () =>
      debounce(async (patterns) => {
        setKeyword(patterns.trim());
      }, 500),
    [setKeyword]
  );

  // 通用的表单输入变化处理器
  const handleChange = (e) => {
    e.preventDefault();
    const { name, value } = e.target;
    setFormValues((pre) => ({ ...pre, [name]: value }));
    if (name === "pattern" && !editMode) {
      handlePatternChange(value);
    }
  };

  // 取消按钮处理器：编辑状态下重新禁用表单并回滚修改；新增状态下直接关闭新增面板
  const handleCancel = (e) => {
    e.preventDefault();
    if (editMode) {
      setDisabled(true);
    } else {
      setShow(false);
    }
    setErrors({});
    setFormValues(initialFormValues);
  };

  // 恢复默认设置处理器：将当前规则配置内容还原为系统预置规则
  const handleRestore = (e) => {
    e.preventDefault();
    setFormValues(({ pattern }) => ({
      ...(pattern === "*" ? GLOBAL_RULE : DEFAULT_RULE),
      pattern,
    }));
  };

  // 规则表单保存/新增提交处理器
  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = {};
    // 校验 pattern 不能为空
    if (!pattern.trim()) {
      errors.pattern = i18n("error_cant_be_blank");
    }
    // 校验 pattern 不能重复
    if (hasSamePattern(pattern)) {
      errors.pattern = i18n("error_duplicate_values");
    }
    // 全局规则模式下，目标选择器 selector 不能为空
    if (pattern === "*" && !errors.pattern && !selector.trim()) {
      errors.selector = i18n("error_cant_be_blank");
    }
    if (Object.keys(errors).length > 0) {
      setErrors(errors);
      return;
    }

    if (editMode) {
      // 编辑保存现有规则
      setDisabled(true);
      rules.put(rule.pattern, formValues);
    } else {
      // 提交添加新规则
      rules.add(formValues);
      setShow(false);
      setFormValues(initialFormValues);
    }
  };

  // 全局继承选项（仅在非全局配置项本身编辑时展示，用于子配置继承全局配置值）
  const GlobalItem = rule?.pattern !== "*" && (
    <MenuItem key={GLOBAL_KEY} value={GLOBAL_KEY}>
      {GLOBAL_KEY}
    </MenuItem>
  );

  return (
    <form onSubmit={handleSubmit}>
      <Stack spacing={2}>
        {/* 规则匹配模式输入框（如域名或通配符 '*'） */}
        <CodeField
          size="small"
          label={i18n("pattern")}
          error={!!errors.pattern}
          helperText={errors.pattern || i18n("pattern_helper")}
          name="pattern"
          value={pattern}
          disabled={rule?.pattern === "*" || disabled}
          onChange={handleChange}
          onFocus={handleFocus}
        />
        {/* 翻译根容器选择器配置 */}
        <CodeField
          size="small"
          label={i18n("root_selector")}
          helperText={i18n("root_selector_helper")}
          name="rootsSelector"
          value={rootsSelector}
          disabled={disabled}
          onChange={handleChange}
        />
        {/* 忽略翻译的元素选择器配置 */}
        <CodeField
          size="small"
          label={i18n("ignore_selector")}
          helperText={i18n("ignore_selector_helper")}
          name="ignoreSelector"
          value={ignoreSelector}
          disabled={disabled}
          onChange={handleChange}
        />
        {/* 目标翻译元素选择器配置 */}
        <CodeField
          size="small"
          label={i18n("target_selector")}
          error={!!errors.selector}
          helperText={errors.selector || i18n("selector_helper")}
          name="selector"
          value={selector}
          disabled={autoScan === "true" || disabled}
          onChange={handleChange}
          onFocus={handleFocus}
        />
        {/* 保持不翻译元素选择器配置 */}
        <CodeField
          size="small"
          label={i18n("keep_selector")}
          helperText={i18n("keep_selector_helper")}
          name="keepSelector"
          value={keepSelector}
          disabled={disabled}
          onChange={handleChange}
        />
        {/* 自定义块级元素选择器配置 */}
        <CodeField
          size="small"
          label={i18n("block_selector")}
          helperText={i18n("block_selector_helper")}
          name="blockSelector"
          value={blockSelector}
          disabled={disabled}
          onChange={handleChange}
        />

        <Box>
          <Grid container spacing={2} columns={12}>
            {/* 翻译开关设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="transOpen"
                value={transOpen}
                label={i18n("translate_switch")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"true"}>{i18n("default_enabled")}</MenuItem>
                <MenuItem value={"false"}>{i18n("default_disabled")}</MenuItem>
              </Select>
            </Grid>
            {/* 翻译引擎服务设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="apiSlug"
                value={apiSlug}
                label={i18n("translate_service")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                {enabledApis.map((api) => (
                  <MenuItem key={api.apiSlug} value={api.apiSlug}>
                    {api.apiName}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            {/* 源语言设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="fromLang"
                value={fromLang}
                label={i18n("from_lang")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                {OPT_LANGS_FROM.map(([lang, name]) => (
                  <MenuItem key={lang} value={lang}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            {/* 目标语言设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="toLang"
                value={toLang}
                label={i18n("to_lang")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                {OPT_LANGS_TO.map(([lang, name]) => (
                  <MenuItem key={lang} value={lang}>
                    {name}
                  </MenuItem>
                ))}
              </Select>
            </Grid>

            {/* 自动扫描页面设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="autoScan"
                value={autoScan}
                label={i18n("auto_scan_page")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"false"}>{i18n("disable")}</MenuItem>
                <MenuItem value={"true"}>{i18n("enable")}</MenuItem>
              </Select>
            </Grid>
            {/* 是否翻译富文本设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="hasRichText"
                value={hasRichText}
                label={i18n("has_rich_text")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"false"}>{i18n("disable")}</MenuItem>
                <MenuItem value={"true"}>{i18n("enable")}</MenuItem>
              </Select>
            </Grid>
            {/* 是否支持 Shadow Root 内部文本翻译设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="hasShadowroot"
                value={hasShadowroot}
                label={i18n("has_shadowroot")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"false"}>{i18n("disable")}</MenuItem>
                <MenuItem value={"true"}>{i18n("enable")}</MenuItem>
              </Select>
            </Grid>
            {/* 是否扫描处理页面中所有的节点设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="scanAll"
                value={scanAll}
                label={i18n("scan_all_nodes")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"false"}>{i18n("disable")}</MenuItem>
                <MenuItem value={"true"}>{i18n("enable")}</MenuItem>
              </Select>
            </Grid>

            {/* 是否以纯文本模式翻译 <pre> 内容 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="isPlainText"
                value={isPlainText}
                label={i18n("plain_text_translate")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"false"}>{i18n("disable")}</MenuItem>
                <MenuItem value={"true"}>{i18n("enable")}</MenuItem>
              </Select>
            </Grid>

            {/* 仅显示译文设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="transOnly"
                value={transOnly}
                label={i18n("show_only_translations")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"false"}>{i18n("disable")}</MenuItem>
                <MenuItem value={"true"}>{i18n("enable")}</MenuItem>
              </Select>
            </Grid>

            {/* 文本顺序设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="transOrder"
                value={transOrder}
                label={i18n("trans_order")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value="original-first">
                  {i18n("original_first")}
                </MenuItem>
                <MenuItem value="translation-first">
                  {i18n("translation_first")}
                </MenuItem>
              </Select>
            </Grid>

            {/* 悬停恢复原文设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="transOnlyRevert"
                value={transOnlyRevert}
                label={i18n("transonly_revert")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"false"}>{i18n("disable")}</MenuItem>
                <MenuItem value={"true"}>{i18n("enable")}</MenuItem>
              </Select>
            </Grid>

            {/* 悬停恢复原文延迟时长配置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Input
                size="small"
                fullWidth
                name="transOnlyRevertDelay"
                value={transOnlyRevertDelay}
                label={i18n("transonly_revert_delay")}
                disabled={disabled}
                onChange={handleChange}
                type="number"
                inputProps={{ min: 0, step: 0.1 }}
              />
            </Grid>

            {/* 长段落切分翻译配置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="splitParagraph"
                value={splitParagraph}
                label={i18n("split_paragraph")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                {OPT_SPLIT_PARAGRAPH_ALL.map((item) => (
                  <MenuItem key={item} value={item}>
                    {i18n(item)}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
            {/* 长段落切分翻译的触发长度阈值 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <ValidationInput
                fullWidth
                size="small"
                label={i18n("split_length")}
                type="number"
                name="splitLength"
                value={splitLength}
                disabled={disabled}
                onChange={handleChange}
                min={0}
                max={1000}
              />
            </Grid>
            {/* 是否翻译网页 title 标签配置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="transTitle"
                value={transTitle}
                label={i18n("translate_page_title")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"false"}>{i18n("disable")}</MenuItem>
                <MenuItem value={"true"}>{i18n("enable")}</MenuItem>
              </Select>
            </Grid>
            {/* 插入译文所用的 HTML 标签设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="transTag"
                value={transTag}
                label={i18n("translation_element_tag")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                <MenuItem value={"span"}>{`<span>`}</MenuItem>
                <MenuItem value={"font"}>{`<font>`}</MenuItem>
              </Select>
            </Grid>

            {/* 自定义译文样式模板设置 */}
            <Grid item xs={12} sm={12} md={6} lg={3}>
              <Select
                size="small"
                fullWidth
                name="textStyle"
                value={textStyle}
                label={i18n("text_style")}
                disabled={disabled}
                onChange={handleChange}
              >
                {GlobalItem}
                {allTextStyles.map((item) => (
                  <MenuItem key={item.styleSlug} value={item.styleSlug}>
                    {item.styleName}
                  </MenuItem>
                ))}
              </Select>
            </Grid>
          </Grid>
        </Box>

        {/* 高级选项面板 */}
        {showMore && (
          <>
            {/* 专有名词对照翻译设置 */}
            <Input
              size="small"
              label={i18n("terms")}
              helperText={i18n("terms_helper")}
              name="terms"
              value={terms}
              disabled={disabled}
              onChange={handleChange}
              multiline
              maxRows={10}
            />
            {/* AI 翻译专有名词对照翻译设置 */}
            <Input
              size="small"
              label={i18n("ai_terms")}
              helperText={i18n("ai_terms_helper")}
              name="aiTerms"
              value={aiTerms}
              disabled={disabled}
              onChange={handleChange}
              multiline
              maxRows={10}
            />

            {/* 术语高亮 CSS 样式定义 */}
            <CodeField
              size="small"
              label={i18n("terms_style")}
              name="termsStyle"
              value={termsStyle}
              disabled={disabled}
              onChange={handleChange}
              maxRows={10}
            />
            {/* 译文额外 CSS 样式定义 */}
            <CodeField
              size="small"
              label={i18n("text_ext_style")}
              name="textExtStyle"
              value={textExtStyle}
              disabled={disabled}
              onChange={handleChange}
              maxRows={10}
            />
            {/* 针对翻译元素自身的 CSS 样式定义 */}
            <CodeField
              size="small"
              label={i18n("selector_style")}
              name="selectStyle"
              value={selectStyle}
              disabled={disabled}
              onChange={handleChange}
              maxRows={10}
            />
            {/* 针对翻译元素直接父级的 CSS 样式定义 */}
            <CodeField
              size="small"
              label={i18n("selector_parent_style")}
              name="parentStyle"
              value={parentStyle}
              disabled={disabled}
              onChange={handleChange}
              maxRows={10}
            />
            {/* 针对翻译元素祖父级的 CSS 样式定义 */}
            <CodeField
              size="small"
              label={i18n("selector_grand_style")}
              name="grandStyle"
              value={grandStyle}
              disabled={disabled}
              onChange={handleChange}
              maxRows={10}
            />

            {/* 是否允许执行本规则的 JS/Hook 脚本 */}
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              spacing={2}
            >
              <Box>
                <Typography
                  component="div"
                  sx={{ fontSize: tokens.font.sizeMd, fontWeight: 500 }}
                >
                  {i18n("enable_rule_scripts", "允许执行页面脚本")}
                </Typography>
                <Typography
                  component="div"
                  variant="caption"
                  color="text.secondary"
                >
                  {i18n(
                    "enable_rule_scripts_helper",
                    "控制 injectJs 与翻译 Hook 是否在本规则匹配的页面执行"
                  )}
                </Typography>
              </Box>
              <Switch
                name="enableScripts"
                checked={enableScripts === true}
                disabled={disabled}
                onChange={handleChange}
              />
            </Stack>

            {/* 翻译开始回调脚本配置 */}
            <CodeField
              size="small"
              label={i18n("translate_start_hook")}
              helperText={i18n("translate_start_hook_helper")}
              name="transStartHook"
              value={transStartHook}
              disabled={disabled}
              onChange={handleChange}
              maxRows={10}
            />
            {/* 翻译结束回调脚本配置 */}
            <CodeField
              size="small"
              label={i18n("translate_end_hook")}
              helperText={i18n("translate_end_hook_helper")}
              name="transEndHook"
              value={transEndHook}
              disabled={disabled}
              onChange={handleChange}
              maxRows={10}
            />

            {/* 页面注入的 CSS 样式代码 */}
            <CodeField
              size="small"
              label={i18n("inject_css")}
              helperText={i18n("inject_css_helper")}
              name="injectCss"
              value={injectCss}
              disabled={disabled}
              onChange={handleChange}
              maxRows={10}
            />
            {/* 页面注入的 JS 脚本代码 */}
            <CodeField
              size="small"
              label={i18n("inject_js")}
              helperText={i18n("inject_js_helper")}
              name="injectJs"
              value={injectJs}
              disabled={disabled}
              onChange={handleChange}
              maxRows={10}
            />
          </>
        )}

        {/* 规则保存/编辑/删除控制按钮区域 */}
        {rules &&
          (editMode ? (
            // 编辑已有规则模式
            <Stack direction="row" spacing={2}>
              {disabled ? (
                <>
                  {/* 点击开启表单编辑 */}
                  <Button
                    size="small"
                    variant="contained"
                    onClick={(e) => {
                      e.preventDefault();
                      setDisabled(false);
                    }}
                    startIcon={<EditIcon />}
                  >
                    {i18n("edit")}
                  </Button>
                  {/* 全局默认规则（'*'）不允许删除 */}
                  {rule?.pattern !== "*" && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={(e) => {
                        e.preventDefault();
                        rules.del(rule.pattern);
                      }}
                      startIcon={<DeleteIcon />}
                    >
                      {i18n("delete")}
                    </Button>
                  )}
                </>
              ) : (
                <>
                  {/* 保存编辑修改 */}
                  <Button
                    size="small"
                    variant="contained"
                    type="submit"
                    startIcon={<SaveIcon />}
                    disabled={!isModified}
                  >
                    {i18n("save")}
                  </Button>
                  {/* 取消并撤销更改 */}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleCancel}
                    startIcon={<CancelIcon />}
                  >
                    {i18n("cancel")}
                  </Button>
                  {/* 恢复至系统预置规则配置 */}
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={handleRestore}
                  >
                    {i18n("restore_default")}
                  </Button>
                </>
              )}
              {/* 高级选项折叠展示开关 */}
              <ShowMoreButton showMore={showMore} onChange={setShowMore} />
            </Stack>
          ) : (
            // 新建添加规则模式
            <Stack direction="row" spacing={2}>
              {/* 新增规则保存 */}
              <Button
                size="small"
                variant="contained"
                type="submit"
                startIcon={<SaveIcon />}
              >
                {i18n("save")}
              </Button>
              {/* 新增规则取消 */}
              <Button
                size="small"
                variant="outlined"
                onClick={handleCancel}
                startIcon={<CancelIcon />}
              >
                {i18n("cancel")}
              </Button>
              {/* 高级选项折叠展示开关 */}
              <ShowMoreButton showMore={showMore} onChange={setShowMore} />
            </Stack>
          ))}
      </Stack>
    </form>
  );
}

// 规则折叠面板组件，用于展示和启用/禁用单个规则
function RuleAccordion({ rule, rules, isExpanded = false }) {
  const i18n = useI18n();
  // 面板展开状态
  const [expanded, setExpanded] = useState(isExpanded);
  const alert = useAlert();
  const isGlobalRule = rule.pattern === GLOBAL_KEY;
  const isRuleEnabled = isGlobalRule ? true : rule.enabled !== false;

  // 面板展开/折叠切换
  const handleChange = (e) => {
    setExpanded((pre) => !pre);
  };

  const stopSummaryToggle = (e) => {
    e.stopPropagation();
  };

  const titleOpacity = isRuleEnabled ? 1 : 0.5;

  return (
    <Accordion expanded={expanded} onChange={handleChange}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ width: "100%" }}
        >
          {/* 对于个人规则，提供一个 Switch 按钮，控制该条规则在匹配时的生效状态 */}
          {!isGlobalRule && (
            <Switch
              size="small"
              checked={isRuleEnabled}
              inputProps={{
                "aria-label": `Toggle personal rule ${rule.pattern}`,
              }}
              onPointerDown={stopSummaryToggle}
              onClick={stopSummaryToggle}
              onChange={(e) => {
                const enabled = e.target.checked;
                rules.put(rule.pattern, { enabled });
                alert.success(i18n(enabled ? "rule_enabled" : "rule_disabled"));
              }}
            />
          )}

          <Typography
            sx={{
              opacity: titleOpacity,
              overflowWrap: "anywhere",
              flex: 1,
            }}
          >
            {rule.pattern === GLOBAL_KEY
              ? `[${i18n("global_rule")}] ${rule.pattern}`
              : rule.pattern}
          </Typography>
        </Stack>
      </AccordionSummary>
      <AccordionDetails>
        {expanded && <RuleFields rule={rule} rules={rules} />}
      </AccordionDetails>
    </Accordion>
  );
}

// 个人自定义规则面板组件
function UserRules({ rules }) {
  const i18n = useI18n();
  // 控制是否显示“添加新规则”的表单面板
  const [showAdd, setShowAdd] = useState(false);
  // 匹配关键字状态，用于在添加规则时辅助输入或做本地规则检索
  const [keyword, setKeyword] = useState("");
  // 全局确认弹框
  const confirm = useConfirm();

  // 清空所有自定义规则
  const handleClearAll = async () => {
    const isConfirmed = await confirm({
      confirmText: i18n("confirm_title"),
      cancelText: i18n("cancel"),
    });
    if (isConfirmed) {
      rules.clear();
    }
  };

  // 若关闭了“添加新规则”面板，重置本地过滤关键字
  useEffect(() => {
    if (!showAdd) {
      setKeyword("");
    }
  }, [showAdd]);

  // 规则列表未加载完成时暂不渲染
  if (!rules.list) {
    return;
  }

  return (
    <SettingSection title={i18n("personal_rules")}>
      <Stack spacing={3}>
      {/* 规则操作按钮栏 */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={2}
        useFlexGap
        flexWrap="wrap"
      >
        {/* 点击展开添加规则面板 */}
        <Button
          size="small"
          variant="contained"
          disabled={showAdd}
          onClick={(e) => {
            e.preventDefault();
            setShowAdd(true);
          }}
          startIcon={<AddIcon />}
        >
          {i18n("add")}
        </Button>

        <Button
          size="small"
          variant="outlined"
          onClick={handleClearAll}
          startIcon={<ClearAllIcon />}
        >
          {i18n("clear_all")}
        </Button>
      </Stack>

      {/* 新增规则的表单录入面板 */}
      {showAdd && (
        <RuleFields
          rules={rules}
          setShow={setShowAdd}
          setKeyword={setKeyword}
        />
      )}

      {/* 用户自定义的域名/网址规则列表（支持输入匹配过滤，排除 '*' 全局配置） */}
      <Box>
        {rules.list
          .filter(
            (rule) =>
              rule.pattern !== "*" &&
              (rule.pattern.includes(keyword) || keyword.includes(rule.pattern))
          )
          .map((rule) => (
            <RuleAccordion key={rule.pattern} rule={rule} rules={rules} />
          ))}
      </Box>
      </Stack>
    </SettingSection>
  );
}

// 全局默认规则面板组件（单独将 pattern 为 "*" 的规则抽出来，作为第一标签页展示）
function GlobalRule({ rules }) {
  const i18n = useI18n();
  // 从自定义规则列表的末尾提取全局默认规则 '*'
  const globalRule = useMemo(
    () => rules.list[rules.list.length - 1],
    [rules.list]
  );

  // 未加载到全局规则时暂不渲染
  if (!globalRule) {
    return;
  }

  return (
    <SettingSection title={i18n("global_rule")}>
      <RuleAccordion
        key={globalRule.pattern}
        rule={globalRule}
        rules={rules}
        isExpanded={true} // 默认展开全局规则面板
      />
    </SettingSection>
  );
}

// 规则设置中心主入口组件，负责全局规则与个人自定义规则的两栏式展示
export default function Rules() {
  const i18n = useI18n();
  // 当前处于激活状态的标签页索引 (0: 全局规则, 1: 自定义规则)
  const [activeTab, setActiveTab] = useState(0);
  const rules = useRules();

  // 标签页切换处理器
  const handleTabChange = (e, newValue) => {
    setActiveTab(newValue);
  };

  return (
    <Box>
      <Stack spacing={3}>
        <PageHeading
          title={i18n("rules_setting")}
          description={i18n("rules_warn_1")}
        />

        {/* 规则分类选项卡导航 */}
        <Box>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label={i18n("global_rule")} />
            <Tab label={i18n("personal_rules")} />
          </Tabs>
        </Box>
        {/* 全局默认规则视图 (Tab 0) */}
        <div hidden={activeTab !== 0}>
          {activeTab === 0 && <GlobalRule rules={rules} />}
        </div>
        {/* 个人自定义规则视图 (Tab 1) */}
        <div hidden={activeTab !== 1}>
          {activeTab === 1 && <UserRules rules={rules} />}
        </div>
      </Stack>
    </Box>
  );
}
