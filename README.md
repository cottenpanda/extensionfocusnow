# 🎯 Focus Now - Chrome Extension

A single-click Chrome extension that helps you focus by creating a beautiful particle dissolve effect on distracting tabs, then "parking" them for easy restoration later.

## ✨ Features

- **One-Click Focus**: Instantly park all tabs except your current one
- **Beautiful Particle Effects**: Watch tabs dissolve with cute particle animations
- **Smart Tab Parking**: Safely stores tab URLs, titles, and favicons
- **Easy Restoration**: Restore any parked tab with a single click
- **Clean Interface**: Modern, gradient-based popup design
- **Keyboard Shortcuts**: Quick access via hotkeys (configurable)

## 🚀 Installation

### Method 1: Load as Unpacked Extension (Development)

1. **Generate Icons** (if not already done):
   - Open `generate-icons.html` in your browser
   - Click each button to download the icon files
   - Move the downloaded `icon16.png`, `icon48.png`, and `icon128.png` to the `icons/` folder

2. **Load in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top-right)
   - Click "Load unpacked"
   - Select the `Extension` folder
   - The extension should now appear in your toolbar!

### Method 2: Package and Install

1. Generate icons as above
2. Go to `chrome://extensions/`
3. Click "Pack extension"
4. Select the `Extension` folder
5. Install the generated `.crx` file

## 🎮 How to Use

### Basic Usage

1. **Focus Now**: Click the extension icon and hit the big "✨ Focus Now" button
2. **Watch the Magic**: All other tabs will show particle effects before being parked
3. **Stay Focused**: Only your current tab remains open
4. **Restore Later**: Click the extension icon to see your parked tabs and restore any of them

### Advanced Features

- **Bulk Restore**: Each parked tab can be restored individually
- **Clear All**: Remove all parked tabs permanently
- **Auto-Refresh**: The popup updates parked tabs automatically
- **Smart Detection**: Won't park pinned tabs
- **Error Handling**: Gracefully handles tabs that can't be accessed

## 🛠️ Technical Details

### Architecture

- **Manifest V3**: Uses the latest Chrome extension standard
- **Service Worker**: Background script for tab management
- **Content Scripts**: Inject particle animations into web pages
- **Storage API**: Persistent storage for parked tabs
- **Tabs API**: Full tab management capabilities

### File Structure

```
Extension/
├── manifest.json          # Extension configuration
├── background.js          # Main tab management logic
├── content.js            # Page-level particle animations
├── popup.html            # Extension popup interface
├── popup.js              # Popup interaction logic
├── icons/                # Extension icons (16, 48, 128px)
├── generate-icons.html   # Tool to create icon files
└── README.md            # This file
```

### Permissions

- `tabs`: Access and manage browser tabs
- `storage`: Save parked tab information
- `activeTab`: Interact with the current tab
- `scripting`: Inject particle animation scripts
- `<all_urls>`: Access all websites for animations

## 🎨 Customization

### Particle Effects

Edit the `triggerParticleDissolve()` function in `background.js` to customize:
- Particle count (`50` default)
- Animation duration (`2000ms` default)
- Particle colors (currently blue/purple theme)
- Physics (velocity, decay, size)

### UI Theme

Modify `popup.html` CSS to change:
- Color gradients
- Button styles
- Layout and spacing
- Typography

## 🐛 Troubleshooting

### Common Issues

**Extension won't load:**
- Ensure all files are in the Extension folder
- Check that icons exist in the `icons/` directory
- Verify manifest.json syntax with a JSON validator

**Particle animation not working:**
- Some websites block content script injection
- Extensions can't access `chrome://` or `about://` pages
- Check browser console for script errors

**Tabs not parking:**
- Pinned tabs are intentionally skipped
- Special Chrome pages can't be accessed
- Check that tabs permission is granted

### Debug Mode

Enable Chrome Developer Mode and check the extension's background page console for detailed error messages.

## 🚀 Future Enhancements

- [ ] Custom particle effects selection
- [ ] Tab grouping by domain/time
- [ ] Productivity timer integration
- [ ] Export/import parked tabs
- [ ] Keyboard shortcuts configuration
- [ ] Tab preview thumbnails
- [ ] Focus session analytics
- [ ] Dark/light theme toggle

## 📝 License

MIT License - feel free to modify and distribute!

## 🤝 Contributing

This extension was built as a demonstration of Chrome extension development. Feel free to fork, modify, and improve it!

---

Made with ❤️ and a focus on productivity