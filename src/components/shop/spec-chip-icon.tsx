import {
  AppWindow,
  Battery,
  Bluetooth,
  Camera,
  Cpu,
  Database,
  Gauge,
  Gamepad2,
  Gpu,
  HardDrive,
  Headphones,
  Keyboard,
  Laptop,
  MemoryStick,
  Monitor,
  Mouse,
  Network,
  Package,
  Plug,
  Power,
  Printer,
  Ruler,
  Server,
  Smartphone,
  Speaker,
  Tag,
  Tv,
  Usb,
  Webcam,
  Weight,
  Wifi,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

/**
 * Curated icon registry for product spec chips.
 *
 * Admin stores an icon KEY in the spec_chips config; this module resolves it
 * to a lucide icon so the stored JSON stays small and stable. Unknown keys
 * fall back to the Tag icon (never crash).
 */

export type SpecIconKey = string;

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export const SPEC_ICON_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "cpu", label: "CPU" },
  { value: "memory-stick", label: "RAM / Memoria" },
  { value: "hard-drive", label: "Disco / Archiviazione" },
  { value: "monitor", label: "Schermo / Monitor" },
  { value: "gpu", label: "Scheda video" },
  { value: "app-window", label: "Sistema operativo / App" },
  { value: "laptop", label: "Laptop / Portatile" },
  { value: "smartphone", label: "Smartphone" },
  { value: "tv", label: "TV" },
  { value: "printer", label: "Stampante" },
  { value: "keyboard", label: "Tastiera" },
  { value: "mouse", label: "Mouse" },
  { value: "gamepad-2", label: "Gamepad / Console" },
  { value: "speaker", label: "Altoparlante" },
  { value: "headphones", label: "Cuffie" },
  { value: "camera", label: "Fotocamera" },
  { value: "webcam", label: "Webcam" },
  { value: "network", label: "Rete" },
  { value: "wifi", label: "Wi-Fi" },
  { value: "bluetooth", label: "Bluetooth" },
  { value: "usb", label: "USB" },
  { value: "plug", label: "Alimentazione" },
  { value: "battery", label: "Batteria" },
  { value: "power", label: "Accensione" },
  { value: "server", label: "Server" },
  { value: "database", label: "Database" },
  { value: "gauge", label: "Prestazioni / Frequenza" },
  { value: "weight", label: "Peso" },
  { value: "ruler", label: "Dimensioni" },
  { value: "package", label: "Contenuto confezione" },
  { value: "tag", label: "Generico / Etichetta" },
];

const REGISTRY: Record<string, IconComponent> = {
  "app-window": AppWindow,
  battery: Battery,
  bluetooth: Bluetooth,
  camera: Camera,
  cpu: Cpu,
  database: Database,
  gauge: Gauge,
  "gamepad-2": Gamepad2,
  gpu: Gpu,
  "hard-drive": HardDrive,
  headphones: Headphones,
  keyboard: Keyboard,
  laptop: Laptop,
  "memory-stick": MemoryStick,
  monitor: Monitor,
  mouse: Mouse,
  network: Network,
  package: Package,
  plug: Plug,
  power: Power,
  printer: Printer,
  ruler: Ruler,
  server: Server,
  smartphone: Smartphone,
  speaker: Speaker,
  tag: Tag,
  tv: Tv,
  usb: Usb,
  webcam: Webcam,
  weight: Weight,
  wifi: Wifi,
};

export function SpecChipIcon({
  name,
  className = "",
}: {
  name: string;
  className?: string;
}) {
  const Icon = REGISTRY[name] ?? Tag;
  return <Icon className={className} aria-hidden="true" focusable="false" />;
}
