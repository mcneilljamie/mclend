import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
    include: ['wagmi', 'viem', '@tanstack/react-query', '@web3modal/wagmi'],
  },
  server: {
    fs: {
      strict: false,
    },
  },
});
