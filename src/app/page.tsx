import { Workspace } from "@/components/editor/Workspace";

export default function Home() {
  return (
    <>
      {/*
        Hidden semantic SEO content — visible to search crawlers in the static
        HTML but visually hidden from users via sr-only. This gives Googlebot
        rich keyword context since the main app is client-rendered.
      */}
      <div className="sr-only" aria-hidden="true">
        <h1>ResumeForge — Free ATS-Friendly Resume Builder Online</h1>
        <p>
          Build a professional resume for free with ResumeForge — the privacy-first,
          ATS-friendly resume builder that runs entirely in your browser. No signup,
          no account, and your data is never uploaded anywhere.
        </p>
        <h2>Why use ResumeForge?</h2>
        <ul>
          <li>100% free resume builder — no hidden fees or premium tiers</li>
          <li>No account or email required — start building instantly</li>
          <li>ATS-friendly resume templates that beat applicant tracking systems</li>
          <li>Instant PDF download directly from your browser</li>
          <li>6 professionally designed resume templates to choose from</li>
          <li>AI-powered bullet point improvement (bring your own API key)</li>
          <li>Privacy-first — your resume data never leaves your device</li>
          <li>Import existing resume from PDF, DOCX, or TXT</li>
          <li>Custom accent colors, fonts (Inter, Montserrat, Lato, Merriweather), and density</li>
          <li>Dark mode and light mode support</li>
          <li>Open source resume builder</li>
        </ul>
        <h2>Free Resume Templates</h2>
        <p>
          Choose from 6 ATS-optimized resume templates: ATS Classic (best for corporate jobs),
          Modern (clean and minimal), Compact (fit more on one page), Designer (creative roles),
          Banner (bold header), and Sidebar (profile photo friendly).
        </p>
        <h2>How to build a resume for free</h2>
        <ol>
          <li>Open ResumeForge in your browser — no download needed</li>
          <li>Fill in your personal information, work experience, education, and skills</li>
          <li>Choose a template and customize the accent color and font</li>
          <li>Check your ATS score with the built-in ATS checker</li>
          <li>Download your resume as a PDF — instantly, for free</li>
        </ol>
        <h2>Frequently Asked Questions</h2>
        <dl>
          <dt>Is this resume builder really free?</dt>
          <dd>Yes, completely free. No credit card, no trial period, no premium unlock. Every feature is free forever.</dd>
          <dt>Is my resume data private?</dt>
          <dd>Yes. All data is stored in your browser only. Nothing is sent to any server. Your resume is 100% private.</dd>
          <dt>Does it work without an internet connection?</dt>
          <dd>Once loaded, most features work offline. PDF generation and AI improvements require internet access.</dd>
          <dt>What makes a resume ATS-friendly?</dt>
          <dd>ATS (Applicant Tracking Systems) scan resumes for keywords. Our templates use clean, parseable formatting with standard section headings to maximize your ATS score.</dd>
          <dt>Can I use this resume builder on mobile?</dt>
          <dd>Yes. ResumeForge is fully responsive and works on phones, tablets, and desktops.</dd>
        </dl>
      </div>
      <Workspace />
    </>
  );
}
