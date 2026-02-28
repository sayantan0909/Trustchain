import type { NextConfig } from "next";

/**
 * Packages that are truly optional peer deps of @txnlab/use-wallet that
 * we do NOT have installed. These get shimmed to empty so webpack doesn't
 * crash trying to bundle them.
 *
 * NOTE: @perawallet/connect is intentionally NOT in this list — it IS
 * installed as an ESM package and must be bundled by webpack normally.
 * Marking it as a 'commonjs' external injects require() into the browser
 * bundle where require is undefined, causing the crash.
 */
const missingOptionalPeers = [
  '@agoralabs-sh/avm-web-provider',
  '@blockshake/defly-connect',
  '@perawallet/connect-beta',
  '@walletconnect/sign-client',
  '@walletconnect/modal',
  '@algorandfoundation/liquid-auth-use-wallet-client',
];

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};

      // Node built-ins — not available in browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };

      // @perawallet/connect ships as ESM ("type":"module").
      // Force webpack to resolve the module field so it gets the ESM
      // build instead of trying to CommonJS-require the CJS shim.
      config.resolve.extensionAlias = {
        ...config.resolve.extensionAlias,
      };
      config.resolve.conditionNames = [
        'browser',
        'module',
        'import',
        'require',
        'default',
      ];
    }

    // Externalize only truly-missing optional peers so webpack replaces
    // their import() with an empty object instead of crashing.
    config.externals = config.externals ?? [];
    if (Array.isArray(config.externals)) {
      config.externals.push(
        ({ request }: { request?: string }, callback: Function) => {
          if (request && missingOptionalPeers.includes(request)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        }
      );
    }

    return config;
  },

  // Only server-externalize the truly-uninstalled peers
  serverExternalPackages: [...missingOptionalPeers],

  // Ensure @perawallet/connect ESM is transpiled through webpack
  transpilePackages: ['@perawallet/connect'],
};

export default nextConfig;
