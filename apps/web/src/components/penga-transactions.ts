import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { TransactionWithSplits, Account, Tag } from '@penga/shared';

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
      overflow: visible;
    }

    .ledger-header {
      display: grid;
      grid-template-columns: 24px 105px 1fr 115px 75px 32px;
      gap: 0.75rem;
      padding: 0.75rem 0.85rem 0.75rem 0.5rem;
      background: var(--bg-subtle);
      border-bottom: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      align-items: center;
    }

    .transaction-row {
      display: flex;
      flex-direction: column;
      border-bottom: 1px solid var(--border-subtle);
      transition: background-color var(--transition-fast), border var(--transition-fast);
      position: relative;
    }

    .transaction-row:last-child {
      border-bottom: none;
    }

    .transaction-row:hover {
      background: var(--bg-subtle);
    }

    .transaction-row.dragging {
      opacity: 0.35;
      background: var(--bg-subtle);
    }

    .transaction-row.drag-over-top {
      border-top: 2px solid var(--color-primary);
    }

    .transaction-row.drag-over-bottom {
      border-bottom: 2px solid var(--color-primary);
    }

    .tx-main {
      display: grid;
      grid-template-columns: 24px 105px 1fr 115px 75px 32px;
      align-items: center;
      padding: 0.85rem 0.85rem 0.85rem 0.5rem;
      gap: 0.75rem;
    }

    /* Drag Handle */
    .drag-handle-cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .drag-handle {
      width: 24px;
      height: 24px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-sm);
      color: var(--text-muted);
      font-size: 1rem;
      line-height: 1;
      user-select: none;
      transition: all var(--transition-fast);
    }

    .drag-handle.draggable {
      cursor: grab;
    }

    .drag-handle.draggable:hover {
      background: var(--bg-muted);
      color: var(--text-primary);
    }

    .drag-handle.draggable:active {
      cursor: grabbing;
    }

    .drag-handle.disabled {
      opacity: 0.2;
      cursor: not-allowed;
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

    .tx-payee-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
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

    .tx-tags-list {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      flex-wrap: wrap;
    }

    .tx-tag-badge {
      display: inline-flex;
      align-items: center;
      font-size: 0.72rem;
      font-weight: 600;
      padding: 0.15rem 0.45rem;
      border-radius: var(--radius-full);
      background: color-mix(in srgb, var(--tag-color, #6366f1) 15%, transparent);
      color: var(--tag-color, #6366f1);
      border: 1px solid color-mix(in srgb, var(--tag-color, #6366f1) 30%, transparent);
      letter-spacing: 0.01em;
      line-height: 1.2;
    }

    .tx-note {
      font-size: 0.82rem;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .status-cell {
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Interactive Cleared Toggle Button */
    .cleared-toggle {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.45rem;
      padding: 0.32rem 0.75rem;
      border-radius: var(--radius-full);
      font-size: 0.78rem;
      font-weight: 600;
      min-width: 96px;
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
      font-size: 0.82rem;
      color: var(--text-muted);
      text-align: center;
      font-family: var(--font-mono);
    }

    .tx-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
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
      padding: 0.5rem 0.85rem;
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

    .actions-menu-item:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }

    .actions-menu-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 0.35rem 0;
    }

    /* Nested Splits Detail */
    .splits-detail-list {
      padding: 0.65rem 0.85rem 0.85rem 2.25rem;
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
      font-size: 0.85rem;
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
      font-size: 0.875rem;
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
  private tags: Tag[] = [];

  @state()
  private selectedFilter: 'ALL' | 'UNCLEARED' | 'CLEARED' = 'ALL';

  @state()
  private selectedAccountId = '';

  @state()
  private selectedTagId = '';

  @state()
  private isLoading = true;

  @state()
  private errorMessage: string | null = null;

  @state()
  private updatingTxId: string | null = null;

  @state()
  private draggedTxId: string | null = null;

  @state()
  private dragOverTxId: string | null = null;

  @state()
  private dragOverPosition: 'top' | 'bottom' | null = null;

  @state()
  private openMenuTxId: string | null = null;

  @state()
  private openMenuUpwards = false;

  override connectedCallback() {
    super.connectedCallback();
    if (this.reconciliationMode) {
      this.selectedFilter = 'ALL';
    }
    this.fetchData();
    window.addEventListener('click', this.handleWindowClick);
    window.addEventListener('keydown', this.handleWindowKeyDown);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this.handleWindowClick);
    window.removeEventListener('keydown', this.handleWindowKeyDown);
  }

  private handleWindowClick = () => {
    if (this.openMenuTxId) {
      this.openMenuTxId = null;
      this.openMenuUpwards = false;
    }
  };

  private handleWindowKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.openMenuTxId) {
      this.openMenuTxId = null;
      this.openMenuUpwards = false;
    }
  };

  private toggleMenu(e: Event, txId: string) {
    e.stopPropagation();
    if (this.openMenuTxId === txId) {
      this.openMenuTxId = null;
      this.openMenuUpwards = false;
      return;
    }

    const triggerBtn = e.currentTarget as HTMLElement | null;
    if (triggerBtn) {
      const rect = triggerBtn.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      this.openMenuUpwards = spaceBelow < 170;
    } else {
      this.openMenuUpwards = false;
    }

    this.openMenuTxId = txId;
  }

  private closeMenu() {
    this.openMenuTxId = null;
    this.openMenuUpwards = false;
  }

  public async fetchData() {
    await Promise.all([this.fetchTransactions(), this.fetchAccounts(), this.fetchTags()]);
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

  public async fetchTags() {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const json = await res.json();
        this.tags = json.data || [];
      }
    } catch {
      // Non-blocking
    }
  }

  public async fetchTransactions() {
    this.isLoading = true;
    this.errorMessage = null;

    try {
      const params = new URLSearchParams();
      if (this.selectedAccountId) params.append('accountId', this.selectedAccountId);
      if (this.selectedTagId) params.append('tagId', this.selectedTagId);

      const queryString = params.toString();
      const url = queryString ? `/api/transactions?${queryString}` : '/api/transactions';

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

  private handleTagFilterChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    this.selectedTagId = target.value;
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

  private handleDragStart(e: DragEvent, tx: TransactionWithSplits, canReorder: boolean) {
    if (!canReorder) {
      e.preventDefault();
      return;
    }
    this.draggedTxId = tx.id;
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', tx.id);
      e.dataTransfer.effectAllowed = 'move';
    }
  }

  private handleDragOver(e: DragEvent, targetTx: TransactionWithSplits) {
    if (!this.draggedTxId || this.draggedTxId === targetTx.id) return;

    const draggedTx = this.transactions.find((t) => t.id === this.draggedTxId);
    if (!draggedTx || draggedTx.transactionDate !== targetTx.transactionDate) {
      return;
    }

    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position = e.clientY < midY ? 'top' : 'bottom';

    if (this.dragOverTxId !== targetTx.id || this.dragOverPosition !== position) {
      this.dragOverTxId = targetTx.id;
      this.dragOverPosition = position;
    }
  }

  private handleDragLeave(e: DragEvent, targetTx: TransactionWithSplits) {
    const related = e.relatedTarget as HTMLElement | null;
    const current = e.currentTarget as HTMLElement;
    if (!related || !current.contains(related)) {
      if (this.dragOverTxId === targetTx.id) {
        this.dragOverTxId = null;
        this.dragOverPosition = null;
      }
    }
  }

  private async handleDrop(e: DragEvent, targetTx: TransactionWithSplits) {
    e.preventDefault();
    const draggedId = this.draggedTxId;
    const position = this.dragOverPosition;

    this.draggedTxId = null;
    this.dragOverTxId = null;
    this.dragOverPosition = null;

    if (!draggedId || draggedId === targetTx.id) return;

    const draggedTx = this.transactions.find((t) => t.id === draggedId);
    if (!draggedTx || draggedTx.transactionDate !== targetTx.transactionDate) return;

    // Get all transactions on this date ordered by current sortOrder
    const sameDateTxs = this.transactions
      .filter((t) => t.transactionDate === targetTx.transactionDate)
      .slice();

    const fromIndex = sameDateTxs.findIndex((t) => t.id === draggedId);
    if (fromIndex === -1) return;

    // Remove dragged item
    const [moved] = sameDateTxs.splice(fromIndex, 1);

    // Find new insertion index
    let toIndex = sameDateTxs.findIndex((t) => t.id === targetTx.id);
    if (toIndex === -1) return;

    if (position === 'bottom') {
      toIndex += 1;
    }

    sameDateTxs.splice(toIndex, 0, moved);

    // Reassign sortOrder sequentially
    const updatedMap = new Map<string, number>();
    sameDateTxs.forEach((t, idx) => {
      t.sortOrder = idx;
      updatedMap.set(t.id, idx);
    });

    // Optimistic UI update
    this.transactions = this.transactions
      .map((t) => (updatedMap.has(t.id) ? { ...t, sortOrder: updatedMap.get(t.id)! } : t))
      .sort((a, b) => {
        if (a.transactionDate !== b.transactionDate) {
          return b.transactionDate.localeCompare(a.transactionDate);
        }
        return a.sortOrder - b.sortOrder;
      });

    // Persist via backend batch reorder API
    try {
      await fetch('/api/transactions/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: sameDateTxs.map((t) => ({ id: t.id, sortOrder: t.sortOrder })),
        }),
      });
    } catch (err) {
      console.error('Failed to persist drag reordering:', err);
      this.fetchTransactions();
    }
  }

  private handleDragEnd = () => {
    this.draggedTxId = null;
    this.dragOverTxId = null;
    this.dragOverPosition = null;
  };

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

  private handleDuplicateTransaction(tx: TransactionWithSplits) {
    this.dispatchEvent(
      new CustomEvent('duplicate-transaction', {
        detail: { transaction: tx },
        bubbles: true,
        composed: true,
      })
    );
  }

  private async handleSaveAsTemplate(tx: TransactionWithSplits) {
    const templateName = prompt('Enter a name for this template:', tx.payee || 'Transaction Template');
    if (!templateName || !templateName.trim()) return;

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName.trim(),
          payee: tx.payee,
          note: tx.note,
          splits: tx.splits.map((s, idx) => ({
            accountId: s.accountId,
            amountCents: s.amountCents,
            sortOrder: idx,
          })),
          tagIds: (tx.tags || []).map((t) => t.id),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save template');
      }

      alert(`Template "${templateName.trim()}" saved successfully!`);
    } catch (err: any) {
      alert(err.message);
    }
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

        <div style="display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;">
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

          <select
            class="account-select"
            .value="${this.selectedTagId}"
            @change="${this.handleTagFilterChange}"
            aria-label="Filter by tag"
          >
            <option value="">All Tags</option>
            ${this.tags.map(
              (tag) => html`
                <option value="${tag.id}">🏷️ #${tag.name}</option>
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
          <span style="text-align: center; color: var(--text-muted); opacity: 0.4; font-size: 0.85rem;" title="Drag handle to reorder within date">⠿</span>
          <span>Date</span>
          <span>Payee & Notes</span>
          <span style="text-align: center;">Status</span>
          <span style="text-align: center;">Lines</span>
          <span></span>
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
                    <div
                      class="transaction-row ${this.draggedTxId === tx.id ? 'dragging' : ''} ${this.dragOverTxId === tx.id ? `drag-over-${this.dragOverPosition}` : ''}"
                      @dragover="${(e: DragEvent) => this.handleDragOver(e, tx)}"
                      @dragleave="${(e: DragEvent) => this.handleDragLeave(e, tx)}"
                      @drop="${(e: DragEvent) => this.handleDrop(e, tx)}"
                    >
                      <div class="tx-main">
                        <!-- Intraday drag handle -->
                        <div
                          class="drag-handle-cell"
                          title="${canReorder ? 'Drag to reorder within this date' : 'Single transaction on this date'}"
                        >
                          <div
                            class="drag-handle ${canReorder ? 'draggable' : 'disabled'}"
                            draggable="${canReorder ? 'true' : 'false'}"
                            @dragstart="${(e: DragEvent) => this.handleDragStart(e, tx, canReorder)}"
                            @dragend="${this.handleDragEnd}"
                          >
                            ⠿
                          </div>
                        </div>

                        <span class="tx-date">${tx.transactionDate}</span>

                        <div class="tx-payee-group">
                          <div class="tx-payee-row">
                            <span class="tx-payee">${tx.payee || 'Unnamed Event'}</span>
                            ${tx.tags && tx.tags.length > 0
                              ? html`
                                  <div class="tx-tags-list">
                                    ${tx.tags.map(
                                      (tag) => html`
                                        <span
                                          class="tx-tag-badge"
                                          style="--tag-color: ${tag.color || '#6366f1'};"
                                        >
                                          #${tag.name}
                                        </span>
                                      `
                                    )}
                                  </div>
                                `
                              : nothing}
                          </div>
                          ${tx.note ? html`<span class="tx-note">${tx.note}</span>` : nothing}
                        </div>

                        <!-- One-click Reconciliation Toggle -->
                        <div class="status-cell">
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
                          <div class="actions-dropdown-container">
                            <button
                              type="button"
                              class="btn-actions-trigger ${this.openMenuTxId === tx.id ? 'active' : ''}"
                              @click="${(e: Event) => this.toggleMenu(e, tx.id)}"
                              title="Transaction actions"
                              aria-label="Actions"
                            >
                              ···
                            </button>

                             ${this.openMenuTxId === tx.id
                              ? html`
                                  <div class="actions-menu ${this.openMenuUpwards ? 'open-upwards' : ''}" @click="${(e: Event) => e.stopPropagation()}">
                                    <button
                                      type="button"
                                      class="actions-menu-item"
                                      @click="${() => {
                                        this.closeMenu();
                                        this.handleEditTransaction(tx);
                                      }}"
                                    >
                                      <span>✏️</span>
                                      <span>Edit Transaction</span>
                                    </button>

                                    <button
                                      type="button"
                                      class="actions-menu-item"
                                      @click="${() => {
                                        this.closeMenu();
                                        this.handleDuplicateTransaction(tx);
                                      }}"
                                    >
                                      <span>⚡</span>
                                      <span>Duplicate as New</span>
                                    </button>

                                    <button
                                      type="button"
                                      class="actions-menu-item"
                                      @click="${() => {
                                        this.closeMenu();
                                        this.handleSaveAsTemplate(tx);
                                      }}"
                                    >
                                      <span>⭐</span>
                                      <span>Save as Template</span>
                                    </button>

                                    <button
                                      type="button"
                                      class="actions-menu-item"
                                      @click="${() => {
                                        this.closeMenu();
                                        this.toggleCleared(tx);
                                      }}"
                                    >
                                      <span>${tx.isCleared ? '○' : '✓'}</span>
                                      <span>Mark as ${tx.isCleared ? 'Uncleared' : 'Cleared'}</span>
                                    </button>

                                    <div class="actions-menu-divider"></div>

                                    <button
                                      type="button"
                                      class="actions-menu-item"
                                      ?disabled="${!canReorder || isFirst}"
                                      @click="${() => {
                                        this.closeMenu();
                                        this.moveTransaction(tx, 'up');
                                      }}"
                                    >
                                      <span>▲</span>
                                      <span>Move Earlier</span>
                                    </button>

                                    <button
                                      type="button"
                                      class="actions-menu-item"
                                      ?disabled="${!canReorder || isLast}"
                                      @click="${() => {
                                        this.closeMenu();
                                        this.moveTransaction(tx, 'down');
                                      }}"
                                    >
                                      <span>▼</span>
                                      <span>Move Later</span>
                                    </button>
                                  </div>
                                `
                              : nothing}
                          </div>
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
