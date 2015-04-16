module.exports = {
    "dbURI": process.env.RDS_CREDENTIAL,
    "redisHost": process.env.REDIS_HOST,
    "redisPort": process.env.REDIS_PORT,
    "baseUri": process.env.BASE_URI,
    "paypalId": process.env.PAYPAL_ID,
    "paypalSecret": process.env.PAYPAL_SECRET,
};