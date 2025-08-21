// Focus Now Popup Script

document.addEventListener('DOMContentLoaded', async () => {
  // DOM elements
  const focusButton = document.getElementById('focusButton');
  const parkedTabsList = document.getElementById('parkedTabsList');
  const parkedCount = document.getElementById('parkedCount');
  const emptyState = document.getElementById('emptyState');
  const actionButtons = document.getElementById('actionButtons');
  const restoreAllButton = document.getElementById('restoreAllButton');
  const closeAllButton = document.getElementById('closeAllButton');

  // State
  let isProcessing = false;
  let previousTabCount = 0;


  // Load and display parked tabs with optimized performance
  async function loadParkedTabs() {
    try {
      // Show loading state immediately
      showLoadingState();
      
      // Try local storage first for instant loading
      const localTabs = await chrome.storage.local.get(['parkedTabs']);
      const cachedTabs = localTabs.parkedTabs || [];
      
      if (cachedTabs.length > 0) {
        // Display cached tabs immediately for instant feedback
        displayParkedTabs(cachedTabs);
      }
      
      // Then get the most up-to-date data from background script
      const response = await chrome.runtime.sendMessage({ action: 'getParkedTabs' });
      const parkedTabs = response.tabs || [];
      
      // Update display with fresh data (might be the same)
      displayParkedTabs(parkedTabs);
      
    } catch (error) {
      console.error('Error loading parked tabs:', error);
      // Fallback to direct storage access
      try {
        const fallbackTabs = await chrome.storage.local.get(['parkedTabs']);
        displayParkedTabs(fallbackTabs.parkedTabs || []);
      } catch (fallbackError) {
        console.error('Fallback storage access failed:', fallbackError);
        displayParkedTabs([]);
      }
    }
  }

  // Show loading state while data loads
  function showLoadingState() {
    if (parkedTabsList.children.length === 0) {
      parkedTabsList.innerHTML = '<div style="text-align: center; color: #aaa; padding: 20px;">Loading...</div>';
    }
  }

  // Add tabs to UI immediately for instant feedback (optimistic update)
  async function addTabsToUIImmediately(tabsToAdd) {
    try {
      // Get existing parked tabs
      const existingTabs = await chrome.storage.local.get(['parkedTabs']);
      const currentParkedTabs = existingTabs.parkedTabs || [];
      
      // Create temporary ParkedTab objects for immediate display
      const newParkedTabs = tabsToAdd.map(tab => ({
        id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl,
        parkedAt: new Date().toISOString()
      }));
      
      // Combine and display immediately
      const allTabs = [...newParkedTabs, ...currentParkedTabs];
      displayParkedTabs(allTabs);
      
      console.log('Optimistic update: Added', newParkedTabs.length, 'tabs to UI');
    } catch (error) {
      console.error('Error in optimistic update:', error);
    }
  }

  // Display parked tabs in the UI
  function displayParkedTabs(tabs) {
    const currentCount = tabs.length;
    
    // Trigger count animation if count increased
    if (currentCount > previousTabCount && previousTabCount > 0) {
      animateCountChange();
    }
    
    parkedCount.textContent = currentCount;
    previousTabCount = currentCount;
    
    if (tabs.length === 0) {
      parkedTabsList.style.display = 'none';
      emptyState.style.display = 'flex';
      actionButtons.style.display = 'none';
      focusButton.classList.remove('disabled');
    } else {
      parkedTabsList.style.display = 'block';
      emptyState.style.display = 'none';
      actionButtons.style.display = 'flex';
      
      // Efficiently update the DOM without clearing innerHTML directly
      const currentTabElements = Array.from(parkedTabsList.children);
      const newTabElementsMap = new Map(); // Map to store new tab elements by ID

      // Create or update new tab elements
      tabs.forEach(tab => {
        let tabElement = currentTabElements.find(el => el.dataset.tabId === String(tab.id));
        if (tabElement) {
          // Update existing element (e.g., title, URL, time)
          // For now, we'll just ensure it's in the map
          newTabElementsMap.set(String(tab.id), tabElement);
        } else {
          // Create new element
          tabElement = createTabElement(tab);
          newTabElementsMap.set(String(tab.id), tabElement);
        }
      });

      // Remove old elements that are no longer present
      currentTabElements.forEach(el => {
        if (!newTabElementsMap.has(el.dataset.tabId)) {
          parkedTabsList.removeChild(el);
        }
      });

      // Append or reorder elements
      const fragment = document.createDocumentFragment();
      tabs.forEach(tab => {
        fragment.appendChild(newTabElementsMap.get(String(tab.id)));
      });

      // Replace the content with the updated fragment
      parkedTabsList.innerHTML = ''; // Clear before appending fragment
      parkedTabsList.appendChild(fragment);
    }
  }

  // Animate the count badge when new tabs are added
  function animateCountChange() {
    parkedCount.classList.add('count-updated');
    
    // Remove animation class after it completes
    setTimeout(() => {
      parkedCount.classList.remove('count-updated');
    }, 800);
  }

  // Create a DOM element for a parked tab
  function createTabElement(tab) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'parked-tab';
    tabDiv.dataset.tabId = tab.id;
    

    // Get domain from URL for display
    let displayUrl = tab.url;
    let domain = '';
    try {
      const url = new URL(tab.url);
      displayUrl = url.hostname;
      domain = url.hostname;
    } catch (e) {
      // Use original URL if parsing fails
    }

    // Format date
    const parkedDate = new Date(tab.parkedAt);
    const timeAgo = getTimeAgo(parkedDate);

    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src = getFaviconWithFallback(tab.favIconUrl, domain, tab.url, tab.title);
    
    // Enhanced error handling with multiple fallbacks
    let fallbackIndex = 0;
    const fallbacks = getFaviconFallbacks(domain, tab.url, tab.title);
    
    favicon.onerror = () => {
      fallbackIndex++;
      if (fallbackIndex < fallbacks.length) {
        favicon.src = fallbacks[fallbackIndex];
      }
    };

    const tabInfo = document.createElement('div');
    tabInfo.className = 'tab-info';

    const tabTitle = document.createElement('div');
    tabTitle.className = 'tab-title';
    tabTitle.title = tab.title;
    tabTitle.textContent = tab.title || 'Untitled';

    const tabMeta = document.createElement('div');
    tabMeta.className = 'tab-meta';

    const tabUrl = document.createElement('div');
    tabUrl.className = 'tab-url';
    tabUrl.title = displayUrl;
    tabUrl.textContent = displayUrl;

    const tabTime = document.createElement('div');
    tabTime.className = 'tab-time';
    tabTime.textContent = timeAgo;

    tabMeta.appendChild(tabUrl);
    tabMeta.appendChild(tabTime);

    tabInfo.appendChild(tabTitle);
    tabInfo.appendChild(tabMeta);

    const removeButton = document.createElement('button');
    removeButton.className = 'remove-tab-button';
    removeButton.innerHTML = 'close';
    removeButton.title = 'Remove tab';
    
    removeButton.addEventListener('click', (e) => {
      e.stopPropagation();
      removeTab(tab.id);
    });

    tabDiv.appendChild(favicon);
    tabDiv.appendChild(tabInfo);
    tabDiv.appendChild(removeButton);

    // Add click handler for entire tab (restores tab)
    tabDiv.addEventListener('click', () => {
      restoreTab(tab.id);
    });

    return tabDiv;
  }

  // Simplified and reliable favicon fallback system
  function getFaviconWithFallback(originalFavicon, domain, url, title) {
    // Use original favicon if it's valid and not a chrome:// URL
    if (originalFavicon && originalFavicon.startsWith('data:')) {
      return originalFavicon;
    }
    
    if (originalFavicon && originalFavicon.startsWith('http') && !originalFavicon.includes('chrome://')) {
      return originalFavicon;
    }
    
    // Handle special cases for sites that don't have good favicons
    if (!url || url.startsWith('chrome://newtab') || title === 'New Tab') {
      // For New Tab, use Google's favicon since it's a Google product
      return 'https://www.google.com/s2/favicons?domain=google.com&sz=32';
    }
    
    // For all other sites, use Google's reliable favicon service
    if (domain && domain !== 'newtab') {
      return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    }
    
    return getDefaultFavicon();
  }


  function getFaviconFallbacks(domain, url, title) {
    const fallbacks = [];
    
    // Google favicon service - most reliable
    if (domain && domain !== 'newtab') {
      fallbacks.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=32`);
      fallbacks.push(`https://www.google.com/s2/favicons?domain=www.${domain}&sz=32`);
      fallbacks.push(`https://${domain}/favicon.ico`);
    }
    
    // For New Tab, use Google's favicon
    if (!url || url.startsWith('chrome://newtab') || title === 'New Tab') {
      fallbacks.push('https://www.google.com/s2/favicons?domain=google.com&sz=32');
    }
    
    // Letter-based favicon as last resort
    const letterFavicon = getLetterFavicon(domain);
    if (letterFavicon) {
      fallbacks.push(letterFavicon);
    }
    
    // Final fallback
    fallbacks.push(getDefaultFavicon());
    
    return fallbacks;
  }

  function getLetterFavicon(domain) {
    if (!domain) return null;
    
    const letter = domain.charAt(0).toUpperCase();
    const colors = {
      'A': '#FF6B6B', 'B': '#4ECDC4', 'C': '#45B7D1', 'D': '#96CEB4',
      'E': '#FFEAA7', 'F': '#DDA0DD', 'G': '#98D8C8', 'H': '#F7DC6F',
      'I': '#BB8FCE', 'J': '#85C1E9', 'K': '#F8C471', 'L': '#82E0AA',
      'M': '#F1948A', 'N': '#85C1E9', 'O': '#F8C471', 'P': '#82E0AA',
      'Q': '#D7BDE2', 'R': '#A3E4D7', 'S': '#F9E79F', 'T': '#FAD7A0',
      'U': '#D5A6BD', 'V': '#A9DFBF', 'W': '#F4D03F', 'X': '#D2B4DE',
      'Y': '#AED6F1', 'Z': '#A2D9CE'
    };
    
    const color = colors[letter] || '#95A5A6';
    
    return `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="${encodeURIComponent(color)}" rx="6"/><text x="16" y="22" font-family="Arial,sans-serif" font-size="18" font-weight="bold" text-anchor="middle" fill="white">${letter}</text></svg>`;
  }

  function getDefaultFavicon() {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" fill="%23E8E8E8" rx="6"/><rect x="8" y="8" width="16" height="2" fill="%23666"/><rect x="8" y="12" width="12" height="2" fill="%23999"/><rect x="8" y="16" width="14" height="2" fill="%23999"/><circle cx="10" cy="22" r="2" fill="%23666"/></svg>';
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Get human-readable time ago string
  function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  // Focus Now functionality
  async function handleFocusNow() {
    if (isProcessing) return;
    
    isProcessing = true;
    focusButton.classList.add('working');
    focusButton.textContent = 'Focusing...';
    
    try {
      // Get tabs that will be parked BEFORE sending the message
      const allTabs = await chrome.tabs.query({ currentWindow: true });
      const tabsThatWillBeParked = allTabs.filter(tab => !tab.active && !tab.pinned);
      
      // Show the tabs immediately in the UI (optimistic update)
      if (tabsThatWillBeParked.length > 0) {
        await addTabsToUIImmediately(tabsThatWillBeParked);
      }
      
      // Then send the focus command
      await chrome.runtime.sendMessage({ action: 'focusNow' });
      
      // Refresh to get the actual stored data (in case of any differences)
      setTimeout(() => {
        loadParkedTabs();
      }, 300);
      
    } catch (error) {
      console.error('Error activating focus mode:', error);
      // Reload to show actual state if optimistic update failed
      loadParkedTabs();
    } finally {
      isProcessing = false;
      focusButton.classList.remove('working');
      focusButton.textContent = 'Focus Now';
    }
  }

  // Remove a specific tab from parked tabs
  async function removeTab(tabId) {
    try {
      await chrome.runtime.sendMessage({ 
        action: 'removeParkedTab', 
        tabId: tabId 
      });
      
      // Reload the parked tabs list
      setTimeout(() => {
        loadParkedTabs();
      }, 300);
      
    } catch (error) {
      console.error('Error removing tab:', error);
    }
  }

  // Restore a specific tab
  async function restoreTab(tabId) {
    try {
      await chrome.runtime.sendMessage({ 
        action: 'restoreTab', 
        tabId: tabId 
      });
      
      // Reload the parked tabs list
      setTimeout(() => {
        loadParkedTabs();
      }, 500);
      
    } catch (error) {
      console.error('Error restoring tab:', error);
    }
  }

  // Restore all parked tabs
  async function handleRestoreAll() {
    try {
      await chrome.runtime.sendMessage({ action: 'restoreAllTabs' });
      
      // Reload the parked tabs list
      setTimeout(() => {
        loadParkedTabs();
      }, 500);
    } catch (error) {
      console.error('Error restoring all tabs:', error);
    }
  }

  // Close all parked tabs
  async function handleCloseAll() {
    if (!confirm('Are you sure you want to close all parked tabs? This cannot be undone.')) {
      return;
    }
    
    try {
      await chrome.runtime.sendMessage({ action: 'clearAllParked' });
      loadParkedTabs();
    } catch (error) {
      console.error('Error closing parked tabs:', error);
    }
  }

  // Event listeners
  focusButton.addEventListener('click', handleFocusNow);
  restoreAllButton.addEventListener('click', handleRestoreAll);
  closeAllButton.addEventListener('click', handleCloseAll);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !isProcessing) {
      handleFocusNow();
    }
    if (e.key === 'Escape') {
      window.close();
    }
  });

  // Load parked tabs on popup open
  loadParkedTabs();

  // Auto-refresh parked tabs every 5 seconds when popup is open
  const refreshInterval = setInterval(loadParkedTabs, 30000);
  
  // Clean up interval when popup closes
  window.addEventListener('beforeunload', () => {
    clearInterval(refreshInterval);
  });

  // Check if there are other tabs to park
  try {
    const allTabsInWindow = await chrome.tabs.query({ currentWindow: true });
    // The button should always be enabled as per user request.
    // The text will change based on the number of tabs.
    focusButton.disabled = false; // Always enabled
    focusButton.style.opacity = '1'; // Always full opacity

    if (allTabsInWindow.length <= 1) {
      focusButton.textContent = 'Focus now';
    } else {
      focusButton.textContent = 'Focus now';
    }
  } catch (error) {
    console.error('Error checking tabs:', error);
  }
});
