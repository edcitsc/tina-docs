import type { GitProvider } from "@tinacms/datalayer";

export interface AzureDevOpsGitProviderOptions {
  orgUrl: string;
  project: string;
  repoId: string;
  branch: string;
  pat: string;
  authorName?: string;
  authorEmail?: string;
  apiVersion?: string;
}

interface AdoItem {
  objectId: string;
  commitId: string;
  path: string;
  gitObjectType: string;
}

interface AdoRefResponse {
  value: Array<{ name: string; objectId: string }>;
}

const DEFAULT_API_VERSION = "7.1";
const MAX_PUSH_ATTEMPTS = 3;

const normalizePath = (key: string): string => {
  const trimmed = key.replace(/^\/+/, "");
  return `/${trimmed}`;
};

const isBinary = (key: string): boolean => {
  return /\.(png|jpe?g|gif|webp|svg|ico|pdf|zip|woff2?|ttf|otf|mp4|mp3)$/i.test(key);
};

const toBase64 = (value: string): string => Buffer.from(value, "utf-8").toString("base64");

export class AzureDevOpsGitProvider implements GitProvider {
  private readonly options: Required<AzureDevOpsGitProviderOptions>;
  private readonly authHeader: string;

  constructor(options: AzureDevOpsGitProviderOptions) {
    this.options = {
      authorName: "TinaCMS",
      authorEmail: "tinacms@localhost",
      apiVersion: DEFAULT_API_VERSION,
      ...options,
    };
    this.authHeader = `Basic ${Buffer.from(`:${options.pat}`).toString("base64")}`;
  }

  async onPut(key: string, value: string): Promise<void> {
    const existing = await this.getItem(key);
    await this.push({
      key,
      changeType: existing ? "edit" : "add",
      content: value,
    });
  }

  async onDelete(key: string): Promise<void> {
    const existing = await this.getItem(key);
    if (!existing) return;
    await this.push({ key, changeType: "delete" });
  }

  private get repoBaseUrl(): string {
    const { orgUrl, project, repoId } = this.options;
    return `${orgUrl.replace(/\/$/, "")}/${encodeURIComponent(
      project,
    )}/_apis/git/repositories/${encodeURIComponent(repoId)}`;
  }

  private async request<T>(url: string, init?: RequestInit): Promise<Response> {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", this.authHeader);
    headers.set("Accept", "application/json");
    if (init?.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return fetch(url, { ...init, headers });
  }

  private async getBranchHead(): Promise<string> {
    const url = `${this.repoBaseUrl}/refs?filter=heads/${encodeURIComponent(
      this.options.branch,
    )}&api-version=${this.options.apiVersion}`;
    const res = await this.request<AdoRefResponse>(url);
    if (!res.ok) {
      throw new Error(
        `ADO: failed to read branch ${this.options.branch}: ${res.status} ${await res.text()}`,
      );
    }
    const data = (await res.json()) as AdoRefResponse;
    const head = data.value?.[0];
    if (!head) {
      throw new Error(
        `ADO: branch ${this.options.branch} not found in repo ${this.options.repoId}`,
      );
    }
    return head.objectId;
  }

  private async getItem(key: string): Promise<AdoItem | null> {
    const path = normalizePath(key);
    const url = `${this.repoBaseUrl}/items?path=${encodeURIComponent(
      path,
    )}&versionDescriptor.version=${encodeURIComponent(
      this.options.branch,
    )}&versionDescriptor.versionType=branch&api-version=${this.options.apiVersion}`;
    const res = await this.request<AdoItem>(url, { method: "GET" });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`ADO: failed to stat ${path}: ${res.status} ${await res.text()}`);
    }
    return (await res.json()) as AdoItem;
  }

  private async push(args: {
    key: string;
    changeType: "add" | "edit" | "delete";
    content?: string;
  }): Promise<void> {
    const path = normalizePath(args.key);

    for (let attempt = 1; attempt <= MAX_PUSH_ATTEMPTS; attempt++) {
      const oldObjectId = await this.getBranchHead();

      const change: Record<string, unknown> = {
        changeType: args.changeType,
        item: { path },
      };
      if (args.changeType !== "delete" && typeof args.content === "string") {
        const binary = isBinary(args.key);
        change.newContent = {
          content: binary ? toBase64(args.content) : args.content,
          contentType: binary ? "base64encoded" : "rawtext",
        };
      }

      const body = {
        refUpdates: [{ name: `refs/heads/${this.options.branch}`, oldObjectId }],
        commits: [
          {
            comment: `tina: ${args.changeType} ${args.key}`,
            author: {
              name: this.options.authorName,
              email: this.options.authorEmail,
            },
            changes: [change],
          },
        ],
      };

      const url = `${this.repoBaseUrl}/pushes?api-version=${this.options.apiVersion}`;
      const res = await this.request(url, {
        method: "POST",
        body: JSON.stringify(body),
      });

      if (res.ok) return;

      const text = await res.text();
      // ADO returns 409 for GitReferenceStaleException and 400 for some
      // related refUpdate validation errors — both are retriable.
      const isStaleRef =
        (res.status === 409 || res.status === 400) &&
        /refUpdate|oldObjectId|TF401028|TF400898|GitReferenceStaleException/i.test(text);

      if (!isStaleRef || attempt === MAX_PUSH_ATTEMPTS) {
        throw new Error(`ADO push failed (${args.changeType} ${args.key}): ${res.status} ${text}`);
      }
    }
  }
}

export const azureDevOpsGitProviderFromEnv = (): AzureDevOpsGitProvider => {
  const orgUrl = process.env.ADO_ORG_URL;
  const project = process.env.ADO_PROJECT;
  const repoId = process.env.ADO_REPO_ID;
  const branch = process.env.ADO_BRANCH || process.env.GITHUB_BRANCH || "main";
  const pat = process.env.ADO_PAT;

  if (!orgUrl || !project || !repoId || !pat) {
    throw new Error(
      "Azure DevOps GitProvider misconfigured: set ADO_ORG_URL, ADO_PROJECT, ADO_REPO_ID, ADO_PAT (and optionally ADO_BRANCH).",
    );
  }

  return new AzureDevOpsGitProvider({
    orgUrl,
    project,
    repoId,
    branch,
    pat,
    authorName: process.env.ADO_COMMIT_AUTHOR_NAME,
    authorEmail: process.env.ADO_COMMIT_AUTHOR_EMAIL,
  });
};
