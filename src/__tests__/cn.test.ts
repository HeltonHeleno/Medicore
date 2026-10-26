import { cn } from '../utils/cn';

describe('cn', () => {
  it('combina classes e ignora valores falsos', () => {
    const ativo = false;
    expect(cn('a', ativo && 'b', undefined, 'c')).toBe('a c');
  });
});
