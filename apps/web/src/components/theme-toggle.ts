import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

@customElement('theme-toggle')
export class ThemeToggle extends LitElement {
  static override styles = css`
    :host {
      display: inline-flex;
    }

    .toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-full, 9999px);
      background-color: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      user-select: none;
      outline: none;
    }

    .toggle-btn:hover {
      background-color: var(--bg-muted);
      color: var(--text-primary);
      border-color: var(--border-strong);
      transform: translateY(-1px);
    }

    .toggle-btn:focus-visible {
      border-color: var(--border-focus);
      box-shadow: 0 0 0 2px var(--color-primary-subtle);
    }

    .icon-wrap {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
    }

    svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform var(--transition-normal);
    }

    .toggle-btn:hover svg {
      transform: rotate(15deg);
    }

    .theme-label {
      text-transform: capitalize;
    }
  `;

  @state()
  private currentTheme: 'light' | 'dark' = 'light';

  override connectedCallback() {
    super.connectedCallback();
    this.syncThemeFromDOM();

    // Listen for storage changes in other tabs
    window.addEventListener('storage', this.handleStorageChange);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('storage', this.handleStorageChange);
  }

  private handleStorageChange = (e: StorageEvent) => {
    if (e.key === 'penga-theme' && (e.newValue === 'light' || e.newValue === 'dark')) {
      this.currentTheme = e.newValue;
      document.documentElement.setAttribute('data-theme', e.newValue);
    }
  };

  private syncThemeFromDOM() {
    const active = document.documentElement.getAttribute('data-theme');
    if (active === 'dark' || active === 'light') {
      this.currentTheme = active;
    } else {
      const saved = localStorage.getItem('penga-theme');
      if (saved === 'dark' || saved === 'light') {
        this.currentTheme = saved;
        document.documentElement.setAttribute('data-theme', saved);
      } else {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        this.currentTheme = prefersDark ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', this.currentTheme);
      }
    }
  }

  private toggleTheme() {
    const nextTheme: 'light' | 'dark' = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.currentTheme = nextTheme;
    document.documentElement.setAttribute('data-theme', nextTheme);
    try {
      localStorage.setItem('penga-theme', nextTheme);
    } catch (e) {
      console.warn('Could not persist theme to localStorage', e);
    }

    this.dispatchEvent(
      new CustomEvent('theme-changed', {
        detail: { theme: nextTheme },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    const isDark = this.currentTheme === 'dark';

    return html`
      <button
        type="button"
        class="toggle-btn"
        @click="${this.toggleTheme}"
        aria-label="Switch to ${isDark ? 'parchment light' : 'charcoal dark'} mode"
        title="Switch to ${isDark ? 'parchment light' : 'charcoal dark'} mode"
      >
        <span class="icon-wrap">
          ${isDark
            ? html`
                <!-- Sun Icon for switching to light mode -->
                <svg viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="4"></circle>
                  <path d="M12 2v2"></path>
                  <path d="M12 20v2"></path>
                  <path d="m4.93 4.93 1.41 1.41"></path>
                  <path d="m17.66 17.66 1.41 1.41"></path>
                  <path d="M2 12h2"></path>
                  <path d="M20 12h2"></path>
                  <path d="m6.34 17.66-1.41 1.41"></path>
                  <path d="m19.07 4.93-1.41 1.41"></path>
                </svg>
              `
            : html`
                <!-- Moon Icon for switching to dark mode -->
                <svg viewBox="0 0 24 24">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
                </svg>
              `}
        </span>
        <span class="theme-label">${isDark ? 'Light' : 'Dark'}</span>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'theme-toggle': ThemeToggle;
  }
}
