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
};

export type SharedProps = {
  onDone: (id: string) => void;
  onSaveTitle: (id: string, title: string) => void;
  onDelete: (id: string) => void;
};
