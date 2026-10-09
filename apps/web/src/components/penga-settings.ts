import { calmStyles } from './calm-styles.js';
import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';

type Summary = {
  transactions: number;
  splits: number;
  transactionTags: number;
  revision: string;
};
const confirmation = 'DELETE ALL TRANSACTIONS';

@customElement('penga-settings')
export class PengaSettings extends LitElement {
  static override styles = [
    css`
      :host {
        display: block;
        padding: 2rem;
        color: var(--text-primary);
      }
      section {
        max-width: 700px;
        padding: 1.5rem;
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
      }
      h1 {
        margin-top: 0;
      }
      h2 {
        margin-top: 0;
      }
      p {
        line-height: 1.6;
      }
      .danger-zone {
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--color-danger);
      }
      button,
      input {
        font: inherit;
        padding: 0.7rem 1rem;
        border-radius: var(--radius-md);
      }
      button {
        cursor: pointer;
        background: var(--bg-surface);
        color: var(--text-primary);
        border: 1px solid var(--border-subtle);
      }
      button.danger {
        background: var(--color-danger);
        color: var(--on-accent);
        border-color: var(--color-danger);
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      button:focus-visible,
      input:focus-visible {
        outline: 3px solid var(--color-primary);
        outline-offset: 3px;
      }
      dialog {
        width: min(540px, calc(100vw - 4rem));
        padding: 1.5rem;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        background: var(--bg-surface);
        color: var(--text-primary);
      }
      dialog::backdrop {
        background: var(--overlay);
      }
      label {
        display: block;
        margin-bottom: 0.5rem;
      }
      input {
        box-sizing: border-box;
        width: 100%;
        background: var(--bg-base);
        color: var(--text-primary);
        border: 1px solid var(--border-subtle);
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.5rem;
      }
      .error {
        color: var(--color-danger);
      }
    `,
    calmStyles,
  ];

  @state() private summary: Summary | null = null;
  @state() private phrase = '';
  @state() private loading = false;
  @state() private processing = false;
  @state() private stale = false;
  @state() private error = '';
  @state() private message = '';

  private get dialog() {
    return this.shadowRoot!.querySelector('dialog')!;
  }

  private async openDialog() {
    this.phrase = '';
    this.summary = null;
    this.error = '';
    this.message = '';
    this.stale = false;
    await this.updateComplete;
    this.dialog.showModal();
    await this.loadSummary();
  }

  private async loadSummary() {
    if (this.loading || this.processing) return;
    this.loading = true;
    this.phrase = '';
    this.summary = null;
    this.error = '';
    this.stale = false;
    try {
      const response = await fetch(
        '/api/data-management/transactions/summary',
        { cache: 'no-store' },
      );
      const body = await response.json();
      if (!response.ok)
        throw new Error(body.error || 'Could not load transaction history.');
      this.summary = body.data;
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : 'Could not load transaction history.';
    } finally {
      this.loading = false;
    }
  }

  private cancel() {
    if (this.processing) return;
    this.dialog.close();
    this.phrase = '';
    this.shadowRoot?.querySelector<HTMLButtonElement>('#open-clear')?.focus();
  }

  private async clearTransactions() {
    if (
      this.processing ||
      this.loading ||
      this.stale ||
      !this.summary ||
      this.phrase !== confirmation
    )
      return;
    this.processing = true;
    this.error = '';
    try {
      const response = await fetch('/api/data-management/transactions/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmation: this.phrase,
          revision: this.summary.revision,
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        if (response.status === 409) {
          this.stale = true;
          this.phrase = '';
        }
        throw new Error(body.error || 'Could not clear transactions.');
      }
      this.dialog.close();
      this.phrase = '';
      this.message = `Cleared ${body.data.transactions} transactions. Account balances are now zero.`;
      this.dispatchEvent(
        new CustomEvent('ledger-cleared', { bubbles: true, composed: true }),
      );
      this.shadowRoot?.querySelector<HTMLButtonElement>('#open-clear')?.focus();
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : 'Could not clear transactions.';
    } finally {
      this.processing = false;
    }
  }

  override render() {
    const hasHistory =
      !!this.summary &&
      this.summary.transactions +
        this.summary.splits +
        this.summary.transactionTags >
        0;
    return html`
      <h1>Settings</h1>
      <section aria-labelledby="data-heading">
        <h2 id="data-heading">Data management</h2>
        <p>
          Manage your ledger history while keeping your configured accounts and
          other setup.
        </p>
        <div class="danger-zone">
          <h3>Clear all transactions</h3>
          <p>
            Permanently remove transaction history across all dates and
            accounts.
          </p>
          <button
            id="open-clear"
            class="danger"
            ?disabled=${this.processing}
            @click=${this.openDialog}
          >
            Clear all transactions
          </button>
        </div>
        <p role="status">${this.message}</p>
      </section>
      <dialog
        aria-labelledby="clear-heading"
        aria-describedby="clear-description"
        aria-busy=${this.processing}
        @cancel=${(event: Event) => {
          event.preventDefault();
          this.cancel();
        }}
      >
        <h2 id="clear-heading">Clear all transactions?</h2>
        <p id="clear-description">
          This permanently deletes all transactions, including opening balances,
          transfers and void/reversal history. Your accounts, categories and
          other setup will be kept. Balances will return to zero. You can enter
          replacement opening balances, with their effective dates, in the
          account edit form. Saved templates and budgets still referencing an
          account must be removed or reassigned before deleting that account.
          This cannot be undone within Penga.
        </p>
        <p>Consider making a database backup first.</p>
        <p>
          Cleared and reconciliation marks are removed with their transactions.
        </p>
        ${
          this.loading
            ? html`<p role="status">Loading transaction count…</p>`
            : this.summary
              ? html`
                  <p role="status">
                    ${this.summary.transactions} transactions across all dates
                    and accounts.
                  </p>
                  ${
                    hasHistory
                      ? html`
                          ${this.summary.transactions === 0 ? html`<p>Remaining transaction-owned history will also be removed.</p>` : ''}
                          <label for="confirmation"
                            >Type DELETE ALL TRANSACTIONS to confirm</label
                          >
                          <input
                            id="confirmation"
                            autocomplete="off"
                            spellcheck="false"
                            .value=${this.phrase}
                            ?disabled=${this.processing || this.stale}
                            @input=${(event: Event) => {
                              this.phrase = (
                                event.target as HTMLInputElement
                              ).value;
                            }}
                          />
                        `
                      : html`<p>
                          There are no transactions or transaction-owned records
                          to clear.
                        </p>`
                  }
                `
              : ''
        }
        ${this.error ? html`<p class="error" role="alert">${this.error}</p>` : ''}
        <div class="actions">
          <button autofocus ?disabled=${this.processing} @click=${this.cancel}>
            Cancel
          </button>
          ${this.stale || (!this.loading && !this.summary) ? html`<button ?disabled=${this.processing} @click=${this.loadSummary}>Refresh summary</button>` : ''}
          <button
            class="danger"
            ?disabled=${!hasHistory || this.phrase !== confirmation || this.processing || this.loading || this.stale}
            @click=${this.clearTransactions}
          >
            ${this.processing ? 'Clearing…' : 'Clear all transactions'}
          </button>
        </div>
      </dialog>
    `;
  }
}
