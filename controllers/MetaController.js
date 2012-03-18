// imports
var controllerHelpers = require('../app/controllerHelpers'),
	xmlFactory = require('../app/XmlBuilderFactory'),
	request = require('request')
	model = null;

// constructor
function MetaController(iModel) {
	model = iModel;
}

MetaController.prototype = {
	/**
	 * Route definitions
	 */
	registerRoutes: function(app)
	{
		app.get('/v1/metadata', controllerHelpers.action(this, 'default'));
		app.get('/v1/snapshots', controllerHelpers.action(this, 'snapshots'));
	},

	/**
	 * Metadata action
	 */
	defaultAction: function(req, res)
	{
		var doc = xmlFactory.create('metadata', [
			{name: 'name', text: 'Poslanecká sněmovna'},
			{name: 'description', text: 'Data poslanců a jejich hlasování'},
			{name: 'lastUpdate', text: model.lastUpdate().toISOString()},
			{name: 'updateInterval', text: model.updateInterval()},
			{name: 'authors', children: [
				{name: 'author', attrs: {name: 'Jan Marek', city: 'Kladno'}},
				{name: 'author', attrs: {name: 'Jakub Dundálek', city: 'Praha'}},
				{name: 'author', attrs: {name: 'Jindřich Bašek', city: 'Praha'}}
			]}
		]);

		res.header('Content-Type', 'application/xml');
		res.end(doc.toString({ pretty: true }));
	},

	snapshotsAction: function(req, res)
	{
		if (req.headers.accept && req.headers.accept.match(/image\/png/)) {
			// TODO: vygenerovat z dat
			var uri = 'http://chart.apis.google.com/chart?chxl=2:|2.2.2011|3.2.2011|4.2.2011|5.2.2011&chxp=2,10,20,30,40&chxr=1,5,1000|2,0,50&chxs=0,0000FF,11.5,0,lt,676767|1,FF0000,10.5,0,lt,676767|2,676767,11.5,0,lt,676767&chxt=y,y,x&chs=440x220&cht=lc&chco=3072F3,FF0000&chds=0,95,5,10000&chd=t:31.632,34.959,40.744,37.756,40.435,41.035,44.194,45.377,42.034,42.628,41.8,46.582,48.749,57.068,58.369,59.024,58.598,54.261,55.468,59.006,58.215,55.865,53.043,52.268,55.427,55.816,57.494,58.241,58.931,62.027,63.903,66.405,65.694,66.375,69.256,69.174,66.625,66.5,68.884,63.389,62.863,63.448|3192.86,3115.708,2636.745,2270.452,1441.495,1477.353,1219.15,1688.579,1481.213,1768.386,2191.412,2590.794,2898.1,2807.987,2809.466,3244.751,4034.291,4578.481,4601.033,4835.196,4639.297,4163.523,3865.194,4094.998,4241.581,4252.596,4590.532,5015.837,5193.319,5600.66,6059.783,6251.31,6539.539,6615.218,6305.324,6183.891,6016.528,5435.99,5365.103,5507.907&chdl=Nodes|Edges&chdlp=b&chls=1|1&chma=5,5,5,25|40'

			request({ uri: uri, encoding: 'binary' }, function (error, response, body) {
				res.header('Content-Type', 'image/png');
				res.end(new Buffer(body, 'binary'));
			});
		} else {
			var doc = xmlFactory.create('snapshots', model.snapshots().map(function(item) {
				return {name: 'snapshot', attrs: {
					created: item.created.toISOString(),
					node: item.node,
					edge: item.edge,
				}};
			}));

			res.header('Content-Type', 'application/xml');
			res.end(doc.toString({ pretty: true }));
		}
	}
};

module.exports = MetaController;