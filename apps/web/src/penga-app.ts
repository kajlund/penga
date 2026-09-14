import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import './components/theme-toggle.js';
import './components/penga-sidebar.js';
import './components/penga-dashboard.js';
import './components/penga-budgets.js';
import './components/penga-accounts.js';
import './components/penga-transactions.js';
import './components/transaction-form.js';
import type { NavView } from './components/penga-sidebar.js';
import type { PengaTransactions } from './components/penga-transactions.js';
import type { PengaAccounts } from './components/penga-accounts.js';
import type { PengaDashboard } from './components/penga-dashboard.js';
import type { PengaBudgets } from './components/penga-budgets.js';
import type { TransactionWithSplits } from '@penga/shared';

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
  private currentView: NavView = 'dashboard';

  @state()
  private isTransactionModalOpen = false;

  @state()
  private editingTransaction: TransactionWithSplits | null = null;

  private handleNavigation = (e: CustomEvent<{ view: NavView }>) => {
    this.currentView = e.detail.view;
  };

  private refreshViews = () => {
    // Refresh dashboard view if mounted
    const dashView = this.shadowRoot?.querySelector('penga-dashboard') as PengaDashboard | null;
    if (dashView) {
      dashView.fetchSummary();
    }

    // Refresh transactions view if mounted
    const txView = this.shadowRoot?.querySelector('penga-transactions') as PengaTransactions | null;
    if (txView) {
      txView.fetchData();
    }

    // Refresh accounts view if mounted
    const accView = this.shadowRoot?.querySelector('penga-accounts') as PengaAccounts | null;
    if (accView) {
      accView.fetchAccounts();
    }

    // Refresh budgets view if mounted
    const budgetView = this.shadowRoot?.querySelector('penga-budgets') as PengaBudgets | null;
    if (budgetView) {
      budgetView.fetchBudgetReport();
    }
  };

  private handleTransactionCreated = () => {
    this.isTransactionModalOpen = false;
    this.editingTransaction = null;
    this.refreshViews();
  };

  private handleTransactionUpdated = () => {
    this.isTransactionModalOpen = false;
    this.editingTransaction = null;
    this.refreshViews();
  };

  private handleOpenCreateModal = () => {
    this.editingTransaction = null;
    this.isTransactionModalOpen = true;
  };

  private handleEditTransaction = (e: CustomEvent<{ transaction: TransactionWithSplits }>) => {
    this.editingTransaction = e.detail.transaction;
    this.isTransactionModalOpen = true;
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
              <theme-toggle></theme-toggle>
            </div>
          </header>

          <main class="content-area">
            ${this.currentView === 'dashboard'
              ? html`
                  <penga-dashboard
                    @open-transaction-modal="${this.handleOpenCreateModal}"
                    @edit-transaction="${this.handleEditTransaction}"
                    @navigate="${this.handleNavigation}"
                  ></penga-dashboard>
                `
              : this.currentView === 'accounts'
              ? html`<penga-accounts></penga-accounts>`
              : this.currentView === 'transactions'
              ? html`
                  <penga-transactions
                    @open-transaction-modal="${this.handleOpenCreateModal}"
                    @edit-transaction="${this.handleEditTransaction}"
                  ></penga-transactions>
                `
              : this.currentView === 'reconciliation'
              ? html`
                  <penga-transactions
                    .reconciliationMode="${true}"
                    @open-transaction-modal="${this.handleOpenCreateModal}"
                    @edit-transaction="${this.handleEditTransaction}"
                  ></penga-transactions>
                `
              : this.currentView === 'budgets'
              ? html`<penga-budgets></penga-budgets>`
              : html`
                  <div class="placeholder-view">
                    <div class="placeholder-card">
                      <div class="placeholder-icon">🎯</div>
                      <h3 style="text-transform: capitalize;">${this.currentView} View</h3>
                      <p>
                        This module will be introduced in subsequent roadmap phases.
                      </p>
                      <span class="phase-badge">Scheduled Next</span>
                    </div>
                  </div>
                `}
          </main>
        </div>
      </div>

      <!-- Transaction Split Entry Modal -->
      <transaction-form
        .isOpen="${this.isTransactionModalOpen}"
        .transactionToEdit="${this.editingTransaction}"
        @close="${() => {
          this.isTransactionModalOpen = false;
          this.editingTransaction = null;
        }}"
        @transaction-created="${this.handleTransactionCreated}"
        @transaction-updated="${this.handleTransactionUpdated}"
      ></transaction-form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-app': PengaApp;
  }
}
