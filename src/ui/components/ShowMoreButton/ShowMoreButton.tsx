import { useI18n } from "../../../hooks/I18n";
import Button from "../Button/Button";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

export interface ShowMoreButtonProps {
  showMore: boolean;
  onChange: (updater: (prev: boolean) => boolean) => void;
}

/**
 * 高级设置折叠/展开控制按钮。
 */
export default function ShowMoreButton({
  showMore,
  onChange,
}: ShowMoreButtonProps) {
  const i18n = useI18n();

  const handleClick = () => {
    onChange((prev) => !prev);
  };

  return (
    <Button
      size="small"
      variant="text"
      onClick={handleClick}
      startIcon={showMore ? <ExpandLessIcon /> : <ExpandMoreIcon />}
    >
      {i18n(showMore ? "less" : "more")}
    </Button>
  );
}
