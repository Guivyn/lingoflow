import { useEffect, useCallback } from "react";
import {
  MSG_OPEN_TRANBOX,
  EVENT_LINGOFLOW_INNER,
  getInternalEventSession,
} from "../config";

export default function useTranboxShortcuts({
  showBox,
  setShowBox,
  handleToggleTranbox,
  handleOpenTranbox,
  contextMenuType,
  uiLang,
}) {
  // 快捷展开/隐藏翻译面板的切换函数
  const handleToggle = useCallback(() => {
    if (showBox) {
      setShowBox(false);
    } else {
      handleToggleTranbox();
    }
  }, [showBox, handleToggleTranbox, setShowBox]);

  // 副作用：监听自定义打开翻译面板的 DOM 通信事件（浏览器扩展快捷键触发时会广播此内部消息）
  useEffect(() => {
    const handleStatusUpdate = (event) => {
      if (
        event.detail?.token === getInternalEventSession() &&
        event.detail?.action === MSG_OPEN_TRANBOX
      ) {
        const text = event.detail?.args?.text?.trim();
        if (text) {
          handleOpenTranbox?.(text);
          return;
        }
        handleToggle();
      }
    };

    document.addEventListener(EVENT_LINGOFLOW_INNER, handleStatusUpdate);
    return () => {
      document.removeEventListener(EVENT_LINGOFLOW_INNER, handleStatusUpdate);
    };
  }, [handleToggle, handleOpenTranbox]);
}
