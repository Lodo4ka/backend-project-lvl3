import * as fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import Listr from 'listr';
import ParserDOM from './parserDOM.js';
import createHTMLName from './createHTMLName.js';
import createDirectoryName from './createDirectoryName.js';

const createFileName = (urlPath, urlHost) => {
  const { ext } = path.parse(urlPath);
  const { pathname } = new URL(urlPath);
  const { host } = new URL(urlHost);
  const regexNonCharacter = new RegExp('\\W');
  const fileStrs = `${host}${pathname}`.split(regexNonCharacter);
  if (ext === '') return `${fileStrs.join('-')}.html`;
  return `${fileStrs.slice(0, -1).join('-')}${ext}`;
};

const checkOwnDomain = (url, urlHost) => {
  const { hostname: currentHost } = new URL(url);
  const { hostname: pageHost } = new URL(urlHost);
  return currentHost === pageHost;
};

export default function downloadPage(url, dirPath = process.cwd()) {
  const fileName = createHTMLName(url);
  const dirName = createDirectoryName(url);
  const filePath = path.join(dirPath, fileName);
  const directoryPath = path.join(dirPath, dirName);
  let domNodeAssets = [];
  const assets = [
    { name: 'img', label: 'picture', attribute: 'src' },
    { name: 'script', label: 'javascript', attribute: 'src' },
    { name: 'link', label: 'css', attribute: 'href' },
  ];
  return fs.mkdir(directoryPath)
    .then(() => {
      const fetchUrlTask = new Listr([{
        title: `Fetch ${url}`,
        task: () => axios(url),
      }]);
      return fetchUrlTask.run();
    })
    .then(({ data }) => {
      ParserDOM.parse(data);
      const assetTasks = assets
        .map((asset) => ({
          title: `Download ${asset.label} from source url`,
          task: () => {
            domNodeAssets = ParserDOM.findElements(asset.name).filter((_, elem) => {
              const attributeValue = ParserDOM.findElements(elem).attr(asset.attribute);
              const urlArg = new URL(attributeValue, url);
              return checkOwnDomain(urlArg, url);
            });
            const assetUrls = domNodeAssets
              .map((_, element) => ParserDOM.findElements(element).attr(asset.attribute))
              .toArray()
              .map((elem) => new URL(elem, url).toString());
            return Promise.all(
              assetUrls
                .map((assetUrl) => axios(assetUrl, { responseType: 'arraybuffer' })),
            );
          },
        }));
      const assetListr = new Listr(assetTasks,
        { concurrent: true });
      return assetListr.run();
    })
    .then((blobs) => {
      const downloadTasks = new Listr(
        blobs.map(({ config: { url: urlBlob }, data }, index) => ({
          title: `Save ${assets[index].label} to directory ${directoryPath}`,
          tasks: () => {
            const assetName = createFileName(urlBlob, url);
            const destinationPath = path.join(directoryPath, assetName);
            return fs.writeFile(destinationPath, data).then(() => assetName);
          },
        })),
        { concurrent: true },
      );
      return downloadTasks.run();
    })
    .then((fileNames) => {
      const updatePathTasks = new Listr(
        fileNames.map((name, index) => ({
          title: `Update path source in ${assets[index].label}`,
          task: () => {
            const updatedPath = path.join(dirName, name);
            ParserDOM.findElements(domNodeAssets[index]).attr(assets[index].attribute, updatedPath);
          },
        })),
        { concurrent: true },
      );
      updatePathTasks.run();
    })
    .then(() => {
      const htmlListr = new Listr([{
        title: `Save main html to ${filePath}`,
        task: () => {
          const html = ParserDOM.getHTML();
          return fs.writeFile(filePath, html);
        }
        ,
      }]);
      return htmlListr.run();
    })
    .then(() => ({ filepath: filePath }));
}
