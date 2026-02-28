import type { NextConfig } from "next";

const optionalExternals = [
  '@agoralabs-sh/avm-web-provider',
  '@blockshake/defly-connect',
  '@perawallet/connect',
  '@perawallet/connect-beta',
  '@walletconnect/sign-client',
  '@walletconnect/modal',
  '@algorandfoundation/liquid-auth-use-wallet-client',
];

const nextConfig: NextConfig = {
  // Webpack fallback for unused optional use-wallet peer dependencies
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve = config.resolve ?? {};
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    config.externals = config.externals ?? [];
    if (Array.isArray(config.externals)) {
      config.externals.push(({ request }: { request?: string }, callback: Function) => {
        if (request && optionalExternals.includes(request)) {
          return callback(null, `commonjs ${request}`);
        }
        callback();
      });
    }
    return config;
  },
  // Server External Packages bypass module resolution errors on server
  serverExternalPackages: [...optionalExternals],
};

export default nextConfig;
