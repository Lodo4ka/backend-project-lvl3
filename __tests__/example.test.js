import {
  it, expect, describe,
} from '@jest/globals';
import main from '../src/main';

describe('main block', () => {
  it('first test', () => {
    expect(main()).toEqual(2);
  });
});
