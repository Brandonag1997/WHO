CREATE DATABASE IF NOT EXISTS who_data;
USE who_data;

CREATE TABLE `Indicator` (
  `IndicatorShort` varchar(45) PRIMARY KEY NOT NULL,
  `IndicatorName` varchar(1000) NOT NULL,
  `Category` varchar(1000),
  `URL` varchar(1000)
);

CREATE TABLE `Country` (
  `CountryShort` varchar(45) PRIMARY KEY NOT NULL,
  `DisplayName` varchar(200) NOT NULL
);

CREATE TABLE `IndicatorValue` (
  `IndicatorID` int PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `Year` year NOT NULL,
  `Value` float NOT NULL,
  `Sex` char,
  `CountryShort` varchar(45),
  `Region` varchar(45) NOT NULL,
  `IndicatorShort` varchar(45) NOT NULL
);

ALTER TABLE `IndicatorValue` ADD FOREIGN KEY (`CountryShort`) REFERENCES `Country` (`CountryShort`);

ALTER TABLE `IndicatorValue` ADD FOREIGN KEY (`IndicatorShort`) REFERENCES `Indicator` (`IndicatorShort`);

CREATE UNIQUE INDEX `IndicatorValue_index_0` ON `IndicatorValue` (`Year`, `Value`, `Sex`, `CountryShort`, `Region`, `IndicatorShort`);
