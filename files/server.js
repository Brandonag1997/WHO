/* Dependencies */
let express = require("express");
let request = require("request");
let bodyParser = require("body-parser"); // for posting form data
let mysql = require("mysql");

var dbPass = require('../mysqlkey.json')

var app = express();

/* Endpoints */

// Only use static files from static folder
app.use(express.static("./static"));

var conn = mysql.createConnection(
  {
  host  : dbPass.host,
  user  : dbPass.user,
  password  : dbPass.password,
  database  : dbPass.database,
  multipleStatements: true
}
)

/* /get-countries
 * Purpose: Gets list of all countries WHO tracks
 * Query parameters: None
 * Notes: Goes very slow, should only be used to update OUR database, every so often.
 */
app.get("/getCountries", function (req, res) {
    let URL = "http://apps.who.int/gho/athena/api/COUNTRY?format=json";
    request.get(URL, function (error, response, body) {
        let json = JSON.parse(body);
        let countries = json.dimension[0].code;

        // Because of the speed of connection to the WHO API, we might not want to output any JSON from this url
        // Or add a seperate URL to
        // Todo: Update to modify database
        // Remember: Country may already exist in the database.
        output = {};
        for (let i = 0; i < countries.length; i++) {
            let label = countries[i].label; // USA
            let display = countries[i].display; // United States of America
            output[label] = display;
        }

        res.json(output);
        res.end();
    });

});


/* /get-indicator
 * Purpose: Gets all information on an "indicator" (disease, statistic, etc...)
 * Query parameters: indicator (Label for an indicator) EX: WHOSIS_000012
 * Notes: see notes for /get-countries
 */
app.get("/getIndicator", function (req, res) {
    let indicator = req.query.indicator;
    let URL = "http://apps.who.int/gho/athena/api/GHO/" + indicator + "?format=json&profile=simple";
    request.get(URL, function (error, response, body) {
        let json = JSON.parse(body);
        let dataPoints = json.fact;

        // Again, see /get-countries
        // It will also be MUCH easier to sort this data in a database.
        // Todo: fix to work with database
        output = {
            "label": dataPoints[0].dim.GHO, // Life expectancy ...
            "results": []
        };

        for (let i = 0; i < dataPoints.length; i++) {
            let data = {}
            data.country = dataPoints[i].dim.COUNTRY; // Argentina
            data.year = dataPoints[i].dim.YEAR; // 2006...
            data.sex = dataPoints[i].dim.SEX; // Female
            data.region = dataPoints[i].dim.REGION; // Americas
            data.value = dataPoints[i].dim.Value; //
            //output.results.push(data);
            var statement = 'INSERT INTO IndicatorValue (Year,Value,Sex,CountryShort,RegionShort,IndicatorShort) VALUES (' + data.year +  ',' + data.value +  ',' +',' + data.sex + ',' + data.country + ',' + data.region + ',' + indicator + ');'
            conn.query(statement,
              function(err, rows, fields) {
                if (err) {
                  console.log('Error during query insert');
                }})

        }

        res.json(output);
        res.end();
    });
});

/* Express Listen */

app.listen(8080, function () {
    console.log("Server listening on http://localhost:8080...")
});
