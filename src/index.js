import * as fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import Listr from 'listr';
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
        { name: 'img', label: 'picture', attribute: 'src' },
        { name: 'script', label: 'javascript', attribute: 'src' },
        { name: 'link', label: 'css', attribute: 'href' },
      ];
      return new Listr(assets
        .map((asset) => ({ title: `Download ${asset.label}`, task: () => downloadFiles(asset, url, directoryPath, dirName) })),
      { concurrent: true }).run();
    })
    .then(() => new Listr([{
      title: 'Download html',
      task: () => {
        const html = ParserDOM.getHTML();
        return fs.writeFile(filePath, html);
      },
    }]).run())
    .then(() => ({ filepath: filePath }));
}
