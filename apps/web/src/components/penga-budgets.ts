import { calmStyles } from './calm-styles.js';
import { icon } from './icons.js';
import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  APP_CURRENCY,
  formatMoney,
  shiftMonth,
  type BudgetNode,
  type BudgetTotals,
  type HierarchicalBudgetReport,
} from '@penga/shared';

@customElement('penga-budgets')
export class PengaBudgets extends LitElement {
  static override styles = [
    css`
      :host {
        display: block;
        padding: 1.5rem 2.5rem 3rem;
        max-width: 1240px;
        margin: auto;
        font-family: var(--font-sans);
        color: var(--text-primary);
      }
      h2 {
        margin: 0;
        font-size: 1.75rem;
        letter-spacing: -0.025em;
      }
      h3 {
        margin-top: 0;
      }
      p {
        line-height: 1.5;
      }
      header,
      .month,
      .summary,
      .actions {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-wrap: wrap;
      }
      header {
        justify-content: space-between;
        margin-bottom: 1rem;
      }
      .subtitle,
      .muted,
      small {
        color: var(--text-secondary);
      }
      small {
        display: block;
        font-size: 0.75rem;
        margin-top: 0.25rem;
        line-height: 1.4;
      }
      button,
      input,
      textarea {
        font: inherit;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-sm);
        padding: 0.45rem 0.65rem;
        background: var(--bg-surface);
        color: var(--text-primary);
      }
      button {
        cursor: pointer;
      }
      button:hover {
        background: var(--bg-subtle);
      }
      .primary {
        background: var(--color-primary);
        color: var(--on-accent);
      }
      .month strong {
        min-width: 9rem;
        text-align: center;
      }
      .summary {
        background: var(--bg-surface);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        padding: 1rem;
        gap: 1.5rem;
        margin: 1rem 0;
      }
      .summary div {
        flex: 1;
        min-width: 170px;
      }
      .summary span {
        display: block;
        font-size: 0.8rem;
        color: var(--text-secondary);
      }
      .summary strong {
        display: block;
        margin-top: 0.35rem;
        font-family: var(--font-mono);
        font-size: 1.2rem;
      }
      .table-wrap {
        overflow-x: auto;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        background: var(--bg-surface);
      }
      table {
        width: 100%;
        border-collapse: collapse;
        min-width: 820px;
      }
      th,
      td {
        text-align: left;
        padding: 0.7rem 0.8rem;
        border-bottom: 1px solid var(--border-subtle);
        vertical-align: top;
      }
      th {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-secondary);
      }
      td.money {
        font-family: var(--font-mono);
        white-space: nowrap;
      }
      .group {
        background: var(--bg-subtle);
      }
      .name {
        display: flex;
        gap: 0.4rem;
        align-items: center;
      }
      .expand {
        border: 0;
        background: transparent;
        padding: 0.1rem;
        width: 1.5rem;
      }
      .track {
        height: 5px;
        background: var(--bg-muted);
        border-radius: 3px;
        overflow: hidden;
        margin-top: 0.4rem;
        min-width: 90px;
      }
      .fill {
        height: 100%;
        background: var(--color-primary);
      }
      .over {
        font-weight: 600;
      }
      .over .fill {
        background: var(--color-warning);
      }
      .note {
        max-width: 15rem;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
      }
      .detail-content {
        padding: 1rem;
        background: var(--bg-subtle);
      }
      summary {
        cursor: pointer;
        font-size: 0.8rem;
      }
      .coverage {
        margin-top: 1rem;
        padding: 1rem;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
      }
      .error {
        padding: 0.75rem;
        border: 1px solid var(--color-danger-border);
        color: var(--color-negative);
      }
      .backdrop {
        position: fixed;
        inset: 0;
        background: var(--overlay);
        z-index: 100;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 1rem;
      }
      .dialog {
        background: var(--bg-surface);
        padding: 1.5rem;
        max-width: 460px;
        width: 100%;
        max-height: 85vh;
        overflow: auto;
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-lg);
        box-shadow: var(--shadow-lg);
      }
      label {
        display: block;
        margin: 0.8rem 0;
      }
      label input,
      label textarea {
        display: block;
        margin-top: 0.35rem;
        box-sizing: border-box;
        width: 100%;
      }
      .dialog .actions {
        justify-content: flex-end;
        margin-top: 1rem;
      }
      textarea {
        min-height: 5rem;
        resize: vertical;
      }
      @media (max-width: 700px) {
        :host {
          padding: 1rem;
        }
        .summary {
          gap: 1rem;
        }
        .summary div {
          min-width: 130px;
        }
        header {
          align-items: flex-start;
        }
        .month {
          gap: 0.35rem;
        }
        .dialog {
          padding: 1rem;
        }
      }
    `,
    calmStyles,
  ];
  @state() private report: HierarchicalBudgetReport | null = null;
  @state() private currentYear = new Date().getFullYear();
  @state() private currentMonth = new Date().getMonth() + 1;
  @state() private isLoading = false;
  @state() private errorMessage = '';
  @state() private collapsed = new Set<string>();
  @state() private editing: BudgetNode | null = null;
  @state() private modalTarget = '';
  @state() private modalNotes = '';
  @state() private modalError = '';
  @state() private saving = false;
  @state() private discard = false;
  @state() private coverageDate = '';
  @state() private coverageError = '';
  private requestVersion = 0;
  private initial = '';
  private previousFocus: HTMLElement | null = null;
  override connectedCallback() {
    super.connectedCallback();
    void this.fetchData();
    window.addEventListener('keydown', this.handleKeyDown);
  }
  override disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('keydown', this.handleKeyDown);
  }
  public async fetchData() {
    await this.fetchBudgetReport();
  }
  private today() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  public async fetchBudgetReport() {
    const version = ++this.requestVersion;
    this.isLoading = true;
    this.errorMessage = '';
    try {
      const r = await fetch(
        `/api/budgets?year=${this.currentYear}&month=${this.currentMonth}&today=${this.today()}`,
      );
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Could not load budget.');
      if (version !== this.requestVersion) return;
      this.report = j.data;
      this.coverageDate = j.data.trackingStartDate ?? '';
    } catch (e) {
      if (version === this.requestVersion)
        this.errorMessage = (e as Error).message;
    } finally {
      if (version === this.requestVersion) this.isLoading = false;
    }
  }
  private navigate(delta: number) {
    const d = shiftMonth(this.currentYear, this.currentMonth, delta);
    if (d.year < 1900 || d.year > 9999) return;
    this.currentYear = d.year;
    this.currentMonth = d.month;
    void this.fetchBudgetReport();
  }
  private current() {
    const now = new Date();
    this.currentYear = now.getFullYear();
    this.currentMonth = now.getMonth() + 1;
    void this.fetchBudgetReport();
  }
  private async post(path: string, body: unknown) {
    const r = await fetch('/api/budgets' + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'Could not save budget.');
  }
  private async saveCoverage(clear = false) {
    this.saving = true;
    this.coverageError = '';
    try {
      await this.post('/coverage', {
        trackingStartDate: clear ? null : this.coverageDate || null,
      });
      await this.fetchBudgetReport();
    } catch (e) {
      this.coverageError = (e as Error).message;
    } finally {
      this.saving = false;
    }
  }
  private openSetBudgetModal(item: BudgetNode) {
    this.previousFocus = this.shadowRoot?.activeElement as HTMLElement | null;
    this.editing = item;
    this.modalTarget =
      item.savedBudget?.targetAmountCents == null
        ? ''
        : (item.savedBudget.targetAmountCents / 100).toFixed(2);
    this.modalNotes = item.savedBudget?.notes ?? '';
    this.modalError = '';
    this.discard = false;
    this.initial = JSON.stringify([this.modalTarget, this.modalNotes]);
    void this.updateComplete.then(() =>
      this.shadowRoot
        ?.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          '.dialog input, .dialog textarea',
        )
        ?.focus(),
    );
  }
  public isModalDirty() {
    return (
      !!this.editing &&
      this.initial !== JSON.stringify([this.modalTarget, this.modalNotes])
    );
  }
  public requestCloseSetBudgetModal() {
    if (this.saving) return;
    if (this.isModalDirty()) {
      this.discard = true;
      return;
    }
    this.closeSetBudgetModal();
  }
  public closeSetBudgetModal() {
    this.editing = null;
    this.discard = false;
    this.previousFocus?.focus();
  }
  private handleKeyDown = (e: KeyboardEvent) => {
    if (!this.editing) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.requestCloseSetBudgetModal();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      this.shadowRoot
        ?.querySelector<HTMLFormElement>('.dialog form')
        ?.requestSubmit();
    }
    if (e.key === 'Tab') {
      const controls = Array.from(
        this.shadowRoot?.querySelectorAll<HTMLElement>(
          '.dialog button:not([disabled]), .dialog input:not([disabled]), .dialog textarea',
        ) ?? [],
      );
      const first = controls[0],
        last = controls.at(-1),
        active = this.shadowRoot?.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first?.focus();
      }
    }
  };
  private async handleSaveBudget(e: Event, remove = false) {
    e.preventDefault();
    if (!this.editing || this.saving) return;
    const item = this.editing;
    let target: number | null = null;
    if (!remove && !item.children.length && this.modalTarget.trim()) {
      if (!/^\d+(?:[.,]\d{1,2})?$/.test(this.modalTarget.trim())) {
        this.modalError =
          'Enter a non-negative amount with up to two decimal places.';
        return;
      }
      const [whole, fraction = ''] = this.modalTarget
        .trim()
        .replace(',', '.')
        .split('.');
      target = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
      if (!Number.isSafeInteger(target) || target > 2147483647) {
        this.modalError = 'The target is too large.';
        return;
      }
    }
    this.saving = true;
    this.modalError = '';
    try {
      await this.post('', {
        accountId: item.accountId,
        ...(!item.children.length || remove
          ? { targetAmountCents: target }
          : {}),
        notes: this.modalNotes,
        periodYear: item.savedBudget?.periodYear ?? null,
        periodMonth: item.savedBudget?.periodMonth ?? null,
      });
      this.closeSetBudgetModal();
      await this.fetchBudgetReport();
    } catch (error) {
      this.modalError = (error as Error).message;
    } finally {
      this.saving = false;
    }
  }
  private usage(item: BudgetTotals) {
    if (!item.budgetedCount)
      return html`<span class="muted">Unavailable</span>`;
    const over = (item.remainingCents ?? 0) < 0;
    const label =
      item.budgetedSpentCents < 0
        ? 'Net refund'
        : item.targetCents === 0
          ? over
            ? 'Above zero target'
            : 'Zero target'
          : `${item.usagePercent}% used`;
    return html`<div class=${over ? 'over' : ''}>
      ${label}${over ? html`<small>Over by ${formatMoney(-(item.remainingCents ?? 0))}</small>` : nothing}
      <div class="track" aria-hidden="true">
        <div
          class="fill"
          style=${`width:${Math.max(0, Math.min(100, item.usagePercent ?? (over ? 100 : 0)))}%`}
        ></div>
      </div>
    </div>`;
  }
  private renderRow(item: BudgetNode, depth = 0): TemplateResult {
    const group = !!item.children.length;
    const open = !this.collapsed.has(item.accountId);
    const period =
      item.savedBudget?.periodYear != null
        ? `${item.savedBudget.periodYear}-${String(item.savedBudget.periodMonth).padStart(2, '0')} override`
        : 'Every month';
    return html`<tr class=${group ? 'group' : ''}>
        <td style=${`padding-left:${0.8 + depth * 1.15}rem`}>
          <div class="name">
            ${
              group
                ? html`<button
                    class="expand"
                    aria-label=${`${open ? 'Collapse' : 'Expand'} ${item.name}`}
                    aria-expanded=${open}
                    @click=${() => {
                      const next = new Set(this.collapsed);
                      if (open) next.add(item.accountId);
                      else next.delete(item.accountId);
                      this.collapsed = next;
                    }}
                  >
                    ${icon(open ? 'chevron-down' : 'chevron-right', 'EXPENSE', 14)}
                  </button>`
                : nothing
            }<span class="account-icon">${icon(item.icon, 'EXPENSE', 16)}</span
            ><strong>${item.name}</strong>
          </div>
          ${group ? html`<small>Calculated from descendants${item.directActualCents !== 0 ? html` · Direct postings: ${formatMoney(item.directActualCents)} (unbudgeted)` : nothing}</small>` : html`<small>${period}</small>`}
        </td>
        <td class="money">
          ${item.budgetedCount ? formatMoney(item.targetCents) : 'No budget'}${group && item.unbudgetedCount ? html`<small>${item.budgetedCount ? 'Partial coverage' : 'No budget coverage'}</small>` : nothing}${item.excludedParentTargetCents !== null ? html`<small>Saved group target ${formatMoney(item.excludedParentTargetCents)} preserved, excluded from totals. ${period}.</small>` : nothing}
        </td>
        <td class="money">
          ${formatMoney(item.actualCents)}${group && item.unbudgetedCount ? html`<small>Unbudgeted: ${formatMoney(item.unbudgetedSpentCents)}</small>` : nothing}
        </td>
        <td class="money">
          ${item.remainingCents === null ? 'Unavailable' : formatMoney(item.remainingCents)}${group ? html`<small>Remaining on budgeted accounts</small>` : nothing}
        </td>
        <td>${this.usage(item)}</td>
        <td>
          ${
            item.savedBudget?.notes
              ? html`<details>
                  <summary>Note</summary>
                  <p class="note">${item.savedBudget.notes}</p>
                </details>`
              : nothing
          }<button
            aria-label=${`Edit ${item.name} ${group ? 'notes' : 'target and note'}`}
            @click=${() => this.openSetBudgetModal(item)}
          >
            ${group ? 'Notes / saved target' : 'Edit target / note'}
          </button>
          <details>
            <summary>Statistics</summary>
            <div class="detail-content">
              ${item.projectedMonthEndCents === null ? html`<p>Month-end pace: unavailable outside the current month.</p>` : html`<p>Estimated month-end pace: ${formatMoney(item.projectedMonthEndCents)}. Based on spending to date and elapsed calendar days; irregular bills can make this misleading.</p>`}
              <p>
                3-month window:
                ${item.sample3 ? html`${formatMoney(item.rolling3MonthAvgCents!)} · Average of ${item.sample3} completed month${item.sample3 === 1 ? '' : 's'}` : 'Not enough history'}
              </p>
              <p>
                12-month window:
                ${item.sample12 ? html`${formatMoney(item.rolling12MonthAvgCents!)} · Average of ${item.sample12} completed month${item.sample12 === 1 ? '' : 's'}` : 'Not enough history'}
              </p>
            </div>
          </details>
        </td>
      </tr>
      ${group && open ? item.children.map((child) => this.renderRow(child, depth + 1)) : nothing}`;
  }
  override render() {
    const data = this.report;
    const t = data?.totals;
    return html`<header>
        <div>
          <h2>Budget</h2>
          <p class="subtitle">
            Monthly expense targets and notes. Recurring target edits apply to
            every month; existing month-specific overrides are labelled.
          </p>
        </div>
        <div class="month">
          <button
            aria-label="Previous month"
            ?disabled=${this.saving}
            @click=${() => this.navigate(-1)}
          >
            ${icon('chevron-left', 'ASSET', 16)}</button
          ><strong
            >${new Date(this.currentYear, this.currentMonth - 1, 1).toLocaleString('en-IE', { month: 'long', year: 'numeric' })}</strong
          ><button
            aria-label="Next month"
            ?disabled=${this.saving}
            @click=${() => this.navigate(1)}
          >
            ${icon('chevron-right', 'ASSET', 16)}</button
          ><button ?disabled=${this.saving} @click=${this.current}>
            Current month
          </button>
        </div>
      </header>
      ${
        this.errorMessage
          ? html`<p role="alert" class="error">${this.errorMessage}</p>
              <button @click=${this.fetchData}>Retry</button>`
          : nothing
      }
      ${
        this.isLoading
          ? html`<p role="status">Loading monthly budget...</p>`
          : !this.errorMessage && data && t
            ? html` <section
                  class="summary"
                  aria-label="Monthly budget overview"
                >
                  <div>
                    <span>Total monthly targets</span
                    ><strong>${formatMoney(t.targetCents)}</strong>
                  </div>
                  <div>
                    <span>Spending in budgeted accounts</span
                    ><strong>${formatMoney(t.budgetedSpentCents)}</strong>
                  </div>
                  <div>
                    <span>Remaining on budgeted accounts</span
                    ><strong
                      >${t.remainingCents === null ? 'Unavailable' : formatMoney(t.remainingCents)}</strong
                    >
                  </div>
                  <div>
                    <span>Spending in unbudgeted accounts</span
                    ><strong>${formatMoney(t.unbudgetedSpentCents)}</strong>
                  </div>
                </section>
                <p class="muted">
                  Expense budget only: loan principal, transfers and other
                  balance-account movements are outside it.
                  ${t.unbudgetedCount ? html`Incomplete budget coverage: ${t.unbudgetedCount} account${t.unbudgetedCount === 1 ? '' : 's'} with no target.` : nothing}
                </p>
                ${
                  data.items.length
                    ? html`<div class="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th scope="col">Account / group</th>
                              <th scope="col">
                                Monthly target (${APP_CURRENCY})
                              </th>
                              <th scope="col">Actual spending</th>
                              <th scope="col">Remaining</th>
                              <th scope="col">Budget usage</th>
                              <th scope="col">Notes / details</th>
                            </tr>
                          </thead>
                          <tbody>
                            ${data.items.map((item) => this.renderRow(item))}
                          </tbody>
                        </table>
                      </div>`
                    : html`<p>
                        No expense accounts. Create expense accounts in Accounts
                        to start budgeting.
                      </p>`
                }
                <details class="coverage">
                  <summary>
                    Historical coverage
                    ${data.trackingStartDate ? `· Complete records from ${data.trackingStartDate}` : '· Not set'}
                  </summary>
                  <p>
                    Declare the date from which all expense records are
                    complete. Averages use only fully covered, completed months
                    before the selected month, including genuine zero-spending
                    months. A partial first month and months before tracking
                    began are excluded. No coverage is inferred from the first
                    expense.
                  </p>
                  <label
                    >Complete tracking starts
                    <input
                      type="date"
                      .value=${this.coverageDate}
                      @input=${(e: Event) => (this.coverageDate = (e.target as HTMLInputElement).value)} /></label
                  ><button
                    ?disabled=${this.saving || !this.coverageDate}
                    @click=${() => this.saveCoverage()}
                  >
                    Save coverage
                  </button>
                  <button
                    ?disabled=${this.saving}
                    @click=${() => this.saveCoverage(true)}
                  >
                    Clear coverage</button
                  >${this.coverageError ? html`<p class="error" role="alert">${this.coverageError}</p>` : nothing}
                </details>`
            : nothing
      }
      ${
        this.editing
          ? html`<div
              class="backdrop"
              @click=${(e: MouseEvent) => {
                if (e.target === e.currentTarget)
                  this.requestCloseSetBudgetModal();
              }}
            >
              <div
                class="dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="budget-edit-title"
              >
                <h3 id="budget-edit-title">${this.editing.name}</h3>
                <p>
                  ${this.editing.savedBudget?.periodYear != null ? `Editing the existing ${this.editing.savedBudget.periodYear}-${String(this.editing.savedBudget.periodMonth).padStart(2, '0')} override.` : 'Target and note apply to every month.'}
                </p>
                <form @submit=${this.handleSaveBudget}>
                  ${
                    this.editing.children.length
                      ? html`<p>
                            Group budgets are calculated from descendant
                            targets. Direct parent postings are unbudgeted.
                          </p>
                          ${this.editing.excludedParentTargetCents !== null ? html`<p>Saved group target ${formatMoney(this.editing.excludedParentTargetCents)} is preserved but excluded from totals to avoid overlap. You can remove it without losing the note.</p>` : nothing}`
                      : html`<label
                            >Monthly target (${APP_CURRENCY})<input
                              inputmode="decimal"
                              .value=${this.modalTarget}
                              @input=${(e: Event) => (this.modalTarget = (e.target as HTMLInputElement).value)}
                              aria-describedby="target-help" /></label
                          ><small id="target-help"
                            >Leave blank for No budget. Zero is an explicit zero
                            budget.</small
                          >`
                  }
                  <label
                    >Note<textarea
                      .value=${this.modalNotes}
                      @input=${(e: Event) => (this.modalNotes = (e.target as HTMLTextAreaElement).value)}
                    ></textarea></label
                  >${this.modalError ? html`<p role="alert" class="error">${this.modalError}</p>` : nothing}
                  <div class="actions">
                    <button
                      type="button"
                      ?disabled=${this.saving}
                      @click=${this.requestCloseSetBudgetModal}
                    >
                      Cancel</button
                    >${this.editing.savedBudget?.targetAmountCents != null ? html`<button type="button" ?disabled=${this.saving} @click=${(e: Event) => this.handleSaveBudget(e, true)}>Remove target, keep note</button>` : nothing}<button
                      class="primary"
                      type="submit"
                      ?disabled=${this.saving}
                    >
                      ${this.saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
                ${
                  this.discard
                    ? html`<p>Discard unsaved changes?</p>
                        <button
                          ?disabled=${this.saving}
                          @click=${this.closeSetBudgetModal}
                        >
                          Discard changes
                        </button>
                        <button @click=${() => (this.discard = false)}>
                          Keep editing
                        </button>`
                    : nothing
                }
              </div>
            </div>`
          : nothing
      }`;
  }
}
declare global {
  interface HTMLElementTagNameMap {
    'penga-budgets': PengaBudgets;
  }
}
