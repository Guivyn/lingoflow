import { getFabWithDefault, getSettingWithDefault } from "./libs/storage";
import { isIframe } from "./libs/iframe";
import { matchRule } from "./libs/rules";
import { isInBlacklist } from "./libs/blacklist";
import { runSubtitle } from "./subtitle/subtitle";
import { logger } from "./libs/log";
import TranslatorManager from "./libs/translatorManager";

/**
 * 在页面顶部弹出一个悬浮的红色错误提示 Banner 框，持续 10 秒后自动淡出。
 * @param {string} message 错误内容信息
 */
function showErr(message) {
  const bannerId = "LingoFlow-Message";
  const existingBanner = document.getElementById(bannerId);
  if (existingBanner) {
    existingBanner.remove();
  }

  const banner = document.createElement("div");
  banner.id = bannerId;

  // 设置 Banner 绝对定位和高 z-index，保证提示在前台可见
  Object.assign(banner.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    backgroundColor: "#f44336",
    color: "white",
    textAlign: "center",
    padding: "8px 16px",
    zIndex: "1001",
    boxSizing: "border-box",
    fontSize: "16px",
    boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
  });

  const closeButton = document.createElement("span");
  closeButton.textContent = "×";

  Object.assign(closeButton.style, {
    position: "absolute",
    top: "50%",
    right: "20px",
    transform: "translateY(-50%)",
    cursor: "pointer",
    fontSize: "22px",
    fontWeight: "bold",
  });

  const messageText = document.createTextNode(`LingoFlow: ${message}`);
  banner.appendChild(messageText);
  banner.appendChild(closeButton);

  document.body.appendChild(banner);

  // 渐隐淡出效果
  const removeBanner = () => {
    banner.style.transition = "opacity 0.5s ease";
    banner.style.opacity = "0";
    setTimeout(() => {
      if (banner && banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 500);
  };

  closeButton.onclick = removeBanner;
  setTimeout(removeBanner, 10000); // 10秒后自动消失
}

const IFRAME_TEXT_CHECK_TIMEOUT = 1000;
const IFRAME_TEXT_IGNORE_SELECTOR = [
  "script",
  "style",
  "template",
  "noscript",
  "svg",
  "canvas",
  "iframe",
  "input",
  "textarea",
  "select",
  "option",
  ".notranslate",
  "[translate='no']",
  "[contenteditable='true']",
].join(", ");

function waitForDocumentReady(timeout = IFRAME_TEXT_CHECK_TIMEOUT) {
  if (document.readyState !== "loading") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const done = () => {
      clearTimeout(timer);
      document.removeEventListener("DOMContentLoaded", done);
      resolve();
    };
    const timer = setTimeout(done, timeout);
    document.addEventListener("DOMContentLoaded", done, { once: true });
  });
}

function hasIframeTranslatableText() {
  if (!document.body) return false;

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (!node.nodeValue?.trim()) {
          return NodeFilter.FILTER_REJECT;
        }

        if (node.parentElement?.closest(IFRAME_TEXT_IGNORE_SELECTOR)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      },
    }
  );

  return Boolean(walker.nextNode());
}

async function waitForIframeTranslatableText() {
  await waitForDocumentReady();
  return hasIframeTranslatableText();
}

/**
 * 前端翻译器的核心运行总入口。
 */
export async function run() {
  try {
    const href = document?.location?.href || "";

    // 1. 加载本地设置
    const setting = await getSettingWithDefault();

    // 2. 初始化全局日志配置
    logger.setLevel(setting.logLevel);

    // 3. 页面类型拦截：若是 PDF / 图片 / 音视频等非 HTML 或纯文本媒体页面，则终止执行，避免注入多余 DOM
    const contentType = document?.contentType?.toLowerCase() || "";
    const isPdfDocument = contentType.includes("application/pdf");
    if (
      !contentType.includes("text") &&
      !contentType.includes("html") &&
      !isPdfDocument
    ) {
      logger.info("Skip running in document content type: ", contentType);
      return;
    }

    // 5. 网页黑名单校验，命中时彻底不启动翻译
    if (isInBlacklist(href, setting.blacklist)) {
      return;
    }

    // 5.1. iframe 空内容拦截：默认允许 iframe 翻译，但空 iframe 不继续挂载后续脚本
    if (isIframe && !(await waitForIframeTranslatableText())) {
      return;
    }

    // 6. 细粒度划词/输入框/鼠标悬停组件的专属黑名单拦截，若命中则单独禁用该交互组件
    if (isInBlacklist(href, setting.tranboxSetting?.blacklist)) {
      setting.tranboxSetting.transOpen = false;
    }

    if (isInBlacklist(href, setting.mouseHoverSetting?.blacklist)) {
      setting.mouseHoverSetting.useMouseHover = false;
    }

    // 7. 匹配当前网页专用的规则 (三级规则合并：个人 > 内置站点 > 全局)
    const rule = await matchRule(href, setting);
    const fabConfig = { ...(await getFabWithDefault()) };
    // 名单命中时反转全局显隐：全局显示为黑名单，全局隐藏为白名单。
    if (
      !isIframe &&
      !isPdfDocument &&
      isInBlacklist(href, fabConfig.hideExceptionList)
    ) {
      fabConfig.isHide = !fabConfig.isHide;
    }

    // 8. 创建翻译调度器管理器并启动
    const translatorManager = new TranslatorManager({
      setting,
      rule,
      fabConfig,
      isIframe,
      transboxOnly: isPdfDocument,
    });
    translatorManager.start();

    // 9. 若当前页面是嵌套的 iframe，不进行视频字幕翻译，避免多个 iframe 里重复跑字幕服务造成冲突
    if (isIframe || isPdfDocument) {
      return;
    }

    // 10. 启动视频字幕翻译子模块 (仅在顶级 frame 下运行)
    runSubtitle({ href, setting, rule });
  } catch (err) {
    console.error("[LingoFlow]", err);
    showErr(err.message); // 向前台页面绘制报错 Banner，便于用户感知与排查问题
  }
}
