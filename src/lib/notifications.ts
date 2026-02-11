/**
 * Client-side toast notification system for C4C Campus
 * @module lib/notifications
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

const TOAST_CONTAINER_ID = 'c4c-toast-container';

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
const DEFAULT_DURATION = 5000;

/**
 * Ensure toast container exists in DOM
 */
function ensureContainer(): HTMLElement {
  let container = document.getElementById(TOAST_CONTAINER_ID);
  if (!container) {
    container = document.createElement('div');
    container.id = TOAST_CONTAINER_ID;
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      max-width: 400px;
    `;
    document.body.appendChild(container);
  }
  return container;
}

/**
 * Get CSS styles for toast type
 */
function getToastStyles(type: ToastType): string {
  const baseStyles = `
    padding: 16px 20px;
    border-radius: 8px;
    color: white;
    font-family: system-ui, sans-serif;
    font-size: 14px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideIn 0.3s ease-out;
  `;

  const colors: Record<ToastType, string> = {
    success: 'background: #10b981;',
    error: 'background: #ef4444;',
    warning: 'background: #f59e0b;',
    info: 'background: #3b82f6;',
  };

  return baseStyles + colors[type];
}

/**
 * Get icon for toast type
 */
function getToastIcon(type: ToastType): string {
  const icons: Record<ToastType, string> = {
    success: '\u2713',
    error: '\u2717',
    warning: '\u26A0',
    info: '\u2139',
  };
  return icons[type];
}

/**
 * Display a toast notification
 * @param message - Message to display
 * @param type - Toast type (success, error, warning, info)
 * @param duration - Duration in milliseconds (default 5000)
 * @returns Toast element ID
 */
export function showToast(
  message: string,
  type: ToastType = 'info',
  duration: number = DEFAULT_DURATION
): string {
  const container = ensureContainer();
  const toastId = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  const toast = document.createElement('div');
  toast.id = toastId;
  toast.style.cssText = getToastStyles(type);
  toast.innerHTML = `
    <span style="font-size: 18px;">${getToastIcon(type)}</span>
    <span style="flex: 1;">${escapeHtml(message)}</span>
    <button onclick="this.parentElement.remove()" style="
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 18px;
      padding: 0;
      opacity: 0.7;
    ">&times;</button>
  `;

  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  return toastId;
}

/**
 * Dismiss a specific toast or all toasts
 * @param toastId - Optional toast ID to dismiss
 */
export function dismissToast(toastId?: string): void {
  if (toastId) {
    const toast = document.getElementById(toastId);
    if (toast) {
      toast.style.animation = 'slideOut 0.3s ease-in forwards';
      setTimeout(() => toast.remove(), 300);
    }
  } else {
    const container = document.getElementById(TOAST_CONTAINER_ID);
    if (container) {
      container.innerHTML = '';
    }
  }
}

/**
 * Show a confirmation dialog
 * @param message - Confirmation message
 * @param confirmText - Confirm button text (default "Confirm")
 * @param cancelText - Cancel button text (default "Cancel")
 * @returns Promise resolving to user's choice
 */
export function showConfirm(
  message: string,
  confirmText: string = 'Confirm',
  cancelText: string = 'Cancel'
): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    `;

    overlay.innerHTML = `
      <div style="
        background: white;
        padding: 24px;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      ">
        <p style="margin: 0 0 20px; font-size: 16px; color: #1f2937;">${escapeHtml(message)}</p>
        <div style="display: flex; gap: 12px; justify-content: flex-end;">
          <button id="confirm-cancel" style="
            padding: 10px 20px;
            border: 1px solid #d1d5db;
            background: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">${escapeHtml(cancelText)}</button>
          <button id="confirm-ok" style="
            padding: 10px 20px;
            border: none;
            background: #10b981;
            color: white;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
          ">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const cleanup = (result: boolean) => {
      overlay.remove();
      resolve(result);
    };

    overlay.querySelector('#confirm-ok')?.addEventListener('click', () => cleanup(true));
    overlay.querySelector('#confirm-cancel')?.addEventListener('click', () => cleanup(false));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup(false);
    });
  });
}

/**
 * Set button loading state
 * @param button - Button element or selector
 * @param loading - Loading state
 * @param loadingText - Text to show while loading
 */
export function setButtonLoading(
  button: HTMLButtonElement | string,
  loading: boolean,
  loadingText: string = 'Loading...'
): void {
  const btn = typeof button === 'string'
    ? document.querySelector<HTMLButtonElement>(button)
    : button;

  if (!btn) return;

  if (loading) {
    btn.dataset.originalText = btn.textContent || '';
    btn.disabled = true;
    btn.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <span style="
          width: 16px;
          height: 16px;
          border: 2px solid currentColor;
          border-right-color: transparent;
          border-radius: 50%;
          animation: spin 0.75s linear infinite;
        "></span>
        ${escapeHtml(loadingText)}
      </span>
    `;
  } else {
    btn.disabled = false;
    btn.textContent = btn.dataset.originalText || '';
    delete btn.dataset.originalText;
  }
}

/**
 * Show a loading overlay
 * @param message - Loading message
 * @returns Loading overlay ID
 */
export function showLoading(message: string = 'Loading...'): string {
  const loadingId = `loading-${Date.now()}`;

  const overlay = document.createElement('div');
  overlay.id = loadingId;
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(255,255,255,0.9);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 10001;
  `;

  overlay.innerHTML = `
    <div style="
      width: 48px;
      height: 48px;
      border: 4px solid #e5e7eb;
      border-top-color: #10b981;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    "></div>
    <p style="margin-top: 16px; color: #4b5563; font-size: 16px;">${escapeHtml(message)}</p>
  `;

  document.body.appendChild(overlay);
  return loadingId;
}

/**
 * Dismiss a loading overlay
 * @param loadingId - Loading overlay ID
 */
export function dismissLoading(loadingId: string): void {
  const overlay = document.getElementById(loadingId);
  if (overlay) {
    overlay.remove();
  }
}

// Add required CSS animations
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}
