import { TaskRow } from '@/components/task-row';
import { type Task, type SharedProps } from '@/lib/types';

type Props = {
  label: string;
  tasks: Task[];
  emptyText?: string;
} & SharedProps;

export function TaskSection({ label, tasks, emptyText = 'Nichts hier.', ...rest }: Props) {
  return (
    <div className="mb-8">
      <p className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-[0.15em] mb-3">
        {label}
      </p>
      {tasks.length === 0
        ? <p className="text-sm text-muted-foreground py-2">{emptyText}</p>
        : (
          <div className="flex flex-col divide-y divide-border/60">
            {tasks.map(t => <TaskRow key={t.id} task={t} {...rest} />)}
          </div>
        )
      }
    </div>
  );
}
