import type { Media, MediaList, MediaListOptions, MediaStore, MediaUploadOptions } from "tinacms";

const MEDIA_API = "/api/azure-media";

const trimSlashes = (input: string): string => input.replace(/^\/+|\/+$/g, "");

export class AzureBlobMediaStore implements MediaStore {
  // Accept anything by default — the API route enforces a 50 MB size limit
  // and the storage account's CORS rule will catch cross-origin abuse.
  accept = "*";

  // Mirrors the server-side formidable maxFileSize.
  maxSize = 50 * 1024 * 1024;

  async persist(files: MediaUploadOptions[]): Promise<Media[]> {
    const uploaded: Media[] = [];
    for (const upload of files) {
      const body = new FormData();
      body.append("file", upload.file);
      if (upload.directory) body.append("directory", trimSlashes(upload.directory));

      const res = await fetch(MEDIA_API, { method: "POST", body });
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status} ${await res.text()}`);
      }
      const items = (await res.json()) as Media[];
      uploaded.push(...items);
    }
    return uploaded;
  }

  async delete(media: Media): Promise<void> {
    const path = encodeURIComponent(media.id);
    const res = await fetch(`${MEDIA_API}?path=${path}`, { method: "DELETE" });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Delete failed: ${res.status} ${await res.text()}`);
    }
  }

  async list(options: MediaListOptions = {}): Promise<MediaList> {
    const params = new URLSearchParams();
    if (options.directory) params.set("directory", trimSlashes(options.directory));
    if (options.limit) params.set("limit", String(options.limit));
    if (options.offset !== undefined && options.offset !== "") {
      params.set("offset", String(options.offset));
    }
    const res = await fetch(`${MEDIA_API}?${params.toString()}`);
    if (!res.ok) {
      throw new Error(`List failed: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as MediaList;
  }

  parse(media: Media): string {
    return media.src ?? media.id;
  }
}
