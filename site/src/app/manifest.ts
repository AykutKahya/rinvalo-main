import type { MetadataRoute } from "next";

// Lets phones add Rinvalo to the home screen and open it like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Rinvalo · Maç tahminleri",
    short_name: "Rinvalo",
    description: "İstatistik modeliyle maç tahminleri, ihtimaller ve analiz.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1018",
    theme_color: "#0b1018",
    lang: "tr",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/brand/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
