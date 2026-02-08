import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    // Avoid CORS + wrong ":8084" issues by proxying API calls
    proxy: {
      "/api": {
        target: "http://localhost:8084",
        changeOrigin: true
      },
      "/v3/api-docs": {
        target: "http://localhost:8084",
        changeOrigin: true
      },
      "/swagger-ui": {
        target: "http://localhost:8084",
        changeOrigin: true
      }
    }
  }
});

