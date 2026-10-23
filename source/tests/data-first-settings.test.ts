import {describe,it,expect} from 'vitest';
import {deferGuestEditMetadata} from '../src/data/data-first-settings';
describe('Optional data-first prioritization is guest-only and never an authorization rule',()=>{
  it('requires explicit startup diagnostic and guest opt-in',()=>{
    expect(deferGuestEditMetadata('',true)).toBe(false);
    expect(deferGuestEditMetadata('?guestMetadata=defer',true)).toBe(false);
    expect(deferGuestEditMetadata('?startupMetrics=1&guestMetadata=defer',false)).toBe(false);
    expect(deferGuestEditMetadata('?startupMetrics=1&guestMetadata=defer',true)).toBe(true);
    expect(deferGuestEditMetadata('?startupMetrics=1&guestMetadata=on',true)).toBe(false);
  });
  it('never changes Excel versus Database network benchmark mode',()=>{
    expect(deferGuestEditMetadata('?startupMetrics=1&guestMetadata=defer&compareSource=excel',true)).toBe(false);
    expect(deferGuestEditMetadata('?startupMetrics=1&guestMetadata=defer&compareSource=database',true)).toBe(false);
  });
});
