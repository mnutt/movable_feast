$.fn.hummingbirdGraph = function(socket, options) {
  if(this.length == 0) { return; }

  this.each(function() {
    new Hummingbird.Graph($(this), socket, options);
  });

  return this;
};


if(!Hummingbird) { var Hummingbird = {}; }

Hummingbird.Graph = function(element, socket, options) {
  if ( !(this instanceof Hummingbird.Graph) ) {
    return new Hummingbird.Graph(element, socket, options);
  }

  var defaults = {
    showLogDate: false,
    showMarkers: true,
    showBackgroundBars: true,
    tickLineColor: '#666',
    bgLineColor: '#555',
    barColor: null,
    graphHeight: 216,
    averageOver: 0.5
  }

  this.options = $.extend(defaults, options);

  this.scale = 50;
  this.element = element;
  this.socket = socket;
  this.graph = this.element.find('div.graph');
  this.trafficLog = [];

  this.createGraph(options.initialData);
  this.initialize();
};

Hummingbird.Graph.prototype = new Hummingbird.Base();

$.extend(Hummingbird.Graph.prototype, {

  name: "Graph",

  onMessage: function(message, average) {
    this.drawLogPath(average * this.options.averageOver);
  },

  createGraph: function(data) {
    this.lineColors = {
      6400: "#FFFFFF",
      3200: "#BBBBBB",
      1600: "#999999",
      800: "#983839",
      400: "#C44939",
      200: "#F1E29F",
      100: "#7BE4D6",
      50: "#65B88A",
      25: "#5BC4B6",
      12.5: "#3BA496",
      6.25: "#1B8476",
      3.125: "#006456",
      def: "#7BF4D6"
    };

    this.lineWidth = 3;

    this.graphHeight = this.options.graphHeight; // this.graph.height();
    this.graph.height(this.graphHeight);
    this.graphWidth = this.graph.width();

    this.numPoints = Math.ceil(this.graphWidth / (this.lineWidth * 2));

    this.numMarkers = Math.floor(this.graphHeight / 23);
    this.resetMarkers();

    this.drawInitialGraph(data);
    this.tick = 0;
  },

  resetMarkers: function() {
    var leftMarkerContainer = this.element.find('div.axis_left');
    var rightMarkerContainer = this.element.find('div.axis_right');

    if(leftMarkerContainer.length == 0) { return; }

    var resetMarkerContainer = function(container, numMarkers, scale) {
      container.css({opacity: 1});
      var incr = scale / numMarkers;
      for(var i = 0; i <= numMarkers; i++) {
        var markerValue = Math.floor(scale - (i * incr));
        container.append('<p>' + markerValue + '</p>');
      }
      container.animate({opacity: 0.3});
    };

    var numMarkers = this.numMarkers;
    var scale = this.scale;

    rightMarkerContainer.html('');
    resetMarkerContainer(rightMarkerContainer, numMarkers, scale);

    var millisecsBeforeUpdating = 0;
    if (this.lineWidth != null && this.messageRate != null) {
      var millisecsPerTick = 1000 / this.messageRate;
      var ticksPerFrame = this.graphWidth / (this.lineWidth * 15.0);
      millisecsBeforeUpdating = millisecsPerTick * ticksPerFrame;
    }

    if(leftMarkerContainer.html().length == 0) {
      // Update immediately if it's empty
      resetMarkerContainer(leftMarkerContainer, numMarkers, scale);
    } else {
      // Otherwise wait until the scale change reaches it
      setTimeout(function() {
        leftMarkerContainer.html('');
        resetMarkerContainer(leftMarkerContainer, numMarkers, scale);
      }, millisecsBeforeUpdating);
    }
  },

  drawInitialGraph: function(data) {
    var dataPoints = this.numPoints;

    if(data) {
      data = data.slice(0, dataPoints);
      dataPoints = Math.max(dataPoints - data.length, 0);

      while(dataPoints--) {
        this.drawLogPath(0, true);
      }

      for(var i = 0; i < data.length; i++) {
        this.drawLogPath(data[i], true);
      }
    } else {
      while(dataPoints--) {
        this.drawLogPath(0, true);
      }
    }
  },

  rescale: function(percent) {
    var oldScale = this.scale;

    if(percent === 0) { return; }
    if(percent > 0.9) {
      this.scale = this.scale * 2;
    } else if(percent < 0.08) {
      this.scale = this.scale / 4;
    } else if(percent < 0.16) {
      this.scale = this.scale / 2;
    } else {
      return;
    }

    // Set lower bound
    if (this.scale < 10) {
      this.scale = 10;
      // Return if no change in scale
      if (oldScale === this.scale) {
        return;
      }
    }

    this.drawSeparator(percent, oldScale, this.scale);
    this.resetMarkers();
  },

  drawSeparator: function(percent, oldScale, newScale) {
    var newHeight = percent * this.graphHeight;
    var oldHeight = percent * (oldScale/newScale) * this.graphHeight;
    var lineHeight = Math.abs(oldHeight - newHeight);
    var borderBottom = Math.min(oldHeight, newHeight);
    var borderTop = this.graphHeight - lineHeight - borderBottom;

    console.log(this.graphHeight);
    var line = $("<div style='border-bottom: " + this.graphHeight + "px solid #333; height: " + 0 + "px; border-top: " + 0 + "px solid #333; background-color: #FFF' class='line'></div>");
    line.prependTo(this.graph);
    this.graph.find("div:nth-child(200)").remove();
  },

  drawLogPath: function(value, isInitialFill) {
    this.tick++;

    var average = Math.round(value);
    var percent = average / this.scale;
    var height = Math.min(Math.floor(percent * this.graphHeight), this.graphHeight);
    var color = this.options.barColor || this.lineColors[this.scale] || this.lineColors.def;
    var lineHeight = this.graphHeight - height;

    if(this.tick % (this.messageRate * 2) == 0) { // Every 2 seconds
      this.element.attr('data-average', average);

      this.rescale(percent);

      if(this.tick % 1000 == 0) { this.tick = 0; }

      return;
    }

    var backgroundColor;
    if(this.tick % this.messageRate == 0) {
      backgroundColor = this.options.tickLineColor;
    } else {
      backgroundColor = this.options.bgLineColor;
    }


    var line = $("<div style='width: " + this.lineWidth + "px; height: " + height + "px; border-top: " + lineHeight + "px solid " + backgroundColor + "; background-color: " + color + "; border-bottom: 1px solid " + color + ";' class='line'></div>");
    line.prependTo(this.graph);

    if(!isInitialFill) {
      this.graph.children().last().remove();
    }
  }
});
