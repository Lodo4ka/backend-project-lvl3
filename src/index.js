import * as fs from 'fs/promises';
import path from 'path';
import cheerio from 'cheerio';
import axios from 'axios';

import createHTMLName from './createHTMLName.js';
import createDirectoryName from './createDirectoryName.js';
import downloadFiles from './downloadFiles';

export default function downloadPage(url, dirPath = process.cwd()) {
  const fileName = createHTMLName(url);
  const dirName = createDirectoryName(url);
  const filePath = path.join(dirPath, fileName);
  const directoryPath = path.join(dirPath, dirName);
  let $ = null;
  fs.mkdir(directoryPath)
    .then(() => axios(url))
    .then(({ data }) => {
      $ = cheerio.load(data);
      const assets = ['img', 'script', 'link'];
      return Promise
        .all(assets.map((asset) => downloadFiles($, asset, url, directoryPath, dirName)));
    })
    .then(() => {
      const htmlData = $.html();
      return fs.writeFile(filePath, htmlData);
    })
    .then(() => ({ filepath: filePath }));
}
