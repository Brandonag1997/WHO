/* Dependencies */
let express = require("express");
let request = require("request");
let bodyParser = require("body-parser"); // for posting form data
let mysql = require("mysql");

let dbPass = require('../mysqlkey.json')

let app = express();

/* Endpoints */

// Only use static files from static folder
app.use(express.static("./static"));

let conn = mysql.createConnection({
  host  : dbPass.host,
  user  : dbPass.user,
  password  : dbPass.password,
  database  : dbPass.database,
  multipleStatements: true
});

/* /getCountries
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
        let statement = 'INSERT INTO Country (CountryShort,DisplayName ) VALUES';

        let output = {};
        for (let i = 0; i < countries.length; i++) {
            let label = countries[i].label; // USA
            let display = countries[i].display; // United States of America
            output[label] = display;
            if( i != 0 ) {
                statement += ","
            }
            statement += '(' +label + ',' + display + ')';
            conn.query(statement,
                function(err, rows, fields) {
                        if (err) {
                            console.log('Error during query insert');
                            console.log(err);
                            res.send(err);
                        } else {
                            res.send('good');
                        }})
                      }
    });

});


/* /getIndicator
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
        let output = {
            "label": dataPoints[0].dim.GHO, // Life expectancy ...
            "results": []
        };

        let statement = 'INSERT INTO IndicatorValue (Year,Value,Sex,CountryShort,RegionShort,IndicatorShort) VALUES ';

        for (let i = 0; i < dataPoints.length; i++) {
            let data = {}
            data.country = mysql.escape(dataPoints[i].dim.COUNTRY); // Argentina
            data.year = mysql.escape(dataPoints[i].dim.YEAR); // 2006...
            data.sex = mysql.escape(dataPoints[i].dim.SEX.substring(0,1)); // Female
            data.region = mysql.escape(dataPoints[i].dim.REGION); // Americas
            data.value = mysql.escape(dataPoints[i].Value);
            //output.results.push(data);
            if( i !== 0 ) {
                statement += ","
            }
            statement += '(' + data.year +  ',' + data.value +  ',' + data.sex + ',' + data.country + ',' + data.region + ',' + indicator + ')';
        }

        statement += ";";
        conn.query(statement,
            function(err, rows, fields) {
                    if (err) {
                        console.log('Error during query insert');
                        console.log(err);
                        res.send(err);
                    } else {
                        res.send('good');
                    }})


    });
});

/* Express Listen */

app.listen(8080, function () {
    console.log("Server listening on http://localhost:8080...")
});
