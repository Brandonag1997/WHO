/* Dependencies */
let express = require("express");
let request = require("request");
let bodyParser = require("body-parser"); // for posting form data
let mysql = require("mysql");
let app = express();

let dbPass = require('../mysqlkey.json')

// Initialize Database
let conn = mysql.createConnection({
    host: dbPass.host,
    user: dbPass.user,
    password: dbPass.password,
    database: dbPass.database,
    multipleStatements: true
});

// Connect when server starts
conn.connect(function(err) {
	if (err) {
		console.log("Error connecting to database...");
	} else {
		console.log("Database successfully connected!");
	}
});


/* Endpoints */

// Only use static files from static folder
app.use(express.static("./static"));

let putAllInDatabase = function(){
    // Countries:
    let COUNTRIES = "http://apps.who.int/gho/athena/api/COUNTRY?format=json";
    request.get(COUNTRIES, function (error, response, body) {
        let json = JSON.parse(body);
        let countries = json.dimension[0].code;

        let statement = 'INSERT IGNORE INTO Country (CountryShort,DisplayName ) VALUES';

        for (let i = 0; i < countries.length; i++) {
            let label = mysql.escape(countries[i].label); // USA
            let display = mysql.escape(countries[i].display); // United States of America
            if (i !== 0) {
                statement += ",";
            }
            statement += '(' + label + ',' + display + ')';
        }

        conn.query(statement, function (err, rows, fields) {
            if (err) {
                console.log('Error during inserting countries...');
            } else {
                console.log('Countries updated!');
            }
        });
    });

    // Indicators:
    let INDICATORS = "http://apps.who.int/gho/athena/api/GHO?format=json";
    request.get(INDICATORS, function (error, response, body) {
        let json = JSON.parse(body);
        let indicators = json.dimension[0].code;

        let statement = 'INSERT IGNORE INTO Indicator (IndicatorShort, IndicatorName ) VALUES';

        for (let i = 0; i < indicators.length; i++) {
            let label = mysql.escape(indicators[i].label); // USA
            let display = mysql.escape(indicators[i].display); // United States of America

            // comma delimited
            if (i !== 0) statement += ",";
            statement += '(' + label + ',' + display + ')';
        }

        conn.query(statement, function (err, rows, fields) {
            if (err) {
                console.log('Error during inserting indicators...');
            } else {
                console.log('Indicators updated!');
            }
        });
    });
};

/* /getCountries
 * Purpose: Gets list of all countries WHO tracks
 * Notes: Contacts OUR database
 */
app.get("/getCountries", function (req, res) {
    let statement = "SELECT * FROM Country";
    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query processing...');
            res.send(err);
        } else {
            let output = {};
            for(let i = 0; i < rows.length; i++) {
                output[rows[i].CountryShort] = rows[i].DisplayName;
            }
            res.json(output);
        }
    });
});

app.get("/getCountryDisplays", function (req, res) {
    let statement = "SELECT * FROM Country";
    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query processing...');
            res.send(err);
        } else {
            let output = {};
            for(let i = 0; i < rows.length; i++) {
                output[rows[i].DisplayName] = rows[i].CountryShort;
            }
            res.json(output);
        }
    });
});

/* /getIndicators
 * Purpose: Gets list of all indicators WHO tracks
 * Notes: Contacts OUR database
 */
app.get("/getIndicators", function (req, res) {
    let statement = "SELECT * FROM Indicator";
    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query processing...');
            res.send(err);
        } else {
            let output = {};
            for(let i = 0; i < rows.length; i++) {
                output[rows[i].IndicatorShort] = rows[i].IndicatorName;
            }
            res.json(output);
        }
    });
});


/* /getRegions
 * Purpose: Gets list of all regions WHO tracks
 * Notes: Contacts OUR database
 */
app.get("/getRegions", function (req, res) {
    let statement = "SELECT DISTINCT Region FROM IndicatorValue";
    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query processing...');
            res.send(err);
        } else {
            let output = [];
            for(let i = 0; i < rows.length; i++) {
                output.push(rows[i]);
            }
            res.json(output);
        }
    });
});

/* /getRegions
 * Purpose: Gets list of all regions WHO tracks
 * Notes: Contacts OUR database
 */
app.get("/getRegions", function (req, res) {
    let statement = "SELECT DISTINCT Year FROM IndicatorValue";
    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query processing...');
            res.send(err);
        } else {
            let output = [];
            for(let i = 0; i < rows.length; i++) {
                output.push(rows[i]);
            }
            res.json(output);
        }
    });
});


/* /getIndicatorValues
 * Purpose: Gets all information on an "indicator" (disease, statistic, etc...)
 * Query parameters: indicator (Label for an indicator) EX: WHOSIS_000012
 * Notes: see notes for /get-countries
 */
app.get("/getIndicatorValues", function (req, res) {
    let indicator = req.query.indicator;

    // if not in database

    let URL = "http://apps.who.int/gho/athena/api/GHO/" + indicator + "?format=json&profile=simple";
    request.get(URL, function (error, response, body) {
        let json = JSON.parse(body);
        let dataPoints = json.fact;

        let statement = 'INSERT INTO IndicatorValue (Year,Value,Sex,CountryShort,Region,IndicatorShort) VALUES ';

        for (let i = 0; i < dataPoints.length; i++) {
            let country = mysql.escape(dataPoints[i].dim.COUNTRY); // Argentina
            let year = mysql.escape(dataPoints[i].dim.YEAR); // 2006
            let sex = mysql.escape(dataPoints[i].dim.SEX.substring(0,1)); // Female
            let region = mysql.escape(dataPoints[i].dim.REGION); // Americas
            let value = mysql.escape(dataPoints[i].Value);


            if( i !== 0 ) statement += ",";
            statement += '(' + year +  ',' + value +  ',' + sex + ',' + country + ',' + region + ',' + mysql.escape(indicator) + ')';
        }

        statement += ";";
        conn.query(statement,function(err, rows, fields) {
            if (err) {
                console.log('Error during query insert...');
                console.log(err);
                res.send(err);
            } else {
                res.send('good');
            }
        });

    });
});


app.get("/getIndicator", function (req, res) {
    let indicator = req.query.indicator;
    let year = req.query.indicator;
    let country = req.query.country;
    let region = req.query.region;
    if (country && region) {

    } else if(country) {

    } else if(region) {

    } else {

    }
});

/* Express Listen */

app.listen(8080, function (){
    console.log("Server listening on http://localhost:8080...")
});
