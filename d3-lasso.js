// --- D3 Lasso UMD Build (compatible navigateur, D3 v4 à v7) ---
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) {

  function lasso() {
    let items = [],
        closePathDistance = 75,
        closePathSelect = true,
        hoverSelect = true,
        area = null,
        on = { start: function(){}, draw: function(){}, end: function(){} };

    function lasso(selection) {
      const _this = selection;
      const origin = {};
      let path, drag;

      function dragstart(event) {
        const [x, y] = d3.pointer(event, area.node());
        origin.x = x;
        origin.y = y;

        items.each(function() {
          const item = d3.select(this);
          item._lasso = { pos: item.node().getBoundingClientRect(), selected: false, possible: true };
        });

        path = [ [origin.x, origin.y] ];
        on.start();
      }

      function dragmove(event) {
        const [x, y] = d3.pointer(event, area.node());
        path.push([x, y]);

        const line = d3.line();
        area.selectAll(".lasso-path").remove();
        area.append("path")
          .attr("class", "lasso-path")
          .attr("d", line(path))
          .style("stroke", "#0bb")
          .style("stroke-width", 2)
          .style("fill", "none");

        items.each(function() {
        const item = d3.select(this);
        const cx = +item.attr("cx");
        const cy = +item.attr("cy");

        const inside = d3.polygonContains(path, [cx, cy]);
        item.classed("lasso-hover", inside);
        });

        on.draw();
      }

      function dragend() {
        area.selectAll(".lasso-path").remove();

        items.each(function() {
          const item = d3.select(this);
          const hovered = item.classed("lasso-hover");
          item.classed("lasso-selected", hovered);
          item.classed("lasso-hover", false);
        });

        on.end();
      }

      drag = d3.drag()
        .on("start", dragstart)
        .on("drag", dragmove)
        .on("end", dragend);

      area.call(drag);
    }

    lasso.items = function(_) { items = _; return lasso; };
    lasso.area = function(_) { area = _; return lasso; };
    lasso.on = function(type, fn) { on[type] = fn; return lasso; };

    return lasso;
  }

  exports.lasso = lasso;
}));
