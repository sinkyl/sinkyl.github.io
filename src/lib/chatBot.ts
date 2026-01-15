/**
 * FAQ ChatBot functionality
 */

import { setupClickOutside } from './domUtils';

export interface FAQData {
  [category: string]: string[];
}

export interface Responses {
  [category: string]: string;
  unknown: string;
}

export interface ChatBotConfig {
  faqData: FAQData;
  responses: Responses;
}

export function initChatBot(config: ChatBotConfig) {
  const { faqData, responses } = config;

  const toggle = document.getElementById('chat-toggle');
  const widget = document.getElementById('chat-widget');
  const form = document.getElementById('chat-form') as HTMLFormElement | null;
  const input = document.getElementById('chat-input') as HTMLInputElement | null;
  const messages = document.getElementById('chat-messages');
  const suggestionsToggle = document.getElementById('suggestions-toggle');
  const suggestionsPanel = document.getElementById('suggestions-panel');
  const chatPanel = document.getElementById('chat-panel');
  const submitBtn = form?.querySelector('button[type="submit"]');

  if (!toggle || !widget || !form || !input || !messages) {
    return;
  }

  // Toggle chat panel
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    widget.classList.toggle('open');
    if (widget.classList.contains('open')) {
      input.focus();
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
      if (keywords.some((keyword: string) => lower.includes(keyword))) {
        return responses[category] || responses.unknown;
      }
    }

    return responses.unknown;
  }

  // Add message to chat
  function addMessage(content: string, isUser = false) {
    const div = document.createElement('div');
    div.className = `message ${isUser ? 'user' : 'bot'}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    // Convert markdown-style formatting
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');

    contentDiv.innerHTML = formatted;
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
