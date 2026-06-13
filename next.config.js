const MonacoWebpackPlugin = require("monaco-editor-webpack-plugin");
const redirects = require("./content/settings/config.json")?.redirects || [];

/** @type {import('next').NextConfig} */

const isStatic = process.env.EXPORT_MODE === "static";
const basePath = process.env.NEXT_PUBLIC_BASE_PATH;
const assetPrefix = process.env.NEXT_PUBLIC_ASSET_PREFIX || basePath;

// Azure Blob hostname for next/image remote patterns.
const mediaBlobHost = (() => {
  const base = process.env.NEXT_PUBLIC_AZURE_STORAGE_PUBLIC_BASE_URL;
  if (!base) return "*.blob.core.windows.net";
  try {
    return new URL(base).hostname;
  } catch {
    return "*.blob.core.windows.net";
  }
})();

const extraConfig = {};

if (isStatic) {
  extraConfig.output = "export";
  extraConfig.trailingSlash = true;
  extraConfig.skipTrailingSlashRedirect = true;
}

module.exports = {
  ...extraConfig,
  basePath,
  assetPrefix,
  // TinaCMS packages use ESM with bare directory imports that Node's resolver
  // cannot follow. Transpiling them through webpack sidesteps the issue.
  transpilePackages: [
    "tinacms",
    "tinacms-authjs",
    "@tinacms/datalayer",
    "@tinacms/graphql",
    "@tinacms/schema-tools",
    "@tinacms/mdx",
    "@heroicons/react",
  ],
  images: {
    ...(assetPrefix ? { path: `${assetPrefix}/_next/image` } : {}),
    remotePatterns: [
      {
        protocol: "https",
        hostname: "assets.tina.io",
        port: "",
      },
      {
        protocol: "https",
        hostname: mediaBlobHost,
        pathname: "/**",
      },
    ],
  },

  outputFileTracingIncludes: {
    "/api/**/*": [],
  },
  outputFileTracingExcludes: {
    "/api/**/*": [
      ".next/cache/**/*",
      "node_modules/@swc/core-linux-x64-gnu",
      "node_modules/@swc/core-linux-x64-musl",
      "node_modules/@esbuild/",
      "node_modules/webpack",
      "node_modules/terser",
      ".git/**/*",
      "public/**/*",
    ],
  },

  async rewrites() {
    return [
      {
        source: "/admin",
        destination: "/admin/index.html",
      },
      // Route Tina's built-in auth requests to our NextAuth handler.
      // The Tina admin SPA hard-codes /api/tina/auth/* for its auth endpoints.
      {
        source: "/api/tina/auth/:path*",
        destination: "/api/auth/:path*",
      },
    ];
  },

  async redirects() {
    return redirects.map((redirect) => ({
      source: redirect.source,
      destination: redirect.destination,
      permanent: redirect.permanent,
    }));
  },

  turbopack: {
    resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
    // Add this rule to handle SVG as React components for Local Development
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },

  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Configure Monaco Editor for minimal build
      config.plugins.push(
        new MonacoWebpackPlugin({
          languages: ["javascript"],
          filename: "static/[name].worker.js",
          features: ["!gotoSymbol"], // Disable heavy features
        }),
      );
    }

    // Add this module rule to handle SVG as React components for Production
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });

    // Optimize bundle size for serverless functions
    if (isServer) {
      config.externals = [...(config.externals || []), "fs", "path", "os"];
    }

    return config;
  },
};
