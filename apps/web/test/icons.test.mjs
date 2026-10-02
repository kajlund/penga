import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import ts from 'typescript';
import fs from 'node:fs/promises';
const window = new Window({ url:'http://localhost' });
for (const key of ['window','document','customElements','HTMLElement','Element','Node','Document','DocumentFragment','ShadowRoot','CSSStyleSheet','Event','CustomEvent','KeyboardEvent']) globalThis[key] = key === 'window' ? window : window[key];
const generated = new URL('./.compiled/icons-suite/',import.meta.url);
await fs.mkdir(generated,{recursive:true});
for (const file of ['icons','icon-picker','calm-styles','penga-accounts']) {
  const source = await fs.readFile(new URL('../src/components/' + file + '.ts',import.meta.url),'utf8');
  const result = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true,useDefineForClassFields:false}});
  await fs.writeFile(new URL(file + '.js',generated),result.outputText);
}
const { resolveIcon, icon } = await import('./.compiled/icons-suite/icons.js');
const { render } = await import('lit');
await import('./.compiled/icons-suite/penga-accounts.js');
const settle = async component => { await new Promise(resolve=>setTimeout(resolve,0)); await component.updateComplete; };

test('legacy emoji and stable keys retain explicit choices regardless of type',()=>{
  assert.equal(resolveIcon('👕','ASSET'),'shirt');
  assert.equal(resolveIcon('🍽️','LIABILITY'),'utensils');
  assert.equal(resolveIcon('⚖️','EXPENSE'),'scale');
  assert.equal(resolveIcon('lucide:book-open','SETTLEMENT'),'book-open');
  assert.equal(resolveIcon('credit-card','ASSET'),'credit-card');
});
test('unknown, empty and prototype-looking values use deterministic type fallback',()=>{
  for (const value of [null,'','unknown','lucide:missing','constructor','__proto__']) {
    assert.equal(resolveIcon(value,'EXPENSE'),'receipt');
    assert.equal(resolveIcon(value,'SETTLEMENT'),'handshake');
    assert.equal(resolveIcon(value,'EQUITY'),'scale');
  }
});
test('stored HTML cannot enter the SVG renderer; decorative SVG is hidden',()=>{
  const host=document.createElement('div');
  render(icon('<svg onload="alert(1)"><script>bad</script></svg>','ASSET'),host);
  assert.equal(host.querySelectorAll('svg').length,1);
  assert.equal(host.querySelector('svg').getAttribute('aria-hidden'),'true');
  assert.equal(host.querySelector('svg').getAttribute('stroke'),'currentColor');
  assert.equal(host.querySelector('script'),null);
  assert.equal(host.querySelector('[onload]'),null);
  assert.ok(host.querySelector('path'));
});
test('picker searches labelled choices, marks legacy selection and supports keyboard selection',async()=>{
  const picker=document.createElement('penga-icon-picker');
  picker.value='📖'; document.body.append(picker); await settle(picker);
  assert.equal(picker.shadowRoot.querySelector('[aria-pressed="true"]').getAttribute('aria-label'),'Book Open');
  const search=picker.shadowRoot.querySelector('input'); search.value='shirt'; search.dispatchEvent(new Event('input')); await settle(picker);
  assert.equal(picker.shadowRoot.querySelectorAll('button').length,1);
  let chosen;picker.addEventListener('icon-selected',event=>chosen=event.detail.value);
  picker.shadowRoot.querySelector('button').click();await settle(picker);
  assert.equal(chosen,'lucide:shirt');
  search.value='';search.dispatchEvent(new Event('input'));await settle(picker);
  const buttons=[...picker.shadowRoot.querySelectorAll('button')];buttons[0].focus();
  buttons[0].dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  assert.equal(picker.shadowRoot.activeElement,buttons[1]);
  buttons[1].dispatchEvent(new KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
  assert.equal(picker.shadowRoot.activeElement,buttons.at(-1));
  search.value='no such glyph';search.dispatchEvent(new Event('input'));await settle(picker);
  assert.match(picker.shadowRoot.querySelector('[role=status]').textContent,/No icons match/);
  picker.remove();
});
test('editing preserves legacy values unless the picker selects a new stable key',async()=>{
  const originalFetch=globalThis.fetch, originalAlert=globalThis.alert;
  const record={id:'existing',name:'Books',description:null,type:'EXPENSE',parentId:null,icon:'📖',color:'#6366f1',children:[]};
  const requests=[];
  globalThis.fetch=async(url,options)=>{if(options)requests.push(JSON.parse(options.body));return {ok:true,json:async()=>({data:[record]})};};
  globalThis.alert=()=>{};
  const accounts=document.createElement('penga-accounts');document.body.append(accounts);await settle(accounts);
  try {
    accounts.openEditModal(record);await settle(accounts);
    await accounts.submitCreate({preventDefault(){}});
    assert.equal(requests[0].icon,'📖');assert.equal(requests[0].color,'#6366f1');
    accounts.openEditModal(record);await settle(accounts);
    const picker=accounts.shadowRoot.querySelector('penga-icon-picker');await settle(picker);
    [...picker.shadowRoot.querySelectorAll('button')].find(button=>button.getAttribute('aria-label')==='Shirt').click();await settle(accounts);
    await accounts.submitCreate({preventDefault(){}});
    assert.equal(requests[1].icon,'lucide:shirt');assert.equal(requests[1].color,'#6366f1');
    accounts.openEditModal({...record,icon:requests[1].icon});await settle(accounts);
    const reopened=accounts.shadowRoot.querySelector('penga-icon-picker');await settle(reopened);
    assert.equal(reopened.shadowRoot.querySelector('[aria-pressed="true"]').getAttribute('aria-label'),'Shirt');
  } finally {accounts.remove();globalThis.fetch=originalFetch;globalThis.alert=originalAlert;}
});
