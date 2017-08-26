'use strict';

let obj = {};

obj.prototype = Object.create({
  a : function(name) {
    return this.b(name);
  },
  b : function(str) {
    return str.toUpperCase();
  }

});


console.log(obj.prototype.a('steve'));
