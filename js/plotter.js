function add_plot(eltid) {
   // Set up HTML elements
   var g = document.getElementById(eltid);
   var svg = d3.select("#" + eltid).append("svg");
   var focus = svg.append("g").attr("class","focus");
   var context = svg.append("g").attr("class","context");
   
   // Declare variables for plot dimensions & axes
   var height, height2, width;
   var x = d3.scale.linear();
   var y = d3.scale.linear();
   var x2 = d3.scale.linear();
   var y2 = d3.scale.linear();
   var xAxis = d3.svg.axis().orient("bottom");
   var xAxis2 = d3.svg.axis().orient("bottom");
   var yAxis = d3.svg.axis().orient("left");

   // Arrays of interpolations for focus, context & gap, along with selectors
   var foc = [];
   var con = [];
   var gap = [];
   
   // Set brush
   var brushed = function() {
      x.domain(brush.empty() ? x2.domain() : brush.extent());
      for (var i = 0; i < foc.length; i++)
         foc[i].p.attr("d", foc[i].i);
      focus.select(".x.axis").call(xAxis);
   }
   
   var brush = d3.svg.brush()
      .on("brush", brushed);

   var set_axes = function() {
      // Clear prev graph
      focus.selectAll("g").remove();
      context.selectAll("g").remove();
      
      // Set ranges
      x.range([0, width]);
      x2.range([0, width]);
      y.range([height, 0]);
      y2.range([height2, 0]);
      
      // Scale axes
      xAxis.scale(x);
      xAxis2.scale(x2);
      yAxis.scale(y);

      // set x & y for focus
      focus.append("g")
         .attr("class", "x axis")
         .attr("transform", "translate(0," + height + ")")
         .call(xAxis);
      
      focus.append("g")
         .attr("class", "y axis")
         .call(yAxis);
      
      // x & brush for context
      context.append("g")
         .attr("class", "x axis")
         .attr("transform", "translate(0," + height2 + ")")
         .call(xAxis2);
      
      context.append("g")
         .attr("class", "x brush")
         .call(brush)
         .selectAll("rect")
         .attr("y", -6) // Okay for now, but might want to make relative later
         .attr("height", height2 + 7); 
       
      brush.x(x2);
   } 
   
   // Update widths and heights on window resize
   var updateWindow = function() {
      // Get total available space for x & y
      var ex = g.clientWidth;
      var ey = g.clientHeight;
      
      // Set margins
      var margin = {top: .02*ey, right: .01*ex, bottom: .2*ey, left: .04*ex},
         margin2 = {top: .86*ey, right: .01*ex, bottom: .04*ey, left: .04*ex};
      width = ex - margin.left - margin.right;
      height = ey - margin.top - margin.bottom;
      height2 = ey - margin2.top - margin2.bottom;
       
      // Set width & height of svg, retranslate focus & context
      svg.attr("width", width + margin.left + margin.right)
         .attr("height", height + margin.top + margin.bottom);
      focus.attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      context.attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");
      
      set_axes();

      // Redraw graphs to new dimensions
      for (var i = 0; i < foc.length; i++){
         foc[i].i.y0(height);
         foc[i].p.attr("d", foc[i].i);
      }
      for (var i = 0; i < con.length; i++){
         con[i].i.y0(height2);
         con[i].p.attr("d", con[i].i);
      }

      // Clip paths so they don't go outside of width & height
      svg.append("defs").append("clipPath")
         .attr("id", "clip")
         .append("rect")
         .attr("width", width)
         .attr("height", height);
   }
   // Call on resize & make sure dimensions are initialized before plotting!
   window.onresize = updateWindow;
   updateWindow();
   
   // Moves selection to front
   d3.selection.prototype.moveToFront = function() {
      return this.each(function() {
         this.parentNode.appendChild(this);
      });
   };
   
   // Returns an interpolation given type & x & y functions
   var get_intpl = function (type, fx, fy, hght) {
      return d3.svg.area().interpolate(type).x(fx).y0(hght).y1(fy); 
   }
   
   // Determines min & max values of functions given data, sets axis domain
   var set_domain = function (ax, fd) {
      var min = Number.MAX_VALUE;
      var max = Number.MIN_VALUE;

      for (var i = 0; i < fd.length; i++) {
          min = d3.min([min, d3.min(fd[i].data.map(fd[i].f))]);
          max = d3.max([max, d3.max(fd[i].data.map(fd[i].f))]);
      }
      ax.domain([min, max]);
   }
   
   var plot = function(p) {
      // Scale functions w/ x & y
      var fx = function(d) { return p.x(p.fx(d));};
      var fy = function(d) { return p.y(p.fy(d));};
      
      // Add interpolation to graph
      var intpl = get_intpl(p.type, fx, fy, p.height);
      var path = p.c.append("path")
         .datum(p.data)
         .attr("class",p.class)
         .attr("d", intpl)
         .on("mouseover", p.hover);

      return {i:intpl, p:path};
   }

   // Hover function
   var hover = function() {
      // Cool effect to bring hovered el't to front
      d3.select(this).moveToFront();
      d3.selectAll(".gap").moveToFront();
      d3.select(".x.brush").moveToFront();
      d3.selectAll(".axis").moveToFront();
   }
   var none = function() {}

   function set_plots(f, c, g) {
      // Clear previous plot (if there was one)
      focus.selectAll("path").remove();
      context.selectAll("path").remove();

      // Set domains of axes in focus
      var fdx = [];
      var fdy = [];
      for (var i = 0; i < f.length; i++) {
         fdx.push({data:f[i].data, f:f[i].fx});
         fdy.push({data:f[i].data, f:f[i].fy});
      }
      set_domain(x, fdx);
      set_domain(y, fdy);
      
      // Set domains of axes in context
      fdx = [];
      fdy = [];
      for (var i = 0; i < c.length; i++) {
         fdx.push({data:c[i].data, f:c[i].fx});
         fdy.push({data:c[i].data, f:c[i].fy});
      }
      set_domain(x2, fdx);
      set_domain(y2, fdy);
      set_axes();
      
      // Go through lists again (seems inefficient, better way??)
      for (var i = 0; i < f.length; i++) {
         foc.push(plot( {c:focus, x:x, y:y, height:height, hover:hover,
            fx:f[i].fx, fy:f[i].fy, type:"basis", class:f[i].class, 
            data:f[i].data}));
      }
      // Again for context
      for (var i = 0; i < c.length; i++) {
         con.push(plot( {c:context, x:x2, y:y2, height:height2, hover:hover,
            fx:c[i].fx, fy:c[i].fy, type:"basis", class:c[i].class, 
            data:c[i].data}));
      }

      // Set gap plots
      foc.push(plot({c:focus, x:x, y:y, height:height, hover:none, fx:g.fx,
         fy:g.fy, type:"step-before", class:"gap", data:g.data}));
      
      con.push(plot({c:context, x:x2, y:y2, height:height2, hover:none,
         fx:g.fx, fy:g.fy, type:"step-before", class:"gap", data:g.data}));

      // Make sure brush & axes go in front of gaps!
      d3.select(".x.brush").moveToFront();
      d3.selectAll(".axis").moveToFront();
   }
   return set_plots;
}
