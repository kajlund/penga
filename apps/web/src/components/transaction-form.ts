import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';
import { live } from 'lit/directives/live.js';
import type { Account, TransactionWithSplits, Tag, TransactionTemplateWithSplits, CreateTransactionTemplateInput } from '@penga/shared';
import { newEntry, newRow, entryFromSplits, entrySplits, entryErrors, buildEntryTransaction, parseMoney, formatMoney, APP_CURRENCY, allocationSummary, useRemaining, isBalanceAccount, type TransactionEntry, type EntryKind } from '@penga/shared';
import './account-combobox.js';

interface SplitRowState {
  id: string;
  accountId: string;
  amount: string; // user-typed decimal representation, e.g. "-45.50" or "45.50"
}

@customElement('transaction-form')
export class TransactionForm extends LitElement {
  static override styles = css`
    .type-selector { display: flex; flex-wrap: wrap; gap: .4rem; }
    .type-selector button { flex: 1; }
    button[aria-pressed="true"] { background: var(--color-primary-subtle); border-color: var(--color-primary); color: var(--text-primary); }
    .advanced-action { align-self: flex-start; }
    .balance-summary { display: flex; flex-wrap: wrap; gap: 1rem; font-size: .85rem; }
    .balance-summary strong { display: block; margin-top: .25rem; }
    .entry-help { font-size: .8rem; color: var(--text-secondary); margin: 0; line-height: 1.5; }
    .field-error { color: var(--color-expense); }
    .more-details summary { cursor: pointer; font-weight: 600; padding-bottom: 1rem; }
    .more-details > div { margin-bottom: 1rem; }
    .split-row-controls { flex-wrap: wrap; min-width: 0; }
    .split-row-controls label { width: 125px; }
    .template-quick-bar { flex-wrap: wrap; gap: .5rem; }
    button:focus-visible, summary:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }

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
      flex-shrink: 1;
      max-width: 340px;
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

  @state() private entry: TransactionEntry = newEntry();
  @state() private touched = new Set<string>();
  @state() private balances: Record<string, number> = {};
  private preparedOpen = false;
  private returnFocus: HTMLElement | null = null;
  private get splitRows(): SplitRowState[] {
    if (this.entry.kind === 'advanced') return this.entry.rows;
    return entrySplits(this.entry, this.entryContext).map((s, i) => ({ id: String(i), accountId: s.accountId, amount: (s.amountCents / 100).toFixed(2) }));
  }
  private set splitRows(rows: SplitRowState[]) {
    this.entry = entryFromSplits(rows.map(r => ({ accountId: r.accountId, amountCents: parseMoney(r.amount) || 0 })), this.availableAccounts);
  }
  private get entryContext() {
    return { accounts: this.availableAccounts, currentBalanceCents: 'accountId' in this.entry ? this.balances[this.entry.accountId] : undefined,
      equityAccountId: this.availableAccounts.find(a => a.type === 'EQUITY' && a.name === 'Opening Balances')?.id };
  }
  private async fetchBalances() {
    this.balances = {};
    try {
      const response = await fetch('/api/reports/balance-summary');
      if (response.ok) { const json = await response.json(); this.balances = Object.fromEntries(json.data.accountBalances.map((a: any) => [a.id, a.balanceCents])); }
    } catch { /* Set-balance validation stays disabled until balances are available. */ }
  }
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

    if (e.defaultPrevented) return;
    if (e.key === 'Tab') { this.trapFocus(e); return; }
    if (e.key === 'Escape') {
      if (this.isSaveTemplateModalOpen) { this.isSaveTemplateModalOpen = false; return; }
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

  private trapFocus(event: KeyboardEvent) {
    const root = this.isSaveTemplateModalOpen ? this.shadowRoot?.querySelector('.mini-modal-card') : this.shadowRoot?.querySelector('.modal-card');
    if (!root) return;
    const collect = (parent: Element | ShadowRoot): HTMLElement[] => Array.from(parent.children).flatMap(child => {
      if (child instanceof HTMLDetailsElement && !child.open) return collectSummary(child);
      if (child instanceof HTMLElement && child.matches('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, textarea:not(:disabled)')) return [child];
      return collect(child.shadowRoot || child);
    });
    const collectSummary = (details: Element): HTMLElement[] => Array.from(details.children).filter(child => child.tagName === 'SUMMARY') as HTMLElement[];
    const controls = collect(root);
    const focused = event.composedPath()[0];
    if (event.shiftKey && focused === controls[0]) { event.preventDefault(); controls.at(-1)?.focus(); }
    else if (!event.shiftKey && focused === controls.at(-1)) { event.preventDefault(); controls[0]?.focus(); }
  }

  async fetchAccounts() {
    try {
      const res = await fetch('/api/accounts');
      if (res.ok) {
        const json = await res.json();
        this.availableAccounts = json.data || [];

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
      e.preventDefault();
      e.stopPropagation();
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

  override updated(changedProps: Map<string, any>) {
    if (changedProps.has('isOpen') && this.isOpen) {
      this.returnFocus = document.activeElement as HTMLElement | null;
      void this.updateComplete.then(() => this.shadowRoot?.querySelector<HTMLInputElement>('input[type=date]')?.focus());
    }
    if (changedProps.has('transactionToEdit') && this.transactionToEdit) {
      this.populateForEdit(this.transactionToEdit);
    } else if (changedProps.has('isOpen') && this.isOpen && !changedProps.get('isOpen')) {
      this.fetchAccounts();
      this.fetchTags();
      this.fetchTemplates();
      if (!this.transactionToEdit && !this.preparedOpen) {
        this.resetForm();
      }
    }
  }

  private populateForEdit(tx: TransactionWithSplits) {
    this.preparedOpen = true;
    this.touched = new Set();
    this.transactionToEdit = tx;
    this.transactionDate = tx.transactionDate;
    this.payee = tx.payee || '';
    this.note = tx.note || '';
    this.isCleared = tx.isCleared;
    this.isSubmitting = false;
    this.selectedTagIds = new Set((tx.tags || []).map((t) => t.id));
    this.tagSearchInput = '';
    this.isTagDropdownOpen = false;

    this.entry = { kind: 'advanced', rows: (tx.splits || []).map((s, idx) => ({
      id: s.id || `split-${idx}-${Date.now()}`,
      accountId: s.accountId,
      amount: this.formatCentsToDecimal(s.amountCents),
    })) };
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

    this.entry = newEntry();
    if ('accountId' in this.entry) this.entry.accountId = preselectedAccountId || '';
    this.touched = new Set();
    this.fetchBalances();
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
    if (this.isOpen && this.hasEntryData() && !confirm('Replace the current entry with this template?')) return;
    this.touched = new Set();
    this.payee = tpl.payee || '';
    this.note = tpl.note || '';
    if (tpl.splits && tpl.splits.length > 0) {
      this.splitRows = tpl.splits.map((s, idx) => ({
        id: `tpl-split-${idx}-${Date.now()}`,
        accountId: s.accountId,
        amount: s.amountCents !== 0 ? this.formatCentsToDecimal(s.amountCents) : '',
      }));
    }
    this.selectedTagIds = new Set((tpl.tags || []).map(t => t.id));
    this.isTemplateDropdownOpen = false;
  }

  public async openWithTemplate(tpl: TransactionTemplateWithSplits) {
    await this.fetchAccounts();
    this.fetchTags();
    this.fetchTemplates();
    this.resetForm();
    this.applyTemplate(tpl);
    this.preparedOpen = true;
    this.isOpen = true;
    this.requestUpdate();
  }

  public async openWithDuplicate(tx: TransactionWithSplits) {
    await this.fetchAccounts();
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
    this.entry = entryFromSplits(tx.splits, this.availableAccounts);
    this.preparedOpen = true;
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

    const validAdvancedTemplate = this.entry.kind === 'advanced' && this.entry.rows.length >= 2
      && this.entry.rows.every(row => this.availableAccounts.some(account => account.id === row.accountId)
        && (!row.amount.trim() || Number.isFinite(parseMoney(row.amount))));
    if ((!this.canSubmit() && !validAdvancedTemplate) || this.entry.kind === 'adjustment') {
      alert('Complete the entry before saving a template. Save adjustments as ledger templates in advanced mode.');
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
    this.preparedOpen = true;
    this.isOpen = true;
    this.requestUpdate();
  }

  public async edit(tx: TransactionWithSplits) {
    await this.fetchAccounts();
    this.fetchTags();
    this.fetchTemplates();
    this.populateForEdit(tx);
    this.preparedOpen = true;
    this.isOpen = true;
    this.requestUpdate();
  }

  public closeModal() {
    this.preparedOpen = false;
    this.isOpen = false;
    this.transactionToEdit = null;
    this.isSaveTemplateModalOpen = false;
    this.isTemplateDropdownOpen = false;
    this.returnFocus?.focus();
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private parseCents(value: string): number { return parseMoney(value) || 0; }
  private formatCentsToDecimal(cents: number): string { return (cents / 100).toFixed(2); }
  private getValidationState() {
    const errors = entryErrors(this.entry, this.entryContext, this.transactionDate, this.payee);
    return { isValid: Object.keys(errors).length === 0, message: Object.values(errors)[0] || 'Balanced' };
  }
  private canSubmit(): boolean { return !this.isSubmitting && this.getValidationState().isValid; }
  private touch(key: string) { this.touched = new Set([...this.touched, key]); }
  private fieldError(key: string) {
    const error = entryErrors(this.entry, this.entryContext, this.transactionDate, this.payee)[key];
    return this.touched.has(key) && error ? html`<small class="field-error" role="status">${error}</small>` : nothing;
  }
  private hasEntryData() {
    return ('total' in this.entry && !!this.entry.total) || ('rows' in this.entry && this.entry.rows.some(r => !!r.amount || !!r.accountId));
  }
  private switchMode(kind: EntryKind) {
    if (this.entry.kind === kind) return;
    if (this.transactionToEdit && kind === 'adjustment') return;
    if (kind === 'advanced' && this.getValidationState().isValid && (this.entry.kind !== 'adjustment' || this.entryContext.equityAccountId)) {
      this.entry = { kind, rows: entrySplits(this.entry, this.entryContext).map(s => ({ id: crypto.randomUUID(), accountId: s.accountId, amount: this.formatCentsToDecimal(s.amountCents) })) };
    } else {
      const converted = this.entry.kind === 'advanced' ? entryFromSplits(entrySplits(this.entry, this.entryContext), this.availableAccounts) : null;
      if (converted?.kind === kind) this.entry = converted;
      else {
        if (this.hasEntryData() && !confirm('Changing transaction type will clear the accounts and amounts. Continue?')) return;
        this.entry = newEntry(kind);
      }
    }
    this.touched = new Set();
  }
  private updateEntry(values: object) { this.entry = { ...this.entry, ...values } as TransactionEntry; }
  private addSplitRow() { if ('rows' in this.entry) this.updateEntry({ rows: [...this.entry.rows, newRow()] }); }
  private removeSplitRow(id: string) { this.touch('rows'); if ('rows' in this.entry) this.updateEntry({ rows: this.entry.rows.filter(r => r.id !== id) }); }
  private handleAmountInput(id: string, amount: string) { if ('rows' in this.entry) this.updateEntry({ rows: this.entry.rows.map(r => r.id === id ? { ...r, amount } : r) }); }
  private handleAccountSelect(id: string, accountId: string) { if ('rows' in this.entry) this.updateEntry({ rows: this.entry.rows.map(r => r.id === id ? { ...r, accountId } : r) }); }
  private accountField(label: string, key: string, value: string, accounts: Account[], change: (id: string) => void) {
    return html`<div class="form-group"><span class="form-label">${label}</span><account-combobox .label=${label} .accounts=${accounts} .value=${value}
      @focusout=${() => this.touch(key)} @account-selected=${(e: CustomEvent) => change(e.detail.accountId)}></account-combobox>${this.fieldError(key)}</div>`;
  }
  private renderTypeSelector() {
    const entry = this.entry;
    return html`      <div class="type-selector" role="group" aria-label="Transaction type">
        ${(['expense', 'income', 'transfer', 'adjustment'] as const).map(kind => html`<button type="button" class="btn-cancel" aria-pressed=${entry.kind === kind} ?disabled=${!!this.transactionToEdit && kind === 'adjustment'} @click=${() => this.switchMode(kind)}>${kind[0].toUpperCase() + kind.slice(1)}</button>`)}
      </div>
      <button class="btn-save-as-template advanced-action" aria-pressed=${entry.kind === 'advanced'} @click=${() => this.switchMode('advanced')}>Advanced ledger entry</button>
`;
  }
  private renderEntry() {
    const entry = this.entry;
    const balanceAccounts = this.availableAccounts.filter(isBalanceAccount);
    const summary = allocationSummary(entry);
    return html`
      <div class="grid-2">
        <label class="form-group"><span class="form-label">Date</span><input class="form-input" type="date" .value=${this.transactionDate} @input=${(e: any) => this.transactionDate = e.target.value} @blur=${() => this.touch('date')}>${this.fieldError('date')}</label>
        ${entry.kind === 'expense' || entry.kind === 'income' || entry.kind === 'advanced' ? html`<label class="form-group"><span class="form-label">${entry.kind === 'income' ? 'Payer/source' : entry.kind === 'advanced' ? 'Payee (optional)' : 'Payee'}</span><input class="form-input" .value=${this.payee} @input=${(e: any) => this.payee = e.target.value} @blur=${() => this.touch('payee')}>${this.fieldError('payee')}</label>` : nothing}
      </div>
      ${'accountId' in entry ? html`<div class="grid-2">
        ${this.accountField(entry.kind === 'expense' ? 'Paid from' : entry.kind === 'income' ? 'Received into' : entry.kind === 'transfer' ? 'From account' : 'Account', 'account', entry.accountId, balanceAccounts, accountId => this.updateEntry({ accountId }))}
        ${entry.kind === 'transfer' ? this.accountField('To account', 'destination', entry.toAccountId, balanceAccounts.filter(a => a.id !== entry.accountId), toAccountId => this.updateEntry({ toAccountId })) : nothing}
      </div>` : nothing}
      ${entry.kind === 'adjustment' ? html`<label class="form-group"><span class="form-label">Adjustment method</span><select class="form-select" .value=${entry.method} @change=${(e: any) => { if (!entry.total || confirm('Changing method clears the amount. Continue?')) this.updateEntry({ method: e.target.value, total: '' }); else e.target.value = entry.method; }}><option value="balance">Set account balance</option><option value="amount">Enter adjustment amount</option></select></label><p class="entry-help">Corrections use Opening Balances equity. Current direct balance: ${this.entryContext.currentBalanceCents === undefined ? 'Loadingâ€¦' : formatMoney(this.entryContext.currentBalanceCents)}. Includes all recorded dates, excluding child accounts. Negative balances represent debt; positive adjustments reduce debt.</p>` : nothing}
      ${'total' in entry ? html`<label class="form-group"><span class="form-label">${entry.kind === 'adjustment' && entry.method === 'balance' ? 'Resulting balance' : entry.kind === 'expense' || entry.kind === 'income' ? 'Total amount' : 'Amount'} (${APP_CURRENCY})</span><input class="form-input" inputmode="decimal" .value=${entry.total} @input=${(e: any) => this.updateEntry({ total: e.target.value })} @blur=${() => this.touch('total')}>${this.fieldError('total')}</label>` : nothing}
      ${'rows' in entry ? html`<section class="splits-section"><div class="splits-header"><span class="splits-title">${entry.kind === 'advanced' ? 'Ledger lines' : entry.kind === 'income' ? 'Income allocations' : 'Allocations'}</span><button class="btn-add-split" @click=${this.addSplitRow}>+ Add ${entry.kind === 'advanced' ? 'line' : 'allocation'}</button></div>
        ${entry.kind === 'advanced' ? html`<p class="entry-help">Signed amounts must sum to zero. Positive amounts increase assets and expenses, and decrease liabilities, income and equity. Negative amounts do the reverse.</p>` : nothing}
        ${repeat(entry.rows, r => r.id, (row, index) => html`<div class="split-row">
          ${this.accountField(`Account/category ${index + 1}`, `account-${row.id}`, row.accountId, this.availableAccounts.filter(a => !('accountId' in entry) || a.id !== entry.accountId).sort((a,b) => Number(b.type === (entry.kind === 'income' ? 'INCOME' : 'EXPENSE')) - Number(a.type === (entry.kind === 'income' ? 'INCOME' : 'EXPENSE'))), id => this.handleAccountSelect(row.id, id))}
          <div class="split-row-controls"><label class="form-group"><span class="form-label">Amount (${APP_CURRENCY})</span><input class="amount-input" inputmode="decimal" .value=${live(row.amount)} @input=${(e: any) => this.handleAmountInput(row.id, e.target.value)} @blur=${() => this.touch(`amount-${row.id}`)}>${this.fieldError(`amount-${row.id}`)}</label>
          ${summary.remaining !== 0 ? html`<button class="btn-auto-balance" @click=${() => this.entry = useRemaining(this.entry, row.id)}>Use remaining ${formatMoney(summary.remaining)}</button>` : nothing}
          <button class="btn-remove-row" aria-label=${`Remove ${entry.kind === 'advanced' ? 'line' : 'allocation'} ${index + 1}`} @click=${() => this.removeSplitRow(row.id)}>×</button></div>
        </div>`)}
        ${this.fieldError('rows')}
        <div class="balance-summary" role="status" aria-live="polite" aria-atomic="true">${entry.kind !== 'advanced' ? html`<span>Total <strong>${formatMoney(summary.total)}</strong></span><span>Allocated <strong>${formatMoney(summary.allocated)}</strong></span>` : nothing}<span>Remaining <strong>${formatMoney(summary.remaining)}</strong></span>${summary.remaining === 0 && entry.rows.length && entry.rows.every(r => parseMoney(r.amount)) ? html`<span>Balanced</span>` : nothing}</div>
      </section>` : nothing}
    `;
  }

  private async submitTransaction() {
    if (!this.canSubmit()) return;
    this.isSubmitting = true;

    try {
      const isEditing = Boolean(this.transactionToEdit);
      const url = this.entry.kind === 'adjustment' ? '/api/transactions/adjustments' : isEditing
        ? `/api/transactions/${this.transactionToEdit!.id}`
        : '/api/transactions';
      const method = isEditing && this.entry.kind !== 'adjustment' ? 'PATCH' : 'POST';

      const details = {
        transactionDate: this.transactionDate, payee: this.payee.trim() || null,
        note: this.note.trim() || null, isCleared: this.isCleared, tagIds: Array.from(this.selectedTagIds),
      };
      const payload = this.entry.kind === 'adjustment'
        ? { ...details, adjustment: this.entry, expectedBalanceCents: this.entryContext.currentBalanceCents }
        : buildEntryTransaction(this.entry, this.entryContext, details);

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

  override render() {
    if (!this.isOpen) return nothing;

    const validation = this.getValidationState();


    return html`
      <div
        class="modal-backdrop"
        @click="${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.closeModal();
        }}"
      >
        <div class="modal-card" role="dialog" aria-modal="true" aria-label="Record transaction">
          <!-- Header -->
          <div class="modal-header">
            <div class="header-info">
              <h3>${this.transactionToEdit ? 'Edit Transaction' : 'Record Transaction'}</h3>
              <p>
                ${this.transactionToEdit
                  ? 'Modify payee, transaction date, notes, and balanced split lines'
                  : 'Record everyday spending, income and account changes'}
              </p>
            </div>
            <button class="close-btn" @click="${this.closeModal}" aria-label="Close modal">✕</button>
          </div>

          <!-- Body -->
          <div class="modal-body">
            ${this.renderTypeSelector()}
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

            ${this.renderEntry()}
            <details class="more-details"><summary>More details</summary>
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="entry-note">${this.entry.kind === 'adjustment' ? 'Reason/memo' : 'Memo / Note (optional)'}</label>
                <input
                  type="text"
                  class="form-input"
                  id="entry-note" placeholder="Add a note"
                  .value="${this.note}"
                  @input="${(e: any) => (this.note = e.target.value)}"
                />
              </div>

              <div class="form-group" style="justify-content: center;">
                <label class="form-label" for="entry-status">Transaction status</label>
                <select id="entry-status" class="form-select" .value=${this.isCleared ? 'cleared' : 'pending'} @change=${(e: any) => this.isCleared = e.target.value === 'cleared'}><option value="pending">Pending</option><option value="cleared">Cleared</option></select>
              </div>
            </div>

            <!-- Tags Section -->
            <div class="form-group tag-form-group">
              <label class="form-label" for="tag-input-field">Tags</label>
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

            </details>
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
                  : (this.transactionToEdit ? 'Save Changes' : this.entry.kind === 'advanced' ? 'Record transaction' : `Record ${this.entry.kind}`)}
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
                    <label class="form-label" for="template-name">Template Name *</label>
                    <input
                      type="text"
                      class="form-input"
                      id="template-name" placeholder="e.g. Monthly Rent, Paycheck, Netflix..."
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
