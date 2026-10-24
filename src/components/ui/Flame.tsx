import fire from '../../assets/fire-3d.png';

export function Flame({ size = 24, className }: { size?: number; className?: string }) {
  return <img src={fire} alt="" width={size} height={size} className={className} draggable={false} style={{ flex: 'none' }} />;
}
