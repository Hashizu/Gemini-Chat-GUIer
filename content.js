console.log("Gemini Chat GUIer content script loaded.");

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

console.log("MutationObserver is now watching the DOM.");