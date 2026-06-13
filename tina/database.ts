import { createDatabase, createLocalDatabase, type Database } from "@tinacms/datalayer";
import { MongodbLevel } from "mongodb-level";
import { azureDevOpsGitProviderFromEnv } from "./git-providers/azure-devops-git-provider";

// TINA_PUBLIC_USE_LOCAL_DB toggles in-memory Level vs Cosmos+ADO independently
// of auth (TINA_PUBLIC_USE_LOCAL_AUTH). Falls back to the legacy combined flag.
const isLocalDb =
  (process.env.TINA_PUBLIC_USE_LOCAL_DB ?? process.env.TINA_PUBLIC_IS_LOCAL ?? "true") === "true";

const branchNamespace = process.env.ADO_BRANCH || process.env.NEXT_PUBLIC_TINA_BRANCH || "main";

const buildRemoteDatabase = (): Database => {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required when TINA_PUBLIC_USE_LOCAL_DB is not 'true'.");
  }

  return createDatabase({
    gitProvider: azureDevOpsGitProviderFromEnv(),
    databaseAdapter: new MongodbLevel<string, Record<string, unknown>>({
      collectionName: `tinacms-${branchNamespace}`,
      dbName: process.env.MONGODB_DB || "tinacms",
      mongoUri,
    }),
    namespace: branchNamespace,
  });
};

export default isLocalDb ? createLocalDatabase() : buildRemoteDatabase();
