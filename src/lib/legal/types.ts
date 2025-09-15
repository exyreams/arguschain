export interface LegalPageContent {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export interface LegalSection {
  id: string;
  title: string;
  content: string | React.ReactNode;
  subsections?: LegalSubsection[];
}

export interface LegalSubsection {
  id: string;
  title: string;
  content: string | React.ReactNode;
}

export interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
  className?: string;
}
