# Collated-Server

This README outlines the details of collaborating on this Node application.


## Prerequisites

You will need the following things properly installed on your computer.

* [Git](http://git-scm.com/)
* [Node.js](http://nodejs.org/) 
* [MongoDB](https://docs.mongodb.com/manual/installation/)
* [ImageMagick] (https://www.npmjs.com/package/imagemagick)
* [AWS-CLI] optional
* [PM2]


## Installation

* `git clone https://github.com/stevetyler/collated-server` this repository
* `cd collated-server`
* `npm install`



## Running / Development

* `npm start`
* Visit your app at [http://collated-dev.net]

## Running / Production

* PM2 start ecosystem.config.js
* Visit your app at https://app.collated.net
* Express Lightning Deploy running on localhost:4000 which serves index.html

## Authentication

* Set AWS secret and id in ~/.aws/credentials
* Set auth.js file in /
