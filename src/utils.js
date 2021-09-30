export default function splitByNonCharacters(str) {
  const regexNonCharacter = new RegExp('\\W');
  return str.split(regexNonCharacter);
}
