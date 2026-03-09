let selectedParcelle = null;
const allGraphs = [];
const allDepartmentGraphs = [];
const allslider=[];
let Dept = null;




const colorFilter = {
    '#033a1b':true,
    '#200ae2':true,
    '#ff9896':true,
    '#c5770a':true, 
    '#0dadec':true,
    '#e3ee0a':true,
    '#00ff48':true,
    '#9edae5':true,
    '#4c5157':true
}

function resetZoom() {
    // Dézoomer le graphe courant
    svg.select("g").interrupt(); // interrompre toute transition active
    svg.transition()
       .duration(750)
       .call(zoom.transform, d3.zoomIdentity);

    // Dézoomer tous les autres graphes de façon cohérente
    allGraphs.forEach(otherSvg => {
        if (otherSvg.node() !== svg.node()) {
            otherSvg.select("g").interrupt();
            otherSvg.transition()
                    .duration(750)
                    .call(zoom.transform, d3.zoomIdentity);
        }
    });
}
function updateScatterPlotDisplay() {
    const svg = d3.select("#graph-container").select("svg");
    if (svg.empty()) return;

    svg.selectAll("circle.point")
        .style("display", d => colorFilter[cultureColors[d.CODE_CULTU]]? "block" : "none");
}





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

function drawParcelles(graph, parcellesFiltered) {
    const gParcelles = graph.gParcelles;
    const projection = graph.projection;
    const type = graph.type;
    const svg = graph.svg;
    const width = 600;
    const height = 600;

    if (!parcellesFiltered || parcellesFiltered.length === 0) {
        gParcelles.selectAll(".parcelle-point").remove();
        return;
    }

    const r = d3.scaleLog()
        .domain(d3.extent(parcellesFiltered, d => Math.max(+d.surface_totale || 1)))
        .range([1, 3]);

    const colorScale = d3.scaleOrdinal()
        .domain(Object.keys(cultureColors))
        .range(Object.values(cultureColors));
    // ne créer le rectangle que s'il n'existe pas encore
if (gParcelles.selectAll(".graph-background").empty()) {

    gParcelles.append("rect")
        .attr("class","graph-background")
        .attr("x",0)
        .attr("y",0)
        .attr("width",width)
        .attr("height",height)
        .lower()
        .attr("fill","transparent")
        .on("click", function(event) {

            event.stopPropagation();

            // supprimer **tous les rectangles de fond**
            d3.selectAll(".graph-background").remove();

            // reset département
            currentDept = null;

            // relancer le click sur l'élément en dessous
            const elementBelow = document.elementFromPoint(event.clientX, event.clientY);

            if (elementBelow) {
                elementBelow.dispatchEvent(
                    new MouseEvent("click", {
                        bubbles: true,
                        clientX: event.clientX,
                        clientY: event.clientY
                    })
                );
            }
        });
}
    
    // mise à jour des cercles
    const points = gParcelles.selectAll(".parcelle-point")
        .data(parcellesFiltered, d => d.id || d.geometry.coordinates)
        .join(
            enter => enter.append("circle")
                .attr("class", "parcelle-point")
                .attr("stroke", "#222")
                .attr("stroke-width", 0.3)
                .attr("opacity", 0.9)
                .attr("id", d => `parcelle-${d.id}-${type}`)
                .on("click", (event, d) => {
                    event.stopPropagation();
                    selectedParcelle = d.id;
                    updateSelection();
                    reinitialise();
                    highlight(d.id);
                })
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

    points
        .attr("r", d => r(d.surface_totale))
        .attr("fill", d => colorScale(d.CODE_CULTU))
        .attr("cx", d => projection([d.geometry.coordinates[0][0][0], d.geometry.coordinates[0][0][1]])[0])
        .attr("cy", d => projection([d.geometry.coordinates[0][0][0], d.geometry.coordinates[0][0][1]])[1])
        .style("display", d => {
        return colorFilter[cultureColors[d.CODE_CULTU]] ? "block" : "none";
    });

        


    // lasso
    const lasso = d3.lasso()
        .items(points)
        .area(gParcelles)
        .on("start", () => {
            reinitialise();
            points.classed("lasso-selected", false)
                  .classed("lasso-not-selected", false);
        })
        .on("end", () => {
            reinitialise();
            const selected = points.filter(function () {
                return d3.select(this).classed("lasso-selected");
            });
            points.classed("lasso-not-selected", true);
            selected.classed("lasso-not-selected", false);
            selected.each(function(d) {
                highlight(d.id);
            });
        });

    gParcelles.call(lasso);

    // légende des cultures
    createCultureLegend(svg, width);
}

function updateParcelles(currentDept,parcellesGeo) {
    if (!currentDept) {
        d3.selectAll(".graph-background").remove();
    return;
    }

    const deptCode = currentDept.properties.code;

    allDepartmentGraphs.forEach(graph => {
        const parcellesDept = parcellesGeo[deptCode] || [];
        const sliderValues = graph.sliderId
            ? document.getElementById(graph.sliderId).noUiSlider.get().map(Number)
            : [0, Infinity];

        // Chaque graphe peut avoir sa propre fonction de filtrage
        
        const parcellesFiltered = graph.filterFunc
            ? parcellesDept.filter(p => graph.filterFunc(p, sliderValues))
            : parcellesDept;

        drawParcelles(graph, parcellesFiltered);
    });
}


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



    d3.selectAll("circle.point")
        .attr("stroke", "none")
        .attr("stroke-width", 0.3);
}

function highlight(id) {


    // Highlight parcelle
    d3.select(`#parcelle-${id}-pente`)
        .attr("stroke", "white")
        .attr("stroke-width", 0.4);

    d3.select(`#parcelle-${id}-altitude`)
        .attr("stroke", "white")
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
    allGraphs.push(svg);
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
        .on("click", clicked)
        .on("mouseover", (event, d) => {
            const dep=d.properties.nom;
            tooltip
                .style("opacity", 1)
                .html(`<strong>${dep}</strong><br>`);
        })

        .on("mousemove", (event) => {
            tooltip
                .style("left", (event.pageX + 12) + "px")
                .style("top", (event.pageY + 12) + "px");
        })

        .on("mouseout", () => {
            tooltip.style("opacity", 0);
        });
    createLegend(containerId, scale, min, max, mode);

    const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on("zoom", (event) => {

        g.attr("transform", event.transform);

        // appliquer aux autres graphes
        allGraphs.forEach(otherSvg => {
            if (otherSvg.node() !== svg.node()) {
                otherSvg.select("g")
                    .attr("transform", event.transform);
            }
        });

    });

    svg.call(zoom);

    const sliderDiv = document.getElementById(sliderId);
    


    sliderDiv.noUiSlider.on("update", values => {
        const [minS, maxS] = values.map(Number);
        document.getElementById(type === "altitude"?"min-alt":"min-pente").textContent = Math.round(values[0]);
        document.getElementById(type === "altitude"?"max-alt":"max-pente").textContent = Math.round(values[1]);


        const stats = updateAllDepartments(dataMatrix, minS, maxS, type, mode);
        const { scale, min, max, colorByDept } = createColorScale(stats, type);

        deps.transition().duration(300)
            .attr("fill", d => colorByDept[d.properties.code]);

        createLegend(containerId, scale, min, max, mode);
        d3.selectAll(".graph-background").remove();
        updateParcelles(Dept, parcellesGeo);
    });
    
    if (type=="altitude"){
    const graph={
        svg: svg,
        gParcelles: gParcelles,
        projection: projection,
        type: "altitude",
        sliderId: "slider-alt", // ID du slider HTML correspondant
        filterFunc: (parcelle, sliderValues) => {
        const [min, max] = sliderValues;
        return parcelle.altitude_moyenne >= min && parcelle.altitude_moyenne <= max;
    }}
    allDepartmentGraphs.push(graph)
    }else{
        const graph={
        svg: svg,
        gParcelles: gParcelles,
        projection: projection,
        type: "pente",
        sliderId: "slider-pente", // ID du slider HTML correspondant
        filterFunc: (parcelle, sliderValues) => {
        const [min, max] = sliderValues;
        return parcelle.pente_moyenne >= min && parcelle.pente_moyenne <= max;
        }}
    allDepartmentGraphs.push(graph)
    }
    

      const cultureColors = {'AAR': '#033a1b', 'ACP': '#4c5157', 'AFG': '#4c5157', 'AGR': '#033a1b', 'AIL': '#c5770a', 'AME': '#033a1b', 'ANA': '#c5770a', 'ARA': '#0dadec', 'ARP': '#033a1b', 'ART': '#c5770a', 'AVH': '#ff9896', 'AVP': '#ff9896', 'BCA': '#c5770a', 'BDH': '#ff9896', 'BDP': '#ff9896', 'BEF': '#c5770a', 'BFS': '#4c5157', 'BOR': '#4c5157', 'BTA': '#4c5157', 'BTH': '#ff9896', 'BTN': '#200ae2', 'BTP': '#ff9896', 'CAC': '#033a1b', 'CAE': '#00ff48', 'CAG': '#ff9896', 'CAH': '#ff9896', 'CAR': '#c5770a', 'CBT': '#033a1b', 'CCN': '#c5770a', 'CEE': '#00ff48', 'CEL': '#c5770a', 'CHU': '#c5770a', 'CHV': '#200ae2', 'CID': '#4c5157', 'CIT': '#4c5157', 'CML': '#e3ee0a', 'CPL': '#4c5157', 'CSA': '#200ae2', 'CSS': '#4c5157', 'CTG': '#033a1b', 'CZH': '#e3ee0a', 'CZP': '#e3ee0a', 'EPE': '#ff9896', 'EPI': '#c5770a', 'FEV': '#0dadec', 'FLA': '#c5770a', 'FLP': '#c5770a', 'FNU': '#0dadec', 'FRA': '#c5770a', 'FVL': '#0dadec', 'FVP': '#0dadec', 'GES': '#0dadec', 'GRA': '#9edae5', 'HBL': '#200ae2', 'HPC': '#033a1b', 'JAC': '#9edae5', 'JNO': '#4c5157', 'LAV': '#033a1b', 'LBF': '#c5770a', 'LDH': '#0dadec', 'LDP': '#0dadec', 'LEC': '#0dadec', 'LIF': '#200ae2', 'LIH': '#e3ee0a', 'LIP': '#e3ee0a', 'LOT': '#0dadec', 'LUZ': '#0dadec', 'MCR': '#ff9896', 'MCS': '#ff9896', 'MDI': '#4c5157', 'MID': '#ff9896', 'MIS': '#ff9896', 'MLC': '#4c5157', 'MLF': '#0dadec', 'MLG': '#9edae5', 'MLO': '#c5770a', 'MLT': '#ff9896', 'MOH': '#ff9896', 'MOT': '#e3ee0a', 'MPC': '#4c5157', 'MRS': '#4c5157', 'MSW': '#4c5157', 'NOS': '#033a1b', 'NOX': '#033a1b', 'NVT': '#c5770a', 'OAG': '#e3ee0a', 'OEI': '#e3ee0a', 'OHR': '#e3ee0a', 'OIG': '#c5770a', 'OLI': '#033a1b', 'ORH': '#ff9896', 'ORP': '#ff9896', 'PAG': '#0dadec', 'PCH': '#0dadec', 'PEP': '#4c5157', 'PEV': '#4c5157', 'PFR': '#033a1b', 'PHF': '#0dadec', 'PHI': '#0dadec', 'PHS': '#0dadec', 'PME': '#033a1b', 'POR': '#c5770a', 'POT': '#c5770a', 'PPH': '#00ff48', 'PPP': '#033a1b', 'PPR': '#0dadec', 'PRF': '#033a1b', 'PRU': '#033a1b', 'PSL': '#033a1b', 'PTC': '#200ae2', 'PTR': '#9edae5', 'PVP': '#c5770a', 'PVT': '#033a1b', 'PWT': '#033a1b', 'RDI': '#c5770a', 'RIZ': '#ff9896', 'SAG': '#4c5157', 'SAI': '#0dadec', 'SBO': '#4c5157', 'SGH': '#ff9896', 'SGP': '#ff9896', 'SHD': '#4c5157', 'SIN': '#4c5157', 'SNE': '#4c5157', 'SNU': '#4c5157', 'SOG': '#ff9896', 'SOJ': '#0dadec', 'SPH': '#00ff48', 'SPL': '#00ff48', 'SRS': '#ff9896', 'TAB': '#200ae2', 'TBT': '#c5770a', 'TCR': '#4c5157', 'TOM': '#c5770a', 'TRE': '#0dadec', 'TRN': '#e3ee0a', 'TRU': '#4c5157', 'TTH': '#ff9896', 'TTP': '#ff9896', 'VES': '#0dadec', 'VNL': '#033a1b', 'VRC': '#033a1b', 'VRG': '#033a1b'}




function drawScatterPlot(parcelles) {

    d3.select("#graph-container").selectAll("*").remove();
    document.getElementById("graph-title").innerText = `Répartition des parcelles dans le ${Dept.properties.code} (${Dept.properties.nom}) `;
    if (!parcelles || parcelles.length === 0) return;

    const margin = { top: 20, right: 150, bottom: 40, left: 300 };
    const width = 800;
    const height = 500 - margin.top - margin.bottom;

    const svgGraph = d3.select("#graph-container")
        .append("svg")
        .attr("width", width+ margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`)
        .attr("stroke", "none")
        .attr("stroke-width", 0)
        
    // --- échelle taille ---
    const r = d3.scaleLog()
    .domain(d3.extent(parcelles, d => Math.max(+d.surface_totale || 0, 0.1)))
    .range([2, 12]);

    // --- liste des catégories à gauche ---

const legendCat = svgGraph.append("g")
    .attr("class", "categorie-legend")
    .attr("transform", "translate(-300, 0)");

const categories = Object.entries(categorieColors);






// --- fond ---
legendCat.append("rect")
    .attr("width", 160)
    .attr("height", categories.length * 25 + 10)
    .attr("fill", "white")
    .attr("stroke", "#333")
    .attr("rx", 5)
    .attr("ry", 5);

// Ajouter le point d'interrogation en haut à droite
legendCat.append("rect")
    .attr("x", 192)
    .attr("y", 12)
    .attr("width", 25)
    .attr("height", 25)
    .attr("rx", 4)
    .attr("stroke", "black")
    .attr("stroke-width", 2)
    .attr("fill", "white")
    

legendCat.append("text")
    .attr("x", 200)
    .attr("y", 30)
    .text("?")
    .attr("font-size", "18px")
    .attr("font-weight", "bold")
    .attr("fill", "#333")
    .style("cursor", "pointer")
    .on("mouseenter", function(event) {
        const panel = document.getElementById("info-panel");

        // Positionner le panneau à côté du curseur
        panel.style.left = event.pageX + 10 + "px";
        panel.style.top = event.pageY + 10 + "px";

        // Afficher le panneau
        panel.style.display = "block";
    })
    .on("mouseleave", function() {
        const panel = document.getElementById("info-panel");

        // Masquer le panneau
        panel.style.display = "none";
    });
// --- items ---
const items = legendCat.selectAll(".legend-item")
    .data(categories)
    .join("g")
    .attr("class", "legend-item")
    .attr("transform", (d, i) => `translate(10, ${i * 25 + 15})`)
    .style("cursor", "pointer")
    .on("click", function(event, [code, color]) {
        // 🔄 toggle dans ton dictionnaire
        colorFilter[color] = !colorFilter[color];
         d3.select(this)
            .style("opacity", colorFilter[color] ? 1 : 0.25);
        updateParcelles(Dept,parcellesGeo);
        updateScatterPlotDisplay()
        

       
    });


// carré couleur
items.append("rect")
    .attr("width", 20)
    .attr("height", 20)
    .attr("fill", d => d[1])
    .attr("stroke", "#222")
    .attr("stroke-width", 0.5);

// texte
items.append("text")
    .attr("x", 30)
    .attr("y", 15)
    .attr("alignment-baseline", "middle")
    .style("font-size", "12px")
    .text(d => `${d[0]}`);

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
    .attr("class","graph-background-graph")
    .attr("x",0)
    .attr("y",0)
    .attr("width",width)
    .attr("height",height)
    .attr("fill","transparent")
    .attr("stroke","black")
    .attr("stroke-width",2)
    // --- points ---
    const graphepoint = svgGraph.selectAll("circle.point")
        .data(parcelles)
        .enter()
        .append("circle")
        .on("click", (event, d) => {
    event.stopPropagation();
    selectedParcelle = d.id;
    
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
        .text("Altitude moyenne (m)");




    svgGraph.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -40)
        .attr("text-anchor", "middle")
        .text("Pente moyenne (%)");

// --- Lasso pour le graphe ---
const lasso2 = d3.lasso()
  
  .items(graphepoint)   // tous les points du graphe
  .area(svgGraph)       // zone de lasso = SVG du graphe
  .on("start", () => {
    reinitialise();
      // réinitialiser uniquement le graphe
      graphepoint.classed("lasso-selected", false)
                   .classed("lasso-not-selected", false);
      // si tu veux réinitialiser visuellement la carte, tu peux le faire ici, sinon laisse
  })
  
  .on("end", () => {
        reinitialise();
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
        .attr("fill", "black")
        

    legend.selectAll("text")
        .data(sizeLegendValues)
        .enter()
        .append("text")
        .attr("x", 30)
        .attr("y", (d, i) => i * 40 + 5)
        .text(d => `${Math.round(d)} hectares`)
        .style("font-size", "12px")
        .style("fill", "#333");
}


function clicked(event, d) {
    event.stopPropagation();

    // Si on clique sur le même département → dézoom + reset
    if ( Dept && Dept.properties.code === d.properties.code) {
        document.getElementById("graph-title").innerText = `Cliquez sur un Département ! `;

        
  
        d3.select("#graph-container").selectAll("*").remove();
        // Supprimer les parcelles
        d3.selectAll(".parcelle-point").remove();
        d3.selectAll(".graph-background").remove();
        // Supprimer la légende
        d3.selectAll(".legend-culture").remove();

        // Cacher le tooltip
        tooltip.style("opacity", 0);

        // Dézoomer
        if (currentDept){
        
        svg.transition()
            .duration(750)
            .call(
                zoom.transform,
                d3.zoomIdentity
            );
        }else{
            
            svg.select("g").interrupt(); // interrompre toute transition active
            svg.transition()
            .duration(750)
            .call(zoom.transform, d3.zoomIdentity);

            // Dézoomer tous les autres graphes de façon cohérente
            allGraphs.forEach(otherSvg => {
                if (otherSvg.node() !== svg.node()) {
                    otherSvg.select("g").interrupt();
                    otherSvg.transition()
                            .duration(750)
                            .call(zoom.transform, d3.zoomIdentity);
                }
            });
            }
        currentDept = null;
        Dept=null
        return;
    }

    // Sinon comportement normal : zoom sur le département
    currentDept = d;
    Dept=d
    updateParcelles(currentDept,parcellesGeo);
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

function createCultureLegend(svg) {
    // Supprimer l'ancienne légende
    svg.selectAll(".legend-culture").remove();

    // Largeur réelle du SVG
    const svgWidth = svg.node().getBoundingClientRect().width;

    // Paramètres
    const rectSize = 20;
    const padding = 5;
    const maxTextWidth = 200; // largeur max du texte pour wrap
    const itemHeight = 30;    // hauteur min par item

    // Créer le groupe légende
    const legendG = svg.append("g")
        .attr("class", "legend-culture")
        .attr("transform", `translate(${svgWidth - 260}, 10)`); // 250 = largeur du fond

    // Fond de la légende
    legendG.append("rect")
        .attr("width", 250)
        .attr("height", Object.keys(categorieColors).length * itemHeight + 10)
        .attr("fill", "white")
        .attr("stroke", "#333")
        .attr("rx", 5)
        .attr("ry", 5);

    // Créer un groupe par item
    const items = legendG.selectAll(".legend-item")
        .data(Object.entries(categorieColors))
        .join("g")
        .attr("transform", (d, i) => `translate(10, ${i * itemHeight + 10})`);

    // Carré de couleur
    items.append("rect")
        .attr("width", rectSize)
        .attr("height", rectSize)
        .attr("fill", d => d[1])
        .attr("stroke", "#222")
        .attr("stroke-width", 0.5);

    // Texte avec retour à la ligne et centrage vertical
    items.append("foreignObject")
        .attr("x", rectSize + 5)
        .attr("y", 0)
        .attr("width", maxTextWidth)
        .attr("height", itemHeight)
        .append("xhtml:div")
        .style("width", maxTextWidth + "px")
        .style("height", itemHeight + "px")
        .style("display", "flex")
        .style("align-items", "center")  // centrer verticalement
        .style("justify-content", "flex-start") // texte aligné à gauche
        .style("word-wrap", "break-word")
        .style("font-size", "12px")
        .style("line-height", "1.2em")
        .text(d => d[0]);

    // Mettre à jour la position sur redimensionnement
    window.addEventListener("resize", () => {
        const newWidth = svg.node().getBoundingClientRect().width;
        legendG.attr("transform", `translate(${newWidth - 250}, 10)`);
    });
}
function removeCultureLegend(svg) {
    d3.selectAll(".legend-culture").remove();
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
    'Arboriculture et Viticulture': '#033a1b',
    'Cultures industrielles': '#200ae2',
    'Céréales et pseudo-céréales': '#ff9896',
    'Légumes et fruits': '#c5770a',
    'Légumineuses et fourrage': '#0dadec',
    'Oléagineux': '#e3ee0a',
    'Prairies permanentes': '#00ff48',
    'Autres': '#4c5157'
};

    


const cultureColors = {'AAR': '#033a1b', 'ACP': '#4c5157', 'AFG': '#4c5157', 'AGR': '#033a1b', 'AIL': '#c5770a', 'AME': '#033a1b', 'ANA': '#c5770a', 'ARA': '#0dadec', 'ARP': '#033a1b', 'ART': '#c5770a', 'AVH': '#ff9896', 'AVP': '#ff9896', 'BCA': '#c5770a', 'BDH': '#ff9896', 'BDP': '#ff9896', 'BEF': '#c5770a', 'BFS': '#4c5157', 'BOR': '#4c5157', 'BTA': '#4c5157', 'BTH': '#ff9896', 'BTN': '#200ae2', 'BTP': '#ff9896', 'CAC': '#033a1b', 'CAE': '#00ff48', 'CAG': '#ff9896', 'CAH': '#ff9896', 'CAR': '#c5770a', 'CBT': '#033a1b', 'CCN': '#c5770a', 'CEE': '#00ff48', 'CEL': '#c5770a', 'CHU': '#c5770a', 'CHV': '#200ae2', 'CID': '#4c5157', 'CIT': '#4c5157', 'CML': '#e3ee0a', 'CPL': '#4c5157', 'CSA': '#200ae2', 'CSS': '#4c5157', 'CTG': '#033a1b', 'CZH': '#e3ee0a', 'CZP': '#e3ee0a', 'EPE': '#ff9896', 'EPI': '#c5770a', 'FEV': '#0dadec', 'FLA': '#c5770a', 'FLP': '#c5770a', 'FNU': '#0dadec', 'FRA': '#c5770a', 'FVL': '#0dadec', 'FVP': '#0dadec', 'GES': '#0dadec', 'GRA': '#00ff48', 'HBL': '#200ae2', 'HPC': '#033a1b', 'JAC': '#00ff48', 'JNO': '#4c5157', 'LAV': '#033a1b', 'LBF': '#c5770a', 'LDH': '#0dadec', 'LDP': '#0dadec', 'LEC': '#0dadec', 'LIF': '#200ae2', 'LIH': '#e3ee0a', 'LIP': '#e3ee0a', 'LOT': '#0dadec', 'LUZ': '#0dadec', 'MCR': '#ff9896', 'MCS': '#ff9896', 'MDI': '#4c5157', 'MID': '#ff9896', 'MIS': '#ff9896', 'MLC': '#4c5157', 'MLF': '#0dadec', 'MLG': '#00ff48', 'MLO': '#c5770a', 'MLT': '#ff9896', 'MOH': '#ff9896', 'MOT': '#e3ee0a', 'MPC': '#4c5157', 'MRS': '#4c5157', 'MSW': '#4c5157', 'NOS': '#033a1b', 'NOX': '#033a1b', 'NVT': '#c5770a', 'OAG': '#e3ee0a', 'OEI': '#e3ee0a', 'OHR': '#e3ee0a', 'OIG': '#c5770a', 'OLI': '#033a1b', 'ORH': '#ff9896', 'ORP': '#ff9896', 'PAG': '#0dadec', 'PCH': '#0dadec', 'PEP': '#4c5157', 'PEV': '#4c5157', 'PFR': '#033a1b', 'PHF': '#0dadec', 'PHI': '#0dadec', 'PHS': '#0dadec', 'PME': '#033a1b', 'POR': '#c5770a', 'POT': '#c5770a', 'PPH': '#00ff48', 'PPP': '#033a1b', 'PPR': '#0dadec', 'PRF': '#033a1b', 'PRU': '#033a1b', 'PSL': '#033a1b', 'PTC': '#200ae2', 'PTR': '#00ff48', 'PVP': '#c5770a', 'PVT': '#033a1b', 'PWT': '#033a1b', 'RDI': '#c5770a', 'RIZ': '#ff9896', 'SAG': '#4c5157', 'SAI': '#0dadec', 'SBO': '#4c5157', 'SGH': '#ff9896', 'SGP': '#ff9896', 'SHD': '#4c5157', 'SIN': '#4c5157', 'SNE': '#4c5157', 'SNU': '#4c5157', 'SOG': '#ff9896', 'SOJ': '#0dadec', 'SPH': '#00ff48', 'SPL': '#00ff48', 'SRS': '#ff9896', 'TAB': '#200ae2', 'TBT': '#c5770a', 'TCR': '#4c5157', 'TOM': '#c5770a', 'TRE': '#0dadec', 'TRN': '#e3ee0a', 'TRU': '#4c5157', 'TTH': '#ff9896', 'TTP': '#ff9896', 'VES': '#0dadec', 'VNL': '#033a1b', 'VRC': '#033a1b', 'VRG': '#033a1b', 'ZZZ': '#CCCCCC', 'CNE': '#CCCCCC', 'CSE': '#CCCCCC', 'CNA': '#CCCCCC'}


const cultureLabels ={'AAR': 'Plantes aromatiques herbacées non pérennes (< 5 ans) autres que persil', 'ACP': 'Autre culture pérenne et jachère dans les bananeraies', 'AFG': 'Autre plante fourragère annuelle (ni légumineuse, ni graminée, ni céréale, ni oléagineux)', 'AGR': 'Agrume', 'AIL': 'Ail', 'AME': 'Plantes médicinales et à parfum non pérennes (< 5 ans)', 'ANA': 'Ananas', 'ARA': 'Arachide', 'ARP': 'Plante aromatique pérenne non arbustive ou arborée autre que la vanille', 'ART': 'Artichaut', 'AVH': "Avoine d'hiver", 'AVP': 'Avoine de printemps', 'BCA': 'Banane (hors export)', 'BDH': "Blé dur d'hiver", 'BDP': 'Blé dur de printemps', 'BEF': 'Banane (export)', 'BFS': 'Bordure le long des forêts sans production', 'BOR': 'Bordure de champ', 'BTA': 'Bande tampon', 'BTH': "Blé tendre d'hiver", 'BTN': 'Betterave', 'BTP': 'Blé tendre de printemps', 'CAC': 'Café et cacao', 'CAE': 'Châtaigneraie entretenue par des porcins ou des petits ruminants. Attention : code mobilisable uniquement en corse et petite région des causses cévenols et méridionaux', 'CAG': 'Autre céréale ou pseudo-céréale secondaire de printemps (alpiste, quinoa, chia, …)', 'CAH': "Autre céréale ou pseudo-céréale secondaire d'hiver", 'CAR': 'Carotte', 'CBT': 'Cerise', 'CCN': 'Concombre, cornichon et courgette', 'CEE': 'Chênaie entretenue par des porcins ou des petits ruminants. Attention : code mobilisable uniquement en corse et petite région des causses cévenols et méridionaux', 'CEL': 'Céleri', 'CHU': 'Chou', 'CHV': 'Chanvre', 'CID': 'Cultures conduites en inter-rangs (bandes de cultures différentes) - 2 cultures représentant chacune plus de 25 %', 'CIT': 'Cultures conduites en inter-rangs (bandes de cultures différentes) - 3 cultures représentant chacune plus de 25 %', 'CML': 'Cameline', 'CPL': 'Mélange multi-espèces (céréales, oléagineux, légumineuses, …) sans graminées prairiales et sans prédominance de légumineuses', 'CSA': 'Canne à sucre', 'CSS': 'Cultures sous serre hors sol', 'CTG': 'Châtaigne', 'CZH': "Colza d'hiver", 'CZP': 'Colza de printemps', 'EPE': 'Épeautre (petit épeautre ou engrain et grand épeautre)', 'EPI': 'Epinard, oseille et bette', 'FEV': 'Fève', 'FLA': 'Autre légume ou fruit annuel', 'FLP': 'Autre légume ou fruit pérenne (hors petits fruits à baie)', 'FNU': 'Fenugrec', 'FRA': 'Fraise (en pleine terre)', 'FVL': "Féverole d'hiver", 'FVP': 'Féverole de printemps', 'GES': 'Cornille, dolique (y/c lablab), gesse', 'GRA': 'Graminée pure exclusivement pour gazon ou pour production de semences certifiées', 'HBL': 'Houblon', 'HPC': 'Horticulture ornementale', 'JAC': 'Jachère (terre arable)', 'JNO': "Jachère sanitaire imposée par l'administration", 'LAV': 'Lavande et lavandin', 'LBF': 'Laitue, endive et autres salades', 'LDH': "Lupin doux d'hiver", 'LDP': 'Lupin doux de printemps', 'LEC': 'Lentille', 'LIF': 'Lin fibres', 'LIH': "Lin non textile d'hiver", 'LIP': 'Lin non textile de printemps', 'LOT': 'Lotier, minette', 'LUZ': 'Luzerne', 'MCR': "Mélange de céréales ou pseudo-céréales d'hiver entre elles", 'MCS': 'Mélange de céréales ou pseudo-céréales de printemps entre elles', 'MDI': 'Maraîchage diversifié (plusieurs espèces de fruits et légumes majoritairement non pérennes)', 'MID': 'Maïs doux', 'MIS': 'Maïs (hors maïs doux)', 'MLC': 'Mélange multi-espèces avec légumineuses fourragères prépondérantes sans graminées prairiales', 'MLF': 'Mélange de légumineuses à graines ou fourragères pures', 'MLG': 'Mélange de légumineuses prépondérantes et de graminées fourragères de 5 ans ou moins', 'MLO': 'Melon et pastèque', 'MLT': 'Millet', 'MOH': 'Moha', 'MOT': "Moutarde d'hiver", 'MPC': 'Mélange multi-espèces avec légumineuses à graines prépondérantes sans graminées prairiales', 'MRS': 'Marais salants', 'MSW': 'Culture pérenne à forte biomasse (miscanthus, switchgrass, silphie, canne fourragère, …)', 'NOS': 'Noisette', 'NOX': 'Noix (y compris noix de coco)', 'NVT': 'Navet, rutabaga et autres légumes racines (hors carotte, radis, betterave)', 'OAG': "Autres oléagineux ou mélange d'oléagineux de printemps et d'été (dont moutarde ou navette d'été, sésame et nyger)", 'OEI': 'Oeillette (pavot)', 'OHR': "Autres oléagineux ou mélange d'oléagineux d'hiver (dont navette d'hiver)", 'OIG': 'Oignon et échalote', 'OLI': 'Oliveraie', 'ORH': "Orge d'hiver", 'ORP': 'Orge de printemps', 'PAG': 'Autre légumineuse à graines ou fourragères', 'PCH': 'Pois chiche', 'PEP': "Pépinière (plants laissés en terre plus d'un an)", 'PEV': "Pépinière (plants laissés en terre moins d'un an)", 'PFR': 'Petit fruit à baie (hors fraise)', 'PHF': 'Pois et haricot frais (alimentation humaine)', 'PHI': "Pois protéagineux d'hiver (alimentation animale)", 'PHS': 'Pois et haricot secs (alimentation humaine)', 'PME': 'Plantes médicinales pérennes (autres que arbres)', 'POR': 'Poireau', 'POT': 'Potiron, citrouille et autres courges', 'PPH': 'Prairie de 6 ans et plus (couvert herbacé)', 'PPP': 'Plantes médicinales pérennes (arbres ou arbustes) sauf cassis', 'PPR': 'Pois protéagineux de printemps (alimentation animale)', 'PRF': 'Plantes à parfum pérennes autres que lavande et lavandin', 'PRU': 'Prune (y compris mirabelle, quetsche, reine-claude, …)', 'PSL': 'Persil', 'PTC': 'Pomme de terre', 'PTR': 'Prairie temporaire de 5 ans ou moins et autre mélange avec graminées', 'PVP': 'Poivron, piment et aubergine', 'PVT': 'Pêche (y/c nectarine, brugnon)', 'PWT': 'Poire', 'RDI': 'Radis', 'RIZ': 'Riz', 'SAG': 'Roselière (récolte de sagnes)', 'SAI': 'Sainfoin', 'SBO': "Boisement aidé d'une surface agricole", 'SGH': "Seigle d'hiver", 'SGP': 'Seigle de printemps', 'SHD': 'Surfaces hautement diversifiées (dom)', 'SIN': "Surface pastorale ou parcours non utilisé l'année en cours", 'SNE': 'Surface agricole temporairement non admissible, autre que surface pâturable', 'SNU': "Parc d'élevage de monogastriques avec couvert dégradé, voire sol nu", 'SOG': 'Sorgho', 'SOJ': 'Soja', 'SPH': 'Prairie avec herbe prédominante et ressources fourragères ligneuses présentes', 'SPL': 'Surface pastorale - ressources fourragères ligneuses prédominantes. Attention : ces surfaces sont admissibles aux aides du 1er pilier de la PAC uniquement dans les départements 01, 04, 05, 06, 07, 09, 11, 12, 13, 15, 19, 2a, 2b, 23, 24, 26, 30, 31, 32, 34, 38, 42, 43, 46, 47, 48, 63, 64, 65, 66, 69, 73, 74, 81, 82, 83, 84 et 87', 'SRS': 'Sarrasin', 'TAB': 'Tabac', 'TBT': 'Tubercule tropical', 'TCR': 'Taillis à courte rotation', 'TOM': 'Tomate (en pleine terre)', 'TRE': 'Trèfle', 'TRN': 'Tournesol', 'TRU': 'Truffières (chênaie de plants mycorhizés)', 'TTH': "Triticale d'hiver", 'TTP': 'Triticale de printemps', 'VES': 'Vesce, mélilot, jarosse, serradelle', 'VNL': 'Vanille', 'VRC': 'Vigne (sauf vigne rouge)', 'VRG': 'Autre verger (y compris verger DOM)', 'ZZZ': 'Culture inconnue', 'CNE': 'Chênaie non entretenue par des porcins ou des petits ruminants', 'CSE': 'Chanvre sans étiquette conforme', 'CNA': 'Châtaigneraie non entretenue par des porcins ou des petits ruminants'}

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

// ---------------------- Bandeau RPG ----------------------

function buildBandeauRPG() {

    const mainBtn = document.querySelector(".accordion-btn.info-culture");
    const mainPanel = mainBtn?.nextElementSibling;

    if (!mainBtn || !mainPanel) return;

    mainPanel.innerHTML = "";
    mainPanel.style.display = "none";

    // Description
    const description = document.createElement("div");
    mainPanel.appendChild(description);

    const mapping = buildCategorieMapping();

    // --- BOUTON ? ---
    const helpBtn = document.createElement("div");
    helpBtn.textContent = "?";

    helpBtn.style.position = "absolute";
    helpBtn.style.left = "422px";
    helpBtn.style.top = "130px";
    helpBtn.style.width = "25px";
    helpBtn.style.height = "25px";
    helpBtn.style.border = "2px solid black";
    helpBtn.style.borderRadius = "4px";
    helpBtn.style.display = "flex";
    helpBtn.style.alignItems = "center";
    helpBtn.style.justifyContent = "center";
    helpBtn.style.fontWeight = "bold";
    helpBtn.style.cursor = "pointer";
    helpBtn.style.background = "white";

    mainPanel.appendChild(helpBtn);

    helpBtn.addEventListener("mouseenter", function(event) {

        const panel = document.getElementById("info-panel-2");

        if (!panel) return;

        panel.style.left = event.pageX + 10 + "px";
        panel.style.top = event.pageY + 10 + "px";
        panel.style.display = "block";

    });

    helpBtn.addEventListener("mouseleave", function() {

        const panel = document.getElementById("info-panel-2");
        if (!panel) return;

        panel.style.display = "none";

    });

    // --- CATEGORIES ---
    for (const categorie in mapping) {

        if (mapping[categorie].length === 0) continue;

        const block = document.createElement("div");
        block.className = "categorie-block";

        const title = document.createElement("div");
        title.className = "category-title";
        title.style.color = categorieColors[categorie];
        title.textContent = categorie;

        const codesContainer = document.createElement("div");
        codesContainer.className = "codes-container";
        codesContainer.style.display = "none";

        mapping[categorie].sort().forEach(code => {

            const codeDiv = document.createElement("div");
            codeDiv.className = "code-item";

            codeDiv.innerHTML = `
                <span class="code-badge" style="background:${cultureColors[code]}"></span>
                <span class="code-text">
                ${code} - ${cultureLabels[code] || "Signification inconnue"}
                </span>
            `;

            codesContainer.appendChild(codeDiv);

        });

        block.appendChild(title);
        block.appendChild(codesContainer);
        mainPanel.appendChild(block);

        title.addEventListener("click", () => {

            codesContainer.style.display =
            codesContainer.style.display === "none" ? "grid" : "none";

        });

    }

    // --- ACCORDION ---
    mainBtn.addEventListener("click", () => {

        mainPanel.style.display =
        mainPanel.style.display === "block" ? "none" : "block";

    });
}

// Appel après le DOM chargé
document.addEventListener("DOMContentLoaded", () => {
    buildBandeauRPG();
});
// ---------------------- Chargement ----------------------
// Slider altitude
noUiSlider.create(document.getElementById("slider-alt"), {
    start: [0, 1600],
    connect: true,
    range: { min: 0, max: 1600 },
    step: 100
});

// Slider pente
noUiSlider.create(document.getElementById("slider-pente"), {
    start: [0, 31],
    connect: true,
    range: { min: 0, max: 31 },
    step: 1
});





Promise.all([
    d3.json("files/departements.geojson"),
    d3.json("files/altitude.json"),
    d3.json("files/pente.json"),
    d3.json("files/dep_culture.json")
]).then(([depGeo, altitudeData, penteData, parcellesData]) => {


const sliders = ["slider-alt", "slider-pente"];

sliders.forEach(sliderId => {
    const slider = document.getElementById(sliderId).noUiSlider;

    slider.on("update", () => {
        // Met à jour les labels si tu en as
        const [minS, maxS] = slider.get().map(Number);
        if (sliderId === "slider-alt") {
            document.getElementById("min-alt").textContent = Math.round(minS);
            document.getElementById("max-alt").textContent = Math.round(maxS);
        } else {
            document.getElementById("min-pente").textContent = Math.round(minS);
            document.getElementById("max-pente").textContent = Math.round(maxS);
        }
        
        // Appel global pour mettre à jour tous les graphes
        updateParcelles(Dept, parcellesData);
    });
});


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
        1600
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

    document.querySelectorAll(".accordion-btn.info-culture").forEach(btn => {
    btn.addEventListener("click", () => {
        const panel = btn.nextElementSibling;
        panel.style.display = panel.style.display === "block" ? "none" : "block";
    });
});
    
    buildBandeauRPG(".accordion-panel");
});


// PAGE ACCUEIL

document.getElementById("enter-site").onclick = function(){
    document.getElementById("home-overlay").style.display = "none";
}


document.getElementById("home-btn").onclick = function(){
    document.getElementById("home-overlay").style.display = "flex";
}


// PANNEAU FONCTIONNALITES

document.getElementById("features-btn").onclick = function(){

    let panel = document.getElementById("features-panel");

    if(panel.style.display === "block"){
        panel.style.display = "none";
    } else {
        panel.style.display = "block";
    }

}