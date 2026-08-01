import { useState, useEffect, useCallback, useMemo } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { sendBgMsg, sendTabMsg, getCurTab } from "../../libs/msg";
import { browser } from "../../libs/browser";
import { useI18n } from "../../hooks/I18n";
import Divider from "@mui/material/Divider";
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

/**
 * 获取当前网页的规则与全局设置。
 * 夸克等环境对 Popup -> content script / background 的消息通道兼容不稳定，
 * 因此优先直接读取本地 storage 并匹配当前标签页 URL，避免依赖消息往返。
 */
const fetchRule = async () => {
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

  let contentRes;
  try {
    contentRes = await sendTabMsg(MSG_TRANS_GETRULE);
  } catch (err) {
    contentRes = { error: err?.message || String(err) };
  }

  if (contentRes && !contentRes.error) {
    return contentRes;
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

  // REVIEW: 如果在异步加载未完成或出现异常时 setting 仍为 null / undefined，此处直接解构 setting 将导致 TypeError 崩溃。建议对 setting 进行判空保护，例如：const { tranboxSetting = {}, transApis = [], langDetector = {} } = setting || {};
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
    },
    transApis,
    langDetector,
    prompts,
    subtitleSetting,
  } = setting;
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
          setQueryError(res?.error || "no response from content script");
        }
      } catch (err) {
        const message = err?.message || String(err);
        appLog("query rule", err);
        setQueryError(message);
      }
    })();
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
      <Box>
        <Trantab />
      </Box>
    );
  }

  return (
    <Box width={360}>
      {/* 头部组件 */}
      <Header toggleTab={toggleTab} openSeparateWindow={openSeparateWindow} />
      <Divider />
      {/* 内容区域 (可垂直滚动) */}
      <Box sx={{ overflowY: "auto", maxHeight: 500 }}>
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
