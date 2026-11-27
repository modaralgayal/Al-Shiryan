/** Education Portal book catalogue. Shared by the backend (access + storage key) and the frontend (cards). */
export interface LibraryBook {
  /** URL-safe id; also the R2 object name: `library/<id>.pdf`. */
  id: string;
  title: string;
}

/** Roles allowed to open the PDFs. Everyone else sees the locked cards only. */
export const LIBRARY_READER_ROLES = ['doctor', 'pharmacist', 'admin'] as const;

export const libraryKey = (id: string) => `library/${id}.pdf`;
export const libraryCover = (id: string) => `/library/covers/${id}.jpg`;

export const LIBRARY_BOOKS: readonly LibraryBook[] = [
  { id: 'chemotherapy-protocols-and-infusion-sequence', title: 'Chemotherapy Protocols and Infusion Sequence' },
  { id: 'fuhrman-and-zimmerman-s-pediatric-critical-care-sixth-edition', title: 'Fuhrman and Zimmerman’s Pediatric Critical Care, 6th Edition' },
  { id: 'illustrated-manual-of-injectable-fillers-neil-s-sadick', title: 'Illustrated Manual of Injectable Fillers' },
  { id: 'kanski-s-clinical-ophthalmology-a-systematic-approach-10te-2025', title: 'Kanski’s Clinical Ophthalmology: A Systematic Approach, 10th Edition' },
  { id: 'kaplan-and-sadock-s-comprehensive-textbook-of-psychiatry-11e-2-vol', title: 'Kaplan & Sadock’s Comprehensive Textbook of Psychiatry, 11th Edition' },
  { id: 'macleods-clinical-examination-14th-edition', title: 'Macleod’s Clinical Examination, 14th Edition' },
  { id: 'mbmedicalbook-pharmacology', title: 'Katzung & Trevor’s Pharmacology Examination and Board Review, 12th Edition' },
  { id: 'miller-s-anesthesia-2-volume-set-10e-algrawany-2025-true-pdf', title: 'Miller’s Anesthesia, 10th Edition' },
  { id: 'plastic-surgery-a-practical-guide-to-operative-care', title: 'Plastic Surgery: A Practical Guide to Operative Care' },
  { id: 'preclinical-anatomy-review-2023-lecture-notes-for-usmle-step-1-and', title: 'Preclinical Anatomy Review 2023' },
  { id: 'preclinical-behavioral-science-and-social-sciences-review-2023-lecture', title: 'Preclinical Behavioral Science and Social Sciences Review 2023' },
  { id: 'rapid-review-pathology-5th-edition-2018', title: 'Rapid Review Pathology, 5th Edition' },
  { id: 'srb-manual-of-surgery-6th-edition', title: 'SRB’s Manual of Surgery, 6th Edition' },
  { id: 'the-ascrs-textbook-of-colon-and-rectal-surgery', title: 'The ASCRS Textbook of Colon and Rectal Surgery' },
  { id: 'the-harriet-lane-handbook-23rd-edition-april-15-2023', title: 'The Harriet Lane Handbook, 23rd Edition' },
  { id: 'usmle-in-arabic-2019-biochemistry', title: 'USMLE Step 1 Lecture Notes 2019: Biochemistry and Medical Genetics' },
  { id: 'usmle-in-arabic-2019n', title: 'USMLE Step 1 Lecture Notes: Immunology and Microbiology 2019' },
  { id: 'usmle-in-arabic-2019-pathology', title: 'USMLE Step 1 Lecture Notes: Pathology 2019' },
];

export const findBook = (id: string): LibraryBook | undefined => LIBRARY_BOOKS.find((b) => b.id === id);
