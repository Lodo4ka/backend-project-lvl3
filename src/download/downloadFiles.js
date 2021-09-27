import * as fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import createFileName from '../createFileName.js';
import ParserDOM from '../parserDOM.js';
import checkOwnDomain from '../checkOwnDomain.js';

const getExtName = (url) => {
  const extName = path.parse(url).ext.replace(/\./g, '');
  return extName === '' ? 'html' : extName;
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
        getExtName(urlBlob),
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
