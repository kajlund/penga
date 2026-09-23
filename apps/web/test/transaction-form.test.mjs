import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { Window } from 'happy-dom';
import ts from 'typescript';
import fs from 'node:fs/promises';
const window = new Window({url:'http://localhost'});
for (const key of ['window','document','customElements','HTMLElement','HTMLDetailsElement','Element','Node','Document','DocumentFragment','ShadowRoot','CSSStyleSheet','Event','CustomEvent','KeyboardEvent','MouseEvent']) globalThis[key] = key === 'window' ? window : window[key];
// Compile the actual component sources with the project's decorator settings.
const generated = new URL('./.compiled/',import.meta.url);
await fs.mkdir(generated,{recursive:true});
for (const file of ['transaction-form','account-combobox']) {
 const source = await fs.readFile(new URL(`../src/components/${file}.ts`,import.meta.url),'utf8');
 const result = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022,experimentalDecorators:true,useDefineForClassFields:false}});
 await fs.writeFile(new URL(`${file}.js`,generated),result.outputText);
}
await import('./.compiled/transaction-form.js');
const accounts = [['bank','ASSET'],['cash','ASSET'],['owed','ASSET'],['card','LIABILITY'],['dining','EXPENSE'],['salary','INCOME'],['equity','EQUITY']].map(([id,type]) => ({id,name:id === 'equity' ? 'Opening Balances' : id,type,parentId:null,icon:null,color:null}));
const template = (splits, extra={}) => ({id:'tpl',name:'Template',payee:'Shop',note:null,tags:[],splits:splits.map(([accountId,amountCents])=>({accountId,amountCents})),...extra});
let form, requests, confirmations;
const settle = async()=>{await new Promise(r=>setTimeout(r,0));await form.updateComplete;};
const text =()=>form.shadowRoot.textContent;
const button = name=>[...form.shadowRoot.querySelectorAll('button')].find(b=>b.textContent.trim()===name);
const input = label=>[...form.shadowRoot.querySelectorAll('label')].find(l=>l.textContent.trim().startsWith(label))?.querySelector('input');
const type = async(label,value)=>{const el=input(label);assert.ok(el,label);el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));await settle();};
const account = async(label,id)=>{const el=[...form.shadowRoot.querySelectorAll('account-combobox')].find(e=>e.label===label);assert.ok(el,label);el.dispatchEvent(new CustomEvent('account-selected',{detail:{accountId:id}}));await settle();};
beforeEach(async()=>{
 requests=[];confirmations=[];globalThis.confirm=message=>{confirmations.push(message);return true;};globalThis.alert=message=>{throw Error(message)};
 globalThis.fetch=async(url,options)=>{if(options){requests.push({url,...JSON.parse(options.body)});return {ok:true,json:async()=>({data:{id:'created'}})}};return {ok:true,json:async()=>({data:url==='/api/accounts'?accounts:url.includes('balance-summary')?{accountBalances:accounts.map(a=>({...a,balanceCents:10000}))}:[]})}};
 form=document.createElement('transaction-form');document.body.append(form);await settle();form.open();await settle();
});
afterEach(()=>form.remove());
test('empty expense has no errors, disabled submit and collapsed details',async()=>{assert.ok(button('Expense').getAttribute('aria-pressed')==='true');assert.equal(form.shadowRoot.querySelectorAll('.field-error').length,0);assert.ok(button('Record expense').disabled);assert.equal(form.shadowRoot.querySelector('details').open,false);assert.ok(!text().includes('Statement Reconciled'));assert.ok(!text().includes('$0.00'))});
test('field error only after blur',async()=>{input('Payee').dispatchEvent(new Event('blur'));await settle();assert.ok(text().includes('Enter a payee.'));await type('Payee','Shop');assert.equal(form.shadowRoot.querySelectorAll('.field-error').length,0)});
test('expense input, live remaining, Ctrl+Enter and cleared payload',async()=>{await type('Payee','Shop');await account('Paid from','bank');await type('Total amount','60');await account('Account/category 1','dining');await type('Amount (','35');assert.ok(button('Record expense').disabled);window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true}));assert.equal(requests.length,0);assert.ok(text().includes('Use remaining €25.00'));button('Use remaining €25.00').click();await settle();assert.equal(input('Amount (').value,'60.00');assert.equal(button('Record expense').disabled,false);const status=form.shadowRoot.querySelector('#entry-status');status.value='cleared';status.dispatchEvent(new Event('change'));await settle();window.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',ctrlKey:true}));await settle();assert.equal(requests.length,1);assert.deepEqual(requests[0].splits,[{accountId:'bank',amountCents:-6000},{accountId:'dining',amountCents:6000}]);assert.equal(requests[0].isCleared,true)});
test('transfer hides allocations/payee and excludes source destination',async()=>{button('Transfer').click();await settle();assert.ok(!input('Payee'));assert.equal(form.shadowRoot.querySelectorAll('.split-row').length,0);await account('From account','owed');const to=[...form.shadowRoot.querySelectorAll('account-combobox')].find(a=>a.label==='To account');assert.ok(to.accounts.every(a=>a.id!=='owed'&&['ASSET','LIABILITY'].includes(a.type)));await account('To account','cash');await type('Amount','25');button('Record transfer').click();await settle();assert.equal(requests[0].payee,null);assert.deepEqual(requests[0].splits,[{accountId:'owed',amountCents:-2500},{accountId:'cash',amountCents:2500}])});
test('income changes labels',async()=>{button('Income').click();await settle();assert.ok(input('Payer/source'));assert.ok(text().includes('Received into'));assert.ok(button('Record income'))});
test('adjustment sends target with expected current balance',async()=>{button('Adjustment').click();await settle();await account('Account','bank');const select=form.shadowRoot.querySelector('select');select.value='balance';select.dispatchEvent(new Event('change'));await settle();await type('Resulting balance','125');button('Record adjustment').click();await settle();assert.equal(requests[0].url,'/api/transactions/adjustments');assert.equal(requests[0].expectedBalanceCents,10000);assert.equal(requests[0].adjustment.method,'balance');assert.equal(requests[0].adjustment.total,'125')});
test('template open survives Lit lifecycle and translates split receivable expense',async()=>{form.closeModal();await settle();await form.openWithTemplate(template([['bank',-6000],['dining',3500],['owed',2500]]));await settle();assert.equal(form.entry.kind,'expense');assert.equal(form.entry.total,'60.00');assert.equal(form.entry.rows.length,2);assert.equal(button('Record expense').disabled,false)});
test('unusual templates open advanced, including equity',async()=>{await form.openWithTemplate(template([['equity',-6000],['bank',6000]]));await settle();assert.equal(form.entry.kind,'advanced');assert.ok(button('Record transaction'));assert.ok(text().includes('Positive amounts increase assets'))});
test('mode switch confirms and preserves data if declined',async()=>{await type('Total amount','20');globalThis.confirm=()=>false;button('Transfer').click();await settle();assert.equal(form.entry.kind,'expense');assert.equal(form.entry.total,'20')});
test('guided advanced roundtrip retains signed ledger and details',async()=>{await form.openWithTemplate(template([['bank',-6000],['dining',6000]],{note:'Keep me'}));await settle();button('Advanced ledger entry').click();await settle();assert.equal(form.entry.kind,'advanced');assert.equal(form.entry.rows[0].amount,'-60.00');button('Expense').click();await settle();assert.equal(form.entry.kind,'expense');assert.equal(form.note,'Keep me');assert.equal(confirmations.length,0)});
test('duplicate open survives lifecycle and resets cleared status',async()=>{form.closeModal();await settle();await form.openWithDuplicate({...template([['bank',-6000],['dining',6000]]),isCleared:true,transactionDate:'2026-01-01'});await settle();assert.equal(form.entry.total,'60.00');assert.equal(form.isCleared,false)});
test('existing no-payee transactions remain editable through advanced',async()=>{await form.edit({...template([['bank',-6000],['dining',6000]],{payee:null}),transactionDate:'2026-09-16',isCleared:false});await settle();assert.equal(form.entry.kind,'advanced');assert.equal(button('Save Changes').disabled,false)});
test('account combobox accessible name reaches native input',async()=>{const combo=form.shadowRoot.querySelector('account-combobox');await combo.updateComplete;assert.equal(combo.shadowRoot.querySelector('input').getAttribute('aria-label'),'Paid from')});
test('Escape follows existing close behavior',async()=>{window.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}));await settle();assert.equal(form.isOpen,false)});
test('advanced templates can still save zero amount placeholders',async()=>{await form.openWithTemplate(template([['bank',0],['dining',0]]));await settle();form.saveTemplateName='Blank amounts';await form.confirmSaveAsTemplate();assert.equal(requests[0].url,'/api/templates');assert.deepEqual(requests[0].splits.map(s=>s.amountCents),[0,0])});
test('keyboard focus wraps within dialog',async()=>{const first=form.shadowRoot.querySelector('.close-btn');first.focus();const event=new KeyboardEvent('keydown',{key:'Tab',shiftKey:true,bubbles:true,composed:true,cancelable:true});first.dispatchEvent(event);await settle();assert.ok(event.defaultPrevented);assert.equal(form.shadowRoot.activeElement.textContent.trim(),'Cancel')});

