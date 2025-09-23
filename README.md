# Gemini Chat GUIer

This is a Chrome extension that renders interactive GUI components from specially formatted JSON code blocks in the Gemini chat interface. It aims to provide a richer, more intuitive way to interact with Gemini.

## Overview

This extension monitors the Gemini chat output. When it detects a JSON code block matching a predefined schema, it replaces that code block with a dynamic HTML GUI component. User interactions with this GUI are then translated back into a JSON string and sent to Gemini as a new prompt.

## Features (MVP)

- **Detects JSON in Gemini:** Uses a `MutationObserver` to find JSON code blocks in real-time.
- **Renders GUI:** Currently supports a `button_set` component, rendering a label and a series of buttons.
- **Sends Actions:** Captures button clicks, formats the action into a JSON string, and automatically sends it to Gemini's input field.

## Getting Started (for users)

1.  Download this repository as a ZIP file.
2.  Unzip the file.
3.  Open Chrome and navigate to `chrome://extensions`.
4.  Enable "Developer mode" in the top right corner.
5.  Click "Load unpacked" and select the unzipped folder.
6.  The extension is now active on `gemini.google.com`.

## Development

To contribute or modify the extension:

1.  Clone this repository.
2.  Follow the steps above to load the unpacked extension.
3.  After making changes to the source code (`content.js`, `style.css`, `manifest.json`), go to the `chrome://extensions` page and click the "reload" icon on the extension card.

## Project Structure

- `manifest.json`: The core configuration file for the Chrome extension.
- `content.js`: The main script that runs on the Gemini page. It handles DOM observation, GUI rendering, and user interaction.
- `style.css`: Contains the styles for the rendered GUI components.
