// imports
var controllerHelpers = require('../app/controllerHelpers'),
	xmlFactory = require('../app/XmlBuilderFactory'),
	request = require('request');

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
	},

	/**
	 * Metadata action
	 */
	defaultAction: function(req, res)
	{
		var self = this;
		this.model.getEdges(function (edges) {
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

		 		res.header('Content-Type', 'application/xml');
		 		res.end(doc.toString({ pretty: true }));
			});
		});
	}
}

module.exports = ExportController;