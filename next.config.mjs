/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  api: {
    // Aumentamos el límite de tiempo para las API routes
    responseLimit: false,
    // Aumentamos el bodyParser limit
    bodyParser: {
      sizeLimit: '8mb', // Límite para el bodyParser
    },
  },
  // Aumentamos el tiempo de ejecución para las funciones serverless
  serverRuntimeConfig: {
    // Tiempo máximo de ejecución (30 minutos)
    maxDuration: 1800,
  },
}

export default nextConfig
