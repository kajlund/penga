import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import type { Account, AccountType } from '@penga/shared';

interface AccountCategoryGroup {
  label: string;
  type: AccountType;
  accounts: Account[];
}

@customElement('account-combobox')
export class AccountCombobox extends LitElement {
  static override styles = css`
    :host {
      display: block;
      position: relative;
      min-width: 0;
      width: 100%;
      font-family: var(--font-sans);
    }

    .combobox-container {
      position: relative;
      width: 100%;
    }

    .input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
      width: 100%;
    }

    .search-input {
      width: 100%;
      padding: 0.65rem 2.2rem 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 500;
      outline: none;
      box-sizing: border-box;
      transition: all var(--transition-fast);
      text-overflow: ellipsis;
      white-space: nowrap;
      overflow: hidden;
    }

    .search-input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-subtle);
      background: var(--bg-surface);
    }

    .search-input::placeholder {
      color: var(--text-muted);
      font-weight: 400;
    }

    .trailing-action {
      position: absolute;
      right: 0.65rem;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 0.8rem;
      pointer-events: none;
      transition: transform var(--transition-fast);
    }

    .trailing-action.open {
      transform: rotate(180deg);
    }

    /* Dropdown menu */
    .dropdown-menu {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      min-width: 280px;
      max-width: 100%;
      max-height: 270px;
      overflow-y: auto;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      z-index: 1200;
      padding: 0.25rem 0;
      animation: menuFadeIn 0.15s ease-out;
    }

    @keyframes menuFadeIn {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .category-header {
      padding: 0.4rem 0.75rem 0.25rem;
      font-size: 0.68rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted);
      background: var(--bg-subtle);
      border-top: 1px solid var(--border-subtle);
      border-bottom: 1px solid var(--border-subtle);
      position: sticky;
      top: 0;
      z-index: 2;
    }

    .category-header:first-child {
      border-top: none;
    }

    .account-item {
      padding: 0.55rem 0.75rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      gap: 0.5rem;
      transition: background var(--transition-fast);
      user-select: none;
    }

    .account-item:hover,
    .account-item.highlighted {
      background: var(--color-primary-subtle);
    }

    .account-item.selected {
      background: var(--color-primary-subtle);
      font-weight: 600;
    }

    .account-label {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      overflow: hidden;
    }

    .account-details {
      display: flex;
      flex-direction: column;
      min-width: 0;
      overflow: hidden;
    }

    .account-icon {
      font-size: 1rem;
      flex-shrink: 0;
      line-height: 1;
    }

    .account-name {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      font-size: 0.85rem;
      color: var(--text-primary);
    }

    .account-combobox-desc {
      font-size: 0.72rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    .highlight-match {
      color: var(--color-primary-text);
      font-weight: 700;
      text-decoration: underline;
      text-underline-offset: 2px;
    }

    .type-badge {
      font-size: 0.65rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-full);
      text-transform: uppercase;
      letter-spacing: 0.03em;
      flex-shrink: 0;
    }

    .type-badge.ASSET {
      background: var(--color-asset-bg);
      color: var(--color-asset);
      border: 1px solid var(--color-asset-border);
    }

    .type-badge.LIABILITY {
      background: var(--color-liability-bg);
      color: var(--color-liability);
      border: 1px solid var(--color-liability-border);
    }

    .type-badge.INCOME {
      background: var(--color-income-bg);
      color: var(--color-income);
      border: 1px solid var(--color-income-border);
    }

    .type-badge.EXPENSE {
      background: var(--color-expense-bg);
      color: var(--color-expense);
      border: 1px solid var(--color-expense-border);
    }

    .empty-state {
      padding: 1rem 0.75rem;
      text-align: center;
      color: var(--text-muted);
      font-size: 0.825rem;
    }

    .empty-state span {
      display: block;
      font-size: 1.25rem;
      margin-bottom: 0.25rem;
    }
  `;

  @property({ type: Array })
  accounts: Account[] = [];

  @property({ type: String })
  value = ''; // Selected account ID

  @property({ type: String })
  placeholder = 'Type to search account...';

  @property({ type: Boolean })
  disabled = false;

  @state()
  private isOpen = false;

  @state()
  private searchQuery = '';

  @state()
  private highlightedIndex = 0;

  @query('.search-input')
  private inputElement?: HTMLInputElement;

  @query('.dropdown-menu')
  private dropdownElement?: HTMLElement;

  override connectedCallback() {
    super.connectedCallback();
    document.addEventListener('click', this.handleDocumentClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleDocumentClick);
  }

  private handleDocumentClick = (e: MouseEvent) => {
    if (!this.isOpen) return;
    const path = e.composedPath();
    if (!path.includes(this)) {
      this.closeDropdown(false);
    }
  };

  private getSelectedAccount(): Account | undefined {
    return this.accounts.find((a) => a.id === this.value);
  }

  private getFilteredAccounts(): Account[] {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) return this.accounts;

    return this.accounts.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.description && a.description.toLowerCase().includes(q)) ||
        a.type.toLowerCase().includes(q)
    );
  }

  private getGroupedFilteredAccounts(): AccountCategoryGroup[] {
    const filtered = this.getFilteredAccounts();
    const categories: { label: string; type: AccountType }[] = [
      { label: 'Assets', type: 'ASSET' },
      { label: 'Liabilities', type: 'LIABILITY' },
      { label: 'Equity', type: 'EQUITY' },
      { label: 'Income', type: 'INCOME' },
      { label: 'Expenses', type: 'EXPENSE' },
    ];

    const groups: AccountCategoryGroup[] = [];
    for (const cat of categories) {
      const items = filtered.filter((a) => a.type === cat.type);
      if (items.length > 0) {
        groups.push({ label: cat.label, type: cat.type, accounts: items });
      }
    }

    return groups;
  }

  private handleInputFocus() {
    if (this.disabled) return;
    this.isOpen = true;
    this.searchQuery = '';
    this.highlightedIndex = 0;
    // Select text on next tick so user can immediately type
    setTimeout(() => {
      this.inputElement?.select();
    }, 10);
  }

  private handleInputChange(e: Event) {
    const target = e.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.isOpen = true;
    this.highlightedIndex = 0;
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (this.disabled) return;

    if (!this.isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      e.preventDefault();
      this.isOpen = true;
      this.searchQuery = '';
      this.highlightedIndex = 0;
      return;
    }

    const filtered = this.getFilteredAccounts();

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (filtered.length > 0) {
        this.highlightedIndex = (this.highlightedIndex + 1) % filtered.length;
        this.scrollHighlightedIntoView();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (filtered.length > 0) {
        this.highlightedIndex = (this.highlightedIndex - 1 + filtered.length) % filtered.length;
        this.scrollHighlightedIntoView();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (this.isOpen && filtered.length > 0) {
        const selected = filtered[this.highlightedIndex] || filtered[0];
        if (selected) {
          this.selectAccount(selected);
        }
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      this.closeDropdown(false);
    } else if (e.key === 'Tab') {
      // Tab automatically commits highlighted if open, or closes dropdown
      if (this.isOpen && filtered.length > 0 && this.searchQuery.trim().length > 0) {
        const selected = filtered[this.highlightedIndex] || filtered[0];
        if (selected) {
          this.selectAccount(selected);
        }
      } else {
        this.closeDropdown(false);
      }
    }
  }

  private scrollHighlightedIntoView() {
    requestAnimationFrame(() => {
      const el = this.renderRoot.querySelector('.account-item.highlighted') as HTMLElement;
      if (el && this.dropdownElement) {
        el.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  private selectAccount(account: Account) {
    this.value = account.id;
    this.searchQuery = '';
    this.isOpen = false;

    this.dispatchEvent(
      new CustomEvent('account-selected', {
        detail: { accountId: account.id, account },
        bubbles: true,
        composed: true,
      })
    );

    this.dispatchEvent(
      new Event('change', { bubbles: true, composed: true })
    );
  }

  private closeDropdown(resetQuery = true) {
    this.isOpen = false;
    if (resetQuery) {
      this.searchQuery = '';
    }
  }

  private renderHighlightedName(name: string) {
    const q = this.searchQuery.trim();
    if (!q) return html`<span>${name}</span>`;

    const idx = name.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return html`<span>${name}</span>`;

    const before = name.substring(0, idx);
    const match = name.substring(idx, idx + q.length);
    const after = name.substring(idx + q.length);

    return html`
      <span>
        ${before}<span class="highlight-match">${match}</span>${after}
      </span>
    `;
  }

  override render() {
    const selectedAcc = this.getSelectedAccount();
    const displayValue = this.isOpen
      ? this.searchQuery
      : selectedAcc
      ? `${selectedAcc.icon || '📁'} ${selectedAcc.name}`
      : '';

    const groups = this.getGroupedFilteredAccounts();
    const filteredFlat = this.getFilteredAccounts();

    return html`
      <div class="combobox-container">
        <div class="input-wrapper">
          <input
            type="text"
            class="search-input"
            .value="${displayValue}"
            placeholder="${selectedAcc ? `${selectedAcc.icon || ''} ${selectedAcc.name}` : this.placeholder}"
            ?disabled="${this.disabled}"
            @focus="${this.handleInputFocus}"
            @input="${this.handleInputChange}"
            @keydown="${this.handleKeyDown}"
            aria-expanded="${this.isOpen}"
            aria-autocomplete="list"
            role="combobox"
          />
          <div class="trailing-action ${this.isOpen ? 'open' : ''}">
            <span>▾</span>
          </div>
        </div>

        ${this.isOpen
          ? html`
              <div class="dropdown-menu" role="listbox">
                ${filteredFlat.length === 0
                  ? html`
                      <div class="empty-state">
                        <span>🔍</span>
                        No accounts match "${this.searchQuery}"
                      </div>
                    `
                  : groups.map((group) => html`
                      <div class="category-header">${group.label}</div>
                      ${group.accounts.map((acc) => {
                        const isSelected = acc.id === this.value;
                        const flatIndex = filteredFlat.indexOf(acc);
                        const isHighlighted = flatIndex === this.highlightedIndex;

                        return html`
                          <div
                            class="account-item ${isSelected ? 'selected' : ''} ${isHighlighted ? 'highlighted' : ''}"
                            role="option"
                            aria-selected="${isSelected}"
                            @click="${() => this.selectAccount(acc)}"
                            @mouseenter="${() => (this.highlightedIndex = flatIndex)}"
                          >
                            <div class="account-label" title="${acc.description ? `${acc.name} — ${acc.description}` : acc.name}">
                              <span class="account-icon">${acc.icon || '📁'}</span>
                              <div class="account-details">
                                <span class="account-name">
                                  ${this.renderHighlightedName(acc.name)}
                                </span>
                                ${acc.description
                                  ? html`
                                      <span class="account-combobox-desc">
                                        ${this.renderHighlightedName(acc.description)}
                                      </span>
                                    `
                                  : nothing}
                              </div>
                            </div>
                            <span class="type-badge ${acc.type}">${acc.type}</span>
                          </div>
                        `;
                      })}
                    `)}
              </div>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'account-combobox': AccountCombobox;
  }
}
