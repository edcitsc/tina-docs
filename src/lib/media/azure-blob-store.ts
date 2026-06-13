import {
  BlobServiceClient,
  type ContainerClient,
  StorageSharedKeyCredential,
} from "@azure/storage-blob";

export interface AzureMediaConfig {
  accountName: string;
  accountKey: string;
  containerName: string;
}

export const azureMediaConfigFromEnv = (): AzureMediaConfig => {
  const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
  const containerName = process.env.AZURE_STORAGE_CONTAINER_NAME;

  if (!accountName || !accountKey || !containerName) {
    throw new Error(
      "Azure media store misconfigured: set AZURE_STORAGE_ACCOUNT_NAME, AZURE_STORAGE_ACCOUNT_KEY, AZURE_STORAGE_CONTAINER_NAME.",
    );
  }

  return { accountName, accountKey, containerName };
};

export const buildContainerClient = (config: AzureMediaConfig): ContainerClient => {
  const credential = new StorageSharedKeyCredential(config.accountName, config.accountKey);
  const service = new BlobServiceClient(
    `https://${config.accountName}.blob.core.windows.net`,
    credential,
  );
  return service.getContainerClient(config.containerName);
};

export const getMediaContainer = (): ContainerClient =>
  buildContainerClient(azureMediaConfigFromEnv());
