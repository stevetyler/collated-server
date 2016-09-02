'use strict';
var rp = require('request-promise');
// get channel names from channels.json
// find each channel name sub-folder and iterate through each message in subfolder
var url = 'http://localhost:3000/api/v1/items/slack';

const fs = require('fs');
const exportName = 'collated-dev-slack-export-aug-24-2016';
let team_id;
let channelNameArr;

let channelDataArr = JSON.parse(fs.readFileSync(exportName + '/channels.json', 'utf8'));
console.log('channel data', channelDataArr);
let channelNamesArr = channelDataArr.map(channelObj => {
  return channelObj.name;
});
//console.log('channelNamesArr', channelNamesArr); // ['general', 'random'] etc

let messageArrArr = channelNamesArr.reduce((arr, channelName) => {
  let jsonFilesArr = fs.readdirSync(exportName + '/' + channelName);
  //console.log('files arr', jsonFilesArr);
  let tmpArr = jsonFilesArr.map(fileName => {
    let filePath = exportName + '/' + channelName + '/' + fileName;
    //console.log(fs.readFileSync(filePath, 'utf8'));
    let message = JSON.parse(fs.readFileSync(filePath, 'utf8'))[0];

    console.log('message', message[0]);
    return {
      user: message.user, // get user_name
      text: message.text,
      timestamp: message.ts,
			slackChannelId: message.channel_id,
			slackTeamId: message.team_id
	  };
  });
  return arr.concat(tmpArr);
}, []);

let messageArr = [].concat.apply([], messageArrArr);
console.log('message arr', messageArr);
let options = {
  method: 'POST',
  uri: url,
  body: messageArr,
  json: true
};

// rp.post(options).then((parsedBody) => {
//   console.log('post succeeded', parsedBody);
// })
// .catch((err) => {
//   console.log('post error occurred', err);
// });
