import Link from 'next/link';

const mechanics = [
  {
    href: '/play/world-of-1000',
    title: 'The World of 1,000',
    description:
      'Estimate how many of 1,000 people share a trait — children, farmers, internet users — and see how your intuition holds up.',
    icon: '🌍',
    badge: 'Estimation',
    color: 'border-emerald-300 hover:border-emerald-500',
    badgeColor: 'bg-emerald-100 text-emerald-800',
  },
  {
    href: '/play/estimate-explain',
    title: 'Estimate → Explain → Reveal',
    description:
      'Make your estimate, then explain your reasoning before the answer is revealed. Good thinking gets rewarded even when your number is off.',
    icon: '🧠',
    badge: 'Reasoning',
    color: 'border-blue-300 hover:border-blue-500',
    badgeColor: 'bg-blue-100 text-blue-800',
  },
  {
    href: '/play/world-in-a-box',
    title: 'The World in a Box',
    description:
      'A rectangle represents 1,000 people. Drag to divide it — children vs. adults, urban vs. rural — and watch the world take shape.',
    icon: '📦',
    badge: 'Visual',
    color: 'border-amber-300 hover:border-amber-500',
    badgeColor: 'bg-amber-100 text-amber-800',
  },
  {
    href: '/play/daily',
    title: 'Daily World Question',
    description:
      'One topic per day, explored through a chain of 3–5 connected questions. Come back tomorrow for a new chain.',
    icon: '📅',
    badge: 'Daily',
    color: 'border-rose-300 hover:border-rose-500',
    badgeColor: 'bg-rose-100 text-rose-800',
  },
];

export default function HomePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="text-7xl">🌍</div>
        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">
          What if the world<br />had just{' '}
          <span className="text-emerald-600">1,000 people?</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-xl mx-auto leading-relaxed">
          Planet1000 shrinks the entire planet down to 1,000 people so you can
          develop real intuition for the size, structure, and resources of human civilization.
        </p>
      </div>

      {/* Quick-start CTA */}
      <div className="flex justify-center gap-4 flex-wrap">
        <Link
          href="/play/world-of-1000"
          className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold text-lg hover:bg-emerald-700 active:scale-95 transition-all"
        >
          Start Playing →
        </Link>
        <Link
          href="/play/daily"
          className="inline-flex items-center gap-2 bg-white text-emerald-700 border-2 border-emerald-600 px-6 py-3 rounded-xl font-semibold text-lg hover:bg-emerald-50 active:scale-95 transition-all"
        >
          📅 Today&apos;s Chain
        </Link>
      </div>

      {/* Mechanics grid */}
      <div className="space-y-3">
        <h2 className="text-xl font-bold text-slate-800">Choose a game mode</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {mechanics.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={`bg-white rounded-2xl border-2 p-5 transition-all duration-150 shadow-sm hover:shadow-md ${m.color} group`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-3xl">{m.icon}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.badgeColor}`}>
                  {m.badge}
                </span>
              </div>
              <h3 className="font-bold text-slate-800 text-base mb-1 group-hover:text-emerald-700 transition-colors">
                {m.title}
              </h3>
              <p className="text-sm text-slate-500 leading-relaxed">{m.description}</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Fun facts teaser */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-3">
        <h2 className="font-bold text-emerald-800">In a world of 1,000 people…</h2>
        <ul className="space-y-1.5 text-sm text-emerald-900">
          <li>• <strong>257</strong> are children under 15</li>
          <li>• <strong>570</strong> live in cities</li>
          <li>• <strong>4</strong> are doctors</li>
          <li>• <strong>87</strong> survive on under $2.15/day</li>
          <li>• <strong>670</strong> have internet access</li>
          <li>• <strong>280</strong> work in agriculture</li>
        </ul>
        <p className="text-xs text-emerald-700 mt-2">
          Every number here is real — scaled from the actual world population.
        </p>
      </div>
    </div>
  );
}
