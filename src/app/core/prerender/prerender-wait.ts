import { isPlatformServer } from '@angular/common';
import { inject, PendingTasks, PLATFORM_ID } from '@angular/core';

/** Starts a load and, in the prerender, makes the page wait for it. */
export type PrerenderWait = (load: () => Promise<unknown>) => void;

/**
 * For the loads a page starts by itself (its content, the progress it shows). The prerender only
 * waits for pending tasks before it writes the HTML, and a promise of a page's own is not one: the
 * page would be written while it still says "Loading…". In the browser the load just runs, as it
 * always did, so a slow download never holds the app back. Call it in an injection context.
 */
export const injectPrerenderWait = (): PrerenderWait => {
  if (!isPlatformServer(inject(PLATFORM_ID))) return (load) => void load();
  const tasks = inject(PendingTasks);
  return (load) => tasks.run(load);
};
