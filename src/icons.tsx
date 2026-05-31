import {
  IconCat,
  IconDroplet,
  IconFeather,
  IconFence,
  IconFlower,
  IconPlant2,
  type IconProps,
} from "@tabler/icons-react";
import type { FC } from "react";

/** Map a power's icon name (powers.ts) to its Tabler icon component. */
export const POWER_ICONS: Record<string, FC<IconProps>> = {
  flower: IconFlower, // Violet Aeonia
  fence: IconFence, // Thorn Barriers
  plant: IconPlant2, // Fey Blossom
  droplet: IconDroplet, // Venomous Blood
  cat: IconCat, // Cat's Grace
  feather: IconFeather, // Owl's Wisdom
};
