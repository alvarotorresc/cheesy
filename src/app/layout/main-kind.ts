import type { ActivatedRouteSnapshot } from '@angular/router';

/**
 * Kind of padding a route gives to `<main>`, in its `data: { main }`. A route with none is a list.
 * The pages differ in how much room they need around the board or the text.
 */
export type MainKind = 'play' | 'home' | 'about';

const KINDS: readonly MainKind[] = ['play', 'home', 'about'];

/** The `main` kind of the deepest route of the tree, or undefined for a list. */
export const mainKindOf = (root: ActivatedRouteSnapshot): MainKind | undefined => {
  let route = root;
  while (route.firstChild) route = route.firstChild;
  const kind: unknown = route.data['main'];
  return KINDS.find((candidate) => candidate === kind);
};
