import React from 'react';
import { C } from '../utils/constants';

    function BarChart({ data, width = 500, height = 250, barColor = C.navy }) {
      const canvasRef = useRef(null);
      useEffect(() => {
        const ctx = canvasRef.current?.getContext("2d");
        if (!ctx || !data.length) return;
        ctx.clearRect(0, 0, width, height);
        const max = Math.max(...data.map(d => d.value), 1);
        const barW = Math.min(40, (width - 60) / data.length - 8);
        data.forEach((d, i) => {
          const barH = (d.value / max) * (height - 50);
          const x = 50 + i * (barW + 8);
          const y = height - 30 - barH;
          ctx.fillStyle = d.color || barColor;
          ctx.fillRect(x, y, barW, barH);
          ctx.fillStyle = C.gray500;
          ctx.font = "10px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(d.label || "", x + barW / 2, height - 14);
          ctx.fillText(d.displayValue || String(d.value), x + barW / 2, y - 6);
        });
      }, [data, width, height, barColor]);
      return React.createElement("canvas", { ref: canvasRef, width, height, style: { borderRadius: 8, background: C.white } });
    }


export default BarChart;
