import { useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";
import ProductSignature from "../../components/ProductSignature";
import PopupHeader from "../Popup/Header";
import PopupCont from "../Popup/PopupCont";
import TranForm from "../Selection/TranForm";
import { tokens } from "../../ui/theme/tokens";
import { css } from "@emotion/css";
import { builtinStylesMap, translationKeyframes } from "../../libs/style";

const SAMPLE_TRANS_APIS = [
  {
    apiSlug: "google",
    apiName: "Google",
    apiType: "Google",
    isDisabled: false,
  },
  {
    apiSlug: "openai",
    apiName: "OpenAI",
    apiType: "OpenAI",
    isDisabled: false,
  },
];

const SAMPLE_RULE = {
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
};

const SAMPLE_SETTING = {
  transApis: SAMPLE_TRANS_APIS,
  tranboxSetting: { transOpen: true },
  shortcuts: {},
};

const FONT_SAMPLE =
  "Reading across languages should feel as quiet as turning a page. 语言之间的阅读，应该像翻书一样安静。";

const SUGGESTION_WORDS = ["serenity", "serenely", "tranquil", "placid", "calm"];

const INLINE_STYLE_SLUGS = [
  "under_line",
  "paper",
  "dash_box",
  "highlight",
  "blockquote",
  "side_rail",
];

/**
 * 开发验收页：不开扩展即可检查 Popup 与划词窗口的真实组件外观。
 * 仅 development 构建挂载路由，生产包不包含该页面。
 */
export default function Showcase() {
  const theme = useTheme();
  const [sampleText, setSampleText] = useState(
    "Reading across languages should feel as quiet as turning a page."
  );

  return (
    <Box
      sx={{
        bgcolor: theme.palette.background.default,
        minHeight: "100vh",
        px: { xs: 2, md: 6 },
        py: { xs: 4, md: 6 },
      }}
    >
      <Box sx={{ maxWidth: 1080, mx: "auto" }}>
        <Stack direction="row" alignItems="center" spacing={3}>
          <ProductSignature />
          <Typography
            component="h1"
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.font.sizeDisplay,
              fontWeight: tokens.font.weightSemibold,
              letterSpacing: tokens.font.trackingDisplay,
              lineHeight: 1.2,
              margin: 0,
              color: theme.palette.text.primary,
            }}
          >
            界面验收
          </Typography>
        </Stack>

        <Typography
          component="p"
          sx={{
            mt: `${tokens.spacing.md}px`,
            mb: `${tokens.spacing.xxl}px`,
            maxWidth: 560,
            color: theme.palette.text.secondary,
            fontSize: tokens.font.sizeMd,
          }}
        >
          使用真实组件与示例数据渲染，用于不开扩展时快速检查 Popup 与划词窗口。
        </Typography>

        <Stack
          direction={{ xs: "column", md: "row" }}
          spacing={`${tokens.spacing.xxl}px`}
          alignItems="flex-start"
          useFlexGap
        >
          <Box sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
            <Typography
              component="h2"
              sx={{
                fontFamily: tokens.font.display,
                fontSize: tokens.font.sizeSection,
                fontWeight: tokens.font.weightSemibold,
                letterSpacing: tokens.font.trackingSection,
                mb: `${tokens.spacing.md}px`,
                color: theme.palette.text.primary,
              }}
            >
              Popup
            </Typography>
            <Box
              sx={{
                width: "100%",
                border: 1,
                borderColor: theme.palette.divider,
                borderRadius: `${tokens.radius.md}px`,
                overflow: "hidden",
                boxShadow: tokens.shadow.md,
                bgcolor: theme.palette.background.default,
              }}
            >
              <PopupHeader toggleTab={() => {}} openSeparateWindow={() => {}} />
              <PopupCont
                rule={SAMPLE_RULE}
                setting={SAMPLE_SETTING}
                setRule={() => {}}
                setSetting={() => {}}
                handleOpenSetting={() => {}}
              />
            </Box>
          </Box>

          <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
            <Typography
              component="h2"
              sx={{
                fontFamily: tokens.font.display,
                fontSize: tokens.font.sizeSection,
                fontWeight: tokens.font.weightSemibold,
                letterSpacing: tokens.font.trackingSection,
                mb: `${tokens.spacing.md}px`,
                color: theme.palette.text.primary,
              }}
            >
              TranBox
            </Typography>
            <Box
              sx={{
                border: 1,
                borderColor: theme.palette.divider,
                borderRadius: `${tokens.radius.md}px`,
                overflow: "hidden",
                boxShadow: tokens.shadow.md,
                bgcolor: theme.palette.background.paper,
              }}
            >
              <Box
                sx={{
                  height: 40,
                  px: 1.75,
                  display: "flex",
                  alignItems: "center",
                  bgcolor: theme.palette.background.default,
                }}
              >
                <ProductSignature variant="tranbox" />
              </Box>
              <Box sx={{ p: 2 }}>
                <TranForm
                  text={sampleText}
                  setText={setSampleText}
                  apiSlugs={[]}
                  fromLang="en"
                  toLang="zh-CN"
                  toLang2="-"
                  transApis={SAMPLE_TRANS_APIS}
                  simpleStyle={false}
                  langDetector="-"
                  enDict="-"
                  enSug="-"
                  aiDictApiSlug="-"
                />
              </Box>
            </Box>
          </Box>
        </Stack>

        <Box sx={{ mt: `${tokens.spacing.xxxl}px` }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.font.sizeSection,
              fontWeight: tokens.font.weightSemibold,
              letterSpacing: tokens.font.trackingSection,
              mb: `${tokens.spacing.md}px`,
              color: theme.palette.text.primary,
            }}
          >
            字体对比
          </Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={`${tokens.spacing.xl}px`}
            useFlexGap
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                p: `${tokens.spacing.xl}px`,
                border: 1,
                borderColor: theme.palette.divider,
                borderRadius: `${tokens.radius.md}px`,
                bgcolor: theme.palette.background.paper,
              }}
            >
              <Typography
                component="div"
                sx={{
                  mb: `${tokens.spacing.sm}px`,
                  fontFamily: tokens.font.mono,
                  fontSize: tokens.font.sizeKeycap,
                  letterSpacing: tokens.font.trackingCaption,
                  color: theme.palette.text.disabled,
                }}
              >
                BODY · Noto Serif SC（当前）
              </Typography>
              <Typography
                component="p"
                sx={{
                  fontFamily: tokens.font.family,
                  fontSize: tokens.font.sizeMd,
                  lineHeight: 1.7,
                  color: theme.palette.text.primary,
                  margin: 0,
                }}
              >
                {FONT_SAMPLE}
              </Typography>
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                p: `${tokens.spacing.xl}px`,
                border: 1,
                borderColor: theme.palette.divider,
                borderRadius: `${tokens.radius.md}px`,
                bgcolor: theme.palette.background.paper,
              }}
            >
              <Typography
                component="div"
                sx={{
                  mb: `${tokens.spacing.sm}px`,
                  fontFamily: tokens.font.mono,
                  fontSize: tokens.font.sizeKeycap,
                  letterSpacing: tokens.font.trackingCaption,
                  color: theme.palette.text.disabled,
                }}
              >
                BODY · Noto Sans SC（回退）
              </Typography>
              <Typography
                component="p"
                sx={{
                  fontFamily: tokens.font.family,
                  fontSize: tokens.font.sizeMd,
                  lineHeight: 1.7,
                  color: theme.palette.text.primary,
                  margin: 0,
                }}
              >
                {FONT_SAMPLE}
              </Typography>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ mt: `${tokens.spacing.xxxl}px` }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.font.sizeSection,
              fontWeight: tokens.font.weightSemibold,
              letterSpacing: tokens.font.trackingSection,
              mb: `${tokens.spacing.md}px`,
              color: theme.palette.text.primary,
            }}
          >
            TranBox 状态
          </Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={`${tokens.spacing.xl}px`}
            useFlexGap
            alignItems="stretch"
          >
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                border: 1,
                borderColor: theme.palette.divider,
                borderRadius: `${tokens.radius.md}px`,
                overflow: "hidden",
                boxShadow: tokens.shadow.md,
              }}
            >
              <Box
                sx={{
                  height: 40,
                  px: 1.75,
                  display: "flex",
                  alignItems: "center",
                  bgcolor: theme.palette.background.default,
                }}
              >
                <ProductSignature variant="tranbox" />
              </Box>
              <Box
                sx={{
                  p: `${tokens.spacing.lg}px`,
                  minHeight: 220,
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                }}
              >
                <Typography
                  component="div"
                  sx={{
                    fontFamily: tokens.font.display,
                    fontSize: tokens.font.sizeLg,
                    fontWeight: tokens.font.weightSemibold,
                  }}
                >
                  serene
                </Typography>
                <Typography
                  component="div"
                  sx={{
                    mt: `${tokens.spacing.xs}px`,
                    fontFamily: tokens.font.mono,
                    fontSize: tokens.font.sizeCaption,
                    color: theme.palette.text.secondary,
                  }}
                >
                  /sɪˈriːn/
                </Typography>
                <Typography
                  component="div"
                  sx={{
                    mt: `${tokens.spacing.md}px`,
                    fontSize: tokens.font.sizeMd,
                  }}
                >
                  <Box
                    component="span"
                    sx={{ fontWeight: tokens.font.weightSemibold }}
                  >
                    adj.
                  </Box>{" "}
                  calm, peaceful, and untroubled; tranquil.
                </Typography>
                <Typography
                  component="div"
                  sx={{
                    mt: `${tokens.spacing.xs}px`,
                    color: theme.palette.text.secondary,
                    fontSize: tokens.font.sizeMd,
                  }}
                >
                  平静的；安宁的
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                border: 1,
                borderColor: theme.palette.divider,
                borderRadius: `${tokens.radius.md}px`,
                overflow: "hidden",
                boxShadow: tokens.shadow.md,
              }}
            >
              <Box
                sx={{
                  height: 40,
                  px: 1.75,
                  display: "flex",
                  alignItems: "center",
                  bgcolor: theme.palette.background.default,
                }}
              >
                <ProductSignature variant="tranbox" />
              </Box>
              <Box
                sx={{
                  p: `${tokens.spacing.lg}px`,
                  minHeight: 220,
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                }}
              >
                <Chip
                  label="AI 词典"
                  size="small"
                  sx={{ mb: `${tokens.spacing.sm}px` }}
                />
                <Typography
                  component="div"
                  sx={{
                    fontSize: tokens.font.sizeMd,
                    whiteSpace: "pre-line",
                    lineHeight: 1.7,
                  }}
                >
                  {`serene — 宁静的

· 形容平静、不受打扰的状态
· 例句：The lake was serene at dawn.`}
                </Typography>
              </Box>
            </Box>

            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                border: 1,
                borderColor: theme.palette.divider,
                borderRadius: `${tokens.radius.md}px`,
                overflow: "hidden",
                boxShadow: tokens.shadow.md,
              }}
            >
              <Box
                sx={{
                  height: 40,
                  px: 1.75,
                  display: "flex",
                  alignItems: "center",
                  bgcolor: theme.palette.background.default,
                }}
              >
                <ProductSignature variant="tranbox" />
              </Box>
              <Box
                sx={{
                  p: `${tokens.spacing.lg}px`,
                  minHeight: 220,
                  bgcolor: theme.palette.background.paper,
                  color: theme.palette.text.primary,
                }}
              >
                <Typography
                  component="div"
                  sx={{
                    mb: `${tokens.spacing.sm}px`,
                    fontFamily: tokens.font.mono,
                    fontSize: tokens.font.sizeKeycap,
                    letterSpacing: tokens.font.trackingCaption,
                    color: theme.palette.text.disabled,
                  }}
                >
                  SUGGESTIONS
                </Typography>
                <Stack
                  direction="row"
                  spacing={`${tokens.spacing.sm}px`}
                  useFlexGap
                  flexWrap="wrap"
                >
                  {SUGGESTION_WORDS.map((word) => (
                    <Chip key={word} label={word} size="small" />
                  ))}
                </Stack>
              </Box>
            </Box>
          </Stack>
        </Box>

        <Box sx={{ mt: `${tokens.spacing.xxxl}px` }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.font.sizeSection,
              fontWeight: tokens.font.weightSemibold,
              letterSpacing: tokens.font.trackingSection,
              mb: `${tokens.spacing.md}px`,
              color: theme.palette.text.primary,
            }}
          >
            页内译文样式
          </Typography>
          <Stack spacing={`${tokens.spacing.md}px`}>
            {INLINE_STYLE_SLUGS.map((slug) => {
              const styleCode = builtinStylesMap[slug] || "";
              const previewClass = css`
                ${translationKeyframes}
                ${styleCode}
              `;
              return (
                <Box
                  key={slug}
                  sx={{
                    p: `${tokens.spacing.lg}px`,
                    border: 1,
                    borderColor: theme.palette.divider,
                    borderRadius: `${tokens.radius.md}px`,
                    bgcolor: theme.palette.background.paper,
                  }}
                >
                  <Typography
                    component="div"
                    sx={{
                      mb: `${tokens.spacing.sm}px`,
                      fontFamily: tokens.font.mono,
                      fontSize: tokens.font.sizeCaption,
                      letterSpacing: tokens.font.trackingCaption,
                      color: theme.palette.text.disabled,
                    }}
                  >
                    {slug}
                  </Typography>
                  <Box
                    sx={{
                      "--lf-tr-color": theme.palette.mode === "dark"
                        ? tokens.translation.darkAccent
                        : tokens.translation.accent,
                      "--lf-tr-soft": theme.palette.mode === "dark"
                        ? tokens.translation.darkAccentSoft
                        : tokens.translation.accentSoft,
                      "--lf-tr-quote-bg": theme.palette.mode === "dark"
                        ? tokens.translation.darkQuoteBg
                        : tokens.translation.quoteBg,
                      "--lf-tr-highlight-text":
                        theme.palette.mode === "dark"
                          ? tokens.translation.darkHighlightText
                          : tokens.translation.highlightText,
                      "--lf-tr-weak-text": theme.palette.mode === "dark"
                        ? tokens.translation.darkWeakText
                        : tokens.translation.weakText,
                      fontSize: tokens.font.sizeMd,
                      lineHeight: 1.7,
                      color: theme.palette.text.primary,
                    }}
                  >
                    Reading across languages should feel as quiet as turning a
                    page.
                    <span className={previewClass}>
                      {" "}
                      语言之间的阅读，应该像翻书一样安静。
                    </span>
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Box sx={{ mt: `${tokens.spacing.xxxl}px` }}>
          <Typography
            component="h2"
            sx={{
              fontFamily: tokens.font.display,
              fontSize: tokens.font.sizeSection,
              fontWeight: tokens.font.weightSemibold,
              letterSpacing: tokens.font.trackingSection,
              mb: `${tokens.spacing.md}px`,
              color: theme.palette.text.primary,
            }}
          >
            字幕浮层
          </Typography>
          <Box
            sx={{
              minHeight: 220,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: `${tokens.spacing.lg}px`,
              border: 1,
              borderColor: theme.palette.divider,
              borderRadius: `${tokens.radius.md}px`,
              bgcolor: "#151310",
            }}
          >
            <Box
              sx={{
                maxWidth: 640,
                textAlign: "center",
                p: `${tokens.spacing.lg}px`,
                borderRadius: `${tokens.radius.md}px`,
                bgcolor: tokens.subtitle.panelBg,
                backdropFilter: "blur(10px)",
                border: `1px solid ${tokens.subtitle.panelBorder}`,
                boxShadow: tokens.subtitle.shadow,
              }}
            >
              <Typography
                component="div"
                sx={{
                  fontSize: 14,
                  color: tokens.subtitle.originText,
                  letterSpacing: tokens.font.trackingCaption,
                }}
              >
                This is an example subtitle
              </Typography>
              <Typography
                component="div"
                sx={{
                  mt: `${tokens.spacing.xs}px`,
                  fontSize: 22,
                  fontWeight: tokens.font.weightMedium,
                  color: tokens.subtitle.translationText,
                }}
              >
                这是示例字幕译文
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
