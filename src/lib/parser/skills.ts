/**
 * Skills — taxonomy ported from the reference C#. Boundary-aware matching keeps
 * short tokens safe ("go" won't fire in "google", ".net" won't fire in
 * "asp.net").
 *
 * IMPORTANT divergence from the C# extractor: for the *builder import* we must
 * PRESERVE EVERY skill the user wrote. The taxonomy is used only to normalize
 * casing/spelling and (later) to power suggestions — never to drop a skill that
 * isn't in the list. See `parseSkillsSection`.
 */
import { uid } from "@/lib/resume/factory";
import type { SkillEntry } from "@/lib/resume/types";

const RAW_TAXONOMY: { canonical: string; tokens: string[] }[] = [
  // Programming languages
  { canonical: "Python", tokens: ["python"] },
  { canonical: "Java", tokens: ["java"] },
  { canonical: "JavaScript", tokens: ["javascript", "js"] },
  { canonical: "TypeScript", tokens: ["typescript"] },
  { canonical: "C#", tokens: ["c#", "c sharp", "csharp"] },
  { canonical: "C++", tokens: ["c++", "cpp"] },
  { canonical: "C", tokens: ["c"] },
  { canonical: "Go", tokens: ["go", "golang"] },
  { canonical: "Ruby", tokens: ["ruby"] },
  { canonical: "PHP", tokens: ["php"] },
  { canonical: "Swift", tokens: ["swift"] },
  { canonical: "Kotlin", tokens: ["kotlin"] },
  { canonical: "Rust", tokens: ["rust"] },
  { canonical: "Scala", tokens: ["scala"] },
  { canonical: "R", tokens: ["r"] },
  { canonical: "MATLAB", tokens: ["matlab"] },
  { canonical: "Perl", tokens: ["perl"] },
  { canonical: "Objective-C", tokens: ["objective-c", "objective c"] },
  { canonical: "Dart", tokens: ["dart"] },
  { canonical: "Lua", tokens: ["lua"] },
  { canonical: "Haskell", tokens: ["haskell"] },
  { canonical: "Elixir", tokens: ["elixir"] },
  { canonical: "Clojure", tokens: ["clojure"] },
  { canonical: "Groovy", tokens: ["groovy"] },
  { canonical: "Visual Basic", tokens: ["visual basic", "vb.net", "vb"] },
  { canonical: "F#", tokens: ["f#"] },
  { canonical: "Assembly", tokens: ["assembly"] },
  { canonical: "Shell", tokens: ["shell"] },
  { canonical: "Bash", tokens: ["bash"] },
  { canonical: "PowerShell", tokens: ["powershell"] },

  // Web frontend
  { canonical: "HTML", tokens: ["html", "html5"] },
  { canonical: "CSS", tokens: ["css", "css3"] },
  { canonical: "Sass", tokens: ["sass"] },
  { canonical: "SCSS", tokens: ["scss"] },
  { canonical: "React", tokens: ["react", "react.js", "reactjs"] },
  { canonical: "Angular", tokens: ["angular", "angularjs"] },
  { canonical: "Vue", tokens: ["vue", "vue.js", "vuejs"] },
  { canonical: "Svelte", tokens: ["svelte"] },
  { canonical: "Next.js", tokens: ["next.js", "nextjs"] },
  { canonical: "Nuxt.js", tokens: ["nuxt.js", "nuxt", "nuxtjs"] },
  { canonical: "Gatsby", tokens: ["gatsby"] },
  { canonical: "Webpack", tokens: ["webpack"] },
  { canonical: "Vite", tokens: ["vite"] },
  { canonical: "Tailwind CSS", tokens: ["tailwind", "tailwindcss"] },
  { canonical: "Bootstrap", tokens: ["bootstrap"] },
  { canonical: "Material UI", tokens: ["material ui", "material-ui", "mui"] },
  { canonical: "Chakra UI", tokens: ["chakra ui", "chakra-ui"] },
  { canonical: "Ant Design", tokens: ["ant design", "antd"] },
  { canonical: "jQuery", tokens: ["jquery"] },
  { canonical: "Redux", tokens: ["redux"] },
  { canonical: "MobX", tokens: ["mobx"] },
  { canonical: "Zustand", tokens: ["zustand"] },
  { canonical: "Pinia", tokens: ["pinia"] },
  { canonical: "Three.js", tokens: ["three.js", "threejs"] },
  { canonical: "D3.js", tokens: ["d3.js", "d3js"] },

  // Backend frameworks
  { canonical: "Node.js", tokens: ["node.js", "nodejs", "node js"] },
  { canonical: "Express", tokens: ["express", "express.js", "expressjs"] },
  { canonical: "NestJS", tokens: ["nestjs", "nest.js"] },
  { canonical: "Fastify", tokens: ["fastify"] },
  { canonical: "Django", tokens: ["django"] },
  { canonical: "Flask", tokens: ["flask"] },
  { canonical: "FastAPI", tokens: ["fastapi"] },
  { canonical: "Spring", tokens: ["spring"] },
  { canonical: "Spring Boot", tokens: ["spring boot", "springboot"] },
  { canonical: "ASP.NET", tokens: ["asp.net", "aspnet", "asp.net core", "asp.net mvc"] },
  { canonical: ".NET", tokens: [".net", "dotnet", ".net core"] },
  { canonical: "Ruby on Rails", tokens: ["ruby on rails", "rails"] },
  { canonical: "Laravel", tokens: ["laravel"] },
  { canonical: "Symfony", tokens: ["symfony"] },
  { canonical: "Actix", tokens: ["actix"] },

  // Mobile
  { canonical: "Android", tokens: ["android"] },
  { canonical: "iOS", tokens: ["ios"] },
  { canonical: "Flutter", tokens: ["flutter"] },
  { canonical: "React Native", tokens: ["react native"] },
  { canonical: "Xamarin", tokens: ["xamarin"] },
  { canonical: ".NET MAUI", tokens: ["maui", ".net maui"] },
  { canonical: "SwiftUI", tokens: ["swiftui"] },
  { canonical: "Jetpack Compose", tokens: ["jetpack compose"] },
  { canonical: "Ionic", tokens: ["ionic"] },
  { canonical: "Cordova", tokens: ["cordova"] },

  // Databases
  { canonical: "SQL", tokens: ["sql"] },
  { canonical: "MySQL", tokens: ["mysql"] },
  { canonical: "PostgreSQL", tokens: ["postgresql", "postgres", "psql"] },
  { canonical: "MongoDB", tokens: ["mongodb", "mongo"] },
  { canonical: "Redis", tokens: ["redis"] },
  { canonical: "SQLite", tokens: ["sqlite"] },
  { canonical: "Oracle", tokens: ["oracle"] },
  { canonical: "SQL Server", tokens: ["sql server", "mssql", "ms sql"] },
  { canonical: "DynamoDB", tokens: ["dynamodb"] },
  { canonical: "Cassandra", tokens: ["cassandra"] },
  { canonical: "Couchbase", tokens: ["couchbase"] },
  { canonical: "Neo4j", tokens: ["neo4j"] },
  { canonical: "Elasticsearch", tokens: ["elasticsearch", "elastic search"] },
  { canonical: "MariaDB", tokens: ["mariadb"] },
  { canonical: "CockroachDB", tokens: ["cockroachdb"] },
  { canonical: "Supabase", tokens: ["supabase"] },
  { canonical: "Firebase", tokens: ["firebase"] },
  { canonical: "Firestore", tokens: ["firestore"] },
  { canonical: "Cosmos DB", tokens: ["cosmosdb", "cosmos db"] },

  // Cloud & DevOps
  { canonical: "AWS", tokens: ["aws", "amazon web services"] },
  { canonical: "Azure", tokens: ["azure"] },
  { canonical: "GCP", tokens: ["gcp", "google cloud", "google cloud platform"] },
  { canonical: "Heroku", tokens: ["heroku"] },
  { canonical: "Vercel", tokens: ["vercel"] },
  { canonical: "Netlify", tokens: ["netlify"] },
  { canonical: "DigitalOcean", tokens: ["digitalocean", "digital ocean"] },
  { canonical: "Cloudflare", tokens: ["cloudflare"] },
  { canonical: "Docker", tokens: ["docker"] },
  { canonical: "Kubernetes", tokens: ["kubernetes", "k8s"] },
  { canonical: "Terraform", tokens: ["terraform"] },
  { canonical: "Ansible", tokens: ["ansible"] },
  { canonical: "Puppet", tokens: ["puppet"] },
  { canonical: "Chef", tokens: ["chef"] },
  { canonical: "Vagrant", tokens: ["vagrant"] },
  { canonical: "Jenkins", tokens: ["jenkins"] },
  { canonical: "GitHub Actions", tokens: ["github actions"] },
  { canonical: "GitLab CI", tokens: ["gitlab ci", "gitlab-ci"] },
  { canonical: "CircleCI", tokens: ["circleci", "circle ci"] },
  { canonical: "Travis CI", tokens: ["travis ci", "travis-ci"] },
  { canonical: "CI/CD", tokens: ["ci/cd", "cicd"] },
  { canonical: "Nginx", tokens: ["nginx"] },
  { canonical: "Apache", tokens: ["apache"] },
  { canonical: "Linux", tokens: ["linux"] },
  { canonical: "Unix", tokens: ["unix"] },

  // Data & ML/AI
  { canonical: "Machine Learning", tokens: ["machine learning", "ml"] },
  { canonical: "Deep Learning", tokens: ["deep learning"] },
  { canonical: "NLP", tokens: ["nlp", "natural language processing"] },
  { canonical: "Computer Vision", tokens: ["computer vision"] },
  { canonical: "TensorFlow", tokens: ["tensorflow"] },
  { canonical: "PyTorch", tokens: ["pytorch"] },
  { canonical: "Keras", tokens: ["keras"] },
  { canonical: "scikit-learn", tokens: ["scikit-learn", "sklearn", "scikit learn"] },
  { canonical: "Pandas", tokens: ["pandas"] },
  { canonical: "NumPy", tokens: ["numpy"] },
  { canonical: "SciPy", tokens: ["scipy"] },
  { canonical: "Matplotlib", tokens: ["matplotlib"] },
  { canonical: "Seaborn", tokens: ["seaborn"] },
  { canonical: "Jupyter", tokens: ["jupyter"] },
  { canonical: "OpenCV", tokens: ["opencv"] },
  { canonical: "spaCy", tokens: ["spacy"] },
  { canonical: "Hugging Face", tokens: ["hugging face", "huggingface"] },
  { canonical: "Transformers", tokens: ["transformers"] },
  { canonical: "LLM", tokens: ["llm", "large language model"] },
  { canonical: "Data Science", tokens: ["data science"] },
  { canonical: "Data Engineering", tokens: ["data engineering"] },
  { canonical: "Data Analysis", tokens: ["data analysis", "data analytics"] },
  { canonical: "Power BI", tokens: ["power bi", "powerbi"] },
  { canonical: "Tableau", tokens: ["tableau"] },
  { canonical: "Looker", tokens: ["looker"] },
  { canonical: "Spark", tokens: ["spark", "apache spark"] },
  { canonical: "Hadoop", tokens: ["hadoop"] },
  { canonical: "Airflow", tokens: ["airflow"] },
  { canonical: "Kafka", tokens: ["kafka"] },
  { canonical: "Flink", tokens: ["flink"] },
  { canonical: "Databricks", tokens: ["databricks"] },
  { canonical: "Snowflake", tokens: ["snowflake"] },
  { canonical: "dbt", tokens: ["dbt"] },
  { canonical: "ETL", tokens: ["etl"] },

  // Tools & others
  { canonical: "Git", tokens: ["git"] },
  { canonical: "GitHub", tokens: ["github"] },
  { canonical: "GitLab", tokens: ["gitlab"] },
  { canonical: "Bitbucket", tokens: ["bitbucket"] },
  { canonical: "Jira", tokens: ["jira"] },
  { canonical: "Confluence", tokens: ["confluence"] },
  { canonical: "Slack", tokens: ["slack"] },
  { canonical: "Figma", tokens: ["figma"] },
  { canonical: "Sketch", tokens: ["sketch"] },
  { canonical: "Adobe XD", tokens: ["adobe xd"] },
  { canonical: "Photoshop", tokens: ["photoshop"] },
  { canonical: "Illustrator", tokens: ["illustrator"] },
  { canonical: "Postman", tokens: ["postman"] },
  { canonical: "Swagger", tokens: ["swagger"] },
  { canonical: "GraphQL", tokens: ["graphql"] },
  { canonical: "REST API", tokens: ["rest api", "restful", "restful api"] },
  { canonical: "gRPC", tokens: ["grpc"] },
  { canonical: "WebSocket", tokens: ["websocket", "websockets"] },
  { canonical: "RabbitMQ", tokens: ["rabbitmq"] },
  { canonical: "Celery", tokens: ["celery"] },
  { canonical: "Microservices", tokens: ["microservices", "microservice"] },
  { canonical: "API", tokens: ["api"] },
  { canonical: "OAuth", tokens: ["oauth", "oauth2"] },
  { canonical: "JWT", tokens: ["jwt"] },
  { canonical: "Selenium", tokens: ["selenium"] },
  { canonical: "Cypress", tokens: ["cypress"] },
  { canonical: "Jest", tokens: ["jest"] },
  { canonical: "Mocha", tokens: ["mocha"] },
  { canonical: "pytest", tokens: ["pytest"] },
  { canonical: "JUnit", tokens: ["junit"] },
  { canonical: "Agile", tokens: ["agile"] },
  { canonical: "Scrum", tokens: ["scrum"] },
  { canonical: "Kanban", tokens: ["kanban"] },
  { canonical: "DevOps", tokens: ["devops"] },
  { canonical: "SRE", tokens: ["sre"] },

  // Blockchain & emerging
  { canonical: "Blockchain", tokens: ["blockchain"] },
  { canonical: "Solidity", tokens: ["solidity"] },
  { canonical: "Web3", tokens: ["web3"] },
  { canonical: "Ethereum", tokens: ["ethereum"] },
  { canonical: "Smart Contracts", tokens: ["smart contracts", "smart contract"] },
  { canonical: "NFT", tokens: ["nft"] },
  { canonical: "DeFi", tokens: ["defi"] },
  { canonical: "IPFS", tokens: ["ipfs"] },
  { canonical: "Hardhat", tokens: ["hardhat"] },
  { canonical: "Truffle", tokens: ["truffle"] },

  // CRM / ERP / business
  { canonical: "Salesforce", tokens: ["salesforce"] },
  { canonical: "SAP", tokens: ["sap"] },
  { canonical: "ServiceNow", tokens: ["servicenow"] },
  { canonical: "Dynamics 365", tokens: ["dynamics 365", "dynamics365"] },
  { canonical: "HubSpot", tokens: ["hubspot"] },
  { canonical: "Zoho", tokens: ["zoho"] },
  { canonical: "Odoo", tokens: ["odoo"] },
  { canonical: "SharePoint", tokens: ["sharepoint"] },
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Boundary-aware matcher per token (mirrors the C# character class so "c#",
// "c++", "node.js" still match when space/punctuation-bounded).
const TAXONOMY = RAW_TAXONOMY.map((e) => ({
  canonical: e.canonical,
  matchers: e.tokens.map(
    (t) =>
      new RegExp(
        `(?<![a-z0-9#+.])(?:${escapeRegExp(t)})(?![a-z0-9#+])`,
        "i",
      ),
  ),
}));

// token (lowercased) -> canonical, for light normalization of user-written skills.
const TOKEN_TO_CANONICAL = new Map<string, string>();
for (const { canonical, tokens } of RAW_TAXONOMY) {
  for (const t of tokens) {
    if (!TOKEN_TO_CANONICAL.has(t)) TOKEN_TO_CANONICAL.set(t, canonical);
  }
  // The canonical itself should normalize to itself.
  if (!TOKEN_TO_CANONICAL.has(canonical.toLowerCase())) {
    TOKEN_TO_CANONICAL.set(canonical.toLowerCase(), canonical);
  }
}

/** Canonical skills found anywhere in `text` (boundary-aware). For ATS/suggestions. */
export function matchKnownSkills(text: string): string[] {
  const found: string[] = [];
  for (const { canonical, matchers } of TAXONOMY) {
    if (matchers.some((rx) => rx.test(text))) found.push(canonical);
  }
  return found;
}

/** Normalize a user-written skill to its canonical form, or keep it as-is. */
export function normalizeSkillToken(token: string): string {
  const trimmed = token.trim();
  return TOKEN_TO_CANONICAL.get(trimmed.toLowerCase()) ?? trimmed;
}

/**
 * A skill as the user wrote it — "React.js", "ASP.NET Core" and "pandas" stay
 * exactly so. Only an all-lowercase spelling of a name with inner capitals
 * gets them back ("javascript" → "JavaScript", "mysql" → "MySQL"); a plain
 * lowercase word is left alone. Use `normalizeSkillToken` to compare skills.
 */
export function tidySkill(token: string): string {
  const trimmed = token.trim();
  if (trimmed !== trimmed.toLowerCase()) return trimmed;
  const canonical = TOKEN_TO_CANONICAL.get(trimmed);
  if (!canonical || canonical.toLowerCase() !== trimmed) return trimmed;
  return /\p{Lu}/u.test(canonical.slice(1)) ? canonical : trimmed;
}

/** Split on separators that sit outside brackets: "AWS (EC2, S3), Docker". */
export function splitOutsideBrackets(s: string, separators: RegExp): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(" || ch === "[") depth++;
    else if ((ch === ")" || ch === "]") && depth > 0) depth--;
    if (depth === 0 && separators.test(ch)) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

/** True when the whole phrase is a skill in the taxonomy ("Machine Learning"). */
export function isKnownSkill(phrase: string): boolean {
  return TOKEN_TO_CANONICAL.has(phrase.trim().toLowerCase());
}

/**
 * Split a line into "Category: values" segments. Handles explicit separators
 * ("Languages: Go | Tools: Docker") and chip layouts that repeat a category
 * label without one ("Languages: Go Languages: Rust"), using the category
 * labels that open lines elsewhere in the section.
 */
function splitCategorySegments(line: string, labels: string[]): string[] {
  let parts = line.split(/\s+\|\s+/);
  if (labels.length) {
    const re = new RegExp(`\\s+(?=(?:${labels.map(escapeRegExp).join("|")}):\\s)`);
    parts = parts.flatMap((p) => p.split(re));
  }
  return parts.map((p) => p.trim()).filter(Boolean);
}

/**
 * Parse the raw Skills section into categories — PRESERVING EVERY skill the user
 * wrote. "Languages: Python, Java" becomes a category; bare comma lists become
 * an uncategorized group. Tokens are normalized for casing but never dropped.
 */
/**
 * Sidebar layouts print the category on its own line above its list:
 * "Research" / "User interviews, Usability testing". Join each such label to
 * its list (and to a list that wraps after a trailing comma).
 */
function joinCategoryLabels(lines: string[]): string[] {
  const labelShaped = (l: string) =>
    !/[,:|•·;]/.test(l) && l.split(/\s+/).length <= 4 && /^\p{Lu}/u.test(l) && !isKnownSkill(l);
  // A label is a label only when a list follows it.
  const isLabelAt = (j: number) => !!lines[j] && labelShaped(lines[j]) && !!lines[j + 1]?.includes(",");
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    if (isLabelAt(i)) {
      line = `${line}: ${lines[++i]}`;
      // The list may wrap in a narrow sidebar, even mid-item ("Hugging" /
      // "Face, MLflow"); it runs until the next label or "Category:" line.
      while (lines[i + 1] && !isLabelAt(i + 1) && !lines[i + 1].includes(":")) {
        const nextLine = lines[++i];
        // "AWS Sage-" / "Maker": a capitalised product name split by hyphenation.
        line = /[a-z]-$/.test(line) && /^\p{Lu}/u.test(nextLine)
          ? `${line.slice(0, -1)}${nextLine}`
          : `${line} ${nextLine}`;
      }
    }
    out.push(line);
  }
  return out;
}

export function parseSkillsSection(sectionText: string): SkillEntry[] {
  const lines = joinCategoryLabels(
    sectionText
      .split("\n")
      .map((l) => l.replace(/^[•\-*+>]+\s*/, "").trim())
      .filter((l) => l.length > 0),
  );

  const entries: SkillEntry[] = [];
  const general: string[] = [];

  const splitTokens = (s: string) =>
    // " / " with spaces separates items; "CI/CD", "TCP/IP" stay intact, and
    // so do lists inside brackets: "AWS (EC2, S3)".
    splitOutsideBrackets(s.replace(/\s\/\s/g, ","), /[,;|•·]/)
      .map((t) => t.trim().replace(/\.$/, ""))
      .filter((t) => t.length > 0 && t.length <= 60)
      .map(tidySkill);

  // Duplicates are judged by canonical name: "React" and "React.js" are one.
  const dedupe = (arr: string[]) => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const v of arr) {
      const k = normalizeSkillToken(v).toLowerCase();
      if (!seen.has(k)) {
        seen.add(k);
        out.push(v);
      }
    }
    return out;
  };

  // Category labels that open a line ("Languages:", "Tools & Platforms:").
  const labels = [
    ...new Set(
      lines
        .map((l) => l.match(/^([^:,|]{1,40}):\s/)?.[1].trim())
        .filter((l): l is string => !!l),
    ),
  ];

  const byName = new Map<string, SkillEntry>();
  for (const line of lines) {
    for (const segment of splitCategorySegments(line, labels)) {
      const colon = segment.indexOf(":");
      // "Category: a, b, c" — label must be short and comma-free.
      if (colon > 0 && colon <= 40 && !segment.slice(0, colon).includes(",")) {
        const name = segment.slice(0, colon).trim();
        const keywords = splitTokens(segment.slice(colon + 1));
        if (keywords.length > 0) {
          const existing = byName.get(name.toLowerCase());
          if (existing) existing.keywords = dedupe([...existing.keywords, ...keywords]);
          else {
            const entry = { id: uid(), name, keywords: dedupe(keywords) };
            byName.set(name.toLowerCase(), entry);
            entries.push(entry);
          }
          continue;
        }
      }
      // Otherwise accumulate as uncategorized keywords.
      general.push(...splitTokens(segment));
    }
  }

  if (general.length > 0) {
    entries.push({ id: uid(), name: "Skills", keywords: dedupe(general) });
  }

  return entries;
}
