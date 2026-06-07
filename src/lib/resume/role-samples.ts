import { uid } from "./factory";
import type { ResumeData } from "./types";

export interface RoleSample {
  id: string;
  role: string;
  description: string;
  emoji: string;
  data: () => ResumeData;
}

function base(): ResumeData["meta"] {
  return {
    template: "ats-classic",
    lastModified: new Date().toISOString(),
    hiddenSections: [],
  };
}

function softwareEngineer(): ResumeData {
  return {
    basics: {
      name: "Jordan Chen",
      label: "Full-Stack Software Engineer",
      email: "jordan.chen@example.com",
      phone: "+1 (415) 555-0192",
      url: "https://jordanchen.dev",
      location: { city: "Seattle", region: "WA", countryCode: "US" },
      profiles: [
        { id: uid(), network: "GitHub", username: "jordanchen", url: "https://github.com/jordanchen" },
        { id: uid(), network: "LinkedIn", username: "jordanchen", url: "https://linkedin.com/in/jordanchen" },
      ],
      summary:
        "Full-stack engineer with 5+ years shipping production software in TypeScript and Python. Passionate about developer experience, clean APIs, and building systems that scale without surprises.",
      image: "",
    },
    work: [
      {
        id: uid(), name: "Verdigris Systems", position: "Senior Software Engineer",
        location: "Seattle, WA", url: "", startDate: "2021-07", endDate: "",
        summary: "",
        highlights: [
          "Re-architected the data-ingestion pipeline, reducing P99 latency from 4.2s to 310ms for 50M+ daily events.",
          "Designed and shipped a public REST + GraphQL API now used by 120+ enterprise customers.",
          "Grew the platform team from 3 to 8 engineers; established RFC-driven design reviews and SLO dashboards.",
        ],
      },
      {
        id: uid(), name: "Cascade Digital", position: "Software Engineer",
        location: "Remote", url: "", startDate: "2018-09", endDate: "2021-06",
        summary: "",
        highlights: [
          "Built a real-time collaboration feature (OT-based) used by 30k+ active users.",
          "Cut CI build times by 60% by parallelising test suites and caching Docker layers.",
        ],
      },
    ],
    education: [
      {
        id: uid(), institution: "University of Washington",
        area: "Computer Science", studyType: "B.S.",
        startDate: "2014-09", endDate: "2018-06", score: "3.7 GPA", courses: [],
      },
    ],
    projects: [
      {
        id: uid(), name: "Patchwork",
        description: "Open-source schema migration tool for multi-tenant Postgres databases.",
        highlights: ["2.4k GitHub stars; used by 80+ companies in production."],
        url: "https://github.com/jordanchen/patchwork",
        keywords: ["Go", "PostgreSQL", "CLI"],
      },
    ],
    skills: [
      { id: uid(), name: "Languages", keywords: ["TypeScript", "Python", "Go", "SQL", "Rust"] },
      { id: uid(), name: "Frameworks", keywords: ["React", "Next.js", "FastAPI", "Node.js", "GraphQL"] },
      { id: uid(), name: "Infrastructure", keywords: ["AWS", "Docker", "Kubernetes", "Terraform", "Redis"] },
    ],
    certificates: [
      { id: uid(), name: "AWS Solutions Architect – Professional", issuer: "Amazon Web Services", date: "2023-04", url: "" },
    ],
    customSections: [],
    meta: base(),
  };
}

function uxDesigner(): ResumeData {
  return {
    basics: {
      name: "Maya Patel",
      label: "Senior UX / Product Designer",
      email: "maya.patel@example.com",
      phone: "+1 (628) 555-0147",
      url: "https://mayapatel.design",
      location: { city: "San Francisco", region: "CA", countryCode: "US" },
      profiles: [
        { id: uid(), network: "Dribbble", username: "mayapatel", url: "https://dribbble.com/mayapatel" },
        { id: uid(), network: "LinkedIn", username: "maya-patel", url: "https://linkedin.com/in/maya-patel" },
      ],
      summary:
        "Product designer with 7 years turning complex user problems into elegant, accessible interfaces. Led end-to-end design for products used by millions; equally comfortable running discovery research and shipping polished Figma specs.",
      image: "",
    },
    work: [
      {
        id: uid(), name: "Lumen Health", position: "Senior Product Designer",
        location: "San Francisco, CA", url: "", startDate: "2020-03", endDate: "",
        summary: "",
        highlights: [
          "Redesigned the patient onboarding flow, lifting completion rate from 54% to 83% (A/B tested).",
          "Established a component library in Figma adopted across 4 product squads; halved design-to-dev handoff time.",
          "Ran 60+ user interviews and usability sessions to inform a ground-up redesign of the core product dashboard.",
        ],
      },
      {
        id: uid(), name: "Harbour Studio", position: "UX Designer",
        location: "Remote", url: "", startDate: "2017-06", endDate: "2020-02",
        summary: "",
        highlights: [
          "Designed mobile and web experiences for clients including a Fortune 500 retailer and two Series-B startups.",
          "Introduced accessibility audits to the design process, achieving WCAG 2.1 AA compliance on all delivered projects.",
        ],
      },
    ],
    education: [
      {
        id: uid(), institution: "RISD – Rhode Island School of Design",
        area: "Graphic Design", studyType: "B.F.A.",
        startDate: "2013-09", endDate: "2017-05", score: "", courses: [],
      },
    ],
    projects: [],
    skills: [
      { id: uid(), name: "Design tools", keywords: ["Figma", "Adobe XD", "Sketch", "Framer", "Principle"] },
      { id: uid(), name: "Research", keywords: ["User interviews", "Usability testing", "A/B testing", "Survey design", "Analytics"] },
      { id: uid(), name: "Other", keywords: ["Design systems", "WCAG 2.1", "HTML/CSS", "Prototyping", "Workshop facilitation"] },
    ],
    certificates: [
      { id: uid(), name: "Nielsen Norman Group UX Certification", issuer: "Nielsen Norman Group", date: "2021-10", url: "" },
    ],
    customSections: [],
    meta: base(),
  };
}

function marketingManager(): ResumeData {
  return {
    basics: {
      name: "Sam Rivera",
      label: "Digital Marketing Manager",
      email: "sam.rivera@example.com",
      phone: "+1 (312) 555-0263",
      url: "",
      location: { city: "Chicago", region: "IL", countryCode: "US" },
      profiles: [
        { id: uid(), network: "LinkedIn", username: "samrivera-mktg", url: "https://linkedin.com/in/samrivera-mktg" },
      ],
      summary:
        "Data-driven marketing manager with 6 years driving demand generation, SEO growth, and brand campaigns for B2B SaaS companies. Track record of growing organic traffic 3–5× and delivering measurable pipeline at efficient CAC.",
      image: "",
    },
    work: [
      {
        id: uid(), name: "Stackfire (SaaS)", position: "Digital Marketing Manager",
        location: "Chicago, IL", url: "", startDate: "2020-01", endDate: "",
        summary: "",
        highlights: [
          "Grew organic search traffic from 18k to 97k monthly sessions in 24 months through content strategy and technical SEO.",
          "Launched a demand-gen program that generated $4.2M in influenced pipeline in FY2023.",
          "Managed a $1.2M annual paid media budget across Google, LinkedIn, and programmatic channels, achieving a 3.1× ROAS.",
        ],
      },
      {
        id: uid(), name: "Brightspark Agency", position: "Marketing Specialist",
        location: "Chicago, IL", url: "", startDate: "2017-05", endDate: "2019-12",
        summary: "",
        highlights: [
          "Wrote and optimised 200+ blog posts for B2B clients; average article ranks in the top 5 for its target keyword.",
          "Built email nurture sequences for 3 clients, raising average open rates from 18% to 31%.",
        ],
      },
    ],
    education: [
      {
        id: uid(), institution: "DePaul University",
        area: "Marketing & Communications", studyType: "B.S.",
        startDate: "2013-09", endDate: "2017-05", score: "", courses: [],
      },
    ],
    projects: [],
    skills: [
      { id: uid(), name: "Channels", keywords: ["SEO", "SEM", "Content marketing", "Email", "LinkedIn Ads", "Webinars"] },
      { id: uid(), name: "Tools", keywords: ["HubSpot", "Google Analytics 4", "Semrush", "Salesforce", "Looker"] },
      { id: uid(), name: "Competencies", keywords: ["Demand generation", "Brand strategy", "A/B testing", "Copywriting", "SQL (basic)"] },
    ],
    certificates: [
      { id: uid(), name: "Google Analytics Certified", issuer: "Google", date: "2023-01", url: "" },
      { id: uid(), name: "HubSpot Inbound Certification", issuer: "HubSpot Academy", date: "2022-06", url: "" },
    ],
    customSections: [],
    meta: base(),
  };
}

function dataScientist(): ResumeData {
  return {
    basics: {
      name: "Priya Sharma",
      label: "Data Scientist & ML Engineer",
      email: "priya.sharma@example.com",
      phone: "+1 (617) 555-0384",
      url: "https://priyas.io",
      location: { city: "Boston", region: "MA", countryCode: "US" },
      profiles: [
        { id: uid(), network: "GitHub", username: "priyas-ml", url: "https://github.com/priyas-ml" },
        { id: uid(), network: "LinkedIn", username: "priya-sharma-ds", url: "https://linkedin.com/in/priya-sharma-ds" },
      ],
      summary:
        "Data scientist and ML engineer with 5+ years building and deploying machine-learning models in production. Experienced across the full ML lifecycle — from exploratory analysis to real-time inference systems serving millions of predictions per day.",
      image: "",
    },
    work: [
      {
        id: uid(), name: "Nexora AI", position: "Senior Data Scientist",
        location: "Boston, MA", url: "", startDate: "2021-04", endDate: "",
        summary: "",
        highlights: [
          "Built a real-time churn-prediction model (XGBoost + SHAP) that reduced monthly churn by 18%, saving $3.4M ARR.",
          "Designed an MLOps pipeline on AWS SageMaker reducing model deployment time from 2 weeks to 4 hours.",
          "Led a team of 3 data scientists; introduced experiment tracking with MLflow and code-review standards for notebooks.",
        ],
      },
      {
        id: uid(), name: "Meridian Analytics", position: "Data Scientist",
        location: "Remote", url: "", startDate: "2018-07", endDate: "2021-03",
        summary: "",
        highlights: [
          "Built NLP classifiers (BERT fine-tuned) achieving 91% accuracy on a customer-support ticket routing task.",
          "Reduced data-warehouse query costs by 35% by rewriting long-running Spark jobs with partition pruning.",
        ],
      },
    ],
    education: [
      {
        id: uid(), institution: "MIT",
        area: "Electrical Engineering & Computer Science", studyType: "M.Eng.",
        startDate: "2016-09", endDate: "2018-06", score: "", courses: [],
      },
      {
        id: uid(), institution: "IIT Bombay",
        area: "Computer Science", studyType: "B.Tech.",
        startDate: "2012-08", endDate: "2016-05", score: "9.1/10 GPA", courses: [],
      },
    ],
    projects: [
      {
        id: uid(), name: "TimeSeries Bench",
        description: "Open-source benchmark suite comparing 12 forecasting algorithms on 40 real-world datasets.",
        highlights: ["Featured in the NeurIPS 2023 workshop on time-series forecasting."],
        url: "https://github.com/priyas-ml/tsbench",
        keywords: ["Python", "PyTorch", "statsmodels"],
      },
    ],
    skills: [
      { id: uid(), name: "Languages", keywords: ["Python", "R", "SQL", "Scala"] },
      { id: uid(), name: "ML / AI", keywords: ["PyTorch", "scikit-learn", "XGBoost", "Hugging Face", "MLflow", "LangChain"] },
      { id: uid(), name: "Data & Cloud", keywords: ["Apache Spark", "dbt", "Snowflake", "AWS SageMaker", "Airflow"] },
    ],
    certificates: [
      { id: uid(), name: "AWS Certified Machine Learning – Specialty", issuer: "Amazon Web Services", date: "2022-11", url: "" },
    ],
    customSections: [],
    meta: base(),
  };
}

function productManager(): ResumeData {
  return {
    basics: {
      name: "Alex Kim",
      label: "Senior Product Manager",
      email: "alex.kim@example.com",
      phone: "+1 (347) 555-0519",
      url: "",
      location: { city: "New York", region: "NY", countryCode: "US" },
      profiles: [
        { id: uid(), network: "LinkedIn", username: "alexkim-pm", url: "https://linkedin.com/in/alexkim-pm" },
      ],
      summary:
        "Product manager with 7 years driving 0-to-1 launches and growth-phase scale for B2B and B2C products. Fluent in data (SQL, Amplitude), comfortable reviewing PRDs and API contracts, and skilled at aligning cross-functional teams toward a clear north-star.",
      image: "",
    },
    work: [
      {
        id: uid(), name: "Orbit Commerce", position: "Senior Product Manager",
        location: "New York, NY", url: "", startDate: "2020-06", endDate: "",
        summary: "",
        highlights: [
          "Owned the checkout experience (40M+ annual transactions); launched one-click reorder, lifting repeat purchase rate 22%.",
          "Defined the 3-year merchant tooling roadmap and secured $8M in engineering investment across two planning cycles.",
          "Reduced checkout abandonment by 14% by running 30+ A/B tests and redesigning the address-validation flow.",
        ],
      },
      {
        id: uid(), name: "Kaleidoscope (startup)", position: "Product Manager",
        location: "Remote", url: "", startDate: "2017-02", endDate: "2020-05",
        summary: "",
        highlights: [
          "Led 0-to-1 launch of a B2B SaaS scheduling product that grew to 8,000 paying accounts in 18 months.",
          "Partnered with design and engineering to ship weekly; maintained a prioritised backlog of 300+ items with clear scoring.",
        ],
      },
    ],
    education: [
      {
        id: uid(), institution: "Columbia Business School",
        area: "MBA", studyType: "MBA",
        startDate: "2015-09", endDate: "2017-05", score: "", courses: [],
      },
      {
        id: uid(), institution: "NYU Stern",
        area: "Finance & Information Systems", studyType: "B.S.",
        startDate: "2011-09", endDate: "2015-05", score: "", courses: [],
      },
    ],
    projects: [],
    skills: [
      { id: uid(), name: "Product", keywords: ["Roadmapping", "OKRs", "A/B testing", "User research", "PRD writing", "Go-to-market"] },
      { id: uid(), name: "Tools", keywords: ["Jira", "Confluence", "Figma", "Amplitude", "Mixpanel", "Looker"] },
      { id: uid(), name: "Technical", keywords: ["SQL", "REST APIs", "Agile / Scrum", "Data analysis", "Competitive analysis"] },
    ],
    certificates: [
      { id: uid(), name: "Certified Scrum Product Owner (CSPO)", issuer: "Scrum Alliance", date: "2021-03", url: "" },
    ],
    customSections: [],
    meta: base(),
  };
}

export const ROLE_SAMPLES: RoleSample[] = [
  {
    id: "software-engineer",
    role: "Software Engineer",
    description: "Full-stack / backend engineer with TypeScript, Python & cloud infrastructure.",
    emoji: "💻",
    data: softwareEngineer,
  },
  {
    id: "ux-designer",
    role: "UX / Product Designer",
    description: "User research, Figma design systems, and accessibility-first UI.",
    emoji: "🎨",
    data: uxDesigner,
  },
  {
    id: "marketing-manager",
    role: "Marketing Manager",
    description: "Demand generation, SEO growth, and data-driven paid campaigns.",
    emoji: "📣",
    data: marketingManager,
  },
  {
    id: "data-scientist",
    role: "Data Scientist",
    description: "ML models, MLOps pipelines, and large-scale data analysis.",
    emoji: "🔬",
    data: dataScientist,
  },
  {
    id: "product-manager",
    role: "Product Manager",
    description: "0-to-1 launches, roadmapping, and cross-functional delivery.",
    emoji: "🗺️",
    data: productManager,
  },
];
