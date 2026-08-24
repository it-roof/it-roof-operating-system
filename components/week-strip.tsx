'use client';

import { type Task } from '@/lib/types';

const DAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
const now = new Date();
const today = now.toISOString().slice(0, 10);

function getWeekDays(): Date[] {
  const dow = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(mon);
    d.setDate(mon.getDate() + i);
    return d;
  });
}

type Props = {
  tasks: Task[];
  selectedDay: string | null;
  onSelectDay: (day: string | null) => void;
  onNewTask: (date: string) => void;
};

export function WeekStrip({ tasks, selectedDay, onSelectDay, onNewTask }: Props) {
  const weekDays = getWeekDays();

  return (
    <div className="grid grid-cols-7 gap-1 mb-8">
      {weekDays.map(d => {
        const ds = d.toISOString().slice(0, 10);
        const dayTasks = tasks.filter(t => t.geplant === ds);
        const isToday = ds === today;
        const isSelected = ds === selectedDay;

        return (
          <button
            key={ds}
            onClick={() => onSelectDay(isSelected ? null : ds)}
            onDoubleClick={() => onNewTask(ds)}
            className={`flex flex-col items-center py-2.5 px-1 rounded-lg transition-all duration-150 ${
              isSelected
                ? 'bg-foreground text-background'
                : isToday
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            }`}
          >
            <span className="text-[9px] font-mono font-semibold uppercase tracking-widest mb-1.5">
              {DAYS[d.getDay()]}
            </span>
            <span className="text-base font-bold leading-none mb-2">{d.getDate()}</span>
            <div className="flex flex-col items-center gap-0.5 min-h-[12px]">
              {dayTasks.slice(0, 3).map(t => (
                <span
                  key={t.id}
                  className={`w-1 h-1 rounded-full ${
                    isSelected || isToday
                      ? (t.prio === 'high' ? 'bg-current opacity-90' : 'bg-current opacity-40')
                      : (t.prio === 'high' ? 'bg-foreground' : 'bg-muted-foreground/40')
                  }`}
                />
              ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}
