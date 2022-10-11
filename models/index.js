const mongoose = require("mongoose");
const url = `mongodb://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@learning-shard-00-00.dxyen.mongodb.net:27017,learning-shard-00-01.dxyen.mongodb.net:27017,learning-shard-00-02.dxyen.mongodb.net:27017/${process.env.MONGO_DATABASE}?ssl=true&replicaSet=atlas-bc7vkg-shard-0&authSource=admin&retryWrites=true&w=majority`;

mongoose.Promise = global.Promise;
const db = {};
db.mongoose = mongoose;
db.url = url;
db.users = require("./users")(mongoose);
db.rooms = require("./rooms")(mongoose);
db.messages = require("./messages")(mongoose);

module.exports = db;
