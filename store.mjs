import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID} from 'node:crypto';
export function openStore(file){
 mkdirSync(dirname(file),{recursive:true});const db=new DatabaseSync(file);
 db.exec(`PRAGMA journal_mode=WAL;
 CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,host TEXT NOT NULL,category TEXT NOT NULL,evidence TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','revoked')),created_at TEXT NOT NULL,updated_at TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS reports_host ON reports(host,status);
 CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,report_id TEXT NOT NULL,action TEXT NOT NULL,reviewer TEXT NOT NULL,reason TEXT NOT NULL,created_at TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS rate_limits(key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires INTEGER NOT NULL);`);
 return {
  db,
  submit({host,category,evidence}){
   const now=new Date().toISOString();const id=randomUUID();
   db.prepare('INSERT INTO reports(id,host,category,evidence,created_at,updated_at) VALUES(?,?,?,?,?,?)').run(id,host,category,evidence,now,now);return {id,status:'pending'};
  },
  limit(key,max=8,windowMs=600000){
   const now=Date.now();db.prepare('DELETE FROM rate_limits WHERE expires < ?').run(now);
   db.prepare('INSERT INTO rate_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1').run(key,now+windowMs);
   return db.prepare('SELECT count FROM rate_limits WHERE key=?').get(key).count<=max;
  },
  list(status='pending'){return db.prepare('SELECT * FROM reports WHERE status=? ORDER BY created_at DESC').all(status);},
  published(){return db.prepare("SELECT host,MIN(updated_at) AS reviewedAt FROM reports WHERE status='approved' GROUP BY host ORDER BY host").all();},
  review(id,action,reviewer,reason){
   const next={approve:'approved',reject:'rejected',revoke:'revoked'}[action];
   if(!next||!reviewer?.trim()||!reason?.trim())throw Error('需提供 approve/reject/revoke、审核人和审核理由。');
   db.exec('BEGIN IMMEDIATE');
   try{
    const row=db.prepare('SELECT * FROM reports WHERE id=?').get(id);if(!row)throw Error('举报不存在。');
    if(action==='revoke' && row.status!=='approved')throw Error('只有已批准记录可以撤销。');
    if(action!=='revoke' && row.status!=='pending')throw Error('只允许审核待处理记录。');
    const now=new Date().toISOString();
    db.prepare('UPDATE reports SET status=?,updated_at=? WHERE id=?').run(next,now,id);
    db.prepare('INSERT INTO audit(report_id,action,reviewer,reason,created_at) VALUES(?,?,?,?,?)').run(id,action,reviewer,reason,now);
    db.exec('COMMIT');return {id,status:next};
   }catch(error){db.exec('ROLLBACK');throw error;}
  },close(){db.close();}
 };
}
