#!/bin/zsh
cd -- "${0:A:h}" || exit 1
if ! command -v node >/dev/null 2>&1; then
  print '请先安装 Node.js 22.13 或更高版本，再打开此文件。'
  read 'reply?按回车关闭。'
  exit 1
fi
exec node server.mjs
