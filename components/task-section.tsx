import { TaskRow } from '@/components/task-row';
import { type Task, type SharedProps } from '@/lib/types';

type Props = {
  label: string;
  tasks: Task[];
  emptyText?: string;
} & SharedProps;

export function TaskSection({ label, tasks, emptyText = 'Nichts hier.', ...rest }: Props) {
  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
        {label}
      </p>
      {tasks.length === 0
        ? <p className="text-sm text-muted-foreground">{emptyText}</p>
        : tasks.map(t => <TaskRow key={t.id} task={t} {...rest} />)
      }
    </div>
  );
}
