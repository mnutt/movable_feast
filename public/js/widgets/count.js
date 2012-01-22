$.fn.hummingbirdCount = function(socket, options) {
  if(this.length == 0) { return; }

  this.each(function() {
    new Hummingbird.Count($(this), socket, options);
  });

  return this;
};


if(!Hummingbird) { var Hummingbird = {}; }

Hummingbird.Count = function(element, socket, options) {
  this.element = element;
  this.socket = socket;

  var defaults = {
    averageOver: 1, // second
    ratePerSecond: 4,
    decimalPlaces: 0
  };

  this.options = $.extend(defaults, options);

  this.cost = $("#cost");
  this.initialize();
};

Hummingbird.Count.prototype = new Hummingbird.Base();

$.extend(Hummingbird.Count.prototype, {
  name: "Count",
  onMessage: function(value, average) {
    average = average * 3 / 2;
    this.element.text(average.toFixed(this.options.decimalPlaces));
    var price = parseFloat(this.cost.text());
    price += (0.04 * (average / 3 / 100) / (60 * 60 * 2));
    this.cost.text(price.toPrecision(3));
  }
});
