#!/usr/bin/env node

var crypto = require('crypto');

/*
 * credits to Nikolay for this short function to read stdin sync in NodeJS
 * http://st-on-it.blogspot.hk/2011/05/how-to-read-user-input-with-nodejs.html
 *
 * also modified to hide password input in cli
 */
function ask(question, format, hiddenInput, callback) {
    var stdin = process.stdin, stdout = process.stdout;

    stdin.resume();
    stdin.setEncoding('utf8');
    stdout.write(question + ": ");
    if( hiddenInput ) {
        process.stdin.setRawMode(true);
        password = '';
    }

    if( hiddenInput ) {
         stdin.on('data', function (char) {
            char = char + ""

            switch (char) {
                case "\n": case "\r": case "\u0004":
                    // They've finished typing their password
                    process.stdin.setRawMode(false);
                    callback(password);
                    stdin.pause();
                    break;
                case "\u0003":
                    // Ctrl C
                    process.exit();
                    break;
                default:
                    // More passsword characters
                    process.stdout.write('*');
                    password += char
                    break;
            }
        });
    } else {
        stdin.once('data', function(data) {
            data = data.toString().trim();

            if (format.test(data)) {
                callback(data);
            } else {
                stdout.write("It should match: "+ format +"\n");
                ask(question, format, hiddenInput, callback);
            }
        });
    }
}

function randomSalt() {
    return crypto.randomBytes(32).toString('base64');
}

function hashPassword(salt, password) {
    var hmac = crypto.createHmac('sha256', salt);
        hmac.update(password);

    return hmac.digest('base64');
}

console.log('This script only generates an INSERT query for inserting new user record.');
console.log('Please execute the query **manually** via your database client.');
console.log('');

ask("Email", /^.+@.+$/, false, function(email) {
    ask("Is Admin", /^(0|1)$/, false, function(is_admin) {
        ask("Password", /.{8,}/, true, function(password) {
            console.log("\n");

            var salt = randomSalt();
            var saltedPassword = hashPassword(salt, password);
            console.log('INSERT INTO users (`uid`,`email`,`password`,`salt`,`is_admin`) VALUES (NULL, \'%s\', \'%s\', \'%s\', \'%s\');', email, saltedPassword, salt, is_admin);

            process.exit();
        });
    });
});
