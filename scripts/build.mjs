import './build-known-hosts.mjs';
import {build} from 'esbuild';
await build({entryPoints:['src/browser-engine.js'],outfile:'public/engine.js',bundle:true,format:'iife',globalName:'HostLensEngine',target:['chrome110','safari16'],minify:true,legalComments:'eof'});
console.log('Built local domain engine.');
await build({entryPoints:['src/cli.js'],outfile:'cli/url-loupe.mjs',bundle:true,platform:'node',format:'esm',target:['node22'],banner:{js:'#!/usr/bin/env node'},legalComments:'eof'});
console.log('Built standalone offline CLI.');
