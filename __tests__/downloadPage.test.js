import * as fs from 'fs/promises';
import nock from 'nock';
import os from 'os';
import path from 'path';
import { existsSync } from 'fs';

import downloadPage from '../src/index';

const readFile = async (pathName) => fs.readFile(pathName, 'utf-8');
const readFixture = async (pathFixture) => readFile(path.join(__dirname, '..', '__fixtures__', pathFixture));

describe('download page and save in tmp directory', () => {
  beforeAll(() => {
    nock.disableNetConnect();
  });

  afterAll(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  describe('download all assets and html from html page', () => {
    let tmpDir;
    const assets = [
      'site-com-blog-about.html',
      'site-com-photos-me.jpg',
      'site-com-blog-about-assets-styles.css',
      'site-com-assets-scripts.js',
    ];

    beforeEach(async () => {
      const url = 'https://site.com';
      const urlAssets = [
        { urlAsset: '/blog/about', asset: '/expected/site-com-blog-about.html' },
        { urlAsset: '/photos/me.jpg', asset: '/expected/site-com-photos-me.jpg' },
        { urlAsset: '/blog/about/assets/styles.css', asset: '/expected/site-com-blog-about-assets-styles.css' },
        { urlAsset: '/assets/scripts.js', asset: '/expected/site-com-assets-scripts.js' },
      ];
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'page-loader-'));
      const html = await readFixture('site-com-blog-about.html');
      nock(url).get('/blog/about').reply(200, html);
      await Promise.all(urlAssets.map((async ({ urlAsset, asset }) => {
        const assetFile = await readFixture(asset);
        nock(url).get(urlAsset).reply(200, `${assetFile}`);
      })));
    });

    it('download html from site.com', async () => {
      await downloadPage('https://site.com/blog/about', tmpDir);
      const resultPath = path.join(tmpDir, 'site-com-blog-about.html');
      expect(existsSync(resultPath)).toBeTruthy();
      const result = await readFile(resultPath);
      const htmlAnswer = await readFixture('/expected/site-com-blog-about.html');
      const directory = await fs.readdir(tmpDir);
      expect(directory).toContain('site-com-blog-about.html');
      expect(directory).toContain('site-com-blog-about_files');
      expect(result).toEqual(htmlAnswer);
    });

    it.each(assets)('download %s asset from site.com', async (asset) => {
      await downloadPage('https://site.com/blog/about', tmpDir);
      const answer = await readFixture(`/expected/${asset}`);
      const resultPath = path.join(tmpDir, `site-com-blog-about_files/${asset}`);
      const result = await readFile(resultPath);
      const directoryAsset = await fs.readdir(path.join(tmpDir, 'site-com-blog-about_files'));
      expect(existsSync(resultPath)).toBeTruthy();
      expect(directoryAsset).toContain(asset);
      expect(result).toEqual(answer);
    });
  });

  describe('download assets with error', () => {
    it.each([404, 500])('server %s error', (code) => {
      nock('https://site.com').get('/foo').reply(code);
      return expect(downloadPage('https://site.com/foo')).rejects.toThrow();
    });

    it('download with file system errors ENOENT', () => {
      nock('https://site.com').get('/foo').reply(200);
      return expect(downloadPage('https://site.com/foo', '<h1>hello</h1>')).rejects.toThrow('ENOENT');
    });

    it('access error', async () => {
      const html = await readFixture('site-com-blog-about.html');
      nock('https://site.com').get('/foo').reply(200, html);
      return expect(downloadPage('https://site.com/foo', '/foo')).rejects.toThrow();
    });
  });
});
