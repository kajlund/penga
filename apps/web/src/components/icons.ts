import { html, svg } from 'lit';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';
import {
  ChartNoAxesCombined,
  Wallet,
  ArrowLeftRight,
  Copy,
  ListChecks,
  Target,
  Settings,
  Landmark,
  CreditCard,
  Banknote,
  Handshake,
  Scale,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Shirt,
  Utensils,
  GraduationCap,
  BookOpen,
  Tv,
  Receipt,
  Gift,
  Car,
  House,
  HeartPulse,
  Search,
  Plus,
  Pencil,
  Trash2,
  X,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  RefreshCw,
  TriangleAlert,
  Check,
  Circle,
  Ban,
  Undo2,
  FileText,
  Star,
  Lock,
  Tag,
  Building2,
  Lightbulb,
  Droplets,
  Shield,
  Apple,
  Candy,
  Sofa,
  SprayCan,
  Fuel,
  Wrench,
  SquareParking,
  Bike,
  Dumbbell,
  Footprints,
  Palette,
  Pill,
  Leaf,
  User,
  Ticket,
  Clapperboard,
  Folder,
  Sun,
  Moon,
  ArrowUpRight,
  HandCoins,
  GripVertical,
} from 'lucide';

// Only explicitly imported, bundled Lucide nodes enter the SVG renderer.
export const iconRegistry = {
  'chart-no-axes-combined': ChartNoAxesCombined,
  wallet: Wallet,
  'arrow-left-right': ArrowLeftRight,
  copy: Copy,
  'list-checks': ListChecks,
  target: Target,
  settings: Settings,
  landmark: Landmark,
  'credit-card': CreditCard,
  banknote: Banknote,
  handshake: Handshake,
  scale: Scale,
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'shopping-cart': ShoppingCart,
  shirt: Shirt,
  utensils: Utensils,
  'graduation-cap': GraduationCap,
  'book-open': BookOpen,
  tv: Tv,
  receipt: Receipt,
  gift: Gift,
  car: Car,
  house: House,
  'heart-pulse': HeartPulse,
  search: Search,
  plus: Plus,
  pencil: Pencil,
  'trash-2': Trash2,
  x: X,
  'chevron-down': ChevronDown,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  ellipsis: Ellipsis,
  'refresh-cw': RefreshCw,
  'triangle-alert': TriangleAlert,
  check: Check,
  circle: Circle,
  ban: Ban,
  'undo-2': Undo2,
  'file-text': FileText,
  star: Star,
  lock: Lock,
  tag: Tag,
  'building-2': Building2,
  lightbulb: Lightbulb,
  droplets: Droplets,
  shield: Shield,
  apple: Apple,
  candy: Candy,
  sofa: Sofa,
  'spray-can': SprayCan,
  fuel: Fuel,
  wrench: Wrench,
  'square-parking': SquareParking,
  bike: Bike,
  dumbbell: Dumbbell,
  footprints: Footprints,
  palette: Palette,
  pill: Pill,
  leaf: Leaf,
  user: User,
  ticket: Ticket,
  clapperboard: Clapperboard,
  folder: Folder,
  sun: Sun,
  moon: Moon,
  'arrow-up-right': ArrowUpRight,
  'hand-coins': HandCoins,
  'grip-vertical': GripVertical,
} as const;
export type IconKey = keyof typeof iconRegistry;
const legacyIcons: Record<string, IconKey> = {
  '📊': 'chart-no-axes-combined',
  '🌳': 'wallet',
  '💸': 'arrow-left-right',
  '⚡': 'copy',
  '📑': 'list-checks',
  '🎯': 'target',
  '⚙': 'settings',
  '🏦': 'landmark',
  '🏛': 'landmark',
  '💰': 'wallet',
  '💵': 'banknote',
  '💳': 'credit-card',
  '🤝': 'handshake',
  '⚖': 'scale',
  '🛡': 'shield',
  '💼': 'building-2',
  '📈': 'trending-up',
  '📉': 'trending-down',
  '🛒': 'shopping-cart',
  '🏠': 'house',
  '🚗': 'car',
  '🍔': 'utensils',
  '🍽': 'utensils',
  '🎁': 'gift',
  '💡': 'lightbulb',
  '📋': 'list-checks',
  '📄': 'file-text',
  '🧽': 'spray-can',
  '🛋': 'sofa',
  '🍏': 'apple',
  '🍫': 'candy',
  '⛽': 'fuel',
  '🛠': 'wrench',
  '🅿': 'square-parking',
  '🛴': 'bike',
  '🏃': 'footprints',
  '🏋': 'dumbbell',
  '👟': 'footprints',
  '🎨': 'palette',
  '👕': 'shirt',
  '👔': 'shirt',
  '🧴': 'spray-can',
  '💊': 'pill',
  '🌿': 'leaf',
  '👤': 'user',
  '🎟': 'ticket',
  '🎬': 'clapperboard',
  '📚': 'book-open',
  '📖': 'book-open',
  '🎓': 'graduation-cap',
  '📁': 'folder',
  '📂': 'folder',
  '🔍': 'search',
  '✏': 'pencil',
  '➕': 'plus',
  '🗑': 'trash-2',
  '🔄': 'refresh-cw',
  '⚠': 'triangle-alert',
  '💧': 'droplets',
  '🏢': 'building-2',
  '🏷': 'tag',
  '🚫': 'ban',
  '↩': 'undo-2',
  '⭐': 'star',
  '🔒': 'lock',
};
const defaults: Record<string, IconKey> = {
  ASSET: 'landmark',
  LIABILITY: 'credit-card',
  SETTLEMENT: 'handshake',
  EQUITY: 'scale',
  INCOME: 'trending-up',
  EXPENSE: 'receipt',
  TEMPLATE: 'copy',
};
export function resolveIcon(value?: string | null, type = 'ASSET'): IconKey {
  const key = (value || '').replace(/^lucide:/, '');
  if (Object.prototype.hasOwnProperty.call(iconRegistry, key))
    return key as IconKey;
  const legacy = key.replace(/\uFE0F/g, '');
  if (Object.prototype.hasOwnProperty.call(legacyIcons, legacy))
    return legacyIcons[legacy]!;
  return Object.prototype.hasOwnProperty.call(defaults, type)
    ? defaults[type]!
    : 'folder';
}
export function icon(value?: string | null, type = 'ASSET', size = 18) {
  const nodes = iconRegistry[resolveIcon(value, type)];
  // Stored values select an allowlisted key; they are never parsed as markup.
  const content = nodes
    .map(
      ([tag, attrs]) =>
        '<' +
        tag +
        ' ' +
        Object.entries(attrs)
          .map(
            ([key, value]) =>
              key +
              '="' +
              String(value)
                .replace(/&/g, '&amp;')
                .replace(/"/g, '&quot;')
                .replace(/</g, '&lt;') +
              '"',
          )
          .join(' ') +
        '/>',
    )
    .join('');
  return html`<svg
    xmlns="http://www.w3.org/2000/svg"
    width=${size}
    height=${size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
    style="display:inline-block;vertical-align:middle;flex-shrink:0"
  >
    ${svg`${unsafeSVG(content)}`}
  </svg>`;
}
const financialIcons = new Set<IconKey>([
  'wallet',
  'landmark',
  'credit-card',
  'banknote',
  'handshake',
  'scale',
  'hand-coins',
  'trending-up',
  'trending-down',
  'shopping-cart',
  'shirt',
  'utensils',
  'graduation-cap',
  'book-open',
  'tv',
  'receipt',
  'gift',
  'car',
  'house',
  'heart-pulse',
  'building-2',
  'lightbulb',
  'droplets',
  'shield',
  'apple',
  'candy',
  'sofa',
  'spray-can',
  'fuel',
  'wrench',
  'square-parking',
  'bike',
  'dumbbell',
  'footprints',
  'palette',
  'pill',
  'leaf',
  'user',
  'ticket',
  'clapperboard',
]);
const labels: Partial<Record<IconKey, string>> = {
  landmark: 'Bank',
  'hand-coins': 'Loan',
  banknote: 'Cash',
  handshake: 'Settlement',
  receipt: 'Expenses',
  tv: 'Media',
  'heart-pulse': 'Healthcare',
};
export const iconChoices = (Object.keys(iconRegistry) as IconKey[]).map(
  (key) => ({
    key,
    label:
      labels[key] ||
      key
        .split('-')
        .map((word) => word[0]!.toUpperCase() + word.slice(1))
        .join(' '),
    group: financialIcons.has(key)
      ? 'Accounts & categories'
      : 'Actions & navigation',
  }),
);
