import { cursorColor, type Collaborator } from "./collaboration";
export function CollaboratorPointers({ peers, position }: { peers: Collaborator[]; position: (p: Collaborator) => {x: number; y: number} | null }) {
  return <div aria-hidden="true" className="collaborator-pointers">
    {peers.map(peer => {
      const point = position(peer);
      if (!point) return null;
      const color = cursorColor(peer.id);
      return <div key={peer.id} className="collaborator-pointer" style={{ transform: `translate(${point.x}px,${point.y}px)`, color }}>
        <svg width="20" height="24" viewBox="0 0 20 24"><path d="M2 2L17 14L10 15L6 22Z" fill="currentColor" stroke="white" strokeWidth="1.5" /></svg>
        <span style={{ background: color }}>{peer.name}</span>
      </div>;
    })}
  </div>;
}
