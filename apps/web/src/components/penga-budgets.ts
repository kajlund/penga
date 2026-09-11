import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { MonthlyBudgetReport, BudgetProgressItem, Account } from '@penga/shared';

@customElement('penga-budgets')
export class PengaBudgets extends LitElement {
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

    /* Month Selector Controls */
    .month-selector {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      background: var(--bg-surface);
      padding: 0.35rem 0.5rem;
      border-radius: var(--radius-md);
      border: 1px solid var(--border-subtle);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }

    .month-btn {
      width: 32px;
      height: 32px;
      border-radius: var(--radius-sm);
      border: none;
      background: transparent;
      color: var(--text-secondary);
      font-size: 0.95rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: all var(--transition-fast);
    }

    .month-btn:hover {
      background: var(--bg-subtle);
      color: var(--text-primary);
    }

    .current-month-label {
      font-size: 0.925rem;
      font-weight: 600;
      color: var(--text-primary);
      padding: 0 0.5rem;
      min-width: 140px;
      text-align: center;
    }

    /* Overall Monthly Budget Hero Card */
    .summary-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.75rem 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
    }

    .summary-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .summary-metrics {
      display: flex;
      align-items: center;
      gap: 3rem;
      flex-wrap: wrap;
    }

    .metric-group {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .metric-title {
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
    }

    .metric-num {
      font-family: var(--font-mono);
      font-size: 1.85rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .metric-num.spent {
      color: var(--color-expense-text);
    }

    .metric-num.remaining {
      color: var(--color-primary-text);
    }

    .metric-num.over {
      color: var(--color-expense-text);
    }

    .progress-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.8rem;
      border-radius: var(--radius-full);
      font-size: 0.825rem;
      font-weight: 600;
    }

    .progress-badge.normal {
      background: var(--color-primary-subtle);
      color: var(--color-primary-text);
      border: 1px solid var(--color-primary-border);
    }

    .progress-badge.warning {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
      border: 1px solid rgba(245, 158, 11, 0.25);
    }

    .progress-badge.over {
      background: var(--color-expense-subtle);
      color: var(--color-expense-text);
      border: 1px solid var(--color-expense-border);
    }

    /* Overall Progress Bar */
    .progress-track {
      height: 10px;
      border-radius: var(--radius-full);
      background: var(--bg-muted);
      overflow: hidden;
      margin-bottom: 0.75rem;
    }

    .progress-fill {
      height: 100%;
      border-radius: var(--radius-full);
      transition: width var(--transition-normal);
    }

    .progress-fill.normal {
      background: var(--color-primary);
    }

    .progress-fill.warning {
      background: #f59e0b;
    }

    .progress-fill.over {
      background: var(--color-expense);
    }

    .progress-legend {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 500;
    }

    /* Category Cards Grid */
    .category-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.5rem;
    }

    .category-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      transition: transform var(--transition-fast), border-color var(--transition-fast);
    }

    .category-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-default);
    }

    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .card-account {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .account-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.35rem;
      flex-shrink: 0;
    }

    .account-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .account-subtitle {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 0.15rem;
    }

    .card-actions {
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-icon-action {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      padding: 0.35rem;
      border-radius: var(--radius-sm);
      font-size: 0.85rem;
      transition: all var(--transition-fast);
    }

    .btn-icon-action:hover {
      background: var(--bg-subtle);
      color: var(--text-primary);
    }

    /* Card Progress & Amounts */
    .card-amounts {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
    }

    .amount-spent {
      font-family: var(--font-mono);
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .amount-target {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      color: var(--text-muted);
    }

    .card-progress-bar {
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--bg-muted);
      overflow: hidden;
    }

    .card-remaining {
      display: flex;
      justify-content: space-between;
      font-size: 0.78rem;
      font-weight: 500;
    }

    .card-remaining.positive {
      color: var(--color-primary-text);
    }

    .card-remaining.negative {
      color: var(--color-expense-text);
    }

    /* Adaptive Analytics Box */
    .analytics-box {
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.85rem 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
      font-size: 0.78rem;
    }

    .analytics-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      color: var(--text-secondary);
    }

    .analytics-val {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--text-primary);
    }

    .suggested-box {
      margin-top: 0.2rem;
      padding-top: 0.5rem;
      border-top: 1px dashed var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
    }

    .suggested-label {
      font-size: 0.75rem;
      font-weight: 600;
      color: #3b82f6;
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .btn-adopt {
      background: rgba(59, 130, 246, 0.1);
      color: #2563eb;
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: var(--radius-sm);
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.2rem 0.5rem;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-adopt:hover {
      background: rgba(59, 130, 246, 0.2);
    }

    /* Modal Overlay & Form */
    .modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.15s ease-out;
    }

    .modal-dialog {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 2rem;
      width: 90%;
      max-width: 480px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
    }

    .modal-dialog h3 {
      margin: 0 0 0.5rem;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .modal-dialog p {
      margin: 0 0 1.5rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }

    .form-group {
      margin-bottom: 1.25rem;
    }

    .form-group label {
      display: block;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 0.4rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .form-input,
    .form-select {
      width: 100%;
      box-sizing: border-box;
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      background: var(--bg-base);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.9rem;
      outline: none;
      transition: border-color var(--transition-fast);
    }

    .form-input:focus,
    .form-select:focus {
      border-color: var(--color-primary);
    }

    .modal-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.75rem;
      margin-top: 1.75rem;
    }

    /* States */
    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--text-muted);
      background: var(--bg-surface);
      border-radius: var(--radius-lg);
      border: 1px solid var(--border-subtle);
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

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
  `;

  @state()
  private report: MonthlyBudgetReport | null = null;

  @state()
  private expenseAccounts: Account[] = [];

  @state()
  private currentYear = new Date().getFullYear();

  @state()
  private currentMonth = new Date().getMonth() + 1;

  @state()
  private isLoading = true;

  @state()
  private errorMessage: string | null = null;

  @state()
  private isModalOpen = false;

  @state()
  private modalAccountId = '';

  @state()
  private modalTargetDollars = '';

  @state()
  private modalNotes = '';

  override connectedCallback() {
    super.connectedCallback();
    this.fetchData();
  }

  public async fetchData() {
    await Promise.all([this.fetchBudgetReport(), this.fetchExpenseAccounts()]);
  }

  public async fetchExpenseAccounts() {
    try {
      const res = await fetch('/api/accounts?type=EXPENSE');
      if (res.ok) {
        const json = await res.json();
        this.expenseAccounts = json.data || [];
      }
    } catch {
      // Non-blocking
    }
  }

  public async fetchBudgetReport() {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const res = await fetch(`/api/budgets?year=${this.currentYear}&month=${this.currentMonth}`);
      if (!res.ok) {
        throw new Error(`Failed to load budgets: ${res.statusText}`);
      }
      const json = await res.json();
      this.report = json.data;
    } catch (err: any) {
      this.errorMessage = err.message || 'Failed to load budgets';
    } finally {
      this.isLoading = false;
    }
  }

  private handlePrevMonth() {
    if (this.currentMonth === 1) {
      this.currentMonth = 12;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.fetchBudgetReport();
  }

  private handleNextMonth() {
    if (this.currentMonth === 12) {
      this.currentMonth = 1;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.fetchBudgetReport();
  }

  private handleCurrentMonth() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    this.fetchBudgetReport();
  }

  private formatMonthName(year: number, month: number): string {
    const d = new Date(year, month - 1, 1);
    return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  private formatCents(cents: number): string {
    const abs = Math.abs(cents);
    const dollars = (abs / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return cents < 0 ? `-$${dollars}` : `$${dollars}`;
  }

  private openSetBudgetModal(item?: BudgetProgressItem) {
    if (item) {
      this.modalAccountId = item.accountId;
      this.modalTargetDollars = item.targetAmountCents > 0 ? (item.targetAmountCents / 100).toFixed(2) : '';
      this.modalNotes = item.notes || '';
    } else {
      this.modalAccountId = this.expenseAccounts[0]?.id || '';
      this.modalTargetDollars = '';
      this.modalNotes = '';
    }
    this.isModalOpen = true;
  }

  private closeSetBudgetModal() {
    this.isModalOpen = false;
  }

  private async adoptSuggestedTarget(item: BudgetProgressItem) {
    if (item.suggestedTargetCents <= 0) return;

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: item.accountId,
          targetAmountCents: item.suggestedTargetCents,
          notes: 'Adaptive run-rate baseline',
        }),
      });

      if (!res.ok) throw new Error('Failed to set budget');
      this.fetchBudgetReport();
    } catch (err) {
      console.error('Error adopting suggested target:', err);
    }
  }

  private async handleSaveBudget(e: Event) {
    e.preventDefault();
    const dollars = parseFloat(this.modalTargetDollars);
    if (isNaN(dollars) || dollars < 0) {
      alert('Please enter a valid non-negative target amount');
      return;
    }

    const targetAmountCents = Math.round(dollars * 100);

    try {
      const res = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: this.modalAccountId,
          targetAmountCents,
          notes: this.modalNotes,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to save budget target');
      }

      this.isModalOpen = false;
      this.fetchBudgetReport();
    } catch (err: any) {
      alert(err.message || 'Error saving budget');
    }
  }

  override render() {
    const data = this.report;
    const now = new Date();
    const isTodayMonth = this.currentYear === now.getFullYear() && this.currentMonth === now.getMonth() + 1;

    const progressClass =
      !data || data.overallProgressPercent < 80
        ? 'normal'
        : data.overallProgressPercent <= 100
        ? 'warning'
        : 'over';

    return html`
      <div class="page-header">
        <div class="header-title">
          <h2>Adaptive Budgets & Run-Rates</h2>
          <p>Project recurring costs, smooth seasonal variances, and track monthly spending targets</p>
        </div>

        <div class="header-actions">
          <div class="month-selector">
            <button class="month-btn" @click="${this.handlePrevMonth}" title="Previous month">
              ◀
            </button>
            <span class="current-month-label">
              ${this.formatMonthName(this.currentYear, this.currentMonth)}
            </span>
            <button class="month-btn" @click="${this.handleNextMonth}" title="Next month">
              ▶
            </button>
          </div>

          ${!isTodayMonth
            ? html`
                <button class="btn-secondary" @click="${this.handleCurrentMonth}">
                  Today
                </button>
              `
            : nothing}

          <button class="btn-primary" @click="${() => this.openSetBudgetModal()}">
            <span>+</span> Set Target
          </button>
        </div>
      </div>

      ${this.isLoading
        ? html`
            <div class="loading-state">
              <div class="spinner"></div>
              <p>Calculating category run-rates, rolling averages, and budget progress...</p>
            </div>
          `
        : this.errorMessage
        ? html`
            <div class="empty-state">
              <h4>Error Loading Budgets</h4>
              <p>${this.errorMessage}</p>
              <button class="btn-secondary" @click="${this.fetchData}">Retry</button>
            </div>
          `
        : !data || data.items.length === 0
        ? html`
            <div class="empty-state">
              <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">🎯</div>
              <h4 style="margin: 0 0 0.5rem; color: var(--text-primary);">No Expense Categories Configured</h4>
              <p style="margin: 0 0 1.5rem;">Create expense accounts first to set monthly targets and run-rates.</p>
            </div>
          `
        : html`
            <!-- Overall Monthly Summary Card -->
            <div class="summary-card">
              <div class="summary-top">
                <div class="summary-metrics">
                  <div class="metric-group">
                    <span class="metric-title">Total Budgeted</span>
                    <span class="metric-num">${this.formatCents(data.totalBudgetedCents)}</span>
                  </div>

                  <div class="metric-group">
                    <span class="metric-title">Actual Spent</span>
                    <span class="metric-num spent">${this.formatCents(data.totalSpentCents)}</span>
                  </div>

                  <div class="metric-group">
                    <span class="metric-title">
                      ${data.totalRemainingCents >= 0 ? 'Remaining' : 'Over Budget'}
                    </span>
                    <span class="metric-num ${data.totalRemainingCents >= 0 ? 'remaining' : 'over'}">
                      ${this.formatCents(Math.abs(data.totalRemainingCents))}
                    </span>
                  </div>
                </div>

                <div>
                  <span class="progress-badge ${progressClass}">
                    <span>${data.overallProgressPercent}% of Budget Used</span>
                  </span>
                </div>
              </div>

              <!-- Master Progress Bar -->
              <div class="progress-track">
                <div
                  class="progress-fill ${progressClass}"
                  style="width: ${Math.min(data.overallProgressPercent, 100)}%;"
                ></div>
              </div>

              <div class="progress-legend">
                <span>Month-to-Date Spending</span>
                <span>${data.items.filter((i) => i.targetAmountCents > 0).length} Categories Active</span>
              </div>
            </div>

            <!-- Categories Grid -->
            <div class="category-grid">
              ${data.items.map((item) => {
                const itemProgressClass =
                  item.progressPercent < 80
                    ? 'normal'
                    : item.progressPercent <= 100
                    ? 'warning'
                    : 'over';

                const isOver = item.actualSpentCents > item.targetAmountCents && item.targetAmountCents > 0;

                return html`
                  <div class="category-card">
                    <div class="card-header">
                      <div class="card-account">
                        <div
                          class="account-avatar"
                          style="background-color: ${item.accountColor ? `${item.accountColor}22` : 'var(--bg-muted)'}; color: ${item.accountColor || 'var(--text-primary)'};"
                        >
                          ${item.accountIcon || '🛒'}
                        </div>
                        <div>
                          <div class="account-title">${item.accountName}</div>
                          <div class="account-subtitle">
                            ${item.notes || 'Monthly target'}
                          </div>
                        </div>
                      </div>

                      <div class="card-actions">
                        <button
                          class="btn-icon-action"
                          title="Edit Target"
                          @click="${() => this.openSetBudgetModal(item)}"
                        >
                          ✏️
                        </button>
                      </div>
                    </div>

                    <!-- Amounts & Progress -->
                    <div>
                      <div class="card-amounts">
                        <span class="amount-spent">${this.formatCents(item.actualSpentCents)}</span>
                        <span class="amount-target">
                          of ${item.targetAmountCents > 0 ? this.formatCents(item.targetAmountCents) : 'No Target Set'}
                        </span>
                      </div>

                      <div class="card-progress-bar" style="margin: 0.6rem 0;">
                        <div
                          class="progress-fill ${itemProgressClass}"
                          style="width: ${Math.min(item.progressPercent, 100)}%;"
                        ></div>
                      </div>

                      <div class="card-remaining ${isOver ? 'negative' : 'positive'}">
                        <span>
                          ${item.targetAmountCents === 0
                            ? 'Uncapped spending'
                            : isOver
                            ? `${this.formatCents(Math.abs(item.remainingCents))} over limit`
                            : `${this.formatCents(item.remainingCents)} remaining`}
                        </span>
                        <span>${item.progressPercent}%</span>
                      </div>
                    </div>

                    <!-- Adaptive Run-Rate & Projections Box -->
                    <div class="analytics-box">
                      <div class="analytics-row">
                        <span>Month-End Projected Pace:</span>
                        <span class="analytics-val">${this.formatCents(item.projectedMonthEndCents)}</span>
                      </div>
                      <div class="analytics-row">
                        <span>Rolling 3-Mo Average:</span>
                        <span class="analytics-val">${this.formatCents(item.rolling3MonthAvgCents)}</span>
                      </div>
                      <div class="analytics-row">
                        <span>Rolling 12-Mo Baseline:</span>
                        <span class="analytics-val">${this.formatCents(item.rolling12MonthAvgCents)}</span>
                      </div>

                      ${item.suggestedTargetCents > 0 && item.suggestedTargetCents !== item.targetAmountCents
                        ? html`
                            <div class="suggested-box">
                              <span class="suggested-label">
                                <span>💡</span>
                                <span>Suggested: ${this.formatCents(item.suggestedTargetCents)}</span>
                              </span>
                              <button
                                class="btn-adopt"
                                @click="${() => this.adoptSuggestedTarget(item)}"
                                title="Adopt adaptive target based on rolling averages"
                              >
                                Adopt
                              </button>
                            </div>
                          `
                        : nothing}
                    </div>
                  </div>
                `;
              })}
            </div>
          `}

      <!-- Set / Edit Budget Target Modal -->
      ${this.isModalOpen
        ? html`
            <div class="modal-backdrop" @click="${this.closeSetBudgetModal}">
              <div class="modal-dialog" @click="${(e: Event) => e.stopPropagation()}">
                <h3>Set Monthly Target</h3>
                <p>Configure a monthly spending target and adaptive baseline for this expense category.</p>

                <form @submit="${this.handleSaveBudget}">
                  <div class="form-group">
                    <label>Expense Category</label>
                    <select
                      class="form-select"
                      .value="${this.modalAccountId}"
                      @change="${(e: Event) => (this.modalAccountId = (e.target as HTMLSelectElement).value)}"
                    >
                      ${this.expenseAccounts.map(
                        (acc) => html`
                          <option value="${acc.id}">
                            ${acc.icon || '🛒'} ${acc.name}
                          </option>
                        `
                      )}
                    </select>
                  </div>

                  <div class="form-group">
                    <label>Monthly Target ($)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      class="form-input"
                      placeholder="e.g. 450.00"
                      .value="${this.modalTargetDollars}"
                      @input="${(e: Event) => (this.modalTargetDollars = (e.target as HTMLInputElement).value)}"
                      required
                    />
                  </div>

                  <div class="form-group">
                    <label>Notes / Strategy (Optional)</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. Weekly grocery baseline"
                      .value="${this.modalNotes}"
                      @input="${(e: Event) => (this.modalNotes = (e.target as HTMLInputElement).value)}"
                    />
                  </div>

                  <div class="modal-actions">
                    <button type="button" class="btn-secondary" @click="${this.closeSetBudgetModal}">
                      Cancel
                    </button>
                    <button type="submit" class="btn-primary">
                      Save Target
                    </button>
                  </div>
                </form>
              </div>
            </div>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-budgets': PengaBudgets;
  }
}
