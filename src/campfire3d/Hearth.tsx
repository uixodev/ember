import { useState } from 'react';

/**
 * The Great Hearth, drawn flat. Stage 1 is a simple fire on stones; every stage adds something, in the same order
 * as the designs of the campfires: a second ring, a tripod, torch pillars, an iron ring, orbiting embers, gold,
 * and last a shimmering rainbow.
 */
export function Hearth({ stage }: { stage: number }) {
  const [id] = useState(() => `hh${Math.random().toString(36).slice(2, 7)}`);
  const gold = stage === 7;
  const holo = stage >= 8;
  const pillar = holo ? `url(#${id})` : gold ? '#F2B21E' : '#5F58A8';
  const cap = holo ? `url(#${id}b)` : gold ? '#FFD84D' : '#8F88EC';
  return (
    <svg className="hearth-art" viewBox="0 0 320 240" role="img" aria-label={`Great Hearth, stage ${stage}`}>
      {holo && (
        <defs>
          {[id, `${id}b`].map((gid, k) => (
            <linearGradient key={gid} id={gid} x1="0" y1="0" x2="1" y2="1" spreadMethod="repeat">
              {(k ? ['#D9C6FF', '#A9DCFF', '#B4F5E4', '#FFF2B0', '#FFB8DC', '#D9C6FF'] : ['#FFB8DC', '#D9C6FF', '#A9DCFF', '#B4F5E4', '#FFF2B0', '#FFB8DC']).map((c, i, a) => <stop key={i} offset={i / (a.length - 1)} stopColor={c} />)}
              <animateTransform attributeName="gradientTransform" type="translate" from="0 0" to={k ? '-1 0' : '1 0'} dur={k ? '4s' : '3s'} repeatCount="indefinite" />
            </linearGradient>
          ))}
        </defs>
      )}
      <ellipse cx="160" cy="196" rx="132" ry="26" fill="#241F6E" />
      {stage >= 2 && Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * Math.PI * 2; return <ellipse key={i} cx={160 + Math.cos(a) * 112} cy={194 + Math.sin(a) * 20} rx="12" ry="7" fill={gold ? '#F2B21E' : '#5F58A8'} />; })}
      {stage === 3 && (
        <g stroke="#6B4226" strokeWidth="4" strokeLinecap="round">
          <path d="M70 200 160 40M250 200 160 40M160 206 160 40" />
          <path d="M160 40v26" stroke="#3A3670" strokeWidth="2" />
          <ellipse cx="160" cy="84" rx="20" ry="16" fill="#3A3670" stroke="none" />
        </g>
      )}
      {stage >= 4 && [60, 260, 98, 222].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i < 2 ? 160 : 140})`}>
          <rect x="-9" y="-6" width="18" height={i < 2 ? 54 : 44} rx="2" fill={pillar} />
          <rect x="-13" y="-12" width="26" height="8" rx="2" fill={cap} />
          <path d="M0-40C6-30 9-24 5-16 3-12-3-12-5-16-9-24-6-30 0-40Z" fill="#FF9A2E" />
          <path d="M0-30C3-24 4-20 2-16-1-14-3-14-4-17-5-22-3-26 0-30Z" fill="#FFE98A" />
        </g>
      ))}
      {stage >= 5 && <ellipse cx="160" cy="176" rx="118" ry="24" fill="none" stroke={holo ? `url(#${id})` : gold ? '#F2B21E' : '#3A3670'} strokeWidth="5" />}
      {stage >= 6 && (
        <g>
          {Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * Math.PI * 2; return <circle key={i} className="hearth-orbit" style={{ animationDelay: `${-i * 0.35}s` }} cx={160 + Math.cos(a) * 92} cy={120 + Math.sin(a) * 16} r="4" fill={holo ? '#D9C6FF' : i % 2 ? '#FFD25A' : '#FF9A2E'} />; })}
        </g>
      )}
      <g className="hearth-logs">
        <rect x="102" y="170" width="116" height="16" rx="8" fill="#7A4A2A" transform="rotate(-12 160 178)" />
        <rect x="102" y="170" width="116" height="16" rx="8" fill="#5C3720" transform="rotate(12 160 178)" />
      </g>
      <g className="hearth-flame" fill={holo ? undefined : undefined}>
        <path fill={holo ? '#C9B8FF' : '#E8553A'} d="M160 54C166 82 190 100 202 124C214 150 212 172 194 184C184 190 172 192 160 192C148 192 136 190 126 184C108 172 106 150 118 124C126 106 134 100 138 88C142 98 146 102 150 102C148 84 152 68 160 54Z" />
        <path fill={holo ? '#A9DCFF' : '#FF9A2E'} d="M160 96C164 116 182 130 190 148C198 166 196 180 184 187C176 191 168 192 160 192C152 192 144 191 136 187C124 180 122 166 130 148C136 136 144 130 148 120C152 126 156 128 160 128C158 118 158 106 160 96Z" />
        <path fill={holo ? '#B4F5E4' : '#FFD25A'} d="M160 134C163 148 174 156 178 168C182 178 178 186 170 190C166 191 163 192 160 192C157 192 154 191 150 190C142 186 138 178 142 168C146 156 157 148 160 134Z" />
        <path fill={holo ? '#FFFFFF' : '#FFF1B0'} d="M160 166C163 172 168 176 169 182C170 188 166 191 160 191C154 191 150 188 151 182C152 176 157 172 160 166Z" />
      </g>
      {stage >= 7 && <ellipse className="hearth-crown" cx="160" cy="46" rx="62" ry="10" fill="none" stroke={holo ? '#FFFFFF' : '#FFE98A'} strokeWidth="4" />}
      {stage >= 8 && <ellipse className="hearth-crown" cx="160" cy="46" rx="38" ry="6" fill="none" stroke="#fff" strokeWidth="2.500" />}
    </svg>
  );
}
