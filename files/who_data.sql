CREATE DATABASE IF NOT EXISTS who_data;
USE who_data;

CREATE TABLE `Indicator` (
  `IndicatorShort` varchar(45) PRIMARY KEY NOT NULL,
  `IndicatorName` varchar(200) NOT NULL
);

CREATE TABLE `Country` (
  CountryShort varchar(45) PRIMARY KEY NOT NULL,
  DisplayName varchar(200) NOT NULL
);

CREATE TABLE `Region` (
  `RegionShort` varchar(45) PRIMARY KEY NOT NULL,
  `DisplayName` varchar(200) NOT NULL
);

CREATE TABLE `IndicatorValue` (
  `IndicatorID` int PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `Year` year NOT NULL,
  `Value` float NOT NULL,
  `Sex` char NOT NULL,
  `CountryShort` varchar(45) NOT NULL,
  `RegionShort` varchar(45) NOT NULL,
  `IndicatorShort` varchar(45) NOT NULL
);

ALTER TABLE `IndicatorValue` ADD FOREIGN KEY (`CountryShort`) REFERENCES `Country` (`CountryShort`);

ALTER TABLE `IndicatorValue` ADD FOREIGN KEY (`RegionShort`) REFERENCES `Region` (`RegionShort`);

ALTER TABLE `IndicatorValue` ADD FOREIGN KEY (`IndicatorShort`) REFERENCES `Indicator` (`IndicatorShort`);

CREATE UNIQUE INDEX `IndicatorValue_index_0` ON `IndicatorValue` (`Year`, `Value`, `Sex`, `CountryShort`, `RegionShort`, `IndicatorShort`);
