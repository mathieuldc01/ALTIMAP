// ---------------------- Fonctions génériques ----------------------
function updateAllDepartments(data, minSlider, maxSlider, type, mode="surface") {
    const result = {};

    for (const depId in data) {
        const depData = data[depId];

        let delta_Bin = type === "altitude" ? 100 : 1;
        let total = 0;
        let bin = minSlider;

        while (bin < maxSlider) {
            if (depData[bin]) {
                total += mode === "surface"
                    ? depData[bin]["surface_totale"]
                    : depData[bin]["nb_parcelles"];
            }
            bin += delta_Bin;
        }

        result[depId] = total;
    }

    return result;
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

    const titleText = mode === "surface"
        ? "Surface (hectares)"
        : "Nombre de parcelles";

    legend.append("div")
        .attr("class", "legend-title")
        .text(titleText);

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

// ---------------------- Création carte avec zoom et parcelles ----------------------
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
    // -------------------- Setup --------------------
    d3.select(containerId).selectAll("*").remove();

    const width = document.querySelector(containerId).clientWidth;
    const height = 600;

    // SVG
    const svg = d3.select(containerId)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .style("cursor", "pointer");

    // Projection et path pour cette carte
    const projection = d3.geoMercator().fitSize([width, height], depGeo);
    const path = d3.geoPath().projection(projection);

    const g = svg.append("g");
    const gDeps = g.append("g").attr("class", "departements").attr("cursor", "pointer");
    const gParcelles = g.append("g").attr("class", "parcelles");

    // -------------------- Départements --------------------
    const stats = updateAllDepartments(dataMatrix, minVal, maxVal, type, mode);
    const { scale, min, max, colorByDept } = createColorScale(stats, type);

    const deps = gDeps.selectAll("path")
        .data(depGeo.features)
        .join("path")
        .attr("d", path)
        .attr("stroke", "#333")
        .attr("stroke-width", 0.8)
        .attr("fill", d => colorByDept[d.properties.code])
        .on("click", clicked);

    deps.append("title").text(d => `${d.properties.nom} (${d.properties.code})`);

    createLegend(containerId, scale, min, max, mode);

    // -------------------- Zoom --------------------
    const zoom = d3.zoom()
        .scaleExtent([1, 8])
        .on("zoom", (event) => {
            g.attr("transform", event.transform);
            g.attr("stroke-width", 1 / event.transform.k);
        });

    svg.call(zoom);

    // -------------------- Slider --------------------
    const sliderDiv = document.getElementById(sliderId);
    noUiSlider.create(sliderDiv, {
        start: [minVal, maxVal],
        connect: true,
        range: { min: minVal, max: maxVal },
        step: type === "altitude" ? 100 : 1
    });

    const suffix = sliderId.split("-")[1];
    const minLabel = document.getElementById("min-" + suffix);
    const maxLabel = document.getElementById("max-" + suffix);

    sliderDiv.noUiSlider.on("update", values => {
        const [minS, maxS] = values.map(Number);
        minLabel.textContent = Math.round(minS);
        maxLabel.textContent = Math.round(maxS);

        const stats = updateAllDepartments(dataMatrix, minS, maxS, type, mode);
        const { scale, min, max, colorByDept } = createColorScale(stats, type);

        deps.transition().duration(300)
            .attr("fill", d => colorByDept[d.properties.code]);

        createLegend(containerId, scale, min, max, mode);
    });

    // -------------------- Click Département --------------------
    function clicked(event, d) {
        event.stopPropagation();

        const deptCode = d.properties.code;
        gParcelles.selectAll(".parcelle").remove();

        const parcellesDept = parcellesGeo[deptCode] || [];

        if (parcellesDept.length > 0) {
            // Color scale pour les cultures
            const codesCultu = Array.from(new Set(parcellesDept.map(p => p.CODE_CULTU)));
            const colorScale = d3.scaleOrdinal().domain(codesCultu).range(d3.schemeCategory10);

            gParcelles.selectAll(".parcelle")
                .data(parcellesDept)
                .join("path")
                .attr("class", "parcelle")
                .attr("d", p => path({ type: "Feature", properties: p, geometry: p.geometry }))
                .attr("fill", d => colorScale(d.CODE_CULTU))
                .attr("stroke", "#222")
                .attr("stroke-width", 0.3)
                .attr("opacity", 0.9);
        }

        // Zoom sur le département
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

    // -------------------- Reset --------------------
    svg.on("click", () => {
        gParcelles.selectAll(".parcelle").remove();
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });
}

// ---------------------- Chargement ----------------------
Promise.all([
    d3.json("files/departements.geojson"),
    d3.json("files/altitude.json"),
    d3.json("files/pente.json"),
    d3.json("files/dep_culture.json")
]).then(([depGeo, altitudeData, penteData, parcellesData])=>{
    
  
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
        3000
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
        30
    );
});