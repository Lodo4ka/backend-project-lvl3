import cheerio from 'cheerio';

const ParserDOM = {
  parse(data) {
    this.$ = cheerio.load(data);
  },
  findElements(elemName) {
    return this.$(elemName);
  },
  getHTML() {
    return this.$.html();
  },
};

export default ParserDOM;
