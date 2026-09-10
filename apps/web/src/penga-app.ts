import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './components/theme-toggle.js';
import './components/penga-sidebar.js';
import './components/penga-accounts.js';
import type { NavView } from './components/penga-sidebar.js';

@customElement('penga-app')
export class PengaApp extends LitElement {
  static override styles = css`
    :host {
      display: flex;
      min-height: 100vh;
      background-color: var(--bg-base);
      color: var(--text-primary);
      transition: background-color var(--transition-normal), color var(--transition-normal);
      font-family: var(--font-sans);
    }

    .app-layout {
      display: flex;
      width: 100%;
      min-height: 100vh;
    }

    .main-viewport {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
      background-color: var(--bg-base);
    }

    .top-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 2.5rem;
      background: var(--bg-glass);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 100;
      transition: background var(--transition-normal), border-color var(--transition-normal);
    }

    .header-breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .header-breadcrumb strong {
      color: var(--text-primary);
      font-weight: 600;
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      background: var(--color-primary-subtle);
      border: 1px solid var(--color-primary-border);
      color: var(--color-primary-text);
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: var(--color-primary);
      box-shadow: 0 0 6px var(--color-primary);
    }

    .content-area {
      flex: 1;
      min-width: 0;
    }

    .placeholder-view {
      padding: 3rem 2.5rem;
      max-width: 800px;
      margin: 0 auto;
    }

    .placeholder-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 3rem;
      text-align: center;
      box-shadow: var(--shadow-card);
    }

    .placeholder-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .placeholder-card h3 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .placeholder-card p {
      margin: 0 0 1.5rem 0;
      color: var(--text-secondary);
      line-height: 1.6;
    }

    .phase-badge {
      display: inline-block;
      padding: 0.35rem 0.85rem;
      border-radius: var(--radius-full);
      background: var(--color-primary-subtle);
      border: 1px solid var(--color-primary-border);
      color: var(--color-primary-text);
      font-size: 0.8rem;
      font-weight: 600;
    }
  `;

  @state()
  private currentView: NavView = 'accounts';

  private handleNavigation = (e: CustomEvent<{ view: NavView }>) => {
    this.currentView = e.detail.view;
  };

  override render() {
    return html`
      <div class="app-layout">
        <!-- Sidebar Navigation -->
        <penga-sidebar
          .activeView="${this.currentView}"
          @navigate="${this.handleNavigation}"
        ></penga-sidebar>

        <!-- Main Viewport -->
        <div class="main-viewport">
          <header class="top-header">
            <div class="header-breadcrumb">
              <span>Penga</span>
              <span>/</span>
              <strong style="text-transform: capitalize;">${this.currentView}</strong>
            </div>

            <div class="header-actions">
              <div class="status-badge">
                <span class="status-dot"></span>
                <span>Postgres Connected</span>
              </div>
              <theme-toggle></theme-toggle>
            </div>
          </header>

          <main class="content-area">
            ${this.currentView === 'accounts'
              ? html`<penga-accounts></penga-accounts>`
              : html`
                  <div class="placeholder-view">
                    <div class="placeholder-card">
                      <div class="placeholder-icon">
                        ${this.currentView === 'transactions' ? '💸' :
                          this.currentView === 'dashboard' ? '📊' :
                          this.currentView === 'reconciliation' ? '📑' : '🎯'}
                      </div>
                      <h3 style="text-transform: capitalize;">${this.currentView} View</h3>
                      <p>
                        This module will be introduced in subsequent roadmap phases.
                        Manage accounts and nested categories in the <strong>Accounts & Tree</strong> view.
                      </p>
                      <span class="phase-badge">Scheduled Next</span>
                    </div>
                  </div>
                `}
          </main>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-app': PengaApp;
  }
}
