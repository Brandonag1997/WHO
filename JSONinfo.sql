SELECT DISTINCT(I.IndicatorName), V.Country, V.Sex
FROM Indicator AS I
INNER JOIN IndicatorValue AS V
ON V.IndicatorShort = I.IndicatorShort
GROUP BY V.Country, V.Sex
LIMIT 5;

SELECT INDICATOR_NAME TEXT,
YEAR DATE,
COUNTRY_NAME,
VALUE,
SEX
FROM INDICATOR
WHERE YEAR == ?


INSERT INTO Indicator (IndicatorShort,IndicatorName) VALUES ();

INSERT INTO IndicatorValue (IndicatorID,Year,Value,Sex,CountryShort,RegionShort,IndicatorShort) VALUES ()


SELECT * FROM COUNTRY
LIMIT 5;

SELECT JSON_OBJECT(
  DisplayName,'test'
)
FROM COUNTRY
LIMIT 5;

SELECT JSON_OBJECT(
  DisplayName,json_array(
    (SELECT
      JSON_OBJECT("fillKey","HIGH","numberOfThings",V.Value)

    FROM IndicatorValue AS V
    INNER JOIN COUNTRY AS C
    ON V.Country = C.DisplayName))
  )
FROM COUNTRY AS C
LIMIT 5;


SELECT * --V.Value
FROM IndicatorValue AS V
LIMIT 5;
