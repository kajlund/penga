import { css } from 'lit';
// Shared shadow-root rules: focus, disabled states, neutral icon slots and badges.
export const calmStyles = css`
  :focus-visible {
    outline: 2px solid var(--border-focus);
    outline-offset: 3px;
  }
  .btn-warning-action {
    color: var(--on-warning);
  }
  .btn-danger:hover:not(:disabled) {
    filter: none;
  }
  input,
  select,
  textarea {
    border-color: var(--border-control);
  }
  :host button:disabled {
    opacity: 1;
    background: var(--bg-muted);
    color: var(--text-secondary);
    border-color: var(--border-strong);
    box-shadow: none;
    cursor: not-allowed;
    transform: none;
  }
  .account-icon,
  .account-avatar,
  .template-icon-badge,
  .tx-icon-bubble {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    min-width: 22px;
    height: 24px;
    color: var(--icon-color);
    background: transparent;
    border: 0;
    border-radius: 0;
  }
  .nav-icon {
    width: 22px;
    min-width: 22px;
  }
  .type-badge,
  .badge-pill {
    font-weight: 500;
  }
  .type-badge.equity,
  .type-badge.EQUITY {
    color: var(--color-equity);
    background: var(--color-equity-bg);
    border: 1px solid var(--color-equity-border);
  }
  .metric-icon {
    color: var(--icon-color);
  }
  .filter-pill.active .badge-count {
    color: var(--color-primary-text);
    background: var(--color-primary-subtle);
  }
  .brand-logo {
    background: var(--color-primary);
    box-shadow: var(--shadow-sm);
  }
  .status-dot {
    box-shadow: none;
  }
  .btn-primary {
    box-shadow: var(--shadow-sm);
  }
  .btn-primary:hover {
    box-shadow: var(--shadow-sm);
  }
  .danger-zone {
    border-color: var(--color-danger-border);
  }
  button.danger,
  .btn-danger {
    background: var(--color-danger);
    color: var(--on-danger);
    border-color: var(--color-danger);
  }
  button.danger:hover:not(:disabled),
  .btn-danger:hover:not(:disabled) {
    background: var(--color-danger-hover);
  }
  .actions-menu-item.danger:hover,
  .btn-icon.danger:hover {
    background: var(--color-danger-bg);
    color: var(--color-danger);
  }
  .error,
  .error-message {
    color: var(--color-danger);
  }
`;
