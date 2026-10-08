import { type Resource, resourceFromSnapshots } from '@angular/core';

/**
 * `resource` as a page reads it, but already resolved with `value` while its first load is under
 * way. A resource always starts loading, even when its loader answers at once; on a prerendered
 * page that first render would show the loading state instead of the HTML it hydrates. With the
 * content the page carries (`ContentService.loadedEndgames` and the like) it renders as it was
 * prerendered. Without a value it is the resource itself.
 */
export const startingWith = <T>(resource: Resource<T>, value: T | undefined): Resource<T> => {
  if (value === undefined) return resource;
  return resourceFromSnapshots(() => {
    const snapshot = resource.snapshot();
    return snapshot.status === 'loading' ? { status: 'resolved', value } : snapshot;
  });
};
