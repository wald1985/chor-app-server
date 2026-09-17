import { CryptoPasswordGenerator } from './crypto-password-generator';

describe('CryptoPasswordGenerator', () => {
  const generator = new CryptoPasswordGenerator();

  it('generates a password of the requested length', () => {
    expect(generator.generate(24).length).toBe(24);
  });

  it('only uses URL-safe base64 characters', () => {
    const password = generator.generate(24);
    expect(password).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('generates 1000 passwords without a repeat', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      seen.add(generator.generate(24));
    }
    expect(seen.size).toBe(1000);
  });
});
