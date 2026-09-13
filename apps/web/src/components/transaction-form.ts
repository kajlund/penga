import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { live } from 'lit/directives/live.js';
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
      max-width: 860px;
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
      overflow-x: hidden;
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
      min-width: 0;
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
      box-sizing: border-box;
      transition: all var(--transition-fast);
    }

    .form-select {
      min-width: 0;
      width: 100%;
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
      cursor: pointer;
    }

    .form-select optgroup {
      font-weight: 700;
      color: var(--text-muted);
      background: var(--bg-surface);
    }

    .form-select option {
      font-weight: 500;
      color: var(--text-primary);
      background: var(--bg-surface);
      padding: 0.35rem 0.5rem;
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
      min-width: 0;
      overflow: hidden;
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
      min-width: 0;
    }

    .split-rows-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 0.85rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .split-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 0.75rem;
      background: var(--bg-surface);
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      transition: border-color var(--transition-fast);
      min-width: 0;
    }

    .split-row:hover {
      border-color: var(--border-strong);
    }

    .split-row-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-shrink: 0;
    }

    .amount-input-wrap {
      position: relative;
      display: flex;
      align-items: center;
      width: 140px;
      flex-shrink: 0;
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
      box-sizing: border-box;
      outline: none;
      text-align: right;
    }

    .amount-input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-subtle);
    }

    .btn-auto-balance {
      padding: 0.52rem 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
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
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
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

    @media (max-width: 680px) {
      .modal-backdrop {
        padding: 0.75rem;
      }
      .modal-card {
        max-height: 94vh;
      }
      .modal-header {
        padding: 1rem 1.25rem;
      }
      .modal-body {
        padding: 1.25rem;
        gap: 1rem;
      }
      .grid-2 {
        grid-template-columns: 1fr;
        gap: 0.75rem;
      }
      .split-rows-header {
        display: none;
      }
      .split-row {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }
      .split-row-controls {
        width: 100%;
      }
      .amount-input-wrap {
        flex: 1;
        width: auto;
      }
      .modal-footer {
        padding: 1rem 1.25rem;
        flex-direction: column-reverse;
        gap: 0.75rem;
        align-items: stretch;
      }
      .keyboard-hint {
        justify-content: center;
      }
      .footer-actions {
        width: 100%;
        justify-content: stretch;
      }
      .btn-cancel,
      .btn-submit {
        flex: 1;
        text-align: center;
        justify-content: center;
      }
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

  override updated(changedProps: Map<string, any>) {
    if (changedProps.has('isOpen') && this.isOpen && !changedProps.get('isOpen')) {
      this.fetchAccounts();
      this.resetForm();
    }
  }

  private resetForm(preselectedAccountId?: string) {
    this.transactionDate = new Date().toISOString().slice(0, 10);
    this.payee = '';
    this.note = '';
    this.isCleared = false;
    this.isSubmitting = false;

    const sourceAccId = preselectedAccountId || (this.availableAccounts[0]?.id || '');
    const destAccId = this.availableAccounts.find((a) => a.id !== sourceAccId)?.id || '';

    this.splitRows = [
      { id: `row-1-${Date.now()}`, accountId: sourceAccId, amount: '' },
      { id: `row-2-${Date.now()}`, accountId: destAccId, amount: '' },
    ];
  }

  public open(preselectedAccountId?: string) {
    this.fetchAccounts();
    this.resetForm(preselectedAccountId);
    this.isOpen = true;
    this.requestUpdate();
  }

  public closeModal() {
    this.isOpen = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  // Parses user input string (e.g. "-45.50", "45,50", "100") into integer cents
  private parseCents(val: string | number): number {
    if (typeof val === 'number') return Math.round(val * 100);
    if (!val) return 0;
    let clean = String(val).trim();
    if (clean === '' || clean === '-' || clean === '+') return 0;

    // Handle European comma formatting (e.g. "50,50" -> "50.50", "1.250,50" -> "1250.50")
    if (clean.includes(',') && clean.includes('.')) {
      if (clean.lastIndexOf(',') > clean.lastIndexOf('.')) {
        // "1.250,50": dot is thousands separator, comma is decimal
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else {
        // "1,250.50": comma is thousands separator, dot is decimal
        clean = clean.replace(/,/g, '');
      }
    } else if (clean.includes(',')) {
      // Only commas present: "50,00" -> "50.00"
      clean = clean.replace(',', '.');
    }

    const num = parseFloat(clean);
    if (isNaN(num)) return 0;
    return Math.round(num * 100);
  }

  private formatCentsToDecimal(cents: number): string {
    const rounded = Math.round(cents);
    const isNegative = rounded < 0;
    const abs = Math.abs(rounded);
    const dollars = Math.floor(abs / 100);
    const remainder = abs % 100;
    const decStr = `${dollars}.${remainder.toString().padStart(2, '0')}`;
    return isNegative ? `-${decStr}` : decStr;
  }

  private getNetImbalanceCents(): number {
    return this.splitRows.reduce((sum, r) => sum + this.parseCents(r.amount), 0);
  }

  private getValidationState(): { isValid: boolean; message: string } {
    if (!this.payee.trim()) {
      return { isValid: false, message: 'Please enter a Payee / Entity name' };
    }
    if (!this.transactionDate) {
      return { isValid: false, message: 'Please select a Transaction Date' };
    }
    if (this.splitRows.length < 2) {
      return { isValid: false, message: 'At least 2 split lines are required' };
    }

    const unselectedAccount = this.splitRows.some((r) => !r.accountId);
    if (unselectedAccount) {
      return { isValid: false, message: 'Please select an account for all split lines' };
    }

    const emptyOrZero = this.splitRows.some(
      (r) => !r.amount || this.parseCents(r.amount) === 0
    );
    if (emptyOrZero) {
      return { isValid: false, message: 'Every split row must have a non-zero amount ($0.00 is not allowed)' };
    }

    const netImbalance = this.getNetImbalanceCents();
    if (netImbalance !== 0) {
      const isNeg = netImbalance < 0;
      const formatted = (Math.abs(netImbalance) / 100).toFixed(2);
      return {
        isValid: false,
        message: `Transaction is unbalanced. Remaining to balance: ${isNeg ? '+' : '-'}$${formatted}`,
      };
    }

    return { isValid: true, message: 'Transaction Perfectly Balanced' };
  }

  private canSubmit(): boolean {
    if (this.isSubmitting) return false;
    return this.getValidationState().isValid;
  }

  private addSplitRow() {
    const newId = `row-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    this.splitRows = [
      ...this.splitRows,
      { id: newId, accountId: this.availableAccounts[0]?.id || '', amount: '' },
    ];
  }

  private removeSplitRow(rowId: string) {
    if (this.splitRows.length <= 2) return;
    this.splitRows = this.splitRows.filter((r) => r.id !== rowId);
  }

  private autoBalanceRow(targetId: string) {
    let otherSumCents = 0;
    for (const row of this.splitRows) {
      if (row.id !== targetId) {
        otherSumCents += this.parseCents(row.amount);
      }
    }

    // Needed to balance = - otherSumCents
    const requiredCents = -otherSumCents;
    this.splitRows = this.splitRows.map((row) => {
      if (row.id === targetId) {
        return { ...row, amount: this.formatCentsToDecimal(requiredCents) };
      }
      return row;
    });
  }

  private handleAmountInput(rowId: string, value: string) {
    this.splitRows = this.splitRows.map((row) => {
      if (row.id === rowId) {
        return { ...row, amount: value };
      }
      return row;
    });
  }

  private handleAccountSelect(rowId: string, accountId: string) {
    this.splitRows = this.splitRows.map((row) => {
      if (row.id === rowId) {
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

  private renderAccountOptions(selectedId: string) {
    const groups: { label: string; type: string; icon: string }[] = [
      { label: 'Assets', type: 'ASSET', icon: '🏦' },
      { label: 'Liabilities (Debt & Cards)', type: 'LIABILITY', icon: '💳' },
      { label: 'Income', type: 'INCOME', icon: '💼' },
      { label: 'Expenses', type: 'EXPENSE', icon: '🏷️' },
    ];

    const renderedTypeSet = new Set(groups.map((g) => g.type));
    const others = this.availableAccounts.filter((a) => !renderedTypeSet.has(a.type));

    return html`
      ${groups.map((g) => {
        const groupAccounts = this.availableAccounts.filter((a) => a.type === g.type);
        if (groupAccounts.length === 0) return nothing;

        return html`
          <optgroup label="${g.label}">
            ${groupAccounts.map(
              (acc) => html`
                <option value="${acc.id}" ?selected="${acc.id === selectedId}">
                  ${acc.icon || g.icon} ${acc.name}
                </option>
              `
            )}
          </optgroup>
        `;
      })}
      ${others.length > 0
        ? html`
            <optgroup label="Other Accounts">
              ${others.map(
                (acc) => html`
                  <option value="${acc.id}" ?selected="${acc.id === selectedId}">
                    ${acc.icon || '📁'} ${acc.name}
                  </option>
                `
              )}
            </optgroup>
          `
        : nothing}
    `;
  }

  override render() {
    if (!this.isOpen) return nothing;

    const validation = this.getValidationState();
    const netImbalance = this.getNetImbalanceCents();

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
              <div class="balance-banner ${validation.isValid ? 'balanced' : 'unbalanced'}">
                <div class="balance-indicator">
                  <span>${validation.isValid ? '✓' : '⚠️'}</span>
                  <span>${validation.message}</span>
                </div>
                <div class="balance-badge">
                  ${validation.isValid
                    ? '$0.00'
                    : netImbalance === 0
                    ? 'Incomplete'
                    : `Remaining: ${netImbalance > 0 ? '-' : '+'}$${(Math.abs(netImbalance) / 100).toFixed(2)}`}
                </div>
              </div>

              <!-- Visual allocation ratio bar -->
              ${this.renderRatioBar()}

              <!-- Split rows list -->
              <div class="split-rows-list">
                <div class="split-rows-header">
                  <span>Account / Category</span>
                  <span>Amount & Actions</span>
                </div>

                ${repeat(
                  this.splitRows,
                  (row) => row.id,
                  (row) => html`
                    <div class="split-row">
                      <!-- Account Select -->
                      <select
                        class="form-select"
                        .value="${row.accountId}"
                        @change="${(e: any) => this.handleAccountSelect(row.id, e.target.value)}"
                        aria-label="Split account selection"
                      >
                        <option value="" disabled ?selected="${!row.accountId}">Select Account / Category</option>
                        ${this.renderAccountOptions(row.accountId)}
                      </select>

                      <!-- Amount input & Actions Controls -->
                      <div class="split-row-controls">
                        <div class="amount-input-wrap">
                          <span class="currency-symbol">$</span>
                          <input
                            type="text"
                            class="amount-input"
                            placeholder="0.00"
                            .value="${live(row.amount)}"
                            @input="${(e: any) => this.handleAmountInput(row.id, e.target.value)}"
                            aria-label="Split amount"
                          />
                        </div>

                        <!-- Auto-balance helper button -->
                        <button
                          type="button"
                          class="btn-auto-balance"
                          @click="${() => this.autoBalanceRow(row.id)}"
                          title="Auto-fill remainder needed to balance"
                        >
                          Balance
                        </button>

                        <!-- Remove row button -->
                        <button
                          type="button"
                          class="btn-remove-row"
                          @click="${() => this.removeSplitRow(row.id)}"
                          ?disabled="${this.splitRows.length <= 2}"
                          title="${this.splitRows.length <= 2 ? 'At least 2 splits are required' : 'Remove split line'}"
                          aria-label="Remove split row"
                        >
                          ✕
                        </button>
                      </div>
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
                title="${validation.isValid ? 'Record transaction (Ctrl+Enter)' : validation.message}"
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
