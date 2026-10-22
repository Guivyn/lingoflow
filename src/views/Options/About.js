import { Box, Button, PageHeading, Stack, Typography } from "../../ui";
import { useI18n } from "../../hooks/I18n";

export default function About() {
  const i18n = useI18n();
  return (
    <Box>
      <PageHeading
        title={i18n("about_lingoflow", "关于 LingoFlow")}
        description={`LingoFlow · v${process.env.REACT_APP_VERSION}`}
      />
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        {i18n("about_reading", "网页、划词与视频字幕的双语阅读工具。")}
      </Typography>
      <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
        <Button
          component="a"
          href="https://github.com/Guivyn/lingoflow"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
        >
          GitHub
        </Button>
        <Button
          component="a"
          href="https://github.com/Guivyn/lingoflow/issues"
          target="_blank"
          rel="noopener noreferrer"
        >
          {i18n("feedback", "反馈问题")}
        </Button>
        <Button
          component="a"
          href="https://github.com/Guivyn/lingoflow#赞赏"
          target="_blank"
          rel="noopener noreferrer"
        >
          {i18n("appreciate_support")}
        </Button>
      </Stack>
    </Box>
  );
}
