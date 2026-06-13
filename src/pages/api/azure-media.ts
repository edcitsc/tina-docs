import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { extname } from "node:path";
import formidable from "formidable";
import type { NextApiRequest, NextApiResponse } from "next";
import { getMediaContainer } from "../../lib/media/azure-blob-store";
import { isMediaAuthorized } from "../../lib/media/auth-gate";

export const config = {
  api: {
    bodyParser: false,
    sizeLimit: "50mb",
  },
};

const publicBaseUrl = () => process.env.NEXT_PUBLIC_AZURE_STORAGE_PUBLIC_BASE_URL ?? "";

const joinKey = (directory: string | undefined, filename: string): string => {
  const dir = (directory ?? "").replace(/^\/+|\/+$/g, "");
  return dir ? `${dir}/${filename}` : filename;
};

const toMedia = (key: string, size?: number) => {
  const lastSlash = key.lastIndexOf("/");
  const directory = lastSlash >= 0 ? key.slice(0, lastSlash) : "";
  const filename = lastSlash >= 0 ? key.slice(lastSlash + 1) : key;
  const src = `${publicBaseUrl()}/${key}`;
  return {
    type: "file" as const,
    id: key,
    filename,
    directory,
    src,
    ...(typeof size === "number" ? { size } : {}),
  };
};

const handleList = async (req: NextApiRequest, res: NextApiResponse) => {
  const container = getMediaContainer();
  const directoryRaw = (req.query.directory as string | undefined) ?? "";
  const directory = directoryRaw.replace(/^\/+|\/+$/g, "");
  const prefix = directory ? `${directory}/` : "";
  const limit = Math.min(Number.parseInt((req.query.limit as string) ?? "20", 10) || 20, 200);
  const continuationToken = (req.query.offset as string) || undefined;

  const iterator = container
    .listBlobsByHierarchy("/", { prefix })
    .byPage({ maxPageSize: limit, continuationToken });

  const page = await iterator.next();
  if (page.done || !page.value) {
    return res.status(200).json({ items: [], nextOffset: undefined });
  }

  const segment = page.value.segment;
  const items: ReturnType<typeof toMedia>[] = [];

  for (const blob of segment.blobItems ?? []) {
    const key = blob.name;
    const size = blob.properties?.contentLength;
    items.push(toMedia(key, typeof size === "number" ? size : undefined));
  }

  for (const dir of segment.blobPrefixes ?? []) {
    const dirKey = dir.name.replace(/\/$/, "");
    const lastSlash = dirKey.lastIndexOf("/");
    const dirName = lastSlash >= 0 ? dirKey.slice(lastSlash + 1) : dirKey;
    const parent = lastSlash >= 0 ? dirKey.slice(0, lastSlash) : "";
    items.push({
      type: "dir" as const,
      id: dirKey,
      filename: dirName,
      directory: parent,
      src: undefined,
    } as unknown as ReturnType<typeof toMedia>);
  }

  return res.status(200).json({
    items,
    nextOffset: page.value.continuationToken || undefined,
  });
};

const handleUpload = async (req: NextApiRequest, res: NextApiResponse) => {
  const form = formidable({
    maxFileSize: 50 * 1024 * 1024,
    keepExtensions: true,
    multiples: true,
  });

  const [fields, files] = await form.parse(req);
  const directoryField = fields.directory;
  const directory = Array.isArray(directoryField) ? directoryField[0] : directoryField;

  const fileField = files.file;
  const fileList = Array.isArray(fileField) ? fileField : fileField ? [fileField] : [];
  if (fileList.length === 0) {
    return res.status(400).json({ error: "No file uploaded under 'file' field." });
  }

  const container = getMediaContainer();
  const uploaded: ReturnType<typeof toMedia>[] = [];

  for (const file of fileList) {
    const originalName = file.originalFilename ?? "upload";
    const ext = extname(originalName);
    const blobName = joinKey(directory, `${randomUUID()}${ext}`);
    const blockBlob = container.getBlockBlobClient(blobName);
    const stream = createReadStream(file.filepath);
    const stats = await stat(file.filepath);
    await blockBlob.uploadStream(stream, undefined, undefined, {
      blobHTTPHeaders: {
        blobContentType: file.mimetype ?? "application/octet-stream",
        blobContentDisposition: `inline; filename="${encodeURIComponent(originalName)}"`,
      },
    });
    uploaded.push(toMedia(blobName, stats.size));
  }

  return res.status(200).json(uploaded);
};

const handleDelete = async (req: NextApiRequest, res: NextApiResponse) => {
  const key = (req.query.path as string | undefined)?.replace(/^\/+/, "");
  if (!key) {
    return res.status(400).json({ error: "Missing 'path' query parameter." });
  }
  const container = getMediaContainer();
  await container.getBlobClient(key).deleteIfExists();
  return res.status(204).end();
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!(await isMediaAuthorized(req, res))) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    switch (req.method) {
      case "GET":
        return await handleList(req, res);
      case "POST":
        return await handleUpload(req, res);
      case "DELETE":
        return await handleDelete(req, res);
      default:
        res.setHeader("Allow", "GET, POST, DELETE");
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (err) {
    console.error("[azure-media] unhandled error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
