const vscode = acquireVsCodeApi();
let prompts = [];
let isAddingPrompt = false;
let showDisabled = false;
let isSettingsOpen = false;

// Default colors - will be overridden by stored settings if available
let uiSettings = {
  controlsColor: null, // null means use VSCode default
  backgroundColor: null,
  rowBackgroundColor: null  // New setting for prompt row backgrounds
};

// Signal to the extension that the webview is ready
vscode.postMessage({ command: "webviewReady" });

// Listen for messages from the extension
window.addEventListener('message', event => {
    const message = event.data;
    if (message.command === 'setPrompts') {
        prompts = message.prompts;
        console.log('[Buttonhole] Received', prompts.length, 'prompts');
        vscode.setState({ prompts: prompts, uiSettings: uiSettings });
        render();
    } else if (message.command === 'saveSuccess') {
        showToast("Prompts saved successfully");
    }
});

// Try to restore from state if available
try {
    const state = vscode.getState();
    if (state) {
        if (state.prompts) {
            console.log('[Buttonhole] Restored prompts from state:', state.prompts.length);
            prompts = state.prompts;
        }
        if (state.uiSettings) {
            console.log('[Buttonhole] Restored UI settings from state');
            uiSettings = state.uiSettings;
            applyUISettings();
        }
        render();
    }
} catch (err) {
    console.error('[Buttonhole] Error restoring state:', err);
}

function applyUISettings() {
    const root = document.documentElement;
    
    // Apply controls color if set
    if (uiSettings.controlsColor) {
        console.log('[Buttonhole] Setting controls color:', uiSettings.controlsColor);
        root.style.setProperty('--controls-color', uiSettings.controlsColor);
        
        // Also set the hover color to be a slightly lighter variant
        const lighterColor = lightenColor(uiSettings.controlsColor, 15);
        root.style.setProperty('--controls-hover-color', lighterColor);
        
        // Make sure text color contrasts well with the button color
        const isDark = isColorDark(uiSettings.controlsColor);
        root.style.setProperty('--button-text-color', isDark ? '#ffffff' : '#000000');
        
        console.log('[Buttonhole] Setting button text color:', isDark ? 'white' : 'black');
    } else {
        console.log('[Buttonhole] Using default controls colors');
        root.style.removeProperty('--controls-color');
        root.style.removeProperty('--controls-hover-color');
        root.style.removeProperty('--button-text-color');
    }
    
    // Apply background color if set
    if (uiSettings.backgroundColor) {
        console.log('[Buttonhole] Setting background color:', uiSettings.backgroundColor);
        root.style.setProperty('--background-color', uiSettings.backgroundColor);
    } else {
        console.log('[Buttonhole] Using default background color');
        root.style.removeProperty('--background-color');
    }
    
    // Apply row background color if set
    if (uiSettings.rowBackgroundColor) {
        console.log('[Buttonhole] Setting row background color:', uiSettings.rowBackgroundColor);
        root.style.setProperty('--row-background', uiSettings.rowBackgroundColor);
        
        // Set a slightly darker hover color for rows
        const darkerColor = darkenColor(uiSettings.rowBackgroundColor, 15);
        root.style.setProperty('--row-hover-background', darkerColor);
    } else {
        console.log('[Buttonhole] Using default row background colors');
        root.style.removeProperty('--row-background');
        root.style.removeProperty('--row-hover-background');
    }
}

// Helper function to check if a color is dark (to determine text color)
function isColorDark(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.substring(1, 3), 16);
    const g = parseInt(hexColor.substring(3, 5), 16);
    const b = parseInt(hexColor.substring(5, 7), 16);
    
    // Calculate perceived brightness using standard formula
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    
    // Return true if the color is dark (brightness < 128)
    return brightness < 128;
}

// Helper function to create lighter color for hover states
function lightenColor(color, percent) {
    // Convert hex to RGB
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);
    
    // Increase RGB values to lighten
    r = Math.min(255, Math.floor(r * (1 + percent/100)));
    g = Math.min(255, Math.floor(g * (1 + percent/100)));
    b = Math.min(255, Math.floor(b * (1 + percent/100)));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Add helper function to darken colors for row hover effect
function darkenColor(color, percent) {
    // Convert hex to RGB
    let r = parseInt(color.substring(1, 3), 16);
    let g = parseInt(color.substring(3, 5), 16);
    let b = parseInt(color.substring(5, 7), 16);
    
    // Decrease RGB values to darken
    r = Math.max(0, Math.floor(r * (1 - percent/100)));
    g = Math.max(0, Math.floor(g * (1 - percent/100)));
    b = Math.max(0, Math.floor(b * (1 - percent/100)));
    
    // Convert back to hex
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// Add this helper function near your other utility functions
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Add this function to webview.js

function createConfirmDialog(message, onConfirm, onCancel) {
  // Create the modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  
  // Create the confirmation dialog
  const dialog = document.createElement('div');
  dialog.className = 'confirm-dialog';
  
  // Add message
  const messageEl = document.createElement('p');
  messageEl.innerText = message;
  dialog.appendChild(messageEl);
  
  // Add buttons container
  const buttons = document.createElement('div');
  buttons.className = 'dialog-buttons';
  
  // Create delete button
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'primary-button';
  confirmBtn.innerText = 'Delete';
  confirmBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onConfirm) onConfirm();
  };
  
  // Create cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'secondary-button';
  cancelBtn.innerText = 'Cancel';
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
    if (onCancel) onCancel();
  };
  
  // Add buttons to container
  buttons.appendChild(confirmBtn);
  buttons.appendChild(cancelBtn);
  dialog.appendChild(buttons);
  
  // Add dialog to overlay
  overlay.appendChild(dialog);
  
  // Add overlay to body
  document.body.appendChild(overlay);
}

function render() {
  console.log('[Buttonhole] Rendering', prompts.length, 'prompts');
  const container = document.getElementById("container");
  if (!container) {
    console.error('[Buttonhole] Container element not found!');
    return;
  }
  container.innerHTML = "";
  
  // Create the prompt list section
  const promptList = document.createElement("div");
  promptList.className = "prompt-list";
  container.appendChild(promptList);

  // Create a header section
  const header = document.createElement("div");
  header.className = "prompt-header";
  header.innerHTML = `
    <div class="header-enabled">Status</div>
    <div class="header-label">Prompt</div>
    <div class="header-actions">Actions</div>
  `;
  promptList.appendChild(header);

  // Filter prompts based on enabled status if needed
  const visiblePrompts = showDisabled ? prompts : prompts.filter(p => p.enabled);
  
  if (visiblePrompts.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.textContent = showDisabled ? 
      "No prompts found. Add some below!" : 
      "No active prompts. Toggle 'Show All' to see all prompts.";
    promptList.appendChild(emptyState);
  }

  // Add visible prompts
  visiblePrompts.forEach((p, i) => {
    const actualIndex = prompts.indexOf(p); // Find the real index in the full array
    
    const row = document.createElement("div");
    row.className = "prompt-row" + (p.enabled ? " enabled" : " disabled");
    row.setAttribute("role", "button");
    row.setAttribute("aria-label", `Copy ${p.label} prompt`);
    row.title = "Click to copy prompt to clipboard";

    const toggleContainer = document.createElement("div");
    toggleContainer.className = "toggle-container";
    
    const toggle = document.createElement("input");
    toggle.type = "checkbox";
    toggle.id = `toggle-${actualIndex}`;
    toggle.className = "prompt-toggle";
    toggle.checked = p.enabled;
    toggle.setAttribute("aria-label", `Toggle ${p.label} prompt`);
    toggle.onclick = (e) => {
      e.stopPropagation();
      prompts[actualIndex].enabled = toggle.checked;
      save();
      render();
    };
    
    const toggleLabel = document.createElement("label");
    toggleLabel.htmlFor = `toggle-${actualIndex}`;
    toggleLabel.className = "toggle-label";
    toggleLabel.onclick = (e) => e.stopPropagation();
    
    toggleContainer.appendChild(toggle);
    toggleContainer.appendChild(toggleLabel);

    const labelElem = document.createElement("div");
    labelElem.className = "prompt-label";
    labelElem.innerText = p.label;
    labelElem.title = p.prompt; // Show the full prompt on hover

    const actionsContainer = document.createElement("div");
    actionsContainer.className = "actions-container";
    actionsContainer.onclick = (e) => e.stopPropagation();

    const deleteBtn = document.createElement("button");
    deleteBtn.innerHTML = `<svg class="icon-svg" viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM8 9h8v10H8V9zm7.5-5l-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>`;
    deleteBtn.className = "action-button delete-btn";
    deleteBtn.title = "Delete this prompt";

    // Add an explicit ID to help with debugging
    deleteBtn.id = `delete-btn-${actualIndex}`;

    // Replace the delete button handler
    deleteBtn.addEventListener('click', function(e) {
      // Log to verify the event is firing
      console.log('[Buttonhole] Delete button clicked for:', p.label);
      
      // Stop event propagation
      e.stopPropagation();
      e.preventDefault();
      
      // Use our custom confirm dialog instead of the native confirm()
      createConfirmDialog(`Delete "${p.label}" prompt?`, 
        // onConfirm callback
        () => {
          console.log('[Buttonhole] Confirmed deletion for prompt:', p.label);
          
          // Find the prompt index directly from the current array
          const deleteIndex = prompts.indexOf(p);
          console.log('[Buttonhole] Found prompt at index:', deleteIndex);
          
          if (deleteIndex !== -1) {
            // Create a new array without the deleted item
            const updatedPrompts = [...prompts];
            updatedPrompts.splice(deleteIndex, 1);
            
            // Replace the prompts array with the filtered version
            prompts = updatedPrompts;
            
            // Save changes to persistent storage
            save();
            
            // Show confirmation
            showToast("Prompt deleted");
            
            // Refresh the UI
            render();
          } else {
            console.error('[Buttonhole] Failed to find prompt in array');
            showToast("Error deleting prompt");
          }
        }
      );
    });

    // Make the SVG inside the button ignore pointer events to ensure button receives clicks
    const svgElement = deleteBtn.querySelector('svg');
    if (svgElement) {
      svgElement.style.pointerEvents = 'none';
    }

    actionsContainer.appendChild(deleteBtn);

    row.appendChild(toggleContainer);
    row.appendChild(labelElem);
    row.appendChild(actionsContainer);
    
    // Add click handler to copy the prompt
    row.onclick = () => {
      navigator.clipboard.writeText(p.prompt);
      showToast("Prompt copied to clipboard");
    };
    
    promptList.appendChild(row);
  });

  // Add filter toggle and controls
  const filterControls = document.createElement("div");
  filterControls.className = "filter-controls";
  
  const toggleDisabledBtn = document.createElement("button");
  toggleDisabledBtn.className = "filter-toggle " + (showDisabled ? "active" : "");
  toggleDisabledBtn.innerHTML = `
    <svg class="icon-svg" viewBox="0 0 24 24">
      ${showDisabled ? 
        '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>' : 
        '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>' 
      }
    </svg>
    ${showDisabled ? 'Hide Disabled' : 'Show All'}
  `;
  toggleDisabledBtn.title = showDisabled ? "Hide disabled prompts" : "Show all prompts";
  toggleDisabledBtn.onclick = () => {
    showDisabled = !showDisabled;
    render();
  };

  // Add settings button
  const settingsBtn = document.createElement("button");
  settingsBtn.className = "filter-toggle " + (isSettingsOpen ? "active" : "");
  settingsBtn.innerHTML = `
    <svg class="icon-svg" viewBox="0 0 24 24">
      <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
    </svg>
  `;
  settingsBtn.title = "UI Settings";
  settingsBtn.onclick = () => {
    isSettingsOpen = !isSettingsOpen;
    render();
  };
  
  filterControls.appendChild(toggleDisabledBtn);
  filterControls.appendChild(settingsBtn);
  container.appendChild(filterControls);
  
  // Settings panel
  if (isSettingsOpen) {
    const settingsPanel = document.createElement("div");
    settingsPanel.className = "settings-panel";
    
    const settingsTitle = document.createElement("h3");
    settingsTitle.innerText = "UI Settings";
    settingsPanel.appendChild(settingsTitle);
    
    // Controls color setting (renamed from Button color)
    const controlsColorField = document.createElement("div");
    controlsColorField.className = "settings-field";
    
    const controlsColorLabel = document.createElement("label");
    controlsColorLabel.innerText = "Controls Color:";
    controlsColorLabel.htmlFor = "controls-color-input";
    
    const controlsColorInput = document.createElement("input");
    controlsColorInput.type = "color";
    controlsColorInput.id = "controls-color-input";
    controlsColorInput.value = uiSettings.controlsColor || "#0e639c"; // Default VSCode blue
    
    const controlsColorReset = document.createElement("button");
    controlsColorReset.className = "settings-reset-btn";
    controlsColorReset.innerText = "Reset";
    controlsColorReset.onclick = () => {
      uiSettings.controlsColor = null;
      applyUISettings();
      saveSettings();
      render();
    };
    
    controlsColorField.appendChild(controlsColorLabel);
    controlsColorField.appendChild(controlsColorInput);
    controlsColorField.appendChild(controlsColorReset);
    
    // Row Background color setting (new)
    const rowBgColorField = document.createElement("div");
    rowBgColorField.className = "settings-field";
    
    const rowBgColorLabel = document.createElement("label");
    rowBgColorLabel.innerText = "Row Background:";
    rowBgColorLabel.htmlFor = "row-bg-color-input";
    
    const rowBgColorInput = document.createElement("input");
    rowBgColorInput.type = "color";
    rowBgColorInput.id = "row-bg-color-input";
    rowBgColorInput.value = uiSettings.rowBackgroundColor || "#1a1a1a"; // Default slightly darker than editor
    
    const rowBgColorReset = document.createElement("button");
    rowBgColorReset.className = "settings-reset-btn";
    rowBgColorReset.innerText = "Reset";
    rowBgColorReset.onclick = () => {
      uiSettings.rowBackgroundColor = null;
      applyUISettings();
      saveSettings();
      render();
    };
    
    rowBgColorField.appendChild(rowBgColorLabel);
    rowBgColorField.appendChild(rowBgColorInput);
    rowBgColorField.appendChild(rowBgColorReset);
    
    // Background color setting
    const bgColorField = document.createElement("div");
    bgColorField.className = "settings-field";
    
    const bgColorLabel = document.createElement("label");
    bgColorLabel.innerText = "Background:";
    bgColorLabel.htmlFor = "bg-color-input";
    
    const bgColorInput = document.createElement("input");
    bgColorInput.type = "color";
    bgColorInput.id = "bg-color-input";
    bgColorInput.value = uiSettings.backgroundColor || "#1e1e1e"; // Default VSCode dark bg
    
    const bgColorReset = document.createElement("button");
    bgColorReset.className = "settings-reset-btn";
    bgColorReset.innerText = "Reset";
    bgColorReset.onclick = () => {
      uiSettings.backgroundColor = null;
      applyUISettings();
      saveSettings();
      render();
    };
    
    bgColorField.appendChild(bgColorLabel);
    bgColorField.appendChild(bgColorInput);
    bgColorField.appendChild(bgColorReset);
    
    // Save button
    const saveSettingsBtn = document.createElement("button");
    saveSettingsBtn.className = "primary-button save-settings-btn";
    saveSettingsBtn.innerText = "Apply Settings";
    saveSettingsBtn.onclick = () => {
      const controlsColor = controlsColorInput.value;
      const rowBgColor = rowBgColorInput.value;
      const bgColor = bgColorInput.value;
      
      uiSettings.controlsColor = controlsColor !== "#0e639c" ? controlsColor : null;
      uiSettings.rowBackgroundColor = rowBgColor !== "#1a1a1a" ? rowBgColor : null;
      uiSettings.backgroundColor = bgColor !== "#1e1e1e" ? bgColor : null;
      
      applyUISettings();
      saveSettings();
      showToast("Settings applied");
    };
    
    settingsPanel.appendChild(controlsColorField);
    settingsPanel.appendChild(rowBgColorField);
    settingsPanel.appendChild(bgColorField);
    settingsPanel.appendChild(saveSettingsBtn);
    
    container.appendChild(settingsPanel);
  }

  // Add controls section at bottom
  const controls = document.createElement("div");
  controls.className = "controls";
  container.appendChild(controls);

  // Add new prompt form or button
  if (isAddingPrompt) {
    const form = document.createElement("div");
    form.className = "add-prompt-form";
    
    const labelField = document.createElement("div");
    labelField.className = "form-field";
    labelField.innerHTML = `
      <label for="new-prompt-label">Prompt Name:</label>
      <input type="text" id="new-prompt-label" placeholder="Give your prompt a name">
    `;
    
    const textField = document.createElement("div");
    textField.className = "form-field";
    textField.innerHTML = `
      <label for="new-prompt-text">Prompt Text:</label>
      <textarea id="new-prompt-text" rows="4" placeholder="Enter the prompt text here"></textarea>
    `;
    
    const buttons = document.createElement("div");
    buttons.className = "form-buttons";
    
    const saveBtn = document.createElement("button");
    saveBtn.innerText = "Save Prompt";
    saveBtn.className = "primary-button";
    saveBtn.onclick = () => {
      const label = document.getElementById("new-prompt-label").value.trim();
      const text = document.getElementById("new-prompt-text").value.trim();
      
      if (!label) {
        showToast("Please enter a prompt name");
        return;
      }
      
      if (!text) {
        showToast("Please enter prompt text");
        return;
      }
      
      prompts.push({ label, prompt: text, enabled: true });
      save();
      isAddingPrompt = false;
      render();
      showToast("New prompt added");
    };
    
    const cancelBtn = document.createElement("button");
    cancelBtn.innerText = "Cancel";
    cancelBtn.className = "secondary-button";
    cancelBtn.onclick = () => {
      isAddingPrompt = false;
      render();
    };
    
    buttons.appendChild(saveBtn);
    buttons.appendChild(cancelBtn);
    
    form.appendChild(labelField);
    form.appendChild(textField);
    form.appendChild(buttons);
    controls.appendChild(form);
  } else {
    // Action buttons section
    const addBtn = document.createElement("button");
    addBtn.innerHTML = `
      <svg class="icon-svg" viewBox="0 0 24 24">
        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
      </svg>
      Add New Prompt
    `;
    addBtn.className = "primary-button add-btn";
    addBtn.onclick = () => {
      isAddingPrompt = true;
      render();
    };
    controls.appendChild(addBtn);

    const viewFileBtn = document.createElement("button");
    viewFileBtn.innerHTML = `
      <svg class="icon-svg" viewBox="0 0 24 24">
        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
      </svg>
      Open prompts.json
    `;
    viewFileBtn.className = "secondary-button";
    viewFileBtn.onclick = () => {
      vscode.postMessage({ command: "openPromptFile" });
    };
    controls.appendChild(viewFileBtn);
    
    // New Share Prompt Deck button
    const shareBtn = document.createElement("button");
    shareBtn.innerHTML = `
      <svg class="icon-svg" viewBox="0 0 24 24">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
      </svg>
      Share Prompt Deck
    `;
    shareBtn.className = "secondary-button";
    shareBtn.title = "Copy all prompts as JSON to clipboard";
    shareBtn.onclick = () => {
      const promptsJson = JSON.stringify(prompts, null, 2);
      navigator.clipboard.writeText(promptsJson);
      showToast("Prompt deck copied to clipboard");
    };
    controls.appendChild(shareBtn);
  }
}

function saveSettings() {
  const state = vscode.getState() || {};
  state.uiSettings = uiSettings;
  vscode.setState(state);
}

function showToast(msg) {
  // Remove any existing toasts
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => toast.classList.add("visible"), 10);
  
  setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => toast.remove(), 300);
  }, 2000);
}

function save() {
  const state = vscode.getState() || {};
  state.prompts = prompts;
  vscode.setState(state);
  vscode.postMessage({ command: "savePrompts", prompts });
}

// Execute immediately with a small delay to ensure DOM is ready
setTimeout(() => {
  applyUISettings();
  render();
}, 100);

// Keep these event listeners as backups
document.addEventListener('DOMContentLoaded', () => {
  applyUISettings();
  render();
});
window.onload = () => {
  applyUISettings();
  render();
};
