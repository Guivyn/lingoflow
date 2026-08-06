import Typography from "@mui/material/Typography";
import { AudioBtn, BaiduAudioBtn } from "./AudioBtn";
import { OPT_DICT_BING, OPT_DICT_YOUDAO } from "../../config";
import { apiMicrosoftDict, apiYoudaoDict } from "../../apis";
import { tokens } from "../../ui/theme/tokens";

function highlightTerm(text, term) {
  if (!text || !term) {
    return text;
  }
  const escaped = String(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = String(text).split(new RegExp(`(${escaped})`, "ig"));
  return parts.map((part, index) =>
    part.toLowerCase() === String(term).toLowerCase() ? (
      <span
        key={index}
        style={{ fontWeight: "bold", color: tokens.color.blue }}
      >
        {part}
      </span>
    ) : (
      part
    )
  );
}

/**
 * 各种英文词典的解析与渲染处理器策略映射表
 */
export const dictHandlers = {
  // ------------------ 必应词典 (Bing Dictionary) ------------------
  [OPT_DICT_BING]: {
    // 异步查询 API 函数
    apiFn: apiMicrosoftDict,
    // 从返回数据中读取单词原型
    reWord: (data) => data?.word,
    // 将词典解释转换为纯文本数组（用于快速复制）
    toText: (data) =>
      data?.trs?.map(({ pos, def }) => `${pos ? `[${pos}] ` : ""}${def}`) || [],
    // 渲染发音部分 (包含音标及发音按钮，包含英音、美音等)
    uiAudio: (data) => (
      <Typography component="div">
        {data?.aus?.map(({ key, audio, phonetic }) => (
          <Typography
            component="div"
            key={key}
            sx={{ display: "inline-block", pr: `${tokens.spacing.sm}px` }}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: tokens.font.mono,
                fontSize: tokens.font.sizeCaption,
                color: "text.secondary",
              }}
            >
              {`${key} [${phonetic || ""}]`}
            </Typography>
            {/* 音频发音按钮 */}
            <AudioBtn src={audio} />
          </Typography>
        ))}
      </Typography>
    ),
    // 渲染词典主体翻译与例句部分
    uiTrans: (data) => (
      <Typography component="div">
        {/* 词性及基本释义列表 */}
        <Typography
          component="ul"
          sx={{
            m: 0,
            pl: `${tokens.spacing.lg}px`,
            mt: `${tokens.spacing.xs}px`,
          }}
        >
          {data?.trs?.map(({ pos, def }, idx) => (
            <Typography
              component="li"
              key={idx}
              sx={{
                mb: `${tokens.spacing.xs}px`,
                fontSize: tokens.font.sizeMd,
              }}
            >
              {pos && `[${pos}] `}
              {def}
            </Typography>
          ))}
        </Typography>

        {/* 单词的时态/变形展示 */}
        {data?.presents?.length > 0 && (
          <Typography
            component="div"
            sx={{
              mt: `${tokens.spacing.md}px`,
              fontFamily: tokens.font.mono,
              fontSize: tokens.font.sizeCaption,
              color: "text.secondary",
            }}
          >
            {data.presents.join(", ")}
          </Typography>
        )}

        {/* 英汉双解详细释义 */}
        {data?.ecs?.length > 0 && (
          <Typography component="div" sx={{ mt: `${tokens.spacing.md}px` }}>
            <Typography
              component="div"
              sx={{
                fontFamily: tokens.font.mono,
                fontSize: tokens.font.sizeKeycap,
                letterSpacing: tokens.font.trackingCaption,
                color: "text.disabled",
                mb: `${tokens.spacing.xs}px`,
              }}
            >
              英汉双解
            </Typography>
            {data.ecs.map(({ pos, lis }) => (
              <Typography component="div" key={pos}>
                <Typography component="div">{pos}</Typography>
                <Typography component="ul">
                  {lis.map((item, idx) => (
                    <Typography component="li" key={idx}>
                      {item}
                    </Typography>
                  ))}
                </Typography>
              </Typography>
            ))}
          </Typography>
        )}

        {/* 显示相关双语例句 */}
        {data?.sentences?.length > 0 && (
          <Typography component="div" sx={{ mt: `${tokens.spacing.md}px` }}>
            <Typography
              component="div"
              sx={{
                fontFamily: tokens.font.mono,
                fontSize: tokens.font.sizeKeycap,
                letterSpacing: tokens.font.trackingCaption,
                color: "text.disabled",
                mb: `${tokens.spacing.xs}px`,
              }}
            >
              例句
            </Typography>
            {/* 仅截取前 2 条例句显示 */}
            {data.sentences.slice(0, 2).map((sentence, idx) => (
              <Typography
                component="div"
                key={idx}
                sx={{ mb: `${tokens.spacing.sm}px` }}
              >
                {/* 英文例句中对查询单词进行高亮处理 */}
                <Typography
                  component="div"
                  sx={{ fontSize: tokens.font.sizeMd }}
                >
                  {highlightTerm(sentence.eng, data.word)}
                </Typography>
                {/* 中文例句对照 */}
                <Typography
                  component="div"
                  sx={{
                    mt: "2px",
                    fontSize: tokens.font.sizeCaption,
                    fontStyle: "italic",
                    color: "text.secondary",
                  }}
                >
                  {sentence.chs}
                </Typography>
              </Typography>
            ))}
          </Typography>
        )}
      </Typography>
    ),
  },

  // ------------------ 有道词典 (Youdao Dictionary) ------------------
  [OPT_DICT_YOUDAO]: {
    // 异步查询 API 函数
    apiFn: apiYoudaoDict,
    // 获取原型词汇
    reWord: (data) => data?.ec?.word?.["return-phrase"],
    // 词义纯文本转换
    toText: (data) =>
      data?.ec?.word?.trs?.map(
        ({ pos, tran }) => `${pos ? `[${pos}] ` : ""}${tran}`
      ) || [],
    // 渲染英音/美音音标并调用百度 TTS 播放发音
    uiAudio: (data) => (
      <Typography component="div">
        <Typography
          component="div"
          sx={{ display: "inline-block", pr: `${tokens.spacing.sm}px` }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: tokens.font.mono,
              fontSize: tokens.font.sizeCaption,
              color: "text.secondary",
            }}
          >
            {`英 ${data?.ec?.word?.ukphone ? `[${data?.ec?.word?.ukphone}]` : ""}`}
          </Typography>
          <BaiduAudioBtn text={data?.ec?.word?.["return-phrase"]} lan="uk" />
        </Typography>
        <Typography
          component="div"
          sx={{ display: "inline-block", pr: `${tokens.spacing.sm}px` }}
        >
          <Typography
            component="span"
            sx={{
              fontFamily: tokens.font.mono,
              fontSize: tokens.font.sizeCaption,
              color: "text.secondary",
            }}
          >
            {`美 ${data?.ec?.word?.usphone ? `[${data?.ec?.word?.usphone}]` : ""}`}
          </Typography>
          <BaiduAudioBtn text={data?.ec?.word?.["return-phrase"]} lan="en" />
        </Typography>
      </Typography>
    ),
    // 渲染有道的中文翻译与例句
    uiTrans: (data) => (
      <Typography component="div">
        <Typography
          component="ul"
          sx={{
            m: 0,
            pl: `${tokens.spacing.lg}px`,
            mt: `${tokens.spacing.xs}px`,
          }}
        >
          {data?.ec?.word?.trs?.map(({ pos, tran }, idx) => (
            <Typography
              component="li"
              key={idx}
              sx={{
                mb: `${tokens.spacing.xs}px`,
                fontSize: tokens.font.sizeMd,
              }}
            >
              {pos && `[${pos}] `}
              {tran}
            </Typography>
          ))}
        </Typography>

        {/* 例句显示 */}
        {data?.blng_sents_part?.["sentence-pair"]?.length > 0 && (
          <Typography component="div" sx={{ mt: `${tokens.spacing.md}px` }}>
            <Typography
              component="div"
              sx={{
                fontFamily: tokens.font.mono,
                fontSize: tokens.font.sizeKeycap,
                letterSpacing: tokens.font.trackingCaption,
                color: "text.disabled",
                mb: `${tokens.spacing.xs}px`,
              }}
            >
              例句
            </Typography>
            {data.blng_sents_part["sentence-pair"]
              .slice(0, 2)
              .map((sentence, idx) => (
                <Typography
                  component="div"
                  key={idx}
                  sx={{ mb: `${tokens.spacing.sm}px` }}
                >
                  <Typography
                    component="div"
                    sx={{ fontSize: tokens.font.sizeMd }}
                  >
                    {/* 同样在英文例句中高亮当前词汇 */}
                    {highlightTerm(
                      sentence.sentence,
                      data.ec?.word?.["return-phrase"]
                    )}
                  </Typography>
                  <Typography
                    component="div"
                    sx={{
                      mt: "2px",
                      fontSize: tokens.font.sizeCaption,
                      fontStyle: "italic",
                      color: "text.secondary",
                    }}
                  >
                    {sentence["sentence-translation"]}
                  </Typography>
                </Typography>
              ))}
          </Typography>
        )}
      </Typography>
    ),
  },
};
