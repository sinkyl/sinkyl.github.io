import { setupClickOutside, setBodyScroll, isMobile } from './domUtils';

export interface FAQData {
  [category: string]: string[];
}

export interface Responses {
  [category: string]: string;
}

export interface ChatBotConfig {
  faqData: FAQData;
  responses: Responses;
  unknownResponses: string[];
}

export function initChatBot(config: ChatBotConfig) {
  const { faqData, responses, unknownResponses } = config;
  let unknownIndex = 0;

  const toggle = document.getElementById('chat-toggle');
  const widget = document.getElementById('chat-widget');
  const form = document.getElementById('chat-form') as HTMLFormElement | null;
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  const messages = document.getElementById('chat-messages');
  const suggestionsToggle = document.getElementById('suggestions-toggle');
  const suggestionsPanel = document.getElementById('suggestions-panel');
  const chatPanel = document.getElementById('chat-panel');
  const backdrop = widget?.querySelector('.chat-backdrop');
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (!toggle || !widget || !form || !input || !messages) {
    return;
  }

  // Reset panel styles to default (used when closing chat)
  function resetPanelStyles() {
    if (!chatPanel) return;
    chatPanel.style.position = '';
    chatPanel.style.top = '';
    chatPanel.style.bottom = '';
    chatPanel.style.maxHeight = '';
    chatPanel.style.height = '';
    const messagesEl = chatPanel.querySelector('.chat-messages') as HTMLElement;
    if (messagesEl) messagesEl.style.maxHeight = '';
  }

  // Close chat when clicking backdrop (mobile)
  backdrop?.addEventListener('click', () => {
    widget.classList.remove('open');
    setBodyScroll(true);
    resetPanelStyles();
  });

  // Center chat panel in available viewport space (accounts for keyboard)
  let keyboardVisible = false;
  let wasKeyboardVisible = false;

  function updatePanelPosition(forceKeyboard?: boolean) {
    if (!isMobile() || !chatPanel || !widget.classList.contains('open')) return;

    const viewport = window.visualViewport;
    const availableHeight = viewport?.height || window.innerHeight;

    // Detect keyboard via viewport or forced state
    wasKeyboardVisible = keyboardVisible;
    if (viewport) {
      const keyboardHeight = window.innerHeight - viewport.height;
      keyboardVisible = keyboardHeight > 100;
    } else if (forceKeyboard !== undefined) {
      keyboardVisible = forceKeyboard;
    }

    const messagesEl = chatPanel.querySelector('.chat-messages') as HTMLElement;

    // Enable smooth transition
    chatPanel.style.transition = 'max-height 0.3s ease, top 0.3s ease';
    if (messagesEl) messagesEl.style.transition = 'max-height 0.3s ease';

    let panelMaxHeight: number;
    let panelTop: number;

    if (keyboardVisible) {
      // Keyboard shown: panel takes 100% of available space
      panelMaxHeight = availableHeight;
      panelTop = (viewport?.offsetTop || 0);
    } else {
      // Keyboard hidden: 10% top, 80% panel, 10% bottom
      panelMaxHeight = Math.floor(availableHeight * 0.80);
      panelTop = Math.floor(availableHeight * 0.10) + (viewport?.offsetTop || 0);
    }

    const messagesMaxHeight = Math.floor(panelMaxHeight * 0.70);

    chatPanel.style.maxHeight = `${panelMaxHeight}px`;
    chatPanel.style.height = `${panelMaxHeight}px`;
    if (messagesEl) {
      messagesEl.style.maxHeight = `${messagesMaxHeight}px`;

      // Scroll to bottom when transitioning from stretched to shrink
      if (keyboardVisible && !wasKeyboardVisible) {
        setTimeout(() => {
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }, 350);
      }
    }

    chatPanel.style.position = 'fixed';
    chatPanel.style.bottom = 'auto';
    chatPanel.style.top = `${panelTop}px`;
  }

  // Debounced resize handler to wait for viewport to settle
  let resizeTimeout: ReturnType<typeof setTimeout>;
  function debouncedUpdate() {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => updatePanelPosition(), 150);
  }

  // Listen for viewport changes (keyboard show/hide)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', debouncedUpdate);
    window.visualViewport.addEventListener('scroll', debouncedUpdate);
  }

  // Fallback for Firefox: detect keyboard via focus/blur
  input.addEventListener('focus', () => {
    if (isMobile()) setTimeout(() => updatePanelPosition(true), 200);
  });
  input.addEventListener('blur', () => {
    if (isMobile()) setTimeout(() => updatePanelPosition(false), 200);
  });

  // Toggle chat panel
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    widget.classList.toggle('open');

    if (widget.classList.contains('open')) {
      setBodyScroll(false);
      if (!isMobile()) {
        input.focus();
      } else {
        // Delay to ensure panel is rendered before measuring
        requestAnimationFrame(() => {
          updatePanelPosition();
        });
      }
    } else {
      setBodyScroll(true);
      resetPanelStyles();
    }
  });

  // Close chat panel when clicking outside
  setupClickOutside(widget, 'open');

  // Suggestions toggle
  suggestionsToggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    suggestionsToggle.classList.toggle('active');
    suggestionsPanel?.classList.toggle('show');
  });

  // Close suggestions panel when clicking elsewhere in chat
  chatPanel?.addEventListener('click', (e) => {
    const target = e.target as Node;
    if (!suggestionsToggle?.contains(target) && !suggestionsPanel?.contains(target)) {
      suggestionsToggle?.classList.remove('active');
      suggestionsPanel?.classList.remove('show');
    }
  });

  // Handle suggestion button clicks
  function handleSuggestionClick(e: Event) {
    const target = e.target as HTMLElement;
    const btn = target.closest('[data-question]') as HTMLElement | null;
    if (btn && input && form) {
      e.stopPropagation();
      input.value = btn.dataset.question || '';
      suggestionsToggle?.classList.remove('active');
      suggestionsPanel?.classList.remove('show');
      form.requestSubmit();
    }
  }

  messages.addEventListener('click', handleSuggestionClick);
  suggestionsPanel?.addEventListener('click', handleSuggestionClick);

  // Find matching response
  function findResponse(query: string): string {
    const lower = query.toLowerCase();

    for (const [category, keywords] of Object.entries(faqData)) {
      // Use word boundary matching to avoid partial matches (e.g., "hi" in "his")
      if (keywords.some((keyword: string) => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(lower);
      })) {
        return responses[category] || getUnknownResponse();
      }
    }

    return getUnknownResponse();
  }

  // Get rotating unknown response
  function getUnknownResponse(): string {
    const response = unknownResponses[unknownIndex];
    unknownIndex = (unknownIndex + 1) % unknownResponses.length;
    return response;
  }

  // Add message to chat
  function addMessage(content: string, isUser = false) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'bot'}`;

    // Add label
    const label = document.createElement('span');
    label.className = 'message-label';
    label.textContent = isUser ? 'Guest' : 'Bot';

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Convert markdown-style formatting
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    contentDiv.innerHTML = formatted;
    div.appendChild(label);
    div.appendChild(contentDiv);
    messages.appendChild(div);
    messages.scrollTo({ top: messages.scrollHeight, behavior: 'smooth' });
  }

  // Handle form submission
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = input.value.trim();
    if (!query) return;

    // Trigger send animation
    submitBtn?.classList.add('sending');
    setTimeout(() => submitBtn?.classList.remove('sending'), 400);

    addMessage(query, true);
    input.value = '';

    // Simulate typing delay
    setTimeout(() => {
      const response = findResponse(query);
      addMessage(response);
    }, 400);
  });
}
