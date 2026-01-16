/**
 * FAQ ChatBot functionality
 */

import { setupClickOutside } from './domUtils';

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

  // Close chat when clicking backdrop (mobile)
  backdrop?.addEventListener('click', () => {
    widget.classList.remove('open');
    // Reset positions
    if (chatPanel) {
      chatPanel.style.position = '';
      chatPanel.style.top = '';
      chatPanel.style.bottom = '';
    }
    if (toggle) {
      toggle.style.top = '';
    }
  });

  // Check if device is mobile/tablet (no auto-focus to avoid keyboard popup)
  const isMobile = () => window.innerWidth <= 768;

  // Center chat panel in available viewport space (accounts for keyboard)
  function updatePanelPosition() {
    if (!isMobile() || !chatPanel || !widget.classList.contains('open')) return;

    const viewport = window.visualViewport;
    if (!viewport) return;

    try {
      const availableHeight = viewport.height;
      const panelHeight = chatPanel.offsetHeight;
      const topOffset = (availableHeight - panelHeight) / 2 + viewport.offsetTop;
      const panelTop = Math.max(topOffset, 10);

      chatPanel.style.position = 'fixed';
      chatPanel.style.bottom = 'auto';
      chatPanel.style.top = `${panelTop}px`;

      // Position close button at top-right of panel
      if (toggle) {
        toggle.style.top = `${panelTop + 8}px`;
      }
    } catch (e) {
      // Fallback - don't break if visualViewport has issues
    }
  }

  // Listen for viewport changes (keyboard show/hide)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updatePanelPosition);
    window.visualViewport.addEventListener('scroll', updatePanelPosition);
  }

  // Toggle chat panel
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    widget.classList.toggle('open');

    if (widget.classList.contains('open')) {
      if (!isMobile()) {
        input.focus();
      } else {
        updatePanelPosition();
      }
    } else {
      // Reset position when closing
      if (chatPanel) {
        chatPanel.style.position = '';
        chatPanel.style.top = '';
        chatPanel.style.bottom = '';
      }
      if (toggle) {
        toggle.style.top = '';
      }
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
