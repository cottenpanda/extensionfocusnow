// Focus Now Background Script

// Storage keys
const PARKED_TABS_KEY = 'parkedTabs';

// Tab storage structure
class ParkedTab {
  constructor(tab) {
    // More unique ID generation to avoid collisions
    this.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.floor(Math.random() * 10000)}`;
    this.url = tab.url;
    this.title = tab.title;
    this.favIconUrl = tab.favIconUrl;
    this.parkedAt = new Date().toISOString();
    console.log('DEBUG: Created ParkedTab with ID:', this.id, 'title:', this.title);
  }
}

// Get all parked tabs from storage
async function getParkedTabs() {
  const result = await chrome.storage.local.get([PARKED_TABS_KEY]);
  return result[PARKED_TABS_KEY] || [];
}

// Save parked tabs to storage
async function saveParkedTabs(parkedTabs) {
  await chrome.storage.local.set({ [PARKED_TABS_KEY]: parkedTabs });
}

// Add a tab to parked tabs
async function parkTab(tab) {
  const parkedTabs = await getParkedTabs();
  const parkedTab = new ParkedTab(tab);
  parkedTabs.unshift(parkedTab); // Add to beginning
  await saveParkedTabs(parkedTabs);
  return parkedTab;
}

// Park multiple tabs at once to avoid race conditions
async function parkMultipleTabs(tabs) {
  console.log('DEBUG: parkMultipleTabs called with', tabs.length, 'tabs');
  console.log('DEBUG: Tab titles:', tabs.map(t => t.title));
  
  const existingParkedTabs = await getParkedTabs();
  console.log('DEBUG: Existing parked tabs:', existingParkedTabs.length);
  
  const newParkedTabs = tabs.map(tab => new ParkedTab(tab));
  console.log('DEBUG: Created new parked tabs:', newParkedTabs.length);
  console.log('DEBUG: New parked tab details:', newParkedTabs.map(t => ({ id: t.id, title: t.title })));
  
  // Add all new tabs to the beginning of the list
  const allParkedTabs = [...newParkedTabs, ...existingParkedTabs];
  console.log('DEBUG: Total tabs to save:', allParkedTabs.length);
  
  // Save all at once
  await saveParkedTabs(allParkedTabs);
  console.log('DEBUG: Saved to storage successfully');
  
  // Verify what was actually saved
  const verifyTabs = await getParkedTabs();
  console.log('DEBUG: Verification - tabs in storage:', verifyTabs.length);
  console.log('DEBUG: Verification - tab titles:', verifyTabs.map(t => t.title));
  
  return newParkedTabs;
}

// Remove a parked tab by ID
async function unparkTab(tabId) {
  const parkedTabs = await getParkedTabs();
  const filteredTabs = parkedTabs.filter(tab => tab.id !== tabId);
  await saveParkedTabs(filteredTabs);
}

// Focus Now - main functionality
async function focusNow() {
  try {
    // Get all tabs in current window
    const tabs = await chrome.tabs.query({ currentWindow: true });
    const currentTab = tabs.find(tab => tab.active);
    
    // Get tabs to park (all except current)
    const tabsToPark = tabs.filter(tab => !tab.active && !tab.pinned);
    
    if (tabsToPark.length === 0) {
      console.log('No tabs to park');
      return;
    }

    // Start animation immediately while processing tabs
    const animationPromise = chrome.scripting.executeScript({
      target: { tabId: currentTab.id },
      func: triggerGlobalFlyAnimation,
      args: [tabsToPark.map(tab => ({
        title: tab.title,
        favIconUrl: tab.favIconUrl,
        url: tab.url
      }))]
    }).catch(error => console.log('Animation error:', error));

    // Park all tabs at once to avoid race conditions
    await parkMultipleTabs(tabsToPark);

    // Close tabs immediately after parking (animation runs in parallel)
    const tabIds = tabsToPark.map(tab => tab.id);
    chrome.tabs.remove(tabIds).catch(error => console.error('Error closing tabs:', error));

    console.log(`Parked ${tabsToPark.length} tabs`);

  } catch (error) {
    console.error('Error in focusNow:', error);
  }
}

// Global animation that shows tabs flying to the extension dropdown
function triggerGlobalFlyAnimation(tabsData) {
  // This function runs in the context of the current page
  
  // Check if animation is already running
  if (window.focusNowAnimating) return;
  window.focusNowAnimating = true;

  // Extension dropdown is in the top-right corner
  const extensionIconPosition = {
    x: window.innerWidth - 80,
    y: 40
  };

  // Create the main animation container
  const animationContainer = document.createElement('div');
  animationContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    z-index: 999999;
    pointer-events: none;
    overflow: hidden;
  `;
  document.body.appendChild(animationContainer);

  // Animate all tabs immediately with minimal stagger
  tabsData.forEach((tabData, index) => {
    // Immediate animation with tiny stagger for visual appeal
    setTimeout(() => {
      createFlyingTab(animationContainer, tabData, extensionIconPosition, index);
    }, index * 50); // Much faster stagger
  });

  // Show success message quickly
  setTimeout(() => {
    showSuccessMessage(animationContainer, tabsData.length);
  }, 600); // Much sooner

  // Clean up quickly
  setTimeout(() => {
    animationContainer.remove();
    window.focusNowAnimating = false;
  }, 2000); // Much faster cleanup
}

function createFlyingTab(container, tabData, targetPosition, index) {
  // Start position: Tab bar area (top of screen, spread horizontally)
  const startPosition = {
    x: 150 + (index * 200), // Spread tabs across top
    y: 35 // Tab bar height
  };

  // Create mini tab representation
  const flyingTab = document.createElement('div');
  flyingTab.style.cssText = `
    position: absolute;
    left: ${startPosition.x}px;
    top: ${startPosition.y}px;
    width: 180px;
    height: 35px;
    background: #f1f3f4;
    border-radius: 8px 8px 0 0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    transform: scale(1);
    border: 1px solid #dadce0;
    border-bottom: none;
    display: flex;
    align-items: center;
    padding: 8px 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: ${1000 + index};
    transition: none;
  `;
  
  // Add favicon
  const favicon = document.createElement('img');
  favicon.src = tabData.favIconUrl || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><circle cx="8" cy="8" r="8" fill="%23ccc"/></svg>';
  favicon.style.cssText = `
    width: 16px;
    height: 16px;
    margin-right: 8px;
    border-radius: 2px;
    flex-shrink: 0;
  `;
  
  // Add title
  const title = document.createElement('div');
  title.textContent = tabData.title || 'Tab';
  title.style.cssText = `
    font-size: 12px;
    font-weight: 400;
    color: #5f6368;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  `;
  
  // Add close button effect
  const closeButton = document.createElement('div');
  closeButton.style.cssText = `
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #ea4335;
    margin-left: 8px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 10px;
    font-weight: bold;
  `;
  closeButton.textContent = '×';
  
  flyingTab.appendChild(favicon);
  flyingTab.appendChild(title);
  flyingTab.appendChild(closeButton);
  container.appendChild(flyingTab);

  // Immediate lifting and flying - no delays!
  requestAnimationFrame(() => {
    // Quick lift-off
    flyingTab.style.transition = 'all 0.15s ease-out';
    flyingTab.style.transform = 'scale(1.05) translateY(-5px)';
    flyingTab.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
    
    // Immediate fly to target
    setTimeout(() => {
      flyingTab.style.transition = 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      flyingTab.style.left = targetPosition.x + 'px';
      flyingTab.style.top = targetPosition.y + 'px';
      flyingTab.style.transform = 'scale(0.15) rotate(8deg)';
      flyingTab.style.opacity = '0';
    }, 50); // Minimal delay
  });

  // Add sparkle trail
  createSparkleTrail(container, startPosition, targetPosition, index);
}

function createSparkleTrail(container, startPosition, targetPosition, index) {
  const sparkleCount = 8;
  
  for (let i = 0; i < sparkleCount; i++) {
    // Create sparkles immediately with minimal delay
    setTimeout(() => {
      const sparkle = document.createElement('div');
      sparkle.style.cssText = `
        position: absolute;
        width: 5px;
        height: 5px;
        background: #4285f4;
        border-radius: 50%;
        left: ${startPosition.x + 90}px;
        top: ${startPosition.y + 18}px;
        transform: translate(-50%, -50%);
        transition: all 0.5s ease-out;
        z-index: ${999 + index};
        box-shadow: 0 0 6px #4285f4;
      `;
      
      container.appendChild(sparkle);
      
      // Immediate sparkle animation
      requestAnimationFrame(() => {
        const randomOffset = (Math.random() - 0.5) * 30;
        sparkle.style.left = targetPosition.x + randomOffset + 'px';
        sparkle.style.top = targetPosition.y + randomOffset + 'px';
        sparkle.style.opacity = '0';
        sparkle.style.transform = 'translate(-50%, -50%) scale(0)';
      });
      
      // Quick cleanup
      setTimeout(() => {
        sparkle.remove();
      }, 600);
    }, i * 30); // Much faster sparkle timing
  }
}

function showSuccessMessage(container, tabCount) {
  const message = document.createElement('div');
  message.style.cssText = `
    position: absolute;
    top: 20%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(102, 126, 234, 0.95);
    color: white;
    padding: 20px 30px;
    border-radius: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 16px;
    font-weight: 600;
    box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    backdrop-filter: blur(10px);
    text-align: center;
    opacity: 0;
    transition: all 0.5s ease;
  `;
  
  message.innerHTML = `
    <div>Focus Mode Activated!</div>
    <div style="font-size: 14px; opacity: 0.9; margin-top: 4px;">${tabCount} tabs parked safely</div>
  `;
  
  container.appendChild(message);
  
  // Show message
  setTimeout(() => {
    message.style.opacity = '1';
    message.style.transform = 'translate(-50%, -50%) scale(1)';
  }, 100);
  
  // Hide message
  setTimeout(() => {
    message.style.opacity = '0';
    message.style.transform = 'translate(-50%, -50%) scale(0.8)';
  }, 2000);
}

// Restore a parked tab
async function restoreTab(parkedTabId) {
  try {
    const parkedTabs = await getParkedTabs();
    const tabToRestore = parkedTabs.find(tab => tab.id === parkedTabId);
    
    if (tabToRestore) {
      // Create new tab
      await chrome.tabs.create({
        url: tabToRestore.url,
        active: false
      });
      
      // Remove from parked tabs
      await unparkTab(parkedTabId);
      
      console.log('Restored tab:', tabToRestore.title);
    }
  } catch (error) {
    console.error('Error restoring tab:', error);
  }
}

// Restore all parked tabs
async function restoreAllTabs() {
  try {
    const parkedTabs = await getParkedTabs();
    
    if (parkedTabs.length === 0) {
      console.log('No parked tabs to restore');
      return;
    }
    
    console.log('Restoring', parkedTabs.length, 'tabs');
    
    // Create all tabs
    for (const tab of parkedTabs) {
      await chrome.tabs.create({
        url: tab.url,
        active: false
      });
    }
    
    // Clear all parked tabs
    await saveParkedTabs([]);
    
    console.log('Restored all tabs successfully');
  } catch (error) {
    console.error('Error restoring all tabs:', error);
    throw error;
  }
}

// Message handling from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'focusNow':
      focusNow();
      sendResponse({ success: true });
      break;
      
    case 'getParkedTabs':
      getParkedTabs().then(tabs => {
        console.log('DEBUG: getParkedTabs message handler - returning', tabs.length, 'tabs');
        console.log('DEBUG: Tab titles being returned:', tabs.map(t => t.title));
        sendResponse({ tabs });
      });
      return true; // Async response
      
    case 'restoreTab':
      restoreTab(request.tabId);
      sendResponse({ success: true });
      break;
      
    case 'restoreAllTabs':
      restoreAllTabs().then(() => {
        sendResponse({ success: true });
      }).catch(error => {
        console.error('Error restoring all tabs:', error);
        sendResponse({ error: error.message });
      });
      return true; // Will respond asynchronously
      
    case 'clearAllParked':
      saveParkedTabs([]);
      sendResponse({ success: true });
      break;
      
    case 'removeParkedTab':
      unparkTab(request.tabId);
      sendResponse({ success: true });
      break;
      
    default:
      sendResponse({ error: 'Unknown action' });
  }
});

// Keyboard shortcut support
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'focus-now') {
    focusNow();
  }
});

console.log('Focus Now background script loaded');