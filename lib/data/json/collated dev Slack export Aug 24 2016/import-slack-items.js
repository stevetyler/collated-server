'use strict';
// get channel names from channels.json
// find each channel name sub-folder and iterate through each message in subfolder

const fs = require('fs');

function getChannelNames() {
  let channelDataArr = JSON.parse(fs.readFileSync('./channels.json', 'utf8'));
  let channelNamesArr = channelDataArr.map(channelObj => {
    return channelObj.name;
  });
  //console.log('channelNamesArr', channelNamesArr);
  return channelNamesArr;
}

// iterate over channel folder, parseJson and save item;
getChannelNames().map(channelName => {
  let messageFilesArr = fs.readdirSync(channelName);
  console.log('files arr', messageFilesArr);

  return messageFilesArr.map(fileName => {
    let filePath = channelName + '/' + fileName;
    console.log(JSON.parse(fs.readFileSync(filePath, 'utf8')));
  });
});

//console.log('fileNamesObj', fileNamesObj);
