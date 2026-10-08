import slugData from '../content/data/slugs.json';
import { createPageUrls, type SlugData } from './page-url';

/** The addresses of the site, over the slugs of the content. */
export const pageUrls = createPageUrls(slugData satisfies SlugData);
