/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/pos',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
