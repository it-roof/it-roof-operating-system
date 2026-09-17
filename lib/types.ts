export type Task = {
  id: string;
  title: string;
  prio: 'high' | 'medium' | 'low';
  geplant: string | null;
  deadline: string | null;
  zeit_minuten: number | null;
  projekt: string;
  firma: string;
  status: string;
  project_id: string;
};

export type TrackerProject = {
  id: string;
  name: string;
  company_id: string | null;
  firma: string | null;
};

export type SharedProps = {
  onDone: (id: string) => void;
  onSaveTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};
