/**
 * Shared word lists for the parser. Kept in one place so section detection,
 * entry parsing and name extraction agree on what a job title, an employer,
 * an institution or a bullet looks like.
 */

/** Nouns that make a line read as a job title ("Data Analyst", "Head, Design Club"). */
const ROLE_WORDS = [
  "developer", "engineer", "designer", "manager", "consultant", "analyst",
  "architect", "intern", "specialist", "administrator", "programmer",
  "scientist", "executive", "associate", "freelancer", "enthusiast",
  "professional", "student", "graduate", "fresher", "lead", "officer",
  "coordinator", "strategist", "technologist", "evangelist", "practitioner",
  "director", "founder", "ceo", "cto", "cfo", "coo", "president", "head",
  "trainee", "apprentice", "recruiter", "tester", "qa",
  // Beyond tech
  "assistant", "researcher", "fellow", "teacher", "professor", "lecturer",
  "instructor", "tutor", "accountant", "auditor", "advisor", "adviser",
  "counselor", "counsellor", "nurse", "physician", "pharmacist", "therapist",
  "technician", "supervisor", "clerk", "cashier", "representative",
  "operator", "secretary", "receptionist", "editor", "writer", "copywriter",
  "journalist", "reporter", "photographer", "animator", "illustrator",
  "producer", "marketer", "planner", "merchandiser", "controller", "actuary",
  "economist", "statistician", "chemist", "biologist", "attorney", "lawyer",
  "paralegal", "banker", "trader", "underwriter", "chairperson", "treasurer",
  "ambassador", "volunteer", "mentor",
  // Abbreviated titles
  "sde", "swe", "mts", "vp", "avp", "svp", "evp", "tpm", "apm",
];

export const ROLE_WORD_SET = new Set(ROLE_WORDS);

/** Any role word, in any case. */
export function hasRoleWord(text: string): boolean {
  return text
    .toLowerCase()
    .split(/[^a-z]+/)
    .some((w) => ROLE_WORD_SET.has(w));
}

/**
 * A role word written as a title — capitalised ("Product Manager"), not in
 * running prose ("worked with the product manager"). Bullets that mention a
 * role in passing must not open a new job.
 */
export function hasRoleTitle(text: string): boolean {
  return (text.match(/[A-Za-z]+/g) ?? []).some(
    (w) => /^[A-Z]/.test(w) && ROLE_WORD_SET.has(w.toLowerCase()),
  );
}

// Regions we accept as the second half of "City, Region" — countries, Indian
// states, US/Canada/UK/AU regions. Keeps "Designer, Acme Corp" from reading as
// a location while still catching "Bengaluru, Karnataka" or "Berlin, Germany".
export const KNOWN_REGIONS = new Set([
  // Countries frequently on resumes
  "india", "usa", "united states", "united states of america", "uk",
  "united kingdom", "canada", "australia", "germany", "france",
  "netherlands", "spain", "italy", "ireland", "singapore", "uae",
  "united arab emirates", "dubai", "japan", "china", "brazil", "mexico",
  "poland", "sweden", "norway", "denmark", "finland", "switzerland",
  "austria", "belgium", "portugal", "new zealand", "south africa",
  "nigeria", "kenya", "egypt", "israel", "saudi arabia", "qatar",
  "bangladesh", "pakistan", "sri lanka", "nepal", "philippines",
  "indonesia", "malaysia", "thailand", "vietnam", "south korea", "russia",
  // Indian states & UTs
  "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
  "delhi", "new delhi", "goa", "gujarat", "haryana", "himachal pradesh",
  "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra",
  "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab",
  "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura",
  "uttar pradesh", "uttarakhand", "west bengal", "chandigarh",
  "jammu and kashmir", "puducherry",
  // US states (full names)
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado",
  "connecticut", "delaware", "florida", "georgia", "hawaii", "idaho",
  "illinois", "indiana", "iowa", "kansas", "kentucky", "louisiana",
  "maine", "maryland", "massachusetts", "michigan", "minnesota",
  "mississippi", "missouri", "montana", "nebraska", "nevada",
  "new hampshire", "new jersey", "new mexico", "new york",
  "north carolina", "north dakota", "ohio", "oklahoma", "oregon",
  "pennsylvania", "rhode island", "south carolina", "south dakota",
  "tennessee", "texas", "utah", "vermont", "virginia", "washington",
  "west virginia", "wisconsin", "wyoming",
  // Canada / UK / AU
  "ontario", "quebec", "british columbia", "alberta", "manitoba",
  "saskatchewan", "nova scotia", "england", "scotland", "wales",
  "northern ireland", "new south wales", "victoria", "queensland",
  "western australia", "south australia", "tasmania",
]);

/**
 * Two-letter region codes valid after "City, " — US states, Canadian
 * provinces, Indian states. "Engineer, QA" or "Analyst, ML" are not places.
 */
export const REGION_CODES = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL",
  "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT",
  "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC", "PR",
  "AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "SK", "YT",
  "AP", "AS", "BR", "CG", "DL", "GJ", "HR", "HP", "JH", "JK", "KA", "KL", "MH",
  "MP", "MZ", "OD", "PB", "RJ", "TS", "TG", "UK", "UP", "WB", "CH", "PY",
]);

/**
 * Cities that turn up on résumés, matched only as a WHOLE field
 * ("Cred | Bengaluru | 2022 – Present"), never inside other text. Cities
 * whose names are also common words, first names or employers (Reading,
 * Mobile, Nice, Lincoln, Phoenix, Charlotte, Jackson…) are left out on purpose.
 */
export const KNOWN_CITIES = new Set(
  [
    // India
    "Bengaluru", "Bangalore", "Mumbai", "Bombay", "New Delhi", "Delhi", "Gurugram", "Gurgaon", "Noida",
    "Greater Noida", "Faridabad", "Ghaziabad", "Hyderabad", "Secunderabad", "Chennai", "Madras", "Kolkata",
    "Calcutta", "Pune", "Ahmedabad", "Gandhinagar", "Surat", "Vadodara", "Rajkot", "Jaipur", "Jodhpur",
    "Udaipur", "Kota", "Lucknow", "Kanpur", "Varanasi", "Prayagraj", "Allahabad", "Agra", "Meerut",
    "Indore", "Bhopal", "Gwalior", "Jabalpur", "Nagpur", "Nashik", "Aurangabad", "Thane", "Navi Mumbai",
    "Kochi", "Cochin", "Thiruvananthapuram", "Trivandrum", "Kozhikode", "Calicut", "Thrissur",
    "Coimbatore", "Madurai", "Tiruchirappalli", "Trichy", "Salem", "Vellore", "Mysuru", "Mysore",
    "Mangaluru", "Mangalore", "Hubballi", "Hubli", "Belagavi", "Manipal", "Visakhapatnam", "Vizag",
    "Vijayawada", "Guntur", "Tirupati", "Warangal", "Bhubaneswar", "Cuttack", "Rourkela", "Patna",
    "Ranchi", "Jamshedpur", "Dhanbad", "Guwahati", "Shillong", "Chandigarh", "Mohali", "Panchkula",
    "Ludhiana", "Amritsar", "Jalandhar", "Dehradun", "Roorkee", "Haridwar", "Shimla", "Srinagar", "Jammu",
    "Raipur", "Bhilai", "Goa", "Panaji", "Pondicherry", "Puducherry", "Kharagpur", "Durgapur", "Siliguri",
    "Bikaner", "Ajmer", "Pilani", "Kurukshetra", "Sonipat", "Rohtak", "Hisar",
    // North America
    "New York", "New York City", "NYC", "San Francisco", "San Jose", "Palo Alto", "Mountain View",
    "Sunnyvale", "Menlo Park", "Cupertino", "Santa Clara", "Redwood City", "Oakland", "Berkeley",
    "Los Angeles", "San Diego", "Irvine", "Sacramento", "Seattle", "Redmond", "Bellevue", "Portland",
    "Boston", "Cambridge", "Chicago", "Dallas", "Houston", "San Antonio", "Denver", "Boulder", "Atlanta",
    "Miami", "Tampa", "Philadelphia", "Pittsburgh", "Baltimore", "Detroit", "Ann Arbor", "Minneapolis",
    "Columbus", "Cleveland", "Cincinnati", "Nashville", "Raleigh", "Durham", "Salt Lake City", "Las Vegas",
    "Toronto", "Vancouver", "Montreal", "Ottawa", "Calgary", "Edmonton", "Waterloo", "Mexico City",
    // Europe
    "London", "Manchester", "Birmingham", "Edinburgh", "Glasgow", "Bristol", "Leeds", "Oxford", "Dublin",
    "Paris", "Lyon", "Berlin", "Munich", "München", "Hamburg", "Frankfurt", "Cologne", "Stuttgart",
    "Amsterdam", "Rotterdam", "Eindhoven", "Brussels", "Zurich", "Zürich", "Geneva", "Vienna", "Madrid",
    "Barcelona", "Lisbon", "Porto", "Milan", "Rome", "Stockholm", "Copenhagen", "Oslo", "Helsinki",
    "Warsaw", "Krakow", "Prague", "Budapest", "Bucharest", "Athens", "Tallinn",
    // Middle East, Asia, Africa, Oceania
    "Dubai", "Abu Dhabi", "Doha", "Riyadh", "Jeddah", "Tel Aviv", "Singapore", "Kuala Lumpur", "Jakarta",
    "Bangkok", "Manila", "Ho Chi Minh City", "Hanoi", "Hong Kong", "Shanghai", "Beijing", "Shenzhen",
    "Taipei", "Seoul", "Tokyo", "Osaka", "Dhaka", "Karachi", "Lahore", "Islamabad", "Colombo",
    "Kathmandu", "Nairobi", "Lagos", "Cairo", "Johannesburg", "Cape Town", "Sydney", "Melbourne",
    "Brisbane", "Perth", "Auckland", "Wellington",
  ].map((c) => c.toLowerCase()),
);

/** The whole field is a known city ("Bengaluru", "San Francisco"). */
export function isKnownCity(field: string): boolean {
  const f = field.trim();
  return /^\p{Lu}/u.test(f) && KNOWN_CITIES.has(f.toLowerCase());
}

/** "San Francisco, CA" / "Pune, Maharashtra" — a whole line that is a place. */
export function isLocationLine(line: string): boolean {
  // "Pune, Maharashtra" / "Austin, TX" / "Bengaluru, Karnataka, India".
  const parts = line.trim().split(/\s*,\s*/);
  if (parts.length < 2 || parts.length > 3) return false;
  if (!parts.every((p) => /^[\p{L}][\p{L}.'\- ]*$/u.test(p))) return false;
  return parts
    .slice(1)
    .some((region) => REGION_CODES.has(region) || KNOWN_REGIONS.has(region.toLowerCase()));
}

/** Words that mark a line as an organisation (employer) name. */
export const COMPANY_WORD =
  /\b(?:inc|llc|llp|ltd|limited|plc|pvt|corp|corporation|gmbh|technologies|technology|solutions|labs?|systems|softwares?|consulting|consultancy|group|studios?|media|networks?|industries|enterprises?|international|global|services|ventures|partners|bank|agency|digital|infotech|tech|foundation|associates)\b\.?/i;

/** Words that mark a line as an educational institution. */
export const INSTITUTION_RE =
  /\b(?:universit\p{L}*|universidad\p{L}*|college|institute|institution|school|academy|polytechnic|vidyalaya|vidyapeeth|vidyapith|mahavidyalaya|hochschule|conservatory|iit|nit|bits|iiit|iim|iisc|iiser|vit|srm|dtu|nsut)(?![\p{L}\p{N}])/iu;

/**
 * Verbs a résumé bullet starts with. A line opening with one of these is a
 * bullet even when the source (Word, plain text) lost its bullet marker.
 */
const ACTION_VERBS = [
  "accelerated", "achieved", "acquired", "administered", "advised", "advocated",
  "analyzed", "analysed", "architected", "assessed", "assisted", "audited",
  "authored", "automated", "boosted", "built", "captured", "championed",
  "coached", "collaborated", "completed", "conceived", "conceptualized",
  "conducted", "configured", "consolidated", "constructed", "consulted",
  "contributed", "converted", "coordinated", "created", "cultivated",
  "curated", "customized", "cut", "debugged", "decreased", "defined",
  "delivered", "deployed", "designed", "developed", "devised", "diagnosed",
  "directed", "documented", "doubled", "drafted", "drove", "earned", "edited",
  "eliminated", "enabled", "engineered", "enhanced", "established",
  "evaluated", "executed", "expanded", "expedited", "facilitated",
  "finalized", "forecasted", "formulated", "fostered", "founded", "generated",
  "grew", "guided", "halved", "handled", "headed", "helped", "identified",
  "implemented", "improved", "increased", "influenced", "initiated",
  "innovated", "installed", "instituted", "integrated", "introduced",
  "invented", "investigated", "launched", "led", "leveraged", "maintained",
  "managed", "marketed", "maximized", "mentored", "migrated", "minimized",
  "modernized", "modeled", "modelled", "monitored", "motivated", "negotiated",
  "onboarded", "operated", "optimized", "optimised", "orchestrated",
  "organized", "organised", "oversaw", "owned", "partnered", "performed",
  "piloted", "pioneered", "planned", "prepared", "presented", "prioritized",
  "produced", "programmed", "promoted", "proposed", "prototyped", "provided",
  "published", "raised", "ran", "rebuilt", "recruited", "redesigned",
  "reduced", "refactored", "refined", "reorganized", "replaced", "reported",
  "researched", "resolved", "restructured", "revamped", "reviewed",
  "revitalized", "saved", "scaled", "scheduled", "secured", "served",
  "shaped", "shipped", "simplified", "slashed", "solved", "spearheaded",
  "standardized", "steered", "streamlined", "strengthened", "structured",
  "supervised", "supported", "surpassed", "synthesized", "taught", "tested",
  "trained", "transformed", "translated", "tripled", "troubleshot", "tuned",
  "unified", "upgraded", "utilized", "validated", "won", "worked", "wrote",
  "re-architected", "co-authored", "co-founded", "co-led",
  // Present tense / gerunds, for current roles
  "build", "building", "develop", "developing", "design", "designing",
  "lead", "leading", "manage", "managing", "create", "creating", "implement",
  "implementing", "maintain", "maintaining", "drive", "driving", "own",
  "deliver", "delivering", "mentor", "mentoring", "collaborate",
  "collaborating", "partner", "work", "working", "write", "writing", "deploy",
  "analyze", "analyse", "analyzing", "optimize", "optimizing", "improve",
  "improving", "coordinate", "coordinating", "conduct", "conducting",
  "oversee", "overseeing", "handle", "handling", "prepare", "preparing",
  "ensure", "provide", "providing", "perform", "performing", "support",
  "supporting", "assist", "assisting", "spearhead", "spearheading",
];

const ACTION_VERB_SET = new Set(ACTION_VERBS);

/** True when the line opens with a résumé action verb ("Built…", "Leading…"). */
export function startsWithActionVerb(line: string): boolean {
  const first = line.match(/^[A-Za-z][A-Za-z'-]*/)?.[0];
  return !!first && ACTION_VERB_SET.has(first.toLowerCase());
}
