// Focus Now Content Script
// This script runs on all pages to prepare for potential particle animations

(function() {
  'use strict';
  
  // Ensure we don't conflict with existing page scripts
  if (window.focusNowContentLoaded) return;
  window.focusNowContentLoaded = true;

  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
      case 'prepareAnimation':
        // Could add any page preparation logic here
        sendResponse({ ready: true });
        break;
        
      case 'ping':
        sendResponse({ alive: true });
        break;
    }
  });

  // Utility function to clean up any existing Focus Now elements
  function cleanupFocusNowElements() {
    const existingElements = document.querySelectorAll('[data-focus-now]');
    existingElements.forEach(el => el.remove());
  }

  // Clean up on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', cleanupFocusNowElements);
  } else {
    cleanupFocusNowElements();
  }

  // Prevent conflicts with page's own particle effects
  window.addEventListener('beforeunload', () => {
    if (window.focusNowAnimating) {
      window.focusNowAnimating = false;
    }
  });

  console.log('Focus Now content script loaded on:', window.location.href);
})();