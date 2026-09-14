import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TransactionWithSplits, Account } from '@penga/shared';

@customElement('penga-transactions')
export class PengaTransactions extends LitElement {
  static override styles = css`
    :host {
      display: block;
      padding: 2rem 2.5rem 4rem;
      max-width: 1240px;
      margin: 0 auto;
      font-family: var(--font-sans);
    }

    .page-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.75rem;
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

    .header-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
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

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.6rem 1rem;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-subtle);
      font-family: var(--font-sans);
      font-size: 0.85rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-secondary:hover {
      background: var(--bg-subtle);
      border-color: var(--border-default);
    }

    /* Reconciliation Stats & Controls Banner */
    .reconciliation-banner {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.25rem 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1.25rem;
    }

    .reconciliation-stats {
      display: flex;
      align-items: center;
      gap: 2rem;
      flex-wrap: wrap;
    }

    .stat-box {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }

    .stat-label {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .stat-value {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .stat-value.cleared {
      color: var(--color-primary-text);
    }

    .stat-value.pending {
      color: var(--color-warning-text, #d97706);
    }

    /* Filters Bar */
    .filters-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .filter-pills {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--bg-subtle);
      padding: 0.25rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
    }

    .filter-pill {
      padding: 0.4rem 0.85rem;
      border-radius: var(--radius-sm);
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.825rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .filter-pill:hover {
      color: var(--text-primary);
    }

    .filter-pill.active {
      background: var(--bg-surface);
      color: var(--text-primary);
      font-weight: 600;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .account-select {
      padding: 0.5rem 0.85rem;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.85rem;
      outline: none;
      transition: border-color var(--transition-fast);
      cursor: pointer;
    }

    .account-select:focus {
      border-color: var(--color-primary);
    }

    /* Ledger List */
    .ledger-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
      overflow: hidden;
    }

    .ledger-header {
      display: grid;
      grid-template-columns: 80px 110px 1fr 140px 100px 90px;
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

    .transaction-row:last-child {
      border-bottom: none;
    }

    .transaction-row:hover {
      background: var(--bg-subtle);
    }

    .tx-main {
      display: grid;
      grid-template-columns: 80px 110px 1fr 140px 100px 90px;
      align-items: center;
      padding: 0.95rem 1.5rem;
      gap: 0.75rem;
    }

    /* Intraday reorder controls */
    .reorder-controls {
      display: flex;
      align-items: center;
      gap: 0.2rem;
    }

    .btn-reorder {
      width: 26px;
      height: 26px;
      padding: 0;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      transition: all var(--transition-fast);
    }

    .btn-reorder:hover:not(:disabled) {
      background: var(--bg-muted);
      color: var(--text-primary);
      border-color: var(--border-default);
    }

    .btn-reorder:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .sort-indicator {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--text-muted);
      min-width: 14px;
      text-align: center;
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

    /* Interactive Cleared Toggle Button */
    .cleared-toggle {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      width: fit-content;
      cursor: pointer;
      border: 1px solid transparent;
      transition: all var(--transition-fast);
      outline: none;
      user-select: none;
    }

    .cleared-toggle.cleared {
      background: var(--color-primary-subtle);
      color: var(--color-primary-text);
      border-color: var(--color-primary-border);
    }

    .cleared-toggle.cleared:hover {
      background: var(--color-primary);
      color: #ffffff;
      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.25);
    }

    .cleared-toggle.pending {
      background: var(--bg-muted);
      color: var(--text-muted);
      border-color: var(--border-subtle);
    }

    .cleared-toggle.pending:hover {
      background: var(--color-primary-subtle);
      color: var(--color-primary-text);
      border-color: var(--color-primary);
    }

    .cleared-icon {
      font-size: 0.85rem;
      line-height: 1;
    }

    .splits-summary {
      font-size: 0.8rem;
      color: var(--text-muted);
      text-align: right;
      font-family: var(--font-mono);
    }

    .tx-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    .btn-edit-tx {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
    }

    .btn-edit-tx:hover {
      background: var(--color-primary-subtle);
      border-color: var(--color-primary-border);
      color: var(--color-primary-text);
      transform: translateY(-1px);
    }

    /* Nested Splits Detail */
    .splits-detail-list {
      padding: 0.65rem 1.5rem 1rem 4rem;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      background: rgba(0, 0, 0, 0.015);
      border-top: 1px dashed var(--border-subtle);
    }

    .split-detail-line {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.825rem;
      color: var(--text-secondary);
      padding: 0.2rem 0;
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
      color: var(--color-expense-text);
    }

    .split-amount.positive {
      color: var(--color-primary-text);
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

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid var(--border-subtle);
      border-radius: 50%;
      border-top-color: var(--color-primary);
      animation: spin 0.8s linear infinite;
      margin-bottom: 0.5rem;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;

  @property({ type: Boolean })
  reconciliationMode = false;

  @state()
  private transactions: TransactionWithSplits[] = [];

  @state()
  private accounts: Account[] = [];

  @state()
  private selectedFilter: 'ALL' | 'UNCLEARED' | 'CLEARED' = 'ALL';

  @state()
  private selectedAccountId = '';

  @state()
  private isLoading = true;

  @state()
  private errorMessage: string | null = null;

  @state()
  private updatingTxId: string | null = null;

  override connectedCallback() {
    super.connectedCallback();
    if (this.reconciliationMode) {
      this.selectedFilter = 'ALL';
    }
    this.fetchData();
  }

  public async fetchData() {
    await Promise.all([this.fetchTransactions(), this.fetchAccounts()]);
  }

  public async fetchAccounts() {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const json = await res.json();
        this.accounts = json.data || [];
      }
    } catch {
      // Non-blocking
    }
  }

  public async fetchTransactions() {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const url = this.selectedAccountId
        ? `/api/transactions?accountId=${encodeURIComponent(this.selectedAccountId)}`
        : '/api/transactions';

      const res = await fetch(url);
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

  private handleAccountFilterChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.selectedAccountId = target.value;
    this.fetchTransactions();
  }

  public async toggleCleared(tx: TransactionWithSplits) {
    const newCleared = !tx.isCleared;
    this.updatingTxId = tx.id;

    // Optimistic UI update
    this.transactions = this.transactions.map((t) =>
      t.id === tx.id ? { ...t, isCleared: newCleared } : t
    );

    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCleared: newCleared }),
      });

      if (!res.ok) {
        throw new Error('Failed to update cleared status');
      }

      const json = await res.json();
      if (json.data) {
        this.transactions = this.transactions.map((t) =>
          t.id === tx.id ? { ...t, isCleared: json.data.isCleared } : t
        );
      }
    } catch (err) {
      // Rollback on failure
      this.transactions = this.transactions.map((t) =>
        t.id === tx.id ? { ...t, isCleared: !newCleared } : t
      );
      console.error('Error toggling transaction reconciliation:', err);
    } finally {
      this.updatingTxId = null;
    }
  }

  public async moveTransaction(tx: TransactionWithSplits, direction: 'up' | 'down') {
    // Find all transactions on the same date
    const sameDateTxs = this.transactions.filter(
      (t) => t.transactionDate === tx.transactionDate
    );

    if (sameDateTxs.length < 2) return;

    const currentIndex = sameDateTxs.findIndex((t) => t.id === tx.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sameDateTxs.length) return;

    const targetTx = sameDateTxs[targetIndex];

    // Swap sort orders
    const currentOrder = tx.sortOrder;
    const targetOrder = targetTx.sortOrder;

    const newCurrentOrder = targetOrder;
    const newTargetOrder = currentOrder === targetOrder
      ? (direction === 'up' ? currentOrder - 1 : currentOrder + 1)
      : currentOrder;

    // Optimistic reorder
    const updatedMap = new Map<string, number>();
    updatedMap.set(tx.id, newCurrentOrder);
    updatedMap.set(targetTx.id, newTargetOrder);

    this.transactions = this.transactions
      .map((t) => {
        if (updatedMap.has(t.id)) {
          return { ...t, sortOrder: updatedMap.get(t.id)! };
        }
        return t;
      })
      .sort((a, b) => {
        if (a.transactionDate !== b.transactionDate) {
          return b.transactionDate.localeCompare(a.transactionDate);
        }
        return a.sortOrder - b.sortOrder;
      });

    // Call backend batch reorder API
    try {
      await fetch('/api/transactions/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [
            { id: tx.id, sortOrder: newCurrentOrder },
            { id: targetTx.id, sortOrder: newTargetOrder },
          ],
        }),
      });
    } catch (err) {
      console.error('Failed to persist transaction reordering:', err);
      this.fetchTransactions();
    }
  }

  private handleOpenCreate() {
    this.dispatchEvent(new CustomEvent('open-transaction-modal', { bubbles: true, composed: true }));
  }

  private handleEditTransaction(tx: TransactionWithSplits) {
    this.dispatchEvent(
      new CustomEvent('edit-transaction', {
        detail: { transaction: tx },
        bubbles: true,
        composed: true,
      })
    );
  }

  private formatCents(cents: number): string {
    const isNeg = cents < 0;
    const abs = Math.abs(cents);
    const dollars = (abs / 100).toFixed(2);
    return isNeg ? `-$${dollars}` : `+$${dollars}`;
  }

  override render() {
    // Filter transactions based on selected filter
    const filteredTxs = this.transactions.filter((tx) => {
      if (this.selectedFilter === 'CLEARED') return tx.isCleared;
      if (this.selectedFilter === 'UNCLEARED') return !tx.isCleared;
      return true;
    });

    // Compute reconciliation totals
    const clearedCount = this.transactions.filter((t) => t.isCleared).length;
    const unclearedCount = this.transactions.filter((t) => !t.isCleared).length;

    return html`
      <div class="page-header">
        <div class="header-title">
          <h2>${this.reconciliationMode ? 'Statement Reconciliation' : 'Transaction Ledger'}</h2>
          <p>
            ${this.reconciliationMode
              ? 'Match line-by-line against physical bank statements and verify cleared balances'
              : 'Double-entry balanced events with integer cents precision and intraday sorting'}
          </p>
        </div>
        <div class="header-actions">
          <button class="btn-secondary" @click="${this.fetchData}" title="Refresh transactions">
            <span>🔄</span> Refresh
          </button>
          <button class="btn-primary" @click="${this.handleOpenCreate}">
            <span>+</span> Record Transaction
          </button>
        </div>
      </div>

      <!-- Reconciliation Status Banner -->
      <div class="reconciliation-banner">
        <div class="reconciliation-stats">
          <div class="stat-box">
            <span class="stat-label">Total Recorded</span>
            <span class="stat-value">${this.transactions.length} events</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Cleared with Bank</span>
            <span class="stat-value cleared">✓ ${clearedCount} reconciled</span>
          </div>
          <div class="stat-box">
            <span class="stat-label">Uncleared / Pending</span>
            <span class="stat-value pending">○ ${unclearedCount} pending</span>
          </div>
        </div>

        <div>
          <select
            class="account-select"
            .value="${this.selectedAccountId}"
            @change="${this.handleAccountFilterChange}"
            aria-label="Filter by account"
          >
            <option value="">All Accounts</option>
            ${this.accounts.map(
              (acc) => html`
                <option value="${acc.id}">
                  ${acc.icon || '📁'} ${acc.name} (${acc.type})
                </option>
              `
            )}
          </select>
        </div>
      </div>

      <!-- Filters Row -->
      <div class="filters-bar">
        <div class="filter-pills">
          <button
            class="filter-pill ${this.selectedFilter === 'ALL' ? 'active' : ''}"
            @click="${() => (this.selectedFilter = 'ALL')}"
          >
            All (${this.transactions.length})
          </button>
          <button
            class="filter-pill ${this.selectedFilter === 'UNCLEARED' ? 'active' : ''}"
            @click="${() => (this.selectedFilter = 'UNCLEARED')}"
          >
            Pending / Uncleared (${unclearedCount})
          </button>
          <button
            class="filter-pill ${this.selectedFilter === 'CLEARED' ? 'active' : ''}"
            @click="${() => (this.selectedFilter = 'CLEARED')}"
          >
            Cleared (${clearedCount})
          </button>
        </div>

        <div style="font-size: 0.8rem; color: var(--text-muted);">
          Tip: Click any status badge to toggle cleared state
        </div>
      </div>

      <!-- Ledger Table -->
      <div class="ledger-card">
        <div class="ledger-header">
          <span>Sort</span>
          <span>Date</span>
          <span>Payee & Notes</span>
          <span>Reconciliation</span>
          <span style="text-align: right;">Lines</span>
          <span style="text-align: right;">Actions</span>
        </div>

        ${this.isLoading
          ? html`
              <div class="loading-state">
                <div class="spinner"></div>
                <p>Loading transactions from PostgreSQL...</p>
              </div>
            `
          : this.errorMessage
          ? html`
              <div class="empty-state">
                <h4>Error Loading Transactions</h4>
                <p>${this.errorMessage}</p>
                <button class="btn-secondary" @click="${this.fetchData}">Retry</button>
              </div>
            `
          : filteredTxs.length === 0
          ? html`
              <div class="empty-state">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">💸</div>
                <h4 style="margin: 0 0 0.5rem; color: var(--text-primary);">No Matching Transactions</h4>
                <p style="margin: 0 0 1.5rem;">No transactions match the selected filters.</p>
                <button class="btn-primary" @click="${this.handleOpenCreate}">
                  <span>+ Record Transaction</span>
                </button>
              </div>
            `
          : html`
              <div class="transactions-list">
                ${filteredTxs.map((tx) => {
                  const sameDateTxs = this.transactions.filter(
                    (t) => t.transactionDate === tx.transactionDate
                  );
                  const canReorder = sameDateTxs.length > 1;
                  const sameDateIndex = sameDateTxs.findIndex((t) => t.id === tx.id);
                  const isFirst = sameDateIndex === 0;
                  const isLast = sameDateIndex === sameDateTxs.length - 1;

                  return html`
                    <div class="transaction-row">
                      <div class="tx-main">
                        <!-- Intraday sort controls -->
                        <div class="reorder-controls">
                          <button
                            class="btn-reorder"
                            title="Move transaction earlier on this date"
                            ?disabled="${!canReorder || isFirst}"
                            @click="${() => this.moveTransaction(tx, 'up')}"
                          >
                            ▲
                          </button>
                          <button
                            class="btn-reorder"
                            title="Move transaction later on this date"
                            ?disabled="${!canReorder || isLast}"
                            @click="${() => this.moveTransaction(tx, 'down')}"
                          >
                            ▼
                          </button>
                        </div>

                        <span class="tx-date">${tx.transactionDate}</span>

                        <div class="tx-payee-group">
                          <span class="tx-payee">${tx.payee || 'Unnamed Event'}</span>
                          ${tx.note ? html`<span class="tx-note">${tx.note}</span>` : nothing}
                        </div>

                        <!-- One-click Reconciliation Toggle -->
                        <div>
                          <button
                            type="button"
                            class="cleared-toggle ${tx.isCleared ? 'cleared' : 'pending'}"
                            @click="${() => this.toggleCleared(tx)}"
                            title="Click to toggle cleared status for bank reconciliation"
                            ?disabled="${this.updatingTxId === tx.id}"
                          >
                            <span class="cleared-icon">${tx.isCleared ? '✓' : '○'}</span>
                            <span>${tx.isCleared ? 'Cleared' : 'Uncleared'}</span>
                          </button>
                        </div>

                        <span class="splits-summary">${tx.splits.length} splits</span>

                        <div class="tx-actions">
                          <button
                            type="button"
                            class="btn-edit-tx"
                            @click="${() => this.handleEditTransaction(tx)}"
                            title="Edit transaction and splits"
                          >
                            <span>✏️</span>
                            <span>Edit</span>
                          </button>
                        </div>
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
                  `;
                })}
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
