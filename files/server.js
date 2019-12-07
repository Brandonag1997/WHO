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
    database: dbPass.database, // use who_data.sql to create database
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

        let statement = 'INSERT IGNORE INTO Indicator (IndicatorShort, IndicatorName,  Category, URL) VALUES';

        for (let i = 0; i < indicators.length; i++) {
            let label = mysql.escape(indicators[i].label); // USA
            let display = mysql.escape(indicators[i].display); // United States of America
            //let test = indicators[i].attr;
            var category = null
            for (let j = 0; j < indicators[i].attr.length; j++) {
              if (indicators[i].attr[j].category === "CATEGORY"){
                category = mysql.escape(indicators[i].attr[j].value);
              }
            }

            if(category===null) { category = mysql.escape("Other"); }

            let url = mysql.escape(indicators[i].url);
            // comma delimited
            if (i !== 0) statement += ",";
            statement += '(' + label + ',' + display + ',' + category + ',' + url + ')';
        }

        conn.query(statement, function (err, rows, fields) {
            if (err) {
                console.log('Error during inserting indicators...');
                console.log(err.sqlMessage);
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
    let statement = "SELECT * FROM Indicator ORDER BY IndicatorName";
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


/* /getIndicatorValues
 * Purpose: Gets all information on an "indicator" (disease, statistic, etc...)
 * Query parameters: indicator (Label for an indicator) EX: WHOSIS_000012
 * Notes: see notes for /get-countries
 */
app.get("/getIndicatorValues", function (req, res) {
    let indicator = req.query.indicator;

    // year not required
    let year = req.query.year;
    let yearStatement = "";
    if (year) yearStatement= `WHERE Year=${year}`;

    // if not in database
    let statement = `SELECT * FROM IndicatorValue AS i INNER JOIN Country AS c ON i.Country = c.DisplayName INNER JOIN Indicator AS i2 ON i.IndicatorShort = i2.IndicatorShort ${yearStatement} ORDER BY Value;`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query insert...');
            res.send(err);
        } else {
            if(rows.length >= 1) {
                let min = rows[0];
                let max = rows[rows.length-1];
                let output = {};

                let range = (max.Value - min.Value)/3;

                for(let i = 0; i < rows.length; i++) {
                    let fillKey;
                    if(rows[i].Value < range) {
                        fillKey = "LOW";
                    } else if (rows[i].Value < 2*range){
                        fillKey = "LOW";
                    } else {
                        fillKey = "HIGH";
                    }

                    output[rows[i].CountryShort] = {"fillKey":fillKey, "data": rows[i]};
                }

                res.json(output);

            } else {

                let URL = "http://apps.who.int/gho/athena/api/GHO/" + indicator + "?format=json&profile=simple";
                request.get(URL, function (error, response, body) {
                    let json = JSON.parse(body);
                    let dataPoints = json.fact;

                    let statement = 'INSERT IGNORE INTO IndicatorValue (Year,Value,Sex,Country,Region,IndicatorShort) VALUES ';

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
                            res.send(err);
                        } else {
                            res.send('good');
                        }
                    });

                });
            }
        }
    });
});

app.get("/getYearsForIndicator", function(req, res){
    let indicator = mysql.escape(req.query.indicator);
    let statement = `SELECT DISTICT(Year) FROM IndicatorValue WHERE IndicatorShort=${indicator};`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.send(err);
        } else {
            res.json(rows);
        }
    });

});

app.get("/getCountriesForIndicator", function(req, res){
    let indicator = mysql.escape(req.query.indicator);
    let statement = `SELECT DISTICT(Country) FROM IndicatorValue WHERE IndicatorShort=${indicator};`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.send(err);
        } else {
            res.json(rows);
        }
    });

});


app.get("/getRegionsForIndicator", function(req, res){
    let indicator = mysql.escape(req.query.indicator);
    let statement = `SELECT DISTICT(Region) FROM IndicatorValue WHERE IndicatorShort=${indicator};`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.send(err);
        } else {
            res.json(rows);
        }
    });

});


app.get("/getCategories", function(req, res){
    let statement = `SELECT DISTINCT(Category) FROM Indicator  ORDER BY IndicatorName;`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.send(err);
        } else {
            let output = [];

            for(let i = 0; i < rows.length; i++) {
                output.push(rows[i].Category);
            }

            res.json(output);
        }
    });
});

app.get("/getIndicatorsForCategory", function(req, res){
    let category = mysql.escape(req.query.category);
    let statement = `SELECT * FROM Indicator WHERE Category=${category} ORDER BY IndicatorName;`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.send(err);
        } else {
            res.json(rows);
        }
    });
});


app.get("/getIndicator", function (req, res) {
    let indicator = mysql.escape(req.query.indicator);
    let year = mysql.escape(req.query.year);
    let country = req.query.country;
    let region = req.query.region;
    let statement = "";
    if (country) {
        country = mysql.escape(country);
        statement = `SELECT * FROM IndicatorValue WHERE Country=${country} AND IndicatorShort=${indicator} AND Year=${year};`;
    } else if(region) {
        region = mysql.escape(region);
        statement = `SELECT * FROM IndicatorValue WHERE Region=${region} AND IndicatorShort=${indicator} AND Year=${year};`;
    } else {
        statement = `SELECT * FROM IndicatorValue WHERE IndicatorShort=${indicator} AND Year=${year};`;
    }

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.send(err);
        } else {
            res.json(rows);
        }
    });
});

/* Express Listen */

app.listen(8080, function (){
    console.log("Server listening on http://localhost:8080...")
});

putAllInDatabase();
