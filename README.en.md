# LingoFlow

LingoFlow is a lightweight Chrome extension that turns webpages, selected text, hovered paragraphs, and YouTube subtitles into clean bilingual reading experiences.

## Features

- Whole-page bilingual translation with rule matching, auto scanning, and SPA mutation observation
- Hover translation in inline or bubble mode
- Selection translation with multi-engine comparison, English dictionary, and suggestions
- YouTube subtitle translation with bilingual display, sentence splitting, and AI segmentation
- Engines: Google, Google2, Microsoft, DeepL, DeepLX, DeepSeek, OpenAI, Custom
- Streaming output, batch aggregation, conversation context, custom prompts and hooks, glossary

## Install

1. Clone the repository and run `pnpm build`
2. Open `chrome://extensions` and enable Developer mode
3. Click "Load unpacked" and select the `build/` folder

## Shortcuts

- `Alt+K` Open settings popup
- `Alt+S` Toggle page translation
- `Alt+C` Toggle translation styles

## Development

```bash
pnpm install
pnpm test
pnpm build
```

## License

GPL-3.0
