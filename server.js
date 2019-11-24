var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({extended:false}));
app.use(bodyParser.json());

var request = require('request');

app.use(express.static("."));

app.listen(8080, function(){
	console.log('Server Listening on Port 8080...');
});