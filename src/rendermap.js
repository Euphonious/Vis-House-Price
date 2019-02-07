d3.queue()
.defer(d3.json, "data/nld.json")
.defer(d3.json, "data/price.json")
//data: period,min,max,distract,divisor
.defer(d3.csv,"data/stat.csv")
.await(draw)

function draw(error,nld,price,stat) {
    "use strict";

    var years = ["1995","1996","1997","1998","1999","2000","2001","2002","2003","2004","2005","2006","2007","2008","2009","2010","2011","2012","2013","2014","2015","2016","2017"];
    var width = 960,
    height = 500,
    legendRectSize = 18,
    legendSpacing = 4,
    year,
    selectedpv;




    var projection = d3.geo.mercator()
        .scale(1)
        .translate([0, 0]);


    var path = d3.geo.path()
        .projection(projection);


    var zoom = d3.behavior.zoom()
        .scaleExtent([1,8])
        .on("zoom",zoomhandler)

    var svg = d3.select("#container").append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("transform","translate(0,20)")
        .attr("class","map")
        .append("g")
        .attr("id","zoomgroup")
        .call(zoom);

    var l = topojson.feature(nld, nld.objects.subunits).features[3],
        b = path.bounds(l),
        s = .2 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
        t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];


    
    projection
        .scale(6400)
        .translate([-240,7115]);

    
    //bind data with path
    //use .on make the selected region lighted

    var map = svg.selectAll("path")
        .data(topojson.feature(nld, nld.objects.subunits).features)
        .enter()
        .append("path")
        .attr("d", path)
        .on("mouseover",mouseover)
        .on("mouseout",mouseout)
        .on("mousemove",mousemove)
        .style({
            "stroke":"black",
            "stroke-width":0.5,
        })
        .on("click",function(d){
            drawbarcity(d);
            highlight(d);
        });
    

    //show text when the mouse move on the region
    var label = svg.selectAll("text")
        .data(topojson.feature(nld, nld.objects.subunits).features)
        .enter()
        .append("text")
        .attr("class","label")
        .attr("transform",function(d){return "translate("+path.centroid(d)+")";})
        .text(function(d){return d.properties.name})
        .on("mouseover".mouseover)
        .on("mouseout",mouseout)
        .on("mousemove",mousemove);



    var color = d3.scale.ordinal()
        .domain(["Cheapest","<Medium","Medium",">Medium","Expensive"])    
        .range(["#1a9850","#a6d96a","#ffffbf","#fdae61","#d73027"])


    var colorpv = d3.scale.ordinal()
        .domain(["Groningen","Friesland","Drenthe","Overijssel","Flevoland","Gelderland","Utrecht","Noord-Holland","Zuid-Holland","Zeeland","Noord-Brabant","Limburg"])   
        .range(["#789fba","#92a2c9","#b5a2d2","#a05195","#d45087","#f95d6a","#ff7c43","#ffa600","#1a9850","#a6d96a","#ffffbf","#fdae61"])


    var legendmap = d3.select("svg")
        .append("g")
        .selectAll("g")
        .data(color.domain())
        .enter()
        .append("g")
        .attr("class","legendmap")
        .attr("transform",function(d,i){
            var height = legendRectSize;
            var horz = 130;
            var vert = i * height;
            return "translate(" + horz + "," + vert + ")";
        })

    legendmap.append("rect")
        .attr('width', legendRectSize)
        .attr('height',legendRectSize)
        .style('fill',color)
        .style('stroke',color);

    legendmap.append("text")
        .attr("x",legendRectSize + legendSpacing)
        .attr("y",legendRectSize - legendSpacing)
        .text(function(d){return d});

    var tooltip = d3.select("section")
        .append("div")
        .attr("class","tooltip")
        .style("opacity", 0);


    var timeline = d3.selectAll(".time-series")
        .on("mouseover", function(d,i){
            year = i;
            drawbarpv()
            drawline()
            svg.selectAll("path")
            .attr("class",quantify)
            d3.selectAll(".time-series")
            .attr("class","time-series")
            this.className = "time-series active"
        })






    //show the region color based on the value of the house price
    svg.selectAll("path")
        .attr("class", quantify)
        

    function zoomhandler(){
        svg.attr('transform', "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")")
        .style("font-size",function(){return 12/(d3.event.scale)+"px";});
    }
    //price is divided into five ranges based on the maximum and minimum.
    function quantify(d){
        year = year || 0;
        var pv = d.properties.name;
        var f = price[pv][year];
        return "q" + Math.min(4, ~~((f-stat[year].Min) / stat[year].Divisor)) + "-5";
    }

    //mouse over/out/move,show the text of the province, with "name" and "price"
    function mouseover(d){
        d3.select(this).classed("selected",true)
        tooltip.transition()
        .duration(200)
        .style("opacity",.9)
        d3.select("."+ d.properties.name)

        ;
    }

    function mouseout(){
        d3.select(this).classed("selected",false)
        tooltip.transition()
        .duration(500)
        .style('opacity', 0);
    }

    function mousemove(d){
        year = year || 0
        tooltip.html(d.properties.name + "<br />" + price[d.properties.name][year] + "€")
        .style('left', (d3.event.pageX) + "px")
        .style('top',(d3.event.pageY - 50) + "px");
    }


    function highlight(d){
        selectedpv = d.properties.name
        drawbarpv()
        drawline()
    }



    //set up bar svg area
    var barsvg_width = width;
    var barsvg_height = 450;
    var marginbarcity={left:20,top:10,right:20,bottom:80};
    var real_width = barsvg_width - marginbarcity.left - marginbarcity.right;
    var real_height = barsvg_height-marginbarcity.top - marginbarcity.bottom;
    var barsvg = d3.select("#container").append("svg")
            .attr({
                "width": barsvg_width,
                "height": barsvg_height
            })
            .attr("transform","translate(0,10)")



    //draw the bar svg area which shows the cities of the clicked province 
    function drawbarcity(d){
        d3.csv("data/"+ d.properties.name +".csv",function(pv){
            var data = pv.filter(function(d){return d.Periods == (year+1995);})
            var max = d3.max(data.map(function(d){return parseInt(d.Price)}))

            var average = price[d.properties.name][year]
            var lineEnd = real_width + marginbarcity.left

            var bar = real_width/(pv.length/23);
            var bar_padding = 5;
            var bar_width = bar - bar_padding;

            //scale of y axis
            var scale = d3.scale.linear()
            .domain([0,max])
            .range([real_height,0])

            //scale of x axis
            var scale_x = d3.scale.ordinal()
            .domain(data.map(function(d){return d.Region}))
            .rangeBands([0,real_width]);

            var xaxis = d3.svg.axis()
            .scale(scale_x)
            .orient("bottom")

            var tip = d3.tip()
            .attr('class', 'd3-tip')
            .offset([-10, 0])
            .html(function(d) {
            return "<strong>Price:</strong> <span style='color:red'>" + parseInt(d.Price) + "€" + "</span>";
            })


            //remove the old bars and axis and average line
            barsvg.selectAll(".bar")
            .remove()
            
            barsvg.selectAll(".xaxis")
            .remove()

            barsvg.select(".lineavg")
            .remove()

            //create new bars
            var bars = barsvg
            .selectAll("g")
            .data(data)
            .enter()
            .append("g")
            .attr("transform",function(d,i){return "translate("+ (marginbarcity.left+(bar_padding+bar_width)*i) +"," + marginbarcity.top +")";})
            .attr("class","bar")

            //call the tip function
            bars.call(tip);

            bars.append("rect")
            .attr({
                "y":function(d,i){return scale(d.Price)},
                "width":bar_width,
                "height":function(d,i){return real_height - scale(d.Price)}
                
            })
            .style("fill",function(d){if(d.Price>average){return "red";}else{return "steelblue";}})

            .on("mouseover", function(d){
                d3.select(this).attr("opacity",0.5)
                tip.show(d)
            })
            .on("mouseout",function(d){
                d3.select(this).attr("opacity",1)
                tip.hide(d)
            })


            //append the x axis
            barsvg.append("g")
            .attr("class","xaxis")
            .attr("transform","translate("+ marginbarcity.left +"," +(real_height+ marginbarcity.top) +")")
            .call(xaxis)
            .selectAll("text")
            .style("text-anchor","start")
            .attr("dx","1em")
            .attr("transform","rotate(45)")


            var lineavg = barsvg.append("line")
            .attr("x1",marginbarcity.left)
            .attr("x2",lineEnd)
            .attr("y1",scale(average)+marginbarcity.top)
            .attr("y2",scale(average)+marginbarcity.top)
            .attr("class","lineavg")
            .attr("stroke-width", 5)
            .attr("stroke", "black")
            .attr("stroke-dasharray", "8,8");

        })
    }
    //initialize the bar chart
    drawbarcity(topojson.feature(nld, nld.objects.subunits).features[0])

    

    

    function drawbarpv(){
        var barpv_width = 150,
        barpv_height = 20,
        barpv_padding = 5;

        //find max price of the year
        var a = Object.keys(price),
        b = Object.values(price);

        var max=0;

        for (var i =0;i<a.length;i++){
            if (b[i][year] > max){
                max = b[i][year];
            }
        }


        //sort the provice based on their prices of that year
        var aaa = price;
        var aaa = Object.keys(aaa).map(function(key) {
        return [key, aaa[key]];
        });
        aaa.sort(function(first, second) {
        return second[1][year] - first[1][year];
        });

        var bbb = aaa.map(function(d){return d[0]})

        //scale of price
        var scale = d3.scale.linear()
            .domain([0,max])
            .range([barpv_width,0])


        //remove all the bars when the function is called
        d3.select("svg")
        .selectAll(".barpv")
        .remove()

        var barpv = d3.select("svg")
        .append("g")
        .attr("class","barpv")
        .selectAll("g")
        .data(bbb)
        .enter()
        .append("g")
        .attr("class","barpv")
        .attr("transform",function(d,i){
            return "translate(580," + (barpv_height+barpv_padding)*i + ")";
        })
        .attr("class","barg")

        barpv.append("rect")
            .attr({
                "x":function(d,i){return scale(price[d][year])},
                "width":function(d,i){return width - scale(price[d][year])},
                "height":barpv_height
                
            })
            .attr("class",function(d){return d})
            .style("fill",function(d){if(d==selectedpv){return "black"}else{return colorpv(d)}})
            .style({
                "strok":function(d){if(d==selectedpv){return "black"}},
                "stroke-width":function(d){if(d==selectedpv){return 5}}
            })
            .on("mouseover",function(d){
                d3.select(this).attr("opacity",0.5)
            })
            .on("mouseout",function(d){
                d3.select(this).attr("opacity",1)
            })

        barpv.append("text")
            .text(function(d){return d +" "+ price[d][year] + "€";})
            .attr({
                "x": function(d){return scale(price[d][year])},
                "y": barpv_height/2,
                "dx":80,
                "text-anchor": "middle"
            })
            .style("fill",function(d){if(d==selectedpv){return "white"}})
            .style("font-size",function(d){if(d==selectedpv){return 14}})
            .style("font-weight",function(d){if(d==selectedpv){return "bold"}})


    }

    drawbarpv()

    

    function drawline(){

        var linewidth = 300;
        var lineheight = 200;
        var defaultpv = "Noord-Brabant";
        var linedata;

        //x scale
        var x = d3.scale.ordinal()
        .domain(years)
        .rangeBands([0,linewidth]);


        //set line data, default or selected province
        if (selectedpv == null){
            linedata = price[defaultpv];
        }
        else{
            linedata = price[selectedpv];
        }
        //y scale
        var y = d3.scale.linear()
        .domain([0,d3.max(linedata)])
        .range([lineheight,20])

        var line = d3.svg.line()
            .x(function(d,i){return x(i+1995)})
            .y(function(d,i){return y(d)})

        d3.select("svg")
        .selectAll(".lineg")
        .remove()

        var lineg = d3.select("svg").append("g")
        .attr("transform","translate(560,320)")
        .attr("class","lineg")

        lineg.selectAll("path").data([linedata]).enter()
        .append("path")
        .attr("class","line")
        .attr("d",line)


        lineg.selectAll(".value").data(linedata).enter()
        .append("text")
        .text(function(d, i) { 
            return (i+1995) + " "+d+"€";
        })
        .attr("class", "value")
        .attr("y", function(d,i) { return y(d)-20; })
        .attr("x", function(d,i) { return x(i+1995);})
        .style("font-size", 15)
        .style("opacity",function(d,i){if(i==year)return 1;else{return 0}})
        .style("font-family", "monospace");

        lineg.selectAll("line").data(linedata).enter().append("line")
        .attr('x1',function(d,i) { return x(i+1995); })
        .attr('y1',function(d,i) { return y(0); })
        .attr('x2',function(d,i) { return x(i+1995); })
        .attr('y2',function(d,i) { return y(d); })
        .style("stroke-width", 2)
        .style("stroke", "gray")
        .style("stroke-dasharray", ("2, 2"))
        .style("opacity",function(d,i){if(i==year){return 1;}else{return 0}});
        

        lineg.selectAll("circle").data(linedata).enter()
        .append("circle")
        .attr("cx",function(d,i) { return x(i+1995); })
        .attr("cy",function(d,i) { return y(d); })
        .attr("r",8)  
        .attr("opacity",0.15)
        .on("mouseover", function(d) {
        d3.select(this).attr("opacity",1).style("fill", "red");
        d3.selectAll(".value").filter(function(e) {
            return d === e;
        })
        .style("opacity",1)
        .style("font-size", 15);
        d3.selectAll("line").filter(function(e) {
            return d === e;
        })
        .style("opacity",1)

        })

        .on("mouseout", function(d) {
        d3.select(this).transition().duration(50).style("fill","black").attr("opacity",0.15);
        d3.selectAll(".value").filter(function(e) {
        return d === e;})
        .style("opacity",0)
        .transition().duration(100);


        d3.selectAll("line").filter(function(e) {
          return d === e;
        })
        .style("opacity",0)
        .transition().duration(100);
        });

    }
    drawline()
};





