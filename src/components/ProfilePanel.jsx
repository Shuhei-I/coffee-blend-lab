import React, { useEffect, useRef } from "react";
import { profileLabels } from "../domain/coffee/profile.js";

export function ProfilePanel({ profile, total }) {
  const canvasRef = useRef(null);
  const dominant = profileLabels.reduce((best, current) => (profile[current[0]] > profile[best[0]] ? current : best));
  const low = profileLabels.reduce((worst, current) => (profile[current[0]] < profile[worst[0]] ? current : worst));

  useEffect(() => {
    drawProfile(canvasRef.current, profile);
  }, [profile]);

  return (
    <section className="panel result-panel" aria-labelledby="resultTitle">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Profile</p>
          <h2 id="resultTitle">味の傾向</h2>
        </div>
        <output className="total-output" data-ok={total === 100}>{total}%</output>
      </div>
      <div className="profile-grid">
        <canvas ref={canvasRef} width="420" height="300" aria-label="味覚プロファイルのレーダーチャート" />
        <div className="metrics">
          {profileLabels.map(([key, label]) => (
            <div className="metric" key={key}>
              <div className="metric-label"><span>{label}</span><span>{profile[key]}</span></div>
              <div className="meter"><span style={{ width: `${profile[key]}%` }} /></div>
            </div>
          ))}
        </div>
      </div>
      <div className="recommendation">
        いまは{dominant[1]}が前に出て、{low[1]}は控えめです。試作では中挽きから始め、香りを残したい場合は湯温を少し下げてください。
      </div>
    </section>
  );
}

function drawProfile(canvas, profile) {
  if (!canvas) return;
  const context = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  const cx = width / 2;
  const cy = height / 2 + 8;
  const radius = 102;
  context.clearRect(0, 0, width, height);
  context.lineWidth = 1;
  context.font = "700 14px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (let ring = 1; ring <= 4; ring += 1) {
    context.beginPath();
    profileLabels.forEach((_, index) => {
      const point = radarPoint(index, (radius * ring) / 4, cx, cy);
      if (index === 0) context.moveTo(point.x, point.y);
      else context.lineTo(point.x, point.y);
    });
    context.closePath();
    context.strokeStyle = ring === 4 ? "#cfc5b7" : "#e8dfd4";
    context.stroke();
  }

  profileLabels.forEach(([, label], index) => {
    const edge = radarPoint(index, radius + 28, cx, cy);
    const axis = radarPoint(index, radius, cx, cy);
    context.beginPath();
    context.moveTo(cx, cy);
    context.lineTo(axis.x, axis.y);
    context.strokeStyle = "#e1d8cc";
    context.stroke();
    context.fillStyle = "#706b62";
    context.fillText(label, edge.x, edge.y);
  });

  context.beginPath();
  profileLabels.forEach(([key], index) => {
    const point = radarPoint(index, radius * (profile[key] / 100), cx, cy);
    if (index === 0) context.moveTo(point.x, point.y);
    else context.lineTo(point.x, point.y);
  });
  context.closePath();
  context.fillStyle = "rgba(18, 101, 107, 0.2)";
  context.strokeStyle = "#12656b";
  context.lineWidth = 3;
  context.fill();
  context.stroke();
}

function radarPoint(index, distance, cx, cy) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / profileLabels.length;
  return {
    x: cx + Math.cos(angle) * distance,
    y: cy + Math.sin(angle) * distance,
  };
}
