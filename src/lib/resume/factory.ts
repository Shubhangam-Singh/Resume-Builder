import type {
  CertificateEntry,
  EducationEntry,
  Profile,
  ProjectEntry,
  ResumeData,
  SkillEntry,
  WorkEntry,
} from "./types";

/** Stable-enough unique id, safe in browser and Node prerender. */
export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function emptyProfile(): Profile {
  return { id: uid(), network: "", username: "", url: "" };
}

export function emptyWork(): WorkEntry {
  return {
    id: uid(),
    name: "",
    position: "",
    location: "",
    url: "",
    startDate: "",
    endDate: "",
    summary: "",
    highlights: [],
  };
}

export function emptyEducation(): EducationEntry {
  return {
    id: uid(),
    institution: "",
    area: "",
    studyType: "",
    startDate: "",
    endDate: "",
    score: "",
    courses: [],
  };
}

export function emptyProject(): ProjectEntry {
  return {
    id: uid(),
    name: "",
    description: "",
    highlights: [],
    url: "",
    keywords: [],
  };
}

export function emptySkill(): SkillEntry {
  return { id: uid(), name: "", keywords: [] };
}

export function emptyCertificate(): CertificateEntry {
  return { id: uid(), name: "", issuer: "", date: "", url: "" };
}

/** A completely blank resume (used by "Start blank" / reset). */
export function emptyResume(): ResumeData {
  return {
    basics: {
      name: "",
      label: "",
      email: "",
      phone: "",
      url: "",
      location: { city: "", region: "", countryCode: "" },
      profiles: [],
      summary: "",
    },
    work: [],
    education: [],
    projects: [],
    skills: [],
    certificates: [],
    meta: { template: "ats-classic", lastModified: new Date().toISOString() },
  };
}

/**
 * A realistic sample so the live preview shows something useful on first load.
 * Users can wipe it with "Start blank".
 */
export function sampleResume(): ResumeData {
  return {
    basics: {
      name: "Alex Morgan",
      label: "Full-Stack Software Engineer",
      email: "alex.morgan@example.com",
      phone: "+1 (555) 123-4567",
      url: "https://alexmorgan.dev",
      location: { city: "Austin", region: "TX", countryCode: "US" },
      profiles: [
        {
          id: uid(),
          network: "GitHub",
          username: "alexmorgan",
          url: "https://github.com/alexmorgan",
        },
        {
          id: uid(),
          network: "LinkedIn",
          username: "alexmorgan",
          url: "https://linkedin.com/in/alexmorgan",
        },
      ],
      summary:
        "Full-stack engineer with 6+ years building reliable web applications. Comfortable across the stack — from React front-ends to Node and Postgres back-ends — with a focus on performance, accessibility, and clean, testable code.",
    },
    work: [
      {
        id: uid(),
        name: "Northwind Labs",
        position: "Senior Software Engineer",
        location: "Austin, TX",
        url: "",
        startDate: "2021-03",
        endDate: "",
        summary: "",
        highlights: [
          "Led migration of a legacy monolith to a modular service architecture, cutting median API latency by 38%.",
          "Mentored four engineers and introduced a code-review checklist that reduced production incidents by 25%.",
          "Shipped a TypeScript design-system used across five product teams.",
        ],
      },
      {
        id: uid(),
        name: "Brightwave",
        position: "Software Engineer",
        location: "Remote",
        url: "",
        startDate: "2018-06",
        endDate: "2021-02",
        summary: "",
        highlights: [
          "Built customer-facing dashboards in React used by 20k+ monthly active users.",
          "Designed and shipped a billing integration processing $2M+ in annual transactions.",
        ],
      },
    ],
    education: [
      {
        id: uid(),
        institution: "University of Texas at Austin",
        area: "Computer Science",
        studyType: "B.S.",
        startDate: "2014-08",
        endDate: "2018-05",
        score: "3.8 GPA",
        courses: [],
      },
    ],
    projects: [
      {
        id: uid(),
        name: "OpenMetrics",
        description:
          "An open-source, self-hostable analytics dashboard with a privacy-first design.",
        highlights: [
          "1.2k+ GitHub stars; adopted by several small businesses.",
        ],
        url: "https://github.com/alexmorgan/openmetrics",
        keywords: ["TypeScript", "Next.js", "ClickHouse"],
      },
    ],
    skills: [
      {
        id: uid(),
        name: "Languages",
        keywords: ["TypeScript", "JavaScript", "Python", "SQL", "Go"],
      },
      {
        id: uid(),
        name: "Frameworks",
        keywords: ["React", "Next.js", "Node.js", "Express", "FastAPI"],
      },
      {
        id: uid(),
        name: "Tools & Platforms",
        keywords: ["PostgreSQL", "Docker", "AWS", "Git", "Redis"],
      },
    ],
    certificates: [
      {
        id: uid(),
        name: "AWS Certified Solutions Architect – Associate",
        issuer: "Amazon Web Services",
        date: "2022-09",
        url: "",
      },
    ],
    meta: { template: "ats-classic", lastModified: new Date().toISOString() },
  };
}
