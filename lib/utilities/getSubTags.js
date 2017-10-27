// get array of items and reduce to array of array of tag ids
// iterate over

'use strict';

var idArr = [[1,2], [1,4,5], [2,3,4], [5], [2, 3], [4,5], [2,1]];

function getSubTags(id) {
  let tmpArr = idArr.reduce(function(acc, arr) {
    // compare ids with arr
    if (arr.indexOf(id) !== -1) {
      let filtered = arr.filter(elem => {
        return elem !== id;
      });
      acc.push(filtered);
    }
    return acc;
  }, []);

  let flattenedArr = [].concat.apply([], tmpArr);
  let uniqueArr = flattenedArr.filter(function(elem, pos) {
    return flattenedArr.indexOf(elem) === pos;
  });

  return uniqueArr.toString();
}


function getDiff(arr1, arr2) {
  if (arrContainsArr(arr1, arr2)) {


  }
}


function arrContainsArr(arr1, arr2) {
  // sort arrays, compare shortest first

  for (var i = 0; i < arr1.length; i++) {
    if (arr2.indexOf(arr1[i]) === -1) {
      return false;
    }
  }
  return true;
}

console.log(arrContainsArr([1,2], [1,2,3]) === true);
console.log(arrContainsArr([2,1], [1,2,3]) === true);
console.log(arrContainsArr([2,1], [1,3]) === false);
console.log(arrContainsArr([2,1,4], [1,2,4,5,6]) === true);
console.log(arrContainsArr([2,1,4], [1,3,4,5,6]) === false);


// console.log(getSubTags(1) === '2,4,5', 'getSubTags for id 1');
// console.log(getSubTags(2) === '1,3,4', 'getSubTags for id 2', getSubTags(2));
// console.log(getSubTags(3) === '2,4', 'getSubTags for id 3', getSubTags(3));
// console.log(getSubTags(4) === '1,2,3,5', 'getSubTags for id 4', getSubTags(4));
