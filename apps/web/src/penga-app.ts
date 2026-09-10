import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AccountType } from '@penga/shared';
import './components/theme-toggle.js';

@customElement('penga-app')
export class PengaApp extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background-color: var(--bg-base);
      color: var(--text-primary);
      transition: background-color var(--transition-normal), color var(--transition-normal);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.85rem 2rem;
      background: var(--bg-glass);
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 100;
      transition: background var(--transition-normal), border-color var(--transition-normal);
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 0.85rem;
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
      font-size: 1.15rem;
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

    .main-container {
      max-width: 1100px;
      margin: 0 auto;
      padding: 2.5rem 1.5rem 4rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .hero-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 2.25rem;
      box-shadow: var(--shadow-card);
      transition: background-color var(--transition-normal), border-color var(--transition-normal);
    }

    .hero-card h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.65rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: var(--text-primary);
    }

    .hero-card p {
      margin: 0 0 1.75rem 0;
      color: var(--text-secondary);
      font-size: 0.95rem;
      line-height: 1.6;
      max-width: 700px;
    }

    .section-title {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      margin-bottom: 0.85rem;
      font-weight: 600;
    }

    .categories-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .category-card {
      padding: 1.15rem;
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      transition: transform var(--transition-fast), border-color var(--transition-fast);
    }

    .category-card:hover {
      transform: translateY(-2px);
    }

    .category-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .category-tag {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-sm);
    }

    .category-tag.asset {
      background: var(--color-asset-bg);
      color: var(--color-asset);
      border: 1px solid var(--color-asset-border);
    }

    .category-tag.liability {
      background: var(--color-liability-bg);
      color: var(--color-liability);
      border: 1px solid var(--color-liability-border);
    }

    .category-tag.income {
      background: var(--color-income-bg);
      color: var(--color-income);
      border: 1px solid var(--color-income-border);
    }

    .category-tag.expense {
      background: var(--color-expense-bg);
      color: var(--color-expense);
      border: 1px solid var(--color-expense-border);
    }

    .amount-preview {
      font-family: var(--font-mono);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-top: 0.25rem;
    }

    .category-desc {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin: 0;
    }
  `;

  @state()
  private previewAccounts = [
    { type: AccountType.ASSET, name: 'Main Checking Account', balance: '$8,420.50', desc: 'Liquid assets & checking' },
    { type: AccountType.LIABILITY, name: 'Credit Card (Travel Rewards)', balance: '-$412.30', desc: 'Short-term debt liabilities' },
    { type: AccountType.INCOME, name: 'Salary & Consulting', balance: '+$5,800.00', desc: 'Inflow revenue ledger' },
    { type: AccountType.EXPENSE, name: 'Vehicle > Fuel & Parking', balance: '-$145.20', desc: 'Nested expense category' },
  ];

  override render() {
    return html`
      <header class="header">
        <div class="brand-section">
          <div class="brand-logo">P</div>
          <div class="brand-text">
            <h1>Penga</h1>
            <p>Personal Finance Manager</p>
          </div>
        </div>

        <div class="header-actions">
          <div class="status-badge">
            <span class="status-dot"></span>
            <span>Local Engine Active</span>
          </div>
          <theme-toggle></theme-toggle>
        </div>
      </header>

      <main class="main-container">
        <section class="hero-card">
          <h2>Financial Ledger & Category Hierarchy</h2>
          <p>
            Designed with a warm parchment aesthetic by day and charcoal dark mode by night.
            Every movement balances using exact integer cents and hierarchical account trees.
          </p>

          <div class="section-title">Core Account Types & Preview</div>
          <div class="categories-grid">
            ${this.previewAccounts.map(
              (acc) => html`
                <div class="category-card">
                  <div class="category-header">
                    <span class="category-tag ${acc.type.toLowerCase()}">${acc.type}</span>
                  </div>
                  <div class="amount-preview">${acc.balance}</div>
                  <p class="category-desc">${acc.name}</p>
                </div>
              `
            )}
          </div>
        </section>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-app': PengaApp;
  }
}
