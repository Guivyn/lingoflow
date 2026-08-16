import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { apiBaiduSuggest, apiYoudaoSuggest } from "../../services";
import Stack from "@mui/material/Stack";
import Box from "@mui/material/Box";
import { OPT_SUG_BAIDU, OPT_SUG_YOUDAO } from "../../config";
import { useAsyncNow } from "../../hooks/Fetch";
import { useI18n } from "../../hooks/I18n";
import { tokens } from "../../ui/theme/tokens";

/**
 * 百度输入建议/联想词列表组件
 */
function SugBaidu({ text }) {
  const i18n = useI18n();
  // 使用 useAsyncNow 即时查询百度建议接口
  const { loading, error, data } = useAsyncNow(apiBaiduSuggest, text);

  if (loading) {
    return <CircularProgress size={16} />;
  }

  if (error) {
    return (
      <Alert severity="error">
        {`${i18n("suggestion_failed")}: ${error}`}
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {data.map(({ k, v }) => (
        <Box key={k}>
          <Typography
            component="div"
            sx={{
              fontSize: tokens.font.sizeMd,
              fontWeight: tokens.font.weightMedium,
              color: "text.primary",
            }}
          >
            {k}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: `${tokens.spacing.lg}px` }}>
            <Typography
              component="li"
              sx={{
                fontSize: tokens.font.sizeCaption,
                color: "text.secondary",
              }}
            >
              {v}
            </Typography>
          </Box>
        </Box>
      ))}
    </>
  );
}

/**
 * 有道输入建议/联想词列表组件
 */
function SugYoudao({ text }) {
  const i18n = useI18n();
  // 使用 useAsyncNow 即时查询有道建议接口
  const { loading, error, data } = useAsyncNow(apiYoudaoSuggest, text);

  if (loading) {
    return <CircularProgress size={16} />;
  }

  if (error) {
    return (
      <Alert severity="error">
        {`${i18n("suggestion_failed")}: ${error}`}
      </Alert>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <>
      {data.map(({ entry, explain }) => (
        <Box key={entry}>
          <Typography
            component="div"
            sx={{
              fontSize: tokens.font.sizeMd,
              fontWeight: tokens.font.weightMedium,
              color: "text.primary",
            }}
          >
            {entry}
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: `${tokens.spacing.lg}px` }}>
            <Typography
              component="li"
              sx={{
                fontSize: tokens.font.sizeCaption,
                color: "text.secondary",
              }}
            >
              {explain}
            </Typography>
          </Box>
        </Box>
      ))}
    </>
  );
}

/**
 * 输入联想面板容器组件
 *
 * @param {Object} props
 * @param {string} props.text - 当前输入的搜索文本
 * @param {string} props.enSug - 选择的建议联想服务类型 (OPT_SUG_BAIDU 或 OPT_SUG_YOUDAO)
 */
export default function SugCont({ text, enSug }) {
  const i18n = useI18n();

  let content = null;
  if (enSug === OPT_SUG_BAIDU) {
    content = <SugBaidu text={text} />;
  } else if (enSug === OPT_SUG_YOUDAO) {
    content = <SugYoudao text={text} />;
  } else {
    content = (
      <Typography
        sx={{
          fontSize: tokens.font.sizeCaption,
          color: "text.secondary",
        }}
      >
        {i18n("sug_not_supported")}
      </Typography>
    );
  }

  return <Stack spacing={1}>{content}</Stack>;
}
