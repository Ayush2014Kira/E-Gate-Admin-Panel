// Nested outlines of the E-Gate hexagon, used as background decoration.
const HexArt = ({ className }) => (
  <svg className={className} viewBox="0 0 200 200" fill="none" aria-hidden="true">
    {[96, 74, 52, 30].map((r) => {
      const h = r * 0.866;
      const points = `100,${100 - r} ${100 + h},${100 - r / 2} ${100 + h},${100 + r / 2} 100,${100 + r} ${100 - h},${100 + r / 2} ${100 - h},${100 - r / 2}`;
      return <polygon key={r} points={points} stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />;
    })}
  </svg>
);

export default HexArt;
