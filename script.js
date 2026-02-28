let selectedParcelle = null;

const tooltip = d3.select("body")
    .append("div")
    .attr("class", "tooltip-culture")
    .style("position", "absolute")
    .style("padding", "6px 10px")
    .style("background", "white")
    .style("border", "1px solid #333")
    .style("border-radius", "4px")
    .style("font-size", "12px")
    .style("pointer-events", "none")
    .style("opacity", 0);






function updateSelection() {

    d3.selectAll(".parcelle-point")
        .attr("stroke", d => d.id === selectedParcelle ? "red" : "#222")
        .attr("stroke-width", d => d.id === selectedParcelle ? 2 : 0.3);

    d3.selectAll(".point")
        .attr("stroke", d => d.id === selectedParcelle ? "red" : "none")
        .attr("stroke-width", d => d.id === selectedParcelle ? 2 : 0);
}

function reinitialise(){
    d3.selectAll(".parcelle-point")
        .attr("stroke", "#222")
        .attr("stroke-width", 0.3);

    d3.selectAll(".graphe-point")
        .attr("stroke", "none")
        .attr("stroke-width", 0.3);
}

function highlight(id) {


    // Highlight parcelle
    d3.select(`#parcelle-${id}-pente`)
        .attr("stroke", "#0066ff")
        .attr("stroke-width", 0.4);

    d3.select(`#parcelle-${id}-altitude`)
        .attr("stroke", "#0066ff")
        .attr("stroke-width", 0.4);


    // Highlight graphe
    d3.select(`#graphe-${id}`)
        .attr("stroke", "black")
        .attr("stroke-width", 2);
    
    d3.select(`#parcelle-${id}-pente`).raise();
    d3.select(`#parcelle-${id}-altitude`).raise();
    d3.select(`#graphe-${id}`).raise();
}

function createDepartmentGraph(
    depGeo,
    dataMatrix,
    parcellesGeo,
    containerId,
    sliderId,
    title,
    type = "altitude",
    mode = "surface",
    minVal = 0,
    maxVal = 1000
) {

    d3.select(containerId).selectAll("*").remove();

    let width = document.querySelector(containerId).clientWidth;
    const height = 600;

    let currentDept = null;

    const svg = d3.select(containerId)
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    const projection = d3.geoMercator().fitSize([width, height], depGeo);
    const path = d3.geoPath().projection(projection);

    const g = svg.append("g");
    const gDeps = g.append("g");
    const gParcelles = g.append("g");

    const stats = updateAllDepartments(dataMatrix, minVal, maxVal, type, mode);
    const { scale, min, max, colorByDept } = createColorScale(stats, type);

    const deps = gDeps.selectAll("path")
        .data(depGeo.features)
        .join("path")
        .attr("d", path)
        .attr("stroke", "#333")
        .attr("fill", d => colorByDept[d.properties.code])
        .on("click", clicked);

    createLegend(containerId, scale, min, max, mode);

    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
        });

    svg.call(zoom);

    const sliderDiv = document.getElementById(sliderId);

    noUiSlider.create(sliderDiv, {
        start: [minVal, maxVal],
        connect: true,
        range: { min: minVal, max: maxVal },
        step: type === "altitude" ? 100 : 1
    });

    sliderDiv.noUiSlider.on("update", values => {
        const [minS, maxS] = values.map(Number);
        document.getElementById(type === "altitude"?"min-alt":"min-pente").textContent = Math.round(values[0]);
        document.getElementById(type === "altitude"?"max-alt":"max-pente").textContent = Math.round(values[1]);


        const stats = updateAllDepartments(dataMatrix, minS, maxS, type, mode);
        const { scale, min, max, colorByDept } = createColorScale(stats, type);

        deps.transition().duration(300)
            .attr("fill", d => colorByDept[d.properties.code]);

        createLegend(containerId, scale, min, max, mode);

        updateParcelles();
    });

      const cultureColors = {
  "AAR": "#8d3b72","ACP": "#8d3b72","AFG": "#8d3b72","AGR": "#f4a261","AIL": "#f4a261",
  "AME": "#e9c46a","ARA": "#8d3b72","ARP": "#e9c46a","ART": "#e9c46a","AVH": "#2a9d8f",
  "AVP": "#2a9d8f","BDH": "#f4a261","BDP": "#f4a261","BFS": "#2a9d8f","BOR": "#8d3b72",
  "BTA": "#f4a261","BTH": "#f4a261","BTN": "#2a9d8f","BTP": "#2a9d8f","CAE": "#f4a261",
  "CAG": "#f4a261","CAH": "#f4a261","CAR": "#f4a261","CBT": "#f4a261","CCN": "#f4a261",
  "CEE": "#f4a261","CEL": "#f4a261","CHU": "#8d3b72","CHV": "#8d3b72","CID": "#8d3b72",
  "CIT": "#e9c46a","CML": "#f4a261","CPL": "#8d3b72","CSE": "#f4a261","CSS": "#f4a261",
  "CTG": "#f4a261","CZH": "#8d3b72","CZP": "#8d3b72","EPE": "#f4a261","EPI": "#f4a261",
  "FEV": "#e9c46a","FLA": "#2d6a4f","FLP": "#2d6a4f","FNU": "#2d6a4f","FRA": "#e9c46a",
  "FVL": "#f4a261","FVP": "#f4a261","GES": "#f4a261","GRA": "#2a9d8f","HBL": "#2a9d8f",
  "HPC": "#f4a261","JAC": "#8d3b72","JNO": "#8d3b72","LAV": "#6a4c93","LBF": "#f4a261",
  "LDH": "#f4a261","LDP": "#f4a261","LEC": "#f4a261","LIF": "#2d6a4f","LIH": "#f4a261",
  "LIP": "#2d6a4f","LOT": "#e9c46a","LUZ": "#2a9d8f","MCR": "#f4a261","MCS": "#f4a261",
  "MDI": "#2d6a4f","MID": "#2d6a4f","MIS": "#6a4c93","MLC": "#6a4c93","MLF": "#6a4c93",
  "MLG": "#8d3b72","MLO": "#2d6a4f","MLT": "#6a4c93","MOH": "#f4a261","MOT": "#2a9d8f",
  "MPC": "#f4a261","MRS": "#f4a261","MSW": "#6a4c93","NOS": "#2a9d8f","NOX": "#6a4c93",
  "NVT": "#6a4c93","OAG": "#f4a261","OEI": "#f4a261","OHR": "#f4a261","OIG": "#f4a261",
  "OLI": "#e9c46a","ORH": "#f4a261","ORP": "#8d3b72","PAG": "#8d3b72","PCH": "#2d6a4f",
  "PEP": "#e9c46a","PEV": "#e9c46a","PFR": "#e9c46a","PHF": "#e9c46a","PHI": "#8d3b72",
  "PHS": "#f4a261","PME": "#f4a261","POR": "#8d3b72","POT": "#2d6a4f","PPH": "#f4a261",
  "PPP": "#f4a261","PPR": "#f4a261","PRF": "#8d3b72","PRU": "#e9c46a","PSL": "#f4a261",
  "PTC": "#f4a261","PTR": "#f4a261","PVP": "#f4a261","PVT": "#2a9d8f","PWT": "#f4a261",
  "RDI": "#8d3b72","RIZ": "#f4a261","SAG": "#8d3b72","SAI": "#8d3b72","SBO": "#f4a261",
  "SGH": "#8d3b72","SGP": "#8d3b72","SIN": "#8d3b72","SNE": "#8d3b72","SNU": "#f4a261",
  "SOG": "#f4a261","SOJ": "#f4a261","SPH": "#8d3b72","SPL": "#e9c46a","SRS": "#2a9d8f",
  "TAB": "#6a4c93","TBT": "#f4a261","TCR": "#2d6a4f","TOM": "#2d6a4f","TRE": "#e9c46a",
  "TRN": "#e9c46a","TRU": "#e9c46a","TTH": "#f4a261","TTP": "#f4a261","VES": "#e9c46a",
  "VRC": "#8d3b72","VRG": "#2a9d8f"
};

    function updateParcelles() {

        if (!currentDept) return;

        const deptCode = currentDept.properties.code;
        const parcellesDept = parcellesGeo[deptCode] || [];


        const [borneMin, borneMax] = sliderDiv.noUiSlider.get().map(Number);

        const parcellesFiltered = parcellesDept.filter(p => {
            const val = type === "altitude"
                ? p["altitude_moyenne"]
                : p["pente_moyenne"];
            return val >= borneMin && val <= borneMax;
        });
        const r = d3.scaleLog()
        .domain(d3.extent(parcellesFiltered, d => Math.max(+d.surface_totale || 0, 1)))
        .range([1, 3]);
        const colorScale = d3.scaleOrdinal()
            .domain(Object.keys(cultureColors))
            .range(Object.values(cultureColors));
        gParcelles.append("rect")
        .attr("class","graph-background")
        .attr("x",0)
        .attr("y",0)
        .attr("width",width)
        .attr("height",height)
        .attr("fill","transparent")

        const points = gParcelles.selectAll(".parcelle-point")
    .data(parcellesFiltered, d => d.id || d.geometry.coordinates)
    .join(
        enter => enter.append("circle")
            .on("click", (event, d) => {
                event.stopPropagation();
                selectedParcelle = d.id;
                updateSelection();
                reinitialise();
                highlight(d.id);
            })
            .attr("class", "parcelle-point")
            .attr("r", d => r(d.surface_totale))
            .attr("fill", d => colorScale(d.CODE_CULTU))
            .attr("id", d => `parcelle-${d.id}-${type}`)
            .attr("stroke", "#222")
            .attr("stroke-width", 0.3)
            .attr("opacity", 0.9)
            .attr("cx", d => projection([
                d.geometry.coordinates[0][0][0],
                d.geometry.coordinates[0][0][1]
            ])[0])
            .attr("cy", d => projection([
                d.geometry.coordinates[0][0][0],
                d.geometry.coordinates[0][0][1]
            ])[1])
            .on("mouseover", (event, d) => {
                const code = d.CODE_CULTU;
                const label = cultureLabels[code] || "Inconnu";

                tooltip.style("opacity", 1)
                    .html(`<strong>${code}</strong><br>${label}`);
            })
            .on("mousemove", (event) => {
                tooltip
                    .style("left", (event.pageX + 12) + "px")
                    .style("top", (event.pageY + 12) + "px");
            })
            .on("mouseout", () => {
                tooltip.style("opacity", 0);
            })
    );

       
        


const lasso = d3.lasso()
  .items(points)
  .area(gParcelles)
  .on("start", () => {
    reinitialise();
    points.classed("lasso-selected", false)
          .classed("lasso-not-selected", false);

  })
  .on("end", () => {

    const selected = points.filter(function () {
      return d3.select(this).classed("lasso-selected");
    });

    points.classed("lasso-not-selected", true);
    selected.classed("lasso-not-selected", false);

    selected.each(function (d) {
      highlight(d.id);
    });

  });

gParcelles.call(lasso);

        createCultureLegend(svg, width);
    }

function drawScatterPlot(parcelles) {

    d3.select("#graph-container").selectAll("*").remove();

    if (!parcelles || parcelles.length === 0) return;

    const margin = { top: 20, right: 150, bottom: 40, left: 50 };
    const width = 600 - margin.left - margin.right;
    const height = 300 - margin.top - margin.bottom;

    const svgGraph = d3.select("#graph-container")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("stroke", "none")
        .attr("stroke-width", 0)
    // --- échelle taille ---
    const r = d3.scaleLog()
    .domain(d3.extent(parcelles, d => Math.max(+d.surface_totale || 0, 0.1)))
    .range([2, 12]);

    svgGraph.style("pointer-events","all");
    // --- échelles ---
    const x = d3.scaleLinear()
        .domain(d3.extent(parcelles, d => d.altitude_moyenne || 0))
        .nice()
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain(d3.extent(parcelles, d => d.pente_moyenne || 0))
        .nice()
        .range([height, 0]);
    
    // --- axes ---
    svgGraph.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svgGraph.append("g")
        .call(d3.axisLeft(y));

    svgGraph.append("rect")
    .attr("class","graph-background")
    .attr("x",0)
    .attr("y",0)
    .attr("width",width)
    .attr("height",height)
    .attr("fill","transparent")
    // --- points ---
    const graphepoint = svgGraph.selectAll("circle.point")
        .data(parcelles)
        .enter()
        .append("circle")
        .on("click", (event, d) => {
    event.stopPropagation();
    selectedParcelle = d.id;
    console.log(selectedParcelle)
    updateSelection();      // ton ancien code
    reinitialise();
    highlight(d.id);        // ajout
})
        .attr("class", "point")
        .attr("cx", d => x(d.altitude_moyenne))
        .attr("cy", d => y(d.pente_moyenne))
        .attr("r", d => r(d.surface_totale))
        .attr("fill", d => cultureColors[d.CODE_CULTU] ?? "#888")
        .attr("opacity", 0.7)
        .attr("id", d => `graphe-${d.id}`)
        .on("mouseover", (event, d) => {
            const code = d.CODE_CULTU;
            const label = cultureLabels[code] || "Inconnu";

            tooltip
                .style("opacity", 1)
                .html(`<strong>${code}</strong><br>${label}`);
        })

        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })

        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });

    // --- labels axes ---
    svgGraph.append("text")
        .attr("x", width / 2)
        .attr("y", height + 35)
        .attr("text-anchor", "middle")
        .text("Altitude moyenne");




    svgGraph.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Pente moyenne");

// --- Lasso pour le graphe ---
const lasso2 = d3.lasso()
  
  .items(graphepoint)   // tous les points du graphe
  .area(svgGraph)       // zone de lasso = SVG du graphe
  .on("start", () => {
        
      // réinitialiser uniquement le graphe
      graphepoint.classed("lasso-selected", false)
                   .classed("lasso-not-selected", false);
      // si tu veux réinitialiser visuellement la carte, tu peux le faire ici, sinon laisse
  })
  
  .on("end", () => {
      // points sélectionnés dans le graphe
      const selected = graphepoint.filter(function () {
          return d3.select(this).classed("lasso-selected");
      });

      // optionnel : style des non sélectionnés
      graphepoint.classed("lasso-not-selected", true);
      selected.classed("lasso-not-selected", false);

      // appliquer highlight à chaque point sélectionné
      selected.each(function(d) {
          highlight(d.id);
      });
  });

// APPLIQUER LE LASSO UNE SEULE FOIS
svgGraph.call(lasso2);

    // --- légende tailles ---
    const surfaces = parcelles
    .map(d => Math.max(+d.surface_totale || 0, 0.1))
    .sort((a, b) => a - b);
    console.log(surfaces)
    const minSurface = d3.min(surfaces);
    const maxSurface = d3.max(surfaces);

    const logScale = d3.scaleLog()
        .domain([minSurface, maxSurface])
        .range([0, 1]);

    const sizeLegendValues = [
        logScale.invert(0.2),
        logScale.invert(0.4),
        logScale.invert(0.6),
        logScale.invert(0.8),
        logScale.invert(1)
];

    const legendX = width + 40;
    const legendY = 20;

    const legend = svgGraph.append("g")
        .attr("class", "size-legend")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    legend.selectAll("circle")
        .data(sizeLegendValues)
        .enter()
        .append("circle")
        .attr("cy", (d, i) => i * 40)
        .attr("r", d => r(d))
        .attr("fill", "none")
        .attr("stroke", "#555");

    legend.selectAll("text")
        .data(sizeLegendValues)
        .enter()
        .append("text")
        .attr("x", 30)
        .attr("y", (d, i) => i * 40 + 5)
        .text(d => `${Math.round(d)} hectare`)
        .style("font-size", "12px")
        .style("fill", "#333");
}


function clicked(event, d) {
    event.stopPropagation();
    console.log(d)
    // Si on clique sur le même département → dézoom + reset
    if (currentDept && currentDept.properties.code === d.properties.code) {

        currentDept = null;
        d3.select("#graph-container").selectAll("*").remove();
        // Supprimer les parcelles
        gParcelles.selectAll(".parcelle-point").remove();

        // Supprimer la légende
        svg.selectAll(".legend-culture").remove();

        // Cacher le tooltip
        tooltip.style("opacity", 0);

        // Dézoomer
        svg.transition()
            .duration(750)
            .call(
                zoom.transform,
                d3.zoomIdentity
            );

        return;
    }

    // Sinon comportement normal : zoom sur le département
    currentDept = d;
    updateParcelles();
    // Récupérer les parcelles filtrées du département
    const parcellesDept = parcellesGeo[d.properties.code] || [];
    // Tracer le graphe
    drawScatterPlot(parcellesDept);

    const [[x0, y0], [x1, y1]] = path.bounds(d);

    svg.transition()
        .duration(750)
        .call(
            zoom.transform,
            d3.zoomIdentity
                .translate(width / 2, height / 2)
                .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
                .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
        );
}
    svg.on("click", () => {
        currentDept = null;
        gParcelles.selectAll(".parcelle-point").remove();
        removeCultureLegend(svg);
         
         tooltip.style("opacity", 0);

        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });

    function resizeMap() {
        width = document.querySelector(containerId).clientWidth;

        svg.attr("width", width);

        projection.fitSize([width, height], depGeo);

        gDeps.selectAll("path").attr("d", path);

        gParcelles.selectAll(".parcelle-point")
            .attr("cx", d => projection([
                d.geometry.coordinates[0][0][0],
                d.geometry.coordinates[0][0][1]
            ])[0])
            .attr("cy", d => projection([
                d.geometry.coordinates[0][0][0],
                d.geometry.coordinates[0][0][1]
            ])[1]);

        svg.selectAll(".legend-culture")
            .attr("transform", `translate(${width - 180}, 20)`);
    }

    window.addEventListener("resize", resizeMap);
}

function createCultureLegend(svg, width) {
    svg.selectAll(".legend-culture").remove();

    const legendG = svg.append("g")
        .attr("class", "legend-culture")
        .attr("transform", `translate(${width - 180}, 20)`);

    legendG.append("rect")
        .attr("width", 160)
        .attr("height", Object.keys(categorieColors).length * 25 + 10)
        .attr("fill", "white")
        .attr("stroke", "#333")
        .attr("rx", 5)
        .attr("ry", 5);

    const items = legendG.selectAll(".legend-item")
        .data(Object.entries(categorieColors))
        .join("g")
        .attr("transform", (d, i) => `translate(10, ${i * 25 + 15})`);

    items.append("rect")
        .attr("width", 20)
        .attr("height", 20)
        .attr("fill", d => d[1])
        .attr("stroke", "#222")
        .attr("stroke-width", 0.5);

    items.append("text")
        .attr("x", 30)
        .attr("y", 15)
        .attr("alignment-baseline", "middle")
        .style("font-size", "12px")
        .text(d => d[0]);
}
function removeCultureLegend(svg) {
    svg.selectAll(".legend-culture").remove();
}

function createColorScale(stats, type="altitude") {
    const values = Object.values(stats);
    const min = d3.min(values);
    const max = d3.max(values);

    const scale = d3.scaleSequential()
        .domain([min, max])
        .interpolator(type==="altitude"
            ? d3.interpolateYlOrRd
            : d3.interpolateGreens);

    const colorByDept = {};
    for (const [dept, value] of Object.entries(stats)) {
        colorByDept[dept] = scale(value);
    }

    return { scale, min, max, colorByDept };
}

function createLegend(containerId, scale, min, max, mode) {
    const container = d3.select(containerId).node().parentNode;
    d3.select(container).selectAll(".legend").remove();

    const legend = d3.select(container)
        .append("div")
        .attr("class", "legend");

    legend.append("div")
        .attr("class", "legend-title")
        .text(mode === "surface"
            ? "Surface (hectares)"
            : "Nombre de parcelles");

    const n = 5;
    for (let i = 0; i <= n; i++) {
        const val = min + (max - min) * i / n;
        const item = legend.append("div").attr("class", "legend-item");

        item.append("div")
            .attr("class", "legend-color")
            .style("background-color", scale(val));

        item.append("div")
            .text(Math.round(val));
    }
}

// ---------------------- Fonctions génériques ----------------------

function updateAllDepartments(data, minSlider, maxSlider, type, mode = "surface") {

    const result = {};
    const deltaBin = type === "altitude" ? 100 : 1;

    for (const depId in data) {

        const depData = data[depId];
        let total = 0;

        for (let bin = minSlider; bin < maxSlider; bin += deltaBin) {
            if (depData[bin]) {
                total += mode === "surface"
                    ? depData[bin]["surface_totale"]
                    : depData[bin]["nb_parcelles"];
            }
        }

        result[depId] = total;
    }

    return result;
}

// ---------------------- Couleurs ----------------------

const categorieColors = {
    "Grandes cultures": "#f4a261",
    "Prairies et fourrages": "#2a9d8f",
    "Viticulture": "#8d3b72",
    "Arboriculture": "#e9c46a",
    "Maraîchage": "#2d6a4f",
    "Plantes aromatiques et industrielles": "#6a4c93",
    "Cultures pérennes diverses": "#b56576",
    "Pastoralisme et surfaces extensives": "#52796f"
};

const cultureColors = {
  "AAR": "#8d3b72", "ACP": "#8d3b72", "AFG": "#8d3b72",
  "AGR": "#f4a261", "AIL": "#f4a261",
  "AME": "#e9c46a", "ARA": "#8d3b72", "ARP": "#e9c46a", "ART": "#e9c46a",
  "AVH": "#2a9d8f", "AVP": "#2a9d8f",
  "BDH": "#f4a261", "BDP": "#f4a261",
  "BFS": "#2a9d8f", "BOR": "#8d3b72",
  "BTA": "#f4a261", "BTH": "#f4a261",
  "BTN": "#2a9d8f", "BTP": "#2a9d8f",
  "CAE": "#f4a261", "CAG": "#f4a261", "CAH": "#f4a261", "CAR": "#f4a261",
  "CBT": "#f4a261", "CCN": "#f4a261", "CEE": "#f4a261", "CEL": "#f4a261",
  "CHU": "#8d3b72", "CHV": "#8d3b72",
  "CID": "#8d3b72", "CIT": "#e9c46a",
  "CML": "#f4a261", "CPL": "#8d3b72",
  "CSE": "#f4a261", "CSS": "#f4a261", "CTG": "#f4a261",
  "CZH": "#8d3b72", "CZP": "#8d3b72",
  "EPE": "#f4a261", "EPI": "#f4a261",
  "FEV": "#e9c46a",
  "FLA": "#2d6a4f", "FLP": "#2d6a4f", "FNU": "#2d6a4f",
  "FRA": "#e9c46a",
  "FVL": "#f4a261", "FVP": "#f4a261",
  "GES": "#f4a261",
  "GRA": "#2a9d8f",
  "HBL": "#2a9d8f",
  "HPC": "#f4a261",
  "JAC": "#8d3b72", "JNO": "#8d3b72",
  "LAV": "#6a4c93",
  "LBF": "#f4a261", "LDH": "#f4a261", "LDP": "#f4a261", "LEC": "#f4a261",
  "LIF": "#2d6a4f", "LIH": "#f4a261", "LIP": "#2d6a4f",
  "LOT": "#e9c46a",
  "LUZ": "#2a9d8f",
  "MCR": "#f4a261", "MCS": "#f4a261",
  "MDI": "#2d6a4f", "MID": "#2d6a4f",
  "MIS": "#6a4c93", "MLC": "#6a4c93", "MLF": "#6a4c93",
  "MLG": "#8d3b72", "MLO": "#2d6a4f", "MLT": "#6a4c93",
  "MOH": "#f4a261",
  "MOT": "#2a9d8f",
  "MPC": "#f4a261", "MRS": "#f4a261",
  "MSW": "#6a4c93",
  "NOS": "#2a9d8f", "NOX": "#6a4c93", "NVT": "#6a4c93",
  "OAG": "#f4a261", "OEI": "#f4a261", "OHR": "#f4a261", "OIG": "#f4a261",
  "OLI": "#e9c46a",
  "ORH": "#f4a261", "ORP": "#8d3b72",
  "PAG": "#8d3b72",
  "PCH": "#2d6a4f",
  "PEP": "#e9c46a", "PEV": "#e9c46a", "PFR": "#e9c46a", "PHF": "#e9c46a",
  "PHI": "#8d3b72",
  "PHS": "#f4a261",
  "PME": "#f4a261",
  "POR": "#8d3b72",
  "POT": "#2d6a4f",
  "PPH": "#f4a261", "PPP": "#f4a261", "PPR": "#f4a261",
  "PRF": "#8d3b72",
  "PRU": "#e9c46a",
  "PSL": "#f4a261",
  "PTC": "#f4a261", "PTR": "#f4a261",
  "PVP": "#f4a261",
  "PVT": "#2a9d8f",
  "PWT": "#f4a261",
  "RDI": "#8d3b72",
  "RIZ": "#f4a261",
  "SAG": "#8d3b72", "SAI": "#8d3b72",
  "SBO": "#f4a261",
  "SGH": "#8d3b72", "SGP": "#8d3b72",
  "SIN": "#8d3b72", "SNE": "#8d3b72",
  "SNU": "#f4a261",
  "SOG": "#f4a261", "SOJ": "#f4a261",
  "SPH": "#8d3b72",
  "SPL": "#e9c46a",
  "SRS": "#2a9d8f",
  "TAB": "#6a4c93",
  "TBT": "#f4a261",
  "TCR": "#2d6a4f",
  "TOM": "#2d6a4f",
  "TRE": "#e9c46a", "TRN": "#e9c46a", "TRU": "#e9c46a",
  "TTH": "#f4a261", "TTP": "#f4a261",
  "VES": "#e9c46a",
  "VRC": "#8d3b72",
  "VRG": "#2a9d8f"
};

const cultureLabels = {
  "AAR": "Autres cultures annuelles",
  "ACP": "Autres céréales à paille",
  "AFG": "Autres fourrages",
  "AGR": "Agrumes",
  "AIL": "Ail",
  "AME": "Amandiers",
  "ARA": "Arachide",
  "ARP": "Artichaut",
  "ART": "Artemisia / Plantes aromatiques",
  "AVH": "Avoine fourragère",
  "AVP": "Avoine de printemps",
  "BDH": "Betterave fourragère",
  "BDP": "Betterave potagère",
  "BFS": "Brome fourrager",
  "BOR": "Bourrache",
  "BTA": "Betterave sucrière",
  "BTH": "Betterave horticole",
  "BTN": "Betterave navet",
  "BTP": "Betterave potagère",
  "CAE": "Carotte",
  "CAG": "Cacahuète",
  "CAH": "Carthame",
  "CAR": "Carvi",
  "CBT": "Chou brocoli",
  "CCN": "Céleri branche",
  "CEE": "Céleri rave",
  "CEL": "Céleri",
  "CHU": "Chou",
  "CHV": "Chou vert",
  "CID": "Cidre (pommiers à cidre)",
  "CIT": "Citrons / Agrumes divers",
  "CML": "Cameline",
  "CPL": "Capucine",
  "CSE": "Cresson",
  "CSS": "Coussinets / Plantes aromatiques",
  "CTG": "Châtaigniers",
  "CZH": "Céréales d’hiver",
  "CZP": "Céréales de printemps",
  "EPE": "Épeautre",
  "EPI": "Épinard",
  "FEV": "Féverole",
  "FLA": "Fleurs annuelles",
  "FLP": "Fleurs pluriannuelles",
  "FNU": "Fleurs non spécifiées",
  "FRA": "Fraisier",
  "FVL": "Fève légumière",
  "FVP": "Fève potagère",
  "GES": "Gesse",
  "GRA": "Graminées fourragères",
  "HBL": "Haricot blanc",
  "HPC": "Haricot sec",
  "JAC": "Jacinthe",
  "JNO": "Jonc",
  "LAV": "Lavande",
  "LBF": "Légumes feuilles",
  "LDH": "Lentille d’hiver",
  "LDP": "Lentille de printemps",
  "LEC": "Légumes racines",
  "LIF": "Lilas",
  "LIH": "Lin horticole",
  "LIP": "Lin de printemps",
  "LOT": "Lotier",
  "LUZ": "Luzerne",
  "MCR": "Maïs grain",
  "MCS": "Maïs semence",
  "MDI": "Mélanges divers",
  "MID": "Mélanges fourragers",
  "MIS": "Miscanthus",
  "MLC": "Mélisse",
  "MLF": "Mélanges légumineuses fourragères",
  "MLG": "Mélanges légumineuses grain",
  "MLO": "Mélilot",
  "MLT": "Malt / Orge brassicole",
  "MOH": "Moha",
  "MOT": "Moutarde",
  "MPC": "Mâche",
  "MRS": "Maraîchage divers",
  "MSW": "Sauge",
  "NOS": "Navet fourrager",
  "NOX": "Noix",
  "NVT": "Noyer truffier",
  "OAG": "Oignon",
  "OEI": "Oeillet",
  "OHR": "Orge d’hiver",
  "OIG": "Orge de printemps",
  "OLI": "Oliviers",
  "ORH": "Orge hybride",
  "ORP": "Orge brassicole",
  "PAG": "Pâturage",
  "PCH": "Pêcher",
  "PEP": "Poivron",
  "PEV": "Pervenche",
  "PFR": "Poirier",
  "PHF": "Phacélie",
  "PHI": "Phlox",
  "PHS": "Pois sec",
  "PME": "Pomme",
  "POR": "Poirée / Blette",
  "POT": "Pomme de terre",
  "PPH": "Pois potager",
  "PPP": "Pois protéagineux",
  "PPR": "Poireau",
  "PRF": "Prunier",
  "PRU": "Prune",
  "PSL": "Persil",
  "PTC": "Pastèque",
  "PTR": "Pâturin",
  "PVP": "Pavot",
  "PVT": "Pavot fourrager",
  "PWT": "Piment",
  "RDI": "Radis",
  "RIZ": "Riz",
  "SAG": "Sauge officinale",
  "SAI": "Sainfoin",
  "SBO": "Sorgho",
  "SGH": "Seigle d’hiver",
  "SGP": "Seigle de printemps",
  "SIN": "Sarrasin",
  "SNE": "Séné",
  "SNU": "Sorgho fourrager",
  "SOG": "Soja grain",
  "SOJ": "Soja",
  "SPH": "Sapin / Conifères",
  "SPL": "Sapin de Noël",
  "SRS": "Sarrasin fourrager",
  "TAB": "Tabac",
  "TBT": "Betterave",
  "TCR": "Riziculture",
  "TOM": "Tomate",
  "TRE": "Trèfle",
  "TRN": "Tournesol",
  "TRU": "Triticale",
  "TTH": "Thym",
  "TTP": "Topinambour",
  "VES": "Vesce",
  "VRC": "Vigne (raisin de cuve)",
  "VRG": "Vigne (raisin de table)"
};


// ---------------------- Mapping Catégories ----------------------

function buildCategorieMapping() {

    const mapping = {};

    Object.keys(categorieColors).forEach(cat => {
        mapping[cat] = [];
    });

    for (const code in cultureColors) {

        const color = cultureColors[code];

        for (const categorie in categorieColors) {
            if (categorieColors[categorie] === color) {
                mapping[categorie].push(code);
            }
        }
    }

    return mapping;
}


// ---------------------- Bandeau RPG ----------------------

function buildBandeauRPG() {
    const mainBtn = document.querySelector(".accordion-btn");
    const mainPanel = document.querySelector(".accordion-panel");
    if (!mainBtn || !mainPanel) return;

    // Vider le panel pour repartir à neuf
    mainPanel.innerHTML = "";
    mainPanel.style.display = "none"; // masqué par défaut
    const description = document.createElement("h2");
    description.className = "description";
    description.innerHTML=`Description rapide du projet"
    <p>ici est la description<\p>`

    mainPanel.appendChild(description);
    const mapping = buildCategorieMapping(cultureColors);

    for (const categorie in mapping) {
        if (mapping[categorie].length === 0) continue;

        const block = document.createElement("div");
        block.className = "categorie-block";

        // Titre de la catégorie
        const title = document.createElement("div");
        title.className = "category-title";
        title.style.color = categorieColors[categorie];
        title.textContent = categorie;

        // Conteneur des codes culture (multi-colonnes), masqué par défaut
        const codesContainer = document.createElement("div");
        codesContainer.className = "codes-container";
        codesContainer.style.display = "none";
        codesContainer.style.gridTemplateColumns = "repeat(auto-fit, minmax(120px, 1fr))";
        codesContainer.style.gap = "6px";
        codesContainer.style.marginTop = "6px";

        mapping[categorie].sort().forEach(code => {
            const codeDiv = document.createElement("div");
            codeDiv.style.display = "flex";
            codeDiv.style.alignItems = "center";
            codeDiv.style.gap = "6px";
            

            codeDiv.innerHTML = `
                <span class="code-badge" 
                      style="background:${cultureColors[code]}; width:20px; height:20px; display:inline-block; border-radius:3px;"></span>
                <span>${code} - ${cultureLabels[code] || "Signification inconnue"}</span>
            `;
            codesContainer.appendChild(codeDiv);
        });

        block.appendChild(title);
        block.appendChild(codesContainer);
        mainPanel.appendChild(block);

        // Toggle codes au clic sur la catégorie
        title.addEventListener("click", () => {
            codesContainer.style.display = codesContainer.style.display === "none" ? "grid" : "none";
        });
    }

    // Toggle principal (affiche seulement les catégories)
    mainBtn.addEventListener("click", () => {
        mainPanel.style.display = mainPanel.style.display === "block" ? "none" : "block";
    });
}

// Appel après le DOM chargé
document.addEventListener("DOMContentLoaded", () => {
    buildBandeauRPG();
});
// ---------------------- Chargement ----------------------

Promise.all([
    d3.json("files/departements.geojson"),
    d3.json("files/altitude.json"),
    d3.json("files/pente.json"),
    d3.json("files/dep_culture.json")
]).then(([depGeo, altitudeData, penteData, parcellesData]) => {

    createDepartmentGraph(
        depGeo,
        altitudeData,
        parcellesData,
        "#chart-alt",
        "slider-alt",
        "Altitude - Surface",
        "altitude",
        "surface",
        0,
        1800
    );

    createDepartmentGraph(
        depGeo,
        penteData,
        parcellesData,
        "#chart-pente-map",
        "slider-pente",
        "Pente - Surface",
        "pente",
        "surface",
        0,
        31
    );

    document.querySelectorAll(".accordion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const panel = btn.nextElementSibling;
        panel.style.display = panel.style.display === "block" ? "none" : "block";
    });
});
    
    buildBandeauRPG(".accordion-panel");
});