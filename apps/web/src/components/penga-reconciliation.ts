import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  formatMoney,
  inTransactionDateRange,
  type Account,
} from '@penga/shared';
import { calmStyles } from './calm-styles.js';
type Entry = {
  id: string;
  date: string;
  payee: string | null;
  note: string | null;
  amountCents: number;
  isCleared: boolean;
  voidedAt: string | null;
  reconciliationId: string | null;
};
type Record = {
  id: string;
  startDate: string;
  closingDate: string;
  startingBalanceCents: number;
  closingBalanceCents: number;
  completedAt: string;
  undoneAt: string | null;
};
type Snapshot = {
  entries: Entry[];
  history: Record[];
  latest?: Record;
  openings: Entry[];
};
@customElement('penga-reconciliation')
export class PengaReconciliation extends LitElement {
  static override styles = [
    calmStyles,
    css`
      :host {
        display: block;
        padding: 1.5rem;
        overflow: auto;
        height: 100%;
        box-sizing: border-box;
      }
      section {
        background: var(--bg-surface);
        padding: 1rem;
        margin: 1rem 0;
        border: 1px solid var(--border-subtle);
        border-radius: 12px;
      }
      .controls {
        display: flex;
        gap: 1rem;
        flex-wrap: wrap;
      }
      label {
        display: flex;
        gap: 0.4rem;
        align-items: center;
      }
      input,
      select,
      button {
        font: inherit;
        padding: 0.5rem;
        color: var(--text-primary);
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: 6px;
      }
      button {
        cursor: pointer;
      }
      button:disabled {
        opacity: 0.5;
        cursor: default;
      }
      table {
        width: 100%;
        border-collapse: collapse;
      }
      td,
      th {
        text-align: left;
        padding: 0.6rem;
        border-bottom: 1px solid var(--border-subtle);
      }
      .error {
        color: var(--color-danger-text);
      }
    `,
  ];
  @state() private accounts: Account[] = [];
  @state() private accountId = '';
  @state() private snapshot: Snapshot | null = null;
  @state() private start = '';
  @state() private closing = '';
  @state() private balance = '';
  @state() private from = '';
  @state() private to = '';
  @state() private search = '';
  @state() private status = 'ALL';
  @state() private selected = new Set<string>();
  @state() private error = '';
  @state() private busy = false;
  @state() private inspect = '';
  @state() private confirmUndo = false;
  private requestVersion = 0;
  override connectedCallback() {
    super.connectedCallback();
    void this.fetchData();
  }
  public async fetchData() {
    try {
      const r = await fetch('/api/accounts');
      if (!r.ok) throw new Error('Could not load accounts.');
      this.accounts = (await r.json()).data.filter((a: Account) =>
        ['ASSET', 'LIABILITY', 'SETTLEMENT'].includes(a.type),
      );
      if (this.accountId) await this.load();
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
  private async load() {
    const version = ++this.requestVersion;
    this.snapshot = null;
    this.selected = new Set();
    this.inspect = '';
    this.confirmUndo = false;
    this.error = '';
    if (!this.accountId) return;
    try {
      const r = await fetch('/api/reconciliations/' + this.accountId);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      if (version !== this.requestVersion) return;
      this.snapshot = j.data;
    } catch (e) {
      this.error = (e as Error).message;
    }
  }
  private opening(e: Entry) {
    return (
      e.payee === 'Opening Balance' ||
      !!e.note?.startsWith('Starting balance for ')
    );
  }
  private async save(undo = false) {
    this.busy = true;
    this.error = '';
    try {
      const r = await fetch(
        '/api/reconciliations/' +
          this.accountId +
          (undo ? '/' + this.snapshot!.latest!.id + '/undo' : ''),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            undo
              ? { confirmation: 'UNDO' }
              : {
                  startDate: this.start,
                  closingDate: this.closing,
                  closingBalanceCents: this.cents(),
                  entryIds: [...this.selected],
                },
          ),
        },
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await this.load();
    } catch (e) {
      this.error = (e as Error).message;
    } finally {
      this.busy = false;
    }
  }
  private cents() {
    if (!/^-?\d+(\.\d{1,2})?$/.test(this.balance)) return NaN;
    const [whole, fraction = ''] = this.balance.replace('-', '').split('.');
    return (
      (Number(whole) * 100 + Number(fraction.padEnd(2, '0'))) *
      (this.balance.startsWith('-') ? -1 : 1)
    );
  }
  override render() {
    const s = this.snapshot;
    const starting =
      s?.latest?.closingBalanceCents ??
      s?.openings
        .filter((e) => e.date <= this.start)
        .reduce((sum, e) => sum + e.amountCents, 0) ??
      0;
    const chosen = s?.entries.filter((e) => this.selected.has(e.id)) ?? [];
    const movement = chosen.reduce((sum, e) => sum + e.amountCents, 0);
    const difference = starting + movement - this.cents();
    const eligible = (e: Entry) =>
      !e.voidedAt &&
      !e.reconciliationId &&
      !this.opening(e) &&
      !!this.closing &&
      e.date <= this.closing;
    const visible = (s?.entries ?? []).filter(
      (e) =>
        inTransactionDateRange(e.date, this.from, this.to) &&
        (e.payee ?? '').toLowerCase().includes(this.search.toLowerCase()) &&
        (this.status === 'ALL' ||
          (this.status === 'RECONCILED'
            ? !!e.reconciliationId
            : this.status === 'CLEARED'
              ? e.isCleared && !e.reconciliationId
              : !e.isCleared && !e.reconciliationId)) &&
        (!this.inspect || e.reconciliationId === this.inspect),
    );
    const hidden = chosen.filter((e) => !visible.includes(e));
    const valid =
      this.start &&
      this.closing &&
      this.start <= this.closing &&
      (!s?.latest || this.start > s.latest.closingDate) &&
      Number.isSafeInteger(this.cents()) &&
      difference === 0 &&
      chosen.every(eligible) &&
      !s?.openings.some(
        (e) => !s.latest && e.date > this.start && e.date <= this.closing,
      );
    return html`<h2>Statement reconciliation</h2>
      <p>
        Compare one account with its statement. Older outstanding entries remain
        available. Balances use the account's signed ledger convention,
        including negative liabilities.
      </p>
      <label
        >Account
        <select
          .value=${this.accountId}
          @change=${(e: Event) => {
            this.accountId = (e.target as HTMLSelectElement).value;
            void this.load();
          }}
        >
          <option value="">Choose account</option>
          ${this.accounts.map((a) => html`<option value=${a.id}>${a.name}</option>`)}
        </select></label
      >
      ${this.error ? html`<p role="alert" class="error">${this.error}</p>` : ''}
      ${
        s
          ? html`<section>
                <div class="controls">
                  <label
                    >Statement start
                    <input
                      type="date"
                      .value=${this.start}
                      @input=${(e: Event) => (this.start = (e.target as HTMLInputElement).value)} /></label
                  ><label
                    >Closing date
                    <input
                      type="date"
                      .value=${this.closing}
                      @input=${(e: Event) => (this.closing = (e.target as HTMLInputElement).value)} /></label
                  ><label
                    >Closing balance
                    <input
                      inputmode="decimal"
                      .value=${this.balance}
                      @input=${(e: Event) => (this.balance = (e.target as HTMLInputElement).value)}
                  /></label>
                </div>
                <p>
                  Starting reconciled balance: ${formatMoney(starting)} |
                  Selected movement: ${formatMoney(movement)} | Calculated
                  closing: ${formatMoney(starting + movement)} | Statement:
                  ${Number.isFinite(this.cents()) ? formatMoney(this.cents()) : 'Enter balance'}
                  | Difference:
                  ${Number.isFinite(difference) ? formatMoney(difference) : '-'}
                </p>
                ${!s.latest && !s.openings.length ? html`<p>Starting from zero. Record a genuine opening balance using the account form before reconciling if needed.</p>` : ''}
                <p>
                  A nonzero difference means the selected ledger movement and
                  statement balance do not match. Review the statement,
                  selection, dates and opening balance.
                </p>
                <button
                  ?disabled=${!valid || this.busy}
                  @click=${() => this.save()}
                >
                  Complete reconciliation
                </button>
              </section>
              <section>
                <div class="controls">
                  <label
                    >From
                    <input
                      type="date"
                      .value=${this.from}
                      @input=${(e: Event) => (this.from = (e.target as HTMLInputElement).value)} /></label
                  ><label
                    >To
                    <input
                      type="date"
                      .value=${this.to}
                      @input=${(e: Event) => (this.to = (e.target as HTMLInputElement).value)} /></label
                  ><label
                    >Search
                    <input
                      .value=${this.search}
                      @input=${(e: Event) => (this.search = (e.target as HTMLInputElement).value)} /></label
                  ><select
                    .value=${this.status}
                    aria-label="Entry status"
                    @change=${(e: Event) => (this.status = (e.target as HTMLSelectElement).value)}
                  >
                    ${['ALL', 'UNCLEARED', 'CLEARED', 'RECONCILED'].map((v) => html`<option>${v}</option>`)}</select
                  ><button
                    @click=${() => {
                      this.from = '';
                      this.to = '';
                      this.search = '';
                      this.status = 'ALL';
                    }}
                  >
                    Reset filters
                  </button>
                </div>
                <p>
                  Filtered movement:
                  ${formatMoney(visible.filter((e) => !e.voidedAt).reduce((sum, e) => sum + e.amountCents, 0))}
                  (not account balance). Selected entries hidden by filters:
                  ${hidden.length},
                  ${formatMoney(hidden.reduce((sum, e) => sum + e.amountCents, 0))}.
                </p>
                <table>
                  <thead>
                    <tr>
                      <th>Select</th>
                      <th>Date</th>
                      <th>Payee</th>
                      <th>Status</th>
                      <th>Movement</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${visible.map(
                      (e) =>
                        html`<tr>
                          <td>
                            <input
                              type="checkbox"
                              aria-label=${'Select ' + (e.payee ?? e.date)}
                              .checked=${this.selected.has(e.id)}
                              ?disabled=${!eligible(e) && !this.selected.has(e.id)}
                              @change=${() => {
                              const next = new Set(this.selected);
                              if (next.has(e.id)) next.delete(e.id);
                              else next.add(e.id);
                              this.selected = next;
                            }}
                            />
                          </td>
                          <td>${e.date}</td>
                          <td>${e.payee}</td>
                          <td>
                            ${e.reconciliationId ? 'Reconciled' : e.isCleared ? 'Cleared' : 'Uncleared'}${e.voidedAt ? ' / Voided' : ''}
                          </td>
                          <td>${formatMoney(e.amountCents)}</td>
                        </tr>`,
                    )}
                  </tbody>
                </table>
              </section>
              <section>
                <h3>History</h3>
                <button @click=${() => (this.inspect = '')}>
                  Show all entries</button
                >${s.history.map((r) => html`<p><button ?disabled=${!!r.undoneAt} @click=${() => (this.inspect = r.id)}>${r.startDate} - ${r.closingDate}</button> ${formatMoney(r.closingBalanceCents)} | Completed ${new Date(r.completedAt).toLocaleString()} ${r.undoneAt ? '(undone)' : ''}</p>`)}${
                  s.latest
                    ? html`<button
                          ?disabled=${this.busy}
                          @click=${() => (this.confirmUndo = true)}
                        >
                          Undo latest reconciliation</button
                        >${
                        this.confirmUndo
                          ? html`<p>
                                Release this statement's entries and retain
                                their cleared status?
                              </p>
                              <button
                                ?disabled=${this.busy}
                                @click=${() => this.save(true)}
                              >
                                Confirm undo</button
                              ><button
                                @click=${() => (this.confirmUndo = false)}
                              >
                                Cancel
                              </button>`
                          : ''
                      }`
                    : ''
                }
              </section>`
          : ''
      }`;
  }
}
