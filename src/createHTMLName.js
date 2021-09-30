import splitByNonCharacters from './utils';

export default function createHTMLName(path) {
  const { hostname, pathname } = new URL(path);
  const fileStrs = splitByNonCharacters(`${hostname}${pathname}`);
  const fileName = (fileStrs[fileStrs.length - 1] === '' ? fileStrs.slice(0, -1) : fileStrs)
    .join('-');
  return `${fileName}.html`;
}
