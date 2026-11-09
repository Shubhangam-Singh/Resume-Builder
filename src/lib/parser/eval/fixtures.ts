/**
 * Hand-built résumé corpus for layouts the app's own templates never produce:
 * LaTeX (Jake's résumé), LinkedIn's PDF export, an Indian fresher résumé,
 * date-first US layout, Europass (day-first dates), an academic CV, a nurse's
 * tab-aligned résumé, a Canva-style two-column export, one-line jobs, and
 * roles grouped under one company.
 *
 * `text` is what the importer's extraction step produces for that document
 * (PDF fields separated by " | " where the layout leaves a wide gap). Each
 * `expected` value is what a careful person would type into the form — not
 * what the parser happens to output.
 */
import type { ParseHints } from "@/lib/parser";
import { emptyResume } from "@/lib/resume/factory";
import type {
  Basics,
  CertificateEntry,
  CustomSection,
  EducationEntry,
  Location,
  ProjectEntry,
  ResumeData,
  WorkEntry,
} from "@/lib/resume/types";

export interface Fixture {
  id: string;
  text: string;
  hints?: ParseHints;
  expected: ResumeData;
}

type Need<T, K extends keyof T> = Partial<T> & Pick<T, K>;

const job = (w: Need<WorkEntry, "name" | "position" | "startDate" | "endDate">): WorkEntry => ({
  id: "",
  location: "",
  url: "",
  summary: "",
  highlights: [],
  ...w,
});

const school = (e: Need<EducationEntry, "institution">): EducationEntry => ({
  id: "",
  area: "",
  studyType: "",
  startDate: "",
  endDate: "",
  score: "",
  courses: [],
  ...e,
});

const project = (p: Need<ProjectEntry, "name">): ProjectEntry => ({
  id: "",
  description: "",
  highlights: [],
  url: "",
  keywords: [],
  ...p,
});

const cert = (c: Need<CertificateEntry, "name">): CertificateEntry => ({
  id: "",
  issuer: "",
  date: "",
  url: "",
  ...c,
});

const section = (title: string, itemCount: number): CustomSection => ({
  id: "",
  title,
  items: Array.from({ length: itemCount }, () => ({
    id: "",
    name: "",
    description: "",
    date: "",
    url: "",
    highlights: [],
  })),
});

/** An expected ResumeData from just the fields a fixture cares about. */
function resume(r: {
  basics: Partial<Omit<Basics, "location" | "profiles">> & {
    location?: Partial<Location>;
    profiles?: [network: string, username: string][];
  };
  work?: WorkEntry[];
  education?: EducationEntry[];
  projects?: ProjectEntry[];
  skills?: string[];
  certificates?: CertificateEntry[];
  customSections?: CustomSection[];
}): ResumeData {
  const out = emptyResume();
  const { location, profiles, ...basics } = r.basics;
  out.basics = {
    ...out.basics,
    ...basics,
    location: { ...out.basics.location, ...location },
    profiles: (profiles ?? []).map(([network, username]) => ({ id: "", network, username, url: "" })),
  };
  out.work = r.work ?? [];
  out.education = r.education ?? [];
  out.projects = r.projects ?? [];
  out.skills = r.skills ? [{ id: "", name: "", keywords: r.skills }] : [];
  out.certificates = r.certificates ?? [];
  out.customSections = r.customSections ?? [];
  return out;
}

export const FIXTURES: Fixture[] = [
  {
    id: "jake-latex",
    text: `Jake Ryan
123-456-7890 | jake@su.edu | linkedin.com/in/jake | github.com/jake
Education
Southwestern University | Georgetown, TX
Bachelor of Arts in Computer Science, Minor in Business | Aug. 2018 – May 2021
Blinn College | Bryan, TX
Associate's in Liberal Arts | Aug. 2014 – May 2018
Experience
Undergraduate Research Assistant | June 2020 – Present
Texas A&M University | College Station, TX
• Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems
• Developed a full-stack web application using Flask, React, PostgreSQL and Docker to analyze GitHub data
• Explored ways to visualize GitHub collaboration in a classroom setting
Information Technology Support Specialist | Sep. 2018 – Present
Southwestern University | Georgetown, TX
• Communicate with managers to set up campus computers used on campus
• Assess and troubleshoot computer problems brought by students, faculty and staff
• Maintain upkeep of computers, classroom equipment, and 200 printers across campus
Artificial Intelligence Research Assistant | May 2019 – July 2019
Southwestern University | Georgetown, TX
• Explored methods to generate video game dungeons based off of The Legend of Zelda
• Developed a game in Java to test the generated dungeons
Projects
Gitlytics | Python, Flask, React, PostgreSQL, Docker | June 2020 – Present
• Developed a full-stack web application using with Flask serving a REST API with React as the frontend
• Implemented GitHub OAuth to get data from user's repositories
Simple Paintball | Spigot API, Java, Maven, TravisCI, Git | May 2018 – May 2020
• Developed a Minecraft server plugin to entertain kids during free time for a previous job
Technical Skills
Languages: Java, Python, C/C++, SQL (Postgres), JavaScript, HTML/CSS, R
Frameworks: React, Node.js, Flask, JUnit, WordPress, Material-UI, FastAPI
Developer Tools: Git, Docker, TravisCI, Google Cloud Platform, VS Code, Visual Studio, PyCharm, IntelliJ, Eclipse
Libraries: pandas, NumPy, Matplotlib
`,
    expected: resume({
      basics: {
        name: "Jake Ryan",
        email: "jake@su.edu",
        phone: "123-456-7890",
        profiles: [
          ["LinkedIn", "jake"],
          ["GitHub", "jake"],
        ],
      },
      education: [
        school({
          institution: "Southwestern University",
          studyType: "Bachelor of Arts",
          area: "Computer Science, Minor in Business",
          startDate: "2018-08",
          endDate: "2021-05",
        }),
        school({
          institution: "Blinn College",
          studyType: "Associate's",
          area: "Liberal Arts",
          startDate: "2014-08",
          endDate: "2018-05",
        }),
      ],
      work: [
        job({
          name: "Texas A&M University",
          position: "Undergraduate Research Assistant",
          location: "College Station, TX",
          startDate: "2020-06",
          endDate: "",
          highlights: [
            "Developed a REST API using FastAPI and PostgreSQL to store data from learning management systems",
            "Developed a full-stack web application using Flask, React, PostgreSQL and Docker to analyze GitHub data",
            "Explored ways to visualize GitHub collaboration in a classroom setting",
          ],
        }),
        job({
          name: "Southwestern University",
          position: "Information Technology Support Specialist",
          location: "Georgetown, TX",
          startDate: "2018-09",
          endDate: "",
          highlights: [
            "Communicate with managers to set up campus computers used on campus",
            "Assess and troubleshoot computer problems brought by students, faculty and staff",
            "Maintain upkeep of computers, classroom equipment, and 200 printers across campus",
          ],
        }),
        job({
          name: "Southwestern University",
          position: "Artificial Intelligence Research Assistant",
          location: "Georgetown, TX",
          startDate: "2019-05",
          endDate: "2019-07",
          highlights: [
            "Explored methods to generate video game dungeons based off of The Legend of Zelda",
            "Developed a game in Java to test the generated dungeons",
          ],
        }),
      ],
      projects: [
        project({
          name: "Gitlytics",
          highlights: [
            "Developed a full-stack web application using with Flask serving a REST API with React as the frontend",
            "Implemented GitHub OAuth to get data from user's repositories",
          ],
        }),
        project({
          name: "Simple Paintball",
          highlights: ["Developed a Minecraft server plugin to entertain kids during free time for a previous job"],
        }),
      ],
      skills: [
        "Java", "Python", "C/C++", "SQL (Postgres)", "JavaScript", "HTML/CSS", "R",
        "React", "Node.js", "Flask", "JUnit", "WordPress", "Material-UI", "FastAPI",
        "Git", "Docker", "TravisCI", "Google Cloud Platform", "VS Code", "Visual Studio", "PyCharm", "IntelliJ", "Eclipse",
        "pandas", "NumPy", "Matplotlib",
      ],
    }),
  },

  {
    id: "linkedin-export",
    hints: { headingLines: ["Priya Nair"] },
    text: `Contact
www.linkedin.com/in/priya-nair-12345 (LinkedIn)
priya.nair@gmail.com
Top Skills
Product Strategy
User Research
SQL
Languages
English (Native or Bilingual)
Hindi (Native or Bilingual)
Certifications
Certified Scrum Product Owner (CSPO)
Priya Nair
Senior Product Manager at Razorpay
Bengaluru, Karnataka, India
Summary
Product manager with 8 years of experience building payments products used by millions of merchants across India.
Experience
Razorpay
Senior Product Manager
April 2021 - Present (3 years 8 months)
Bengaluru, Karnataka, India
Led the merchant onboarding revamp, cutting activation time from 5 days to 1 day.
Product Manager
June 2019 - March 2021 (1 year 10 months)
Bengaluru, Karnataka, India
Launched UPI AutoPay for subscriptions, now processing 2M mandates a month.
Flipkart
Associate Product Manager
July 2016 - May 2019 (2 years 11 months)
Bengaluru Area, India
Owned the seller returns experience across 3 categories.
Education
Indian Institute of Management, Ahmedabad
Master of Business Administration - MBA, Marketing · (2014 - 2016)
National Institute of Technology, Trichy
Bachelor of Technology - BTech, Computer Science · (2010 - 2014)
Page 1 of 2
`,
    expected: resume({
      basics: {
        name: "Priya Nair",
        label: "Senior Product Manager at Razorpay",
        email: "priya.nair@gmail.com",
        location: { city: "Bengaluru", region: "Karnataka" },
        summary:
          "Product manager with 8 years of experience building payments products used by millions of merchants across India.",
        profiles: [["LinkedIn", "priya-nair-12345"]],
      },
      work: [
        job({
          name: "Razorpay",
          position: "Senior Product Manager",
          location: "Bengaluru, Karnataka, India",
          startDate: "2021-04",
          endDate: "",
          highlights: ["Led the merchant onboarding revamp, cutting activation time from 5 days to 1 day."],
        }),
        job({
          name: "Razorpay",
          position: "Product Manager",
          location: "Bengaluru, Karnataka, India",
          startDate: "2019-06",
          endDate: "2021-03",
          highlights: ["Launched UPI AutoPay for subscriptions, now processing 2M mandates a month."],
        }),
        job({
          name: "Flipkart",
          position: "Associate Product Manager",
          location: "Bengaluru Area, India",
          startDate: "2016-07",
          endDate: "2019-05",
          highlights: ["Owned the seller returns experience across 3 categories."],
        }),
      ],
      education: [
        school({
          institution: "Indian Institute of Management, Ahmedabad",
          studyType: "Master of Business Administration",
          area: "Marketing",
          startDate: "2014",
          endDate: "2016",
        }),
        school({
          institution: "National Institute of Technology, Trichy",
          studyType: "Bachelor of Technology",
          area: "Computer Science",
          startDate: "2010",
          endDate: "2014",
        }),
      ],
      skills: [
        "Product Strategy", "User Research", "SQL",
        "English (Native or Bilingual)", "Hindi (Native or Bilingual)",
      ],
      certificates: [cert({ name: "Certified Scrum Product Owner (CSPO)" })],
    }),
  },

  {
    id: "india-fresher",
    text: `RAHUL KUMAR
B.Tech (Computer Science) | Final Year Student
Email: rahul.kumar2002@gmail.com | Mobile: +91-98765-43210
LinkedIn: linkedin.com/in/rahulkumar02 | GitHub: rahulk02
Address: Lucknow, Uttar Pradesh

CAREER OBJECTIVE
To secure a challenging position in a reputed organization where I can apply my technical skills and grow as a software engineer.

EDUCATIONAL QUALIFICATIONS
B.Tech in Computer Science and Engineering
Dr. A.P.J. Abdul Kalam Technical University, Lucknow | 2020 - 2024 | CGPA: 8.4/10
Class XII (CBSE)
Kendriya Vidyalaya, Lucknow | 2020 | 91.2%
Class X (CBSE)
Kendriya Vidyalaya, Lucknow | 2018 | 94%

TECHNICAL SKILLS
Programming Languages: C, C++, Java, Python
Web Technologies: HTML, CSS, JavaScript, React
Databases: MySQL, MongoDB
Tools: Git, VS Code, Postman

INTERNSHIP
Web Development Intern - Tech Mahindra
Jun-2023 to Aug-2023
Developed 5 responsive pages for an internal HR portal using React.
Integrated REST APIs with the backend team and wrote unit tests.

PROJECTS
Smart Attendance System
Face-recognition attendance system for 500 students using Python and OpenCV.
Tech Stack: Python, OpenCV, Flask
E-Commerce Website
Built a full-stack shopping site with cart and payment integration.
Tech Stack: React, Node.js, MongoDB

ACHIEVEMENTS
Secured 2nd position in Smart India Hackathon 2023.
Solved 400+ problems on LeetCode.

EXTRA-CURRICULAR ACTIVITIES
Volunteer, NSS (2021 - 2022)

HOBBIES
Cricket, Reading

DECLARATION
I hereby declare that all the information given above is true to the best of my knowledge.
Place: Lucknow
Date: 05/06/2024
(Rahul Kumar)
`,
    expected: resume({
      basics: {
        name: "Rahul Kumar",
        label: "Final Year Student",
        email: "rahul.kumar2002@gmail.com",
        phone: "+91-98765-43210",
        location: { city: "Lucknow", region: "Uttar Pradesh" },
        summary:
          "To secure a challenging position in a reputed organization where I can apply my technical skills and grow as a software engineer.",
        profiles: [
          ["LinkedIn", "rahulkumar02"],
          ["GitHub", "rahulk02"],
        ],
      },
      education: [
        school({
          institution: "Dr. A.P.J. Abdul Kalam Technical University, Lucknow",
          studyType: "B.Tech",
          area: "Computer Science and Engineering",
          startDate: "2020",
          endDate: "2024",
          score: "CGPA: 8.4/10",
        }),
        school({
          institution: "Kendriya Vidyalaya, Lucknow",
          studyType: "Class XII (CBSE)",
          endDate: "2020",
          score: "91.2%",
        }),
        school({
          institution: "Kendriya Vidyalaya, Lucknow",
          studyType: "Class X (CBSE)",
          endDate: "2018",
          score: "94%",
        }),
      ],
      skills: [
        "C", "C++", "Java", "Python", "HTML", "CSS", "JavaScript", "React",
        "MySQL", "MongoDB", "Git", "VS Code", "Postman",
      ],
      work: [
        job({
          name: "Tech Mahindra",
          position: "Web Development Intern",
          startDate: "2023-06",
          endDate: "2023-08",
          highlights: [
            "Developed 5 responsive pages for an internal HR portal using React.",
            "Integrated REST APIs with the backend team and wrote unit tests.",
          ],
        }),
      ],
      projects: [
        project({
          name: "Smart Attendance System",
          description: "Face-recognition attendance system for 500 students using Python and OpenCV.",
        }),
        project({
          name: "E-Commerce Website",
          description: "Built a full-stack shopping site with cart and payment integration.",
        }),
      ],
      customSections: [
        section("Achievements", 2),
        section("Extra-Curricular Activities", 1),
        section("Hobbies", 1),
      ],
    }),
  },

  {
    id: "us-date-first",
    text: `MICHAEL TORRES
Senior Data Engineer
Chicago, IL | (312) 555-0187 | m.torres@outlook.com | mtorres.io

PROFESSIONAL SUMMARY
Data engineer with 9 years of experience designing batch and streaming pipelines on AWS and GCP.

PROFESSIONAL EXPERIENCE
2020 – Present
Senior Data Engineer, Stripe — Chicago, IL
- Built a streaming fraud-feature pipeline on Kafka and Flink processing 40k events/sec.
- Cut warehouse costs 35% by migrating 300 dbt models to incremental builds.

2016 – 2020
Data Engineer, Groupon — Chicago, IL
- Owned the Airflow platform running 1,200 daily DAGs.
- Mentored 4 junior engineers.

2014 – 2016
Business Intelligence Analyst, Accenture — Chicago, IL
- Delivered 25+ Tableau dashboards for Fortune 500 retail clients.

EDUCATION
M.S. Computer Science, University of Illinois at Chicago, 2014
B.S. Mathematics, DePaul University, 2012

SKILLS
Python, SQL, Scala, Spark, Kafka, Flink, Airflow, dbt, Snowflake, AWS, GCP, Terraform

CERTIFICATIONS
Google Cloud Professional Data Engineer (2022)
AWS Certified Data Analytics – Specialty (2021)
`,
    expected: resume({
      basics: {
        name: "Michael Torres",
        label: "Senior Data Engineer",
        email: "m.torres@outlook.com",
        phone: "(312) 555-0187",
        url: "https://mtorres.io",
        location: { city: "Chicago", region: "IL" },
        summary: "Data engineer with 9 years of experience designing batch and streaming pipelines on AWS and GCP.",
      },
      work: [
        job({
          name: "Stripe",
          position: "Senior Data Engineer",
          location: "Chicago, IL",
          startDate: "2020",
          endDate: "",
          highlights: [
            "Built a streaming fraud-feature pipeline on Kafka and Flink processing 40k events/sec.",
            "Cut warehouse costs 35% by migrating 300 dbt models to incremental builds.",
          ],
        }),
        job({
          name: "Groupon",
          position: "Data Engineer",
          location: "Chicago, IL",
          startDate: "2016",
          endDate: "2020",
          highlights: ["Owned the Airflow platform running 1,200 daily DAGs.", "Mentored 4 junior engineers."],
        }),
        job({
          name: "Accenture",
          position: "Business Intelligence Analyst",
          location: "Chicago, IL",
          startDate: "2014",
          endDate: "2016",
          highlights: ["Delivered 25+ Tableau dashboards for Fortune 500 retail clients."],
        }),
      ],
      education: [
        school({
          institution: "University of Illinois at Chicago",
          studyType: "M.S.",
          area: "Computer Science",
          endDate: "2014",
        }),
        school({ institution: "DePaul University", studyType: "B.S.", area: "Mathematics", endDate: "2012" }),
      ],
      skills: ["Python", "SQL", "Scala", "Spark", "Kafka", "Flink", "Airflow", "dbt", "Snowflake", "AWS", "GCP", "Terraform"],
      certificates: [
        cert({ name: "Google Cloud Professional Data Engineer", issuer: "Google Cloud", date: "2022" }),
        cert({ name: "AWS Certified Data Analytics - Specialty", issuer: "Amazon Web Services", date: "2021" }),
      ],
    }),
  },

  {
    id: "europass-day-first",
    text: `Lukas Becker
Software Developer
Berlin, Germany | lukas.becker@web.de | +49 151 23456789

Work experience
01/03/2020 – Present
Backend Developer – Zalando SE, Berlin, Germany
• Designed order-routing services in Kotlin handling 2M orders per day.
• Introduced contract testing across 14 microservices.
15/09/2017 – 28/02/2020
Junior Developer – N26 GmbH, Berlin, Germany
• Built account-opening flows in Java and Spring Boot.

Education and training
01/10/2013 – 30/09/2017
Bachelor of Science in Computer Science – Technische Universität München, Germany

Language skills
German (Native), English (C1), Spanish (B1)

Digital skills
Kotlin, Java, Spring Boot, PostgreSQL, Kafka, Kubernetes
`,
    expected: resume({
      basics: {
        name: "Lukas Becker",
        label: "Software Developer",
        email: "lukas.becker@web.de",
        phone: "+49 151 23456789",
        location: { city: "Berlin", region: "Germany" },
      },
      work: [
        job({
          name: "Zalando SE",
          position: "Backend Developer",
          location: "Berlin, Germany",
          startDate: "2020-03",
          endDate: "",
          highlights: [
            "Designed order-routing services in Kotlin handling 2M orders per day.",
            "Introduced contract testing across 14 microservices.",
          ],
        }),
        job({
          name: "N26 GmbH",
          position: "Junior Developer",
          location: "Berlin, Germany",
          startDate: "2017-09",
          endDate: "2020-02",
          highlights: ["Built account-opening flows in Java and Spring Boot."],
        }),
      ],
      education: [
        school({
          institution: "Technische Universität München",
          studyType: "Bachelor of Science",
          area: "Computer Science",
          startDate: "2013-10",
          endDate: "2017-09",
        }),
      ],
      skills: [
        "German (Native)", "English (C1)", "Spanish (B1)",
        "Kotlin", "Java", "Spring Boot", "PostgreSQL", "Kafka", "Kubernetes",
      ],
    }),
  },

  {
    id: "academic-cv",
    text: `Dr. Ananya Iyer
Postdoctoral Researcher, Department of Physics, University of Toronto
ananya.iyer@utoronto.ca | scholar.google.com/citations?user=abc123

RESEARCH INTERESTS
Quantum materials, topological insulators, ultrafast spectroscopy

EDUCATION
Ph.D. in Physics, Indian Institute of Science, Bengaluru, 2019
M.Sc. in Physics, University of Hyderabad, 2013

RESEARCH EXPERIENCE
Postdoctoral Fellow | University of Toronto | 2019 – Present
• Built a pump-probe setup reaching 30 fs time resolution.
• Secured a $120k NSERC grant as co-investigator.
Graduate Researcher | Indian Institute of Science | 2013 – 2019
• Discovered a new surface state in Bi2Se3 thin films.

TEACHING EXPERIENCE
Teaching Assistant, PHY 201: Electromagnetism | University of Toronto | 2020 – 2022

PUBLICATIONS
Iyer, A., & Chen, L. (2023). Ultrafast surface dynamics in topological insulators. Physical Review B, 107, 045112.
Iyer, A., Rao, S., & Menon, K. (2019). Surface states in Bi2Se3 thin films. Nature Physics, 15, 778–783.

AWARDS
INSPIRE Fellowship, Department of Science and Technology, 2014
Best Thesis Award, Indian Institute of Science, 2020
`,
    expected: resume({
      basics: {
        name: "Ananya Iyer",
        label: "Postdoctoral Researcher",
        email: "ananya.iyer@utoronto.ca",
      },
      education: [
        school({
          institution: "Indian Institute of Science, Bengaluru",
          studyType: "Ph.D.",
          area: "Physics",
          endDate: "2019",
        }),
        school({ institution: "University of Hyderabad", studyType: "M.Sc.", area: "Physics", endDate: "2013" }),
      ],
      work: [
        job({
          name: "University of Toronto",
          position: "Postdoctoral Fellow",
          startDate: "2019",
          endDate: "",
          highlights: [
            "Built a pump-probe setup reaching 30 fs time resolution.",
            "Secured a $120k NSERC grant as co-investigator.",
          ],
        }),
        job({
          name: "Indian Institute of Science",
          position: "Graduate Researcher",
          startDate: "2013",
          endDate: "2019",
          highlights: ["Discovered a new surface state in Bi2Se3 thin films."],
        }),
        job({
          name: "University of Toronto",
          position: "Teaching Assistant, PHY 201: Electromagnetism",
          startDate: "2020",
          endDate: "2022",
        }),
      ],
      customSections: [section("Research Interests", 1), section("Publications", 2), section("Awards", 2)],
    }),
  },

  {
    id: "nurse-tabbed",
    text: `Maria Gonzalez, RN
Registered Nurse
(555) 234-9876 · maria.gonzalez.rn@gmail.com · Houston, TX

Summary
Compassionate registered nurse with 6 years in emergency and ICU care.

Experience
Houston Methodist Hospital\tHouston, TX
Registered Nurse, Emergency Department\tMarch 2021 – Present
• Triage 40+ patients per shift in a Level I trauma center.
• Precept new graduate nurses.
St. Luke's Health\tHouston, TX
Staff Nurse, Medical ICU\tJune 2018 – February 2021
• Managed care for up to 3 critically ill patients per shift.

Education
Bachelor of Science in Nursing (BSN)\t2018
University of Texas Health Science Center at Houston

Licenses & Certifications
Registered Nurse (RN), Texas Board of Nursing\t2018
Basic Life Support (BLS), American Heart Association\t2023
Advanced Cardiovascular Life Support (ACLS), American Heart Association\t2023

Skills
Patient assessment, IV therapy, Epic EHR, Wound care, Spanish (fluent)
`,
    expected: resume({
      basics: {
        name: "Maria Gonzalez",
        label: "Registered Nurse",
        email: "maria.gonzalez.rn@gmail.com",
        phone: "(555) 234-9876",
        location: { city: "Houston", region: "TX" },
        summary: "Compassionate registered nurse with 6 years in emergency and ICU care.",
      },
      work: [
        job({
          name: "Houston Methodist Hospital",
          position: "Registered Nurse, Emergency Department",
          location: "Houston, TX",
          startDate: "2021-03",
          endDate: "",
          highlights: ["Triage 40+ patients per shift in a Level I trauma center.", "Precept new graduate nurses."],
        }),
        job({
          name: "St. Luke's Health",
          position: "Staff Nurse, Medical ICU",
          location: "Houston, TX",
          startDate: "2018-06",
          endDate: "2021-02",
          highlights: ["Managed care for up to 3 critically ill patients per shift."],
        }),
      ],
      education: [
        school({
          institution: "University of Texas Health Science Center at Houston",
          studyType: "Bachelor of Science",
          area: "Nursing",
          endDate: "2018",
        }),
      ],
      certificates: [
        cert({ name: "Registered Nurse (RN)", issuer: "Texas Board of Nursing", date: "2018" }),
        cert({ name: "Basic Life Support (BLS)", issuer: "American Heart Association", date: "2023" }),
        cert({ name: "Advanced Cardiovascular Life Support (ACLS)", issuer: "American Heart Association", date: "2023" }),
      ],
      skills: ["Patient assessment", "IV therapy", "Epic EHR", "Wound care", "Spanish (fluent)"],
    }),
  },

  {
    id: "canva-two-column",
    hints: { headingLines: ["SNEHA RAO"] },
    text: `CONTACT
+91 99887 76655
sneha.rao@gmail.com
Pune, Maharashtra
SKILLS
Figma
Adobe XD
User Research
Wireframing
Prototyping
LANGUAGES
English
Marathi
SNEHA RAO
UI/UX DESIGNER
PROFILE
UI/UX designer with 4 years of experience designing mobile-first fintech products.
WORK EXPERIENCE
UI/UX Designer
Cred | 2022 - Present
• Redesigned the rewards flow, lifting weekly engagement 18%.
• Built a 120-component design system in Figma.
Junior UI Designer
Zeta | 2020 - 2022
• Designed onboarding screens for 3 banking partners.
EDUCATION
Bachelor of Design (B.Des)
MIT Institute of Design, Pune | 2016 - 2020
`,
    expected: resume({
      basics: {
        name: "Sneha Rao",
        label: "UI/UX Designer",
        email: "sneha.rao@gmail.com",
        phone: "+91 99887 76655",
        location: { city: "Pune", region: "Maharashtra" },
        summary: "UI/UX designer with 4 years of experience designing mobile-first fintech products.",
      },
      work: [
        job({
          name: "Cred",
          position: "UI/UX Designer",
          startDate: "2022",
          endDate: "",
          highlights: [
            "Redesigned the rewards flow, lifting weekly engagement 18%.",
            "Built a 120-component design system in Figma.",
          ],
        }),
        job({
          name: "Zeta",
          position: "Junior UI Designer",
          startDate: "2020",
          endDate: "2022",
          highlights: ["Designed onboarding screens for 3 banking partners."],
        }),
      ],
      education: [
        school({
          institution: "MIT Institute of Design, Pune",
          studyType: "Bachelor of Design (B.Des)",
          startDate: "2016",
          endDate: "2020",
        }),
      ],
      skills: ["Figma", "Adobe XD", "User Research", "Wireframing", "Prototyping", "English", "Marathi"],
    }),
  },

  {
    id: "one-line-jobs",
    text: `DAVID KIM
Mechanical Engineer | davidkim@yahoo.com | 216-555-0143 | Cleveland, OH

EXPERIENCE
Senior Mechanical Engineer, Parker Hannifin, Cleveland, OH (2019 - Present)
  Designed hydraulic valve assemblies for aerospace customers; reduced weight 12%.
  Led a 6-person team through two FAA certifications.
Mechanical Engineer, Lincoln Electric, Euclid, OH (2015 - 2019)
  Developed welding fixture designs adopted across 4 plants.
Engineering Intern, Ford Motor Company, Dearborn, MI (Summer 2014)
  Ran FEA simulations on suspension components.

EDUCATION
B.S. Mechanical Engineering, Case Western Reserve University, 2015

SKILLS
SolidWorks, ANSYS, GD&T, MATLAB, Six Sigma Green Belt
`,
    expected: resume({
      basics: {
        name: "David Kim",
        label: "Mechanical Engineer",
        email: "davidkim@yahoo.com",
        phone: "216-555-0143",
        location: { city: "Cleveland", region: "OH" },
      },
      work: [
        job({
          name: "Parker Hannifin",
          position: "Senior Mechanical Engineer",
          location: "Cleveland, OH",
          startDate: "2019",
          endDate: "",
          highlights: [
            "Designed hydraulic valve assemblies for aerospace customers; reduced weight 12%.",
            "Led a 6-person team through two FAA certifications.",
          ],
        }),
        job({
          name: "Lincoln Electric",
          position: "Mechanical Engineer",
          location: "Euclid, OH",
          startDate: "2015",
          endDate: "2019",
          highlights: ["Developed welding fixture designs adopted across 4 plants."],
        }),
        job({
          name: "Ford Motor Company",
          position: "Engineering Intern",
          location: "Dearborn, MI",
          startDate: "2014-06",
          endDate: "2014-06",
          highlights: ["Ran FEA simulations on suspension components."],
        }),
      ],
      education: [
        school({
          institution: "Case Western Reserve University",
          studyType: "B.S.",
          area: "Mechanical Engineering",
          endDate: "2015",
        }),
      ],
      skills: ["SolidWorks", "ANSYS", "GD&T", "MATLAB", "Six Sigma Green Belt"],
    }),
  },

  {
    id: "grouped-roles",
    text: `ALEX JOHNSON
Product Designer · alex@johnson.design · johnson.design

EXPERIENCE

Spotify
2021–Present\tSenior Product Designer
\tLed the redesign of the Podcasts home, growing listening time 9%.
\tRan 30 usability studies with creators.
2019–2021\tProduct Designer
\tShipped collaborative playlists to 100M users.

Airbnb
2017–2019\tUX Designer
\tDesigned the host onboarding checklist.

EDUCATION
Rhode Island School of Design — BFA, Graphic Design, 2017
`,
    expected: resume({
      basics: {
        name: "Alex Johnson",
        label: "Product Designer",
        email: "alex@johnson.design",
        url: "https://johnson.design",
      },
      work: [
        job({
          name: "Spotify",
          position: "Senior Product Designer",
          startDate: "2021",
          endDate: "",
          highlights: [
            "Led the redesign of the Podcasts home, growing listening time 9%.",
            "Ran 30 usability studies with creators.",
          ],
        }),
        job({
          name: "Spotify",
          position: "Product Designer",
          startDate: "2019",
          endDate: "2021",
          highlights: ["Shipped collaborative playlists to 100M users."],
        }),
        job({
          name: "Airbnb",
          position: "UX Designer",
          startDate: "2017",
          endDate: "2019",
          highlights: ["Designed the host onboarding checklist."],
        }),
      ],
      education: [
        school({
          institution: "Rhode Island School of Design",
          studyType: "BFA",
          area: "Graphic Design",
          endDate: "2017",
        }),
      ],
    }),
  },
];
