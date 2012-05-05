// imports
var controllerHelpers = require('../app/controllerHelpers'),
	xmlFactory = require('../app/XmlBuilderFactory'),
	request = require('request'),
	fs = require('fs');

// constructor
function ExportController(gexfModel) {
	this.model = gexfModel;
}

ExportController.prototype = {
	/**
	 * Route definitions
	 */
	registerRoutes: function(app)
	{
		app.get('/v1/gexf', controllerHelpers.action(this, 'default'));
		app.get('/v2/gexf', controllerHelpers.action(this, 'gexfv2'));
		app.get('/v2/gexffinal', controllerHelpers.action(this, 'gexfv2final'));
	},

	/**
	 * Metadata action
	 */
	defaultAction: function(req, res)
	{
		res.header('Content-Type', 'application/xml');
		var self = this;

		var cacheFile = __dirname + '/../tmp/cache.gexf';
		fs.readFile(cacheFile, function (err, content) {
			if (err) {
				self.model.getEdges(function (edges) {
					self.model.getNodes(function (nodes) {
						var data = [
							{name: 'graph', attrs: {mode: "static", defaultedgetype: "undirected"}, children: [
								{name: 'nodes', children: nodes},
								{name: 'edges', children: edges},
							]}
						];

						var doc = xmlFactory.create('gexf', data, {
							xmlns: "http://www.gexf.net/1.2draft",
							'xmlns:viz': "http://www.gexf.net/1.2draft/viz",
							version: "1.2"
						});

				 		
				 		var xmlstr = doc.toString({ pretty: true });
				 		fs.writeFile(cacheFile, xmlstr, function (err) {
				 			if (err) {
				 				res.end('<err>unable to write cache file</err>');
				 				return;
				 			}
				 			res.end(xmlstr);
				 		})
					});
				});
			} else {
				res.end(content);
			}
		})
	}, 
	
	gexfv2Action: function(req, res)
	{
		res.header('Content-Type', 'application/xml');
		var self = this;

		var cacheFile = __dirname + '/../tmp/cachev2.gexf';
		fs.readFile(cacheFile, function (err, content) {
			if (err) {
				res.end('<err>unable to read cache file</err>');
 				return;
			} else {
				res.end(content);
			}
		})
	},
	
	gexfv2finalAction: function(req, res)
	{
		res.header('Content-Type', 'application/xml');
		var self = this;

		var cacheFile = __dirname + '/../tmp/cachev2final.gexf';
		fs.readFile(cacheFile, function (err, content) {
			if (err) {
				res.end('<err>unable to read cache file</err>');
 				return;
			} else {
				res.end(content);
			}
		})
	}
}

module.exports = ExportController;