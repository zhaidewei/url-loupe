const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const root=path.resolve(__dirname,'..');
test('English and Chinese UI strings never change arbitrary user URL text',()=>{
 const context=vm.createContext({chrome:{i18n:{getUILanguage:()=> 'en-US'}}});vm.runInContext(fs.readFileSync(path.join(root,'i18n.js'),'utf8'),context);
 const ui=context.HostLensI18n;assert.equal(ui.lang,'en');assert.equal(ui.text('解析后的 Unicode host'),'Decoded Unicode hostname');assert.equal(ui.text('关于.test/关于?x=参考'),'关于.test/关于?x=参考');assert.equal(ui.text('可能仿冒 Amazon'),'Possible lookalike of Amazon');ui.lang='zh';assert.equal(ui.text('解析后的 Unicode host'),'解析后的 Unicode host');
});
test('store manifest contains bilingual metadata and valid runtime asset references',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'manifest.json')));assert.equal(m.default_locale,'en');assert.equal(m.version,'0.4.0');assert.deepEqual(m.permissions,['activeTab','contextMenus']);assert.equal(m.content_scripts,undefined);assert.equal(m.host_permissions,undefined);assert.equal(m.optional_host_permissions,undefined);
 for(const locale of ['en','zh_CN']){const messages=JSON.parse(fs.readFileSync(path.join(root,'_locales',locale,'messages.json')));assert.ok(messages.extensionDescription.message.length<=132);assert.ok(messages.extensionName.message.startsWith('URL Loupe'));}
 for(const file of [...Object.values(m.icons),m.background.service_worker,m.action.default_popup])assert.ok(fs.existsSync(path.join(root,file)),file);
 for(const size of [16,32,48,128]){const png=fs.readFileSync(path.join(root,m.icons[size]));assert.equal(png.readUInt32BE(16),size);assert.equal(png.readUInt32BE(20),size);}
});
