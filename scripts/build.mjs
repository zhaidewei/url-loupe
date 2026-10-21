import './build-known-hosts.mjs';
import './build-runtime-references.mjs';
import {build} from 'esbuild';
const targets=[
 {entryPoints:['src/site.css'],outfile:'public/style.css',minify:true},
 {entryPoints:['src/browser-analyzer.js'],outfile:'public/analyzer.js',format:'iife',target:['chrome110','safari16']},
 {entryPoints:['src/browser-engine.js'],outfile:'public/engine.js',format:'iife',globalName:'HostLensEngine',target:['chrome110','safari16'],minify:true},
 {entryPoints:['src/extension-analysis.js'],outfile:'extension/analyzer.js',format:'iife',target:['chrome127'],minify:true},
 {entryPoints:['src/cli.js'],outfile:'cli/url-loupe.mjs',platform:'node',format:'esm',target:['node22'],banner:{js:'#!/usr/bin/env node'}}
];
for(const target of targets)await build({...target,bundle:true,legalComments:'eof'});
console.log('Built website, extension and CLI from shared analysis sources.');
