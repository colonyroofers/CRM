import React from 'react';
import { C } from '../utils/constants';

    function DonutChart({ data, size = 180, label = "" }) {
      const canvasRef = useRef(null);
      useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.clearRect(0, 0, size, size);
        if (!data || !Array.isArray(data) || data.length === 0) return;
        const total = data.reduce((s, d) => s + (d.value || 0), 0) || 1;
        const cx = size / 2, cy = size / 2, r = size / 2 - 10, innerR = r * 0.6;
        let angle = -Math.PI / 2;
        data.forEach(d => {
          const slice = (d.value / total) * Math.PI * 2;
          ctx.beginPath();
          ctx.arc(cx, cy, r, angle, angle + slice);
          ctx.arc(cx, cy, innerR, angle + slice, angle, true);
          ctx.closePath();
          ctx.fillStyle = d.color;
          ctx.fill();
          angle += slice;
        });
        ctx.fillStyle = C.navy;
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, cx, cy);
      }, [data, size, label]);
      return React.createElement("canvas", { ref: canvasRef, width: size, height: size });
    }

    // ============================================================
    // MODULE: CALENDAR (Multi-source event aggregation)


export default DonutChart;
