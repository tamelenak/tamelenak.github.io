// Everything the page says. Wording agreed with Tamara (2026-09-29 to 2026-10-01).

export const person = {
  name: 'Tamara Künzle',
  given: 'Tamara',
  family: 'Künzle',
  role: 'PhD candidate at the Paris Brain Institute and École Polytechnique',
  oneLine:
    'I analyze blood proteins, tissue images and brain scans to understand brain tumors.',
  // Shown on the page assembled in the browser (user + @ + domain), so it is not sitting in the HTML for scrapers.
  email: { user: 'tamara.kuenzle', domain: 'protonmail.com' },
};

export const about = [
  "I'm a PhD researcher at the Paris Brain Institute (ICM) and École Polytechnique, supervised by Agustí Alentorn and Maks Ovsjanikov. I apply machine learning and spatial analysis to brain tumors, mostly primary CNS lymphoma, working with plasma proteomics, multiplex tissue imaging and MRI to find out which patients are likely to do well, and why.",
  'Before my PhD I studied biology and biotechnology at ETH Zurich, then spent three and a half years at Accenture in Zurich delivering data science projects for life-science and healthcare clients. My doctorate is funded by SOUND.AI, a Marie Skłodowska-Curie programme of Sorbonne Université.',
];

export type Link = { label: string; href: string };

export type Citation = { authors: string; title: string; venue: string; year: string; doi?: string; note?: string };

export const research: {
  question: string;
  answer: string;
  status?: string;
  cite?: Citation;
  links: Link[];
}[] = [
  {
    question: 'Can a blood sample tell which lymphoma patients are at higher risk?',
    answer:
      'We analyzed about 1,000 plasma proteins from 162 patients with primary CNS lymphoma and found an "inflamed" blood state linked to shorter survival, in two independent cohorts.',
    cite: { authors: 'Künzle T, Herzi D, Boer Wigman C, et al.', title: 'Plasma proteomics for prognostic stratification in newly diagnosed primary central nervous system lymphoma', venue: 'Neuro-Oncology', year: '2026', doi: '10.1093/neuonc/noag190' },
    links: [
      { label: 'Paper in Neuro-Oncology', href: 'https://doi.org/10.1093/neuonc/noag190' },
      { label: 'Code', href: 'https://github.com/tamelenak/pcnsl-plasma-proteomics' },
    ],
  },
  {
    question: 'Which immune cells sit where inside a brain lymphoma, and does it matter?',
    answer:
      "We're building a spatial map of the tumor's immune environment from serial-section multiplex immunofluorescence.",
    status: 'In progress',
    cite: { authors: 'Künzle T, et al.', title: 'Spatial proteomics of the PCNSL immune microenvironment', venue: 'Ongoing work', year: '2026' },
    links: [],
  },
  {
    question: 'How does an autoimmune attack reshape the cerebellum?',
    answer:
      'From MRI, we measured the cortical thickness of 24 cerebellar lobules, and how the lobules co-vary as a network, in anti-Yo paraneoplastic cerebellar degeneration, compared with SCA1 and healthy controls.',
    cite: { authors: 'Künzle T, Rincón de la Rosa L, Vialatte de Pémille C, et al.', title: 'Spatial analysis of paraneoplastic cerebellar degeneration in ovarian cancer with anti-Yo syndrome and SCA1', venue: 'Journal of Neurology', year: '2026', note: '273:493', doi: '10.1007/s00415-026-13884-0' },
    links: [
      { label: 'Paper in Journal of Neurology', href: 'https://doi.org/10.1007/s00415-026-13884-0' },
      { label: 'Code', href: 'https://github.com/tamelenak/pcd-spatial-analysis' },
    ],
  },
  {
    question: 'Can we measure the shape and texture of every cell on a slide?',
    answer:
      'QuRad is an open-source QuPath extension we built. It computes 103 radiomic features of shape, intensity and texture for every cell, each checked against PyRadiomics.',
    cite: { authors: 'Künzle T, Arslan J, Alentorn A.', title: 'QuRad: radiomic feature extraction from cell detections in QuPath', venue: 'Computational and Structural Biotechnology Journal, accepted', year: '2026', doi: '10.5281/zenodo.20628111' },
    links: [
      { label: 'Software', href: 'https://github.com/icm-dac/QuRad' },
      { label: 'Documentation', href: 'https://icm-dac.github.io/QuRad/' },
    ],
  },
];

export const latest = [
  { date: 'Oct 2026', text: 'QuRad paper accepted in Computational and Structural Biotechnology Journal' },
  { date: 'Sept 2026', text: 'Extended abstract accepted at the NeurIPS 2026 ML4SpatialBio workshop' },
  { date: 'Sept 2026', text: 'Gave a talk at EANO 2026 in Rome' },
  { date: 'Sept 2026', text: 'Plasma proteomics paper published in Neuro-Oncology' },
  { date: 'Jul 2026', text: 'Cerebellar degeneration paper published in Journal of Neurology' },
];



export const cv = [
  // one style throughout: role in sentence case, then "organisation, city" (ETH Zurich carries its city)
  { years: '2024 – 2027', role: 'PhD candidate, MSCA COFUND fellow (SOUND.AI)', place: 'Sorbonne Université, Paris Brain Institute and École Polytechnique, Paris' },
  { years: '2021 – 2024', role: 'Data science analyst, then consultant / team lead', place: 'Accenture, Data Science & Applied AI, Zurich' },
  { years: '2019 – 2020', role: 'Master thesis internship, data science', place: 'Roche Innovation Center for Cancer Immunotherapy, Zurich' },
  { years: '2019', role: 'Internship, data science and preclinical pharmacology', place: 'Roche Innovation Center for Cancer Immunotherapy, Zurich' },
  { years: '2017 – 2020', role: 'MSc Biotechnology', place: 'ETH Zurich' },
  { years: '2016 – 2018', role: 'Teaching assistant', place: 'Institute of Molecular Systems Biology, ETH Zurich' },
  { years: '2016 – 2017', role: 'Flight attendant', place: 'Swiss International Air Lines, Zurich' },
  { years: '2013 – 2016', role: 'BSc Biology', place: 'ETH Zurich' },
];

export const links: Link[] = [
  { label: 'ORCID', href: 'https://orcid.org/0009-0005-7663-6819' },
  { label: 'GitHub', href: 'https://github.com/tamelenak' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/tamara-kuenzle' },
];

// First-author publications: the research items with a published or accepted paper.
export const firstAuthor = research.filter((r) => !r.status);

// Other work: co-authored papers, conference contributions and ongoing work, newest first.
export const otherWork: { question?: string; authors: string; title: string; venue: string; year: string; doi?: string }[] = [
  {
    authors: 'Künzle T, et al.',
    title: 'Zero-annotation cell typing for spatial proteomics in the weak-linkage regime',
    venue: 'Extended abstract, accepted at the NeurIPS 2026 Workshop on Machine Learning for Spatially Resolved High-dimensional Biology (ML4SpatialBio), Paris',
    year: '2026',
  },
  {
    authors: 'Künzle T, et al.',
    title: 'Plasma proteomics for prognostic stratification in newly diagnosed primary central nervous system lymphoma',
    venue: 'Oral presentation, 21st Meeting of the European Association of Neuro-Oncology (EANO), Rome',
    year: '2026',
  },
  {
    authors: 'Rincón de la Rosa L, Mouazer A, Navidi M, Degroodt E, Künzle T, et al.',
    title: 'h5adify: neuro-symbolic metadata harmonization enables scalable AnnData integration with local large language models',
    venue: 'bioRxiv',
    year: '2026',
    doi: '10.64898/2026.02.28.708740',
  },
  {
    question: 'Which immune cells sit where inside a brain lymphoma, and does it matter?',
    authors: 'Künzle T, et al.',
    title: 'Spatial proteomics of the immune microenvironment in primary CNS lymphoma, from serial-section multiplex immunofluorescence',
    venue: 'Ongoing work',
    year: '2026',
  },
];

// Search and sharing metadata. Strings checked with the metadata-check skill (title 30–65, description 70–200 chars).
export const site = {
  url: 'https://tamelenak.github.io/',
  title: 'Tamara Künzle – Machine learning for brain tumor research',
  description:
    'PhD candidate at the Paris Brain Institute and École Polytechnique. Plasma and spatial proteomics of primary CNS lymphoma, cell-level imaging and brain MRI.',
  personDescription:
    'PhD candidate applying machine learning and spatial analysis to brain tumors, mostly primary central nervous system lymphoma.',
  ogImage: 'og.jpg',
  orcid: '0009-0005-7663-6819',
  // Private visitor counts: set this to the GoatCounter site code (the "NAME" in NAME.goatcounter.com) to switch them on.
  goatcounter: '',
};
