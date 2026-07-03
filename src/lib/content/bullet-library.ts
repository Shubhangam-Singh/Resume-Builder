/**
 * Pre-written bullet library — the "content help" paid builders charge for,
 * shipped as static data so it works offline with zero AI/network. Bullets
 * follow this app's own writing rules: strong past-tense verb first, one line,
 * bracketed metric placeholders ([X%], [$Y], [N]) the user must fill in.
 */

export interface BulletCategory {
  id: string;
  label: string;
  /** Matched against the user's headline / role to pre-select a category. */
  match: RegExp;
  bullets: string[];
}

export const BULLET_LIBRARY: BulletCategory[] = [
  {
    id: "software",
    label: "Software Engineering",
    match: /software|developer|engineer|programmer|full.?stack|sde/i,
    bullets: [
      "Designed and shipped [feature] used by [N] customers, reducing [process] time by [X%]",
      "Reduced API response time from [N]ms to [N]ms by profiling and optimizing database queries",
      "Led migration of [system] from [old tech] to [new tech], cutting infrastructure costs by [$Y]/year",
      "Built CI/CD pipeline that cut deployment time from [N] hours to [N] minutes",
      "Refactored [module] into reusable components, reducing code duplication by [X%]",
      "Fixed [N]+ production bugs and reduced crash rate by [X%] over [N] months",
      "Wrote unit and integration tests raising coverage from [X%] to [X%]",
      "Reviewed [N]+ pull requests, mentoring [N] junior engineers on code quality standards",
      "Implemented caching layer that cut page load time by [X%] for [N] daily users",
      "Automated [manual process] with [tool/script], saving the team [N] hours per week",
      "Scaled [service] to handle [N]x traffic growth with zero downtime",
      "Collaborated with product and design to deliver [N] features across [N] sprint cycles",
    ],
  },
  {
    id: "frontend",
    label: "Frontend / Web",
    match: /front.?end|react|ui engineer|web developer/i,
    bullets: [
      "Rebuilt [page/app] in [framework], improving Lighthouse performance score from [N] to [N]",
      "Cut bundle size by [X%] through code-splitting and dependency audits",
      "Implemented responsive design system adopted across [N] product teams",
      "Improved accessibility to WCAG AA, increasing task completion for assistive-tech users by [X%]",
      "Reduced first contentful paint from [N]s to [N]s, lifting conversion by [X%]",
      "Built reusable component library used by [N] developers, cutting feature build time by [X%]",
      "Migrated legacy [jQuery/AngularJS] codebase to [React/Vue], reducing defect rate by [X%]",
      "Set up visual regression testing that caught [N] UI bugs before release",
    ],
  },
  {
    id: "backend",
    label: "Backend / Infrastructure",
    match: /back.?end|api|platform|infrastructure|systems/i,
    bullets: [
      "Designed REST/GraphQL APIs serving [N] requests/day at [N]ms p95 latency",
      "Sharded [database], enabling [N]x data growth while holding query times under [N]ms",
      "Introduced message queue ([tool]) to decouple services, cutting failed transactions by [X%]",
      "Hardened authentication and authorization, passing [security audit/SOC 2] with zero findings",
      "Cut cloud spend by [$Y]/month by right-sizing instances and adding autoscaling",
      "Built observability stack (metrics, tracing, alerts) that reduced incident detection time by [X%]",
      "Designed idempotent payment/order pipeline processing [$Y] per month with [N]% accuracy",
    ],
  },
  {
    id: "devops",
    label: "DevOps / Cloud / SRE",
    match: /devops|sre|site reliability|cloud|platform engineer/i,
    bullets: [
      "Migrated [N] services to Kubernetes, improving deploy frequency from weekly to [N]x daily",
      "Achieved [99.9x]% uptime across [N] services by introducing SLOs and error budgets",
      "Automated infrastructure with Terraform, reducing environment setup from [N] days to [N] minutes",
      "Cut mean time to recovery from [N] hours to [N] minutes with runbooks and automated rollbacks",
      "Reduced CI build times by [X%] through caching, parallelization, and test selection",
      "Implemented secrets management and least-privilege IAM across [N] AWS/GCP accounts",
    ],
  },
  {
    id: "data",
    label: "Data Science / Analytics",
    match: /data|analyst|analytics|machine learning|ml |ai engineer|scientist/i,
    bullets: [
      "Built [model type] model improving [prediction target] accuracy by [X%] over baseline",
      "Designed A/B testing framework used for [N] experiments, lifting [metric] by [X%]",
      "Created executive dashboard in [tool] that replaced [N] manual reports, saving [N] hours/week",
      "Cleaned and unified [N] data sources into a warehouse model powering [N] downstream teams",
      "Deployed ML pipeline to production scoring [N] records daily with [N]ms latency",
      "Identified [$Y] in cost savings through churn/fraud/funnel analysis",
      "Automated ETL workflows with [tool], reducing data delivery lag from [N] days to [N] hours",
      "Presented insights to leadership that shaped [decision], driving [X%] growth in [metric]",
    ],
  },
  {
    id: "product",
    label: "Product Management",
    match: /product manager|product owner|\bpm\b|product lead/i,
    bullets: [
      "Launched [product/feature] to [N] users, growing [metric] by [X%] in [N] months",
      "Defined roadmap and OKRs for [N]-person cross-functional team across [N] quarters",
      "Ran [N]+ customer interviews to identify pain points, shaping [N] shipped features",
      "Prioritized backlog of [N]+ items, cutting time-to-ship for top requests by [X%]",
      "Drove pricing/packaging change that increased ARPU by [X%]",
      "Reduced onboarding drop-off by [X%] through funnel analysis and targeted UX fixes",
      "Aligned engineering, design, and marketing on go-to-market launch reaching [N] signups in week one",
      "Sunset [legacy feature], reallocating [N] engineer-hours/quarter to growth work",
    ],
  },
  {
    id: "design",
    label: "UX / UI Design",
    match: /design|ux|ui|user experience|product designer/i,
    bullets: [
      "Redesigned [flow], increasing task completion rate from [X%] to [X%]",
      "Built design system in Figma adopted by [N] teams, cutting design-to-dev handoff time by [X%]",
      "Ran [N] usability tests and [N] interviews, informing [N] shipped improvements",
      "Created interactive prototypes that secured stakeholder buy-in for [initiative]",
      "Improved accessibility to WCAG AA across [N] core screens",
      "Reduced support tickets about [feature] by [X%] through clearer information architecture",
      "Partnered with engineering to ship pixel-accurate UI across web and mobile",
    ],
  },
  {
    id: "marketing",
    label: "Marketing / Growth",
    match: /marketing|growth|seo|content|brand|social media/i,
    bullets: [
      "Grew organic traffic from [N] to [N] monthly visits through SEO and content strategy",
      "Managed [$Y] ad budget across [channels], improving ROAS from [N]x to [N]x",
      "Launched email campaigns to [N] subscribers with [X%] open and [X%] click rates",
      "Increased conversion rate by [X%] through landing page testing ([N] experiments)",
      "Built social presence from [N] to [N] followers, driving [X%] of inbound leads",
      "Produced [N] case studies/webinars generating [N] qualified leads per quarter",
      "Cut customer acquisition cost by [X%] by reallocating spend to top-performing channels",
    ],
  },
  {
    id: "sales",
    label: "Sales / Business Development",
    match: /sales|account executive|business development|bdr|sdr|account manager/i,
    bullets: [
      "Exceeded quota by [X%] for [N] consecutive quarters, closing [$Y] in new business",
      "Built pipeline of [N] qualified opportunities worth [$Y] through outbound prospecting",
      "Shortened average sales cycle from [N] to [N] days by qualifying with [framework]",
      "Grew key account revenue by [X%] through upsell and renewal strategy",
      "Won [N] competitive deals against [competitor] with tailored demos and ROI analysis",
      "Onboarded and mentored [N] new reps who each reached quota within [N] months",
    ],
  },
  {
    id: "operations",
    label: "Operations / Project Management",
    match: /operations|project manager|program manager|scrum|logistics|supply/i,
    bullets: [
      "Delivered [N] projects on time and [X%] under budget across [N] stakeholders",
      "Streamlined [process], cutting turnaround time from [N] days to [N] days",
      "Negotiated vendor contracts saving [$Y] annually without service degradation",
      "Introduced [methodology/tool], raising on-time delivery from [X%] to [X%]",
      "Managed [$Y] budget and quarterly forecasting with [N]% variance",
      "Reduced inventory/stockout incidents by [X%] through demand planning",
      "Coordinated [N]-person cross-functional launch, hitting all [N] milestones",
    ],
  },
  {
    id: "finance",
    label: "Finance / Accounting",
    match: /finance|accountant|accounting|audit|controller|fp&a|analyst/i,
    bullets: [
      "Built financial models supporting [$Y] investment/budget decisions",
      "Closed monthly books in [N] days, down from [N], by automating reconciliations",
      "Identified [$Y] in cost savings through variance and spend analysis",
      "Prepared board-level reporting packages for [$Y] revenue organization",
      "Led [audit/compliance] readiness, passing with zero material findings",
      "Automated reporting in [Excel/SQL/BI tool], saving [N] hours per month",
    ],
  },
  {
    id: "support",
    label: "Customer Support / Success",
    match: /support|customer success|customer service|helpdesk|csm/i,
    bullets: [
      "Maintained [X%] CSAT across [N]+ tickets per month while beating SLA [X%] of the time",
      "Reduced average resolution time from [N] hours to [N] hours by building a knowledge base",
      "Onboarded [N] enterprise accounts, achieving [X%] retention at renewal",
      "Identified churn-risk signals and ran saves playbook recovering [$Y] in ARR",
      "Wrote [N] help-center articles that deflected [X%] of common tickets",
      "Escalated and tracked product issues, partnering with engineering to cut repeat tickets by [X%]",
    ],
  },
  {
    id: "general",
    label: "Leadership / General",
    match: /.^/, // never auto-matched; always available in the picker
    bullets: [
      "Led team of [N] through [initiative], delivering [outcome] [N] weeks ahead of schedule",
      "Presented to executive leadership, securing [$Y] budget for [initiative]",
      "Trained and mentored [N] team members, [N] of whom were promoted within a year",
      "Created documentation/processes adopted org-wide, reducing onboarding time by [X%]",
      "Recognized with [award] for [specific contribution]",
      "Drove cross-team initiative that improved [metric] by [X%]",
      "Volunteered to own [neglected area], turning it into [positive outcome]",
    ],
  },
];

/** Best-guess category id for a job title / headline; falls back to "general". */
export function guessCategory(roleText: string): string {
  const hit = BULLET_LIBRARY.find((c) => c.match.test(roleText));
  return hit?.id ?? "general";
}
