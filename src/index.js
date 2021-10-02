import * as fs from 'fs/promises';
import cheerio from 'cheerio';
import path from 'path';
import axios from 'axios';
import Listr from 'listr';
import { nanoid } from 'nanoid';

const createFileName = (urlPath, urlHost) => {
  const { ext } = path.parse(urlPath);
  const { pathname } = new URL(urlPath);
  const { host } = new URL(urlHost);
  const regexNonCharacter = new RegExp('\\W');
  const fileStrs = `${host}${pathname}`.split(regexNonCharacter);
  if (ext === '') return `${fileStrs.join('-')}.html`;
  return `${fileStrs.slice(0, -1).join('-')}${ext}`;
};

function splitByNonCharacters(str) {
  const regexNonCharacter = new RegExp('\\W');
  return str.split(regexNonCharacter);
}

const checkOwnDomain = (url, urlHost) => {
  const { hostname: currentHost } = new URL(url);
  const { hostname: pageHost } = new URL(urlHost);
  return currentHost === pageHost;
};

function createHTMLName(htmlPath) {
  const { hostname, pathname } = new URL(htmlPath);
  const fileStrs = splitByNonCharacters(`${hostname}${pathname}`);
  const fileName = (fileStrs[fileStrs.length - 1] === '' ? fileStrs.slice(0, -1) : fileStrs)
    .join('-');
  return `${fileName}.html`;
}

function createDirectoryName(directoryPath) {
  const { hostname, pathname } = new URL(directoryPath);
  const regexNonCharacter = new RegExp('\\W');
  const fileStrs = `${hostname}${pathname}`.split(regexNonCharacter);
  const fileName = (fileStrs[fileStrs.length - 1] === '' ? fileStrs.slice(0, -1) : fileStrs)
    .join('-');
  return `${fileName}_files`;
}

export default function downloadPage(url, dirPath = process.cwd()) {
  const fileName = createHTMLName(url);
  const dirName = createDirectoryName(url);
  const filePath = path.join(dirPath, fileName);
  const directoryPath = path.join(dirPath, dirName);
  let domNodeAssets = [];
  let $ = {};
  const assets = [
    {
      name: 'img', label: 'picture', attribute: 'src', extensions: ['.png', '.jpg', '.svg'],
    },
    {
      name: 'script', label: 'javascript', attribute: 'src', extensions: ['.js'],
    },
    {
      name: 'link', label: 'css', attribute: 'href', extensions: ['.css', '.html'],
    },
  ];
  return fs.mkdir(directoryPath)
    .then(() => {
      let html = '';
      const fetchUrlTask = new Listr([{
        title: `Fetch ${url}`,
        task: () => axios(url).then(({ data }) => {
          html = data;
        }),
      }]);
      return fetchUrlTask.run().then(() => html);
    })
    .then((html) => {
      $ = cheerio.load(html);
      let blobs = [];
      const assetTasks = assets
        .map((asset) => ({
          title: `Download ${asset.label} from source url`,
          task: () => {
            const domNodes = $(asset.name).filter((_, elem) => {
              const attributeValue = $(elem).attr(asset.attribute);
              const urlArg = new URL(attributeValue, url);
              return checkOwnDomain(urlArg, url);
            })
              .map((_, element) => {
                const id = nanoid();
                return { id, ...element };
              });
            const assetUrls = domNodes
              .map((_, element) => $(element).attr(asset.attribute))
              .toArray()
              .map((elem) => new URL(elem, url).toString());
            return Promise.all(
              assetUrls
                .map((assetUrl) => axios(assetUrl, { responseType: 'arraybuffer' })),
            ).then((urlBlobs) => {
              const urlBlobsWithId = urlBlobs
                .map((blob, index) => ({ id: domNodes[index].id, ...blob }));
              blobs = [...blobs, ...urlBlobsWithId];
              domNodeAssets = [...domNodeAssets, ...domNodes];
            });
          },
        }));
      return new Listr(assetTasks, { concurrent: true }).run().then(() => blobs);
    })
    .then((blobs) => {
      let fileNames = [];
      const downloadTasks = blobs.map(({ config: { url: urlBlob }, data, id }) => {
        const { ext } = path.parse(urlBlob);
        const label = ext.split('.')[1];
        const title = `Save ${label || 'html'} to directory ${directoryPath}`;
        return {
          title,
          task: () => {
            const assetName = createFileName(urlBlob, url);
            const destinationPath = path.join(directoryPath, assetName);
            return fs.writeFile(destinationPath, data).then(() => {
              fileNames = [...fileNames, { id, assetName }];
            });
          },
        };
      });
      return new Listr(downloadTasks, { concurrent: true }).run().then(() => fileNames);
    })
    .then((fileNames) => {
      const updatePathTasks = fileNames.map(({ id, assetName }) => {
        const { ext } = path.parse(assetName);
        const label = ext.split('.')[1];
        const title = `Update path source in ${label}`;
        return {
          title,
          task: () => {
            const updatedPath = path.join(dirName, assetName);
            const tag = domNodeAssets.find((domAsset) => domAsset.id === id);
            const { attribute } = assets.find((asset) => asset.extensions.includes(ext));
            $(tag).attr(attribute, updatedPath);
          },
        };
      });
      return new Listr(updatePathTasks, { concurrent: true }).run();
    })
    .then(() => {
      const htmlListr = new Listr([{
        title: `Save main html to ${filePath}`,
        task: () => {
          const html = $.html();
          return fs.writeFile(filePath, html);
        }
        ,
      }]);
      return htmlListr.run();
    })
    .then(() => ({ filepath: filePath }));
}
