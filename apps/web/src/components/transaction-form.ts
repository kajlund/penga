import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { Account, CreateTransactionInput } from '@penga/shared';

interface SplitRowState {
  id: string;
  accountId: string;
  amount: string; // user-typed decimal representation, e.g. "-45.50" or "45.50"
}

@customElement('transaction-form')
export class TransactionForm extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }

    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      animation: backdropFadeIn 0.18s ease-out;
    }

    @keyframes backdropFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 780px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      animation: cardPopIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    @keyframes cardPopIn {
      from {
        opacity: 0;
        transform: scale(0.96) translateY(8px);
      }
      to {
        opacity: 1;
        transform: scale(1) translateY(0);
      }
    }

    /* Modal Header */
    .modal-header {
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-surface);
    }

    .header-info h3 {
      margin: 0 0 0.2rem 0;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--text-primary);
    }

    .header-info p {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted);
    }

    .close-btn {
      background: transparent;
      border: none;
      font-size: 1.3rem;
      color: var(--text-muted);
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .close-btn:hover {
      background: var(--bg-subtle);
      color: var(--text-primary);
    }

    /* Modal Form Body */
    .modal-body {
      padding: 1.5rem 1.75rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.4rem;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .form-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .form-input,
    .form-select {
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.9rem;
      outline: none;
      transition: all var(--transition-fast);
    }

    .form-input:focus,
    .form-select:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-subtle);
    }

    .checkbox-label {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
      cursor: pointer;
      margin-top: 0.35rem;
      user-select: none;
    }

    /* Splits Ledger Section */
    .splits-section {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .splits-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .splits-title {
      font-size: 0.825rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Balance Status Banner */
    .balance-banner {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: 0.85rem;
      font-weight: 600;
      transition: all var(--transition-fast);
    }

    .balance-banner.balanced {
      background: var(--color-primary-subtle);
      border: 1px solid var(--color-primary-border);
      color: var(--color-primary-text);
    }

    .balance-banner.unbalanced {
      background: var(--color-expense-bg);
      border: 1px solid var(--color-expense-border);
      color: var(--color-expense);
    }

    .balance-indicator {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .balance-badge {
      font-family: var(--font-mono);
      font-size: 0.95rem;
      letter-spacing: -0.02em;
    }

    /* Ratio Progress Bar */
    .ratio-bar-container {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .ratio-bar {
      height: 8px;
      width: 100%;
      border-radius: var(--radius-full);
      background: var(--bg-muted);
      display: flex;
      overflow: hidden;
    }

    .ratio-segment {
      height: 100%;
      transition: width var(--transition-normal);
    }

    .ratio-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
    }

    .legend-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
    }

    /* Split Rows */
    .split-rows-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .split-row {
      display: grid;
      grid-template-columns: 1fr 140px auto auto;
      align-items: center;
      gap: 0.65rem;
      background: var(--bg-surface);
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      transition: border-color var(--transition-fast);
    }

    .split-row:hover {
      border-color: var(--border-strong);
    }

    .amount-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }

    .currency-symbol {
      position: absolute;
      left: 0.65rem;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 0.85rem;
      pointer-events: none;
    }

    .amount-input {
      padding: 0.55rem 0.65rem 0.55rem 1.4rem;
      border-radius: var(--radius-sm);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: var(--font-mono);
      font-size: 0.9rem;
      font-weight: 600;
      width: 100%;
      outline: none;
      text-align: right;
    }

    .amount-input:focus {
      border-color: var(--color-primary);
    }

    .btn-auto-balance {
      padding: 0.45rem 0.65rem;
      border-radius: var(--radius-sm);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all var(--transition-fast);
    }

    .btn-auto-balance:hover {
      background: var(--color-primary-subtle);
      color: var(--color-primary-text);
      border-color: var(--color-primary-border);
    }

    .btn-remove-row {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.35rem;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      transition: all var(--transition-fast);
    }

    .btn-remove-row:hover:not(:disabled) {
      color: var(--color-expense);
      background: var(--color-expense-bg);
    }

    .btn-remove-row:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .btn-add-split {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      padding: 0.5rem 0.85rem;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      border: 1px dashed var(--border-strong);
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-add-split:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
      border-color: var(--color-primary);
    }

    /* Modal Footer */
    .modal-footer {
      padding: 1.15rem 1.75rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-surface);
    }

    .keyboard-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.4rem;
    }

    .kbd {
      padding: 0.15rem 0.4rem;
      border-radius: 4px;
      background: var(--bg-subtle);
      border: 1px solid var(--border-strong);
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--text-secondary);
    }

    .footer-actions {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .btn-cancel {
      padding: 0.65rem 1.15rem;
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-cancel:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .btn-submit {
      padding: 0.65rem 1.4rem;
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
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }

    .btn-submit:hover:not(:disabled) {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(5, 150, 105, 0.35);
    }

    .btn-submit:disabled {
      opacity: 0.45;
      cursor: not-allowed;
      box-shadow: none;
      transform: none;
    }
  `;

  @property({ type: Boolean })
  isOpen = false;

  @state()
  private transactionDate = new Date().toISOString().slice(0, 10);

  @state()
  private payee = '';

  @state()
  private note = '';

  @state()
  private isCleared = false;

  @state()
  private availableAccounts: Account[] = [];

  @state()
  private splitRows: SplitRowState[] = [
    { id: '1', accountId: '', amount: '-0.00' },
    { id: '2', accountId: '', amount: '0.00' },
  ];

  @state()
  private isSubmitting = false;

  override connectedCallback() {
    super.connectedCallback();
    this.fetchAccounts();
    window.addEventListener('keydown', this.handleGlobalKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
  }

  private handleGlobalKeyDown = (e: KeyboardEvent) => {
    if (!this.isOpen) return;

    if (e.key === 'Escape') {
      this.closeModal();
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (this.canSubmit()) {
        this.submitTransaction();
      }
    } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      this.addSplitRow();
    }
  };

  async fetchAccounts() {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const json = await res.json();
        this.availableAccounts = json.data || [];
        this.autoPopulateInitialAccounts();
      }
    } catch (err) {
      console.warn('Could not load accounts list for transaction form', err);
    }
  }

  private autoPopulateInitialAccounts() {
    if (this.availableAccounts.length >= 2 && !this.splitRows[0].accountId) {
      const asset = this.availableAccounts.find((a) => a.type === 'ASSET');
      const expenseOrOther = this.availableAccounts.find(
        (a) => a.type === 'EXPENSE' || (a.id !== asset?.id)
      );

      this.splitRows = [
        { id: '1', accountId: asset ? asset.id : this.availableAccounts[0].id, amount: '' },
        { id: '2', accountId: expenseOrOther ? expenseOrOther.id : this.availableAccounts[1].id, amount: '' },
      ];
    }
  }

  public open(preselectedAccountId?: string) {
    this.transactionDate = new Date().toISOString().slice(0, 10);
    this.payee = '';
    this.note = '';
    this.isCleared = false;
    this.isSubmitting = false;

    const sourceAccId = preselectedAccountId || (this.availableAccounts[0]?.id || '');
    const destAccId = this.availableAccounts.find((a) => a.id !== sourceAccId)?.id || '';

    this.splitRows = [
      { id: 'row-1', accountId: sourceAccId, amount: '' },
      { id: 'row-2', accountId: destAccId, amount: '' },
    ];

    this.isOpen = true;
    this.requestUpdate();
  }

  public closeModal() {
    this.isOpen = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  // Parses user input string (e.g. "-45.50", "45.5", "100") into integer cents
  private parseCents(val: string): number {
    if (!val || val.trim() === '' || val === '-' || val === '+') return 0;
    const clean = val.replace(/,/g, '').trim();
    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }

  private formatCentsToDecimal(cents: number): string {
    const isNegative = cents < 0;
    const abs = Math.abs(cents);
    const dollars = Math.floor(abs / 100);
    const remainder = abs % 100;
    const decStr = `${dollars}.${remainder.toString().padStart(2, '0')}`;
    return isNegative ? `-${decStr}` : decStr;
  }

  private getNetImbalanceCents(): number {
    return this.splitRows.reduce((sum, r) => sum + this.parseCents(r.amount), 0);
  }

  private canSubmit(): boolean {
    if (this.isSubmitting) return false;
    if (!this.payee.trim()) return false;
    if (!this.transactionDate) return false;
    if (this.splitRows.length < 2) return false;

    // Must be balanced to exactly 0
    if (this.getNetImbalanceCents() !== 0) return false;

    // All rows must have valid account and non-zero amount
    return this.splitRows.every(
      (r) => Boolean(r.accountId) && this.parseCents(r.amount) !== 0
    );
  }

  private addSplitRow() {
    const newId = `row-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    this.splitRows = [
      ...this.splitRows,
      { id: newId, accountId: this.availableAccounts[0]?.id || '', amount: '' },
    ];
  }

  private removeSplitRow(index: number) {
    if (this.splitRows.length <= 2) return;
    this.splitRows = this.splitRows.filter((_, i) => i !== index);
  }

  private autoBalanceRow(targetIndex: number) {
    let otherSumCents = 0;
    for (let i = 0; i < this.splitRows.length; i++) {
      if (i !== targetIndex) {
        otherSumCents += this.parseCents(this.splitRows[i].amount);
      }
    }

    // Needed to balance = - otherSumCents
    const requiredCents = -otherSumCents;
    this.splitRows = this.splitRows.map((row, i) => {
      if (i === targetIndex) {
        return { ...row, amount: this.formatCentsToDecimal(requiredCents) };
      }
      return row;
    });
  }

  private handleAmountInput(index: number, value: string) {
    this.splitRows = this.splitRows.map((row, i) => {
      if (i === index) {
        return { ...row, amount: value };
      }
      return row;
    });
  }

  private handleAccountSelect(index: number, accountId: string) {
    this.splitRows = this.splitRows.map((row, i) => {
      if (i === index) {
        return { ...row, accountId };
      }
      return row;
    });
  }

  private async submitTransaction() {
    if (!this.canSubmit()) return;
    this.isSubmitting = true;

    try {
      const payload: CreateTransactionInput = {
        transactionDate: this.transactionDate,
        payee: this.payee.trim(),
        note: this.note.trim() || null,
        isCleared: this.isCleared,
        splits: this.splitRows.map((r) => ({
          accountId: r.accountId,
          amountCents: this.parseCents(r.amount),
        })),
      };

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to record transaction');
      }

      const json = await res.json();
      this.dispatchEvent(
        new CustomEvent('transaction-created', {
          detail: { transaction: json.data },
          bubbles: true,
          composed: true,
        })
      );

      this.closeModal();
    } catch (err: any) {
      alert(err.message);
    } finally {
      this.isSubmitting = false;
    }
  }

  // Calculate allocation ratio bar segments
  private renderRatioBar() {
    const absTotal = this.splitRows.reduce((acc, r) => acc + Math.abs(this.parseCents(r.amount)), 0);
    if (absTotal === 0) return nothing;

    return html`
      <div class="ratio-bar-container">
        <div class="ratio-bar">
          ${this.splitRows.map((row) => {
            const cents = Math.abs(this.parseCents(row.amount));
            const pct = (cents / absTotal) * 100;
            const acc = this.availableAccounts.find((a) => a.id === row.accountId);
            const color = acc?.color || '#059669';
            return html`<div class="ratio-segment" style="width: ${pct}%; background-color: ${color};" title="${acc?.name || 'Account'}: ${pct.toFixed(1)}%"></div>`;
          })}
        </div>
        <div class="ratio-legend">
          ${this.splitRows.map((row) => {
            const acc = this.availableAccounts.find((a) => a.id === row.accountId);
            const cents = Math.abs(this.parseCents(row.amount));
            const pct = absTotal > 0 ? ((cents / absTotal) * 100).toFixed(0) : '0';
            return html`
              <span class="legend-item">
                <span class="legend-dot" style="background-color: ${acc?.color || '#64748b'};"></span>
                <span>${acc?.name || 'Unselected'} (${pct}%)</span>
              </span>
            `;
          })}
        </div>
      </div>
    `;
  }

  override render() {
    if (!this.isOpen) return nothing;

    const netImbalance = this.getNetImbalanceCents();
    const isBalanced = netImbalance === 0 && this.splitRows.every((r) => this.parseCents(r.amount) !== 0);

    return html`
      <div
        class="modal-backdrop"
        @click="${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.closeModal();
        }}"
      >
        <div class="modal-card">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-info">
              <h3>Record Transaction</h3>
              <p>Double-entry split ledger with real-time balance validation</p>
            </div>
            <button class="close-btn" @click="${this.closeModal}" aria-label="Close modal">✕</button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Basic info row -->
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Payee / Entity *</label>
                <input
                  type="text"
                  class="form-input"
                  placeholder="e.g. Whole Foods, Landlord, Employer"
                  .value="${this.payee}"
                  @input="${(e: any) => (this.payee = e.target.value)}"
                  required
                  autofocus
                />
              </div>

              <div class="form-group">
                <label class="form-label">Transaction Date *</label>
                <input
                  type="date"
                  class="form-input"
                  .value="${this.transactionDate}"
                  @input="${(e: any) => (this.transactionDate = e.target.value)}"
                  required
                />
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label">Memo / Note (Optional)</label>
                <input
                  type="text"
                  class="form-input"
                  placeholder="e.g. Intraday receipt #4102 or shared dinner"
                  .value="${this.note}"
                  @input="${(e: any) => (this.note = e.target.value)}"
                />
              </div>

              <div class="form-group" style="justify-content: center;">
                <label class="checkbox-label">
                  <input
                    type="checkbox"
                    .checked="${this.isCleared}"
                    @change="${(e: any) => (this.isCleared = e.target.checked)}"
                  />
                  <span>Mark as Cleared (Statement Reconciled)</span>
                </label>
              </div>
            </div>

            <!-- Splits Ledger -->
            <div class="splits-section">
              <div class="splits-header">
                <div class="splits-title">
                  <span>Ledger Splits</span>
                  <span>(${this.splitRows.length} lines)</span>
                </div>
                <button
                  type="button"
                  class="btn-add-split"
                  @click="${this.addSplitRow}"
                  title="Add another split row (Alt+A)"
                >
                  <span>+</span>
                  <span>Add Split</span>
                </button>
              </div>

              <!-- Double-entry balance status banner -->
              <div class="balance-banner ${isBalanced ? 'balanced' : 'unbalanced'}">
                <div class="balance-indicator">
                  <span>${isBalanced ? '✓' : '⚠️'}</span>
                  <span>${isBalanced ? 'Transaction Perfectly Balanced' : 'Unbalanced Transaction'}</span>
                </div>
                <div class="balance-badge">
                  ${isBalanced
                    ? '$0.00'
                    : `Remaining to Balance: ${netImbalance > 0 ? '-' : '+'}$${(Math.abs(netImbalance) / 100).toFixed(2)}`}
                </div>
              </div>

              <!-- Visual allocation ratio bar -->
              ${this.renderRatioBar()}

              <!-- Split rows list -->
              <div class="split-rows-list">
                ${this.splitRows.map(
                  (row, index) => html`
                    <div class="split-row">
                      <!-- Account Select -->
                      <select
                        class="form-select"
                        .value="${row.accountId}"
                        @change="${(e: any) => this.handleAccountSelect(index, e.target.value)}"
                      >
                        <option value="" disabled>Select Account / Category</option>
                        ${this.availableAccounts.map(
                          (acc) => html`
                            <option value="${acc.id}" ?selected="${acc.id === row.accountId}">
                              ${acc.icon || '📁'} ${acc.name} (${acc.type})
                            </option>
                          `
                        )}
                      </select>

                      <!-- Amount input -->
                      <div class="amount-input-wrap">
                        <span class="currency-symbol">$</span>
                        <input
                          type="text"
                          class="amount-input"
                          placeholder="0.00"
                          .value="${row.amount}"
                          @input="${(e: any) => this.handleAmountInput(index, e.target.value)}"
                        />
                      </div>

                      <!-- Auto-balance helper button -->
                      <button
                        type="button"
                        class="btn-auto-balance"
                        @click="${() => this.autoBalanceRow(index)}"
                        title="Auto-fill remainder needed to balance"
                      >
                        Balance
                      </button>

                      <!-- Remove row button -->
                      <button
                        type="button"
                        class="btn-remove-row"
                        @click="${() => this.removeSplitRow(index)}"
                        ?disabled="${this.splitRows.length <= 2}"
                        title="${this.splitRows.length <= 2 ? 'At least 2 splits are required' : 'Remove split line'}"
                      >
                        ✕
                      </button>
                    </div>
                  `
                )}
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="modal-footer">
            <div class="keyboard-hint">
              <span>Shortcut:</span>
              <span class="kbd">Ctrl</span>+<span class="kbd">Enter</span>
              <span>to record</span>
            </div>

            <div class="footer-actions">
              <button type="button" class="btn-cancel" @click="${this.closeModal}">
                Cancel
              </button>
              <button
                type="button"
                class="btn-submit"
                @click="${this.submitTransaction}"
                ?disabled="${!this.canSubmit()}"
              >
                ${this.isSubmitting ? 'Recording...' : 'Record Transaction'}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'transaction-form': TransactionForm;
  }
}
