import { LitElement, html, css, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { AccountType, type AccountTreeNode } from '@penga/shared';

@customElement('penga-accounts')
export class PengaAccounts extends LitElement {
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

    /* Filter Bar & Search */
    .filter-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }

    .filter-pills {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      overflow-x: auto;
      padding-bottom: 0.25rem;
      flex-wrap: wrap;
    }

    .filter-pill {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.45rem 0.9rem;
      border-radius: var(--radius-full);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-size: 0.8rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
      user-select: none;
    }

    .filter-pill:hover {
      background: var(--bg-subtle);
      color: var(--text-primary);
      border-color: var(--border-strong);
    }

    .filter-pill.active {
      background: var(--color-primary-subtle);
      border-color: var(--color-primary-border);
      color: var(--color-primary-text);
      font-weight: 600;
    }

    .badge-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      padding: 0 0.35rem;
      border-radius: var(--radius-full);
      background: var(--bg-muted);
      color: var(--text-muted);
      font-size: 0.7rem;
      font-weight: 600;
    }

    .filter-pill.active .badge-count {
      background: var(--color-primary);
      color: #ffffff;
    }

    /* Search Box */
    .search-box {
      position: relative;
      display: flex;
      align-items: center;
      min-width: 250px;
      max-width: 360px;
      flex: 1;
    }

    .search-icon {
      position: absolute;
      left: 0.85rem;
      color: var(--text-muted);
      pointer-events: none;
      transition: color var(--transition-fast);
    }

    .search-box:focus-within .search-icon {
      color: var(--color-primary);
    }

    .search-input {
      width: 100%;
      padding: 0.45rem 2.2rem 0.45rem 2.4rem;
      border-radius: var(--radius-full);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.825rem;
      outline: none;
      transition: all var(--transition-fast);
      box-shadow: var(--shadow-sm);
    }

    .search-input::placeholder {
      color: var(--text-muted);
    }

    .search-input:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 3px var(--color-primary-subtle);
      background: var(--bg-surface);
    }

    .search-clear-btn {
      position: absolute;
      right: 0.65rem;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      border: none;
      background: var(--bg-muted);
      color: var(--text-muted);
      font-size: 0.7rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all var(--transition-fast);
      line-height: 1;
    }

    .search-clear-btn:hover {
      background: var(--border-strong);
      color: var(--text-primary);
    }

    .search-highlight {
      background: var(--color-primary-subtle);
      color: var(--color-primary-text);
      font-weight: 700;
      border-radius: 2px;
      padding: 0 2px;
    }

    /* Tree Container Card */
    .tree-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-card);
      overflow: visible;
    }

    .tree-header {
      display: grid;
      grid-template-columns: 1fr 100px 36px;
      gap: 0.75rem;
      padding: 0.65rem 1.25rem;
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      align-items: center;
    }

    .tree-header-type {
      text-align: center;
    }

    .tree-header-actions {
      text-align: right;
    }

    .tree-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }

    /* Tree Node */
    .tree-node {
      display: flex;
      flex-direction: column;
    }

    .node-row {
      display: grid;
      grid-template-columns: 1fr 100px 36px;
      gap: 0.75rem;
      align-items: center;
      padding: 0.45rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      transition: background-color var(--transition-fast);
      position: relative;
    }

    .node-row:hover {
      background: var(--bg-subtle);
    }

    .node-main {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      min-width: 0;
    }

    .toggle-btn {
      width: 20px;
      height: 20px;
      border-radius: var(--radius-sm);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      cursor: pointer;
      color: var(--text-muted);
      font-size: 0.7rem;
      transition: transform var(--transition-fast), color var(--transition-fast);
      padding: 0;
      flex-shrink: 0;
    }

    .toggle-btn:hover {
      color: var(--text-primary);
      background: var(--bg-muted);
    }

    .toggle-btn.collapsed svg {
      transform: rotate(-90deg);
    }

    .toggle-placeholder {
      width: 20px;
      height: 20px;
      display: inline-block;
      flex-shrink: 0;
    }

    .account-icon {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      flex-shrink: 0;
    }

    .account-info {
      display: flex;
      flex-direction: column;
      gap: 0.1rem;
      min-width: 0;
    }

    .account-title-row {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-width: 0;
    }

    .account-name {
      font-size: 0.88rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.25;
    }

    .subaccount-pill {
      font-size: 0.68rem;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--bg-muted);
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
      white-space: nowrap;
      flex-shrink: 0;
      line-height: 1.2;
    }

    .account-description {
      font-size: 0.75rem;
      color: var(--text-secondary);
      line-height: 1.25;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .node-type {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .type-badge {
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 0.15rem 0.5rem;
      border-radius: var(--radius-sm);
      text-transform: uppercase;
      text-align: center;
      line-height: 1.3;
    }

    .type-badge.asset {
      background: var(--color-asset-bg);
      color: var(--color-asset);
      border: 1px solid var(--color-asset-border);
    }

    .type-badge.liability {
      background: var(--color-liability-bg);
      color: var(--color-liability);
      border: 1px solid var(--color-liability-border);
    }

    .type-badge.income {
      background: var(--color-income-bg);
      color: var(--color-income);
      border: 1px solid var(--color-income-border);
    }

    .type-badge.expense {
      background: var(--color-expense-bg);
      color: var(--color-expense);
      border: 1px solid var(--color-expense-border);
    }

    .node-actions {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      position: relative;
    }

    .actions-dropdown-container {
      position: relative;
      display: inline-flex;
      justify-content: flex-end;
    }

    .btn-actions-trigger {
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.05em;
      line-height: 1;
      transition: all var(--transition-fast);
      user-select: none;
    }

    .btn-actions-trigger:hover,
    .btn-actions-trigger.active {
      background: var(--bg-subtle);
      border-color: var(--border-subtle);
      color: var(--text-primary);
    }

    .actions-menu {
      position: absolute;
      right: 0;
      top: calc(100% + 4px);
      z-index: 100;
      min-width: 175px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.06);
      padding: 0.35rem 0;
      display: flex;
      flex-direction: column;
      animation: menuFadeIn var(--transition-fast) ease-out;
    }

    .actions-menu.open-upwards {
      top: auto;
      bottom: calc(100% + 4px);
      animation: menuFadeInUp var(--transition-fast) ease-out;
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

    @keyframes menuFadeInUp {
      from {
        opacity: 0;
        transform: translateY(4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .actions-menu-item {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      padding: 0.55rem 0.9rem;
      font-family: var(--font-sans);
      font-size: 0.8rem;
      font-weight: 500;
      color: var(--text-primary);
      background: transparent;
      border: none;
      text-align: left;
      cursor: pointer;
      width: 100%;
      transition: background var(--transition-fast);
    }

    .actions-menu-item:hover:not(:disabled) {
      background: var(--bg-subtle);
      color: var(--color-primary-text);
    }

    .actions-menu-item.danger:hover {
      background: var(--color-expense-bg);
      color: var(--color-expense);
    }

    .actions-menu-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 0.35rem 0;
    }

    .children-container {
      position: relative;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    /* Modal Styles */
    .modal-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
    }

    .modal-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-lg);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 520px;
      overflow: hidden;
      animation: modalFadeIn 0.2s ease-out;
    }

    @keyframes modalFadeIn {
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
      padding: 1.25rem 1.5rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .modal-close {
      background: transparent;
      border: none;
      font-size: 1.25rem;
      color: var(--text-muted);
      cursor: pointer;
      padding: 0.25rem;
      border-radius: var(--radius-sm);
    }

    .modal-close:hover {
      color: var(--text-primary);
      background: var(--bg-subtle);
    }

    .modal-body {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 1.15rem;
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
    .form-select,
    .form-textarea {
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

    .form-textarea {
      resize: vertical;
      min-height: 60px;
      line-height: 1.4;
    }

    .form-input:focus,
    .form-select:focus,
    .form-textarea:focus {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-subtle);
    }

    .quick-emojis {
      display: flex;
      gap: 0.4rem;
      flex-wrap: wrap;
      margin-top: 0.35rem;
    }

    .emoji-pill {
      font-size: 1.1rem;
      padding: 0.3rem 0.5rem;
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .emoji-pill:hover {
      background: var(--bg-muted);
      transform: scale(1.1);
    }

    .modal-footer {
      padding: 1rem 1.5rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.75rem;
      background: var(--bg-subtle);
    }

    .btn-secondary {
      padding: 0.65rem 1.15rem;
      border-radius: var(--radius-md);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-secondary:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .empty-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--text-muted);
    }

    .empty-state h4 {
      margin: 0.5rem 0 0.25rem;
      color: var(--text-primary);
      font-size: 1.1rem;
    }

    .loading-state {
      padding: 4rem 2rem;
      text-align: center;
      color: var(--text-secondary);
      font-size: 0.95rem;
    }
  `;

  @state()
  private treeNodes: AccountTreeNode[] = [];

  @state()
  private isLoading = true;

  @state()
  private errorMessage: string | null = null;

  @state()
  private selectedFilter: 'ALL' | AccountType = 'ALL';

  @state()
  private searchQuery = '';

  @state()
  private collapsedNodes = new Set<string>();

  @state()
  private isCreateModalOpen = false;

  @state()
  private openMenuAccountId: string | null = null;

  @state()
  private openMenuUpwards = false;

  @state()
  private editingAccountId: string | null = null;

  @state()
  private createName = '';

  @state()
  private createDescription = '';

  @state()
  private createType: AccountType = 'ASSET';

  @state()
  private createParentId = '';

  @state()
  private createIcon = '🏦';

  @state()
  private createColor = '#0d9488';

  @state()
  private createInitialBalance = '';

  @state()
  private flatAccounts: { id: string; name: string; description?: string | null; type: AccountType }[] = [];

  private emojiPresets = ['🏦', '⚖️', '🛡️', '💵', '💳', '🛒', '🏠', '🚗', '💼', '📈', '🍔', '🎁', '💡'];

  private handleWindowClick = (e: MouseEvent) => {
    if (!this.openMenuAccountId) return;
    const path = e.composedPath();
    const isMenuClick = path.some(
      (el) => el instanceof HTMLElement && (el.classList.contains('actions-dropdown-container') || el.classList.contains('actions-menu'))
    );
    if (!isMenuClick) {
      this.openMenuAccountId = null;
      this.openMenuUpwards = false;
    }
  };

  private handleWindowKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.openMenuAccountId = null;
      this.openMenuUpwards = false;
    }
  };

  override connectedCallback() {
    super.connectedCallback();
    this.fetchAccounts();
    window.addEventListener('click', this.handleWindowClick);
    window.addEventListener('keydown', this.handleWindowKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this.handleWindowClick);
    window.removeEventListener('keydown', this.handleWindowKeyDown);
  }

  async fetchAccounts() {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const res = await fetch('/api/accounts/tree');
      if (!res.ok) {
        throw new Error(`Failed to load accounts: ${res.statusText}`);
      }
      const json = await res.json();
      this.treeNodes = this.sortTreeNodes(json.data || []);
      this.extractFlatList(this.treeNodes);
    } catch (err: any) {
      this.errorMessage = err.message || 'Error fetching accounts';
    } finally {
      this.isLoading = false;
    }
  }

  private sortTreeNodes(nodes: AccountTreeNode[]): AccountTreeNode[] {
    return [...nodes]
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
      .map((node) => ({
        ...node,
        children: node.children ? this.sortTreeNodes(node.children) : [],
      }));
  }

  private extractFlatList(nodes: AccountTreeNode[]) {
    const list: { id: string; name: string; description?: string | null; type: AccountType }[] = [];
    const traverse = (items: AccountTreeNode[]) => {
      for (const item of items) {
        list.push({ id: item.id, name: item.name, description: item.description, type: item.type });
        if (item.children && item.children.length > 0) {
          traverse(item.children);
        }
      }
    };
    traverse(nodes);
    this.flatAccounts = list;
  }

  private toggleCollapse(id: string) {
    const next = new Set(this.collapsedNodes);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    this.collapsedNodes = next;
  }

  private toggleMenu(accountId: string, e: Event) {
    e.stopPropagation();
    if (this.openMenuAccountId === accountId) {
      this.openMenuAccountId = null;
      this.openMenuUpwards = false;
      return;
    }

    const triggerBtn = e.currentTarget as HTMLElement | null;
    if (triggerBtn) {
      const rect = triggerBtn.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 170px space below the trigger button, pop upwards
      this.openMenuUpwards = spaceBelow < 170;
    } else {
      this.openMenuUpwards = false;
    }

    this.openMenuAccountId = accountId;
  }

  private closeMenu() {
    this.openMenuAccountId = null;
    this.openMenuUpwards = false;
  }

  private openCreateModal(preselectedParentId?: string, preselectedType?: AccountType) {
    this.closeMenu();
    this.editingAccountId = null;
    this.createName = '';
    this.createDescription = '';
    this.createParentId = preselectedParentId || '';

    if (preselectedParentId) {
      const parentAcc = this.flatAccounts.find((a) => a.id === preselectedParentId);
      if (parentAcc) {
        this.createType = parentAcc.type;
      }
    } else {
      this.createType = preselectedType || 'ASSET';
    }

    this.createIcon = this.createType === 'EXPENSE' ? '🛒' : this.createType === 'EQUITY' ? '⚖️' : '🏦';
    this.createColor = this.getDefaultColor(this.createType);
    this.createInitialBalance = '';
    this.isCreateModalOpen = true;
  }

  private openEditModal(node: AccountTreeNode) {
    this.closeMenu();
    this.editingAccountId = node.id;
    this.createName = node.name;
    this.createDescription = node.description || '';
    this.createType = node.type;
    this.createParentId = node.parentId || '';
    this.createIcon = node.icon || (node.type === 'EXPENSE' ? '🛒' : '🏦');
    this.createColor = node.color || this.getDefaultColor(node.type);
    this.isCreateModalOpen = true;
  }

  private getDefaultColor(type: AccountType): string {
    switch (type) {
      case 'ASSET':
        return '#0d9488';
      case 'LIABILITY':
        return '#d97706';
      case 'EQUITY':
        return '#8b5cf6';
      case 'INCOME':
        return '#2563eb';
      case 'EXPENSE':
        return '#e11d48';
    }
  }

  private handleTypeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as AccountType;
    this.createType = val;
    this.createColor = this.getDefaultColor(val);
  }

  private handleParentChange(e: Event) {
    const parentId = (e.target as HTMLSelectElement).value;
    this.createParentId = parentId;
    if (parentId) {
      const parentAcc = this.flatAccounts.find((a) => a.id === parentId);
      if (parentAcc) {
        this.createType = parentAcc.type;
      }
    }
  }

  private async submitCreate(e: Event) {
    e.preventDefault();
    if (!this.createName.trim()) {
      alert('Account name is required');
      return;
    }

    try {
      let initialBalanceCents: number | undefined;
      if (
        !this.editingAccountId &&
        this.createInitialBalance &&
        (this.createType === 'ASSET' || this.createType === 'LIABILITY')
      ) {
        const clean = this.createInitialBalance.replace(',', '.').trim();
        const num = parseFloat(clean);
        if (!isNaN(num) && num !== 0) {
          initialBalanceCents = Math.round(num * 100);
        }
      }

      const payload = {
        name: this.createName.trim(),
        description: this.createDescription.trim() || null,
        type: this.createType,
        parentId: this.createParentId || null,
        icon: this.createIcon.trim() || null,
        color: this.createColor.trim() || null,
        initialBalanceCents,
      };

      const url = this.editingAccountId
        ? `/api/accounts/${this.editingAccountId}`
        : '/api/accounts';
      const method = this.editingAccountId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to ${this.editingAccountId ? 'update' : 'create'} account`);
      }

      this.isCreateModalOpen = false;
      this.editingAccountId = null;
      await this.fetchAccounts();
    } catch (err: any) {
      alert(err.message);
    }
  }

  private async deleteAccount(node: AccountTreeNode) {
    const hasChildren = node.children && node.children.length > 0;
    const confirmPrompt = hasChildren
      ? `Account "${node.name}" has ${node.children.length} sub-account(s). Deleting it will also delete its sub-accounts! Proceed?`
      : `Delete account "${node.name}"?`;

    if (!confirm(confirmPrompt)) {
      return;
    }

    try {
      const res = await fetch(`/api/accounts/${node.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to delete account');
      }

      await this.fetchAccounts();
    } catch (err: any) {
      alert(err.message);
    }
  }

  private handleSearchInput = (e: Event) => {
    this.searchQuery = (e.target as HTMLInputElement).value;
  };

  private handleSearchKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      this.clearSearch();
    }
  };

  private clearSearch() {
    this.searchQuery = '';
  }

  private nodeMatchesSearch(node: AccountTreeNode, query: string): boolean {
    if (!query) return true;
    const nameMatch = node.name.toLowerCase().includes(query);
    const descMatch = node.description ? node.description.toLowerCase().includes(query) : false;
    return nameMatch || descMatch;
  }

  private nodeMatchesType(node: AccountTreeNode): boolean {
    return this.selectedFilter === 'ALL' || node.type === this.selectedFilter;
  }

  private shouldShowNode(node: AccountTreeNode, parentSearchMatched = false): boolean {
    const q = this.searchQuery.trim().toLowerCase();
    const selfSearch = this.nodeMatchesSearch(node, q);
    const selfType = this.nodeMatchesType(node);
    const effectiveSearchMatch = selfSearch || (parentSearchMatched && q.length > 0);

    if (effectiveSearchMatch && selfType) {
      return true;
    }

    if (node.children && node.children.length > 0) {
      return node.children.some((child) =>
        this.shouldShowNode(child, parentSearchMatched || selfSearch)
      );
    }

    return false;
  }

  private isNodeCollapsed(node: AccountTreeNode): boolean {
    if (this.searchQuery.trim().length > 0) {
      return false; // Auto-expand during active search
    }
    return this.collapsedNodes.has(node.id);
  }

  private highlightMatch(text: string, query: string): unknown {
    if (!query || !text) return text;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    if (!lowerText.includes(lowerQuery)) return text;

    const parts: unknown[] = [];
    let cur = 0;
    while (cur < text.length) {
      const matchIndex = lowerText.indexOf(lowerQuery, cur);
      if (matchIndex === -1) {
        parts.push(text.slice(cur));
        break;
      }
      if (matchIndex > cur) {
        parts.push(text.slice(cur, matchIndex));
      }
      parts.push(html`<mark class="search-highlight">${text.slice(matchIndex, matchIndex + query.length)}</mark>`);
      cur = matchIndex + query.length;
    }
    return html`${parts}`;
  }

  private renderNode(node: AccountTreeNode, depth = 0, parentSearchMatched = false): unknown {
    if (!this.shouldShowNode(node, parentSearchMatched)) {
      return nothing;
    }

    const q = this.searchQuery.trim().toLowerCase();
    const selfSearch = this.nodeMatchesSearch(node, q);
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = this.isNodeCollapsed(node);

    return html`
      <li class="tree-node">
        <div class="node-row" style="padding-left: ${1.25 + depth * 1.5}rem;">
          <div class="node-main">
            ${hasChildren
              ? html`
                  <button
                    class="toggle-btn ${isCollapsed ? 'collapsed' : ''}"
                    @click="${() => this.toggleCollapse(node.id)}"
                    aria-label="${isCollapsed ? 'Expand' : 'Collapse'} ${node.name}"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                `
              : html`<span class="toggle-placeholder"></span>`}

            <div class="account-icon" style="color: ${node.color || 'inherit'}; border-color: ${node.color ? `${node.color}40` : 'var(--border-subtle)'}">
              ${node.icon || '📁'}
            </div>

            <div class="account-info" title="${node.description ? `${node.name} — ${node.description}` : node.name}">
              <div class="account-title-row">
                <span class="account-name">${this.highlightMatch(node.name, q)}</span>
                ${hasChildren ? html`<span class="subaccount-pill">${node.children.length} sub</span>` : nothing}
              </div>
              ${node.description ? html`<span class="account-description">${this.highlightMatch(node.description, q)}</span>` : nothing}
            </div>
          </div>

          <div class="node-type">
            <span class="type-badge ${node.type.toLowerCase()}">${node.type}</span>
          </div>

          <div class="node-actions">
            <div class="actions-dropdown-container">
              <button
                class="btn-actions-trigger ${this.openMenuAccountId === node.id ? 'active' : ''}"
                @click="${(e: Event) => this.toggleMenu(node.id, e)}"
                title="Account actions"
                aria-label="Actions for ${node.name}"
              >
                ···
              </button>
              ${this.openMenuAccountId === node.id
                ? html`
                    <div class="actions-menu ${this.openMenuUpwards ? 'open-upwards' : ''}">
                      <button
                        class="actions-menu-item"
                        @click="${() => this.openEditModal(node)}"
                      >
                        <span>✏️</span>
                        <span>Edit Account</span>
                      </button>
                      <button
                        class="actions-menu-item"
                        @click="${() => {
                          this.closeMenu();
                          this.openCreateModal(node.id, node.type);
                        }}"
                      >
                        <span>➕</span>
                        <span>Add Sub-Account</span>
                      </button>
                      <div class="actions-menu-divider"></div>
                      <button
                        class="actions-menu-item danger"
                        @click="${() => {
                          this.closeMenu();
                          this.deleteAccount(node);
                        }}"
                      >
                        <span>🗑️</span>
                        <span>Delete Account</span>
                      </button>
                    </div>
                  `
                : nothing}
            </div>
          </div>
        </div>

        ${hasChildren && !isCollapsed
          ? html`
              <ul class="tree-list children-container">
                ${node.children.map((child) => this.renderNode(child, depth + 1, parentSearchMatched || selfSearch))}
              </ul>
            `
          : nothing}
      </li>
    `;
  }

  override render() {
    const totalCount = this.flatAccounts.length;
    const assetCount = this.flatAccounts.filter((a) => a.type === 'ASSET').length;
    const liabilityCount = this.flatAccounts.filter((a) => a.type === 'LIABILITY').length;
    const equityCount = this.flatAccounts.filter((a) => a.type === 'EQUITY').length;
    const incomeCount = this.flatAccounts.filter((a) => a.type === 'INCOME').length;
    const expenseCount = this.flatAccounts.filter((a) => a.type === 'EXPENSE').length;

    const visibleNodes = this.treeNodes.filter((node) => this.shouldShowNode(node));

    return html`
      <div class="page-header">
        <div class="header-title">
          <h2>Accounts & Categories</h2>
          <p>Hierarchical double-entry ledger tree with custom icons and rollups</p>
        </div>
        <button class="btn-primary" @click="${() => this.openCreateModal()}">
          <span>+</span>
          <span>New Account</span>
        </button>
      </div>

      <!-- Type Filter Tabs & Search -->
      <div class="filter-bar">
        <div class="filter-pills">
          <button
            class="filter-pill ${this.selectedFilter === 'ALL' ? 'active' : ''}"
            @click="${() => (this.selectedFilter = 'ALL')}"
          >
            <span>All Categories</span>
            <span class="badge-count">${totalCount}</span>
          </button>
          <button
            class="filter-pill ${this.selectedFilter === 'ASSET' ? 'active' : ''}"
            @click="${() => (this.selectedFilter = 'ASSET')}"
          >
            <span>Assets</span>
            <span class="badge-count">${assetCount}</span>
          </button>
          <button
            class="filter-pill ${this.selectedFilter === 'LIABILITY' ? 'active' : ''}"
            @click="${() => (this.selectedFilter = 'LIABILITY')}"
          >
            <span>Liabilities</span>
            <span class="badge-count">${liabilityCount}</span>
          </button>
          <button
            class="filter-pill ${this.selectedFilter === 'EQUITY' ? 'active' : ''}"
            @click="${() => (this.selectedFilter = 'EQUITY')}"
          >
            <span>Equity</span>
            <span class="badge-count">${equityCount}</span>
          </button>
          <button
            class="filter-pill ${this.selectedFilter === 'INCOME' ? 'active' : ''}"
            @click="${() => (this.selectedFilter = 'INCOME')}"
          >
            <span>Income</span>
            <span class="badge-count">${incomeCount}</span>
          </button>
          <button
            class="filter-pill ${this.selectedFilter === 'EXPENSE' ? 'active' : ''}"
            @click="${() => (this.selectedFilter = 'EXPENSE')}"
          >
            <span>Expenses</span>
            <span class="badge-count">${expenseCount}</span>
          </button>
        </div>

        <div class="search-box">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            class="search-input"
            placeholder="Search accounts or descriptions..."
            .value="${this.searchQuery}"
            @input="${this.handleSearchInput}"
            @keydown="${this.handleSearchKeyDown}"
            aria-label="Filter accounts"
          />
          ${this.searchQuery ? html`
            <button class="search-clear-btn" @click="${() => this.clearSearch()}" title="Clear search (Esc)" aria-label="Clear search">
              ✕
            </button>
          ` : nothing}
        </div>
      </div>

      <!-- Account Tree Content -->
      <div class="tree-card">
        <div class="tree-header">
          <span>Account Hierarchy</span>
          <span class="tree-header-type">Type</span>
          <span class="tree-header-actions">Actions</span>
        </div>

        ${this.isLoading
          ? html`<div class="loading-state">Loading accounts from PostgreSQL...</div>`
          : this.errorMessage
          ? html`<div class="empty-state"><h4>Error Loading Accounts</h4><p>${this.errorMessage}</p></div>`
          : this.treeNodes.length === 0
          ? html`
              <div class="empty-state">
                <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">📂</div>
                <h4>No Accounts Found</h4>
                <p>Create your first account or run the database seed script.</p>
              </div>
            `
          : visibleNodes.length === 0
          ? html`
              <div class="empty-state">
                <div style="font-size: 2.2rem; margin-bottom: 0.5rem;">🔍</div>
                <h4>No Matching Accounts</h4>
                <p>No accounts found matching "${this.searchQuery}" ${this.selectedFilter !== 'ALL' ? `in ${this.selectedFilter}` : ''}.</p>
                <button class="btn-secondary" style="margin-top: 0.75rem;" @click="${() => this.clearSearch()}">
                  Clear Search
                </button>
              </div>
            `
          : html`
              <ul class="tree-list">
                ${this.treeNodes.map((node) => this.renderNode(node))}
              </ul>
            `}
      </div>

      <!-- Create / Edit Account Modal -->
      ${this.isCreateModalOpen
        ? html`
            <div class="modal-backdrop" @click="${(e: MouseEvent) => {
              if (e.target === e.currentTarget) {
                this.isCreateModalOpen = false;
                this.editingAccountId = null;
              }
            }}">
              <div class="modal-box">
                <div class="modal-header">
                  <h3>
                    ${this.editingAccountId
                      ? 'Edit Account / Category'
                      : (this.createParentId ? 'Add Sub-Account' : 'New Account / Category')}
                  </h3>
                  <button
                    class="modal-close"
                    @click="${() => {
                      this.isCreateModalOpen = false;
                      this.editingAccountId = null;
                    }}"
                  >
                    ✕
                  </button>
                </div>

                <form @submit="${this.submitCreate}">
                  <div class="modal-body">
                    <div class="form-group">
                      <label class="form-label">Account Name</label>
                      <input
                        type="text"
                        class="form-input"
                        placeholder="e.g. Vacation Savings or Fuel"
                        .value="${this.createName}"
                        @input="${(e: any) => (this.createName = e.target.value)}"
                        required
                        autofocus
                      />
                    </div>

                    <div class="form-group">
                      <label class="form-label">Description (Optional)</label>
                      <textarea
                        class="form-textarea"
                        rows="2"
                        placeholder="Detailed info about the intent and scope of this account..."
                        .value="${this.createDescription}"
                        @input="${(e: any) => (this.createDescription = e.target.value)}"
                      ></textarea>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Account Type</label>
                      <select
                        class="form-select"
                        .value="${this.createType}"
                        @change="${this.handleTypeChange}"
                        ?disabled="${Boolean(this.createParentId)}"
                      >
                        <option value="ASSET">ASSET (Liquid, cash, checking)</option>
                        <option value="LIABILITY">LIABILITY (Debt, credit cards)</option>
                        <option value="EQUITY">EQUITY (Opening balances, capital)</option>
                        <option value="INCOME">INCOME (Salary, dividends)</option>
                        <option value="EXPENSE">EXPENSE (Groceries, transport)</option>
                      </select>
                    </div>

                    ${!this.editingAccountId && (this.createType === 'ASSET' || this.createType === 'LIABILITY')
                      ? html`
                          <div class="form-group">
                            <label class="form-label">
                              Initial Balance (Optional)
                              <span style="font-size: 0.75rem; font-weight: normal; color: var(--text-muted);">
                                — auto-creates opening transaction against Equity
                              </span>
                            </label>
                            <input
                              type="text"
                              class="form-input"
                              placeholder="${this.createType === 'ASSET' ? 'e.g. 1500.00' : 'e.g. -450.00'}"
                              .value="${this.createInitialBalance}"
                              @input="${(e: any) => (this.createInitialBalance = e.target.value)}"
                            />
                          </div>
                        `
                      : nothing}

                    <div class="form-group">
                      <label class="form-label">Parent Account (Tree Hierarchy)</label>
                      <select
                        class="form-select"
                        .value="${this.createParentId}"
                        @change="${this.handleParentChange}"
                      >
                        <option value="">None (Top-Level Account)</option>
                        ${this.flatAccounts
                          .filter((acc) => !this.editingAccountId || acc.id !== this.editingAccountId)
                          .map(
                            (acc) => html`
                              <option value="${acc.id}">
                                ${acc.name} (${acc.type})
                              </option>
                            `
                          )}
                      </select>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Icon / Emoji</label>
                      <input
                        type="text"
                        class="form-input"
                        .value="${this.createIcon}"
                        @input="${(e: any) => (this.createIcon = e.target.value)}"
                      />
                      <div class="quick-emojis">
                        ${this.emojiPresets.map(
                          (emoji) => html`
                            <button
                              type="button"
                              class="emoji-pill"
                              @click="${() => (this.createIcon = emoji)}"
                            >
                              ${emoji}
                            </button>
                          `
                        )}
                      </div>
                    </div>

                    <div class="form-group">
                      <label class="form-label">Badge Color</label>
                      <input
                        type="color"
                        class="form-input"
                        style="height: 42px; cursor: pointer;"
                        .value="${this.createColor}"
                        @input="${(e: any) => (this.createColor = e.target.value)}"
                      />
                    </div>
                  </div>

                  <div class="modal-footer">
                    <button
                      type="button"
                      class="btn-secondary"
                      @click="${() => {
                        this.isCreateModalOpen = false;
                        this.editingAccountId = null;
                      }}"
                    >
                      Cancel
                    </button>
                    <button type="submit" class="btn-primary">
                      ${this.editingAccountId ? 'Save Changes' : 'Create Account'}
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
    'penga-accounts': PengaAccounts;
  }
}
