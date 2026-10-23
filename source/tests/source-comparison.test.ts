import {describe,it,expect} from 'vitest';
import {compareSourceFromSearch,comparisonUrl} from '../src/data/source-comparison';

describe('source A/B preview is opt-in and never persists admin configuration',()=>{
 it('requires exact diagnostic mode and a recognized source',()=>{
   expect(compareSourceFromSearch('?compareSource=excel')).toBeNull();
   expect(compareSourceFromSearch('?startupMetrics=1&compareSource=Excel')).toBeNull();
   expect(compareSourceFromSearch('?startupMetrics=1&compareSource=database')).toBe('database');
   expect(compareSourceFromSearch('?startupMetrics=1&compareSource=excel')).toBe('excel');
   expect(compareSourceFromSearch('?startupMetrics=0&compareSource=excel')).toBeNull();
 });
 it('changes only the temporary URL and clears transport override for an equal comparison',()=>{
   const url=comparisonUrl('https://site.test/HopHDND/?startupMetrics=1&dbTransport=longpoll&utm_source=chatgpt','excel');
   const parsed=new URL(url);
   expect(parsed.searchParams.get('compareSource')).toBe('excel');
   expect(parsed.searchParams.get('startupMetrics')).toBe('1');
   expect(parsed.searchParams.get('dbTransport')).toBeNull();
   expect(parsed.searchParams.get('utm_source')).toBe('chatgpt');
 });
});
