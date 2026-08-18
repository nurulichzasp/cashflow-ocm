export default function PrahTrekLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-28 rounded-2xl bg-stone-100 dark:bg-white/[0.05]" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-xl bg-stone-100 dark:bg-white/[0.05]" />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-stone-100 dark:bg-white/[0.05]" />
    </div>
  )
}
