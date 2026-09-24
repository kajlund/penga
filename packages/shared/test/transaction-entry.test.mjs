import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newEntry, parseMoney, formatMoney, allocationSummary, useRemaining, entrySplits, entryErrors, entryFromSplits, buildEntryTransaction, getSettlementPresentation, AccountType } from '../dist/index.js';
const accounts = [['bank','ASSET'],['cash','ASSET'],['owed','ASSET'],['card','LIABILITY'],['girlfriend','SETTLEMENT'],['dining','EXPENSE'],['food','EXPENSE'],['salary','INCOME'],['equity','EQUITY']].map(([id,type]) => ({id,name:id,type,parentId:null,icon:null,color:null}));
const context = { accounts, equityAccountId: 'equity', currentBalanceCents: 10000 };
const details = { transactionDate: '2026-09-16', payee: 'Shop', isCleared: false, tagIds:['tag'] };
const row = (accountId, amount) => ({ id: accountId, accountId, amount });
const expense = (rows=[row('dining','60')], accountId='bank', total='60') => ({kind:'expense', accountId,total,rows});
const amounts = e => buildEntryTransaction(e,context,details).splits.map(s => [s.accountId,s.amountCents]);
test('default is expense',()=>assert.equal(newEntry().kind,'expense'));
test('bank expense',()=>assert.deepEqual(amounts(expense()),[['bank',-6000],['dining',6000]]));
test('two expense categories',()=>assert.deepEqual(amounts(expense([row('dining','35'),row('food','25')])),[['bank',-6000],['dining',3500],['food',2500]]));
test('receivable allocation only records actual dining expense',()=>assert.deepEqual(amounts(expense([row('dining','35'),row('owed','25')])),[['bank',-6000],['dining',3500],['owed',2500]]));
test('credit card expense increases debt',()=>assert.deepEqual(amounts(expense(undefined,'card')),[['card',-6000],['dining',6000]]));
test('income deposits to bank and credits income',()=>assert.deepEqual(amounts({kind:'income',accountId:'bank',total:'60',rows:[row('salary','60')]}),[['bank',6000],['salary',-6000]]));
for (const from of ['bank','owed','card']) test(`transfer from ${from} never affects income or expense`,()=>assert.deepEqual(amounts({kind:'transfer',accountId:from,toAccountId:'cash',total:'25'}),[[from,-2500],['cash',2500]]));
test('transfer prevents same account and categories',()=>{for(const toAccountId of ['bank','food']) assert.ok(entryErrors({kind:'transfer',accountId:'bank',toAccountId,total:'10'},context,details.transactionDate,'').destination)});
test('adjustment amount offsets equity',()=>assert.deepEqual(amounts({kind:'adjustment',accountId:'bank',method:'amount',total:'25'}),[['bank',2500],['equity',-2500]]));
test('set balance calculates difference, including zero target',()=>{assert.deepEqual(amounts({kind:'adjustment',accountId:'bank',method:'balance',total:'125'}),[['bank',2500],['equity',-2500]]);assert.deepEqual(amounts({kind:'adjustment',accountId:'bank',method:'balance',total:'0'}),[['bank',-10000],['equity',10000]])});
test('liability corrections use existing signed balance semantics',()=>assert.deepEqual(entrySplits({kind:'adjustment',accountId:'card',method:'balance',total:'-125'},{...context,currentBalanceCents:-10000}),[{accountId:'card',amountCents:-2500},{accountId:'equity',amountCents:2500}]));
test('rejects unchanged adjustment and missing live balance',()=>{assert.ok(entryErrors({kind:'adjustment',accountId:'bank',method:'balance',total:'100'},context,details.transactionDate,'').total);assert.ok(entryErrors({kind:'adjustment',accountId:'bank',method:'balance',total:'100'},{accounts},details.transactionDate,'').total)});
test('unbalanced cannot construct transaction',()=>assert.throws(()=>amounts(expense([row('dining','59.99')]))));
test('remaining fills a blank row and tops up existing row exactly',()=>{let e=expense([row('dining','35'),row('owed','')]);assert.deepEqual(allocationSummary(e),{total:6000,allocated:3500,remaining:2500});e=useRemaining(e,'owed');assert.equal(e.rows[1].amount,'25.00');e=useRemaining(expense([row('dining','35'),row('owed','20')]),'owed');assert.equal(e.rows[1].amount,'25.00');assert.equal(allocationSummary(e).remaining,0)});
test('overallocated remainder can reduce a row',()=>assert.equal(useRemaining(expense([row('dining','70')]),'dining').rows[0].amount,'60.00'));
test('payee is required only for expense and income',()=>{assert.ok(entryErrors(expense(),context,details.transactionDate,'').payee);assert.ok(entryErrors({...expense(),kind:'income'},context,details.transactionDate,'').payee);for(const e of [{kind:'transfer',accountId:'bank',toAccountId:'cash',total:'1'},{kind:'adjustment',accountId:'bank',method:'amount',total:'1'},{kind:'advanced',rows:[row('bank','-1'),row('cash','1')]}]) assert.equal(entryErrors(e,context,details.transactionDate,'').payee,undefined)});
test('pending and cleared metadata retained',()=>{for(const isCleared of [false,true]){const tx=buildEntryTransaction(expense(),context,{...details,isCleared});assert.equal(tx.isCleared,isCleared);assert.deepEqual(tx.tagIds,['tag'])}});
test('currency uses euro formatting',()=>{assert.equal(formatMoney(6000),'€60.00');assert.equal(formatMoney(-2500),'-€25.00');assert.ok(!formatMoney(1).includes('$'))});
test('strict decimal parsing and locale input',()=>{for(const text of ['garbage','1x','1.001','1e3','Infinity','21474836.48'])assert.ok(Number.isNaN(parseMoney(text)));assert.equal(parseMoney('1.250,50'),125050);assert.equal(parseMoney('1,250.50'),125050);assert.equal(parseMoney('0.29'),29)});
test('templates convert when representable with exact line roundtrip',()=>{for(const e of [expense([row('dining','35'),row('owed','25')]),{kind:'income',accountId:'bank',total:'60',rows:[row('salary','60')]},{kind:'transfer',accountId:'owed',toAccountId:'cash',total:'25'}]){const lines=entrySplits(e,context);const converted=entryFromSplits(lines,accounts);assert.equal(converted.kind,e.kind);assert.deepEqual(entrySplits(converted,context),lines)}});
test('unusual and zero-amount templates preserve advanced lines',()=>{for(const lines of [[{accountId:'equity',amountCents:-10},{accountId:'salary',amountCents:10}],[{accountId:'bank',amountCents:0},{accountId:'food',amountCents:0}]]){const e=entryFromSplits(lines,accounts);assert.equal(e.kind,'advanced');assert.deepEqual(entrySplits(e,context),lines)}});
test('advanced unrestricted equity and signed lines preserved',()=>assert.deepEqual(amounts({kind:'advanced',rows:[row('equity','-60'),row('salary','60')]}),[['equity',-6000],['salary',6000]]));
test('validation rejects empty allocations, zero, negative, invalid dates and self allocations',()=>{for(const rows of [[],[row('dining','0')],[row('dining','-60')],[row('bank','60')],[row('unknown','60')]])assert.throws(()=>amounts(expense(rows)));assert.ok(entryErrors(expense(),context,'2026-02-30','Shop').date)});
test('settlement presentation helper returns human-readable labels and normalized directions',()=>{
  assert.deepEqual(getSettlementPresentation(8000), { direction: 'owed-to-user', amountCents: 8000, label: 'Owed to you €80.00' });
  assert.deepEqual(getSettlementPresentation(-2000), { direction: 'owed-by-user', amountCents: 2000, label: 'You owe €20.00' });
  assert.deepEqual(getSettlementPresentation(0), { direction: 'settled', amountCents: 0, label: 'Settled' });
});
test('user pays €80 entirely for the other person',()=>assert.deepEqual(amounts(expense([row('girlfriend','80')], 'bank', '80')),[['bank',-8000],['girlfriend',8000]]));
test('€100 expense split into €60 personal expense and €40 Settlement',()=>assert.deepEqual(amounts(expense([row('dining','60'),row('girlfriend','40')], 'bank', '100')),[['bank',-10000],['dining',6000],['girlfriend',4000]]));
test('the other person pays a €30 expense for the user',()=>assert.deepEqual(amounts(expense([row('dining','30')],'girlfriend', '30')),[['girlfriend',-3000],['dining',3000]]));
test('settlement transfer repayment from counterparty into cash produces correct economic sign',()=>assert.deepEqual(amounts({kind:'transfer',accountId:'girlfriend',toAccountId:'cash',total:'100'}),[['girlfriend',-10000],['cash',10000]]));
test('settlement transfer payment of liability from bank to counterparty',()=>assert.deepEqual(amounts({kind:'transfer',accountId:'bank',toAccountId:'girlfriend',total:'20'}),[['bank',-2000],['girlfriend',2000]]));
test('settlement adjustment against opening equity',()=>assert.deepEqual(amounts({kind:'adjustment',accountId:'girlfriend',method:'amount',total:'50'}),[['girlfriend',5000],['equity',-5000]]));
test('templates convert settlement transactions with exact line roundtrip',()=>{
  for (const e of [
    expense([row('dining','60'),row('girlfriend','40')], 'bank', '100'),
    expense([row('dining','30')],'girlfriend', '30'),
    {kind:'transfer',accountId:'girlfriend',toAccountId:'cash',total:'100'}
  ]) {
    const lines = entrySplits(e, context);
    const converted = entryFromSplits(lines, accounts);
    assert.equal(converted.kind, e.kind);
    assert.deepEqual(entrySplits(converted, context), lines);
  }
});
