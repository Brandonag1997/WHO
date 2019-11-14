//import required libraries
var express = require('express')
var request = require('request')
var app = express()
//set path and port to use
app.use(express.static("."))
app.listen(8080, () => console.log('Listening for events'))

app.get('/getIndicators', function (req,res){

  var URL = 'http://apps.who.int/gho/athena/api/GHO/?format=json'

  var response = request(URL, function (error,response,body){
    var indicatorObj = body;
    res.send(indicatorObj); //parse JSON object from API and return to client
  })


})
