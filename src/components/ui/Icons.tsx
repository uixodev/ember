interface P { size?: number }
const base = (size = 20) => ({ width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true as const });

export const IconHome = ({ size }: P) => (<svg {...base(size)}><path fill="currentColor" fillRule="evenodd" d="M4 11l8-7 8 7v9h-5v-6H9v6H4z" /></svg>);
export const IconAreas = ({ size }: P) => (<svg {...base(size)}><path fill="currentColor" fillRule="evenodd" d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /></svg>);
export const IconHistory = ({ size }: P) => (<svg {...base(size)}><path fill="currentColor" fillRule="evenodd" d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 3h2v5.4l3.5 2.1-1 1.7L11 13.6z" /></svg>);
export const IconBadges = ({ size }: P) => (<svg {...base(size)}><path fill="currentColor" fillRule="evenodd" d="M12 3l7 4v6c0 4-3 7-7 8-4-1-7-4-7-8V7z" /></svg>);
export const IconBack = ({ size }: P) => (<svg {...base(size)}><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>);
export const IconChevron = ({ size }: P) => (<svg {...base(size)}><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>);
export const IconPlus = ({ size }: P) => (<svg {...base(size)}><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>);
export const IconMinus = ({ size }: P) => (<svg {...base(size)}><path d="M5 12h14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>);
export const IconClose = ({ size }: P) => (<svg {...base(size)}><path d="M5 5l14 14M19 5L5 19" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>);
export const IconGear = ({ size }: P) => (
  <svg {...base(size)}><path fill="currentColor" fillRule="evenodd" d="M10.3 2h3.4l.5 2.6 1.6.7 2.2-1.5 2.4 2.4-1.5 2.2.7 1.6 2.6.5v3.4l-2.6.5-.7 1.6 1.5 2.2-2.4 2.4-2.2-1.5-1.6.7-.5 2.6h-3.4l-.5-2.6-1.6-.7-2.2 1.5-2.4-2.4 1.5-2.2-.7-1.6L2 13.7v-3.4l2.6-.5.7-1.6-1.5-2.2 2.4-2.4 2.2 1.5 1.6-.7zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" /></svg>
);
export const IconTrash = ({ size }: P) => (<svg {...base(size)}><path fill="currentColor" d="M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 12H7z" /></svg>);
export const IconEdit = ({ size }: P) => (<svg {...base(size)}><path fill="currentColor" d="M4 17.3V20h2.7L18 8.7 15.3 6zM19.7 7a1 1 0 0 0 0-1.4l-1.3-1.3a1 1 0 0 0-1.4 0L16 5.3 18.7 8z" /></svg>);

/** Sun-gradient circle with a white tick: "kept alive". */
export function CheckBadge({ size = 24 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="gCheck" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD84D" /><stop offset="1" stopColor="#FF9A2E" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#gCheck)" />
      <path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
