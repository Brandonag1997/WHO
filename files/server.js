var fs = require('fs');

/* Dependencies */
let express = require("express");
let request = require("request");
let mysql = require("mysql");
let app = express();

let schedule = require('node-schedule');

let dbPass = require('../mysqlkey.json');
let countryToCode = require('./static/countryTable.json');
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
    let COUNTRIES = "https://ghoapi.azureedge.net/api/DIMENSION/COUNTRY/DimensionValues"
    request.get(COUNTRIES, function (error, response, body) {
      if (body=="Api is in maintenance mode") {
        console.log("data not available");
      } else {
        let json = JSON.parse(body);
        let countries = json.value;

        let statement = 'INSERT IGNORE INTO Country (CountryShort,DisplayName,Region ) VALUES';
        var label;
        var display;
        var region;
        for (let i = 0; i < countries.length; i++) {
            label = mysql.escape(countries[i].Code); // USA
            display = mysql.escape(countries[i].Title); // United States of America
            if (countries[i].ParentDimension=="REGION") {
              region = mysql.escape(countries[i].ParentTitle); //Americas
            } else {
              region = "'Not Specified'";
            }
            if (i !== 0) {
                statement += ",";
            }
            statement += '(' + label + ',' + display + ',' + region + ')';
        }

        conn.query(statement, function (err, rows, fields) {
            if (err) {
                console.log('Error during inserting countries...');
            } else {
                console.log('Countries updated!');
            }
        });
      }
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

            var category = mysql.escape("Other");
            for (let j = 0; j < indicators[i].attr.length; j++) {
              if (indicators[i].attr[j].category === "CATEGORY"){
                category = mysql.escape(indicators[i].attr[j].value);
              }
            }

            let url = mysql.escape(indicators[i].url);
            if (indicators[i].url !== "" ) {//&& indicators[i].display_sequence !== 0 && indicators[i].display_sequence !== 35) { //why display_sequence 0 & 35 not used
                // comma delimited
                if (i !== 0) statement += ",";
                statement += '(' + label + ',' + display + ',' + category + ',' + url + ')';
            }
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

function selectIndicators(qyear, rows){
  if (qyear != null) {
      let min = rows[0];
      let max = rows[rows.length - 1];
      let output = {};

      let range = (max.NumericValue - min.NumericValue) / 3;

      for (let i = 0; i < rows.length; i++) {
          let fillKey;
          if (rows[i].NumericValue < range) {
              fillKey = "LOW";
          } else if (rows[i].NumericValue < 2 * range) {
              fillKey = "MEDIUM";
          } else {
              fillKey = "HIGH";
          }

          output[rows[i].CountryShort] = {"fillKey": fillKey, "data": rows[i]};
      }

      return output;
  } else {

      // indicators for all
      let output = {};
      output[rows[0].Country] = [];
      for (let i = 0; i < rows.length; i++) {
          output[rows[i].Country].push({"year": rows[i].Year, "value": rows[i].NumericValue, "sex": rows[i].Sex});
          // output[rows[i].Country] = [];
          // for (var j = 0; j < rows[i].country; j++) {
          //   output[rows[i].Country].push({"year": rows[i+j].Year, "value": rows[i+j].NumericValue, "sex": rows[i+j].Sex})
          // }
          // i = i + j - 1;
      }
      return output;
  }
}

/* /getCountries
 * Purpose: Gets list of all countries WHO tracks
 * Notes: Contacts OUR database
 */
app.get("/getCountries", function (req, res) {
    let statement = "SELECT CountryShort, DisplayName FROM Country";
    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query processing...');
            res.json({"failed":"getCountries"}); res.status(500);
        } else {
            let output = {};
            for(let i = 0; i < rows.length; i++) {
                output[rows[i].CountryShort] = rows[i].DisplayName;
            }
            res.json(output);
        }
    });
});

// Reverse display ?Is this endpoint needed?
app.get("/getCountryDisplays", function (req, res) {
    let statement = "SELECT CountryShort, DisplayName FROM Country";
    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query processing...');
            res.json({"failed":"getCountryDisplays"}); res.status(500);
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
    let statement = "SELECT IndicatorShort, IndicatorName FROM Indicator ORDER BY IndicatorName";
    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query processing...');
            res.json({"failed":"getIndicators"}); res.status(500);
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
    let qyear = req.query.year;
    let yearStatement = "";
    if (qyear) yearStatement= `AND Year=${qyear} ORDER BY NumericValue;`;
    else yearStatement= `ORDER BY Country;`;
    let statement = "";
    if (qyear) {
      statement = `SELECT I.IndicatorName, I.Category, I.URL, I.IndicatorShort, IV.Year, IV.Value, IV.NumericValue, IV.Country, IV.Sex, C.CountryShort FROM Indicator AS I INNER JOIN IndicatorValue AS IV ON IV.IndicatorShort = I.IndicatorShort INNER JOIN COUNTRY AS C ON C.DisplayName = IV.Country WHERE I.IndicatorShort = ${mysql.escape(indicator)} ${yearStatement}; `;
    } else {
      statement = `SELECT I.IndicatorName, I.Category, I.URL, IV.Year, IV.Value, IV.NumericValue, IV.Country, IV.Sex, count(*) over (partition by IV.Country) AS countryCount FROM Indicator AS I INNER JOIN IndicatorValue AS IV ON IV.IndicatorShort = I.IndicatorShort
                    WHERE I.IndicatorShort = ${mysql.escape(indicator)} ORDER BY IV.Country, IV.Sex, IV.NumericValue;`;
    }

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...'  + err.sqlMessage);
            res.json({"failed":"getIndicatorValues1"});
        } else {
            if (rows.length >= 1) {
                //if(rows[0].Country !== null) {
                response = selectIndicators(qyear, rows);
                res.json(response);
                // } else {
                //     conn.query(`DELETE FROM Indicator WHERE IndicatorShort=${mysql.escape(indicator)};`)
                // }

            } else { //indicator not yet in database so get it from WHO API

                let URL = "https://ghoapi.azureedge.net/api/" + indicator;
                request.get(URL, function (error, response, body) {
                    let json = JSON.parse(body);
                    //let dataPoints = json.fact;
                    let dataPoints = json.value;

                    let statementI = 'INSERT IGNORE INTO IndicatorValue (Year,Value,NumericValue,Sex,Country,IndicatorShort) VALUES ';
                    let datapoints = 0;

                    for (let i = 0; i < dataPoints.length; i++) {
                        //let country = mysql.escape(dataPoints[i].dim.COUNTRY); // Argentina
                        let country;
                        let year;
                        let sex;
                        let value;
                        let numericalvalue
                        //only load in indicator values for countries
                        if (dataPoints[i].SpatialDimType=="COUNTRY") {
                          let countryCode = dataPoints[i].SpatialDim;
                          country = mysql.escape(Object.keys(countryToCode).find(key => countryToCode[key] === countryCode)); // ARG
                          if (dataPoints[i].TimeDimType=="YEAR") {
                            year = mysql.escape(dataPoints[i].TimeDim); // 2006
                          }

                          if (dataPoints[i].Dim1Type=="SEX") {
                            if (dataPoints[i].Dim1=="MLE") {
                              sex = "'M'";
                            } else if (dataPoints[i].Dim1=="FMLE") {
                              sex = "'F'";
                            } else if (dataPoints[i].Dim1=="BTSX") {
                              sex = "'B'";
                            }
                          } else {
                            sex="'?'";
                          }

                          value = mysql.escape(dataPoints[i].Value);
                          numericalvalue = mysql.escape(dataPoints[i].NumericValue);

                          if (statementI != 'INSERT IGNORE INTO IndicatorValue (Year,Value,NumericValue,Sex,Country,IndicatorShort) VALUES ') statementI += ",";
                          statementI += '(' + year + ',' + value + ',' + numericalvalue + ',' + sex + ',' + country + ',' + mysql.escape(indicator) + ')';
                          datapoints += 1;
                        }


                    }

                    statementI += ";";
                    //console.log(statement);

                    conn.query(statementI, function (err, rows2, fields) {
                        if (err) {
                          if (datapoints > 0) {
                            console.log('Known Issue, WHO Data incorrect... Error during query insert...' + indicator + err.sqlMessage);
                            //conn.query(`DELETE FROM Indicator WHERE IndicatorShort=${mysql.escape(indicator)};`,
                            //conn.query(`SELECT IndicatorName FROM Indicator WHERE IndicatorShort=${mysql.escape(indicator)};`,
                          } else {
                            console.log(indicator + ' does not contain data for any countries');
                          }
                            conn.query(`SELECT IndicatorName FROM Indicator WHERE IndicatorShort=${mysql.escape(indicator)};`, function (err, rows, fields) {
                                res.json({"failed":"getIndicatorValues2"});
                                res.status(500);
                            });
                        } else {

                            // IT would be better to put this in a function rather than having it much larger,
                            // to avoid duplicate code, but we are on a deadline...
                            //let statement = `SELECT * FROM IndicatorValue AS i LEFT JOIN Country AS c ON i.Country = c.DisplayName INNER JOIN Indicator AS i2 ON i.IndicatorShort = i2.IndicatorShort WHERE i.IndicatorShort=${mysql.escape(indicator)} ${yearStatement}`;
                            conn.query(statement,function(err, rows3, fields) {
                                if (err) {
                                    console.log('Error during query select...'  + err.sqlMessage);
                                    res.json({"failed":"getIndicatorValues3"}); res.status(500);
                                } else {
                                    if(rows3.length > 0) {
                                      response = selectIndicators(qyear, rows3);
                                      res.json(response);
                                    } else {
                                        res.json({"failed":"getIndicatorValues5 "+rows.length}); res.status(500);
                                    }
                                }
                            });
                        }
                    }); //

                });
            }
        }
    });
});

function insertIndicator(indicator, indicatorName) {
  let URL = "https://ghoapi.azureedge.net/api/" + indicator;
  request.get(URL, function (error, response, body) {
      let json = JSON.parse(body);
      let dataPoints = json.value;

      let insertstatement = 'INSERT IGNORE INTO IndicatorValue (Year,Value,NumericValue,Sex,Country,IndicatorShort) VALUES ';

      for (let i = 0; i < dataPoints.length; i++) {
        let country;
        let year;
        let sex;
        let value;
        //only load in indicator values for countries
        if (dataPoints[i].SpatialDimType=="COUNTRY") {
          let countryCode = dataPoints[i].SpatialDim;
          country = mysql.escape(Object.keys(countryToCode).find(key => countryToCode[key] === countryCode)); // ARG
          if (dataPoints[i].TimeDimType=="YEAR") {
            year = mysql.escape(dataPoints[i].TimeDim); // 2006
          }

          if (dataPoints[i].Dim1Type=="SEX") {
            if (dataPoints[i].Dim1=="MLE") {
              sex = "'M'";
            } else if (dataPoints[i].Dim1=="FMLE") {
              sex = "'F'";
            } else if (dataPoints[i].Dim1=="BTSX") {
              sex = "'B'";
            }
          } else {
            sex="'?'";
          }

          value = mysql.escape(dataPoints[i].Value);
          numericalvalue = mysql.escape(dataPoints[i].NumericValue);

          if (insertstatement != 'INSERT IGNORE INTO IndicatorValue (Year,Value,NumericValue,Sex,Country,IndicatorShort) VALUES ') insertstatement += ",";
          insertstatement += '(' + year + ',' + value + ',' + numericalvalue + ',' + sex + ',' + country + ',' + mysql.escape(indicator) + ')';
        }
      }

      insertstatement += "ON DUPLICATE KEY UPDATE Year=VALUES(Year),Value=VALUES(Value),NumericValue=VALUES(NumericValue),Sex=VALUES(Sex),Country=VALUES(Country),IndicatorShort=VALUES(IndicatorShort);";

      conn.query(insertstatement, function(err, rows2, fields){
        if (err) {
            console.log('Error updating ' + indicatorName + err.sqlMessage);
            return "failed";
        }
        else {
            console.log('Updated data for ' + indicatorName);
            return indicatorName;
        }
      })
      });
}

function updateIndicators() {
  let statement = 'SELECT I.IndicatorName, I.IndicatorShort FROM Indicator as I INNER JOIN (SELECT DISTINCT(IndicatorShort) from IndicatorValue) AS IV ON I.IndicatorShort = IV.IndicatorShort;'
  conn.query(statement,function(err, rows, fields) {
      if (err) {
          console.log('Error during query select...' + err.sqlMessage);
      } else {

          for(let i = 0; i < rows.length; i++) {
              let indicator=rows[i].IndicatorShort;
              let indicatorName=rows[i].IndicatorName;
              insertIndicator(indicator, indicatorName)
          }
      }
  });
};

/**
  *
  */

app.get("/checkForIndicator", function(req, res){
    let indicator = req.query.indicator;
    let indicatorName = req.query.indicatorName;
    let statement = `SELECT I.IndicatorShort, I.IndicatorName, COUNT(*) FROM IndicatorValue AS IV INNER JOIN Indicator AS I ON I.IndicatorShort = IV.IndicatorShort WHERE IV.IndicatorShort=${mysql.escape(indicator)} GROUP BY I.IndicatorShort, I.IndicatorName;`
    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...' + err.sqlMessage);
        } else {

            if(rows.length<1) {
                console.log("adding indicator");
                response = insertIndicator(indicator, indicatorName);
                res.json({"found": response});
            } else {
              res.json({"found": rows[0].IndicatorName});
              console.log("indicator found");
            }

        }
    });
});

/**
 * /getYearsForIndicator
 * Get all of the years for an indicator
 */

app.get("/getYearsForIndicator", function(req, res){
    let indicator = mysql.escape(req.query.indicator);
    let statement = `SELECT Year, COUNT(DISTINCT(Country)) AS nCountries FROM IndicatorValue WHERE IndicatorShort=${indicator} GROUP BY Year ORDER BY Year DESC;`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...' + err.sqlMessage);

            conn.query(`DELETE FROM Indicator WHERE IndicatorShort=${mysql.escape(indicator)};`,function(err, rows, fields) {
                res.json({"failed":"getYearsForIndicator"}); res.status(500);
            });
        } else {
            let output = {"year": [], "nCountries": []};
            for(let i = 0; i < rows.length; i++) {
              output.year.push(rows[i].Year);
              output.nCountries.push(rows[i].nCountries)
            }

            res.json(output);
        }
    });
});

app.get("/getCountriesForIndicator", function(req, res){
    let indicator = mysql.escape(req.query.indicator);
    let statement = `SELECT DISTINCT(Country) FROM IndicatorValue WHERE IndicatorShort=${indicator};`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.json({"failed":"getCountriesForIndicator"}); res.status(500);
        } else {
            res.json(rows);
        }
    });

});


app.get("/getRegionsForIndicator", function(req, res){
    let indicator = mysql.escape(req.query.indicator);
    let statement = `SELECT DISTINCT(Region) FROM COUNTRY AS C INNER JOIN IndicatorValue AS IV ON C.CountryShort AND IV.Country WHERE IndicatorShort=${indicator};`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.json({"failed":"getRegionsForIndicator"}); res.status(500);
        } else {
            res.json(rows);
        }
    });

});


app.get("/getCategories", function(req, res){
    let statement = `SELECT DISTINCT(Category) FROM Indicator  ORDER BY Category;`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.json({"failed":"getCategories"}); res.status(500);
        } else {
            let output = [];

            for(let i = 0; i < rows.length; i++) {
                let bad_categories = ["AMR GLASS Coordination", "AMR GLASS Quality assurance", "AMR GLASS Surveillance"]; //whats wrong with these?
                if (bad_categories.indexOf(rows[i].Category) === -1)
                    output.push(rows[i].Category);
            }
            res.json(output);
        }
    });
});

/**
 * /getIndicatorsForCategory
 * get indicators for a category
 */
app.get("/getIndicatorsForCategory", function(req, res){
    let category = mysql.escape(req.query.category);
    let statement = `SELECT * FROM Indicator WHERE Category=${category} ORDER BY IndicatorName;`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.json({"failed":"getIndicatorsForCategory"}); res.status(500);
        } else {
            let output = {};
            for(let i = 0; i < rows.length; i++) {
                output[rows[i].IndicatorShort] = rows[i].IndicatorName;
            }
            res.json(output);
        }
    });
});

/**
 * /getIndicator
 * get data for one indicator
 */

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
            res.json({"failed":"getIndicator"}); res.status(500);
        } else {
            res.json(rows);
        }
    });
});
/**
 * /getIndicatorsForCategory
 * get indicators for a category
 */
app.get("/getIndicatorsForCategory", function(req, res){
    let category = mysql.escape(req.query.category);
    let statement = `SELECT * FROM Indicator WHERE Category=${category} ORDER BY IndicatorName;`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.json({"failed":"getIndicatorsForCategory"}); res.status(500);
        } else {
            let output = {};
            for(let i = 0; i < rows.length; i++) {
                output[rows[i].IndicatorShort] = rows[i].IndicatorName;
            }
            res.json(output);
        }
    });
});

/**
 * /getIndicatorsForCountry
 * get indicators for a country
 */
app.get("/getIndicatorsForCountry", function(req, res){
    let indicator = req.query.indicator;
    let country = req.query.country;
    let statement = `SELECT IV.Country, I.IndicatorName, I.Category, I.URL, IV.Year, IV.Value, IV.NumericValue, IV.Sex FROM Indicator AS I INNER JOIN IndicatorValue AS IV ON IV.IndicatorShort = I.IndicatorShort
                  WHERE I.IndicatorShort = ${mysql.escape(indicator)} AND IV.Country = ${mysql.escape(country)} ORDER BY IV.Sex, IV.NumericValue;`;

    conn.query(statement,function(err, rows, fields) {
        if (err) {
            console.log('Error during query select...');
            res.json({"failed":"getIndicatorsForCategory"}); res.status(500);
        } else {
          if (rows.length >= 1) {
            response = selectIndicators(null, rows);
            //console.log(response);
            res.json(response);
          }
        }
    });
});

/* Express Listen */

app.listen(8080, function (){
    console.log("Server listening on http://localhost:8080...")
});

putAllInDatabase();

var j = schedule.scheduleJob('0 0 * * *', function(){
  console.log('Running nightly indicator update');
  updateIndicators();
});
