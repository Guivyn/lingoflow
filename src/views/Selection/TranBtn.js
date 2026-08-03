import { createPortal } from "react-dom";
import { isMobile } from "../../libs/mobile";
import { tokens } from "../../ui/theme/tokens";

/**
 * 划词翻译悬浮触发按钮组件 (网页上划词后出现的蓝色小图标)
 *
 * @param {Object} props
 * @param {Function} props.onTrigger - 点击/触摸按钮时的翻译触发回调
 * @param {string} props.btnEvent - 触发按钮动作的事件类型（如 "onMouseUp" 或 "onTouchEnd"）
 * @param {Object} props.position - 选区计算出的原始绝对坐标 { x, y }
 * @param {number} props.btnOffsetX - 悬浮按钮的横向偏移量
 * @param {number} props.btnOffsetY - 悬浮按钮的纵向偏移量
 */
export default function TranBtn({
  onTrigger,
  btnEvent,
  position,
  btnOffsetX,
  btnOffsetY,
}) {
  // 根据偏移配置，计算得出按钮的物理定位坐标
  const left = position.x + btnOffsetX;
  const top = position.y + btnOffsetY;

  const buttonElement = (
    <div
      className="KT-tranbtn"
      style={{
        cursor: "pointer",
        position: "fixed",
        left,
        top,
        zIndex: 2147483647,
      }}
      // 阻止点击按钮时清除文本选区，防止 Hook 立刻隐藏按钮
      onMouseDown={(e) => e.preventDefault()}
      {...{ [btnEvent]: onTrigger }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width={isMobile ? "32" : "20"}
        height={isMobile ? "32" : "20"}
        viewBox="0 0 48 48"
        version="1.1"
        aria-hidden="true"
      >
        <rect
          x="6"
          y="10"
          width="15"
          height="26"
          rx="7.5"
          fill={tokens.color.blue}
        />
        <rect
          x="25"
          y="16"
          width="15"
          height="16"
          rx="7.5"
          fill={tokens.color.primary}
        />
      </svg>
    </div>
  );

  // 利用 createPortal 直接渲染挂载在宿主页面的 body 最外层
  return createPortal(buttonElement, document.body);
}
