import { describe, it, expect } from 'vitest';
import { scoreToGrade, formatNumber } from '../formatters';

describe('scoreToGrade', () => {
  it('returns A for scores >= 85', () => {
    expect(scoreToGrade(85)).toBe('A');
    expect(scoreToGrade(100)).toBe('A');
    expect(scoreToGrade(95)).toBe('A');
  });

  it('returns B for scores 70-84', () => {
    expect(scoreToGrade(70)).toBe('B');
    expect(scoreToGrade(84)).toBe('B');
  });

  it('returns C for scores 55-69', () => {
    expect(scoreToGrade(55)).toBe('C');
    expect(scoreToGrade(69)).toBe('C');
  });

  it('returns D for scores 40-54', () => {
    expect(scoreToGrade(40)).toBe('D');
    expect(scoreToGrade(54)).toBe('D');
  });

  it('returns F for scores below 40', () => {
    expect(scoreToGrade(39)).toBe('F');
    expect(scoreToGrade(0)).toBe('F');
  });
});

describe('formatNumber', () => {
  it('formats millions', () => {
    expect(formatNumber(1_500_000)).toBe('1.5M');
  });

  it('formats thousands', () => {
    expect(formatNumber(2_500)).toBe('2.5k');
  });

  it('returns raw number for small values', () => {
    expect(formatNumber(42)).toBe('42');
  });
});
