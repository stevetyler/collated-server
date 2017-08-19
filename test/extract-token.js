//var string = 'connect.sid=s%3AtVk4ibrZH6Oh3xsGnQ; ios-token=bcfsX89jFTsCXurT';

//console.log(string.split('; '));
//console.log(string.substring(string.indexOf('ios-token='), string.length).replace('ios-token=', ''));
'use strict';

function extractToken(str) {
  var arr = str.split('; ');

  return arr.reduce((string, str)  => {
    var i = str.indexOf('ios-token');

    if (i > -1) {
      return string + str.replace('ios-token=', '');
    }
    else {
      return string + '';
    }
  }, '');
}

console.log(extractToken('connect.sid=s%3AtVk4ibrZH6Oh3xsGnQ; ios-token=bcfsX89jFTsCXurT') === 'bcfsX89jFTsCXurT');

console.log(extractToken('ios-token=bcfsX89jFTsCXurT; connect.sid=s%3AtVk4ibrZH6Oh3xsGnQ') === 'bcfsX89jFTsCXurT');

console.log(extractToken('token=bcfsX89jFTsCXurT; connect.sid=s%3AtVk4ibrZH6Oh3xsGnQ') === '');

console.log(extractToken('connect.sid=s%3AtVk4ibrZH6Oh3xsGnQ; ios-token=bcfsX89jFTsCXurT; connect.sid=s%k4ibrZH6Oh3xsGnQ; connect.sid=s%3AtVkH6Oh3xsGnQ;') === 'bcfsX89jFTsCXurT');
