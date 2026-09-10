import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

export type NavView = 'accounts' | 'transactions' | 'dashboard' | 'reconciliation' | 'budgets';

interface NavItem {
  id: NavView;
  label: string;
  icon: string;
  badge?: string;
  phase?: string;
}

@customElement('penga-sidebar')
export class PengaSidebar extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 260px;
      min-width: 260px;
      height: 100vh;
      background: var(--bg-surface);
      border-right: 1px solid var(--border-subtle);
      transition: background-color var(--transition-normal), border-color var(--transition-normal);
      user-select: none;
      position: sticky;
      top: 0;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 0.85rem;
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-subtle);
    }

    .brand-logo {
      width: 36px;
      height: 36px;
      border-radius: var(--radius-md);
      background: linear-gradient(135deg, var(--color-primary) 0%, #047857 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.2rem;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.25);
    }

    .brand-text h1 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--text-primary);
    }

    .brand-text p {
      margin: 0;
      font-size: 0.72rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    .nav-section {
      flex: 1;
      padding: 1.25rem 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      overflow-y: auto;
    }

    .section-title {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-muted);
      padding: 0.5rem 0.75rem 0.25rem;
    }

    .nav-btn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 500;
      cursor: pointer;
      text-align: left;
      transition: all var(--transition-fast);
      outline: none;
    }

    .nav-btn-content {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .nav-icon {
      font-size: 1.1rem;
      width: 22px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .nav-btn:hover {
      background: var(--bg-subtle);
      color: var(--text-primary);
    }

    .nav-btn.active {
      background: var(--color-primary-subtle);
      color: var(--color-primary-text);
      border-color: var(--color-primary-border);
      font-weight: 600;
    }

    .badge-tag {
      font-size: 0.65rem;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-full);
      background: var(--bg-muted);
      color: var(--text-muted);
      font-weight: 600;
    }

    .badge-tag.active {
      background: var(--color-primary);
      color: #ffffff;
    }

    .footer {
      padding: 1rem 1.25rem;
      border-top: 1px solid var(--border-subtle);
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .status-dot {
      display: inline-block;
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--color-primary);
      margin-right: 0.4rem;
      box-shadow: 0 0 6px var(--color-primary);
    }
  `;

  @property({ type: String })
  activeView: NavView = 'accounts';

  private navItems: NavItem[] = [
    { id: 'accounts', label: 'Accounts & Tree', icon: '🌳', badge: 'Active' },
    { id: 'transactions', label: 'Transactions', icon: '💸', phase: 'Step 8' },
    { id: 'dashboard', label: 'Dashboard', icon: '📊', phase: 'Step 10' },
    { id: 'reconciliation', label: 'Reconciliation', icon: '📑', phase: 'Step 11' },
    { id: 'budgets', label: 'Budgets & Rules', icon: '🎯', phase: 'Step 12' },
  ];

  private handleNavClick(viewId: NavView) {
    this.activeView = viewId;
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { view: viewId },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    return html`
      <div class="brand">
        <div class="brand-logo">P</div>
        <div class="brand-text">
          <h1>Penga</h1>
          <p>Personal Finance</p>
        </div>
      </div>

      <nav class="nav-section">
        <div class="section-title">Navigation</div>
        ${this.navItems.map(
          (item) => html`
            <button
              class="nav-btn ${this.activeView === item.id ? 'active' : ''}"
              @click="${() => this.handleNavClick(item.id)}"
              aria-current="${this.activeView === item.id ? 'page' : 'false'}"
            >
              <div class="nav-btn-content">
                <span class="nav-icon">${item.icon}</span>
                <span>${item.label}</span>
              </div>
              ${item.badge
                ? html`<span class="badge-tag active">${item.badge}</span>`
                : item.phase
                ? html`<span class="badge-tag">${item.phase}</span>`
                : ''}
            </button>
          `
        )}
      </nav>

      <div class="footer">
        <div>
          <span class="status-dot"></span>
          <span>PostgreSQL Live</span>
        </div>
        <span>v0.1.0</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-sidebar': PengaSidebar;
  }
}
