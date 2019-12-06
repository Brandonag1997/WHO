CREATE DATABASE IF NOT EXISTS who_data;
USE who_data;

CREATE TABLE `Indicator` (
  `IndicatorShort` varchar(45) PRIMARY KEY NOT NULL,
  `IndicatorName` varchar(1000) NOT NULL,
  `Category` varchar(1000),
  `URL` varchar(1000)
);

CREATE TABLE `Country` (
  `DisplayName` varchar(200) PRIMARY KEY NOT NULL,
  `CountryShort` varchar(45) NOT NULL
);

CREATE TABLE `IndicatorValue` (
  `IndicatorID` int PRIMARY KEY NOT NULL AUTO_INCREMENT,
  `Year` year NOT NULL,
  `Value` float NOT NULL,
  `Sex` char,
  `Country` varchar(200),
  `Region` varchar(45) NOT NULL,
  `IndicatorShort` varchar(45) NOT NULL
);

ALTER TABLE `IndicatorValue` ADD FOREIGN KEY (`IndicatorShort`) REFERENCES `Indicator` (`IndicatorShort`);
ALTER TABLE `IndicatorValue` ADD FOREIGN KEY (`Country`) REFERENCES `Country` (`DisplayName`);

CREATE UNIQUE INDEX `IndicatorValue_index_0` ON `IndicatorValue` (`Year`, `Value`, `Sex`, `Country`, `Region`, `IndicatorShort`);
