// Shifting Temperatures — D3 map of CMIP6 CESM2 temperature change.
// Data is prepared by scripts/prepare_data.py (5° cells, anomaly vs 1850–1900).

const W = 960, H = 470;
const fmt = v => { const r = Math.round(v * 10) / 10; return (r > 0 ? "+" : r < 0 ? "−" : "±") + Math.abs(r).toFixed(1) + " °C"; };
const SCEN_NAME = { ssp126: "low emissions (SSP1-2.6)", ssp585: "high emissions (SSP5-8.5)" };
const SCEN_COLOR = { ssp126: "#2b7bba", ssp585: "#c0392b" };

// Diverging scale centered on 0. Warming reaches much further than cooling, so the
// red half covers 0..15 °C and the blue half 0..−5 °C; the legend shows the mapping.
const color = d3.scaleDiverging([-5, 0, 15], t => d3.interpolateRdBu(1 - t)).clamp(true);

const state = { scenario: "ssp585", year: 2100, hover: null };

Promise.all([d3.json("data/temps.json"), d3.json("data/land-110m.json")]).then(([data, world]) => {
  const { cell, lats, lons } = data;
  const years = d3.range(1850, 2101);
  const nHist = data.years.historical.length; // 1850..2014

  // series[scenario][yearIndex] -> array of cell anomalies (°C)
  const series = {};
  for (const s of ["ssp126", "ssp585"]) {
    series[s] = [...data.anom.historical, ...data.anom[s]].map(row => row.map(v => v / 10));
  }
  const globalSeries = {};
  for (const s of ["ssp126", "ssp585"]) globalSeries[s] = [...data.global.historical, ...data.global[s]];

  // ---- cells as GeoJSON polygons (clockwise; extra points so edges follow parallels)
  const cells = [];
  lats.forEach((lat, i) => lons.forEach((lon, j) => {
    const ring = [];
    for (let y = lat; y <= lat + cell; y += cell) ring.push([lon, y]);          // west edge, north
    for (let x = lon; x <= lon + cell; x += 1) ring.push([x, lat + cell]);       // north edge, east
    for (let y = lat + cell; y >= lat; y -= cell) ring.push([lon + cell, y]);   // east edge, south
    for (let x = lon + cell; x >= lon; x -= 1) ring.push([x, lat]);              // south edge, west
    cells.push({
      idx: i * lons.length + j, lat, lon,
      geometry: { type: "Polygon", coordinates: [ring] }, type: "Feature",
    });
  }));

  // ---- map
  const projection = d3.geoEqualEarth().fitExtent([[4, 4], [W - 4, H - 4]], { type: "Sphere" });
  const path = d3.geoPath(projection);
  const svg = d3.select("#map").attr("viewBox", [0, 0, W, H]);
  svg.append("path").attr("class", "sphere").attr("d", path({ type: "Sphere" }));
  const cellSel = svg.append("g").selectAll("path").data(cells).join("path")
    .attr("class", "cell").attr("d", path);
  svg.append("path").attr("class", "land").attr("d", path(topojson.feature(world, world.objects.land)));

  // ---- tooltip with per-cell sparkline
  const tip = d3.select("#tooltip");
  const SW = 220, SH = 80;
  const sx = d3.scaleLinear([1850, 2100], [24, SW - 4]);

  function cellName(d) {
    const ns = v => `${Math.abs(v)}°${v < 0 ? "S" : "N"}`;
    const ew = v => `${Math.abs(v)}°${v < 0 ? "W" : "E"}`;
    return `${ns(d.lat)}–${ns(d.lat + cell)}, ${ew(d.lon)}–${ew(d.lon + cell)}`;
  }

  function showTip(event, d) {
    const yi = state.year - 1850;
    const v = series[state.scenario][yi][d.idx];
    const vals = ["ssp126", "ssp585"].flatMap(s => series[s].map(r => r[d.idx]));
    const sy = d3.scaleLinear(d3.extent([0, ...vals]), [SH - 14, 6]).nice();
    const line = s => d3.line().x((_, i) => sx(years[i])).y(r => sy(r[d.idx]))(series[s]);
    const scenLine = s => `<path d="${line(s)}" fill="none" stroke="${SCEN_COLOR[s]}"
        stroke-width="${s === state.scenario ? 1.8 : 1}" opacity="${s === state.scenario ? 1 : 0.4}"/>`;
    tip.html(`
      <div class="muted">${cellName(d)}</div>
      <div><span class="big">${fmt(v)}</span> in ${state.year}</div>
      <div class="muted">${state.year >= 2015 ? SCEN_NAME[state.scenario] : "historical simulation"} ·
        1850–1900 average ${data.baseline_temp[d.idx].toFixed(1)} °C</div>
      <svg width="${SW}" height="${SH}">
        <line x1="24" x2="${SW - 4}" y1="${sy(0)}" y2="${sy(0)}" stroke="#ccc"/>
        ${scenLine(state.scenario === "ssp126" ? "ssp585" : "ssp126")}${scenLine(state.scenario)}
        <line x1="${sx(state.year)}" x2="${sx(state.year)}" y1="4" y2="${SH - 14}" stroke="#1d1d1f" stroke-dasharray="2,2"/>
        <text x="20" y="${sy.range()[1] + 8}" font-size="10" text-anchor="end" fill="#6b6b70">${sy.domain()[1]}°</text>
        <text x="20" y="${sy(0) + 3}" font-size="10" text-anchor="end" fill="#6b6b70">0°</text>
        <text x="24" y="${SH - 2}" font-size="10" fill="#6b6b70">1850</text>
        <text x="${SW - 4}" y="${SH - 2}" font-size="10" text-anchor="end" fill="#6b6b70">2100</text>
      </svg>`).attr("hidden", null);
    const [mx, my] = d3.pointer(event, document.querySelector(".map-wrap"));
    const box = document.querySelector(".map-wrap").getBoundingClientRect();
    const left = mx + 260 > box.width ? mx - 256 : mx + 16;
    tip.style("left", `${Math.max(0, left)}px`).style("top", `${Math.max(0, my - 40)}px`);
  }

  cellSel
    .on("pointermove", function (event, d) {
      state.hover = d;
      cellSel.classed("hover", c => c === d);
      d3.select(this).raise();
      showTip(event, d);
    })
    .on("pointerleave", () => { state.hover = null; cellSel.classed("hover", false); tip.attr("hidden", true); });

  // ---- legend
  const LW = 360, legend = d3.select("#legend").append("svg").attr("viewBox", [0, 0, LW + 40, 44]).style("max-width", "420px");
  const lx = d3.scaleLinear([-5, 15], [10, LW + 10]);
  const grad = legend.append("defs").append("linearGradient").attr("id", "grad");
  d3.range(0, 1.001, 0.05).forEach(t => grad.append("stop").attr("offset", t).attr("stop-color", color(lx.invert(10 + t * LW))));
  legend.append("rect").attr("x", 10).attr("y", 4).attr("width", LW).attr("height", 12).attr("fill", "url(#grad)");
  legend.append("g").attr("class", "axis").attr("transform", "translate(0,16)")
    .call(d3.axisBottom(lx).tickValues([-5, 0, 5, 10, 15]).tickFormat(v => (v > 0 ? "+" : "") + v + (v === 15 ? "+" : "")).tickSize(4));
  legend.append("text").attr("x", 10).attr("y", 42).text("°C change vs each area’s 1850–1900 average");

  // ---- global mean chart (click/drag sets year)
  const GW = 960, GH = 170, gm = { l: 40, r: 120, t: 10, b: 24 };
  const g = d3.select("#global").attr("viewBox", [0, 0, GW, GH]);
  const gx = d3.scaleLinear([1850, 2100], [gm.l, GW - gm.r]);
  const gy = d3.scaleLinear([-0.5, d3.max(globalSeries.ssp585)], [GH - gm.b, gm.t]).nice();
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${GH - gm.b})`).call(d3.axisBottom(gx).tickFormat(d3.format("d")));
  g.append("g").attr("class", "axis").attr("transform", `translate(${gm.l},0)`).call(d3.axisLeft(gy).ticks(5).tickFormat(v => v + "°"));
  g.append("line").attr("x1", gm.l).attr("x2", GW - gm.r).attr("y1", gy(0)).attr("y2", gy(0)).attr("stroke", "#ddd");
  const gl = d3.line().x((_, i) => gx(years[i])).y(v => gy(v));
  // historical part is shared by both paths, so draw it once in black
  g.append("path").attr("fill", "none").attr("stroke", "#1d1d1f").attr("stroke-width", 1.4)
    .attr("d", gl(globalSeries.ssp585.slice(0, nHist)));
  const glFuture = d3.line().x((_, i) => gx(1850 + nHist - 1 + i)).y(v => gy(v));
  const gPaths = {};
  for (const s of ["ssp126", "ssp585"]) {
    gPaths[s] = g.append("path").attr("fill", "none").attr("stroke", SCEN_COLOR[s])
      .attr("d", glFuture(globalSeries[s].slice(nHist - 1)));
    g.append("text").attr("x", GW - gm.r + 6).attr("y", gy(globalSeries[s].at(-1)) + 4)
      .attr("fill", SCEN_COLOR[s]).attr("font-size", 12).text(s === "ssp126" ? "Low (SSP1-2.6)" : "High (SSP5-8.5)");
  }
  const marker = g.append("line").attr("y1", gm.t).attr("y2", GH - gm.b).attr("stroke", "#1d1d1f").attr("stroke-dasharray", "3,3");
  const dot = g.append("circle").attr("r", 4).attr("fill", "#1d1d1f");
  g.append("rect").attr("x", gm.l).attr("y", 0).attr("width", GW - gm.l - gm.r).attr("height", GH).attr("fill", "transparent")
    .call(d3.drag().on("start drag", e => setYear(Math.round(gx.invert(e.x)))))
    .on("click", e => setYear(Math.round(gx.invert(d3.pointer(e)[0]))));

  // ---- controls
  const slider = d3.select("#year");
  slider.on("input", e => { stop(); setYear(+e.target.value); });
  d3.selectAll("[data-scenario]").on("click", function () {
    state.scenario = this.dataset.scenario;
    update();
  });

  let timer = null;
  const playBtn = d3.select("#play");
  function stop() { if (timer) { timer.stop(); timer = null; playBtn.text("▶ Play"); } }
  playBtn.on("click", () => {
    if (timer) return stop();
    if (state.year >= 2100) setYear(1850);
    playBtn.text("❚❚ Pause");
    timer = d3.interval(() => {
      if (state.year >= 2100) return stop();
      setYear(state.year + 1);
    }, 70);
  });

  function setYear(y) {
    state.year = Math.max(1850, Math.min(2100, y));
    update();
  }

  function update() {
    const yi = state.year - 1850;
    const row = series[state.scenario][yi];
    // stroke matches fill to hide anti-aliasing seams between neighbouring cells
    cellSel.attr("fill", d => color(row[d.idx])).attr("stroke", d => color(row[d.idx]));
    slider.property("value", state.year);
    d3.select("#year-label").text(state.year);
    d3.selectAll("[data-scenario]").attr("aria-pressed", function () { return this.dataset.scenario === state.scenario; });
    d3.select(".scenario").classed("disabled", state.year < 2015);
    const gv = globalSeries[state.scenario][yi];
    d3.select("#readout").html(state.year < 2015
      ? `In <strong>${state.year}</strong>, the world was <strong>${fmt(gv)}</strong> vs 1850–1900 (historical simulation).`
      : `Under <strong>${SCEN_NAME[state.scenario]}</strong>, the world in <strong>${state.year}</strong> is <strong>${fmt(gv)}</strong> vs 1850–1900.`);
    marker.attr("x1", gx(state.year)).attr("x2", gx(state.year));
    dot.attr("cx", gx(state.year)).attr("cy", gy(gv));
    for (const s of ["ssp126", "ssp585"]) gPaths[s].attr("stroke-width", s === state.scenario ? 2.2 : 1).attr("opacity", s === state.scenario ? 1 : 0.45);
    if (state.hover) {
      const node = cellSel.filter(d => d === state.hover).node();
      if (node) { const r = node.getBoundingClientRect(); showTip({ clientX: r.x + r.width / 2, clientY: r.y + r.height / 2, target: node }, state.hover); }
    }
  }

  update();
});
