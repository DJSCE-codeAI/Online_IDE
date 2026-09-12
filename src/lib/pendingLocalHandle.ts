// A handle picked via showDirectoryPicker() needs to reach the /local page
// after a client-side navigation. It can't be serialized into a URL or
// query string, so it's held here in memory for that one handoff; on a
// fresh page load (refresh, direct link) /local falls back to IndexedDB.
let pending: FileSystemDirectoryHandle | null = null;

export function setPendingDirectoryHandle(handle: FileSystemDirectoryHandle | null) {
  pending = handle;
}

export function takePendingDirectoryHandle(): FileSystemDirectoryHandle | null {
  const handle = pending;
  pending = null;
  return handle;
}
