
let express = require('express')
let app = express();
let http = require('http');
let server = http.Server(app);
var Tickitscounter = 0;
var ticketsList = new Array();
let socketIO = require('socket.io');
let io = socketIO(server);
var amqp = require('amqplib/callback_api');
const port = process.env.PORT || 4000;


/**
 *code run in start up of server 
 *
 */

try {
    amqp.connect('amqp://localhost', function (error0, connection) {
        if (error0) {
            throw error0;
        }
        connection.createChannel(function (error1, channel) {
            if (error1) {
                throw error1;
            }
            var exchange = 'logs';

            channel.assertExchange(exchange, 'fanout', {
                durable: false
            });

            channel.assertQueue('', {
                exclusive: true
            }, function (error2, q) {
                if (error2) {
                    throw error2;
                }
                console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
                channel.bindQueue(q.queue, exchange, '');

                channel.consume(q.queue, function (msg) {
                    if (msg.content) {
                        ticketsList = JSON.parse(msg.content.toString());
                        console.log(" [x] %s", msg.content.toString());
                        io.emit("UpadteList", msg.content.toString());
                    }
                }, {
                        noAck: true
                    });
            });
        });
    });
}
catch (err) {
    console.log(err);
}
//send the current List to conencted devices 
io.on('connection', function (socket) {
    try {
    io.emit("UpadteList", JSON.stringify(ticketsList));
    }
    catch(err)
    {
        console.log(err);
    }
});

/**
 *code run  whene user issue new teckit 
 *web service 
 */
app.get("/newTickets", (req, res) => {
    try {

        Tickitscounter++;
        if (Tickitscounter < 10)
            ticketsList.push("A00" + Tickitscounter);
        else
            if (Tickitscounter >= 10 && Tickitscounter < 100) {
                ticketsList.push("A0" + Tickitscounter);
            }
            else
                ticketsList.push("A" + Tickitscounter);


        amqp.connect('amqp://localhost', function (error0, connection) {
            if (error0) {
                throw error0;
            }
            connection.createChannel(function (error1, channel) {
                if (error1) {
                    throw error1;
                }
                var exchange = 'logs';
                var msg = JSON.stringify(ticketsList);

                channel.assertExchange(exchange, 'fanout', {
                    durable: false
                });
                channel.publish(exchange, '', Buffer.from(msg));
                console.log(" [x] Sent %s", msg);
                io.emit("UpadteList", msg);

            });


        });
        res.send("Done");

    }
    catch (err) {
        res.send("Fiald");
        console.log(err);
    }
});


server.listen(port, () => {
    try {
        console.log(`started on port: ${port}`);
    }
    catch (err) {
        console.log(err);
    }
});














