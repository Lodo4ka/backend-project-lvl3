import * as fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import createFileName from './createFileName.js';
import checkOwnDomain from './checkOwnDomain.js';
import getExtName from './getExtName.js';

export default async function downloadFiles($, assetName, url, directoryPathToSave, dirToSaveName) {
  const attrFile = assetName === 'link' ? 'href' : 'src';
  const filterAsset = $(assetName).filter((i, elem) => {
    const urlArg = new URL($(elem).attr(attrFile), url);
    return checkOwnDomain(urlArg, url);
  });
  const urlElms = filterAsset
    .map((i, element) => $(element).attr(attrFile))
    .toArray()
    .map((elem) => new URL(elem, url).toString());
  Promise.all(
    urlElms
      .map((urlArg) => axios(urlArg, { responseType: 'arraybuffer' })),
  ).then((blobElements) => {
    const names = blobElements
      .map(({ config: { url: urlBlob } }) => createFileName(urlBlob, url, getExtName(urlBlob)));
    const destinationPaths = names.map((name) => path.join(directoryPathToSave, name));
    const updatedElemPaths = names.map((name) => path.join(dirToSaveName, name));
    filterAsset.map((i, el) => $(el).attr(attrFile, updatedElemPaths[i]));
    return Promise.all(blobElements
      .map(async ({ data }, index) => fs.writeFile(destinationPaths[index], data)));
  });
}
