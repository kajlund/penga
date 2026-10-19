import { calmStyles } from './calm-styles.js';
import { icon } from './icons.js';
import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  formatMoney,
  inTransactionDateRange,
  type TransactionWithSplits,
  type Account,
  type AccountType,
  type Tag,
} from '@penga/shared';

@customElement('penga-transactions')
export class PengaTransactions extends LitElement {
  static override styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        height: 100%;
        max-height: 100%;
        padding: 1.5rem 2.5rem 1.5rem;
        max-width: 1240px;
        width: 100%;
        margin: 0 auto;
        box-sizing: border-box;
        font-family: var(--font-sans);
        overflow: hidden;
      }

      .page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
        flex-wrap: wrap;
        gap: 0.75rem;
        flex-shrink: 0;
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
        color: var(--on-accent);
        border: 1px solid transparent;
        font-family: var(--font-sans);
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: 0 2px 8px var(--border-subtle);
        transition: all var(--transition-fast);
      }

      .btn-primary:hover {
        background: var(--color-primary-hover);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px var(--border-subtle);
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
        border-color: var(--border-strong);
      }

      /* Reconciliation Stats & Controls Banner */
      .reconciliation-banner {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 1rem 1.25rem;
        margin-bottom: 1rem;
        box-shadow: var(--shadow-md);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 1rem;
        flex-shrink: 0;
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
        color: var(--color-warning-text);
      }

      /* Filters Bar */
      .filters-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 0.75rem;
        flex-wrap: wrap;
        gap: 0.75rem;
        flex-shrink: 0;
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
        box-shadow: var(--shadow-md);
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

      .account-select optgroup {
        font-weight: 700;
        font-size: 0.78rem;
        color: var(--text-muted);
        background: var(--bg-surface);
      }

      .account-select option {
        font-weight: 500;
        font-size: 0.85rem;
        color: var(--text-primary);
        background: var(--bg-surface);
      }

      /* Ledger List */
      .ledger-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        display: flex;
        flex-direction: column;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }

      .ledger-header {
        display: grid;
        grid-template-columns:
          24px 24px 95px minmax(130px, 1.4fr) minmax(140px, 1.1fr)
          115px 105px 32px;
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
        flex-shrink: 0;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .header-sort-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        background: none;
        border: none;
        padding: 0;
        margin: 0;
        font-family: inherit;
        font-size: inherit;
        font-weight: inherit;
        text-transform: inherit;
        letter-spacing: inherit;
        color: var(--text-muted);
        cursor: pointer;
        transition: color var(--transition-fast);
        user-select: none;
        text-align: left;
      }

      .header-sort-btn:hover {
        color: var(--text-primary);
      }

      .header-sort-btn:focus-visible {
        outline: 2px solid var(--color-primary);
        outline-offset: 2px;
        border-radius: var(--radius-sm);
      }

      .header-sort-btn .sort-icon {
        font-size: 0.65rem;
        color: var(--color-primary);
        display: inline-flex;
        align-items: center;
        line-height: 1;
      }

      .transactions-list {
        flex: 1;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        scrollbar-width: thin;
        scrollbar-color: var(--border-strong) transparent;
      }

      .transactions-list::-webkit-scrollbar {
        width: 6px;
      }

      .transactions-list::-webkit-scrollbar-track {
        background: transparent;
      }

      .transactions-list::-webkit-scrollbar-thumb {
        background: var(--border-strong);
        border-radius: var(--radius-full);
      }

      .transactions-list::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
      }

      .transaction-row {
        display: flex;
        flex-direction: column;
        border-bottom: 1px solid var(--border-subtle);
        transition:
          background-color var(--transition-fast),
          border var(--transition-fast);
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
        grid-template-columns:
          24px 24px 95px minmax(130px, 1.4fr) minmax(140px, 1.1fr)
          115px 105px 32px;
        align-items: center;
        padding: 0.85rem 0.85rem 0.85rem 0.5rem;
        gap: 0.75rem;
        cursor: pointer;
      }

      /* Expand Toggle Button */
      .expand-cell {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .btn-expand {
        width: 24px;
        height: 24px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: transparent;
        border: none;
        color: var(--text-muted);
        border-radius: var(--radius-sm);
        cursor: pointer;
        transition: all var(--transition-fast);
        padding: 0;
      }

      .btn-expand:hover {
        background: var(--bg-muted);
        color: var(--text-primary);
      }

      .btn-expand svg {
        transition: transform var(--transition-fast);
      }

      .btn-expand.expanded svg {
        transform: rotate(90deg);
      }

      .btn-expand-toggle-all {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.28rem 0.65rem;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        font-family: var(--font-sans);
        font-size: 0.78rem;
        font-weight: 600;
        color: var(--text-secondary);
        cursor: pointer;
        transition: all var(--transition-fast);
      }

      .btn-expand-toggle-all:hover {
        background: var(--bg-muted);
        color: var(--text-primary);
        border-color: var(--border-strong);
      }

      /* From Account Column */
      .from-account-cell {
        display: flex;
        align-items: center;
        min-width: 0;
      }

      .from-account-pill {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        min-width: 0;
        max-width: 100%;
        overflow: hidden;
      }

      .from-account-icon {
        flex-shrink: 0;
        display: inline-flex;
        align-items: center;
      }

      .from-account-name {
        font-size: 0.85rem;
        font-weight: 500;
        color: var(--text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .account-type-badge {
        flex-shrink: 0;
        font-size: 0.65rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        padding: 0.1rem 0.35rem;
        border-radius: var(--radius-sm);
        line-height: 1.2;
      }

      .account-type-badge.asset {
        background: color-mix(in srgb, #52677c 15%, transparent);
        color: #52677c;
        border: 1px solid color-mix(in srgb, #52677c 30%, transparent);
      }

      .account-type-badge.liability {
        background: color-mix(in srgb, #795e73 15%, transparent);
        color: #795e73;
        border: 1px solid color-mix(in srgb, #795e73 30%, transparent);
      }

      .account-type-badge.settlement {
        background: color-mix(in srgb, #476f6c 15%, transparent);
        color: #476f6c;
        border: 1px solid color-mix(in srgb, #476f6c 30%, transparent);
      }

      .from-account-none {
        color: var(--text-muted);
        font-size: 0.85rem;
      }

      /* Total Amount Column */
      .total-amount-cell {
        display: flex;
        align-items: center;
        justify-content: flex-end;
      }

      .total-amount-value {
        font-family: var(--font-mono);
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-primary);
        letter-spacing: -0.01em;
        text-align: right;
      }

      /* Expanded Panel (Splits & Notes) */
      .tx-expanded-panel {
        background: var(--bg-subtle);
        border-top: 1px dashed var(--border-subtle);
        padding: 0.75rem 1rem 0.85rem 3.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.6rem;
      }

      .tx-expanded-note {
        display: flex;
        align-items: flex-start;
        gap: 0.45rem;
        font-size: 0.825rem;
        color: var(--text-secondary);
        background: var(--bg-surface);
        padding: 0.45rem 0.75rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-subtle);
      }

      .tx-expanded-note .note-label {
        font-weight: 600;
        color: var(--text-primary);
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
        flex-shrink: 0;
      }

      .tx-expanded-note .note-text {
        color: var(--text-secondary);
        word-break: break-word;
      }

      .splits-detail-header {
        font-size: 0.72rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--text-muted);
        margin-bottom: 0.15rem;
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
        background: color-mix(in srgb, var(--tag-color) 15%, transparent);
        color: var(--tag-color);
        border: 1px solid color-mix(in srgb, var(--tag-color) 30%, transparent);
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
        color: var(--on-accent);
        box-shadow: 0 2px 6px var(--border-subtle);
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
        box-shadow: var(--shadow-md);
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

      .actions-menu-item.danger {
        color: var(--color-negative);
      }

      .actions-menu-item.danger:hover:not(:disabled) {
        background: var(--color-danger-bg);
        color: var(--color-negative);
      }

      .actions-menu-item.warning {
        color: var(--color-warning);
      }

      .actions-menu-item.warning:hover:not(:disabled) {
        background: var(--color-warning-bg);
        color: var(--color-warning-hover);
      }

      .actions-menu-divider {
        height: 1px;
        background: var(--border-subtle);
        margin: 0.35rem 0;
      }

      .tx-voided {
        opacity: 0.72;
        background: var(--bg-subtle);
      }

      .tx-voided .tx-payee {
        text-decoration: line-through;
        color: var(--text-muted);
      }

      .tx-void-meta-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-top: 0.25rem;
        flex-wrap: wrap;
      }

      .tx-status-badge {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        padding: 0.15rem 0.45rem;
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.03em;
        text-transform: uppercase;
      }

      .tx-status-badge.voided {
        background: var(--bg-subtle);
        color: var(--text-secondary);
        border: 1px solid var(--border-strong);
      }

      .tx-status-badge.reversal {
        background: var(--color-info-bg);
        color: var(--color-info);
        border: 1px solid var(--color-info-border);
      }

      .tx-void-meta {
        font-size: 0.75rem;
        color: var(--text-muted);
        font-style: italic;
      }

      .btn-link {
        background: none;
        border: none;
        padding: 0;
        font-family: var(--font-sans);
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--color-primary-text);
        cursor: pointer;
        text-decoration: underline;
        display: inline-flex;
        align-items: center;
        gap: 0.2rem;
      }

      .btn-link:hover {
        color: var(--color-primary-hover);
      }

      @keyframes highlightPulse {
        0% {
          box-shadow: 0 0 0 4px var(--color-primary-subtle);
          background: var(--color-primary-subtle);
        }
        100% {
          box-shadow: none;
          background: transparent;
        }
      }

      .highlight-target {
        animation: highlightPulse 2s ease-out;
      }

      /* Confirmation & Action Modals */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: var(--overlay);
        backdrop-filter: blur(4px);
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1.5rem;
        animation: modalFadeIn 0.15s ease-out;
      }

      @keyframes modalFadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      .modal-card {
        background: var(--bg-surface);
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-md);
        width: 100%;
        max-width: 500px;
        max-height: min(90vh, 90dvh);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .modal-header {
        flex-shrink: 0;
        padding: 1.15rem 1.5rem;
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

      .modal-close-btn {
        background: transparent;
        border: none;
        font-size: 1.2rem;
        cursor: pointer;
        color: var(--text-muted);
        padding: 0.25rem 0.4rem;
        border-radius: var(--radius-sm);
      }

      .modal-close-btn:hover {
        color: var(--text-primary);
        background: var(--bg-subtle);
      }

      .modal-body {
        padding: 1.35rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        color: var(--text-primary);
        font-size: 0.9rem;
        line-height: 1.5;
        overflow-y: auto;
        min-height: 0;
        flex: 1;
      }

      .modal-body p {
        margin: 0;
      }

      .modal-footer {
        flex-shrink: 0;
        padding: 1rem 1.5rem;
        border-top: 1px solid var(--border-subtle);
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.75rem;
        background: var(--bg-subtle);
      }

      .btn-danger {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.6rem 1.15rem;
        border-radius: var(--radius-md);
        background: var(--color-negative);
        color: var(--on-accent);
        border: none;
        font-family: var(--font-sans);
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: var(--shadow-md);
        transition: all var(--transition-fast);
      }

      .btn-danger:hover:not(:disabled) {
        filter: brightness(0.9);
        transform: translateY(-1px);
      }

      .btn-danger:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-warning-action {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.6rem 1.15rem;
        border-radius: var(--radius-md);
        background: var(--color-warning);
        color: var(--on-accent);
        border: none;
        font-family: var(--font-sans);
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        box-shadow: var(--shadow-md);
        transition: all var(--transition-fast);
      }

      .btn-warning-action:hover:not(:disabled) {
        background: var(--color-warning-hover);
        transform: translateY(-1px);
      }

      .btn-warning-action:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .dialog-input-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .dialog-input-group label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--text-secondary);
      }

      .dialog-input {
        padding: 0.55rem 0.75rem;
        border-radius: var(--radius-md);
        border: 1px solid var(--border-strong);
        background: var(--bg-surface);
        color: var(--text-primary);
        font-family: var(--font-sans);
        font-size: 0.875rem;
        outline: none;
      }

      .dialog-input:focus {
        border-color: var(--color-primary);
        box-shadow: 0 0 0 2px var(--color-primary-subtle);
      }

      .dialog-error-banner {
        padding: 0.65rem 0.85rem;
        border-radius: var(--radius-md);
        background: var(--color-danger-bg);
        border: 1px solid var(--color-danger-border);
        color: var(--color-negative);
        font-size: 0.825rem;
        font-weight: 500;
      }

      .toast-banner {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 0.85rem 1.25rem;
        border-radius: var(--radius-md);
        background: var(--text-primary);
        color: var(--bg-surface);
        box-shadow: var(--shadow-lg);
        font-size: 0.875rem;
        font-weight: 500;
        z-index: 3000;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        animation: toastIn 0.2s ease-out;
      }

      @keyframes toastIn {
        from {
          transform: translateY(10px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      /* Nested Splits Detail */
      .splits-detail-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
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
        color: var(--color-negative);
      }

      .split-amount.positive {
        color: var(--color-primary-text);
      }

      .empty-state {
        padding: 3rem 2rem;
        text-align: center;
        color: var(--text-muted);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        min-height: 180px;
        overflow-y: auto;
      }

      .loading-state {
        padding: 3rem 2rem;
        text-align: center;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        flex: 1;
        min-height: 180px;
        overflow-y: auto;
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
    `,
    calmStyles,
  ];

  @property({ type: Boolean })
  reconciliationMode = false;

  @state()
  private transactions: TransactionWithSplits[] = [];

  @state()
  private accounts: Account[] = [];

  @state()
  private tags: Tag[] = [];

  @state()
  private selectedFilter: 'ALL' | 'UNCLEARED' | 'CLEARED' | 'RECONCILED' =
    'ALL';

  @state()
  private selectedAccountId = '';

  @state() private dateFrom = '';
  @state() private dateTo = '';
  @state() private searchText = '';
  @state() private dateSortDirection: 'asc' | 'desc' = 'asc';

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

  @state()
  private deleteModalTx: TransactionWithSplits | null = null;

  @state()
  private isDeleting = false;

  @state()
  private voidModalTx: TransactionWithSplits | null = null;

  @state()
  private voidDate = '';

  @state()
  private voidReason = '';

  @state()
  private isVoiding = false;

  @state()
  private actionError: string | null = null;

  @state()
  private toastMessage: string | null = null;

  @state()
  private expandedTxIds = new Set<string>();

  private toggleExpand(txId: string) {
    const next = new Set(this.expandedTxIds);
    if (next.has(txId)) {
      next.delete(txId);
    } else {
      next.add(txId);
    }
    this.expandedTxIds = next;
  }

  private isTxExpanded(txId: string): boolean {
    return this.expandedTxIds.has(txId);
  }

  private areAllExpanded(txs: TransactionWithSplits[]): boolean {
    if (txs.length === 0) return false;
    return txs.every((tx) => this.expandedTxIds.has(tx.id));
  }

  private toggleExpandAll(txs: TransactionWithSplits[]) {
    if (this.areAllExpanded(txs)) {
      this.expandedTxIds = new Set();
    } else {
      this.expandedTxIds = new Set(txs.map((tx) => tx.id));
    }
  }

  private handleRowClick(e: MouseEvent, txId: string) {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('.drag-handle') ||
      target.closest('.actions-dropdown-container') ||
      target.closest('.actions-menu')
    ) {
      return;
    }
    this.toggleExpand(txId);
  }

  private getFromAccount(tx: TransactionWithSplits): {
    name: string;
    type?: AccountType;
    icon?: string | null;
  } | null {
    const resolveType = (
      s: TransactionWithSplits['splits'][0],
    ): AccountType | undefined => {
      if (s.accountType) return s.accountType;
      return this.accounts.find((a) => a.id === s.accountId)?.type;
    };
    const resolveName = (s: TransactionWithSplits['splits'][0]): string => {
      if (s.accountName) return s.accountName;
      return this.accounts.find((a) => a.id === s.accountId)?.name || 'Account';
    };
    const resolveIcon = (
      s: TransactionWithSplits['splits'][0],
    ): string | null | undefined => {
      if (s.accountIcon !== undefined) return s.accountIcon;
      return this.accounts.find((a) => a.id === s.accountId)?.icon;
    };

    const isAssetOrLiability = (type?: AccountType) =>
      type === 'ASSET' || type === 'LIABILITY' || type === 'SETTLEMENT';

    // 1. Source asset/liability/settlement (where money came from: negative split)
    const negativeBalanceSplit = tx.splits.find(
      (s) => s.amountCents < 0 && isAssetOrLiability(resolveType(s)),
    );
    if (negativeBalanceSplit) {
      return {
        name: resolveName(negativeBalanceSplit),
        type: resolveType(negativeBalanceSplit),
        icon: resolveIcon(negativeBalanceSplit),
      };
    }

    // 2. Any asset/liability/settlement split (e.g. Income deposit where asset split > 0)
    const anyBalanceSplit = tx.splits.find((s) =>
      isAssetOrLiability(resolveType(s)),
    );
    if (anyBalanceSplit) {
      return {
        name: resolveName(anyBalanceSplit),
        type: resolveType(anyBalanceSplit),
        icon: resolveIcon(anyBalanceSplit),
      };
    }

    // 3. Fallback: First negative split or first split
    const fallbackSplit =
      tx.splits.find((s) => s.amountCents < 0) || tx.splits[0];
    if (fallbackSplit) {
      return {
        name: resolveName(fallbackSplit),
        type: resolveType(fallbackSplit),
        icon: resolveIcon(fallbackSplit),
      };
    }

    return null;
  }

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
    if (e.key === 'Escape') {
      if (this.deleteModalTx || this.voidModalTx) {
        this.requestCloseModals();
        return;
      }
      if (this.openMenuTxId) {
        this.openMenuTxId = null;
        this.openMenuUpwards = false;
      }
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      if (this.deleteModalTx) {
        e.preventDefault();
        this.handleDeleteSubmit();
      } else if (this.voidModalTx) {
        e.preventDefault();
        this.handleVoidSubmit();
      }
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
      const spaceBelowWindow = window.innerHeight - rect.bottom;
      const listEl = this.shadowRoot?.querySelector('.transactions-list');
      const listRect = listEl?.getBoundingClientRect();
      const spaceBelowList = listRect
        ? listRect.bottom - rect.bottom
        : spaceBelowWindow;
      this.openMenuUpwards = spaceBelowWindow < 185 || spaceBelowList < 185;
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
    await Promise.all([
      this.fetchTransactions(),
      this.fetchAccounts(),
      this.fetchTags(),
    ]);
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
      if (this.selectedAccountId)
        params.append('accountId', this.selectedAccountId);
      if (this.selectedTagId) params.append('tagId', this.selectedTagId);
      params.append('order', this.dateSortDirection);

      const queryString = params.toString();
      const url = queryString
        ? `/api/transactions?${queryString}`
        : '/api/transactions';

      const loaded: TransactionWithSplits[] = [];
      for (let offset = 0; ; offset += 100) {
        const page = await fetch(
          url + (queryString ? '&' : '?') + 'limit=100&offset=' + offset,
        );
        const payload = await page.json();
        if (!page.ok)
          throw new Error(payload.error || 'Could not load transactions.');
        loaded.push(...payload.data);
        if (payload.data.length < 100) break;
      }
      const res = new Response(JSON.stringify({ data: loaded }));
      if (!res.ok) {
        throw new Error(`Failed to load transactions: ${res.statusText}`);
      }
      const json = await res.json();
      this.transactions = ((json.data || []) as TransactionWithSplits[]).sort(
        (a: TransactionWithSplits, b: TransactionWithSplits) => {
          const dateCmp =
            this.dateSortDirection === 'asc'
              ? a.transactionDate.localeCompare(b.transactionDate)
              : b.transactionDate.localeCompare(a.transactionDate);
          if (dateCmp !== 0) return dateCmp;
          const orderCmp = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
          if (orderCmp !== 0) return orderCmp;
          return (
            String(a.createdAt || '').localeCompare(String(b.createdAt || '')) ||
            a.id.localeCompare(b.id)
          );
        },
      );
    } catch (err) {
      this.errorMessage =
        (err instanceof Error ? err.message : String(err)) ||
        'Error fetching transactions';
    } finally {
      this.isLoading = false;
    }
  }

  private getAccountFilterLabel(acc: Account): string {
    const parts: string[] = [acc.name];
    let current = acc;
    const visited = new Set<string>([acc.id]);
    while (current.parentId) {
      if (visited.has(current.parentId)) break;
      visited.add(current.parentId);
      const parent = this.accounts.find((a) => a.id === current.parentId);
      if (!parent) break;
      parts.unshift(parent.name);
      current = parent;
    }
    return parts.join(' › ');
  }

  private getGroupedAccounts(): { label: string; accounts: Account[] }[] {
    const categories: { label: string; type: AccountType }[] = [
      { label: 'Assets', type: 'ASSET' },
      { label: 'Liabilities', type: 'LIABILITY' },
      { label: 'Settlements', type: 'SETTLEMENT' },
      { label: 'Income', type: 'INCOME' },
      { label: 'Expenses', type: 'EXPENSE' },
      { label: 'Equity', type: 'EQUITY' },
    ];

    const knownTypes = new Set(categories.map((c) => c.type));
    const groups: { label: string; accounts: Account[] }[] = [];

    for (const cat of categories) {
      const items = this.accounts
        .filter((a) => a.type === cat.type)
        .sort((a, b) =>
          this.getAccountFilterLabel(a).localeCompare(
            this.getAccountFilterLabel(b),
          ),
        );
      if (items.length > 0) {
        groups.push({ label: cat.label, accounts: items });
      }
    }

    const otherItems = this.accounts
      .filter((a) => !knownTypes.has(a.type))
      .sort((a, b) =>
        this.getAccountFilterLabel(a).localeCompare(
          this.getAccountFilterLabel(b),
        ),
      );
    if (otherItems.length > 0) {
      groups.push({ label: 'Other', accounts: otherItems });
    }

    return groups;
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

  public toggleDateSort() {
    this.dateSortDirection = this.dateSortDirection === 'asc' ? 'desc' : 'asc';
  }

  private handleSortChange = (e: Event) => {
    this.dateSortDirection = (e.target as HTMLSelectElement).value as
      | 'asc'
      | 'desc';
  };

  public async toggleCleared(tx: TransactionWithSplits) {
    const newCleared = !tx.isCleared;
    this.updatingTxId = tx.id;

    // Optimistic UI update
    this.transactions = this.transactions.map((t) =>
      t.id === tx.id ? { ...t, isCleared: newCleared } : t,
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
          t.id === tx.id ? { ...t, isCleared: json.data.isCleared } : t,
        );
      }
    } catch (err) {
      // Rollback on failure
      this.transactions = this.transactions.map((t) =>
        t.id === tx.id ? { ...t, isCleared: !newCleared } : t,
      );
      console.error('Error toggling transaction reconciliation:', err);
    } finally {
      this.updatingTxId = null;
    }
  }

  public async moveTransaction(
    tx: TransactionWithSplits,
    direction: 'up' | 'down',
  ) {
    // Find all transactions on the same date, ordered by sortOrder
    const sameDateTxs = this.transactions
      .filter((t) => t.transactionDate === tx.transactionDate)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    if (sameDateTxs.length < 2) return;

    const currentIndex = sameDateTxs.findIndex((t) => t.id === tx.id);
    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= sameDateTxs.length) return;

    // Swap items in the ordered array
    const [moved] = sameDateTxs.splice(currentIndex, 1);
    sameDateTxs.splice(targetIndex, 0, moved);

    // Reassign sortOrder sequentially
    const updatedMap = new Map<string, number>();
    sameDateTxs.forEach((t, idx) => {
      t.sortOrder = idx;
      updatedMap.set(t.id, idx);
    });

    // Optimistic reorder
    this.transactions = this.transactions
      .map((t) => {
        if (updatedMap.has(t.id)) {
          return { ...t, sortOrder: updatedMap.get(t.id)! };
        }
        return t;
      })
      .sort((a, b) => {
        const dateCmp =
          this.dateSortDirection === 'asc'
            ? a.transactionDate.localeCompare(b.transactionDate)
            : b.transactionDate.localeCompare(a.transactionDate);
        if (dateCmp !== 0) return dateCmp;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });

    // Call backend batch reorder API
    try {
      await fetch('/api/transactions/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: sameDateTxs.map((t) => ({ id: t.id, sortOrder: t.sortOrder })),
        }),
      });
    } catch (err) {
      console.error('Failed to persist transaction reordering:', err);
      this.fetchTransactions();
    }
  }

  private handleDragStart(
    e: DragEvent,
    tx: TransactionWithSplits,
    canReorder: boolean,
  ) {
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

    if (
      this.dragOverTxId !== targetTx.id ||
      this.dragOverPosition !== position
    ) {
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
    if (!draggedTx || draggedTx.transactionDate !== targetTx.transactionDate)
      return;

    // Get all transactions on this date ordered by current sortOrder
    const sameDateTxs = this.transactions
      .filter((t) => t.transactionDate === targetTx.transactionDate)
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

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
      .map((t) =>
        updatedMap.has(t.id) ? { ...t, sortOrder: updatedMap.get(t.id)! } : t,
      )
      .sort((a, b) => {
        const dateCmp =
          this.dateSortDirection === 'asc'
            ? a.transactionDate.localeCompare(b.transactionDate)
            : b.transactionDate.localeCompare(a.transactionDate);
        if (dateCmp !== 0) return dateCmp;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
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
    this.dispatchEvent(
      new CustomEvent('open-transaction-modal', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleEditTransaction(tx: TransactionWithSplits) {
    this.dispatchEvent(
      new CustomEvent('edit-transaction', {
        detail: { transaction: tx },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleDuplicateTransaction(tx: TransactionWithSplits) {
    this.dispatchEvent(
      new CustomEvent('duplicate-transaction', {
        detail: { transaction: tx },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private async handleSaveAsTemplate(tx: TransactionWithSplits) {
    const templateName = prompt(
      'Enter a name for this template:',
      tx.payee || 'Transaction Template',
    );
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
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err));
    }
  }

  private formatCents(cents: number): string {
    const formatted = formatMoney(cents);
    return cents > 0 ? `+${formatted}` : formatted;
  }

  private isOpeningBalance(tx: TransactionWithSplits): boolean {
    return (
      tx.payee === 'Opening Balance' ||
      Boolean(tx.note?.startsWith('Starting balance for '))
    );
  }

  private getTransactionDisplayAmount(tx: TransactionWithSplits): string {
    const positive = tx.splits.filter((s) => s.amountCents > 0);
    const sumCents = positive.reduce((acc, s) => acc + s.amountCents, 0);
    return formatMoney(sumCents || Math.abs(tx.splits[0]?.amountCents || 0));
  }

  private openDeleteModal(tx: TransactionWithSplits) {
    this.actionError = null;
    this.isDeleting = false;
    this.deleteModalTx = tx;
  }

  private openVoidModal(tx: TransactionWithSplits) {
    this.actionError = null;
    this.isVoiding = false;
    this.voidModalTx = tx;
    this.voidDate = new Date().toISOString().slice(0, 10);
    this.voidReason = '';
  }

  private closeModals(force = false) {
    if (!force && (this.isDeleting || this.isVoiding)) return;
    this.deleteModalTx = null;
    this.voidModalTx = null;
    this.actionError = null;
  }

  public requestCloseModals() {
    if (this.voidModalTx && this.voidReason && this.voidReason.trim() !== '') {
      if (!confirm('Discard unsaved changes?')) {
        return;
      }
    }
    this.closeModals();
  }

  private showToast(msg: string) {
    this.toastMessage = msg;
    setTimeout(() => {
      if (this.toastMessage === msg) {
        this.toastMessage = null;
      }
    }, 3500);
  }

  private async handleDeleteSubmit() {
    if (!this.deleteModalTx || this.isDeleting) return;
    this.isDeleting = true;
    this.actionError = null;

    try {
      const res = await fetch(`/api/transactions/${this.deleteModalTx.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete transaction');
      }

      const deletedId = this.deleteModalTx.id;
      this.transactions = this.transactions.filter((t) => t.id !== deletedId);
      this.isDeleting = false;
      this.closeModals(true);
      this.showToast('Transaction permanently deleted');
      this.dispatchEvent(
        new CustomEvent('transaction-deleted', {
          detail: { id: deletedId },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      this.actionError =
        (err instanceof Error ? err.message : String(err)) ||
        'Failed to delete transaction';
    } finally {
      this.isDeleting = false;
    }
  }

  private async handleVoidSubmit() {
    if (!this.voidModalTx || this.isVoiding) return;
    this.isVoiding = true;
    this.actionError = null;

    try {
      const res = await fetch(`/api/transactions/${this.voidModalTx.id}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: this.voidDate || undefined,
          reason: this.voidReason ? this.voidReason.trim() : undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || 'Failed to reverse transaction');
      }

      this.isVoiding = false;
      this.closeModals(true);
      this.showToast('Transaction reversed and voided successfully');
      await this.fetchTransactions();
      this.dispatchEvent(
        new CustomEvent('transaction-voided', {
          detail: json.data,
          bubbles: true,
          composed: true,
        }),
      );
    } catch (err) {
      this.actionError =
        (err instanceof Error ? err.message : String(err)) ||
        'Failed to reverse transaction';
    } finally {
      this.isVoiding = false;
    }
  }

  private scrollToTx(id: string) {
    if (this.selectedFilter !== 'ALL') {
      this.selectedFilter = 'ALL';
    }
    if (this.selectedAccountId) {
      this.selectedAccountId = '';
    }
    if (this.selectedTagId) {
      this.selectedTagId = '';
    }
    this.requestUpdate();
    setTimeout(() => {
      const el = this.shadowRoot?.querySelector(`[data-tx-id="${id}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-target');
        setTimeout(() => el.classList.remove('highlight-target'), 2000);
      }
    }, 60);
  }

  override render() {
    // Filter transactions based on selected filter and sort by Date (primary) and manual UI sortOrder (secondary)
    const filteredTxs = this.transactions
      .filter((tx) => {
        if (
          !inTransactionDateRange(tx.transactionDate, this.dateFrom, this.dateTo)
        )
          return false;
        if (
          !(tx.payee ?? '').toLowerCase().includes(this.searchText.toLowerCase())
        )
          return false;
        const reconciled = tx.splits.some(
          (s) =>
            s.reconciliationId &&
            (!this.selectedAccountId || s.accountId === this.selectedAccountId),
        );
        if (this.selectedFilter === 'RECONCILED') return reconciled;
        if (reconciled && this.selectedFilter !== 'ALL') return false;
        if (this.selectedFilter === 'CLEARED') return tx.isCleared;
        if (this.selectedFilter === 'UNCLEARED') return !tx.isCleared;
        return true;
      })
      .sort((a, b) => {
        const dateCmp =
          this.dateSortDirection === 'asc'
            ? a.transactionDate.localeCompare(b.transactionDate)
            : b.transactionDate.localeCompare(a.transactionDate);
        if (dateCmp !== 0) return dateCmp;
        const orderCmp = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (orderCmp !== 0) return orderCmp;
        return (
          String(a.createdAt || '').localeCompare(String(b.createdAt || '')) ||
          a.id.localeCompare(b.id)
        );
      });

    // Compute reconciliation totals
    const clearedCount = this.transactions.filter((t) => t.isCleared).length;
    const unclearedCount = this.transactions.filter((t) => !t.isCleared).length;

    return html`
      <div class="page-header">
        <div class="header-title">
          <h2>
            ${this.reconciliationMode ? 'Statement Reconciliation' : 'Transaction Ledger'}
          </h2>
          <p>
            ${
              this.reconciliationMode
                ? 'Match line-by-line against physical bank statements and verify cleared balances'
                : 'Double-entry balanced events with integer cents precision and intraday sorting'
            }
          </p>
        </div>
        <div class="header-actions">
          <button
            class="btn-secondary"
            @click="${this.fetchData}"
            title="Refresh transactions"
          >
            <span>${icon('refresh-cw', 'ASSET', 16)}</span> Refresh
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
            <span class="stat-value cleared"
              >${icon('check', 'ASSET', 16)} ${clearedCount} cleared</span
            >
          </div>
          <div class="stat-box">
            <span class="stat-label">Uncleared / Pending</span>
            <span class="stat-value pending">○ ${unclearedCount} pending</span>
          </div>
        </div>

        <div
          style="display: flex; gap: 0.65rem; align-items: center; flex-wrap: wrap;"
        >
          <select
            class="account-select"
            .value="${this.selectedAccountId}"
            @change="${this.handleAccountFilterChange}"
            aria-label="Filter by account"
          >
            <option value="">All Accounts</option>
            ${this.getGroupedAccounts().map(
              (group) => html`
                <optgroup label="${group.label}">
                  ${group.accounts.map(
                    (acc) => html`
                      <option value="${acc.id}">
                        ${this.getAccountFilterLabel(acc)}
                      </option>
                    `,
                  )}
                </optgroup>
              `,
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
              (tag) => html` <option value="${tag.id}">#${tag.name}</option> `,
            )}
          </select>
        </div>
      </div>

      <div class="filters-bar">
        <label
          >From
          <input
            type="date"
            .value=${this.dateFrom}
            @input=${(e: Event) => (this.dateFrom = (e.target as HTMLInputElement).value)}
        /></label>
        <label
          >To
          <input
            type="date"
            .value=${this.dateTo}
            @input=${(e: Event) => (this.dateTo = (e.target as HTMLInputElement).value)}
        /></label>
        <label
          >Search
          <input
            .value=${this.searchText}
            @input=${(e: Event) => (this.searchText = (e.target as HTMLInputElement).value)}
        /></label>
        <label
          >Sort
          <select
            class="account-select"
            .value="${this.dateSortDirection}"
            @change="${this.handleSortChange}"
            aria-label="Sort transactions"
          >
            <option value="asc">Date (Oldest first)</option>
            <option value="desc">Date (Newest first)</option>
          </select>
        </label>
        <button
          class="btn-secondary"
          @click=${() => {
            this.dateFrom = '';
            this.dateTo = '';
            this.searchText = '';
            this.dateSortDirection = 'asc';
          }}
        >
          Reset dates and search
        </button>
        <span
          >Filtered: ${filteredTxs.length}
          events${this.selectedAccountId ? ' | Movement: ' + formatMoney(filteredTxs.filter((t) => !t.voidedAt).reduce((sum, t) => sum + t.splits.filter((s) => s.accountId === this.selectedAccountId).reduce((n, s) => n + s.amountCents, 0), 0)) + ' (not account balance)' : ''}</span
        >
      </div>
      <!-- Filters Row -->
      <div class="filters-bar">
        <div class="filter-pills">
          <button
            class="filter-pill ${this.selectedFilter === 'RECONCILED' ? 'active' : ''}"
            @click=${() => (this.selectedFilter = 'RECONCILED')}
          >
            Reconciled
          </button>
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

        <div
          style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;"
        >
          <button
            type="button"
            class="btn-expand-toggle-all"
            @click="${() => this.toggleExpandAll(filteredTxs)}"
          >
            ${icon(this.areAllExpanded(filteredTxs) ? 'chevron-down' : 'chevron-right', 'ASSET', 14)}
            <span
              >${this.areAllExpanded(filteredTxs) ? 'Collapse All' : 'Expand All'}</span
            >
          </button>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Tip: Click any row to expand splits & notes
          </div>
        </div>
      </div>

      <!-- Ledger Table -->
      <div class="ledger-card">
        <div class="ledger-header">
          <span
            style="text-align: center; color: var(--text-muted); font-size: 0.85rem;"
            title="Drag handle to reorder within date"
            >${icon('grip-vertical', 'ASSET', 16)}</span
          >
          <span
            style="text-align: center; color: var(--text-muted); font-size: 0.85rem;"
            title="Expand / collapse splits and notes"
            >${icon('chevron-down', 'ASSET', 14)}</span
          >
          <button
            type="button"
            class="header-sort-btn"
            @click="${this.toggleDateSort}"
            title="Sort by date (${this.dateSortDirection === 'asc' ? 'oldest first' : 'newest first'}). Click to toggle."
            aria-label="Sort by date"
          >
            <span>Date</span>
            <span class="sort-icon">${this.dateSortDirection === 'asc' ? '▲' : '▼'}</span>
          </button>
          <span>Payee</span>
          <span>From Account</span>
          <span style="text-align: center;">Status</span>
          <span style="text-align: right;">Total Amount</span>
          <span></span>
        </div>

        ${
          this.isLoading
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
                    <button class="btn-secondary" @click="${this.fetchData}">
                      Retry
                    </button>
                  </div>
                `
              : filteredTxs.length === 0
                ? html`
                    <div class="empty-state">
                      <div style="font-size: 2.5rem; margin-bottom: 0.5rem;">
                        ${icon('arrow-left-right', 'ASSET', 32)}
                      </div>
                      <h4
                        style="margin: 0 0 0.5rem; color: var(--text-primary);"
                      >
                        No Matching Transactions
                      </h4>
                      <p style="margin: 0 0 1.5rem;">
                        No transactions match the selected filters.
                      </p>
                      <button
                        class="btn-primary"
                        @click="${this.handleOpenCreate}"
                      >
                        <span>+ Record Transaction</span>
                      </button>
                    </div>
                  `
                : html`
                    <div class="transactions-list">
                      ${filteredTxs.map((tx) => {
                        const sameDateTxs = this.transactions
                          .filter((t) => t.transactionDate === tx.transactionDate)
                          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                        const canReorder =
                          sameDateTxs.length > 1 && !this.isOpeningBalance(tx);
                        const sameDateIndex = sameDateTxs.findIndex(
                          (t) => t.id === tx.id,
                        );
                        const isFirst = sameDateIndex === 0;
                        const isLast = sameDateIndex === sameDateTxs.length - 1;

                        const isOpeningBal = this.isOpeningBalance(tx);
                        const isVoided = Boolean(tx.voidedAt);
                        const isReversal = Boolean(tx.reversesTransactionId);
                        const isExpanded = this.isTxExpanded(tx.id);
                        const fromAcc = this.getFromAccount(tx);

                        return html`
                          <div
                            class="transaction-row ${isVoided ? 'tx-voided' : ''} ${isReversal ? 'tx-reversal' : ''} ${this.draggedTxId === tx.id ? 'dragging' : ''} ${this.dragOverTxId === tx.id ? `drag-over-${this.dragOverPosition}` : ''} ${isExpanded ? 'expanded' : ''}"
                            data-tx-id="${tx.id}"
                            @dragover="${(e: DragEvent) => this.handleDragOver(e, tx)}"
                            @dragleave="${(e: DragEvent) => this.handleDragLeave(e, tx)}"
                            @drop="${(e: DragEvent) => this.handleDrop(e, tx)}"
                          >
                            <div
                              class="tx-main"
                              @click="${(e: MouseEvent) => this.handleRowClick(e, tx.id)}"
                            >
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
                                  ${icon('grip-vertical', 'ASSET', 16)}
                                </div>
                              </div>

                              <!-- Expand/collapse toggle -->
                              <div class="expand-cell">
                                <button
                                  type="button"
                                  class="btn-expand ${isExpanded ? 'expanded' : ''}"
                                  @click="${(e: Event) => {
                                    e.stopPropagation();
                                    this.toggleExpand(tx.id);
                                  }}"
                                  title="${isExpanded ? 'Collapse transaction' : 'Expand to view splits and notes'}"
                                  aria-label="${isExpanded ? 'Collapse' : 'Expand'}"
                                >
                                  ${icon('chevron-right', 'ASSET', 16)}
                                </button>
                              </div>

                              <span class="tx-date">${tx.transactionDate}</span>

                              <div class="tx-payee-group">
                                <div class="tx-payee-row">
                                  <span
                                    class="tx-payee"
                                    title="${tx.payee || 'Unnamed Event'}"
                                    >${tx.payee || 'Unnamed Event'}</span
                                  >
                                  ${
                                    tx.tags && tx.tags.length > 0
                                      ? html`
                                          <div class="tx-tags-list">
                                            ${tx.tags.map(
                                              (tag) => html`
                                                <span
                                                  class="tx-tag-badge"
                                                  style="--tag-color: ${tag.color || 'var(--tag-default)'};"
                                                >
                                                  #${tag.name}
                                                </span>
                                              `,
                                            )}
                                          </div>
                                        `
                                      : nothing
                                  }
                                </div>
                                ${
                                  isVoided
                                    ? html`
                                        <div class="tx-void-meta-row">
                                          <span class="tx-status-badge voided"
                                            >${icon('ban', 'ASSET', 14)}
                                            Voided</span
                                          >
                                          ${tx.voidReason ? html`<span class="tx-void-meta">“${tx.voidReason}”</span>` : nothing}
                                          ${
                                            tx.reversalTransactionId
                                              ? html`
                                                  <button
                                                    type="button"
                                                    class="btn-link"
                                                    @click="${() => this.scrollToTx(tx.reversalTransactionId!)}"
                                                  >
                                                    View reversal
                                                    ${icon('arrow-up-right', 'ASSET', 14)}
                                                  </button>
                                                `
                                              : nothing
                                          }
                                        </div>
                                      `
                                    : isReversal
                                      ? html`
                                          <div class="tx-void-meta-row">
                                            <span
                                              class="tx-status-badge reversal"
                                              >${icon('undo-2', 'ASSET', 14)}
                                              Reversal</span
                                            >
                                            ${
                                              tx.reversesTransactionId
                                                ? html`
                                                    <button
                                                      type="button"
                                                      class="btn-link"
                                                      @click="${() => this.scrollToTx(tx.reversesTransactionId!)}"
                                                    >
                                                      View original
                                                      ${icon('arrow-up-right', 'ASSET', 14)}
                                                    </button>
                                                  `
                                                : nothing
                                            }
                                          </div>
                                        `
                                      : nothing
                                }
                              </div>

                              <!-- From Account (Asset/Liability) -->
                              <div class="from-account-cell">
                                ${
                                  fromAcc
                                    ? html`
                                        <div
                                          class="from-account-pill"
                                          title="${fromAcc.name} (${fromAcc.type || 'Account'})"
                                        >
                                          <span class="from-account-icon"
                                            >${icon(fromAcc.icon, fromAcc.type || 'ASSET')}</span
                                          >
                                          <span class="from-account-name"
                                            >${fromAcc.name}</span
                                          >
                                          ${
                                            fromAcc.type
                                              ? html`
                                                  <span
                                                    class="account-type-badge ${fromAcc.type.toLowerCase()}"
                                                    >${fromAcc.type}</span
                                                  >
                                                `
                                              : nothing
                                          }
                                        </div>
                                      `
                                    : html`<span class="from-account-none"
                                        >—</span
                                      >`
                                }
                              </div>

                              <!-- One-click Reconciliation Toggle -->
                              <div class="status-cell">
                                <button
                                  type="button"
                                  class="cleared-toggle ${tx.isCleared ? 'cleared' : 'pending'}"
                                  @click="${() => this.toggleCleared(tx)}"
                                  title="${isVoided || isReversal ? 'Cleared state is locked on voided/reversal transactions' : 'Click to toggle cleared status for bank reconciliation'}"
                                  ?disabled="${this.updatingTxId === tx.id || isVoided || isReversal || tx.splits.some((s) => s.reconciliationId)}"
                                >
                                  <span class="cleared-icon"
                                    >${icon(tx.isCleared ? 'check' : 'circle', 'ASSET', 16)}</span
                                  >
                                  <span
                                    >${tx.splits.some((s) => s.reconciliationId && (!this.selectedAccountId || s.accountId === this.selectedAccountId)) ? 'Reconciled' : tx.isCleared ? 'Cleared' : 'Uncleared'}</span
                                  >
                                </button>
                              </div>

                              <!-- Total Amount -->
                              <div class="total-amount-cell">
                                <span class="total-amount-value">
                                  ${this.getTransactionDisplayAmount(tx)}
                                </span>
                              </div>

                              <div class="tx-actions">
                                <div class="actions-dropdown-container">
                                  <button
                                    type="button"
                                    class="btn-actions-trigger ${this.openMenuTxId === tx.id ? 'active' : ''}"
                                    @click="${(e: Event) => this.toggleMenu(e, tx.id)}"
                                    title="Transaction actions"
                                    aria-label="Actions"
                                  >
                                    ${icon('ellipsis', 'ASSET', 16)}
                                  </button>

                                  ${
                                    this.openMenuTxId === tx.id
                                      ? html`
                                          <div
                                            class="actions-menu ${this.openMenuUpwards ? 'open-upwards' : ''}"
                                            @click="${(e: Event) => e.stopPropagation()}"
                                          >
                                            ${
                                              isVoided
                                                ? html`
                                                    <button
                                                      type="button"
                                                      class="actions-menu-item"
                                                      @click="${() => {
                                                        this.closeMenu();
                                                        this.handleDuplicateTransaction(
                                                          tx,
                                                        );
                                                      }}"
                                                    >
                                                      <span
                                                        >${icon('copy', 'ASSET', 16)}</span
                                                      >
                                                      <span
                                                        >Duplicate as New</span
                                                      >
                                                    </button>
                                                    ${
                                                      tx.reversalTransactionId
                                                        ? html`
                                                            <button
                                                              type="button"
                                                              class="actions-menu-item"
                                                              @click="${() => {
                                                                this.closeMenu();
                                                                this.scrollToTx(
                                                                  tx.reversalTransactionId!,
                                                                );
                                                              }}"
                                                            >
                                                              <span
                                                                >${icon('undo-2', 'ASSET', 16)}</span
                                                              >
                                                              <span
                                                                >View
                                                                Reversal</span
                                                              >
                                                            </button>
                                                          `
                                                        : nothing
                                                    }
                                                  `
                                                : isReversal
                                                  ? html`
                                                      <button
                                                        type="button"
                                                        class="actions-menu-item"
                                                        @click="${() => {
                                                          this.closeMenu();
                                                          this.handleDuplicateTransaction(
                                                            tx,
                                                          );
                                                        }}"
                                                      >
                                                        <span
                                                          >${icon('copy', 'ASSET', 16)}</span
                                                        >
                                                        <span
                                                          >Duplicate as
                                                          New</span
                                                        >
                                                      </button>
                                                      ${
                                                        tx.reversesTransactionId
                                                          ? html`
                                                              <button
                                                                type="button"
                                                                class="actions-menu-item"
                                                                @click="${() => {
                                                                  this.closeMenu();
                                                                  this.scrollToTx(
                                                                    tx.reversesTransactionId!,
                                                                  );
                                                                }}"
                                                              >
                                                                <span
                                                                  >${icon('file-text', 'ASSET', 16)}</span
                                                                >
                                                                <span
                                                                  >View
                                                                  Original</span
                                                                >
                                                              </button>
                                                            `
                                                          : nothing
                                                      }
                                                    `
                                                  : html`
                                                      <button
                                                        type="button"
                                                        class="actions-menu-item"
                                                        @click="${() => {
                                                          this.closeMenu();
                                                          this.handleEditTransaction(
                                                            tx,
                                                          );
                                                        }}"
                                                      >
                                                        <span
                                                          >${icon('pencil', 'ASSET', 16)}</span
                                                        >
                                                        <span
                                                          >Edit
                                                          Transaction</span
                                                        >
                                                      </button>

                                                      <button
                                                        type="button"
                                                        class="actions-menu-item"
                                                        @click="${() => {
                                                          this.closeMenu();
                                                          this.handleDuplicateTransaction(
                                                            tx,
                                                          );
                                                        }}"
                                                      >
                                                        <span
                                                          >${icon('copy', 'ASSET', 16)}</span
                                                        >
                                                        <span
                                                          >Duplicate as
                                                          New</span
                                                        >
                                                      </button>

                                                      <button
                                                        type="button"
                                                        class="actions-menu-item"
                                                        @click="${() => {
                                                          this.closeMenu();
                                                          this.handleSaveAsTemplate(
                                                            tx,
                                                          );
                                                        }}"
                                                      >
                                                        <span
                                                          >${icon('star', 'ASSET', 16)}</span
                                                        >
                                                        <span
                                                          >Save as
                                                          Template</span
                                                        >
                                                      </button>

                                                      <button
                                                        type="button"
                                                        class="actions-menu-item"
                                                        @click="${() => {
                                                          this.closeMenu();
                                                          this.toggleCleared(
                                                            tx,
                                                          );
                                                        }}"
                                                      >
                                                        <span
                                                          >${icon(tx.isCleared ? 'circle' : 'check', 'ASSET', 16)}</span
                                                        >
                                                        <span
                                                          >Mark as
                                                          ${tx.isCleared ? 'Uncleared' : 'Cleared'}</span
                                                        >
                                                      </button>

                                                      <div
                                                        class="actions-menu-divider"
                                                      ></div>

                                                      <button
                                                        type="button"
                                                        class="actions-menu-item"
                                                        ?disabled="${!canReorder || isFirst}"
                                                        @click="${() => {
                                                          this.closeMenu();
                                                          this.moveTransaction(
                                                            tx,
                                                            'up',
                                                          );
                                                        }}"
                                                      >
                                                        <span>▲</span>
                                                        <span
                                                          >Move Earlier</span
                                                        >
                                                      </button>

                                                      <button
                                                        type="button"
                                                        class="actions-menu-item"
                                                        ?disabled="${!canReorder || isLast}"
                                                        @click="${() => {
                                                          this.closeMenu();
                                                          this.moveTransaction(
                                                            tx,
                                                            'down',
                                                          );
                                                        }}"
                                                      >
                                                        <span>▼</span>
                                                        <span>Move Later</span>
                                                      </button>

                                                      <div
                                                        class="actions-menu-divider"
                                                      ></div>

                                                      ${
                                                        isOpeningBal
                                                          ? html`
                                                              <button
                                                                type="button"
                                                                class="actions-menu-item danger"
                                                                @click="${() => {
                                                                  this.closeMenu();
                                                                  this.openDeleteModal(
                                                                    tx,
                                                                  );
                                                                }}"
                                                              >
                                                                <span
                                                                  >${icon('lock', 'ASSET', 16)}</span
                                                                >
                                                                <span
                                                                  >Delete
                                                                  opening
                                                                  balance</span
                                                                >
                                                              </button>
                                                            `
                                                          : tx.isCleared
                                                            ? html`
                                                                <button
                                                                  type="button"
                                                                  class="actions-menu-item warning"
                                                                  @click="${() => {
                                                                    this.closeMenu();
                                                                    this.openVoidModal(
                                                                      tx,
                                                                    );
                                                                  }}"
                                                                >
                                                                  <span
                                                                    >${icon('undo-2', 'ASSET', 16)}</span
                                                                  >
                                                                  <span
                                                                    >Reverse /
                                                                    Void</span
                                                                  >
                                                                </button>
                                                              `
                                                            : html`
                                                                <button
                                                                  type="button"
                                                                  class="actions-menu-item danger"
                                                                  @click="${() => {
                                                                    this.closeMenu();
                                                                    this.openDeleteModal(
                                                                      tx,
                                                                    );
                                                                  }}"
                                                                >
                                                                  <span
                                                                    >${icon('trash-2', 'ASSET', 16)}</span
                                                                  >
                                                                  <span
                                                                    >Delete
                                                                    Transaction</span
                                                                  >
                                                                </button>
                                                              `
                                                      }
                                                    `
                                            }
                                          </div>
                                        `
                                      : nothing
                                  }
                                </div>
                              </div>
                            </div>

                            <!-- Sub-splits and notes expanded panel -->
                            ${
                              isExpanded
                                ? html`
                                    <div class="tx-expanded-panel">
                                      ${
                                        tx.note
                                          ? html`
                                              <div class="tx-expanded-note">
                                                <span class="note-label">
                                                  ${icon('file-text', 'ASSET', 14)}
                                                  Note:
                                                </span>
                                                <span class="note-text"
                                                  >${tx.note}</span
                                                >
                                              </div>
                                            `
                                          : nothing
                                      }

                                      <div class="splits-detail-list">
                                        <div class="splits-detail-header">
                                          <span
                                            >Splits (${tx.splits.length})</span
                                          >
                                        </div>
                                        ${tx.splits.map(
                                          (s) => html`
                                            <div class="split-detail-line">
                                              <span class="split-account-tag">
                                                <span
                                                  >${icon(s.accountIcon, s.accountType || 'EXPENSE')}</span
                                                >
                                                <strong
                                                  >${s.accountName || 'Account'}</strong
                                                >
                                                <span
                                                  style="font-size: 0.7rem; color: var(--text-muted);"
                                                  >(${s.accountType})</span
                                                >
                                              </span>
                                              <span
                                                class="split-amount ${s.amountCents < 0 ? 'negative' : 'positive'}"
                                              >
                                                ${this.formatCents(s.amountCents)}
                                              </span>
                                            </div>
                                          `,
                                        )}
                                      </div>
                                    </div>
                                  `
                                : nothing
                            }
                          </div>
                        `;
                      })}
                    </div>
                  `
        }
      </div>

      ${this.renderDeleteModal()} ${this.renderVoidModal()}
      ${
        this.toastMessage
          ? html`
              <div class="toast-banner">
                <span>${icon('check', 'ASSET', 16)}</span>
                <span>${this.toastMessage}</span>
              </div>
            `
          : nothing
      }
    `;
  }

  private renderDeleteModal() {
    if (!this.deleteModalTx) return nothing;
    const tx = this.deleteModalTx;
    return html`
      <div
        class="modal-backdrop"
        @click="${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.requestCloseModals();
        }}"
      >
        <div class="modal-card" @click="${(e: Event) => e.stopPropagation()}">
          <div class="modal-header">
            <h3>
              ${this.isOpeningBalance(tx) ? 'Delete opening balance?' : 'Delete transaction?'}
            </h3>
            <button
              type="button"
              class="modal-close-btn"
              @click="${this.requestCloseModals}"
              title="Close"
              aria-label="Close dialog"
              title="Close dialog"
            >
              ${icon('x', 'ASSET', 16)}
            </button>
          </div>
          <div class="modal-body">
            ${this.actionError ? html`<div class="dialog-error-banner">${this.actionError}</div>` : nothing}
            <p>
              Delete the
              <strong>${this.getTransactionDisplayAmount(tx)}</strong>
              transaction “<strong>${tx.payee || 'Unnamed Event'}</strong>” from
              <strong>${tx.transactionDate}</strong>?
            </p>
            <p style="color: var(--text-secondary); font-size: 0.85rem;">
              ${
                this.isOpeningBalance(tx)
                  ? 'Deleting this opening balance changes the account balance and reports. Both the account entry and equity counterpart will be removed. You can enter a replacement in the account form.'
                  : tx.splits.length > 2
                    ? `This split transaction contains ${tx.splits.length} split lines. All lines will be permanently deleted.`
                    : 'This will update all affected account balances and reports.'
              }
              This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn-secondary"
              @click="${this.requestCloseModals}"
              ?disabled="${this.isDeleting}"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn-danger"
              @click="${this.handleDeleteSubmit}"
              ?disabled="${this.isDeleting}"
            >
              ${this.isDeleting ? 'Deleting...' : this.isOpeningBalance(tx) ? 'Delete opening balance' : 'Delete transaction'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderVoidModal() {
    if (!this.voidModalTx) return nothing;
    const tx = this.voidModalTx;
    return html`
      <div
        class="modal-backdrop"
        @click="${(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.requestCloseModals();
        }}"
      >
        <div class="modal-card" @click="${(e: Event) => e.stopPropagation()}">
          <div class="modal-header">
            <h3>Reverse cleared transaction?</h3>
            <button
              type="button"
              class="modal-close-btn"
              @click="${this.requestCloseModals}"
              title="Close"
              aria-label="Close dialog"
              title="Close dialog"
            >
              ${icon('x', 'ASSET', 16)}
            </button>
          </div>
          <div class="modal-body">
            ${this.actionError ? html`<div class="dialog-error-banner">${this.actionError}</div>` : nothing}
            <p>
              The original transaction
              “<strong>${tx.payee || 'Unnamed Event'}</strong>”
              (${this.getTransactionDisplayAmount(tx)}) will remain in the
              history. Penga will create an equal and opposite transaction so
              its accounting effect becomes zero.
            </p>
            <div class="dialog-input-group">
              <label for="reversal-date">Reversal date</label>
              <input
                id="reversal-date"
                class="dialog-input"
                type="date"
                .value="${this.voidDate}"
                @input="${(e: Event) => (this.voidDate = (e.target as HTMLInputElement).value)}"
                ?disabled="${this.isVoiding}"
              />
            </div>
            <div class="dialog-input-group">
              <label for="void-reason">Reason (optional)</label>
              <input
                id="void-reason"
                class="dialog-input"
                type="text"
                placeholder="e.g. Entered twice, refunded by merchant"
                .value="${this.voidReason}"
                @input="${(e: Event) => (this.voidReason = (e.target as HTMLInputElement).value)}"
                ?disabled="${this.isVoiding}"
              />
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn-secondary"
              @click="${this.requestCloseModals}"
              ?disabled="${this.isVoiding}"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn-warning-action"
              @click="${this.handleVoidSubmit}"
              ?disabled="${this.isVoiding}"
            >
              ${this.isVoiding ? 'Reversing...' : 'Reverse transaction'}
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'penga-transactions': PengaTransactions;
  }
}
