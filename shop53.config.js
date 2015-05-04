module.exports = {
    "dbURI": process.env.RDS_CREDENTIAL,
    "redisHost": process.env.REDIS_HOST,
    "redisPort": process.env.REDIS_PORT,
    "baseUri": process.env.BASE_URI,
    "paypalId": process.env.PAYPAL_ID,
    "paypalSecret": process.env.PAYPAL_SECRET,
    "awsAccessKey": process.env.AWS_ACCESS_KEY_ID,
    "awsSecretKey": process.env.AWS_SECRET_KEY,
    "awsRegion": process.env.AWS_REGION,
    "s3ImagesBucket": process.env.AWS_S3_BUCKET,
    "s3ImagesDomain": process.env.AWS_S3_BUCKET + ".s3-" + process.env.AWS_REGION + ".amazonaws.com"
};