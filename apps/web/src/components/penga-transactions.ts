import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { TransactionWithSplits } from '@penga/shared';

@customElement('penga-transactions')
export class PengaTransactions extends LitElement {
  static override styles = css`
    :host {
      display: block;
      padding: 2rem 2.5rem 4rem;
      max-width: 1200px;
      margin: 0 auto;
      font-family: var(--font-sans);
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-title h2 {
      margin: 0 0 0.25rem 0;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--text-primary);
    }

    .header-title p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
    }

    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.65rem 1.25rem;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: #ffffff;
      border: 1px solid transparent;
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 8px rgba(5, 150, 105, 0.25);
      transition: all var(--transition-fast);
    }

    .btn-primary:hover {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.35);
    }

    /* Ledger List */
    .ledger-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      overflow: hidden;
    }

    .ledger-header {
      display: grid;
      grid-template-columns: 120px 1fr 140px 100px;
      padding: 0.85rem 1.5rem;
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
    }

    .transaction-row {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--border-subtle);
      transition: background-color var(--transition-fast);
    }

    .transaction-row:hover {
      background: var(--bg-subtle);
    }

    .tx-main {
      display: grid;
      grid-template-columns: 120px 1fr 140px 100px;
      align-items: center;
      padding: 1rem 1.5rem;
      gap: 1rem;
    }

    .tx-date {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    .tx-payee-group {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
      min-width: 0;
    }

    .tx-payee {
      font-size: 0.95rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tx-note {
      font-size: 0.78rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .cleared-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.25rem 0.55rem;
      border-radius: var(--radius-full);
      font-size: 0.72rem;
      font-weight: 600;
      width: fit-content;
    }

    .cleared-badge.cleared {
      background: var(--color-primary-subtle);
      color: var(--color-primary-text);
      border: 1px solid var(--color-primary-border);
    }

    .cleared-badge.pending {
      background: var(--bg-muted);
      color: var(--text-muted);
      border: 1px solid var(--border-subtle);
    }

    .splits-summary {
      font-size: 0.78rem;
      color: var(--text-muted);
      text-align: right;
    }

    /* Nested Splits Accordion */
    .splits-detail-list {
      padding: 0.5rem 1.5rem 1rem 3.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      background: rgba(0, 0, 0, 0.02);
      border-top: 1px dashed var(--border-subtle);
    }

    .split-detail-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.825rem;
      color: var(--text-secondary);
      padding: 0.25rem 0;
    }

    .split-account-tag {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
    }

    .split-amount {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      font-weight: 600;
    }

    .split-amount.negative {
      color: var(--color-expense);
    }

    .split-amount.positive {
      color: var(--color-primary);
    }

    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--text-muted);
    }

    .loading-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--text-secondary);
    }
  `;

  @state()
  private transactions: TransactionWithSplits[] = [];

  @state()
  private isLoading = true;

  @state()
  private errorMessage: string | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.fetchTransactions();
  }

  public async fetchTransactions() {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const res = await fetch('/api/transactions');
      if (!res.ok) {
        throw new Error(`Failed to load transactions: ${res.statusText}`);
      }
      const json = await res.json();
      this.transactions = json.data || [];
    } catch (err: any) {
      this.errorMessage = err.message || 'Error fetching transactions';
    } finally {
      this.isLoading = false;
    }
  }

  private handleOpenCreate() {
    this.dispatchEvent(new CustomEvent('open-transaction-modal', { bubbles: true, composed: true }));
  }

  private formatCents(cents: number): string {
    const isNeg = cents < 0;
    const abs = Math.abs(cents);
    const dollars = (abs / 100).toFixed(2);
    return isNeg ? `-$${dollars}` : `+$${dollars}`;
  }

  override render() {
    return html`
      <div class="page-header">
        <div class="header-title">
          <h2>Transaction Ledger</h2>
          <p>Double-entry balanced events with integer cents precision</p>
        </div>
        <button class="btn-primary" @click="${this.handleOpenCreate}">
          <span>+</span>
          <span>Record Transaction</span>
        </button>
      </div>

      <div class="ledger-card">
        <div class="ledger-header">
          <span>Date</span>
          <span>Payee & Notes</span>
          <span>Reconciliation</span>
          <span style="text-align: right;">Lines</span>
        </div>

        ${this.isLoading
          ? html`<div class="loading-state">Loading transactions from PostgreSQL...</div>`
          : this.errorMessage
          ? html`<div class="empty-state"><h4>Error Loading Transactions</h4><p>${this.errorMessage}</p></div>`
          : this.transactions.length === 0
          ? html`
              <div class="empty-state">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💸</div>
                <h4 style="margin: 0 0 0.5rem; color: var(--text-primary);">No Transactions Recorded</h4>
                <p style="margin: 0 0 1.5rem;">Record your first balanced split transaction.</p>
                <button class="btn-primary" @click="${this.handleOpenCreate}">
                  <span>+ Record Transaction</span>
                </button>
              </div>
            `
          : html`
              <div class="transactions-list">
                ${this.transactions.map(
                  (tx) => html`
                    <div class="transaction-row">
                      <div class="tx-main">
                        <span class="tx-date">${tx.transactionDate}</span>
                        <div class="tx-payee-group">
                          <span class="tx-payee">${tx.payee || 'Unnamed Event'}</span>
                          ${tx.note ? html`<span class="tx-note">${tx.note}</span>` : nothing}
                        </div>
                        <div>
                          <span class="cleared-badge ${tx.isCleared ? 'cleared' : 'pending'}">
                            <span>${tx.isCleared ? '✓' : '○'}</span>
                            <span>${tx.isCleared ? 'Cleared' : 'Uncleared'}</span>
                          </span>
                        </div>
                        <span class="splits-summary">${tx.splits.length} splits</span>
                      </div>

                      <!-- Sub-splits details -->
                      <div class="splits-detail-list">
                        ${tx.splits.map(
                          (s) => html`
                            <div class="split-detail-line">
                              <span class="split-account-tag">
                                <span>${s.accountIcon || '📁'}</span>
                                <strong>${s.accountName || 'Account'}</strong>
                                <span style="font-size: 0.7rem; color: var(--text-muted);">(${s.accountType})</span>
                              </span>
                              <span class="split-amount ${s.amountCents < 0 ? 'negative' : 'positive'}">
                                ${this.formatCents(s.amountCents)}
                              </span>
                            </div>
                          `
                        )}
                      </div>
                    </div>
                  `
                )}
              </div>
            `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-transactions': PengaTransactions;
  }
}
