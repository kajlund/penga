import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AccountType } from '@penga/shared';

@customElement('penga-app')
export class PengaApp extends LitElement {
  static override styles = css`
    :host {
      display: block;
      min-height: 100vh;
      color: #f1f5f9;
      background: radial-gradient(circle at 50% 0%, #1e293b 0%, #0b0f19 75%);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 2rem;
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      position: sticky;
      top: 0;
      z-index: 100;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .brand-logo {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      background: linear-gradient(135deg, #10b981 0%, #065f46 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
      color: #ffffff;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
    }

    .brand-text h1 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -0.025em;
      color: #ffffff;
    }

    .brand-text p {
      margin: 0;
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 500;
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      padding: 0.35rem 0.75rem;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.12);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #34d399;
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .status-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background-color: #10b981;
      box-shadow: 0 0 8px #10b981;
    }

    .main-content {
      max-width: 1100px;
      margin: 0 auto;
      padding: 3rem 2rem;
    }

    .hero-card {
      background: rgba(30, 41, 59, 0.4);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      padding: 2.5rem;
      backdrop-filter: blur(8px);
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.25);
    }

    .hero-card h2 {
      margin: 0 0 0.75rem 0;
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
    }

    .hero-card p {
      margin: 0 0 2rem 0;
      color: #94a3b8;
      font-size: 1rem;
      line-height: 1.6;
    }

    .section-title {
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }

    .badges-container {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }

    .account-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      background: rgba(51, 65, 85, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.06);
      font-size: 0.8rem;
      font-weight: 500;
      color: #cbd5e1;
      transition: all 0.2s ease;
    }

    .account-badge:hover {
      border-color: rgba(16, 185, 129, 0.4);
      transform: translateY(-1px);
    }
  `;

  @state()
  accountTypes: string[] = Object.values(AccountType);

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
        <div class="status-badge">
          <span class="status-dot"></span>
          <span>Workspace Ready</span>
        </div>
      </header>

      <main class="main-content">
        <div class="hero-card">
          <h2>Double-Entry Personal Finance</h2>
          <p>
            Self-hosted personal finance manager optimized for manual transaction entry,
            multi-account management, deep split-cost allocation, and structured statement reconciliation.
          </p>

          <div class="section-title">Supported Account Categories</div>
          <div class="badges-container">
            ${this.accountTypes.map(
              (type) => html`<span class="account-badge">${type}</span>`
            )}
          </div>
        </div>
      </main>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-app': PengaApp;
  }
}
