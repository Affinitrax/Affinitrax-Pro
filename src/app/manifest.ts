import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Affinitrax",
    short_name: "Affinitrax",
    description: "Premium traffic brokerage platform.",
    start_url: "/",
    display: "standalone",
    background_color: "#07070f",
    theme_color: "#07070f",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
