CREATE DATABASE IF NOT EXISTS who_data3;
USE who_data3;

CREATE TABLE `Indicator` (
  `IndicatorShort` varchar(45) PRIMARY KEY NOT NULL,
  `IndicatorName` varchar(1000) NOT NULL,
  `Category` varchar(1000),
  `URL` varchar(1000)
);

CREATE TABLE `Country` (
  `DisplayName` varchar(200) PRIMARY KEY NOT NULL,
  `CountryShort` varchar(45) NOT NULL,
  `Region` varchar(45)
);

CREATE TABLE `IndicatorValue` (
  `IndicatorID` int PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `Year` year NOT NULL,
  `Value` varchar(200),
  `NumericValue` float NOT NULL,
  `Sex` char,
  `Country` varchar(200),
  `IndicatorShort` varchar(45) NOT NULL
);

ALTER TABLE `IndicatorValue` ADD FOREIGN KEY (`IndicatorShort`) REFERENCES `Indicator` (`IndicatorShort`) ON DELETE CASCADE;
ALTER TABLE `IndicatorValue` ADD FOREIGN KEY (`Country`) REFERENCES `Country` (`DisplayName`);

CREATE UNIQUE INDEX `IndicatorValue_index_0` ON `IndicatorValue` (`Year`, `Value`, `NumericValue`, `Sex`, `Country`, `IndicatorShort`);
