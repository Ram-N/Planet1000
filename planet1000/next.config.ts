import type { NextConfig } from "next";

const gameId = process.env.NEXT_PUBLIC_GAME_ID;

const nextConfig: NextConfig = {
  async redirects() {
    if (gameId) {
      return [
        {
          source: '/',
          destination: `/play/${gameId}`,
          permanent: false,
        },
      ];
    }
    return [];
  },
};

export default nextConfig;
