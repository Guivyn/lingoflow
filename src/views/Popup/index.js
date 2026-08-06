import { useState, useEffect, useCallback, useMemo } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { sendBgMsg, sendTabMsg, getCurTab } from "../../libs/msg";
import { browser } from "../../libs/browser";
import { useI18n } from "../../hooks/I18n";
import Header from "./Header";
import {
  MSG_OPEN_SEPARATE_WINDOW,
  MSG_TRANS_GETRULE,
  resolveApiPromptList,
} from "../../config";
import { appLog } from "../../libs/log";
import PopupCont from "./PopupCont";
import TranForm from "../Selection/TranForm";
import { useSetting } from "../../hooks/Setting";
import { getSettingWithDefault } from "../../libs/storage";
import { matchRule } from "../../libs/rules";
import { useTheme } from "@mui/material/styles";

/**
 * 获取当前网页的规则与全局设置。
 * 优先向内容脚本查询实时状态（网页翻译开关可能只在内存中变化，未写回存储），
 * 消息通道不可用时再回退到本地 storage / background。
 */
const fetchRule = async () => {
  let contentRes;
  try {
    contentRes = await sendTabMsg(MSG_TRANS_GETRULE);
  } catch (err) {
    contentRes = { error: err?.message || String(err) };
  }

  if (contentRes && !contentRes.error) {
    // 全局设置以本地存储为准，避免长驻标签页的旧内存状态覆盖用户已持久化的开关。
    const setting = await getSettingWithDefault();
    return { rule: contentRes.rule, setting };
  }

  try {
    const tab = await getCurTab();
    const href = tab?.url;
    if (href) {
      const setting = await getSettingWithDefault();
      const rule = await matchRule(href);
      if (setting && rule) {
        return { rule, setting };
      }
    }
  } catch (err) {
    appLog("local rule fallback", err);
  }

  try {
    const bgRes = await sendBgMsg(MSG_TRANS_GETRULE);
    if (bgRes && !bgRes.error) {
      return bgRes;
    }
    return bgRes || contentRes || { error: "no response from content script" };
  } catch (err) {
    return {
      error:
        contentRes?.error ||
        `background fallback failed: ${err?.message || err}`,
    };
  }
};

/**
 * 文本翻译面板组件 (用于直接在 Popup 中输入文本进行翻译)
 */
function Trantab() {
  const [text, setText] = useState("");
  // 获取全局设置
  const { setting } = useSetting();

  const {
    tranboxSetting: {
      enDict,
      enSug,
      apiSlugs,
      fromLang,
      toLang,
      toLang2,
      aiDictApiSlug,
      aiDictPromptSlug,
    } = {},
    transApis = [],
    langDetector = {},
    prompts = [],
    subtitleSetting = {},
  } = setting || {};
  const resolvedTransApis = useMemo(
    () => resolveApiPromptList(transApis, prompts, subtitleSetting),
    [prompts, subtitleSetting, transApis]
  );

  return (
    <Box sx={{ p: 2 }}>
      {/* 渲染主动文本输入翻译表单组件 */}
      <TranForm
        text={text}
        setText={setText}
        apiSlugs={apiSlugs}
        fromLang={fromLang}
        toLang={toLang}
        toLang2={toLang2}
        transApis={resolvedTransApis}
        simpleStyle={false}
        langDetector={langDetector}
        enDict={enDict}
        enSug={enSug}
        aiDictApiSlug={aiDictApiSlug}
        aiDictPromptSlug={aiDictPromptSlug}
        prompts={prompts}
      />
    </Box>
  );
}

/**
 * Popup 浮窗页面主入口组件
 */
export default function Popup() {
  const i18n = useI18n();
  const theme = useTheme();
  // 当前网页的翻译规则设置
  const [rule, setRule] = useState(null);
  // 全局通用设置
  const [setting, setSetting] = useState(null);
  // 是否展示文本翻译输入框面板 (为 true 时显示文本翻译，为 false 时显示网页设置)
  const [showTrantab, setShowTrantab] = useState(false);
  // 是否以独立翻译窗口的模式运行 (通过 URL Hash #tranbox 识别)
  const [isSeparate, setIsSeparate] = useState(false);
  // 获取当前网页规则失败时的错误信息，便于在夸克等浏览器中定位问题
  const [queryError, setQueryError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);

  // 跳转到浏览器插件的设置选项页面
  const handleOpenSetting = useCallback(() => {
    browser?.runtime.openOptionsPage();
  }, []);

  // 页面挂载时：获取当前网页的规则和全局配置，并检测是否是独立窗口
  useEffect(() => {
    (async () => {
      setQueryError("");
      try {
        // ?preview=1 仅用于 QA 截图：用示例数据渲染完整弹窗内容
        if (
          new URLSearchParams(window.location.search).get("preview") === "1"
        ) {
          setRule({
            transOpen: "true",
            autoScan: "true",
            scanAll: "false",
            hasRichText: "true",
            transOnly: "false",
            isPlainText: false,
            apiSlug: "google",
            fromLang: "auto",
            toLang: "zh-CN",
            textStyle: "underline",
          });
          setSetting({
            transApis: [
              { apiSlug: "google", apiName: "Google", isDisabled: false },
              { apiSlug: "openai", apiName: "OpenAI", isDisabled: false },
            ],
            tranboxSetting: { transOpen: true },
            shortcuts: {},
          });
          return;
        }

        const cleanHash = window.location.hash.slice(1);
        if (cleanHash === "tranbox") {
          setIsSeparate(true);
          return;
        }

        // 优先向当前活动的标签页请求规则，失败时由后台兜底计算
        const res = await fetchRule();
        if (res && !res.error) {
          setRule(res.rule);
          setSetting(res.setting);
        } else {
          setQueryError(i18n("popup_rule_load_error"));
        }
      } catch (err) {
        const message = err?.message || String(err);
        appLog("query rule", err);
        setQueryError(message);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reloadTick]);

  // 切换“网页翻译配置”与“输入翻译面板”两个标签页
  const toggleTab = useCallback(() => {
    setShowTrantab((pre) => !pre);
  }, []);

  // 请求后台 Background 在独立的无边框小窗口中打开当前翻译页面，并关闭当前 Popup
  const openSeparateWindow = useCallback(() => {
    sendBgMsg(MSG_OPEN_SEPARATE_WINDOW);
    window.close();
  }, []);

  // 独立窗口模式下只显示文本翻译输入框组件
  if (isSeparate) {
    return (
      <Box
        sx={{ bgcolor: theme.palette.background.default, minHeight: "100vh" }}
      >
        <Trantab />
      </Box>
    );
  }

  return (
    <Box width={360} sx={{ bgcolor: theme.palette.background.default }}>
      {/* 头部组件 */}
      <Header
        toggleTab={toggleTab}
        openSeparateWindow={openSeparateWindow}
        showTrantab={showTrantab}
      />
      {/* 内容区域 */}
      <Box>
        {showTrantab ? (
          <Trantab />
        ) : rule ? (
          <PopupCont
            rule={rule}
            setting={setting}
            setRule={setRule}
            setSetting={setSetting}
            handleOpenSetting={handleOpenSetting}
          />
        ) : (
          /* 如果当前网页规则未成功获取 (例如在扩展禁用的标签页上)，显示备用的支持页脚 */
          <Stack sx={{ p: 2 }} spacing={1.5}>
            {queryError && (
              <Typography
                variant="caption"
                sx={{
                  color: "error.main",
                  overflowWrap: "anywhere",
                  maxHeight: 96,
                  overflowY: "auto",
                }}
              >
                {queryError}
              </Typography>
            )}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <Button
                size="small"
                variant="text"
                onClick={() => setReloadTick((t) => t + 1)}
              >
                {i18n("retry", "Retry")}
              </Button>
              <Button
                size="small"
                variant="text"
                onClick={() => {
                  window.open(
                    "https://chromewebstore.google.com/detail/lingoflow/bdiifdefkgmcblbcghdlonllpjhhjgof/reviews",
                    "_blank"
                  );
                }}
              >
                {i18n("comment_support")}
              </Button>
              <Button
                size="small"
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
              <Button size="small" variant="text" onClick={handleOpenSetting}>
                {i18n("setting")}
              </Button>
            </Stack>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
