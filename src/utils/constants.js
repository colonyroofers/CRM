// Color constants
export const C = {
  navy: "#1B2A4A",
  navyLight: "#263B66",
  navyDark: "#111D35",
  red: "#E63946",
  redDark: "#C5303C",
  white: "#FFFFFF",
  gray50: "#F8FAFC",
  gray100: "#F1F5F9",
  gray200: "#E2E8F0",
  gray300: "#CBD5E1",
  gray400: "#94A3B8",
  gray500: "#64748B",
  gray600: "#475569",
  gray700: "#334155",
  green: "#10B981",
  greenBg: "#D1FAE5",
  yellow: "#F59E0B",
  yellowBg: "#FEF3C7",
  redBg: "#FEE2E5",
  blueBg: "#DBEAFE",
  blue: "#3B82F6",
};

// Markets
export const MARKETS = ["ATL", "TPA", "DFW"];
export const MARKET_LABELS = {
  ATL: "Atlanta",
  TPA: "Tampa",
  DFW: "Dallas"
};
export const MARKET_INFO = {
  atlanta: {
    name: "Colony Roofers - Atlanta",
    phone: "(678) 515-9795",
    address: "260 Peachtree St. NW Atlanta, GA 30303",
    state: "Georgia"
  },
  tampa: {
    name: "Colony Roofers - Tampa",
    phone: "(813) 551-0707",
    address: "Tampa, FL",
    state: "Florida"
  },
  dallas: {
    name: "Colony Roofers - Dallas",
    phone: "(972) 985-4099",
    address: "Dallas, TX",
    state: "Texas"
  },
};

// Module system
export const ALL_MODULES = [
  "daily_digest",
  "tasks",
  "directory",
  "dispatch",
  "inspections",
  "sales",
  "estimating",
  "production",
  "service",
  "finance",
  "reports",
  "calendar",
  "catalog"
];

export const MODULE_LABELS = {
  daily_digest: "Daily Digest",
  tasks: "Tasks",
  directory: "Directory",
  dispatch: "Dispatch",
  sales: "Project Sales",
  estimating: "Estimating",
  production: "Production",
  inspections: "Inspections",
  catalog: "Catalog",
  service: "Service",
  finance: "Finance",
  reports: "Reports",
  calendar: "Calendar"
};

export const MODULE_ICONS = {
  daily_digest: "📅",
  tasks: "✅",
  directory: "📇",
  dispatch: "📡",
  sales: "💼",
  estimating: "📐",
  production: "🏗️",
  inspections: "🔍",
  catalog: "📦",
  service: "🔧",
  finance: "💰",
  reports: "📊",
  calendar: "📆"
};

// Role system
export const ROLE_PRESETS = {
  admin: { label: "Admin", modules: ALL_MODULES, color: "#E63946" },
  estimator: { label: "Estimator", modules: ["daily_digest", "directory", "sales", "estimating", "catalog"], color: "#3B82F6" },
  lead_estimator: { label: "Lead Estimator", modules: ["daily_digest", "directory", "sales", "estimating", "catalog", "production"], color: "#2563EB" },
  coordinator: { label: "Coordinator", modules: ["daily_digest", "directory", "dispatch", "sales", "production", "inspections", "service", "reports", "calendar"], color: "#10B981" },
  superintendent: { label: "Superintendent", modules: ["daily_digest", "directory", "dispatch", "production", "inspections", "service"], color: "#F59E0B" },
};

export const ROLE_COLORS = {
  admin: "#E63946",
  estimator: "#3B82F6",
  lead_estimator: "#2563EB",
  coordinator: "#10B981",
  superintendent: "#F59E0B"
};

// Hardcoded fallback — used if Firestore user record doesn't exist yet
export const DEFAULT_ROLE_MAP = {
  "zach@colonyroofers.com": "admin",
  "zachreececpa@gmail.com": "admin",
  "brayleigh@colonyroofers.com": "coordinator",
  "lucio@colonyroofers.com": "superintendent",
  "derrick@colonyroofers.com": "superintendent",
  "joseph@colonyroofers.com": "estimator",
  "jgarside@colonyroofers.com": "estimator",
};

export const ROLES = ROLE_PRESETS; // backward compat

export const getUserRole = (email) => DEFAULT_ROLE_MAP[email?.toLowerCase()] || "admin";
export const canAccess = (role, module) => ROLE_PRESETS[role]?.modules.includes(module) || false;

// ID and formatting utilities
export const generateId = () => Math.random().toString(36).substring(2, 10);
export const formatCurrency = (val) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(val);
export const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(n);

// Estimator list
export const ESTIMATORS = [
  { name: "Joseph", email: "joseph@colonyroofers.com" },
  { name: "J. Garside", email: "jgarside@colonyroofers.com" },
  { name: "Zach Reece", email: "zach@colonyroofers.com" },
];

// Estimating Constants - Materials
export const DEFAULT_MATERIALS = {
  shinglePrice: 29.67,
  hipRidgePrice: 65.0,
  starterPrice: 42.0,
  underlaymentPrice: 60.0,
  iceWaterPrice: 60.0,
  ridgeVentPrice: 7.0,
  stepFlashingPrice: 55.0,
  dripEdgePrice: 6.95,
  coilNailPrice: 40.0,
  capNailPrice: 22.0,
  pipeBootPrice: 4.95,
  touchPaintPrice: 6.95,
  np1Price: 8.0,
};

export const DEFAULT_LABOR = {
  tearOffRate: 75.0,
  osbLabor: 20.0,
  osbMaterial: 22.95,
  osbSheets: 0
};

export const DEFAULT_EQUIPMENT = {
  forkliftCost: 7373.0,
  dumpsterCost: 23120.0,
  permitCost: 4825.0,
  includePermit: true,
  extendedWarranty: false,
  warrantyPerSq: 11.0
};

export const DEFAULT_FINANCIALS = {
  margin: 0.30,
  taxRate: 0.089
};

export const EMPTY_BUILDING = {
  siteplanNum: "",
  roofrNum: "",
  phase: 1,
  pipes: 0,
  totalArea: 0,
  pitchedArea: 0,
  flatArea: 0,
  predominantPitch: "5/12",
  eaves: 0,
  valleys: 0,
  hips: 0,
  ridges: 0,
  rakes: 0,
  wallFlashing: 0,
  stepFlashing: 0
};

// TPO / Beam AI Default Pricing
export const TPO_UNIT_COSTS = {
  "ROOF MEMBRANE": { cost: 1.85, unit: "SF", category: "material", desc: "TPO/PVC membrane" },
  "TPO ROLL COUNT": { cost: 165.00, unit: "EA", category: "material", desc: "TPO roll (950 SF)" },
  "PVC ROLL COUNT": { cost: 175.00, unit: "EA", category: "material", desc: "PVC roll (950 SF)" },
  "DENS DECK": { cost: 32.00, unit: "EA", category: "material", desc: "1/2\" cover board 4x4" },
  "ISO INSULATION BOARD": { cost: 55.00, unit: "EA", category: "material", desc: "6\" polyiso 4x8" },
  "FASTENER": { cost: 0.18, unit: "EA", category: "material", desc: "Insulation fastener" },
  "PLATE COUNT": { cost: 0.10, unit: "EA", category: "material", desc: "Stress plate" },
  "LOW RISE FOAM COUNT": { cost: 425.00, unit: "EA/KIT", category: "material", desc: "Foam adhesive kit" },
  "SEAM CLEANER": { cost: 12.00, unit: "EA", category: "material", desc: "Seam cleaner" },
  "CAULKING": { cost: 6.50, unit: "EA", category: "material", desc: "Sealant tube" },
  "T-PATCH": { cost: 4.50, unit: "EA", category: "material", desc: "T-patch" },
  "BONDING ADHESIVE": { cost: 32.00, unit: "EA/GAL", category: "material", desc: "Bonding adhesive per gal" },
  "WALK PADS": { cost: 3.25, unit: "SF", category: "material", desc: "Walk pad" },
  "COVER TAPE": { cost: 18.00, unit: "ROLL", category: "material", desc: "Cover tape roll" },
  "CUT EDGE SEALANT": { cost: 10.00, unit: "BOTTLE", category: "material", desc: "Cut edge sealant" },
  "STEEL DECKING": { cost: 5.50, unit: "SF", category: "material", desc: "Steel roof deck" },
  "MANUFACTURED METAL FASCIA": { cost: 12.00, unit: "LF", category: "accessory", desc: "Metal fascia" },
  "MANUFACTURED METAL COPING": { cost: 15.00, unit: "LF", category: "accessory", desc: "Metal coping" },
  "2'0\" STRETCHED OUT_MANUFACTURED METAL COPING": { cost: 15.00, unit: "LF", category: "accessory", desc: "Metal coping 2ft" },
  "COUNTER FLASHING @ RTU CURB": { cost: 8.00, unit: "LF", category: "accessory", desc: "RTU counter flashing" },
  "8\" FACTORY FINISHED GUTTER": { cost: 12.00, unit: "LF", category: "accessory", desc: "8\" gutter" },
  "TERMINATION BAR": { cost: 2.00, unit: "LF", category: "accessory", desc: "Termination bar" },
  "REGLET FLASHING BY CANOPY INSTALLER": { cost: 10.00, unit: "LF", category: "accessory", desc: "Reglet flashing" },
  "MAKE IT CLAMP KIT": { cost: 45.00, unit: "LF", category: "accessory", desc: "Clamp kit" },
  "FLASHING AROUND VENT (ASSUMED)": { cost: 8.00, unit: "LF", category: "accessory", desc: "Vent flashing" },
  "4\" ROOF DRAINS": { cost: 185.00, unit: "EA", category: "accessory", desc: "4\" roof drain" },
  "6\" ROOF DRAINS": { cost: 225.00, unit: "EA", category: "accessory", desc: "6\" roof drain" },
  "4\" OVERFLOW DRAIN": { cost: 165.00, unit: "EA", category: "accessory", desc: "4\" overflow drain" },
  "6\" OVERFLOW DRAIN": { cost: 195.00, unit: "EA", category: "accessory", desc: "6\" overflow drain" },
  "2\" VTR": { cost: 65.00, unit: "EA", category: "accessory", desc: "2\" vent through roof" },
  "3\" VTR": { cost: 75.00, unit: "EA", category: "accessory", desc: "3\" vent through roof" },
  "8\" GUTTER W/ END CAP AND DEBRIS GUARD": { cost: 95.00, unit: "EA", category: "accessory", desc: "Gutter end cap kit" },
  "DOWNSPOUT @ 2'2\" HT": { cost: 45.00, unit: "EA", category: "accessory", desc: "Downspout" },
  "ROOF ACCESS HATCH": { cost: 350.00, unit: "EA", category: "accessory", desc: "Roof access hatch" },
};

export const TPO_MEMBRANE_ITEMS = [
  "ROOF MEMBRANE UP & OVER PARAPET",
  "ROOF MEMBRANE AROUND",
  "ROOF MEMBRANE DROP DOWN",
  "ROOF MEMBRANE UP TO"
];

export const TPO_DEFAULT_LABOR = {
  installPerSf: 2.50,
  tearOffPerSf: 0.85,
  cleanupPerSf: 0.15
};

export const TPO_DEFAULT_EQUIPMENT = {
  liftRental: 4500,
  dumpsters: 8500,
  permitCost: 4825,
  safetyEquip: 2500
};

// Scope items and exclusions
export const SCOPE_ITEMS = [
  "Install temporary safety equipment to meet or exceed OSHA and company set safety guidelines.",
  "Remove existing shingles roofing system and all related accessories down to exposed roof deck.",
  "Inspect existing roof deck ensuring it is ready for proper installation of the new roof assembly.",
  "Furnish and install ice and water barrier in a three-foot swath at all valleys and roof penetrations.",
  "Furnish and install new synthetic underlayment.",
  "Furnish and install new Architectural Shingles. Color to be determined.",
  "All roofing details including but not limited to drip edge, roof penetrations, hips and ridges, and off-ridge vents shall meet manufacturer's specifications and installation requirements.",
  "Dispose of all debris in an appropriate container and remove from jobsite.",
  "Furnish owner with a Limited Lifetime Manufacturer Warranty.",
  "Furnish owner with two (2) year workmanship warranty.",
];

export const UNIT_COSTS = [
  "At discovery if any fascia is determined to be deteriorated, removal and replacement will be billed at $15 per LF.",
  "At discovery if any soffit is determined to be deteriorated, removal and replacement will be billed at $15 per LF.",
  "At discovery if any roof substrate is determined to be deteriorated, removal and replacement will be billed at $95 per 4' x 8' sheet.",
];

export const EXCLUSIONS = "Carpentry, HVAC, Electrical, Plumbing, Asbestos Abatement, and Framing.";
