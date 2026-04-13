import { createAquariumShareImageResponse } from "@/src/lib/aquarium-share-image";

export const alt =
  "Aquacalma — a responsive digital aquarium for calm, attention, and play.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function TwitterImage() {
  return createAquariumShareImageResponse();
}
