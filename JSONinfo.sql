SELECT DISTINCT(I.IndicatorName), V.CountryShort, V.Sex
FROM Indicator AS I
INNER JOIN IndicatorValue AS V
ON V.IndicatorShort = I.IndicatorShort
GROUP BY V.CountryShort, V.Sex;

SELECT INDICATOR_NAME TEXT,
YEAR DATE,
COUNTRY_NAME,
VALUE,
SEX
FROM INDICATOR
WHERE YEAR == ?


INSERT INTO Indicator (IndicatorShort,IndicatorName) VALUES ();

INSERT INTO IndicatorValue (IndicatorID,Year,Value,Sex,CountryShort,RegionShort,IndicatorShort) VALUES ()


SELECT DISTINCT(I.IndicatorName) FROM Indicator AS I
LIMIT 5;
