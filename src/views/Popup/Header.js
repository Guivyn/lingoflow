import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Stack from "@mui/material/Stack";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { useI18n } from "../../hooks/I18n";
import ProductSignature from "../../components/ProductSignature";

/**
 * Popup 弹窗页面头部组件
 *
 * @param {Object} props
 * @param {Function} [props.onClose] - 关闭弹窗的回调函数（仅在作为内嵌组件展示时有值）
 * @param {Function} props.toggleTab - 切换“网页翻译设置”与“文本翻译面板”的函数
 * @param {boolean} [props.showTrantab] - 是否正在显示文本翻译面板
 * @param {Function} props.openSeparateWindow - 在独立小窗口中打开翻译界面的函数
 */
export default function Header({
  onClose,
  toggleTab,
  openSeparateWindow,
  showTrantab = false,
}) {
  const i18n = useI18n();

  // 打开项目主页/官方网站
  const handleHomepage = () => {
    window.open(process.env.REACT_APP_HOMEPAGE, "_blank");
  };

  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={2}
      sx={{ px: 2, pt: 1.5, pb: 0.5 }}
    >
      {/* 头部左侧：主页按钮与插件名称/版本号 */}
      <Stack direction="row" justifyContent="flex-start" alignItems="center">
        <IconButton
          onClick={handleHomepage}
          title="LingoFlow"
          sx={{ p: 0.5 }}
        >
          <ProductSignature variant="popup" />
        </IconButton>
      </Stack>

      {/* 头部右侧：根据 onClose 是否存在，渲染关闭按钮，或者功能控制按钮（切换面板、新窗口打开） */}
      {onClose ? (
        <IconButton
          onClick={() => {
            onClose();
          }}
        >
          <CloseIcon />
        </IconButton>
      ) : (
        <Stack direction="row" alignItems="center">
          {/* 切换到独立文本翻译输入框面板 */}
          <IconButton
            onClick={toggleTab}
            title={i18n("toggle_transbox")}
            aria-label={i18n("toggle_transbox")}
            sx={{
              p: 0.75,
              color: showTrantab ? "primary.main" : "inherit",
            }}
          >
            <ChatBubbleOutlineIcon fontSize="small" />
          </IconButton>
          {/* <DarkModeButton /> */}
          {/* 独立窗口打开 */}
          <IconButton
            onClick={openSeparateWindow}
            title={i18n("open_separate_window")}
            aria-label={i18n("open_separate_window")}
            sx={{ p: 0.75 }}
          >
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Stack>
      )}
    </Stack>
  );
}
