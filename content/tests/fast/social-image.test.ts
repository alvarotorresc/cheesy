import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../', import.meta.url);
const indexHtml = readFileSync(new URL('src/index.html', root), 'utf8');

const SITE = 'https://cheesy.alvarotc.com';

function metaContent(attr: 'property' | 'name', key: string): string | undefined {
  const tag = new RegExp(`<meta\\s+${attr}="${key}"\\s+content=(?:"([^"]*)"|'([^']*)')`).exec(
    indexHtml,
  );
  return tag?.[1] ?? tag?.[2];
}

describe('social image', () => {
  it('declares the Open Graph metadata with absolute URLs', () => {
    expect(metaContent('property', 'og:type')).toBe('website');
    expect(metaContent('property', 'og:site_name')).toBe('Cheesy');
    expect(metaContent('property', 'og:title')).toBe('Cheesy');
    expect(metaContent('property', 'og:url')).toBe(`${SITE}/`);
    expect(metaContent('property', 'og:image')).toBe(`${SITE}/og.png`);
    expect(metaContent('property', 'og:image:width')).toBe('1200');
    expect(metaContent('property', 'og:image:height')).toBe('630');
    expect(metaContent('property', 'og:image:alt')).toBeTruthy();
  });

  it('describes the page the same way as the meta description', () => {
    const description = metaContent('name', 'description');
    expect(description).toBeTruthy();
    expect(metaContent('property', 'og:description')).toBe(description);
    expect(metaContent('name', 'twitter:description')).toBe(description);
  });

  it('declares the Twitter card with the same image', () => {
    expect(metaContent('name', 'twitter:card')).toBe('summary_large_image');
    expect(metaContent('name', 'twitter:title')).toBe('Cheesy');
    expect(metaContent('name', 'twitter:image')).toBe(`${SITE}/og.png`);
  });

  it('ships public/og.png as a 1200x630 PNG', () => {
    const png = readFileSync(new URL('public/og.png', root));
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(1200);
    expect(png.readUInt32BE(20)).toBe(630);
  });
});
