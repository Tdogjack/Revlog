// Makes and models people can pick when adding a car, each with the service
// schedule typical for that make. These are make-level figures gathered from
// owner's manuals, dealers, and service guides: they vary by engine and year,
// so the app calls them typical and points owners at their manual. A model only
// gets its own numbers when it really differs, like an electric or track car.

export type ServiceKey =
  | "oil"
  | "rotation"
  | "brakes"
  | "air-filter"
  | "cabin-filter"
  | "brake-fluid"
  | "coolant"
  | "transmission"
  | "differential"
  | "spark-plugs"
  | "battery"
  | "wipers"
  | "inspection";

// Every X miles or Y months, whichever comes first; null means no limit of that kind.
export type Interval = readonly [miles: number | null, months: number | null];
// Null removes a service that doesn't apply.
export type Schedule = Partial<Record<ServiceKey, Interval | null>>;

export const BASE_SCHEDULE: Record<ServiceKey, Interval> = {
  oil: [7500, 12],
  rotation: [7500, null],
  brakes: [15000, 12],
  "air-filter": [30000, 36],
  "cabin-filter": [20000, 24],
  "brake-fluid": [null, 36],
  coolant: [100000, 120],
  transmission: [60000, null],
  differential: [50000, null],
  "spark-plugs": [100000, null],
  battery: [null, 12],
  wipers: [null, 12],
  inspection: [null, 12],
};

// Applied over the base for electric models, whatever the make: no engine
// services, and regenerative braking is gentle on pads.
const ELECTRIC: Schedule = {
  oil: null,
  "air-filter": null,
  transmission: null,
  differential: null,
  "spark-plugs": null,
  rotation: [6250, null],
  brakes: [25000, 24],
  "cabin-filter": [null, 24],
  "brake-fluid": [null, 48],
  coolant: [150000, 120],
};

const GM: Schedule = {
  "brake-fluid": [null, 60],
  coolant: [150000, 60],
  "spark-plugs": [97500, null],
};
const STELLANTIS_US: Schedule = { oil: [10000, 12], rotation: [10000, null] };
const VW_GROUP: Schedule = {
  oil: [10000, 12],
  rotation: [10000, null],
  "brake-fluid": [null, 24],
  "spark-plugs": [40000, null],
};
const GERMAN_PREMIUM: Schedule = {
  oil: [10000, 12],
  rotation: [10000, null],
  "brake-fluid": [null, 24],
  "spark-plugs": [60000, null],
};
// European brands quote long service gaps, commonly around 20,000 km.
const EUROPEAN: Schedule = {
  oil: [12500, 12],
  rotation: [10000, null],
  "brake-fluid": [null, 24],
  "spark-plugs": [60000, null],
};
const ASIAN_VALUE: Schedule = { oil: [6000, 6], rotation: [6000, null], "spark-plugs": [60000, null] };
const CHINESE: Schedule = { oil: [6000, 6], rotation: [6000, null], "spark-plugs": [40000, null] };
const EXOTIC: Schedule = {
  oil: [10000, 12],
  rotation: [10000, null],
  "brake-fluid": [null, 24],
  "spark-plugs": [30000, null],
};
const ELECTRIC_ONLY: Schedule = {};

export type CarMake = {
  name: string;
  schedule: Schedule;
  models: string[];
  // Listed with the other models, and given the electric schedule.
  electric?: string[];
  // A make that only builds electric cars.
  allElectric?: boolean;
  // Models whose numbers really differ from the rest of the make.
  overrides?: Record<string, Schedule>;
};

const TOYOTA: Schedule = {
  oil: [10000, 12],
  rotation: [5000, 6],
  "spark-plugs": [120000, null],
};
const HONDA: Schedule = { coolant: [120000, 120], "spark-plugs": [105000, null] };
const NISSAN: Schedule = {
  oil: [5000, 6],
  rotation: [5000, 6],
  "spark-plugs": [105000, null],
  coolant: [105000, 120],
};
const HYUNDAI: Schedule = { "spark-plugs": [97500, null], coolant: [120000, 120] };
const FORD: Schedule = { coolant: [100000, 72] };
const JLR: Schedule = {
  oil: [12500, 12],
  rotation: [12500, null],
  "brake-fluid": [null, 24],
  "spark-plugs": [60000, null],
};

export const CAR_MAKES: CarMake[] = [
  {
    name: "Acura",
    schedule: HONDA,
    models: ["ILX", "Integra", "MDX", "NSX", "RDX", "RL", "RLX", "RSX", "TL", "TLX", "TSX", "ZDX"],
    electric: ["ZDX"],
  },
  {
    name: "Alfa Romeo",
    schedule: EUROPEAN,
    models: ["4C", "Giulia", "Giulietta", "Junior", "MiTo", "Stelvio", "Tonale"],
  },
  {
    name: "Aston Martin",
    schedule: EXOTIC,
    models: ["DB11", "DB12", "DB9", "DBS", "DBX", "Vanquish", "Vantage"],
  },
  {
    name: "Audi",
    schedule: VW_GROUP,
    models: [
      "A3", "A4", "A5", "A6", "A7", "A8", "e-tron", "e-tron GT", "Q3", "Q4 e-tron", "Q5", "Q6 e-tron",
      "Q7", "Q8", "R8", "RS3", "RS5", "RS6", "RS7", "S3", "S4", "S5", "S6", "SQ5", "TT",
    ],
    electric: ["e-tron", "e-tron GT", "Q4 e-tron", "Q6 e-tron"],
  },
  {
    name: "Bentley",
    schedule: EXOTIC,
    models: ["Bentayga", "Continental GT", "Flying Spur", "Mulsanne"],
  },
  {
    name: "BMW",
    schedule: GERMAN_PREMIUM,
    models: [
      "1 Series", "2 Series", "3 Series", "4 Series", "5 Series", "6 Series", "7 Series", "8 Series",
      "i3", "i4", "i5", "i7", "i8", "iX", "M2", "M3", "M4", "M5", "M8", "X1", "X2", "X3", "X4", "X5",
      "X6", "X7", "XM", "Z3", "Z4",
    ],
    electric: ["i3", "i4", "i5", "i7", "iX"],
    overrides: {
      M2: { oil: [7500, 12] },
      M3: { oil: [7500, 12] },
      M4: { oil: [7500, 12] },
      M5: { oil: [7500, 12] },
      M8: { oil: [7500, 12] },
    },
  },
  {
    name: "Buick",
    schedule: GM,
    models: ["Enclave", "Encore", "Encore GX", "Envision", "Envista", "LaCrosse", "LeSabre", "Lucerne", "Regal", "Verano"],
  },
  {
    name: "BYD",
    schedule: CHINESE,
    models: ["Atto 3", "Dolphin", "Han", "Qin", "Seal", "Seagull", "Song", "Tang", "Yuan Plus"],
    electric: ["Atto 3", "Dolphin", "Han", "Seal", "Seagull", "Yuan Plus"],
  },
  {
    name: "Cadillac",
    schedule: GM,
    models: [
      "ATS", "CT4", "CT5", "CT6", "CTS", "DTS", "Escalade", "Lyriq", "Optiq", "SRX", "STS", "Vistiq",
      "XT4", "XT5", "XT6", "XTS",
    ],
    electric: ["Lyriq", "Optiq", "Vistiq"],
  },
  {
    name: "Chery",
    schedule: CHINESE,
    models: ["Arrizo 5", "Omoda 5", "Tiggo 4", "Tiggo 7", "Tiggo 8"],
  },
  {
    name: "Chevrolet",
    schedule: GM,
    models: [
      "Astro", "Avalanche", "Aveo", "Blazer", "Blazer EV", "Bolt EUV", "Bolt EV", "Camaro", "Captiva",
      "Cavalier", "Cobalt", "Colorado", "Corvette", "Cruze", "Equinox", "Equinox EV", "Express",
      "HHR", "Impala", "Malibu", "Monte Carlo", "S-10", "Silverado", "Silverado EV", "Sonic", "Spark",
      "Suburban", "Tahoe", "Tracker", "TrailBlazer", "Traverse", "Trax", "Volt",
    ],
    electric: ["Blazer EV", "Bolt EUV", "Bolt EV", "Equinox EV", "Silverado EV"],
  },
  {
    name: "Chrysler",
    schedule: STELLANTIS_US,
    models: ["200", "300", "Pacifica", "PT Cruiser", "Sebring", "Town & Country", "Voyager"],
  },
  {
    name: "Citroen",
    schedule: EUROPEAN,
    models: ["Berlingo", "C1", "C3", "C3 Aircross", "C4", "C5", "C5 Aircross", "e-C3", "e-C4"],
    electric: ["e-C3", "e-C4"],
  },
  {
    name: "Cupra",
    schedule: VW_GROUP,
    models: ["Ateca", "Born", "Formentor", "Leon", "Tavascan"],
    electric: ["Born", "Tavascan"],
  },
  {
    name: "Dacia",
    schedule: EUROPEAN,
    models: ["Bigster", "Duster", "Jogger", "Logan", "Sandero", "Spring"],
    electric: ["Spring"],
  },
  {
    name: "Daihatsu",
    schedule: ASIAN_VALUE,
    models: ["Ayla", "Copen", "Mira", "Move", "Rocky", "Sirion", "Tanto", "Terios", "Xenia"],
  },
  {
    name: "Dodge",
    schedule: STELLANTIS_US,
    models: [
      "Avenger", "Caliber", "Challenger", "Charger", "Dakota", "Dart", "Durango", "Grand Caravan",
      "Hornet", "Journey", "Magnum", "Neon", "Nitro", "Viper",
    ],
    overrides: { Viper: { oil: [6000, 6] } },
  },
  {
    name: "Ferrari",
    schedule: EXOTIC,
    models: ["296", "458", "488", "812", "California", "F8", "Portofino", "Purosangue", "Roma", "SF90"],
  },
  {
    name: "Fiat",
    schedule: EUROPEAN,
    models: ["124 Spider", "500", "500e", "500L", "500X", "Doblo", "Panda", "Punto", "Tipo"],
    electric: ["500e"],
  },
  {
    name: "Ford",
    schedule: FORD,
    models: [
      "Bronco", "Bronco Sport", "C-Max", "Crown Victoria", "E-Transit", "EcoSport", "Edge", "Escape",
      "Escort", "Everest", "Excursion", "Expedition", "Explorer", "F-150", "F-150 Lightning", "F-250",
      "F-350", "Fiesta", "Flex", "Focus", "Fusion", "Galaxy", "Kuga", "Maverick", "Mondeo", "Mustang",
      "Mustang Mach-E", "Puma", "Ranger", "Taurus", "Transit", "Transit Connect",
    ],
    electric: ["E-Transit", "F-150 Lightning", "Mustang Mach-E"],
  },
  {
    name: "Geely",
    schedule: CHINESE,
    models: ["Coolray", "Emgrand", "Geometry C", "Monjaro", "Okavango"],
    electric: ["Geometry C"],
  },
  {
    name: "Genesis",
    schedule: HYUNDAI,
    models: ["Electrified G80", "Electrified GV70", "G70", "G80", "G90", "GV60", "GV70", "GV80"],
    electric: ["Electrified G80", "Electrified GV70", "GV60"],
  },
  {
    name: "GMC",
    schedule: GM,
    models: ["Acadia", "Canyon", "Envoy", "Hummer EV", "Savana", "Sierra", "Sierra EV", "Terrain", "Yukon"],
    electric: ["Hummer EV", "Sierra EV"],
  },
  {
    name: "Great Wall",
    schedule: CHINESE,
    models: ["Haval H6", "Haval Jolion", "Ora Good Cat", "Tank 300", "Wingle"],
    electric: ["Ora Good Cat"],
  },
  {
    name: "Holden",
    schedule: GM,
    models: ["Astra", "Barina", "Captiva", "Colorado", "Commodore", "Cruze", "Trax"],
  },
  {
    name: "Honda",
    schedule: HONDA,
    models: [
      "Accord", "City", "Civic", "Clarity", "CR-V", "CR-Z", "Crosstour", "Element", "Fit", "HR-V",
      "Insight", "Jazz", "Odyssey", "Passport", "Pilot", "Prelude", "Prologue", "Ridgeline", "S2000",
    ],
    electric: ["Prologue"],
  },
  {
    name: "Hummer",
    schedule: GM,
    models: ["H1", "H2", "H3"],
  },
  {
    name: "Hyundai",
    schedule: HYUNDAI,
    models: [
      "Accent", "Azera", "Creta", "Elantra", "Entourage", "Equus", "Genesis", "i10", "i20", "i30",
      "Ioniq", "Ioniq 5", "Ioniq 6", "Ioniq 9", "Kona", "Kona Electric", "Nexo", "Palisade", "Santa Cruz",
      "Santa Fe", "Sonata", "Tiburon", "Tucson", "Veloster", "Venue", "Veracruz",
    ],
    electric: ["Ioniq 5", "Ioniq 6", "Ioniq 9", "Kona Electric"],
  },
  {
    name: "Infiniti",
    schedule: NISSAN,
    models: ["EX35", "FX35", "G35", "G37", "I35", "M35", "Q50", "Q60", "Q70", "QX30", "QX50", "QX55", "QX60", "QX70", "QX80"],
  },
  {
    name: "Isuzu",
    schedule: ASIAN_VALUE,
    models: ["Ascender", "D-Max", "MU-X", "Rodeo", "Trooper"],
  },
  {
    name: "Jaguar",
    schedule: JLR,
    models: ["E-Pace", "F-Pace", "F-Type", "I-Pace", "S-Type", "X-Type", "XE", "XF", "XJ", "XK"],
    electric: ["I-Pace"],
  },
  {
    name: "Jeep",
    schedule: STELLANTIS_US,
    models: [
      "Cherokee", "Commander", "Compass", "Gladiator", "Grand Cherokee", "Grand Wagoneer", "Liberty",
      "Patriot", "Renegade", "Wagoneer", "Wrangler",
    ],
  },
  {
    name: "KG Mobility",
    schedule: ASIAN_VALUE,
    models: ["Actyon", "Korando", "Musso", "Rexton", "Tivoli", "Torres"],
  },
  {
    name: "Kia",
    schedule: HYUNDAI,
    models: [
      "Amanti", "Borrego", "Cadenza", "Carnival", "Ceed", "Cerato", "EV3", "EV6", "EV9", "Forte", "K4",
      "K5", "K900", "Niro", "Niro EV", "Optima", "Picanto", "Rio", "Rondo", "Sedona", "Seltos", "Sorento",
      "Soul", "Soul EV", "Spectra", "Sportage", "Stinger", "Telluride",
    ],
    electric: ["EV3", "EV6", "EV9", "Niro EV", "Soul EV"],
  },
  {
    name: "Lada",
    schedule: { oil: [6000, 12], rotation: [6000, null], "spark-plugs": [30000, null] },
    models: ["Granta", "Niva", "Vesta", "XRay"],
  },
  {
    name: "Lamborghini",
    schedule: EXOTIC,
    models: ["Aventador", "Gallardo", "Huracan", "Revuelto", "Urus"],
  },
  {
    name: "Lancia",
    schedule: EUROPEAN,
    models: ["Delta", "Musa", "Ypsilon"],
  },
  {
    name: "Land Rover",
    schedule: JLR,
    models: [
      "Defender", "Discovery", "Discovery Sport", "Freelander", "LR2", "LR3", "LR4", "Range Rover",
      "Range Rover Evoque", "Range Rover Sport", "Range Rover Velar",
    ],
  },
  {
    name: "Lexus",
    schedule: TOYOTA,
    models: [
      "CT", "ES", "GS", "GX", "HS", "IS", "LC", "LFA", "LS", "LX", "NX", "RC", "RX", "RZ", "SC", "TX",
      "UX",
    ],
    electric: ["RZ"],
  },
  {
    name: "Lincoln",
    schedule: FORD,
    models: ["Aviator", "Continental", "Corsair", "MKC", "MKS", "MKT", "MKX", "MKZ", "Nautilus", "Navigator", "Town Car"],
  },
  {
    name: "Lotus",
    schedule: EXOTIC,
    models: ["Eletre", "Elise", "Emeya", "Emira", "Evora", "Exige"],
    electric: ["Eletre", "Emeya"],
  },
  {
    name: "Lucid",
    schedule: ELECTRIC_ONLY,
    models: ["Air", "Gravity"],
    allElectric: true,
  },
  {
    name: "Mahindra",
    schedule: ASIAN_VALUE,
    models: ["Bolero", "Scorpio", "Thar", "XUV300", "XUV700"],
  },
  {
    name: "Maruti Suzuki",
    schedule: ASIAN_VALUE,
    models: ["Alto", "Baleno", "Brezza", "Dzire", "Ertiga", "Swift", "Wagon R"],
  },
  {
    name: "Maserati",
    schedule: EXOTIC,
    models: ["Ghibli", "GranTurismo", "Grecale", "Levante", "MC20", "Quattroporte"],
  },
  {
    name: "Mazda",
    schedule: { "spark-plugs": [75000, null] },
    models: [
      "CX-3", "CX-30", "CX-5", "CX-50", "CX-7", "CX-70", "CX-9", "CX-90", "Mazda2", "Mazda3", "Mazda5",
      "Mazda6", "MPV", "MX-30", "MX-5 Miata", "RX-7", "RX-8", "Tribute",
    ],
    electric: ["MX-30"],
    overrides: { "RX-8": { oil: [5000, 6], "spark-plugs": [30000, null] }, "RX-7": { oil: [5000, 6], "spark-plugs": [30000, null] } },
  },
  {
    name: "McLaren",
    schedule: EXOTIC,
    models: ["540C", "570S", "600LT", "720S", "750S", "Artura", "GT"],
  },
  {
    name: "Mercedes-Benz",
    schedule: GERMAN_PREMIUM,
    models: [
      "A-Class", "B-Class", "C-Class", "CL-Class", "CLA", "CLK", "CLS", "E-Class", "EQB", "EQE", "EQS",
      "G-Class", "GL-Class", "GLA", "GLB", "GLC", "GLE", "GLK", "GLS", "M-Class", "Metris", "S-Class",
      "SL", "SLC", "SLK", "Sprinter",
    ],
    electric: ["EQB", "EQE", "EQS"],
  },
  {
    name: "Mercury",
    schedule: FORD,
    models: ["Grand Marquis", "Mariner", "Milan", "Mountaineer", "Sable"],
  },
  {
    name: "MG",
    schedule: CHINESE,
    models: ["3", "4 EV", "5 EV", "Cyberster", "HS", "MG6", "ZS", "ZS EV"],
    electric: ["4 EV", "5 EV", "Cyberster", "ZS EV"],
  },
  {
    name: "MINI",
    schedule: GERMAN_PREMIUM,
    models: ["Clubman", "Convertible", "Cooper", "Cooper Electric", "Countryman", "Countryman Electric", "Hardtop", "Paceman"],
    electric: ["Cooper Electric", "Countryman Electric"],
  },
  {
    name: "Mitsubishi",
    schedule: { "spark-plugs": [100000, null] },
    models: ["Eclipse", "Eclipse Cross", "Galant", "Lancer", "Mirage", "Outlander", "Outlander Sport", "Pajero", "Triton"],
  },
  {
    name: "NIO",
    schedule: ELECTRIC_ONLY,
    models: ["EC6", "EL6", "EL7", "ES6", "ES8", "ET5", "ET7"],
    allElectric: true,
  },
  {
    name: "Nissan",
    schedule: NISSAN,
    models: [
      "350Z", "370Z", "Altima", "Ariya", "Armada", "Cube", "Frontier", "GT-R", "Juke", "Kicks", "Leaf",
      "March", "Maxima", "Micra", "Murano", "Navara", "NV200", "Pathfinder", "Qashqai", "Quest", "Rogue",
      "Sentra", "Titan", "Versa", "X-Trail", "Xterra", "Z",
    ],
    electric: ["Ariya", "Leaf"],
    overrides: { "GT-R": { oil: [6000, 12] } },
  },
  {
    name: "Oldsmobile",
    schedule: GM,
    models: ["Alero", "Aurora", "Bravada", "Cutlass", "Intrigue", "Silhouette"],
  },
  {
    name: "Opel",
    schedule: EUROPEAN,
    models: ["Astra", "Corsa", "Crossland", "Grandland", "Insignia", "Meriva", "Mokka", "Zafira"],
  },
  {
    name: "Perodua",
    schedule: ASIAN_VALUE,
    models: ["Alza", "Ativa", "Aruz", "Axia", "Bezza", "Myvi"],
  },
  {
    name: "Peugeot",
    schedule: EUROPEAN,
    models: ["108", "2008", "208", "3008", "308", "5008", "508", "e-2008", "e-208", "Partner", "Rifter"],
    electric: ["e-2008", "e-208"],
  },
  {
    name: "Plymouth",
    schedule: STELLANTIS_US,
    models: ["Breeze", "Grand Voyager", "Neon", "Prowler", "Voyager"],
  },
  {
    name: "Polestar",
    schedule: ELECTRIC_ONLY,
    models: ["Polestar 2", "Polestar 3", "Polestar 4"],
    allElectric: true,
  },
  {
    name: "Pontiac",
    schedule: GM,
    models: ["Aztek", "Bonneville", "Firebird", "G6", "G8", "Grand Am", "Grand Prix", "GTO", "Solstice", "Sunfire", "Vibe"],
  },
  {
    name: "Porsche",
    schedule: { ...GERMAN_PREMIUM, "spark-plugs": [40000, null] },
    models: ["718 Boxster", "718 Cayman", "911", "Boxster", "Cayenne", "Cayman", "Macan", "Macan Electric", "Panamera", "Taycan"],
    electric: ["Macan Electric", "Taycan"],
  },
  {
    name: "Proton",
    schedule: ASIAN_VALUE,
    models: ["Iriz", "Persona", "Saga", "X50", "X70", "X90"],
  },
  {
    name: "Ram",
    schedule: STELLANTIS_US,
    models: ["1500", "2500", "3500", "Dakota", "ProMaster", "ProMaster City"],
  },
  {
    name: "Renault",
    schedule: EUROPEAN,
    models: ["5 E-Tech", "Arkana", "Captur", "Clio", "Duster", "Kadjar", "Kangoo", "Koleos", "Megane", "Megane E-Tech", "Scenic", "Twingo", "Zoe"],
    electric: ["5 E-Tech", "Megane E-Tech", "Zoe"],
  },
  {
    name: "Rivian",
    schedule: ELECTRIC_ONLY,
    models: ["R1S", "R1T", "R2"],
    allElectric: true,
  },
  {
    name: "Rolls-Royce",
    schedule: EXOTIC,
    models: ["Cullinan", "Ghost", "Phantom", "Spectre", "Wraith"],
    electric: ["Spectre"],
  },
  {
    name: "Saab",
    schedule: EUROPEAN,
    models: ["9-2X", "9-3", "9-4X", "9-5", "9-7X"],
  },
  {
    name: "Saturn",
    schedule: GM,
    models: ["Aura", "Ion", "Outlook", "Relay", "S-Series", "Sky", "Vue"],
  },
  {
    name: "Scion",
    schedule: TOYOTA,
    models: ["FR-S", "iA", "iM", "iQ", "tC", "xA", "xB", "xD"],
  },
  {
    name: "SEAT",
    schedule: VW_GROUP,
    models: ["Alhambra", "Arona", "Ateca", "Ibiza", "Leon", "Tarraco"],
  },
  {
    name: "Skoda",
    schedule: VW_GROUP,
    models: ["Elroq", "Enyaq", "Fabia", "Kamiq", "Karoq", "Kodiaq", "Octavia", "Rapid", "Scala", "Superb"],
    electric: ["Elroq", "Enyaq"],
  },
  {
    name: "Smart",
    schedule: GERMAN_PREMIUM,
    models: ["#1", "#3", "ForFour", "ForTwo", "ForTwo Electric"],
    electric: ["#1", "#3", "ForTwo Electric"],
  },
  {
    name: "Subaru",
    schedule: {
      oil: [6000, 6],
      rotation: [6000, 6],
      "spark-plugs": [60000, null],
      "brake-fluid": [30000, 36],
      coolant: [137500, 132],
    },
    models: [
      "Ascent", "Baja", "BRZ", "Crosstrek", "Forester", "Impreza", "Legacy", "Outback", "Solterra",
      "SVX", "Tribeca", "WRX", "WRX STI", "XV",
    ],
    electric: ["Solterra"],
  },
  {
    name: "Suzuki",
    schedule: ASIAN_VALUE,
    models: ["Forenza", "Grand Vitara", "Ignis", "Jimny", "Kizashi", "SX4", "Swift", "Vitara", "XL-7"],
  },
  {
    name: "Tata",
    schedule: ASIAN_VALUE,
    models: ["Altroz", "Harrier", "Nexon", "Nexon EV", "Punch", "Safari", "Tiago", "Tiago EV"],
    electric: ["Nexon EV", "Tiago EV"],
  },
  {
    name: "Tesla",
    schedule: {
      // Tesla's manuals: brake fluid checked every 4 years, rotation at 6,250 mi.
      coolant: null,
    },
    models: ["Cybertruck", "Model 3", "Model S", "Model X", "Model Y", "Roadster"],
    allElectric: true,
    overrides: {
      "Model S": { "cabin-filter": [null, 36] },
      "Model X": { "cabin-filter": [null, 36] },
    },
  },
  {
    name: "Toyota",
    schedule: TOYOTA,
    models: [
      "4Runner", "86", "Aurion", "Avalon", "Avensis", "Aygo", "bZ4X", "C-HR", "Camry", "Celica", "Corolla",
      "Corolla Cross", "Crown", "Echo", "FJ Cruiser", "Fortuner", "GR Corolla", "GR Supra", "GR86",
      "Grand Highlander", "Highlander", "Hilux", "Land Cruiser", "Matrix", "Mirai", "MR2", "Prius",
      "RAV4", "Sequoia", "Sienna", "Solara", "Supra", "Tacoma", "Tundra", "Venza", "Yaris",
    ],
    electric: ["bZ4X"],
    overrides: { "GR Corolla": { oil: [5000, 6] } },
  },
  {
    name: "Vauxhall",
    schedule: EUROPEAN,
    models: ["Astra", "Corsa", "Crossland", "Grandland", "Insignia", "Mokka", "Vivaro", "Zafira"],
  },
  {
    name: "Volkswagen",
    schedule: VW_GROUP,
    models: [
      "Arteon", "Atlas", "Atlas Cross Sport", "Beetle", "CC", "e-Golf", "Eos", "GLI", "Golf", "Golf R",
      "GTI", "ID.3", "ID.4", "ID.Buzz", "Jetta", "Passat", "Phaeton", "Polo", "Rabbit", "Routan", "T-Cross",
      "T-Roc", "Taos", "Tiguan", "Touareg", "Transporter",
    ],
    electric: ["e-Golf", "ID.3", "ID.4", "ID.Buzz"],
  },
  {
    name: "Volvo",
    schedule: GERMAN_PREMIUM,
    models: ["C30", "C40", "C70", "EC40", "EX30", "EX40", "EX90", "S40", "S60", "S80", "S90", "V40", "V50", "V60", "V70", "V90", "XC40", "XC60", "XC70", "XC90"],
    electric: ["C40", "EC40", "EX30", "EX40", "EX90"],
  },
  {
    name: "XPeng",
    schedule: ELECTRIC_ONLY,
    models: ["G3", "G6", "G9", "P5", "P7"],
    allElectric: true,
  },
  {
    name: "Zeekr",
    schedule: ELECTRIC_ONLY,
    models: ["001", "009", "7X", "X"],
    allElectric: true,
  },
];

// "BMW" = "bmw", "3-Series" = "3 Series", so a VIN lookup or a typed name still matches.
function normalize(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findMake(name: string) {
  const key = normalize(name);
  return key ? CAR_MAKES.find((m) => normalize(m.name) === key) : undefined;
}

export function findModel(make: CarMake, name: string) {
  const key = normalize(name);
  return key ? make.models.find((m) => normalize(m) === key) : undefined;
}

// VIN lookups often add a body or size: "Silverado 1500" should still find "Silverado".
export function closestModel(make: CarMake, name: string) {
  const key = normalize(name);
  if (!key) return undefined;
  return (
    findModel(make, name) ??
    make.models
      .filter((m) => key.startsWith(normalize(m)))
      .sort((a, b) => normalize(b).length - normalize(a).length)[0]
  );
}

export function modelSchedule(make: CarMake, model: string): Record<ServiceKey, Interval | null> {
  const electric = make.allElectric || make.electric?.includes(model);
  return {
    ...BASE_SCHEDULE,
    // A make's numbers are for its engines, so its electric models skip them.
    // An all-electric make's own numbers are for electric cars, so they win.
    ...(electric ? ELECTRIC : make.schedule),
    ...(make.allElectric ? make.schedule : {}),
    ...make.overrides?.[model],
  };
}
