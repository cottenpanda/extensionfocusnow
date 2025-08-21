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


  // Load and display parked tabs
  async function loadParkedTabs() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getParkedTabs' });
      const parkedTabs = response.tabs || [];
      
      displayParkedTabs(parkedTabs);
    } catch (error) {
      console.error('Error loading parked tabs:', error);
    }
  }

  // Display parked tabs in the UI
  function displayParkedTabs(tabs) {
    parkedCount.textContent = tabs.length;
    
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

  // Create a DOM element for a parked tab
  function createTabElement(tab) {
    const tabDiv = document.createElement('div');
    tabDiv.className = 'parked-tab';
    tabDiv.dataset.tabId = tab.id;

    // Get domain from URL for display
    let displayUrl = tab.url;
    try {
      const url = new URL(tab.url);
      displayUrl = url.hostname;
    } catch (e) {
      // Use original URL if parsing fails
    }

    // Format date
    const parkedDate = new Date(tab.parkedAt);
    const timeAgo = getTimeAgo(parkedDate);

    const favIconSvg = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="%23ccc"><circle cx="8" cy="8" r="8"/></svg>';

    const favicon = document.createElement('img');
    favicon.className = 'tab-favicon';
    favicon.src = tab.favIconUrl || favIconSvg;
    favicon.onerror = () => { favicon.src = favIconSvg; };

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
      await chrome.runtime.sendMessage({ action: 'focusNow' });
      
      // Reload parked tabs after a delay
      setTimeout(() => {
        loadParkedTabs();
      }, 1000);
      
    } catch (error) {
      console.error('Error activating focus mode:', error);
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
