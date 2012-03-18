// imports
var mongo = require('mongodb'),
	Server = mongo.Server,
	Db = mongo.Db,
	db = null, server = null;


// constructor
function DbAccess() {
	server = new Server('localhost', 27017, {auto_reconnect: true});
	db = new Db('psp', server);

	db.open(function(err, db) {
		if(!err) {
			db.createCollection('appData', function(err, collection) {});
			db.createCollection('poslanci', function(err, collection) {});
			db.createCollection('schuze', function(err, collection) {});
			console.log("We are connected to database");
		} else {
			console.log("Error connectiong to database");
		}
	});
}

DbAccess.prototype = {
	/**
	 * Route definitions
	 */
	getDb: function()
	{
		return db;
	}
};

module.exports = DbAccess;