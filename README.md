# Gemini Chat GUIer

This is a Chrome extension that renders interactive GUI components from specially formatted JSON code blocks in the Gemini chat interface. It aims to provide a richer, more intuitive way to interact with Gemini.

本拡張機能は、Geminiのチャット画面に特殊なJSON形式で出力されたコードブロックを、操作可能なGUIコンポーネントに変換して表示します。これにより、Geminiとのよりリッチで直感的な対話を実現することを目指します。

## Overview / 概要

This extension monitors the Gemini chat output. When it detects a JSON code block matching a predefined schema, it replaces that code block with a dynamic HTML GUI component. User interactions with this GUI are then translated back into a JSON string and sent to Gemini as a new prompt.

本拡張機能はGeminiのチャット出力を監視します。定義済みのスキーマに一致するJSONコードブロックを検知すると、その部分を動的なHTMLのGUIコンポーネントに置き換えます。ユーザーがそのGUIを操作すると、その結果が再びJSON形式の文字列に変換され、新しいプロンプトとしてGeminiに送信されます。

## Features (MVP) / 主な機能（MVP）

- **Detects JSON in Gemini:** Uses a `MutationObserver` to find JSON code blocks in real-time.
  (Gemini内のJSONを検知: `MutationObserver` を利用して、リアルタイムにJSONコードブロックを発見します。)
- **Renders GUI:** Currently supports a `button_set` component, rendering a label and a series of buttons.
  (GUIの描画: 現在は `button_set` コンポーネントに対応しており、ラベルと複数のボタンを描画します。)
- **Sends Actions:** Captures button clicks, formats the action into a JSON string, and automatically sends it to Gemini's input field.
  (アクションの送信: ボタンのクリックを検知し、そのアクションをJSON文字列に変換して、自動的にGeminiの入力欄に送信します。)

## Getting Started (for users) / 利用方法

1.  Download this repository as a ZIP file. (このリポジトリをZIPファイルとしてダウンロードします。)
2.  Unzip the file. (ファイルを解凍します。)
3.  Open Chrome and navigate to `chrome://extensions`. (Chromeを開き、`chrome://extensions` にアクセスします。)
4.  Enable "Developer mode" in the top right corner. (右上の「デベロッパーモード」を有効にします。)
5.  Click "Load unpacked" and select the unzipped folder. (「パッケージ化されていない拡張機能を読み込む」をクリックし、解凍したフォルダを選択します。)
6.  The extension is now active on `gemini.google.com`. (これで、`gemini.google.com` 上で拡張機能が有効になります。)

## Development / 開発

To contribute or modify the extension:

1.  Clone this repository. (このリポジトリをクローンします。)
2.  Follow the steps above to load the unpacked extension. (上記「利用方法」の手順に従って、拡張機能を読み込みます。)
3.  After making changes to the source code (`content.js`, `style.css`, `manifest.json`), go to the `chrome://extensions` page and click the "reload" icon on the extension card. (ソースコードを変更した後は、`chrome://extensions` ページを開き、拡張機能カードのリロードアイコンをクリックしてください。)

## Project Structure / プロジェクト構成

- `manifest.json`: The core configuration file for the Chrome extension. (拡張機能の基本的な設定ファイルです。)
- `content.js`: The main script that runs on the Gemini page. It handles DOM observation, GUI rendering, and user interaction. (Geminiのページで実行されるメインスクリプトです。DOMの監視、GUIの描画、ユーザー操作の処理を担当します。)
- `style.css`: Contains the styles for the rendered GUI components. (描画されるGUIコンポーネントのスタイルシートです。)
