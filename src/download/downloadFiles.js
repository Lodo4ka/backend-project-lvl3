import * as fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import ParserDOM from '../parserDOM.js';

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

export default function downloadFiles(asset, urlSource, pathToSave, directoryName) {
  const assets = ParserDOM.findElements(asset.name).filter((_, elem) => {
    const attributeValue = ParserDOM.findElements(elem).attr(asset.attribute);
    const urlArg = new URL(attributeValue, urlSource);
    return checkOwnDomain(urlArg, urlSource);
  });
  const urls = assets
    .map((_, element) => ParserDOM.findElements(element).attr(asset.attribute))
    .toArray()
    .map((elem) => new URL(elem, urlSource).toString());
  return Promise.all(
    urls
      .map((url) => axios(url, { responseType: 'arraybuffer' })),
  ).then((blobs) => {
    const fileNames = blobs
      .map(({ config: { url: urlBlob } }) => createFileName(
        urlBlob,
        urlSource,
      ));
    const destinationPaths = fileNames.map((name) => path.join(pathToSave, name));
    return Promise.all(blobs
      .map(async ({ data }, index) => fs.writeFile(destinationPaths[index], data)))
      .then(() => fileNames);
  })
    .then((fileNames) => {
      const updatedPaths = fileNames.map((name) => path.join(directoryName, name));
      assets
        .map((i, el) => ParserDOM.findElements(el).attr(asset.attribute, updatedPaths[i]));
    });
}
