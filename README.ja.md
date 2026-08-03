# LingoFlow

LingoFlow は、Web ページ、選択テキスト、ホバー段落、YouTube 字幕をクリーンなバイリンガル表示にする軽量 Chrome 拡張機能です。

## 機能

- ルールマッチ、自動スキャン、SPA 監視によるページ全体のバイリンガル翻訳
- インラインまたはバブル形式のホバー翻訳
- 複数エンジン比較、英語辞書、入力候補を備えた選択翻訳
- バイリンガル表示、文分割、AI セグメンテーションを備えた YouTube 字幕翻訳
- 対応エンジン：Google、Google2、Microsoft、DeepL、DeepLX、DeepSeek、OpenAI、Custom
- ストリーム出力、バッチ集約、会話コンテキスト、カスタムプロンプトとフック、用語集

## インストール

1. リポジトリをクローンし、`pnpm build` を実行
2. `chrome://extensions` を開き、デベロッパーモードを有効化
3. 「パッケージ化されていない拡張機能を読み込む」で `build/` フォルダを選択

## ショートカット

- `Alt+K` 設定ポップアップを開く
- `Alt+S` ページ翻訳を切り替え
- `Alt+C` 翻訳スタイルを切り替え

## 開発

```bash
pnpm install
pnpm test
pnpm build
```

## ライセンス

GPL-3.0
