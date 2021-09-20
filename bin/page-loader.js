#!/usr/bin/env node

import commander from 'commander';
import downloadPage from '../src/index.js';

commander
  .description('download all sources from source page')
  .version('1.0.0', '-v, --version', 'output the current version')
  .arguments('<url>')
  .option('-o --output [dirPath]', 'directory for output file', process.cwd())
  .action(async (url) => {
    const opts = commander.opts();
    const dirPath = opts.output;
    downloadPage(url, dirPath)
      .then(({ filepath }) => {
        console.log(filepath);
      }).catch((err) => {
        console.error(err.message);
        process.exit(1);
      });
  })
  .parse(process.argv);
