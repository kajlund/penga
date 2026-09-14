import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { DashboardSummary, AccountBalanceSummary, TransactionWithSplits } from '@penga/shared';

@customElement('penga-dashboard')
export class PengaDashboard extends LitElement {
  static override styles = css`
    :host {
      display: block;
      padding: 2rem 2.5rem 4rem;
      max-width: 1240px;
      margin: 0 auto;
      font-family: var(--font-sans);
    }

    .dashboard-header {
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

    /* Hero Net Available Liquidity Card */
    .hero-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 8px 24px -6px rgba(0, 0, 0, 0.06);
      position: relative;
      overflow: hidden;
    }

    .hero-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 4px;
      background: linear-gradient(90deg, var(--color-primary) 0%, #0d9488 50%, #3b82f6 100%);
    }

    .hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.25rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .hero-label {
      font-size: 0.85rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 0.35rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .hero-amount {
      font-family: var(--font-mono);
      font-size: 2.75rem;
      font-weight: 700;
      letter-spacing: -0.03em;
      line-height: 1.1;
    }

    .hero-amount.positive {
      color: var(--color-primary-text);
    }

    .hero-amount.negative {
      color: var(--color-expense-text);
    }

    .hero-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.35rem 0.8rem;
      border-radius: var(--radius-full);
      font-size: 0.8rem;
      font-weight: 600;
    }

    .hero-badge.healthy {
      background: var(--color-primary-subtle);
      color: var(--color-primary-text);
      border: 1px solid var(--color-primary-border);
    }

    .hero-badge.deficit {
      background: var(--color-expense-subtle);
      color: var(--color-expense-text);
      border: 1px solid var(--color-expense-border);
    }

    /* Liquidity Ratio Progress Bar */
    .ratio-container {
      margin-top: 1rem;
    }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-bottom: 0.5rem;
      font-weight: 500;
    }

    .ratio-bar {
      height: 8px;
      border-radius: var(--radius-full);
      background: var(--bg-muted);
      overflow: hidden;
      display: flex;
    }

    .ratio-segment-assets {
      background: var(--color-primary);
      transition: width var(--transition-normal);
    }

    .ratio-segment-liabilities {
      background: var(--color-expense);
      transition: width var(--transition-normal);
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    .metric-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 1.25rem 1.5rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
      transition: transform var(--transition-fast), border-color var(--transition-fast);
    }

    .metric-card:hover {
      transform: translateY(-2px);
      border-color: var(--border-default);
    }

    .metric-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .metric-title {
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--text-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .metric-icon {
      font-size: 1.15rem;
    }

    .metric-value {
      font-family: var(--font-mono);
      font-size: 1.55rem;
      font-weight: 700;
      color: var(--text-primary);
      margin-bottom: 0.35rem;
    }

    .metric-footnote {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* Two-column dashboard layout */
    .dashboard-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    @media (max-width: 960px) {
      .dashboard-columns {
        grid-template-columns: 1fr;
      }
    }

    .section-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
    }

    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.25rem;
      padding-bottom: 0.85rem;
      border-bottom: 1px solid var(--border-subtle);
    }

    .section-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--text-primary);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .link-action {
      background: none;
      border: none;
      color: var(--color-primary-text);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
      border-radius: var(--radius-sm);
      transition: background var(--transition-fast);
    }

    .link-action:hover {
      background: var(--color-primary-subtle);
      text-decoration: underline;
    }

    /* Account balances list */
    .account-list {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .account-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1rem;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
    }

    .account-row:hover {
      background: var(--bg-base);
      border-color: var(--border-default);
      transform: translateX(2px);
    }

    .account-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .account-avatar {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-md);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.15rem;
      flex-shrink: 0;
    }

    .account-meta {
      min-width: 0;
    }

    .account-name {
      font-size: 0.9rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .account-tags {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.15rem;
    }

    .badge-pill {
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
      text-transform: uppercase;
    }

    .badge-rollup {
      background: var(--color-info-subtle);
      color: var(--color-info-text);
      border: 1px solid var(--color-info-border);
      font-size: 0.68rem;
      font-weight: 600;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
      font-family: var(--font-mono);
    }

    .account-right {
      text-align: right;
      flex-shrink: 0;
    }

    .account-balance {
      font-family: var(--font-mono);
      font-size: 0.95rem;
      font-weight: 700;
    }

    .account-balance.positive {
      color: var(--color-primary-text);
    }

    .account-balance.negative {
      color: var(--color-expense-text);
    }

    .account-balance.neutral {
      color: var(--text-muted);
    }

    .account-cleared {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-top: 0.1rem;
    }

    /* Recent transactions feed */
    .tx-feed {
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }

    .tx-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 1rem;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      transition: all var(--transition-fast);
    }

    .tx-item:hover {
      background: var(--bg-base);
      border-color: var(--border-default);
    }

    .tx-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 0;
    }

    .tx-icon-bubble {
      width: 34px;
      height: 34px;
      border-radius: var(--radius-full);
      background: var(--bg-muted);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .tx-info {
      min-width: 0;
    }

    .tx-payee {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tx-splits-summary {
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-top: 0.15rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tx-right {
      text-align: right;
      flex-shrink: 0;
    }

    .tx-date {
      font-size: 0.72rem;
      color: var(--text-muted);
      margin-bottom: 0.15rem;
    }

    .tx-amount {
      font-family: var(--font-mono);
      font-size: 0.9rem;
      font-weight: 700;
    }

    .btn-edit-tx-dash {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 0.75rem;
      transition: all var(--transition-fast);
      flex-shrink: 0;
    }

    .btn-edit-tx-dash:hover {
      background: var(--color-primary-subtle);
      border-color: var(--color-primary-border);
      color: var(--color-primary-text);
      transform: scale(1.05);
    }

    /* States */
    .loading-state,
    .empty-state {
      padding: 3rem 2rem;
      text-align: center;
      color: var(--text-secondary);
    }

    .spinner {
      display: inline-block;
      width: 28px;
      height: 28px;
      border: 3px solid var(--border-subtle);
      border-radius: 50%;
      border-top-color: var(--color-primary);
      animation: spin 0.8s linear infinite;
      margin-bottom: 0.75rem;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .error-banner {
      padding: 1rem 1.25rem;
      border-radius: var(--radius-md);
      background: var(--color-expense-subtle);
      border: 1px solid var(--color-expense-border);
      color: var(--color-expense-text);
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  `;

  @state()
  private summary: DashboardSummary | null = null;

  @state()
  private isLoading = true;

  @state()
  private errorMessage: string | null = null;

  override connectedCallback() {
    super.connectedCallback();
    this.fetchSummary();
  }

  public async fetchSummary() {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const res = await fetch('/api/reports/balance-summary');
      if (!res.ok) {
        throw new Error(`Failed to load dashboard report: ${res.statusText}`);
      }
      const json = await res.json();
      this.summary = json.data;
    } catch (err) {
      this.errorMessage = (err as Error).message || 'Failed to load dashboard data';
    } finally {
      this.isLoading = false;
    }
  }

  private formatCents(cents: number, includeSign = false): string {
    const isNegative = cents < 0;
    const abs = Math.abs(cents);
    const dollars = (abs / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    if (includeSign) {
      return isNegative ? `-$${dollars}` : `+$${dollars}`;
    }
    return isNegative ? `-$${dollars}` : `$${dollars}`;
  }

  private handleRecordTx() {
    this.dispatchEvent(
      new CustomEvent('open-transaction-modal', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleEditTx(tx: TransactionWithSplits) {
    this.dispatchEvent(
      new CustomEvent('edit-transaction', {
        detail: { transaction: tx },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleNavigate(view: 'accounts' | 'transactions') {
    this.dispatchEvent(
      new CustomEvent('navigate', {
        detail: { view },
        bubbles: true,
        composed: true,
      })
    );
  }

  override render() {
    if (this.isLoading && !this.summary) {
      return html`
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Calculating live account balances and liquidity metrics...</p>
        </div>
      `;
    }

    if (this.errorMessage && !this.summary) {
      return html`
        <div class="error-banner">
          <span>⚠️ ${this.errorMessage}</span>
          <button class="btn-secondary" @click="${this.fetchSummary}">Retry</button>
        </div>
      `;
    }

    const data = this.summary;
    if (!data) return nothing;

    const isHealthy = data.netAvailableCents >= 0;
    const absAssets = Math.max(data.totalAssetsCents, 0);
    const absLiabilities = data.totalLiabilitiesCents;
    const totalRatio = absAssets + absLiabilities || 1;
    const assetPercent = Math.round((absAssets / totalRatio) * 100);
    const liabilityPercent = 100 - assetPercent;

    const assetAccounts = data.accountBalances.filter((a) => a.type === 'ASSET');
    const liabilityAccounts = data.accountBalances.filter((a) => a.type === 'LIABILITY');
    const keyAccounts = [...assetAccounts, ...liabilityAccounts];

    return html`
      <div class="dashboard-header">
        <div class="header-title">
          <h2>Financial Dashboard</h2>
          <p>Real-time liquidity, asset/obligation breakdown, and recent activity</p>
        </div>

        <div class="header-actions">
          <button class="btn-secondary" @click="${this.fetchSummary}" title="Refresh balances">
            <span>🔄</span> Refresh
          </button>
          <button class="btn-primary" @click="${this.handleRecordTx}">
            <span>+</span> Record Transaction
          </button>
        </div>
      </div>

      ${this.errorMessage
        ? html`
            <div class="error-banner">
              <span>⚠️ ${this.errorMessage}</span>
              <button class="btn-secondary" @click="${this.fetchSummary}">Retry</button>
            </div>
          `
        : nothing}

      <!-- Hero Net Available Liquidity -->
      <div class="hero-card">
        <div class="hero-top">
          <div>
            <div class="hero-label">
              <span>💧</span> Net Available Cash & Liquidity
            </div>
            <div class="hero-amount ${isHealthy ? 'positive' : 'negative'}">
              ${this.formatCents(data.netAvailableCents)}
            </div>
          </div>

          <div>
            <span class="hero-badge ${isHealthy ? 'healthy' : 'deficit'}">
              <span>${isHealthy ? '✓' : '⚠️'}</span>
              <span>${isHealthy ? 'Positive Net Liquidity' : 'Liquidity Deficit'}</span>
            </span>
          </div>
        </div>

        <div class="ratio-container">
          <div class="ratio-labels">
            <span>Liquid Assets (${this.formatCents(data.totalAssetsCents)})</span>
            <span>Obligations & Liabilities (${this.formatCents(data.totalLiabilitiesCents)})</span>
          </div>
          <div class="ratio-bar">
            <div class="ratio-segment-assets" style="width: ${assetPercent}%" title="Assets: ${assetPercent}%"></div>
            <div class="ratio-segment-liabilities" style="width: ${liabilityPercent}%" title="Liabilities: ${liabilityPercent}%"></div>
          </div>
        </div>
      </div>

      <!-- Metrics Cards Grid -->
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Total Assets</span>
            <span class="metric-icon">🏦</span>
          </div>
          <div class="metric-value" style="color: var(--color-primary-text);">
            ${this.formatCents(data.totalAssetsCents)}
          </div>
          <div class="metric-footnote">${assetAccounts.length} asset accounts configured</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Total Liabilities</span>
            <span class="metric-icon">💳</span>
          </div>
          <div class="metric-value" style="color: ${data.totalLiabilitiesCents > 0 ? 'var(--color-expense-text)' : 'var(--text-primary)'};">
            ${this.formatCents(data.totalLiabilitiesCents)}
          </div>
          <div class="metric-footnote">${liabilityAccounts.length} liability accounts configured</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Total Inflows / Income</span>
            <span class="metric-icon">📈</span>
          </div>
          <div class="metric-value" style="color: var(--color-income-text);">
            ${this.formatCents(data.totalIncomeCents)}
          </div>
          <div class="metric-footnote">Tracked across income streams</div>
        </div>

        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Total Outflows / Expenses</span>
            <span class="metric-icon">📉</span>
          </div>
          <div class="metric-value" style="color: var(--color-expense-text);">
            ${this.formatCents(data.totalExpensesCents)}
          </div>
          <div class="metric-footnote">Consolidated split expenses</div>
        </div>
      </div>

      <!-- Two-Column Breakdown & Activity -->
      <div class="dashboard-columns">
        <!-- Left: Account Balances & Hierarchy Rollups -->
        <div class="section-card">
          <div class="section-header">
            <h3><span>🌳</span> Account Balances & Rollups</h3>
            <button class="link-action" @click="${() => this.handleNavigate('accounts')}">
              Manage Accounts →
            </button>
          </div>

          ${keyAccounts.length === 0
            ? html`
                <div class="empty-state">
                  <p>No asset or liability accounts configured yet.</p>
                  <button class="btn-secondary" @click="${() => this.handleNavigate('accounts')}">
                    Create First Account
                  </button>
                </div>
              `
            : html`
                <div class="account-list">
                  ${keyAccounts.map((acc) => {
                    const hasSubRollup = acc.rollupBalanceCents !== acc.balanceCents;
                    const balClass =
                      acc.balanceCents > 0
                        ? 'positive'
                        : acc.balanceCents < 0
                        ? 'negative'
                        : 'neutral';

                    return html`
                      <div class="account-row">
                        <div class="account-left">
                          <div
                            class="account-avatar"
                            style="background-color: ${acc.color ? `${acc.color}22` : 'var(--bg-muted)'}; color: ${acc.color || 'var(--text-primary)'};"
                          >
                            ${acc.icon || '📁'}
                          </div>
                          <div class="account-meta">
                            <div class="account-name">${acc.name}</div>
                            <div class="account-tags">
                              <span
                                class="badge-pill"
                                style="background-color: var(--color-${acc.type.toLowerCase()}-subtle); color: var(--color-${acc.type.toLowerCase()}-text);"
                              >
                                ${acc.type}
                              </span>
                              ${hasSubRollup
                                ? html`
                                    <span class="badge-rollup" title="Consolidated balance with nested sub-accounts">
                                      Rollup: ${this.formatCents(acc.rollupBalanceCents)}
                                    </span>
                                  `
                                : nothing}
                            </div>
                          </div>
                        </div>

                        <div class="account-right">
                          <div class="account-balance ${balClass}">
                            ${this.formatCents(acc.balanceCents)}
                          </div>
                          <div class="account-cleared">
                            Cleared: ${this.formatCents(acc.clearedBalanceCents)}
                          </div>
                        </div>
                      </div>
                    `;
                  })}
                </div>
              `}
        </div>

        <!-- Right: Recent Transactions Feed -->
        <div class="section-card">
          <div class="section-header">
            <h3><span>⚡</span> Recent Activity</h3>
            <button class="link-action" @click="${() => this.handleNavigate('transactions')}">
              View Full Ledger →
            </button>
          </div>

          ${data.recentTransactions.length === 0
            ? html`
                <div class="empty-state">
                  <p>No transactions recorded yet.</p>
                  <button class="btn-primary" @click="${this.handleRecordTx}">
                    + Record First Transaction
                  </button>
                </div>
              `
            : html`
                <div class="tx-feed">
                  ${data.recentTransactions.map((tx) => {
                    const primarySplit = tx.splits.find((s) => s.amountCents < 0) || tx.splits[0];
                    const amount = primarySplit ? Math.abs(primarySplit.amountCents) : 0;
                    const splitSummary = tx.splits
                      .map((s) => `${s.accountIcon || ''} ${s.accountName || 'Account'}`)
                      .join(' ⇄ ');

                    return html`
                      <div class="tx-item">
                        <div class="tx-left">
                          <div class="tx-icon-bubble">
                            ${primarySplit?.accountIcon || '💸'}
                          </div>
                          <div class="tx-info">
                            <div class="tx-payee">${tx.payee || 'Unspecified Payee'}</div>
                            <div class="tx-splits-summary" title="${splitSummary}">
                              ${splitSummary}
                            </div>
                          </div>
                        </div>

                        <div class="tx-right">
                          <div class="tx-date">${tx.transactionDate}</div>
                          <div class="tx-amount" style="color: var(--text-primary);">
                            ${this.formatCents(amount)}
                          </div>
                        </div>

                        <button
                          type="button"
                          class="btn-edit-tx-dash"
                          @click="${() => this.handleEditTx(tx)}"
                          title="Edit transaction and splits"
                        >
                          ✏️
                        </button>
                      </div>
                    `;
                  })}
                </div>
              `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-dashboard': PengaDashboard;
  }
}
