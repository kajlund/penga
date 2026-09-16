import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import type { TransactionTemplateWithSplits, Account, Tag, CreateTransactionTemplateInput, UpdateTransactionTemplateInput } from '@penga/shared';
import './account-combobox.js';

interface TemplateSplitRow {
  id: string;
  accountId: string;
  amount: string; // decimal string
}

@customElement('penga-templates')
export class PengaTemplates extends LitElement {
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

    /* Search & Filter Bar */
    .filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1.5rem;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .search-input-wrap {
      position: relative;
      flex: 1;
      max-width: 400px;
    }

    .search-input {
      width: 100%;
      padding: 0.65rem 1rem 0.65rem 2.4rem;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      transition: border-color var(--transition-fast);
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    .search-icon {
      position: absolute;
      left: 0.85rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 0.9rem;
      pointer-events: none;
    }

    .templates-count {
      font-size: 0.85rem;
      color: var(--text-muted);
      font-weight: 500;
    }

    /* Template Cards Grid */
    .templates-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
      gap: 1.25rem;
    }

    .template-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      padding: 1.35rem 1.5rem;
      box-shadow: var(--shadow-card);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 1.25rem;
      transition: transform var(--transition-fast), border-color var(--transition-fast), box-shadow var(--transition-fast);
    }

    .template-card:hover {
      border-color: var(--border-strong);
      box-shadow: var(--shadow-md);
      transform: translateY(-2px);
    }

    .card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 0.75rem;
    }

    .card-header-main {
      display: flex;
      align-items: center;
      gap: 0.85rem;
    }

    .template-icon-badge {
      width: 42px;
      height: 42px;
      border-radius: var(--radius-md);
      background: var(--color-primary-subtle);
      border: 1px solid var(--color-primary-border);
      color: var(--color-primary-text);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.3rem;
      flex-shrink: 0;
    }

    .template-titles h3 {
      margin: 0 0 0.2rem 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.015em;
    }

    .template-payee {
      font-size: 0.825rem;
      color: var(--text-secondary);
      display: flex;
      align-items: center;
      gap: 0.35rem;
    }

    .template-card-menu {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }

    .btn-icon {
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
      font-size: 0.95rem;
      transition: background var(--transition-fast), color var(--transition-fast);
    }

    .btn-icon:hover {
      background: var(--bg-subtle);
      color: var(--text-primary);
    }

    .btn-icon.danger:hover {
      background: #fee2e2;
      color: #dc2626;
    }

    /* Template Note */
    .template-note {
      font-size: 0.8rem;
      color: var(--text-muted);
      font-style: italic;
      line-height: 1.4;
      margin-top: -0.5rem;
    }

    /* Splits Preview List */
    .splits-preview {
      background: var(--bg-base);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: 0.75rem 0.9rem;
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
    }

    .split-preview-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.8rem;
      gap: 0.5rem;
    }

    .split-acc {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: var(--text-secondary);
    }

    .split-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .split-amt {
      font-family: var(--font-mono);
      font-weight: 600;
      white-space: nowrap;
    }

    .split-amt.negative {
      color: var(--text-primary);
    }

    .split-amt.positive {
      color: var(--color-primary-text);
    }

    .split-amt.variable {
      color: var(--text-muted);
      font-style: italic;
      font-size: 0.75rem;
    }

    /* Tag Badges */
    .template-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }

    .tag-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-full);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 0.72rem;
      font-weight: 500;
    }

    /* Card Actions */
    .card-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border-subtle);
    }

    .btn-record {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      width: 100%;
      padding: 0.6rem 1rem;
      border-radius: var(--radius-md);
      background: var(--color-primary);
      color: #ffffff;
      border: none;
      font-family: var(--font-sans);
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(5, 150, 105, 0.2);
      transition: all var(--transition-fast);
    }

    .btn-record:hover {
      background: var(--color-primary-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(5, 150, 105, 0.3);
    }

    /* Empty state */
    .empty-state {
      background: var(--bg-surface);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-lg);
      padding: 4rem 2rem;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      max-width: 600px;
      margin: 2rem auto;
    }

    .empty-icon {
      font-size: 3.2rem;
      margin-bottom: 0.25rem;
    }

    .empty-state h3 {
      margin: 0;
      font-size: 1.3rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .empty-state p {
      margin: 0;
      color: var(--text-secondary);
      font-size: 0.9rem;
      line-height: 1.5;
      max-width: 440px;
    }

    /* Modal Backdrop and Card */
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
      max-width: 760px;
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

    .modal-header {
      padding: 1.25rem 1.75rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-surface);
    }

    .modal-header h3 {
      margin: 0 0 0.2rem 0;
      font-size: 1.25rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .modal-header p {
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
    }

    .close-btn:hover {
      background: var(--bg-subtle);
      color: var(--text-primary);
    }

    .modal-body {
      padding: 1.5rem 1.75rem;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .form-label {
      font-size: 0.825rem;
      font-weight: 600;
      color: var(--text-secondary);
    }

    .form-input {
      padding: 0.65rem 0.85rem;
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      box-sizing: border-box;
      width: 100%;
    }

    .form-input:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    /* Modal Split lines */
    .modal-splits-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.5rem;
    }

    .modal-splits-header span {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .btn-add-split {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.75rem;
      border-radius: var(--radius-sm);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--color-primary);
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-add-split:hover {
      background: var(--color-primary-subtle);
    }

    .split-edit-row {
      display: grid;
      grid-template-columns: 1fr 150px 36px;
      gap: 0.6rem;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .modal-footer {
      padding: 1.15rem 1.75rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      background: var(--bg-surface);
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
  `;

  @state()
  private templates: TransactionTemplateWithSplits[] = [];

  @state()
  private accounts: Account[] = [];

  @state()
  private tags: Tag[] = [];

  @state()
  private searchQuery = '';

  @state()
  private isLoading = true;

  @state()
  private isModalOpen = false;

  @state()
  private editingTemplate: TransactionTemplateWithSplits | null = null;

  @state()
  private templateName = '';

  @state()
  private templatePayee = '';

  @state()
  private templateNote = '';

  @state()
  private templateIcon = '⚡';

  @state()
  private templateSplits: TemplateSplitRow[] = [];

  @state()
  private isSaving = false;

  override connectedCallback() {
    super.connectedCallback();
    this.fetchData();
  }

  public async fetchData() {
    this.isLoading = true;
    try {
      await Promise.all([this.fetchTemplates(), this.fetchAccounts(), this.fetchTags()]);
    } finally {
      this.isLoading = false;
    }
  }

  public async fetchTemplates() {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const json = await res.json();
        this.templates = json.data || [];
      }
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  }

  public async fetchAccounts() {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const json = await res.json();
        this.accounts = json.data || [];
      }
    } catch (err) {
      console.error('Failed to fetch accounts', err);
    }
  }

  public async fetchTags() {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const json = await res.json();
        this.tags = json.data || [];
      }
    } catch (err) {
      console.error('Failed to fetch tags', err);
    }
  }

  private handleRecordNow(template: TransactionTemplateWithSplits) {
    this.dispatchEvent(
      new CustomEvent('record-from-template', {
        detail: { template },
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleOpenCreate() {
    this.editingTemplate = null;
    this.templateName = '';
    this.templatePayee = '';
    this.templateNote = '';
    this.templateIcon = '⚡';

    const sourceAccId = this.accounts[0]?.id || '';
    const destAccId = this.accounts.find((a) => a.id !== sourceAccId)?.id || '';

    this.templateSplits = [
      { id: '1', accountId: sourceAccId, amount: '-0.00' },
      { id: '2', accountId: destAccId, amount: '0.00' },
    ];
    this.isModalOpen = true;
  }

  private handleOpenEdit(template: TransactionTemplateWithSplits) {
    this.editingTemplate = template;
    this.templateName = template.name;
    this.templatePayee = template.payee || '';
    this.templateNote = template.note || '';
    this.templateIcon = template.icon || '⚡';

    this.templateSplits = (template.splits || []).map((s, idx) => ({
      id: `split-${idx}`,
      accountId: s.accountId,
      amount: s.amountCents !== 0 ? (s.amountCents / 100).toFixed(2) : '',
    }));

    if (this.templateSplits.length < 2) {
      this.templateSplits.push({
        id: `split-fill`,
        accountId: this.accounts[0]?.id || '',
        amount: '',
      });
    }

    this.isModalOpen = true;
  }

  private async handleDelete(template: TransactionTemplateWithSplits) {
    if (!confirm(`Are you sure you want to delete template "${template.name}"?`)) return;

    try {
      const res = await fetch(`/api/templates/${template.id}`, { method: 'DELETE' });
      if (res.ok) {
        this.templates = this.templates.filter((t) => t.id !== template.id);
      } else {
        alert('Failed to delete template');
      }
    } catch (err: any) {
      alert(err.message);
    }
  }

  private addSplitRow() {
    this.templateSplits = [
      ...this.templateSplits,
      { id: `row-${Date.now()}`, accountId: this.accounts[0]?.id || '', amount: '' },
    ];
  }

  private removeSplitRow(id: string) {
    if (this.templateSplits.length <= 2) return;
    this.templateSplits = this.templateSplits.filter((r) => r.id !== id);
  }

  private parseCents(val: string): number {
    if (!val) return 0;
    const clean = val.replace(',', '.').trim();
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : Math.round(num * 100);
  }

  private async handleSaveTemplate() {
    if (!this.templateName.trim()) {
      alert('Template Name is required');
      return;
    }

    if (this.templateSplits.some((s) => !s.accountId)) {
      alert('Please select an account for all split rows');
      return;
    }

    this.isSaving = true;

    try {
      const payload: CreateTransactionTemplateInput = {
        name: this.templateName.trim(),
        payee: this.templatePayee.trim() || null,
        note: this.templateNote.trim() || null,
        icon: this.templateIcon.trim() || '⚡',
        splits: this.templateSplits.map((s, idx) => ({
          accountId: s.accountId,
          amountCents: this.parseCents(s.amount),
          sortOrder: idx,
        })),
      };

      const isEdit = Boolean(this.editingTemplate);
      const url = isEdit ? `/api/templates/${this.editingTemplate!.id}` : '/api/templates';
      const method = isEdit ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save template');
      }

      await this.fetchTemplates();
      this.isModalOpen = false;
    } catch (err: any) {
      alert(err.message);
    } finally {
      this.isSaving = false;
    }
  }

  private formatCents(cents: number): string {
    const isNeg = cents < 0;
    const abs = Math.abs(cents);
    const dollars = (abs / 100).toFixed(2);
    return isNeg ? `-$${dollars}` : `+$${dollars}`;
  }

  override render() {
    const filtered = this.templates.filter((t) => {
      if (!this.searchQuery.trim()) return true;
      const q = this.searchQuery.toLowerCase();
      return (
        t.name.toLowerCase().includes(q) ||
        (t.payee && t.payee.toLowerCase().includes(q)) ||
        (t.note && t.note.toLowerCase().includes(q)) ||
        (t.splits || []).some((s) => s.accountName?.toLowerCase().includes(q))
      );
    });

    return html`
      <!-- Page Header -->
      <div class="page-header">
        <div class="header-title">
          <h2>Transaction Templates ⚡</h2>
          <p>Reusable blueprints for recurring bills, regular paychecks, and frequent split entries</p>
        </div>
        <div class="header-actions">
          <button class="btn-primary" @click="${this.handleOpenCreate}">
            <span>+</span>
            <span>New Template</span>
          </button>
        </div>
      </div>

      <!-- Filter & Search Bar -->
      <div class="filter-bar">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            type="text"
            class="search-input"
            placeholder="Search templates by name, payee, or account..."
            .value="${this.searchQuery}"
            @input="${(e: any) => (this.searchQuery = e.target.value)}"
          />
        </div>
        <div class="templates-count">
          ${filtered.length} ${filtered.length === 1 ? 'template' : 'templates'}
        </div>
      </div>

      <!-- Templates List or Empty State -->
      ${this.isLoading
        ? html`<div style="text-align: center; padding: 3rem; color: var(--text-muted);">Loading templates...</div>`
        : filtered.length === 0
        ? html`
            <div class="empty-state">
              <div class="empty-icon">📑</div>
              <h3>${this.searchQuery ? 'No templates match your search' : 'No templates yet'}</h3>
              <p>
                ${this.searchQuery
                  ? 'Try searching for a different keyword or clear the search query.'
                  : 'Templates allow you to pre-fill accounts, payees, and split amounts for recurring items in one click.'}
              </p>
              ${!this.searchQuery
                ? html`
                    <button class="btn-primary" @click="${this.handleOpenCreate}">
                      <span>+</span>
                      <span>Create Your First Template</span>
                    </button>
                  `
                : nothing}
            </div>
          `
        : html`
            <div class="templates-grid">
              ${repeat(
                filtered,
                (t) => t.id,
                (t) => html`
                  <div class="template-card">
                    <div style="display: flex; flex-direction: column; gap: 0.85rem;">
                      <!-- Card Header -->
                      <div class="card-top">
                        <div class="card-header-main">
                          <div class="template-icon-badge">${t.icon || '⚡'}</div>
                          <div class="template-titles">
                            <h3>${t.name}</h3>
                            ${t.payee ? html`<div class="template-payee">🏢 ${t.payee}</div>` : nothing}
                          </div>
                        </div>
                        <div class="template-card-menu">
                          <button
                            class="btn-icon"
                            @click="${() => this.handleOpenEdit(t)}"
                            title="Edit template"
                          >
                            ✏️
                          </button>
                          <button
                            class="btn-icon danger"
                            @click="${() => this.handleDelete(t)}"
                            title="Delete template"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      ${t.note ? html`<div class="template-note">"${t.note}"</div>` : nothing}

                      <!-- Splits Preview -->
                      <div class="splits-preview">
                        ${(t.splits || []).map(
                          (s) => html`
                            <div class="split-preview-row">
                              <span class="split-acc">
                                <span class="split-dot" style="background: ${s.accountColor || '#64748b'};"></span>
                                <span>${s.accountIcon || '📁'} ${s.accountName || 'Account'}</span>
                              </span>
                              <span class="split-amt ${s.amountCents < 0 ? 'negative' : s.amountCents > 0 ? 'positive' : 'variable'}">
                                ${s.amountCents !== 0 ? this.formatCents(s.amountCents) : 'Variable'}
                              </span>
                            </div>
                          `
                        )}
                      </div>

                      <!-- Tags (if any) -->
                      ${t.tags && t.tags.length > 0
                        ? html`
                            <div class="template-tags">
                              ${t.tags.map(
                                (tag) => html`
                                  <span class="tag-badge" style="border-color: ${tag.color || '#6366f1'};">
                                    #${tag.name}
                                  </span>
                                `
                              )}
                            </div>
                          `
                        : nothing}
                    </div>

                    <!-- Footer Action: 1-Click Instantiate -->
                    <div class="card-footer">
                      <button class="btn-record" @click="${() => this.handleRecordNow(t)}">
                        <span>⚡</span>
                        <span>Record Now</span>
                      </button>
                    </div>
                  </div>
                `
              )}
            </div>
          `}

      <!-- Create / Edit Template Modal -->
      ${this.isModalOpen
        ? html`
            <div
              class="modal-backdrop"
              @click="${(e: MouseEvent) => {
                if (e.target === e.currentTarget) this.isModalOpen = false;
              }}"
            >
              <div class="modal-card">
                <div class="modal-header">
                  <div>
                    <h3>${this.editingTemplate ? 'Edit Template' : 'Create Transaction Template'}</h3>
                    <p>Configure a blueprint for recurring or frequent transactions</p>
                  </div>
                  <button class="close-btn" @click="${() => (this.isModalOpen = false)}">✕</button>
                </div>

                <div class="modal-body">
                  <div class="grid-2">
                    <div class="form-group">
                      <label class="form-label">Template Name *</label>
                      <input
                        type="text"
                        class="form-input"
                        placeholder="e.g. Monthly Rent, Paycheck, Gym..."
                        .value="${this.templateName}"
                        @input="${(e: any) => (this.templateName = e.target.value)}"
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Icon / Emoji</label>
                      <input
                        type="text"
                        class="form-input"
                        placeholder="⚡"
                        .value="${this.templateIcon}"
                        @input="${(e: any) => (this.templateIcon = e.target.value)}"
                      />
                    </div>
                  </div>

                  <div class="grid-2">
                    <div class="form-group">
                      <label class="form-label">Default Payee</label>
                      <input
                        type="text"
                        class="form-input"
                        placeholder="e.g. Landlord, Acme Corp, Netflix"
                        .value="${this.templatePayee}"
                        @input="${(e: any) => (this.templatePayee = e.target.value)}"
                      />
                    </div>
                    <div class="form-group">
                      <label class="form-label">Default Note</label>
                      <input
                        type="text"
                        class="form-input"
                        placeholder="Optional memo or description"
                        .value="${this.templateNote}"
                        @input="${(e: any) => (this.templateNote = e.target.value)}"
                      />
                    </div>
                  </div>

                  <!-- Template Splits -->
                  <div class="form-group">
                    <div class="modal-splits-header">
                      <span>Default Split Lines (Accounts & Amounts)</span>
                      <button type="button" class="btn-add-split" @click="${this.addSplitRow}">
                        <span>+</span>
                        <span>Add Split</span>
                      </button>
                    </div>

                    ${repeat(
                      this.templateSplits,
                      (row) => row.id,
                      (row) => html`
                        <div class="split-edit-row">
                          <account-combobox
                            .accounts="${this.accounts}"
                            .value="${row.accountId}"
                            placeholder="Select account..."
                            @account-selected="${(e: CustomEvent) => {
                              this.templateSplits = this.templateSplits.map((r) =>
                                r.id === row.id ? { ...r, accountId: e.detail.accountId } : r
                              );
                            }}"
                          ></account-combobox>

                          <input
                            type="text"
                            class="form-input"
                            placeholder="0.00 (or blank)"
                            .value="${row.amount}"
                            @input="${(e: any) => {
                              this.templateSplits = this.templateSplits.map((r) =>
                                r.id === row.id ? { ...r, amount: e.target.value } : r
                              );
                            }}"
                          />

                          <button
                            type="button"
                            class="btn-icon danger"
                            ?disabled="${this.templateSplits.length <= 2}"
                            @click="${() => this.removeSplitRow(row.id)}"
                            title="Remove split"
                          >
                            ✕
                          </button>
                        </div>
                      `
                    )}
                    <span style="font-size: 0.75rem; color: var(--text-muted);">
                      Tip: Leave amounts as 0.00 for variable expenses; you can enter the exact sum when recording.
                    </span>
                  </div>
                </div>

                <div class="modal-footer">
                  <button class="btn-cancel" @click="${() => (this.isModalOpen = false)}">Cancel</button>
                  <button
                    class="btn-primary"
                    ?disabled="${this.isSaving}"
                    @click="${this.handleSaveTemplate}"
                  >
                    ${this.isSaving ? 'Saving...' : 'Save Template'}
                  </button>
                </div>
              </div>
            </div>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-templates': PengaTemplates;
  }
}
