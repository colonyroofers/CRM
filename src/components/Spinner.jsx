import { C } from '../utils/constants';

const Spinner = ({ size = 16, color = C.white }) => (
  <span style={{ display: "inline-block", width: size, height: size, border: `2px solid ${color}40`, borderTopColor: color, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
);

export default Spinner;
