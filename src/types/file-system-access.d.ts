// TypeScript's bundled DOM lib only partially types the File System Access
// API. This fills in the pieces we use (directory iteration and permission
// re-requesting) that aren't declared yet.
export {};

declare global {
  interface FileSystemDirectoryHandle {
    entries(): AsyncIterableIterator<[string, FileSystemFileHandle | FileSystemDirectoryHandle]>;
    values(): AsyncIterableIterator<FileSystemFileHandle | FileSystemDirectoryHandle>;
    keys(): AsyncIterableIterator<string>;
  }

  interface FileSystemHandle {
    requestPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
    queryPermission(descriptor?: { mode?: "read" | "readwrite" }): Promise<PermissionState>;
  }

  interface Window {
    showDirectoryPicker(options?: { mode?: "read" | "readwrite" }): Promise<FileSystemDirectoryHandle>;
  }
}
