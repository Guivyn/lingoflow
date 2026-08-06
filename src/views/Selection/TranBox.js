import { SettingProvider } from "../../hooks/Setting";
import ThemeProvider from "../../hooks/Theme";
import DraggableResizable from "./DraggableResizable";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import PushPinIcon from "@mui/icons-material/PushPin";
import PushPinOutlinedIcon from "@mui/icons-material/PushPinOutlined";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import CloseIcon from "@mui/icons-material/Close";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import BrightnessAutoIcon from "@mui/icons-material/BrightnessAuto";
import { useI18n } from "../../hooks/I18n";
import { useCallback, useState } from "react";
import TranForm from "./TranForm.js";
import { MSG_OPEN_SEPARATE_WINDOW } from "../../config/msg.js";
import { sendBgMsg } from "../../libs/msg.js";
import { isExt } from "../../libs/client.js";
import { useTheme, alpha } from "@mui/material/styles";
import ProductSignature from "../../components/ProductSignature";
import { isValidWord } from "../../libs/utils";
import { useDarkMode } from "../../hooks/ColorMode";
import { tokens } from "../../ui/theme/tokens";

/**
 * 划词翻译框的顶部导航栏组件
 *
 * @param {Object} props
 * @param {Function} props.setShowBox - 控制划词翻译框显隐的 React setter
 * @param {boolean} props.simpleStyle - 极简模式开关状态
 * @param {Function} props.setSimpleStyle - 控制极简模式开关的 React setter
 * @param {boolean} props.hideClickAway - 点击外部是否自动隐藏划词框的锁定开关状态
 * @param {Function} props.setHideClickAway - 锁定开关的 React setter
 * @param {boolean} props.followSelection - 划词框是否紧跟选区的定位锁定状态
 * @param {Function} props.setFollowSelection - 定位锁定状态的 React setter
 */
function TranBoxHeader({
  setShowBox,
  simpleStyle,
  setSimpleStyle,
  hideClickAway,
  setHideClickAway,
  followSelection,
  setFollowSelection,
}) {
  const theme = useTheme();
  const i18n = useI18n();
  const { darkMode, toggleDarkMode } = useDarkMode();

  const iconColor = theme.palette.text.secondary;

  // 请求在独立的无边框小窗口中打开翻译框
  const openSeparateWindow = useCallback(() => {
    sendBgMsg(MSG_OPEN_SEPARATE_WINDOW);
    setShowBox(false);
  }, [setShowBox]);

  // 鼠标移出按钮后，自动取消焦点
  const blurOnLeave = (e) => e.currentTarget.blur();

  // 顶部操作图标按钮的基础通用样式配置
  const baseBtnStyle = {
    borderRadius: `${tokens.radius.sm}px`,
    padding: "5px",
    minWidth: "30px",
    minHeight: "30px",
    transition: `background-color ${tokens.motion.fast}ms ${tokens.motion.easing}, box-shadow ${tokens.motion.fast}ms ${tokens.motion.easing}, transform ${tokens.motion.fast}ms ${tokens.motion.easing}`,
    backgroundColor: "transparent",
    "& svg": {
      color: iconColor,
    },
    "&:hover": {
      backgroundColor: theme.palette.surfaceMuted,
      transform: "scale(1.04)",
      "& svg": {
        color: theme.palette.text.primary,
      },
    },
    "&:active": {
      transform: "scale(0.96)",
      backgroundColor: theme.palette.primary.light + "40",
    },
  };

  return (
    <Box
      onMouseUp={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      sx={{
        backgroundColor: theme.palette.background.default,
        padding: "6px 10px 6px 14px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        minHeight: "auto",
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        sx={{
          width: "100%",
          height: "100%",
          minWidth: 0,
        }}
      >
        {/* 左侧：Logo 图标与版本号显示 */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ minWidth: 0, flex: "1 1 auto", overflow: "hidden" }}
        >
          <ProductSignature
            variant="tranbox"
            sx={{ flex: "1 1 auto", overflow: "hidden" }}
          />
        </Stack>

        {/* 右侧：功能控制按钮组 */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={0.5}
          sx={{ flexShrink: 0 }}
        >
          {/* 独立窗口打开 */}
          {isExt && (
            <IconButton
              size="small"
              title={i18n("open_separate_window")}
              onClick={openSeparateWindow}
              onMouseLeave={blurOnLeave}
              sx={{
                ...baseBtnStyle,
              }}
            >
              <OpenInNewIcon sx={{ width: 16, height: 16 }} />
            </IconButton>
          )}

          {/* 锁定划词框 (点击外部不消失) */}
          <IconButton
            size="small"
            title={i18n("btn_tip_click_away")}
            onMouseLeave={blurOnLeave}
            onClick={() => setHideClickAway((pre) => !pre)}
            sx={{
              ...baseBtnStyle,
            }}
          >
            {hideClickAway ? (
              <LockOpenIcon
                sx={{
                  width: 16,
                  height: 16,
                  color: theme.palette.success.main,
                }}
              />
            ) : (
              <LockIcon sx={{ width: 16, height: 16 }} />
            )}
          </IconButton>

          {/* 固定位置/跟随划词选区位置切换 */}
          <IconButton
            size="small"
            title={i18n("btn_tip_follow_selection")}
            onMouseLeave={blurOnLeave}
            onClick={() => setFollowSelection((pre) => !pre)}
            sx={{
              ...baseBtnStyle,
            }}
          >
            {followSelection ? (
              <PushPinOutlinedIcon
                sx={{
                  width: 16,
                  height: 16,
                  color: theme.palette.warning.main,
                }}
              />
            ) : (
              <PushPinIcon sx={{ width: 16, height: 16 }} />
            )}
          </IconButton>

          {/* 极简折叠样式切换 */}
          <IconButton
            size="small"
            title={i18n("btn_tip_simple_style")}
            onMouseLeave={blurOnLeave}
            onClick={() => setSimpleStyle((pre) => !pre)}
            sx={{
              ...baseBtnStyle,
            }}
          >
            {simpleStyle ? (
              <UnfoldMoreIcon
                sx={{ width: 16, height: 16, color: theme.palette.info.main }}
              />
            ) : (
              <UnfoldLessIcon sx={{ width: 16, height: 16 }} />
            )}
          </IconButton>

          {/* 深色/浅色/自动主题模式切换 */}
          <IconButton
            size="small"
            title={i18n("btn_tip_dark_mode")}
            onMouseLeave={blurOnLeave}
            onClick={toggleDarkMode}
            sx={{
              ...baseBtnStyle,
            }}
          >
            {darkMode === "dark" ? (
              <DarkModeIcon
                sx={{
                  width: 16,
                  height: 16,
                  color: theme.palette.warning.main,
                }}
              />
            ) : darkMode === "auto" ? (
              <BrightnessAutoIcon
                sx={{
                  width: 16,
                  height: 16,
                  color: theme.palette.info.main,
                }}
              />
            ) : (
              <LightModeIcon sx={{ width: 16, height: 16 }} />
            )}
          </IconButton>

          {/* 关闭翻译框 */}
          <IconButton
            size="small"
            title={i18n("close")}
            onMouseLeave={blurOnLeave}
            onClick={() => setShowBox(false)}
            sx={{
              ...baseBtnStyle,
            }}
          >
            <CloseIcon sx={{ width: 16, height: 16 }} />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
}

/**
 * 划词翻译框的内部表单内容渲染容器组件
 */
function TranBoxContent({
  simpleStyle,
  text,
  setText,
  apiSlugs,
  fromLang,
  toLang,
  toLang2,
  transApis,
  langDetector,
  enDict,
  enSug,
  aiDictApiSlug,
  aiDictPromptSlug,
  prompts,
  selectionContext,
}) {
  const theme = useTheme();
  const scrollbarTrackColor =
    theme.palette.mode === "dark"
      ? theme.palette.surfaceRaised
      : theme.palette.background.paper;
  const scrollbarThumbColor =
    theme.palette.mode === "dark"
      ? alpha(theme.palette.text.primary, 0.28)
      : alpha(theme.palette.text.primary, 0.24);

  return (
    <Box
      sx={{
        p: simpleStyle ? 1 : 2,
        backgroundColor: theme.palette.background.paper,

        "&::-webkit-scrollbar": {
          width: 10,
          height: 10,
        },
        "&::-webkit-scrollbar-track": {
          background: scrollbarTrackColor,
        },
        "&::-webkit-scrollbar-thumb": {
          backgroundColor: scrollbarThumbColor,
          borderRadius: "8px",
          border: `2px solid ${theme.palette.background.paper}`,
        },
        "&::-webkit-scrollbar-thumb:hover": {
          backgroundColor: alpha(theme.palette.text.primary, 0.36),
        },
        // Firefox
        scrollbarWidth: "thin",
        scrollbarColor: `${scrollbarThumbColor} ${scrollbarTrackColor}`,

        color: theme.palette.text.primary,

        lineHeight: 1.55,
      }}
    >
      {/* 嵌入实际的翻译表单 */}
      <TranForm
        text={text}
        setText={setText}
        apiSlugs={apiSlugs}
        fromLang={fromLang}
        toLang={toLang}
        toLang2={toLang2}
        transApis={transApis}
        prompts={prompts}
        simpleStyle={simpleStyle}
        langDetector={langDetector}
        enDict={enDict}
        enSug={enSug}
        aiDictApiSlug={aiDictApiSlug}
        aiDictPromptSlug={aiDictPromptSlug}
        selectionContext={selectionContext}
      />
    </Box>
  );
}

/**
 * 划词翻译框的主容器入口组件 (控制拖拽外壳及规则分发)
 */
export default function TranBox(props) {
  const [mouseHover, setMouseHover] = useState(false);

  const simpleStyle = props.simpleStyle;
  const setSimpleStyle = props.setSimpleStyle;
  const hideClickAway = props.hideClickAway;
  const setHideClickAway = props.setHideClickAway;
  const followSelection = props.followSelection;
  const setFollowSelection = props.setFollowSelection;

  let realApiSlugs = props.tranboxSetting.apiSlugs;
  // 检查是否开启了“如果是单字，则不进行全文大模型/机器翻译，仅展示词典与建议”的性能优化设置
  if (props.tranboxSetting.singleWordNoTrans && isValidWord(props.text)) {
    // 强制清空要调用的翻译引擎 API slugs
    realApiSlugs = [];
  }

  return (
    // 为子组件提供独立翻译框专属的 Setting 上下文
    <SettingProvider context="tranbox">
      {/* 提供独立翻译框专属的自定义样式 CSS 作用的主题 */}
      <ThemeProvider styles={props.extStyles}>
        {props.showBox && (
          // 渲染可拖动可缩放的外壳
          <DraggableResizable
            position={props.boxPosition}
            size={props.boxSize}
            setSize={props.setBoxSize}
            setPosition={props.setBoxPosition}
            autoHeight={props.tranboxSetting.autoHeight}
            header={
              <TranBoxHeader
                setShowBox={props.setShowBox}
                simpleStyle={simpleStyle}
                setSimpleStyle={setSimpleStyle}
                hideClickAway={hideClickAway}
                setHideClickAway={setHideClickAway}
                followSelection={followSelection}
                setFollowSelection={setFollowSelection}
                mouseHover={mouseHover}
              />
            }
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={() => setMouseHover(true)}
            onMouseLeave={() => setMouseHover(false)}
          >
            <TranBoxContent
              simpleStyle={simpleStyle}
              text={props.text}
              setText={props.setText}
              apiSlugs={realApiSlugs}
              fromLang={props.tranboxSetting.fromLang}
              toLang={props.tranboxSetting.toLang}
              toLang2={props.tranboxSetting.toLang2}
              transApis={props.transApis}
              prompts={props.prompts}
              langDetector={props.langDetector}
              enDict={props.tranboxSetting.enDict}
              enSug={props.tranboxSetting.enSug}
              aiDictApiSlug={props.tranboxSetting.aiDictApiSlug}
              aiDictPromptSlug={props.tranboxSetting.aiDictPromptSlug}
              selectionContext={props.selectionContext}
            />
          </DraggableResizable>
        )}
      </ThemeProvider>
    </SettingProvider>
  );
}
