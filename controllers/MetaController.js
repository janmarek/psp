// imports
var controllerHelpers = require('../app/controllerHelpers');
var xmlFactory = require('../app/XmlBuilderFactory');

// constructor
function MetaController()
{
}

MetaController.prototype = {
	/**
	 * Route definitions
	 */
	registerRoutes: function(app)
	{
		app.get('/v1/metadata', controllerHelpers.action(this, 'default'));
	},

	/**
	 * Metadata action
	 */
	defaultAction: function(req, res)
	{
		var doc = xmlFactory.create('metadata', [
			{name: 'name', text: 'Poslanecká sněmovna'},
			{name: 'description', text: 'Data poslanců a jejich hlasování'},
			{name: 'lastUpdate', text: new Date().toISOString()},
			{name: 'updateInterval', text: 10080},
			{name: 'authors', children: [
				{name: 'author', attrs: {name: 'Jan Marek', city: 'Kladno'}},
				{name: 'author', attrs: {name: 'Jakub Dundálek', city: 'Praha'}},
				{name: 'author', attrs: {name: 'Jindřich Bašek', city: 'Praha'}}
			]}
		]);

		res.header('Content-Type', 'application/xml');
		res.end(doc.toString({ pretty: true }));
	}
};

module.exports = MetaController;