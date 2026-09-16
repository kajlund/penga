import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { live } from 'lit/directives/live.js';
import type { Account, CreateTransactionInput, TransactionWithSplits, Tag, TransactionTemplateWithSplits, CreateTransactionTemplateInput } from '@penga/shared';
import './account-combobox.js';

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
      overflow: visible;
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
      position: relative;
    }

    .split-row:focus-within {
      z-index: 20;
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

    /* Tags Input & Chips */
    .tag-form-group {
      position: relative;
    }

    .tag-input-box {
      min-height: 42px;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-md);
      background: var(--bg-subtle);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      cursor: text;
      transition: all var(--transition-fast);
      box-sizing: border-box;
    }

    .tag-input-box:focus-within {
      border-color: var(--color-primary);
      box-shadow: 0 0 0 2px var(--color-primary-subtle);
      background: var(--bg-surface);
    }

    .selected-tags-list {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.4rem;
      width: 100%;
    }

    .tag-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.2rem 0.55rem;
      border-radius: var(--radius-full);
      font-size: 0.75rem;
      font-weight: 600;
      border: 1px solid;
      line-height: 1.2;
      animation: chipPop 0.15s ease-out;
      user-select: none;
    }

    @keyframes chipPop {
      from { transform: scale(0.85); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .tag-chip-remove {
      background: transparent;
      border: none;
      color: inherit;
      opacity: 0.6;
      cursor: pointer;
      font-size: 0.75rem;
      padding: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      transition: opacity var(--transition-fast);
      line-height: 1;
    }

    .tag-chip-remove:hover {
      opacity: 1;
    }

    .tag-inline-input {
      border: none;
      outline: none;
      background: transparent;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.85rem;
      padding: 0.2rem 0.3rem;
      flex: 1;
      min-width: 140px;
    }

    .tag-inline-input::placeholder {
      color: var(--text-muted);
      font-size: 0.8rem;
    }

    .tag-dropdown {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08);
      z-index: 1050;
      max-height: 190px;
      overflow-y: auto;
      padding: 0.3rem 0;
      display: flex;
      flex-direction: column;
      animation: menuFadeIn var(--transition-fast) ease-out;
    }

    .tag-dropdown-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.85rem;
      background: transparent;
      border: none;
      color: var(--text-primary);
      font-family: var(--font-sans);
      font-size: 0.825rem;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: background var(--transition-fast);
      width: 100%;
    }

    .tag-dropdown-item:hover {
      background: var(--bg-subtle);
      color: var(--color-primary-text);
    }

    .tag-dropdown-item.create-new {
      border-top: 1px solid var(--border-subtle);
      color: var(--color-primary);
      font-weight: 600;
    }

    .tag-dropdown-item.create-new:hover {
      background: var(--color-primary-subtle);
    }

    .tag-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    /* Templates Quick-Bar */
    .template-quick-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 0.75rem;
      background: var(--bg-base);
      border: 1px dashed var(--border-strong);
      border-radius: var(--radius-md);
      margin-bottom: 0.25rem;
    }

    .template-dropdown-wrapper {
      position: relative;
    }

    .btn-template-picker {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.8rem;
      border-radius: var(--radius-md);
      background: var(--color-primary-subtle);
      border: 1px solid var(--color-primary-border);
      color: var(--color-primary-text);
      font-family: var(--font-sans);
      font-size: 0.825rem;
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-template-picker:hover,
    .btn-template-picker.active {
      background: var(--color-primary);
      color: #ffffff;
    }

    .template-badge {
      background: var(--bg-surface);
      color: var(--color-primary-text);
      font-size: 0.7rem;
      padding: 0.1rem 0.45rem;
      border-radius: var(--radius-full);
      font-weight: 700;
    }

    .btn-template-picker.active .template-badge,
    .btn-template-picker:hover .template-badge {
      background: rgba(255, 255, 255, 0.25);
      color: #ffffff;
    }

    .template-dropdown-menu {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      width: 320px;
      max-height: 280px;
      overflow-y: auto;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15), 0 4px 8px rgba(0, 0, 0, 0.08);
      z-index: 1100;
      padding: 0.4rem 0;
      display: flex;
      flex-direction: column;
    }

    .template-dropdown-header {
      padding: 0.45rem 0.85rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-muted);
      border-bottom: 1px solid var(--border-subtle);
    }

    .template-dropdown-empty {
      padding: 1rem;
      font-size: 0.8rem;
      color: var(--text-muted);
      text-align: center;
      line-height: 1.4;
    }

    .template-item-btn {
      display: flex;
      align-items: center;
      gap: 0.65rem;
      padding: 0.6rem 0.85rem;
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;
      cursor: pointer;
      transition: background var(--transition-fast);
      color: var(--text-primary);
    }

    .template-item-btn:hover {
      background: var(--bg-subtle);
    }

    .template-item-icon {
      font-size: 1.1rem;
      width: 28px;
      height: 28px;
      border-radius: var(--radius-sm);
      background: var(--color-primary-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .template-item-info {
      flex: 1;
      min-width: 0;
    }

    .template-item-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--text-primary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .template-item-meta {
      font-size: 0.75rem;
      color: var(--text-muted);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Footer Left Actions */
    .footer-left-actions {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }

    .btn-save-as-template {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.35rem 0.65rem;
      border-radius: var(--radius-sm);
      background: transparent;
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      font-family: var(--font-sans);
      font-size: 0.775rem;
      font-weight: 500;
      cursor: pointer;
      transition: all var(--transition-fast);
    }

    .btn-save-as-template:hover {
      background: var(--bg-subtle);
      border-color: var(--border-default);
      color: var(--text-primary);
    }

    /* Mini Modal for Save Template */
    .sub-modal {
      z-index: 1200;
    }

    .mini-modal-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 420px;
      overflow: hidden;
      animation: cardPopIn 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .mini-modal-header {
      padding: 1rem 1.25rem;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .mini-modal-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--text-primary);
    }

    .mini-modal-body {
      padding: 1.25rem;
    }

    .mini-modal-footer {
      padding: 0.85rem 1.25rem;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.65rem;
      background: var(--bg-surface);
    }
  `;

  @property({ type: Boolean })
  isOpen = false;

  @property({ type: Object })
  transactionToEdit: TransactionWithSplits | null = null;

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
  private availableTags: Tag[] = [];

  @state()
  private selectedTagIds = new Set<string>();

  @state()
  private tagSearchInput = '';

  @state()
  private isTagDropdownOpen = false;

  @state()
  private splitRows: SplitRowState[] = [
    { id: '1', accountId: '', amount: '-0.00' },
    { id: '2', accountId: '', amount: '0.00' },
  ];

  @state()
  private isSubmitting = false;

  @state()
  private availableTemplates: TransactionTemplateWithSplits[] = [];

  @state()
  private isTemplateDropdownOpen = false;

  @state()
  private isSaveTemplateModalOpen = false;

  @state()
  private saveTemplateName = '';

  @state()
  private isSavingTemplate = false;

  override connectedCallback() {
    super.connectedCallback();
    this.fetchAccounts();
    this.fetchTags();
    this.fetchTemplates();
    window.addEventListener('keydown', this.handleGlobalKeyDown);
    window.addEventListener('click', this.handleWindowClick);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleGlobalKeyDown);
    window.removeEventListener('click', this.handleWindowClick);
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

  async fetchTags() {
    try {
      const res = await fetch('/api/tags');
      if (res.ok) {
        const json = await res.json();
        this.availableTags = json.data || [];
      }
    } catch (err) {
      console.warn('Could not load tags list for transaction form', err);
    }
  }

  private normalizeTagName(val: string): string {
    return val.replace(/^#+/, '').trim().toLowerCase();
  }

  private selectTag(tagId: string) {
    const next = new Set(this.selectedTagIds);
    next.add(tagId);
    this.selectedTagIds = next;
    this.tagSearchInput = '';
    this.isTagDropdownOpen = false;
  }

  private removeTag(tagId: string, e?: Event) {
    e?.stopPropagation();
    const next = new Set(this.selectedTagIds);
    next.delete(tagId);
    this.selectedTagIds = next;
  }

  private async createAndSelectTag() {
    const raw = this.normalizeTagName(this.tagSearchInput);
    if (!raw) return;

    try {
      const res = await fetch('/api/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: raw }),
      });
      if (res.ok) {
        const json = await res.json();
        const tag = json.data as Tag;
        if (!this.availableTags.some((t) => t.id === tag.id)) {
          this.availableTags = [...this.availableTags, tag];
        }
        this.selectTag(tag.id);
      }
    } catch (err) {
      console.error('Failed to create tag', err);
    }
  }

  private handleTagKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const raw = this.normalizeTagName(this.tagSearchInput);
      if (!raw) return;

      const matched = this.availableTags.find((t) => t.name.toLowerCase() === raw.toLowerCase());
      if (matched) {
        this.selectTag(matched.id);
      } else {
        this.createAndSelectTag();
      }
    } else if (e.key === 'Backspace' && !this.tagSearchInput && this.selectedTagIds.size > 0) {
      const arr = Array.from(this.selectedTagIds);
      this.removeTag(arr[arr.length - 1]);
    } else if (e.key === 'Escape') {
      this.isTagDropdownOpen = false;
    }
  };

  private handleTagSearchInput = (e: Event) => {
    this.tagSearchInput = (e.target as HTMLInputElement).value;
    this.isTagDropdownOpen = true;
  };

  private focusTagInput = () => {
    const input = this.shadowRoot?.getElementById('tag-input-field') as HTMLInputElement | null;
    input?.focus();
    this.isTagDropdownOpen = true;
  };

  private handleWindowClick = (e: MouseEvent) => {
    const path = e.composedPath();
    const isTagClick = path.some((el) => el instanceof HTMLElement && el.classList?.contains('tag-form-group'));
    if (!isTagClick) {
      this.isTagDropdownOpen = false;
    }

    const isTplClick = path.some((el) => el instanceof HTMLElement && (el.classList?.contains('template-dropdown-wrapper') || el.classList?.contains('btn-template-picker')));
    if (!isTplClick) {
      this.isTemplateDropdownOpen = false;
    }
  };

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
    if (changedProps.has('transactionToEdit') && this.transactionToEdit) {
      this.populateForEdit(this.transactionToEdit);
    } else if (changedProps.has('isOpen') && this.isOpen && !changedProps.get('isOpen')) {
      this.fetchAccounts();
      this.fetchTags();
      this.fetchTemplates();
      if (!this.transactionToEdit) {
        this.resetForm();
      }
    }
  }

  private populateForEdit(tx: TransactionWithSplits) {
    this.transactionToEdit = tx;
    this.transactionDate = tx.transactionDate;
    this.payee = tx.payee || '';
    this.note = tx.note || '';
    this.isCleared = tx.isCleared;
    this.isSubmitting = false;
    this.selectedTagIds = new Set((tx.tags || []).map((t) => t.id));
    this.tagSearchInput = '';
    this.isTagDropdownOpen = false;

    this.splitRows = (tx.splits || []).map((s, idx) => ({
      id: s.id || `split-${idx}-${Date.now()}`,
      accountId: s.accountId,
      amount: this.formatCentsToDecimal(s.amountCents),
    }));
  }

  private resetForm(preselectedAccountId?: string) {
    this.transactionToEdit = null;
    this.transactionDate = new Date().toISOString().slice(0, 10);
    this.payee = '';
    this.note = '';
    this.isCleared = false;
    this.isSubmitting = false;
    this.selectedTagIds = new Set();
    this.tagSearchInput = '';
    this.isTagDropdownOpen = false;

    const sourceAccId = preselectedAccountId || (this.availableAccounts[0]?.id || '');
    const destAccId = this.availableAccounts.find((a) => a.id !== sourceAccId)?.id || '';

    this.splitRows = [
      { id: `row-1-${Date.now()}`, accountId: sourceAccId, amount: '' },
      { id: `row-2-${Date.now()}`, accountId: destAccId, amount: '' },
    ];
  }

  public async fetchTemplates() {
    try {
      const res = await fetch('/api/templates');
      if (res.ok) {
        const json = await res.json();
        this.availableTemplates = json.data || [];
      }
    } catch (err) {
      console.warn('Could not load templates for transaction form', err);
    }
  }

  private toggleTemplateDropdown = (e: Event) => {
    e.stopPropagation();
    this.isTemplateDropdownOpen = !this.isTemplateDropdownOpen;
  };

  public applyTemplate(tpl: TransactionTemplateWithSplits) {
    if (tpl.payee) this.payee = tpl.payee;
    if (tpl.note) this.note = tpl.note;
    if (tpl.splits && tpl.splits.length > 0) {
      this.splitRows = tpl.splits.map((s, idx) => ({
        id: `tpl-split-${idx}-${Date.now()}`,
        accountId: s.accountId,
        amount: s.amountCents !== 0 ? this.formatCentsToDecimal(s.amountCents) : '',
      }));
    }
    if (tpl.tags && tpl.tags.length > 0) {
      this.selectedTagIds = new Set(tpl.tags.map((t) => t.id));
    }
    this.isTemplateDropdownOpen = false;
  }

  public openWithTemplate(tpl: TransactionTemplateWithSplits) {
    this.fetchAccounts();
    this.fetchTags();
    this.fetchTemplates();
    this.resetForm();
    this.applyTemplate(tpl);
    this.isOpen = true;
    this.requestUpdate();
  }

  public openWithDuplicate(tx: TransactionWithSplits) {
    this.fetchAccounts();
    this.fetchTags();
    this.fetchTemplates();
    this.resetForm();
    this.transactionDate = new Date().toISOString().slice(0, 10);
    this.payee = tx.payee || '';
    this.note = tx.note || '';
    this.isCleared = false;
    this.selectedTagIds = new Set((tx.tags || []).map((t) => t.id));
    this.splitRows = (tx.splits || []).map((s, idx) => ({
      id: `dup-split-${idx}-${Date.now()}`,
      accountId: s.accountId,
      amount: this.formatCentsToDecimal(s.amountCents),
    }));
    this.isOpen = true;
    this.requestUpdate();
  }

  private handleOpenSaveTemplateModal() {
    this.saveTemplateName = this.payee.trim() || 'My Template';
    this.isSaveTemplateModalOpen = true;
  }

  private async confirmSaveAsTemplate() {
    const name = this.saveTemplateName.trim();
    if (!name) {
      alert('Please enter a name for this template');
      return;
    }

    if (this.splitRows.some((r) => !r.accountId)) {
      alert('All split rows must have an account selected');
      return;
    }

    this.isSavingTemplate = true;

    try {
      const payload: CreateTransactionTemplateInput = {
        name,
        payee: this.payee.trim() || null,
        note: this.note.trim() || null,
        splits: this.splitRows.map((r, idx) => ({
          accountId: r.accountId,
          amountCents: this.parseCents(r.amount),
          sortOrder: idx,
        })),
        tagIds: Array.from(this.selectedTagIds),
      };

      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Failed to save template');
      }

      await this.fetchTemplates();
      this.isSaveTemplateModalOpen = false;
    } catch (err: any) {
      alert(err.message);
    } finally {
      this.isSavingTemplate = false;
    }
  }

  public open(preselectedAccountId?: string) {
    this.fetchAccounts();
    this.fetchTags();
    this.fetchTemplates();
    this.resetForm(preselectedAccountId);
    this.isOpen = true;
    this.requestUpdate();
  }

  public edit(tx: TransactionWithSplits) {
    this.fetchAccounts();
    this.fetchTags();
    this.fetchTemplates();
    this.populateForEdit(tx);
    this.isOpen = true;
    this.requestUpdate();
  }

  public closeModal() {
    this.isOpen = false;
    this.transactionToEdit = null;
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
      const isEditing = Boolean(this.transactionToEdit);
      const url = isEditing
        ? `/api/transactions/${this.transactionToEdit!.id}`
        : '/api/transactions';
      const method = isEditing ? 'PATCH' : 'POST';

      const payload = {
        transactionDate: this.transactionDate,
        payee: this.payee.trim(),
        note: this.note.trim() || null,
        isCleared: this.isCleared,
        splits: this.splitRows.map((r) => ({
          accountId: r.accountId,
          amountCents: this.parseCents(r.amount),
        })),
        tagIds: Array.from(this.selectedTagIds),
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to ${isEditing ? 'update' : 'record'} transaction`);
      }

      const json = await res.json();
      const eventName = isEditing ? 'transaction-updated' : 'transaction-created';
      this.dispatchEvent(
        new CustomEvent(eventName, {
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
              <h3>${this.transactionToEdit ? 'Edit Transaction' : 'Record Transaction'}</h3>
              <p>
                ${this.transactionToEdit
                  ? 'Modify payee, transaction date, notes, and balanced split lines'
                  : 'Double-entry split ledger with real-time balance validation'}
              </p>
            </div>
            <button class="close-btn" @click="${this.closeModal}" aria-label="Close modal">✕</button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            <!-- Templates Quick-Bar (when recording new transaction) -->
            ${!this.transactionToEdit
              ? html`
                  <div class="template-quick-bar">
                    <div class="template-dropdown-wrapper">
                      <button
                        type="button"
                        class="btn-template-picker ${this.isTemplateDropdownOpen ? 'active' : ''}"
                        @click="${this.toggleTemplateDropdown}"
                      >
                        <span>⚡</span>
                        <span>Use Template</span>
                        <span class="template-badge">${this.availableTemplates.length}</span>
                        <span>${this.isTemplateDropdownOpen ? '▲' : '▼'}</span>
                      </button>

                      ${this.isTemplateDropdownOpen
                        ? html`
                            <div class="template-dropdown-menu">
                              <div class="template-dropdown-header">Saved Templates</div>
                              ${this.availableTemplates.length === 0
                                ? html`
                                    <div class="template-dropdown-empty">
                                      No templates yet. Set up split lines and click "Save as Template" below.
                                    </div>
                                  `
                                : this.availableTemplates.map(
                                    (tpl) => html`
                                      <button
                                        type="button"
                                        class="template-item-btn"
                                        @click="${() => this.applyTemplate(tpl)}"
                                      >
                                        <span class="template-item-icon">${tpl.icon || '⚡'}</span>
                                        <div class="template-item-info">
                                          <div class="template-item-name">${tpl.name}</div>
                                          <div class="template-item-meta">
                                            ${tpl.payee ? html`<span>🏢 ${tpl.payee}</span>` : nothing}
                                            <span>(${tpl.splits.length} splits)</span>
                                          </div>
                                        </div>
                                      </button>
                                    `
                                  )}
                            </div>
                          `
                        : nothing}
                    </div>
                    <span style="font-size: 0.775rem; color: var(--text-muted);">
                      Speed up recurring entries with 1 click
                    </span>
                  </div>
                `
              : nothing}

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

            <!-- Tags Section -->
            <div class="form-group tag-form-group">
              <label class="form-label">Tags (Cross-cutting labels)</label>
              <div class="tag-input-box" @click="${this.focusTagInput}">
                <div class="selected-tags-list">
                  ${Array.from(this.selectedTagIds).map((id) => {
                    const tag = this.availableTags.find((t) => t.id === id);
                    if (!tag) return nothing;
                    const color = tag.color || '#6366f1';
                    return html`
                      <span
                        class="tag-chip"
                        style="background: ${color}1c; color: ${color}; border-color: ${color}45;"
                      >
                        <span>#${tag.name}</span>
                        <button
                          type="button"
                          class="tag-chip-remove"
                          @click="${(e: Event) => this.removeTag(id, e)}"
                          title="Remove tag"
                          aria-label="Remove tag ${tag.name}"
                        >
                          ✕
                        </button>
                      </span>
                    `;
                  })}
                  <input
                    type="text"
                    id="tag-input-field"
                    class="tag-inline-input"
                    placeholder="${this.selectedTagIds.size === 0 ? 'Type tag name e.g. vacation, tax-deductible...' : 'Add another tag...'}"
                    .value="${this.tagSearchInput}"
                    @input="${this.handleTagSearchInput}"
                    @keydown="${this.handleTagKeyDown}"
                    @focus="${() => (this.isTagDropdownOpen = true)}"
                  />
                </div>
              </div>

              ${(() => {
                const rawSearch = this.normalizeTagName(this.tagSearchInput);
                const unselectedTags = this.availableTags.filter((t) => !this.selectedTagIds.has(t.id));
                const suggestedTags = rawSearch
                  ? unselectedTags.filter((t) => t.name.toLowerCase().includes(rawSearch))
                  : unselectedTags;
                const exactMatchExists = this.availableTags.some((t) => t.name.toLowerCase() === rawSearch);
                const canCreateNewTag = rawSearch.length > 0 && !exactMatchExists;

                if (!this.isTagDropdownOpen || (suggestedTags.length === 0 && !canCreateNewTag)) {
                  return nothing;
                }

                return html`
                  <div class="tag-dropdown">
                    ${suggestedTags.map(
                      (tag) => html`
                        <button
                          type="button"
                          class="tag-dropdown-item"
                          @click="${() => this.selectTag(tag.id)}"
                        >
                          <span class="tag-dot" style="background: ${tag.color || '#6366f1'};"></span>
                          <span>#${tag.name}</span>
                        </button>
                      `
                    )}
                    ${canCreateNewTag
                      ? html`
                          <button
                            type="button"
                            class="tag-dropdown-item create-new"
                            @click="${this.createAndSelectTag}"
                          >
                            <span>➕ Create new tag "<strong>#${rawSearch}</strong>" (Press Enter)</span>
                          </button>
                        `
                      : nothing}
                  </div>
                `;
              })()}
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
                      <!-- Account Combobox (Search by typing) -->
                      <account-combobox
                        .accounts="${this.availableAccounts}"
                        .value="${row.accountId}"
                        placeholder="Type to search account..."
                        @account-selected="${(e: CustomEvent) => this.handleAccountSelect(row.id, e.detail.accountId)}"
                      ></account-combobox>

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
            <div class="footer-left-actions">
              <div class="keyboard-hint">
                <span>Shortcut:</span>
                <span class="kbd">Ctrl</span>+<span class="kbd">Enter</span>
                <span>to record</span>
              </div>
              <button
                type="button"
                class="btn-save-as-template"
                @click="${this.handleOpenSaveTemplateModal}"
                title="Save current split setup as a reusable template"
              >
                <span>⭐</span>
                <span>Save as Template</span>
              </button>
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
                title="${validation.isValid ? (this.transactionToEdit ? 'Save changes (Ctrl+Enter)' : 'Record transaction (Ctrl+Enter)') : validation.message}"
              >
                ${this.isSubmitting
                  ? (this.transactionToEdit ? 'Saving...' : 'Recording...')
                  : (this.transactionToEdit ? 'Save Changes' : 'Record Transaction')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Save as Template Mini Modal -->
      ${this.isSaveTemplateModalOpen
        ? html`
            <div
              class="modal-backdrop sub-modal"
              @click="${(e: MouseEvent) => {
                if (e.target === e.currentTarget) this.isSaveTemplateModalOpen = false;
              }}"
            >
              <div class="mini-modal-card">
                <div class="mini-modal-header">
                  <h4>⭐ Save as Template</h4>
                  <button class="close-btn" @click="${() => (this.isSaveTemplateModalOpen = false)}">✕</button>
                </div>
                <div class="mini-modal-body">
                  <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">
                    Save this transaction's split structure, accounts, amounts, payee, and tags as a template.
                  </p>
                  <div class="form-group" style="margin-top: 1rem;">
                    <label class="form-label">Template Name *</label>
                    <input
                      type="text"
                      class="form-input"
                      placeholder="e.g. Monthly Rent, Paycheck, Netflix..."
                      .value="${this.saveTemplateName}"
                      @input="${(e: any) => (this.saveTemplateName = e.target.value)}"
                      @keydown="${(e: KeyboardEvent) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          this.confirmSaveAsTemplate();
                        }
                      }}"
                      autofocus
                    />
                  </div>
                </div>
                <div class="mini-modal-footer">
                  <button class="btn-cancel" @click="${() => (this.isSaveTemplateModalOpen = false)}">
                    Cancel
                  </button>
                  <button
                    class="btn-submit"
                    ?disabled="${this.isSavingTemplate}"
                    @click="${this.confirmSaveAsTemplate}"
                  >
                    ${this.isSavingTemplate ? 'Saving...' : 'Save Template'}
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
    'transaction-form': TransactionForm;
  }
}
