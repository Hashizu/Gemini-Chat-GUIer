console.log("Gemini Chat GUIer content script loaded.");

// --- Start of added code for initial prompt ---

// State variables to manage the initial prompt injection
let promptSentForNewChat = false;
let currentPath = window.location.pathname;
let initialPrompt = null;

/**
 * Fetches the initial prompt content from the prompt.md file.
 * Once fetched, it triggers a state check to see if the prompt should be sent.
 */
async function fetchInitialPrompt() {
  try {
    const response = await fetch(chrome.runtime.getURL('prompt.md'));
    if (!response.ok) {
      throw new Error(`Failed to fetch prompt.md: ${response.statusText}`);
    }
    initialPrompt = await response.text();
    console.log("Initial prompt loaded successfully.");
    // Immediately check the state in case the script loaded on the correct page.
    handleChatStateChange();
  } catch (error) {
    console.error("Error loading initial prompt:", error);
  }
}

/**
 * Sends a raw text prompt to Gemini's input field (with retries).
 * This is a variant of sendActionToGemini but for plain text.
 * @param {string} promptText - The raw text to send.
 * @param {number} retries - The number of remaining retries.
 */
function sendRawPrompt(promptText, retries = 5) {
  if (retries < 0) {
    console.error('Could not find Gemini input field or send button after multiple retries.');
    // As a fallback, copy to clipboard, but don't alert for this automated action.
    navigator.clipboard.writeText(promptText);
    return;
  }

  const inputFieldSelector = 'div[aria-label="ここにプロンプトを入力してください"]';
  const sendButtonSelector = 'div.send-button-container button';

  const inputField = document.querySelector(inputFieldSelector);
  const sendButton = document.querySelector(sendButtonSelector);

  if (inputField && sendButton) {
    inputField.textContent = promptText;
    inputField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

    setTimeout(() => {
      if (!sendButton.disabled) {
        sendButton.click();
        console.log('Sent initial prompt to Gemini.');
      } else {
        console.error('Initial prompt could not be sent because the send button was disabled.');
      }
    }, 100);
  } else {
    // Retry after 200ms
    setTimeout(() => sendRawPrompt(promptText, retries - 1), 200);
  }
}

/**
 * Checks the current URL and chat state to decide whether to send the initial prompt.
 * This function is designed to be called frequently (e.g., by a MutationObserver).
 */
function handleChatStateChange() {
  const newPath = window.location.pathname;

  // 1. Detect if the URL has changed.
  if (newPath !== currentPath) {
    currentPath = newPath;
    // If we navigate to a specific chat (not a new one), reset the flag.
    // This allows the prompt to be sent again if the user creates another new chat.
    if (!currentPath.endsWith('/app') && !currentPath.endsWith('/app/')) {
      if (promptSentForNewChat) {
        console.log("Navigated to a specific chat. Resetting prompt-sent flag.");
        promptSentForNewChat = false;
      }
    }
  }

  // 2. Check if conditions are met to send the prompt.
  const isNewChatPage = currentPath.endsWith('/app') || currentPath.endsWith('/app/');
  // Conditions: on a new chat page, prompt is loaded, and it hasn't been sent for this session.
  if (isNewChatPage && initialPrompt && !promptSentForNewChat) {
    // Also, make sure the input field is actually available in the DOM before trying to send.
    if (document.querySelector('div[aria-label="ここにプロンプトを入力してください"]')) {
      console.log("New chat page detected and ready. Sending initial prompt.");
      sendRawPrompt(initialPrompt);
      promptSentForNewChat = true; // Mark as sent
    }
  }
}

// --- End of added code ---

/**
 * ユーザーのアクションをGeminiの入力欄に送信する（リトライ機能付き）
 * @param {object} actionData - 送信するデータオブジェクト
 * @param {number} retries - 残りのリトライ回数
 */
function sendActionToGemini(actionData, retries = 5) {
  if (retries < 0) {
    console.error('Could not find Gemini input field or send button after multiple retries.');
    const jsonString = JSON.stringify(actionData);
    navigator.clipboard.writeText(jsonString).then(() => {
      alert('入力欄または送信ボタンが見つかりませんでした。送信するJSONをクリップボードにコピーしました。');
    });
    return;
  }

  const inputFieldSelector = 'div[aria-label="ここにプロンプトを入力してください"]';
  const sendButtonSelector = 'div.send-button-container button';

  const inputField = document.querySelector(inputFieldSelector);
  const sendButton = document.querySelector(sendButtonSelector);

  if (inputField && sendButton) {
    inputField.textContent = JSON.stringify(actionData);
    inputField.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));

    setTimeout(() => {
      if (!sendButton.disabled) {
        sendButton.click();
        console.log('Sent action to Gemini:', JSON.stringify(actionData));
      } else {
        console.error('Send button is disabled.');
        alert('送信ボタンが無効化されています。');
      }
    }, 100);
  } else {
    // 200ミリ秒待ってから再試行
    setTimeout(() => sendActionToGemini(actionData, retries - 1), 200);
  }
}

/**
 * 指定されたJSONコードブロックをGUIに変換する
 * @param {Element} codeBlock - コードブロックのDOM要素
 */
function renderGuiFromCodeBlock(codeBlock) {
  const jsonString = codeBlock.textContent;
  try {
    const data = JSON.parse(jsonString);

    // button_setタイプの処理
    if (data.type === 'button_set' && data.label && Array.isArray(data.buttons)) {
      const guiContainer = document.createElement('div');
      guiContainer.className = 'gemini-gui-container';

      const label = document.createElement('p');
      label.className = 'gemini-gui-label';
      label.textContent = data.label;
      guiContainer.appendChild(label);

      const buttonGroup = document.createElement('div');
      buttonGroup.className = 'gemini-gui-button-group';

      data.buttons.forEach(buttonData => {
        if (buttonData.text && buttonData.value) {
          const button = document.createElement('button');
          button.className = 'gemini-gui-button';
          button.textContent = buttonData.text;
          button.dataset.value = buttonData.value;
          
          button.addEventListener('click', () => {
            const action = {
              user_action: 'click',
              value: button.dataset.value,
              label: button.textContent
            };
            sendActionToGemini(action);
          });

          buttonGroup.appendChild(button);
        }
      });

      guiContainer.appendChild(buttonGroup);

      const preElement = codeBlock.closest('pre');
      if (preElement && preElement.parentElement) {
        preElement.parentElement.replaceChild(guiContainer, preElement);
        console.log('Successfully rendered GUI for button_set.');
      }
    } 
    // text_inputタイプの処理
    else if (data.type === 'text_input' && data.label) {
      const guiContainer = document.createElement('div');
      guiContainer.className = 'gemini-gui-container';

      const label = document.createElement('p');
      label.className = 'gemini-gui-label';
      label.textContent = data.label;
      guiContainer.appendChild(label);

      const inputGroup = document.createElement('div');
      inputGroup.className = 'gemini-gui-input-group';

      const textInput = document.createElement('input');
      textInput.type = 'text';
      textInput.className = 'gemini-gui-text-input';
      textInput.placeholder = data.placeholder || '';
      inputGroup.appendChild(textInput);

      const submitButton = document.createElement('button');
      submitButton.className = 'gemini-gui-button';
      submitButton.textContent = data.submit_text || 'Submit';
      inputGroup.appendChild(submitButton);

      guiContainer.appendChild(inputGroup);

      submitButton.addEventListener('click', () => {
        const action = {
          user_action: 'submit',
          value: textInput.value
        };
        sendActionToGemini(action);
      });

      const preElement = codeBlock.closest('pre');
      if (preElement && preElement.parentElement) {
        preElement.parentElement.replaceChild(guiContainer, preElement);
        console.log('Successfully rendered GUI for text_input.');
      }
    }
    // radio_groupタイプの処理
    else if (data.type === 'radio_group' && data.label && Array.isArray(data.options)) {
      const guiContainer = document.createElement('div');
      guiContainer.className = 'gemini-gui-container';

      const label = document.createElement('p');
      label.className = 'gemini-gui-label';
      label.textContent = data.label;
      guiContainer.appendChild(label);

      const radioGroup = document.createElement('div');
      radioGroup.className = 'gemini-gui-radio-group';
      const groupName = `radio-group-${Date.now()}`;

      data.options.forEach((optionData, index) => {
        if (optionData.text && optionData.value) {
          const optionContainer = document.createElement('div');
          optionContainer.className = 'gemini-gui-radio-option';

          const radioInput = document.createElement('input');
          radioInput.type = 'radio';
          radioInput.name = groupName;
          radioInput.value = optionData.value;
          radioInput.id = `${groupName}-${index}`;
          if (index === 0) { radioInput.checked = true; }

          const radioLabel = document.createElement('label');
          radioLabel.textContent = optionData.text;
          radioLabel.htmlFor = `${groupName}-${index}`;

          optionContainer.appendChild(radioInput);
          optionContainer.appendChild(radioLabel);
          radioGroup.appendChild(optionContainer);
        }
      });
      guiContainer.appendChild(radioGroup);

      const submitButton = document.createElement('button');
      submitButton.className = 'gemini-gui-button';
      submitButton.textContent = data.submit_text || 'Submit';
      submitButton.style.marginTop = '12px';
      guiContainer.appendChild(submitButton);

      submitButton.addEventListener('click', () => {
        const selectedRadio = guiContainer.querySelector(`input[name="${groupName}"]:checked`);
        if (selectedRadio) {
          const action = {
            user_action: 'submit',
            value: selectedRadio.value
          };
          sendActionToGemini(action);
        }
      });

      const preElement = codeBlock.closest('pre');
      if (preElement && preElement.parentElement) {
        preElement.parentElement.replaceChild(guiContainer, preElement);
        console.log('Successfully rendered GUI for radio_group.');
      }
    }
    // dropdownタイプの処理
    else if (data.type === 'dropdown' && data.label && Array.isArray(data.options)) {
      const guiContainer = document.createElement('div');
      guiContainer.className = 'gemini-gui-container';

      const label = document.createElement('p');
      label.className = 'gemini-gui-label';
      label.textContent = data.label;
      guiContainer.appendChild(label);

      const selectElement = document.createElement('select');
      selectElement.className = 'gemini-gui-select';

      data.options.forEach(optionData => {
        if (optionData.text && optionData.value) {
          const optionElement = document.createElement('option');
          optionElement.value = optionData.value;
          optionElement.textContent = optionData.text;
          selectElement.appendChild(optionElement);
        }
      });
      guiContainer.appendChild(selectElement);

      const submitButton = document.createElement('button');
      submitButton.className = 'gemini-gui-button';
      submitButton.textContent = data.submit_text || 'Submit';
      submitButton.style.marginTop = '12px';
      guiContainer.appendChild(submitButton);

      submitButton.addEventListener('click', () => {
        const action = {
          user_action: 'submit',
          value: selectElement.value
        };
        sendActionToGemini(action);
      });

      const preElement = codeBlock.closest('pre');
      if (preElement && preElement.parentElement) {
        preElement.parentElement.replaceChild(guiContainer, preElement);
        console.log('Successfully rendered GUI for dropdown.');
      }
    }
    // sliderタイプの処理
    else if (data.type === 'slider' && data.label) {
      const guiContainer = document.createElement('div');
      guiContainer.className = 'gemini-gui-container';

      const label = document.createElement('p');
      label.className = 'gemini-gui-label';
      label.textContent = data.label;
      guiContainer.appendChild(label);

      const sliderGroup = document.createElement('div');
      sliderGroup.className = 'gemini-gui-slider-group';

      const sliderInput = document.createElement('input');
      sliderInput.type = 'range';
      sliderInput.className = 'gemini-gui-slider';
      sliderInput.min = data.min ?? 0;
      sliderInput.max = data.max ?? 100;
      sliderInput.step = data.step ?? 1;
      sliderInput.value = data.value ?? 50;
      
      const valueDisplay = document.createElement('span');
      valueDisplay.className = 'gemini-gui-slider-value';
      valueDisplay.textContent = sliderInput.value;

      sliderInput.addEventListener('input', () => {
        valueDisplay.textContent = sliderInput.value;
      });

      sliderGroup.appendChild(sliderInput);
      sliderGroup.appendChild(valueDisplay);
      guiContainer.appendChild(sliderGroup);

      const submitButton = document.createElement('button');
      submitButton.className = 'gemini-gui-button';
      submitButton.textContent = data.submit_text || 'Submit';
      submitButton.style.marginTop = '12px';
      guiContainer.appendChild(submitButton);

      submitButton.addEventListener('click', () => {
        const action = {
          user_action: 'submit',
          value: sliderInput.value
        };
        sendActionToGemini(action);
      });

      const preElement = codeBlock.closest('pre');
      if (preElement && preElement.parentElement) {
        preElement.parentElement.replaceChild(guiContainer, preElement);
        console.log('Successfully rendered GUI for slider.');
      }
    }

  } catch (e) {
    // JSONとしてパースできない、または期待する形式でなければ何もしない
  }
}

/**
 * DOMノード内から目的のコードブロックを探して処理する
 * @param {Node} node - 検索対象のDOMノード
 */
function findAndProcessCodeBlocks(node) {
  // nodeがElement（要素ノード）で、querySelectorメソッドを持っているか確認
  if (node.nodeType === Node.ELEMENT_NODE && typeof node.querySelectorAll === 'function') {
    // Geminiのマークダウン内のコードブロックは <pre><code>...</code></pre> の形式と仮定
    const codeBlocks = node.querySelectorAll('pre code');
    codeBlocks.forEach(codeBlock => {
      // 中身がJSONである可能性が高いか簡易的にチェック
      if (codeBlock.textContent.trim().startsWith('{')) {
        renderGuiFromCodeBlock(codeBlock);
      }
    });
  }
}

// DOMの変更を監視するMutationObserverをセットアップ
const observer = new MutationObserver((mutationsList, observer) => {
  // On any mutation, check the chat state, as it might indicate a navigation change in the SPA.
  handleChatStateChange();

  for(const mutation of mutationsList) {
    if (mutation.type === 'childList') {
      // 追加された各ノードに対して処理を実行
      mutation.addedNodes.forEach(node => {
        findAndProcessCodeBlocks(node);
      });
    }
  }
});

// 監視を開始します。
observer.observe(document.body, {
  childList: true,
  subtree: true
});

// --- Start of added code ---
// Fetch the initial prompt when the script is first loaded.
fetchInitialPrompt();
// --- End of added code ---

console.log("MutationObserver is now watching the DOM.");