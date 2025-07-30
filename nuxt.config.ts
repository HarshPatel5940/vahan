// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  modules: ["@nuxt/eslint", "@nuxt/ui"],

  css: ["~/assets/css/onedark.css"],

  srcDir: "app",
  serverDir: "nuxt-server",

  devtools: {
    enabled: true,

    timeline: {
      enabled: true,
    },
  },

  eslint: {
    config: {
      standalone: false,
      nuxt: {
        sortConfigKeys: true,
      },
    },
  },
});
