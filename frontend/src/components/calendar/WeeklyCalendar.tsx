import React, { useMemo } from 'react';
import { WeeklyEvent, CalendarEventType } from '../../types/calendar';

interface WeeklyCalendarProps {
  events: WeeklyEvent[];
  weekStart: Date;
  hourStart?: number;
  hourEnd?: number;
  firstDayIsMonday?: boolean;
  onEventClick?: (event: WeeklyEvent) => void;
}

// palette par type (couleurs Tailwind neutres et accessibles)
const TYPE_BG: Record<CalendarEventType, string> = {
  MEETING: 'bg-blue-600',
  INTERVENTION: 'bg-emerald-600',
  MISSION: 'bg-indigo-600',
  APPOINTMENT: 'bg-cyan-600',
  REMINDER: 'bg-orange-500',
  TASK: 'bg-slate-600',
  TIMEOFF: 'bg-amber-500',
  OTHER: 'bg-gray-500',
};

const TYPE_TEXT: Record<CalendarEventType, string> = {
  MEETING: 'text-white',
  INTERVENTION: 'text-white',
  MISSION: 'text-white',
  APPOINTMENT: 'text-white',
  REMINDER: 'text-white',
  TASK: 'text-white',
  TIMEOFF: 'text-white',
  OTHER: 'text-white',
};

// Retourne les 7 dates de la semaine à afficher
function buildWeekDays(weekStart: Date, firstDayIsMonday: boolean) {
  const start = new Date(weekStart);
  // normalise à 00:00
  start.setHours(0, 0, 0, 0);

  // si firstDayIsMonday=true et weekStart est un lundi → aucun décalage
  // sinon, on considère weekStart déjà aligné. (on garde simple)
  return Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}

// Convertit un ISO en minutes depuis 00:00 (utile pour la hauteur des blocs)
function minutesSinceMidnight(d: Date) {
  return d.getHours() * 60 + d.getMinutes();
}

// Découpe par jour; chaque entrée: dateKey (yyyy-mm-dd) → events[]
function groupEventsByDay(events: WeeklyEvent[]) {
  const map = new Map<string, WeeklyEvent[]>();
  for (const ev of events) {
    const d = new Date(ev.startTime);
    const key = d.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  // tri par heure de début pour un rendu stable
  for (const [k, arr] of map) {
    arr.sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
    map.set(k, arr);
  }
  return map;
}

// Calcul basique de "lanes" pour chevauchement:
// Pour chaque événement d'un jour, attribue un "colonne index" si chevauche un précédent non terminé.
function assignLanes(dayEvents: WeeklyEvent[]) {
  type Placed = WeeklyEvent & { lane: number; laneCount: number };
  const placed: Placed[] = [];
  const laneEndTimes: Date[] = []; // fin de chaque lane

  for (const ev of dayEvents) {
    const s = new Date(ev.startTime);
    const e = new Date(ev.endTime);

    // trouve une lane libre
    let lane = 0;
    while (lane < laneEndTimes.length && laneEndTimes[lane] > s) {
      lane++;
    }
    // si toutes occupées → nouvelle lane
    if (lane === laneEndTimes.length) {
      laneEndTimes.push(e);
    } else {
      laneEndTimes[lane] = e;
    }
    placed.push({ ...ev, lane, laneCount: 0 });
  }
  // laneCount = max lanes utilisées
  const maxLane = Math.max(0, ...placed.map(p => p.lane));
  for (const p of placed) p.laneCount = maxLane + 1;
  return placed;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  events,
  weekStart,
  hourStart = 8,
  hourEnd = 18,
  firstDayIsMonday = false,
  onEventClick
}) => {
  const days = useMemo(() => buildWeekDays(weekStart, firstDayIsMonday), [weekStart, firstDayIsMonday]);

  // groupage par jour
  const byDay = useMemo(() => groupEventsByDay(events), [events]);

  // hauteur de 1 minute en pixels (ici 1px = 2min → 30min = 15px, ajustable)
  const MINUTE_PX = 0.5; // plus grand → blocs plus hauts
  const HOUR_PX = 60 * MINUTE_PX;
  const totalHours = hourEnd - hourStart;

  return (
    <div className="w-full">
      {/* En-tête jours */}
      <div className="grid" style={{ gridTemplateColumns: `80px repeat(7, minmax(0, 1fr))` }}>
        <div className="h-12" />
        {days.map((d, i) => {
          const label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
          return (
            <div key={i} className="h-12 flex items-center justify-center font-semibold text-sm text-gray-200 bg-gray-800 border border-gray-700">
              {label}
            </div>
          );
        })}
      </div>

      {/* Corps avec heures + colonnes jours */}
      <div className="grid border-t border-gray-700" style={{ gridTemplateColumns: `80px repeat(7, minmax(0, 1fr))` }}>
        {/* Colonne heures */}
        <div className="relative">
          {Array.from({ length: totalHours + 1 }).map((_, i) => {
            const h = hourStart + i;
            return (
              <div
                key={h}
                className="border-b border-gray-800 text-xs text-gray-400 pr-2 h-[60px] flex items-start justify-end"
                style={{ height: `${HOUR_PX}px` }}
              >
                <span className="-translate-y-2">{h}:00</span>
              </div>
            );
          })}
        </div>

        {/* 7 colonnes jours */}
        {days.map((d, i) => {
          const dateKey = d.toISOString().slice(0, 10);
          const dayEvents = byDay.get(dateKey) ?? [];
          const placed = assignLanes(dayEvents);

          return (
            <div key={i} className="relative border-l border-gray-800">
              {/* lignes de fond par heure */}
              {Array.from({ length: totalHours }).map((_, idx) => (
                <div
                  key={idx}
                  className="absolute left-0 right-0 border-b border-gray-800"
                  style={{
                    top: `${idx * HOUR_PX}px`,
                    height: `${HOUR_PX}px`,
                  }}
                />
              ))}

              {/* événements */}
              {placed.map((ev) => {
                const start = new Date(ev.startTime);
                const end = new Date(ev.endTime);
                // contraint à la fenêtre heureStart/heureEnd
                const dayStart = new Date(d); dayStart.setHours(hourStart, 0, 0, 0);
                const dayEnd = new Date(d); dayEnd.setHours(hourEnd, 0, 0, 0);

                const visibleStart = start < dayStart ? dayStart : start;
                const visibleEnd = end > dayEnd ? dayEnd : end;

                const topMin = minutesSinceMidnight(visibleStart) - hourStart * 60;
                const bottomMin = minutesSinceMidnight(visibleEnd) - hourStart * 60;
                const heightMin = Math.max(30, bottomMin - topMin); // min 30min visuel

                const bg = TYPE_BG[ev.type] ?? TYPE_BG.OTHER;
                const text = TYPE_TEXT[ev.type] ?? TYPE_TEXT.OTHER;

                const gap = 4; // gap entre colonnes d'overlap
                const widthPct = 100 / ev.laneCount;
                const leftPct = ev.lane * widthPct;

                return (
                  <div
                    key={String(ev.id)}
                    className={`absolute rounded-md shadow-md p-2 ${bg} ${text} border border-white/10 cursor-pointer hover:opacity-90 transition-opacity`}
                    style={{
                      top: `${topMin * MINUTE_PX}px`,
                      height: `${heightMin * MINUTE_PX}px`,
                      left: `calc(${leftPct}% + ${ev.lane ? gap : 0}px)`,
                      width: `calc(${widthPct}% - ${gap + (ev.laneCount - ev.lane - 1 ? gap : 0)}px)`,
                      overflow: 'hidden',
                    }}
                    title={ev.description ?? ev.title}
                    onClick={() => onEventClick?.(ev)}
                  >
                    <div className="text-[11px] font-semibold leading-tight truncate">{ev.title}</div>
                    <div className="text-[10px] opacity-90 leading-tight">
                      {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {ev.description && <div className="text-[10px] opacity-90 line-clamp-2">{ev.description}</div>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* Légende */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {Object.entries(TYPE_BG).map(([type, cls]) => (
          <div key={type} className="flex items-center gap-2">
            <span className={`inline-block w-3 h-3 rounded ${cls}`} />
            <span className="text-gray-300">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};