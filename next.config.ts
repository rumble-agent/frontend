import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@tetherto/wdk",
    "@tetherto/wdk-wallet-evm",
    "sodium-native",
  ],
};

export default nextConfig;
