import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { icon, iconChoices, resolveIcon } from './icons.js';

@customElement('penga-icon-picker')
export class IconPicker extends LitElement {
  @property() value = '';
  @property() accountType = 'ASSET';
  @state() private search = '';
  static override styles = css`
    :host {
      display: block;
      min-width: 0;
    }
    input {
      box-sizing: border-box;
      width: 100%;
      padding: 0.55rem 0.7rem;
      background: var(--bg-surface);
      color: var(--text-primary);
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      font: inherit;
    }
    .choices {
      max-height: 140px;
      overflow: auto;
      margin-top: 0.35rem;
    }
    h4 {
      font-size: 0.72rem;
      color: var(--text-secondary);
      margin: 0.6rem 0 0.3rem;
    }
    .group {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 0.3rem;
    }
    button {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      min-width: 0;
      padding: 0.4rem;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
      background: var(--bg-surface);
      color: var(--text-secondary);
      font: inherit;
      font-size: 0.72rem;
      cursor: pointer;
      text-align: left;
    }
    button span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    button:hover {
      background: var(--bg-subtle);
    }
    button[aria-pressed='true'] {
      background: var(--color-primary-subtle);
      color: var(--color-primary-text);
      border-color: var(--color-primary);
    }
    :focus-visible {
      outline: 2px solid var(--border-focus);
      outline-offset: 2px;
    }
    p {
      color: var(--text-secondary);
      font-size: 0.8rem;
    }
  `;
  private select(key: string) {
    this.value = 'lucide:' + key;
    this.dispatchEvent(
      new CustomEvent('icon-selected', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      }),
    );
  }
  private navigate(event: KeyboardEvent) {
    if (
      ![
        'ArrowRight',
        'ArrowLeft',
        'ArrowDown',
        'ArrowUp',
        'Home',
        'End',
      ].includes(event.key)
    )
      return;
    const buttons = [
      ...this.renderRoot.querySelectorAll<HTMLButtonElement>('button'),
    ];
    const index = buttons.indexOf(
      (event.target as Element).closest('button') as HTMLButtonElement,
    );
    if (index < 0) return;
    event.preventDefault();
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? buttons.length - 1
          : (index +
              (['ArrowRight', 'ArrowDown'].includes(event.key) ? 1 : -1) +
              buttons.length) %
            buttons.length;
    buttons[next]?.focus();
  }
  override render() {
    const choices = iconChoices.filter((choice) =>
      (choice.label + ' ' + choice.group)
        .toLowerCase()
        .includes(this.search.toLowerCase().trim()),
    );
    return html`<input
        type="search"
        aria-label="Search icons"
        placeholder="Search icons…"
        .value=${this.search}
        @input=${(event: Event) => (this.search = (event.target as HTMLInputElement).value)}
      />
      <div class="choices" @keydown=${this.navigate}>
        ${['Accounts & categories', 'Actions & navigation'].map(
          (group) =>
            html`${
              choices.some((choice) => choice.group === group)
                ? html`<h4>${group}</h4>
                    <div class="group" role="group" aria-label=${group}>
                      ${choices.filter((choice) => choice.group === group).map((choice) => html`<button type="button" title=${choice.label} aria-label=${choice.label} aria-pressed=${resolveIcon(this.value, this.accountType) === choice.key} @click=${() => this.select(choice.key)}>${icon(choice.key)}<span>${choice.label}</span></button>`)}
                    </div>`
                : ''
            }`,
        )}
        ${choices.length ? '' : html`<p role="status">No icons match your search.</p>`}
      </div>`;
  }
}
