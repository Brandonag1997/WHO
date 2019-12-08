# WHO
A web app to display World Health Organization Data

### Node Dependencies
- express
- request
- mysql
- node-schedule

### Database setup
- MySQL Database
- Set up mysqlkey.json in this folder with the following formatting:
    - { "host": "localhost", "user": "username", "password": "", "database": "who_data" }
- use who_data.sql to create database