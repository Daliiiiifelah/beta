import React from 'react';

interface StatHexagonProps {
  speed?: number | null;
  defense?: number | null;
  offense?: number | null;
  passing?: number | null;
  shooting?: number | null;
  dribbling?: number | null;
}

const valueToGrade = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return 'N/A';
  if (value >= 90) return 'S';
  if (value >= 80) return 'A';
  if (value >= 70) return 'B';
  if (value >= 60) return 'C';
  return 'D';
};

const StatHexagon: React.FC<StatHexagonProps> = ({
  speed,
  defense,
  offense,
  passing,
  shooting,
  dribbling,
}) => {
  const coreStats = [
    { name: 'Speed', value: speed, key: 'speed' },
    { name: 'Offense', value: offense, key: 'offense' },
    { name: 'Shooting', value: shooting, key: 'shooting' },
    { name: 'Passing', value: passing, key: 'passing' },
    { name: 'Dribbling', value: dribbling, key: 'dribbling' },
    { name: 'Defense', value: defense, key: 'defense' },
  ];

  const size = 220;
  const center = size / 2;
  const radius = size * 0.4;
  const numLevels = 4;
  const angleSlice = (Math.PI * 2) / 6;

  const getHexagonLayerPoints = (r: number) => {
    return Array.from({ length: 6 }, (_, i) => ({
      x: center + r * Math.cos(angleSlice * i - Math.PI / 2),
      y: center + r * Math.sin(angleSlice * i - Math.PI / 2),
    }));
  };

  const statPolygonPoints = coreStats.map((stat, i) => {
    const statValue = stat.value ?? 0;
    const currentRadius = (Math.min(100, Math.max(0, statValue)) / 100) * radius;
    return {
      x: center + currentRadius * Math.cos(angleSlice * i - Math.PI / 2),
      y: center + currentRadius * Math.sin(angleSlice * i - Math.PI / 2),
    };
  });

  const axisLabels = coreStats.map((stat, i) => {
    const labelRadius = radius * 1.15;
    return {
      x: center + labelRadius * Math.cos(angleSlice * i - Math.PI / 2),
      y: center + labelRadius * Math.sin(angleSlice * i - Math.PI / 2),
      name: stat.name,
      grade: valueToGrade(stat.value),
    };
  });

  const pointsToString = (points: { x: number; y: number }[]) =>
    points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="p-4 bg-input rounded-md shadow">
      <h6 className="text-lg font-semibold text-primary mb-1 text-center">
        Football Attributes
      </h6>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
        {[...Array(numLevels)].map((_, levelIndex) => {
          const r = (radius / numLevels) * (levelIndex + 1);
          const points = getHexagonLayerPoints(r);
          return (
            <polygon
              key={`level-${levelIndex}`}
              points={pointsToString(points)}
              className={`fill-none ${levelIndex === numLevels - 1 ? 'stroke-primary/50' : 'stroke-border/70'}`}
              strokeWidth="1"
            />
          );
        })}
        {getHexagonLayerPoints(radius).map((point, i) => (
          <line
            key={`axis-line-${i}`}
            x1={center}
            y1={center}
            x2={point.x}
            y2={point.y}
            className="stroke-border/70"
            strokeWidth="1"
          />
        ))}
        <polygon
          points={pointsToString(statPolygonPoints)}
          className="fill-accent/50 stroke-accent"
          strokeWidth="2"
        />
        {axisLabels.map((label, i) => (
          <text
            key={`label-${i}`}
            x={label.x}
            y={label.y}
            dy={label.y < center ? -4 : label.y === center ? 4 : 12}
            className="text-xs fill-current text-muted-foreground"
            textAnchor="middle"
          >
            {label.name} <tspan className="font-bold">{`(${label.grade})`}</tspan>
          </text>
        ))}
      </svg>
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Grades: S (90–100), A (80–89), B (70–79), C (60–69), D (0–59)
      </p>
    </div>
  );
};

export default StatHexagon;
