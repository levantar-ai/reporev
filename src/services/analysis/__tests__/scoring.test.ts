import { describe, it, expect } from 'vitest';
import { computeOverallScore, computeGrade } from '../scoring';
import type { CategoryResult } from '../../../types';

function makeCategory(score: number, weight: number): CategoryResult {
  return {
    key: 'documentation',
    label: 'Documentation',
    score,
    weight,
    signals: [],
  };
}

describe('computeOverallScore', () => {
  it('computes weighted average correctly', () => {
    const categories = [makeCategory(100, 0.5), makeCategory(50, 0.5)];
    expect(computeOverallScore(categories)).toBe(75);
  });

  it('returns 0 for empty categories', () => {
    expect(computeOverallScore([])).toBe(0);
  });

  it('handles unequal weights', () => {
    const categories = [makeCategory(100, 0.8), makeCategory(0, 0.2)];
    expect(computeOverallScore(categories)).toBe(80);
  });
});

describe('computeGrade', () => {
  it('maps scores to correct grades', () => {
    expect(computeGrade(95)).toBe('A');
    expect(computeGrade(75)).toBe('B');
    expect(computeGrade(60)).toBe('C');
    expect(computeGrade(45)).toBe('D');
    expect(computeGrade(20)).toBe('F');
  });
});
