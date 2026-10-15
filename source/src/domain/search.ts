import type { Item } from '../../shared/types';
import { displayId } from './display-id';

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}

export function createSearchIndex(items: Item[]): Map<string, string> {
  return new Map(items.map((item) => [
    item.recordId,
    normalizeSearch([item.displayCode, displayId(item), item.content, item.department, item.room, item.specialist].join(' ')),
  ]));
}

export function matchesSearch(item: Item, query: string, index: Map<string, string>): boolean {
  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;
  const searchable = index.get(item.recordId)
    ?? normalizeSearch([item.displayCode, displayId(item), item.content, item.department, item.room, item.specialist].join(' '));
  return searchable.includes(normalizedQuery);
}
