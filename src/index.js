import * as fs from 'fs/promises';
import cheerio from 'cheerio';
import path from 'path';
import Listr from 'listr';
import { nanoid } from 'nanoid';
import './env.js';
import axios from './httpClient.js';

const createFileName = (url, extension) => {
  const { hostname, pathname } = new URL(url);
  const regexNonCharacter = new RegExp('\\W');
  const destinitionPath = path.join(hostname, pathname);
  const { ext } = path.parse(destinitionPath);
  const fileStrs = destinitionPath.split(regexNonCharacter);
  if (ext === '') return `${fileStrs.join('-')}${extension}`;
  return `${fileStrs.slice(0, -1).join('-')}${ext}`;
};

export default function downloadPage(url, dirPath = process.cwd()) {
  const htmlName = createFileName(url, '.html');
  const htmlMainPath = path.join(dirPath, htmlName);
  const dirName = createFileName(url, '_files');
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
  return axios(url)
    .then((({ data: html }) => {
      $ = cheerio.load(html);
      let blobs = [];
      const assetTasks = assets
        .map((asset) => ({
          title: `Download ${asset.label} from source url`,
          task: () => {
            const domNodes = $(asset.name).filter((_, elem) => {
              const attributeValue = $(elem).attr(asset.attribute);
              const urlArg = new URL(attributeValue, url);
              const { hostname: currentHost } = new URL(urlArg);
              const { hostname: pageHost } = new URL(url);
              return currentHost === pageHost;
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
    }))
    .then((blobs) => fs.mkdir(directoryPath, { recursive: true }).then(() => blobs))
    .then((blobs) => Promise.all(blobs.map(({ config: { url: urlBlob }, data, id }) => {
      const { ext } = path.parse(urlBlob);
      const blobExt = ext || '.html';
      const assetName = createFileName(urlBlob, blobExt);
      const destinationPath = path.join(directoryPath, assetName);
      return fs.writeFile(destinationPath, data).then(() => ({ id, assetName }));
    })))
    .then((fileNames) => {
      fileNames.forEach(({ id, assetName }) => {
        const { ext } = path.parse(assetName);
        const assetExt = ext || '.html';
        const updatedPath = path.join(dirName, assetName);
        const tag = domNodeAssets.find((domAsset) => domAsset.id === id);
        const { attribute } = assets.find((asset) => asset.extensions.includes(assetExt)) ?? {};
        $(tag).attr(attribute, updatedPath);
      });
      return Promise.resolve();
    })
    .then(() => {
      const htmlSource = $.html();
      return fs.writeFile(htmlMainPath, htmlSource);
    })
    .then(() => ({ filepath: htmlMainPath }));
}
