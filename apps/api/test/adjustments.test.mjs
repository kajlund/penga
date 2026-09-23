import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { transactionsRoute } from '../dist/routes/transactions.js';
import { db, queryClient, accounts, splits, transactions, tags, transactionTags } from '../dist/db/index.js';
after(async()=>queryClient.end());
const request = payload => transactionsRoute.request('/adjustments',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
test('adjustment API rejects malformed contracts before accessing storage',async()=>{for(const payload of [{},{adjustment:{kind:'transfer'}},{adjustment:{kind:'adjustment',method:'wrong',total:'5',accountId:'x'}}])assert.equal((await request(payload)).status,400)});
test('adjustment persistence (rolled back)',{skip:process.env.PENGA_DATABASE_TESTS!=='1'},async t=>{
 const transaction = db.transaction.bind(db);
 const rollback = new Error('Intentional test rollback');
 try {
  await transaction(async tx=>{
   const [bank,card]=await tx.insert(accounts).values([{name:'Test bank '+crypto.randomUUID(),type:'ASSET'},{name:'Test card '+crypto.randomUUID(),type:'LIABILITY'}]).returning();
   const [tag]=await tx.insert(tags).values({name:'test-'+crypto.randomUUID()}).returning();
   // Route writes participate in this transaction, including equity creation, and are all rolled back.
   db.transaction = async callback => callback(tx);
   const payload = (accountId,method,total,extra={})=>({transactionDate:'2026-09-16',note:'Test correction',isCleared:false,adjustment:{kind:'adjustment',accountId,method,total},...extra});
   try {
    await t.test('amount correction persists balanced equity splits and pending metadata',async()=>{
     const response=await request(payload(bank.id,'amount','60',{tagIds:[tag.id]}));assert.equal(response.status,201);
     const {data}=await response.json();assert.equal(data.isCleared,false);assert.equal(data.payee,null);assert.equal(data.note,'Test correction');assert.equal(data.tags[0].id,tag.id);
     assert.equal(data.splits.reduce((sum,s)=>sum+s.amountCents,0),0);
     assert.equal(data.splits.find(s=>s.accountId===bank.id).amountCents,6000);
     assert.equal(data.splits.find(s=>s.accountType==='EQUITY').amountCents,-6000);
     assert.ok(data.splits.every(s=>!['INCOME','EXPENSE'].includes(s.accountType)));
     assert.equal((await tx.select().from(transactionTags).where(eq(transactionTags.transactionId,data.id))).length,1);
    });
    await t.test('target correction uses live balance, cleared status and same equity account',async()=>{
     const response=await request(payload(bank.id,'balance','100',{expectedBalanceCents:6000,isCleared:true}));assert.equal(response.status,201);
     const {data}=await response.json();assert.equal(data.isCleared,true);assert.equal(data.splits.find(s=>s.accountId===bank.id).amountCents,4000);
     const rows=await tx.select().from(splits).where(eq(splits.accountId,bank.id));assert.equal(rows.reduce((sum,s)=>sum+s.amountCents,0),10000);
    });
    await t.test('stale balance rejected with no new lines',async()=>{
     const before=await tx.select().from(splits).where(eq(splits.accountId,bank.id));
     const response=await request(payload(bank.id,'balance','125',{expectedBalanceCents:6000}));assert.equal(response.status,400);assert.match((await response.json()).error,/balance changed/);
     assert.equal((await tx.select().from(splits).where(eq(splits.accountId,bank.id))).length,before.length);
    });
    await t.test('negative liability correction stays out of income and expense',async()=>{
     const response=await request(payload(card.id,'balance','-25',{expectedBalanceCents:0}));assert.equal(response.status,201);const {data}=await response.json();assert.equal(data.splits.find(s=>s.accountId===card.id).amountCents,-2500);assert.equal(data.splits.find(s=>s.accountType==='EQUITY').amountCents,2500);
    });
    await t.test('invalid amounts and no-op corrections rejected',async()=>{for(const value of ['100','bad','21474836.48'])assert.equal((await request(payload(bank.id,'balance',value,{expectedBalanceCents:10000}))).status,400)});
   } finally {db.transaction=transaction;}
   throw rollback;
  });
 } catch(error){if(error!==rollback)throw error;}
});
