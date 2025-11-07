import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

type SeriesSpec = { key: string; name?: string; fill?: string; stroke?: string; barSize?: number };

type Props = {
  data: Array<Record<string, any>>;
  xKey: string;
  series: SeriesSpec[]; // one or more series to render as bars
  height?: number;
};

const ChartComponent: React.FC<Props> = ({ data, xKey, series, height = 260 }) => {
  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} barGap={8}>
          <CartesianGrid strokeDasharray="3 3" stroke="#fcd9b6" />
          <XAxis dataKey={xKey} tick={{ fill: "#8b5e3c" }} />
          <YAxis tick={{ fill: "#8b5e3c" }} />
          <Tooltip contentStyle={{ backgroundColor: "#fff7ed", borderColor: "#d97706" }} />
          {series.map((s, idx) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              fill={s.fill ?? (idx === 0 ? "#c47c3a" : "#f59e0b")}
              stroke={s.stroke ?? (idx === 0 ? "#7c3e1d" : "#b45309")}
              barSize={s.barSize ?? 30}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default ChartComponent;
