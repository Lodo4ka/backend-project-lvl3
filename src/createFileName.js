export default function createFileName(path, urlHost, ext) {
  const extName = ['png', 'css', 'js', 'jpg'];
  const { pathname } = new URL(path);
  const { hostname } = new URL(urlHost);
  const regexNonCharacter = new RegExp('\\W');
  const fileStrs = `${hostname}${pathname}`.split(regexNonCharacter);
  const fileName = extName.some((extArg) => extArg === fileStrs[fileStrs.length - 1])
    ? fileStrs.slice(0, -1).join('-')
    : fileStrs.join('-');
  return `${fileName}.${ext}`;
}
