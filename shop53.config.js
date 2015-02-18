var dbhost = process.env.RDS_HOSTNAME,
    dbuser = process.env.RDS_USERNAME,
    dbpass = process.env.RDS_PASSWORD,
    dbname = process.env.RDS_DATABASE;

module.exports = {
    "dbURI": "mysql://" + dbuser + ":" + dbuser + "@" + dbhost + "/" + dbname
};