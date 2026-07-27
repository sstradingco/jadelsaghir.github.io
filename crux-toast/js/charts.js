import { money } from "./analytics.js";

function clearCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || canvas.width;
  const height = canvas.getAttribute("height") || 220;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, width, height);
  return { ctx, width, height: Number(height) };
}

export function drawRevenueChart(canvas, days) {
  const { ctx, width, height } = clearCanvas(canvas);
  if (!days.length) {
    ctx.fillStyle = "#5a6b76";
    ctx.font = "500 14px Figtree, sans-serif";
    ctx.fillText("No dated sales to chart.", 16, 32);
    return;
  }

  const pad = { top: 18, right: 16, bottom: 36, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...days.map((d) => d.net), 1);

  ctx.strokeStyle = "rgba(18,32,42,0.12)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i += 1) {
    const y = pad.top + (plotH * i) / 3;
    ctx.beginPath();
    ctx.moveTo(pad.left, y);
    ctx.lineTo(width - pad.right, y);
    ctx.stroke();
    ctx.fillStyle = "#5a6b76";
    ctx.font = "600 11px Figtree, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(money(max * (1 - i / 3)), pad.left - 8, y + 4);
  }

  const points = days.map((d, i) => {
    const x = pad.left + (days.length === 1 ? plotW / 2 : (plotW * i) / (days.length - 1));
    const y = pad.top + plotH - (d.net / max) * plotH;
    return { x, y, ...d };
  });

  const gradient = ctx.createLinearGradient(0, pad.top, 0, pad.top + plotH);
  gradient.addColorStop(0, "rgba(13,122,111,0.28)");
  gradient.addColorStop(1, "rgba(13,122,111,0.02)");

  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.lineTo(points[points.length - 1].x, pad.top + plotH);
  ctx.lineTo(points[0].x, pad.top + plotH);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  points.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = "#0d7a6f";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  points.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#064941";
    ctx.fill();
  });

  ctx.fillStyle = "#5a6b76";
  ctx.font = "600 11px Figtree, sans-serif";
  ctx.textAlign = "center";
  const labelEvery = Math.ceil(days.length / 6);
  days.forEach((d, i) => {
    if (i % labelEvery !== 0 && i !== days.length - 1) return;
    const label = d.date.slice(5).replace("-", "/");
    ctx.fillText(label, points[i].x, height - 12);
  });
}

export function drawDaypartChart(canvas, dayparts) {
  const { ctx, width, height } = clearCanvas(canvas);
  if (!dayparts.length) {
    ctx.fillStyle = "#5a6b76";
    ctx.font = "500 14px Figtree, sans-serif";
    ctx.fillText("No daypart data available.", 16, 32);
    return;
  }

  const pad = { top: 16, right: 16, bottom: 40, left: 16 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;
  const max = Math.max(...dayparts.map((d) => d.net), 1);
  const gap = 12;
  const barW = (plotW - gap * (dayparts.length - 1)) / dayparts.length;
  const colors = ["#2c5f8a", "#0d7a6f", "#5a7d8c", "#0d7a6f", "#345868", "#7a8790"];

  dayparts.forEach((d, i) => {
    const h = (d.net / max) * plotH;
    const x = pad.left + i * (barW + gap);
    const y = pad.top + plotH - h;
    ctx.fillStyle = colors[i % colors.length];
    ctx.beginPath();
    ctx.roundRect(x, y, barW, h, 8);
    ctx.fill();

    ctx.fillStyle = "#12202a";
    ctx.font = "700 11px Figtree, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(money(d.net), x + barW / 2, y - 6);

    ctx.fillStyle = "#5a6b76";
    ctx.font = "600 11px Figtree, sans-serif";
    ctx.fillText(d.daypart, x + barW / 2, height - 14);
  });
}
