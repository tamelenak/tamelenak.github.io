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

// A publication as the page lists it: the citation first (title, authors, venue), then one plain-language
// line. `fig` names the figure drawn beside it (see index.astro).
export type Fig = 'plasma' | 'cerebellum' | 'qurad' | 'common';
export type Publication = Citation & { summary?: string; links: Link[]; fig?: Fig };

// First-author publications, newest first.
export const firstAuthor: Publication[] = [
  {
    title: 'Plasma proteomics for prognostic stratification in newly diagnosed primary central nervous system lymphoma',
    authors: 'Künzle T, Herzi D, Boer Wigman C, et al.', venue: 'Neuro-Oncology', year: '2026', doi: '10.1093/neuonc/noag190',
    summary: 'About 1,000 plasma proteins from 162 patients reveal an "inflamed" blood state linked to shorter survival, in two independent cohorts.',
    links: [{ label: 'Code', href: 'https://github.com/tamelenak/pcnsl-plasma-proteomics' }], fig: 'plasma',
  },
  {
    title: 'Spatial analysis of paraneoplastic cerebellar degeneration in ovarian cancer with anti-Yo syndrome and SCA1',
    authors: 'Künzle T, Rincón de la Rosa L, Vialatte de Pémille C, et al.', venue: 'Journal of Neurology', year: '2026', note: '273:493', doi: '10.1007/s00415-026-13884-0',
    summary: 'Cortical thickness of 24 cerebellar lobules from MRI, and how the lobules co-vary as a network, in anti-Yo PCD, SCA1 and healthy controls.',
    links: [{ label: 'Code', href: 'https://github.com/tamelenak/pcd-spatial-analysis' }], fig: 'cerebellum',
  },
  {
    title: 'QuRad: radiomic feature extraction from cell detections in QuPath',
    authors: 'Künzle T, Arslan J, Güner Y, Alentorn A.', venue: 'Computational and Structural Biotechnology Journal', year: '2026', note: 'accepted',
    summary: 'An open-source QuPath extension that computes 103 radiomic features of shape, intensity and texture for every cell, each checked against PyRadiomics.',
    links: [{ label: 'Code', href: 'https://github.com/institutducerveau/QuRad' }, { label: 'Documentation', href: 'https://institutducerveau.github.io/QuRad/' }], fig: 'qurad',
  },
];

// Other publications (co-authored).
export const otherPublications: Publication[] = [
  {
    title: 'h5adify: neuro-symbolic metadata harmonization enables scalable AnnData integration with local large language models',
    authors: 'Rincón de la Rosa L, Mouazer A, Navidi M, Degroodt E, Künzle T, et al.', venue: 'bioRxiv', year: '2026', note: 'preprint', doi: '10.64898/2026.02.28.708740',
    links: [],
  },
];

// Software released with the work: QuRad on its own, then the analysis code published with each paper.
export const software = {
  qurad: {
    name: 'QuRad', description: 'Open-source QuPath extension for radiomic feature extraction from cell detections: 103 features of shape, intensity and texture per cell, each checked against PyRadiomics.',
    links: [
      { label: 'GitHub', href: 'https://github.com/institutducerveau/QuRad' },
      { label: 'Documentation', href: 'https://institutducerveau.github.io/QuRad/' },
      { label: 'Zenodo', href: 'https://doi.org/10.5281/zenodo.23062834' },
    ],
  },
  analysis: [
    { name: 'pcnsl-plasma-proteomics', description: 'Analysis code for the Neuro-Oncology paper: consensus clustering, immune signatures and survival models.', href: 'https://github.com/tamelenak/pcnsl-plasma-proteomics' },
    { name: 'pcd-spatial-analysis', description: 'Analysis code for the Journal of Neurology paper: cerebellar morphometry, covariance networks and classification.', href: 'https://github.com/tamelenak/pcd-spatial-analysis' },
  ],
};

// Posters and talks, newest first, listed like the publications. `slides` is a file under public/; its link
// shows once the file is there.
export const talks: { title: string; authors: string; kind: string; event: string; date: string; summary?: string; fig?: Fig; slides?: string }[] = [
  {
    title: 'Zero-annotation cell typing for spatial proteomics in the weak-linkage regime', authors: 'Künzle T, et al.', kind: 'Poster',
    event: 'NeurIPS 2026 Workshop on Machine Learning for Spatially Resolved High-dimensional Biology (ML4SpatialBio), Paris', date: 'December 2026',
    summary: 'Typing every cell of a multiplex image by matching it to a labelled single-cell RNA atlas, when the two share only a few markers.', fig: 'common',
  },
  {
    title: 'Plasma proteomics for prognostic stratification in newly diagnosed primary central nervous system lymphoma', authors: 'Künzle T, et al.', kind: 'Oral presentation',
    event: '21st Meeting of the European Association of Neuro-Oncology (EANO), Rome', date: 'September 2026', slides: 'talks/EANO2026_Kuenzle_slides.pdf',
  },
];

// The ongoing project, shown as the figure at the top of the page.
export const ongoing = {
  title: 'Spatial proteomics of the immune microenvironment in primary CNS lymphoma',
  caption: 'Ongoing work on which immune cells sit where inside a brain lymphoma: five serial multiplex sections of a synthetic lymphoma close up into one 3D cell graph.',
};

export const latest = [
  { date: 'Oct 2026', text: 'QuRad paper accepted in Computational and Structural Biotechnology Journal' },
  { date: 'Sept 2026', text: 'Poster accepted at the NeurIPS 2026 ML4SpatialBio workshop' },
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
  goatcounter: 'tamarakuenzle',
};
