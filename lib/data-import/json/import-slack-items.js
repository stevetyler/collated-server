'use strict';
var rp = require('request-promise');
// get channel names from channels.json
// find each channel name sub-folder and iterate through each message in subfolder
var url = 'http://collated-dev/api/v1/items/slack';

const fs = require('fs');
const exportName = 'collated-dev-slack-export-aug-24-2016';

function getChannelNames() {
  let channelDataArr = JSON.parse(fs.readFileSync(exportName + '/channels.json', 'utf8'));
  let channelNamesArr = channelDataArr.map(channelObj => {
    return channelObj.name;
  });
  console.log('channelNamesArr', channelNamesArr); // ['general', 'random'] etc
  return channelNamesArr;
}

// iterate over channel folder, parseJson and save item;
let messageArr = getChannelNames().reduce((arr, channelName) => {
  let jsonFilesArr = fs.readdirSync(exportName + '/' + channelName);
  console.log('files arr', jsonFilesArr);
  let tmpArr = jsonFilesArr.map(fileName => {
    let filePath = exportName + '/' + channelName + '/' + fileName;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  });
  return arr.concat(tmpArr);
}, []);

//console.log('messageArr', messageArr[0][0]);

rp.post(url, messageArr);
