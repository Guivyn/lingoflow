import IconButton from "@mui/material/IconButton";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LibraryAddCheckIcon from "@mui/icons-material/LibraryAddCheck";
import { useEffect, useRef, useState } from "react";

/**
 * 复制文本内容按钮组件
 *
 * @param {Object} props
 * @param {string} props.text - 需要复制的纯文本内容
 * @param {string} [props.title="copy"] - 悬浮提示文案
 */
export default function CopyBtn({ text, title = "copy" }) {
  // copied 状态标识是否刚刚成功执行了复制操作
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  const handleClick = async (e) => {
    e.stopPropagation();
    // 写入系统剪贴板
    await navigator.clipboard.writeText(text);
    setCopied(true);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      setCopied(false);
    }, 500);
  };

  return (
    <IconButton
      size="small"
      sx={{
        opacity: 0.5,
        "&:hover": {
          opacity: 1,
        },
      }}
      onClick={handleClick}
      title={title}
    >
      {copied ? (
        <LibraryAddCheckIcon fontSize="inherit" />
      ) : (
        <ContentCopyIcon fontSize="inherit" />
      )}
    </IconButton>
  );
}
