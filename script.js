//------------------------------------------------------
// 1) Fonctions utilitaires
//------------------------------------------------------

function updateAllDepartments(data, altMin, altMax, penteMin, penteMax) {

    const result = {};

    for (const depId in data) {

        const depData = data[depId];

        const altBins = depData.alt_bins;
        const penteBins = depData.pente_bins;
        const matrix = depData.matrix;

        let totalParcelles = 0;
        let totalSurface = 0;

        for (let i = 0; i < altBins.length - 1; i++) {
            for (let j = 0; j < penteBins.length - 1; j++) {

                const altLow = altBins[i];
                const altHigh = altBins[i + 1];

                const penteLow = penteBins[j];
                const penteHigh = penteBins[j + 1];

                const altOk = altHigh > altMin && altLow < altMax;
                const penteOk = penteHigh > penteMin && penteLow < penteMax;

                if (altOk && penteOk) {
                    totalParcelles += matrix[i][j].nb_parcelles;
                    totalSurface += matrix[i][j].surface_totale;
                }
            }
        }

        result[depId] = {
            nb_parcelles: totalParcelles,
            surface_totale: Number(totalSurface.toFixed(2))
        };
    }

    return result;
}

function updateDepartmentColors(stats, mode = "surface") {

    let values = [];

    for (const depId in stats) {
        values.push(
            mode === "surface"
                ? stats[depId].surface_totale
                : stats[depId].nb_parcelles
        );
    }

    const min = Math.min(...values);
    const max = Math.max(...values);

    const resultWithColor = {};

    for (const depId in stats) {

        const value = mode === "surface"
            ? stats[depId].surface_totale
            : stats[depId].nb_parcelles;

        let t = (value - min) / (max - min || 1);

        const color = interpolateColor("#4575b4", "#d73027", t);

        resultWithColor[depId] = {
            ...stats[depId],
            color
        };
    }

    return resultWithColor;
}

function interpolateColor(color1, color2, t) {

    const c1 = hexToRgb(color1);
    const c2 = hexToRgb(color2);

    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);

    return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex) {

    hex = hex.replace("#", "");

    return {
        r: parseInt(hex.substring(0, 2), 16),
        g: parseInt(hex.substring(2, 4), 16),
        b: parseInt(hex.substring(4, 6), 16)
    };
}

//------------------------------------------------------
// 2) Chargement des données
//------------------------------------------------------
let dep, depMat, parcelles, color, result;

Promise.all([
  d3.json("files/departements.geojson"),
  d3.json("files/dep_alt_pente_matrix.json"),
  d3.json("files/dep_culture.json")   
]).then(([depData, depMatData, parcellesData]) => {

  dep = depData;
  depMat = depMatData;
  parcelles = parcellesData;  

  initSliders();
  recomputeAndRedraw();
});

//------------------------------------------------------
// 3) Sliders
//------------------------------------------------------

function initSliders() {

    const sliders = [
        ["altMin", "altMinValue"],
        ["altMax", "altMaxValue"],
        ["penteMin", "penteMinValue"],
        ["penteMax", "penteMaxValue"]
    ];

    sliders.forEach(([id, labelId]) => {
        const input = document.getElementById(id);
        const label = document.getElementById(labelId);

        label.textContent = input.value;

        input.addEventListener("input", () => {
            label.textContent = input.value;
            recomputeAndRedraw();
        });
    });
}

//------------------------------------------------------
// 4) Recalcul + redessin
//------------------------------------------------------

function recomputeAndRedraw() {

    const altMin = +document.getElementById("altMin").value;
    const altMax = +document.getElementById("altMax").value;
    const penteMin = +document.getElementById("penteMin").value;
    const penteMax = +document.getElementById("penteMax").value;

    result = updateAllDepartments(depMat, altMin, altMax, penteMin, penteMax);
    color = updateDepartmentColors(result);

    drawMap();
}

//------------------------------------------------------
// 5) Carte D3
//------------------------------------------------------

function drawMap() {
  d3.select("#chart2").selectAll("*").remove();

  const node = createChart2(dep, parcelles, color);
  d3.select("#chart2").append(() => node);
}
//------------------------------------------------------
// 6) Fonction chart2 complète
//------------------------------------------------------


function createChart2(dep, parcelles, color) {

  const width = 975;
  const height = 620;

  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", zoomed);

  const svg = d3.create("svg")
    .attr("viewBox", [0, 0, width, height])
    .attr("width", width)
    .attr("height", height)
    .style("max-width", "100%")
    .style("height", "auto")
    .on("click", reset);

  const projection = d3.geoMercator()
    .fitSize([width, height], dep);

  const path = d3.geoPath().projection(projection);

  const g = svg.append("g");

  const gDeps = g.append("g")
    .attr("class", "departements")
    .attr("cursor", "pointer");

  const gParcelles = g.append("g")
    .attr("class", "parcelles");

  // =====================
  // Départements
  // =====================

  const deps = gDeps.selectAll("path")
    .data(dep.features, d => d.properties.code)
    .join("path")
    .attr("d", path)
    .attr("fill", d => color[d.properties.code]?.color || "#ccc")
    .attr("stroke", "#333")
    .attr("stroke-width", 0.8)
    .on("click", clicked);

  deps.append("title")
    .text(d => `${d.properties.nom} (${d.properties.code})`);

  // Contour global
  g.append("path")
    .datum(dep)
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-linejoin", "round")
    .attr("d", path);

  svg.call(zoom);

  // =====================
  // Reset
  // =====================

  function reset() {

    deps.transition()
      .duration(400)
      .attr("fill", d => color[d.properties.code]?.color || "#ccc");

    gParcelles.selectAll(".parcelle").remove();

    svg.transition()
      .duration(750)
      .call(zoom.transform, d3.zoomIdentity);
  }

  // =====================
  // Click département
  // =====================

  function clicked(event, d) {

    event.stopPropagation();

    const deptCode = d.properties.code;
    const parcellesDept = parcelles[deptCode] || [];
    console.log(deptCode);
    console.log(parcellesDept)
    gParcelles.selectAll(".parcelle").remove();

    const [[x0, y0], [x1, y1]] = path.bounds(d);

    if (parcellesDept.length) {

      const codesCultu = Array.from(
        new Set(parcellesDept.map(p => p.CODE_CULTU))
      );

      const colorScale = d3.scaleOrdinal()
        .domain(codesCultu)
        .range(d3.schemeCategory10);

      gParcelles.selectAll(".parcelle")
        .data(parcellesDept)
        .join("path")
        .attr("class", "parcelle")
        .attr("d", d => path({
          type: "Feature",
          properties: d,
          geometry: d.geometry
        }))
        .style("stroke", "#333")
        .style("stroke-width", 0.3)
        .style("fill", d => colorScale(d.CODE_CULTU))
        .style("opacity", 0)
        .transition()
        .duration(400)
        .style("opacity", 1);
    }

    svg.transition()
      .duration(750)
      .call(
        zoom.transform,
        d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(
            Math.min(
              8,
              0.9 / Math.max(
                (x1 - x0) / width,
                (y1 - y0) / height
              )
            )
          )
          .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
      );
  }

  // =====================
  // Zoom
  // =====================

  function zoomed(event) {
    const { transform } = event;
    g.attr("transform", transform);
    g.attr("stroke-width", 1 / transform.k);
  }

  return svg.node();
}