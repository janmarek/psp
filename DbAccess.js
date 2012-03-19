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
			db.createCollection('appData', function(err, collection) {
				collection.findOne({name:'lastUpdate'}, function(err, item) {
		        	if (item == null) {
		        		collection.insert({name:'lastUpdate', value:null}, {safe:true}, function(err, result) {});
		        	}
		        });
				
				collection.findOne({name:'lastCheck'}, function(err, item) {
		        	if (item == null) {
		        		collection.insert({name:'lastCheck', value:null}, {safe:true}, function(err, result) {});
		        	}
		        });
			});
			db.createCollection('dataSchuze', function(err, collection) {});
			db.createCollection('dataPoslanci', function(err, collection) {});
			db.createCollection('snapshots', function(err, collection) {});
			console.log("We are connected to database");
		} else {
			console.log("Error connectiong to database");
		}
	});
}

DbAccess.prototype = {
	/**
	 * return database connection
	 */
	getDb: function()
	{
		return db;
	}
};

module.exports = DbAccess;