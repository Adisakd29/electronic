import type { MetadataRoute } from "next";
import { course } from "@/content/course";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${course.code} ${course.name}`,
    short_name: course.code,
    description: `บทเรียนออนไลน์ ${course.name} 18 สัปดาห์ พร้อมห้องทดลองเสมือน`,
    lang: "th",
    start_url: "/learn",
    display: "standalone",
    background_color: "#f6f8fb",
    theme_color: "#14213d",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
