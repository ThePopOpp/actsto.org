/** FAQ copy sourced from https://arizonachristiantuition.com/faq/ */

import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from "@/lib/constants";

export type FaqBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "links"; links: { label: string; href: string }[] };

export type FaqItem = {
  question: string;
  blocks: FaqBlock[];
};

export const faqItems: FaqItem[] = [
  {
    question: "What is Arizona Christian Tuition?",
    blocks: [
      {
        type: "p",
        text: "Arizona Christian Tuition is a certified School Tuition Organization (STO) that helps families afford private Christian education by awarding tuition scholarships funded by Arizona tax credit donations. Our mission is to make Christian schooling accessible while giving individuals and corporations the ability to redirect their Arizona tax dollars to support students directly.",
      },
    ],
  },
  {
    question: "What is an STO (School Tuition Organization)?",
    blocks: [
      {
        type: "p",
        text: "An STO is a nonprofit organization certified by the Arizona Department of Revenue to collect tax credit donations and award tuition scholarships to eligible students attending private schools in Arizona. STOs must meet strict transparency, reporting, and accountability standards.",
      },
    ],
  },
  {
    question: "How do Arizona tax credits work?",
    blocks: [
      {
        type: "p",
        text: "Arizona allows taxpayers to redirect a portion of their state income taxes to a certified STO like Arizona Christian Tuition. Instead of paying these dollars to the state, donors give to the STO and receive a dollar-for-dollar tax credit on their Arizona tax return.",
      },
    ],
  },
  {
    question: "What’s the difference between Original and Overflow tax credits?",
    blocks: [
      {
        type: "p",
        text: "Original (Individual) Tax Credit: Available to any Arizona taxpayer.",
      },
      {
        type: "p",
        text: "Overflow (Switcher) Tax Credit: Available to donors supporting students who meet specific eligibility criteria (such as transferring from public school, moving from out of state, kindergarteners, etc.).",
      },
      {
        type: "p",
        text: "Both credits combine to create the total maximum individual tax credit amount each year.",
      },
    ],
  },
  {
    question: "Who can donate to Arizona Christian Tuition?",
    blocks: [
      {
        type: "p",
        text: "Any Arizona taxpayer can donate — individuals, married couples, and qualifying corporations. Out-of-state donors may also give but cannot claim the Arizona tax credit.",
      },
    ],
  },
  {
    question: "Can I recommend a student when I donate?",
    blocks: [
      {
        type: "p",
        text: "Yes. Donors may recommend a specific student or school. However:",
      },
      {
        type: "ul",
        items: [
          "Recommendations are not guaranteed awards.",
          "Donations cannot be made to your own dependent children.",
        ],
      },
    ],
  },
  {
    question: "What schools are eligible to receive scholarships?",
    blocks: [
      {
        type: "p",
        text: "Any private Christian school in Arizona that partners with Arizona Christian Tuition and meets the state’s eligibility requirements. Parents select their school during the application process.",
      },
    ],
  },
  {
    question: "How are scholarships awarded to students?",
    blocks: [
      {
        type: "p",
        text: "Scholarships are awarded based on available program funds, eligibility requirements, school recommendations, financial need (as applicable), and completeness of the parent application.",
      },
    ],
  },
  {
    question: "Who is eligible to receive scholarships?",
    blocks: [
      {
        type: "p",
        text: "Students must be enrolled in or applying to an Arizona private Christian school and meet at least one eligibility pathway such as:",
      },
      {
        type: "ul",
        items: [
          "Public/charter school switcher",
          "Kindergarten",
          "Out-of-state transfer",
          "Homeschooled student",
          "Foster/Displaced student",
          "ESA student switching to STO",
          "Prior STO scholarship recipient",
          "Low-income family",
          "Student with disabilities",
        ],
      },
    ],
  },
  {
    question: "Can a child receive scholarships if they’re on ESA?",
    blocks: [
      {
        type: "p",
        text: "Yes, but STO scholarships cannot be sent to the school while an ESA contract is active. Families may apply, and funds will be held until ESA is paused, closed, or not renewed.",
      },
    ],
  },
  {
    question: "How do I apply for a scholarship for my child?",
    blocks: [
      {
        type: "p",
        text: "Parents create an online profile, add their student, complete financial and narrative sections, upload supporting documents (if applicable), and submit the application for the current school year.",
      },
    ],
  },
  {
    question: "How often do I need to submit an application?",
    blocks: [
      {
        type: "p",
        text: "A new application must be submitted every school year for each student.",
      },
    ],
  },
  {
    question: "What documentation is required?",
    blocks: [
      {
        type: "p",
        text: "Documentation varies based on eligibility and may include:",
      },
      {
        type: "ul",
        items: [
          "Public school verification forms",
          "Out-of-state transfer verification",
          "IEP/MET/504 plans",
          "ESA closure forms",
          "Proof of foster or displaced status",
          "Income information for low-income qualification",
        ],
      },
    ],
  },
  {
    question: "What is the deadline to donate as an individual?",
    blocks: [
      {
        type: "p",
        text: "Individuals can donate any time during the year. Donations made January 1 – April 15 can be applied to either the previous or current tax year.",
      },
    ],
  },
  {
    question: "What are the maximum donation limits for individuals?",
    blocks: [
      {
        type: "p",
        text: "For 2025:",
      },
      {
        type: "ul",
        items: [
          "Single/HOH: $1,535",
          "Married Filing Jointly: $3,062",
          "(These combine Original + Overflow credits.)",
        ],
      },
    ],
  },
  {
    question: "Can I donate beyond my tax liability?",
    blocks: [
      {
        type: "p",
        text: "Yes. Donations beyond your tax liability may qualify as a federal tax deduction and may also be carried forward for up to 5 years.",
      },
    ],
  },
  {
    question: "How does corporate giving work?",
    blocks: [
      {
        type: "p",
        text: "Corporations may redirect up to 100% of their Arizona corporate income tax or insurance premium tax liability to scholarships. Pre-approval through ADOR is required and begins July 1 each year.",
      },
    ],
  },
  {
    question: "Is there a minimum donation for corporations?",
    blocks: [
      {
        type: "ul",
        items: [
          "S-Corps and LLCs filing as S-Corps: $5,000 minimum",
          "C-Corps and Insurance Companies: No minimum",
        ],
      },
    ],
  },
  {
    question: "Can corporations recommend a school?",
    blocks: [
      {
        type: "p",
        text: "Yes. Corporations may recommend specific schools but cannot designate individual students.",
      },
    ],
  },
  {
    question: "How do donors receive receipts or tax documentation?",
    blocks: [
      {
        type: "p",
        text: "A donation receipt is automatically emailed once a contribution is processed. Donors can also access receipts anytime through the donor portal.",
      },
    ],
  },
  {
    question: "Are donations refundable?",
    blocks: [
      {
        type: "p",
        text: "No. Once a donation has been processed and a tax receipt issued, it cannot be refunded due to state tax credit laws.",
      },
    ],
  },
  {
    question: "How long does it take for scholarships to be distributed?",
    blocks: [
      {
        type: "p",
        text: "Distribution varies by funding cycles, school year timing, and application volume. Awards are typically issued throughout the school year as funds become available.",
      },
    ],
  },
  {
    question: "What if I entered incorrect information in my portal?",
    blocks: [
      {
        type: "p",
        text: "Parents and donors can update their profile information directly in the portal or contact us for assistance.",
      },
    ],
  },
  {
    question: "Can students receive scholarships from multiple STOs?",
    blocks: [
      {
        type: "p",
        text: "Yes. Students may apply to and receive funding from multiple certified STOs as long as eligibility requirements are met.",
      },
    ],
  },
  {
    question: "Who should I contact for help?",
    blocks: [
      {
        type: "p",
        text: "Parents, donors, and corporations can reach our support team through:",
      },
      {
        type: "links",
        links: [
          { label: `Phone (${SUPPORT_PHONE_DISPLAY})`, href: "tel:+14809999906" },
          { label: `Email (${SUPPORT_EMAIL})`, href: `mailto:${SUPPORT_EMAIL}` },
          { label: "Website contact form", href: "/contact" },
          {
            label: "Portal support (change email, merge accounts, etc.)",
            href: "/login",
          },
        ],
      },
    ],
  },
];
