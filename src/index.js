import * as fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import ParserDOM from './parserDOM.js';
import createHTMLName from './createHTMLName.js';
import createDirectoryName from './createDirectoryName.js';
import downloadFiles from './download/downloadFiles.js';

export default function downloadPage(url, dirPath = process.cwd()) {
  const fileName = createHTMLName(url);
  const dirName = createDirectoryName(url);
  const filePath = path.join(dirPath, fileName);
  const directoryPath = path.join(dirPath, dirName);
  return fs.mkdir(directoryPath)
    .then(() => axios(url))
    .then(({ data }) => {
      ParserDOM.parse(data);
      const assets = [
        { name: 'img', attribute: 'src' },
        { name: 'script', attribute: 'src' },
        { name: 'link', attribute: 'href' },
      ];
      return Promise
        .all(assets.map((asset) => downloadFiles(asset, url, directoryPath, dirName)));
    })
    .then(() => {
      const html = ParserDOM.getHTML();
      return fs.writeFile(filePath, html);
    })
    .then(() => ({ filepath: filePath }));
}
