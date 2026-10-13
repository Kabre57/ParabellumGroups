'use client';


export function SectionIntro({
  title,
  description,
  accentClassName,
}: {
  title: string;
  description: string;
  accentClassName: string;
}) {
  return (
    <div className={`mb-4 rounded-xl border p-4 shadow-sm ${accentClassName}`}>
      <h3 className="text-sm font-semibold uppercase tracking-wide">{title}</h3>
      <p className="mt-2 text-sm leading-6">{description}</p>
    </div>
  );
}