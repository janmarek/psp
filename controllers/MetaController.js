// imports
var controllerHelpers = require('../app/controllerHelpers'),
	xmlFactory = require('../app/XmlBuilderFactory'),
	request = require('request'),
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
		model.lastUpdate(function(data) {
			var doc = xmlFactory.create('metadata', [
     			{name: 'name', text: 'Poslanecká sněmovna'},
     			{name: 'description', text: 'Data poslanců a jejich hlasování'},
     			{name: 'lastUpdate', text: (new Date(data)).toISOString()},
     			{name: 'updateInterval', text: model.updateInterval()},
     			{name: 'authors', children: [
     				{name: 'author', attrs: {name: 'Jan Marek', city: 'Kladno'}},
     				{name: 'author', attrs: {name: 'Jakub Dundálek', city: 'Praha'}},
     				{name: 'author', attrs: {name: 'Jindřich Bašek', city: 'Praha'}}
     			]}
     		]);

     		res.header('Content-Type', 'application/xml');
     		res.end(doc.toString({ pretty: true }));
        });
		
	},

	snapshotsAction: function(req, res)
	{
		if (req.headers.accept && req.headers.accept.match(/image\/png/)) {
			model.snapshots(function(s) {
				var nlabels = Math.floor(s.length / 5),
					offset = Math.floor(nlabels/2);
					labels = s.filter(function(item, i) { return (i+offset)%(nlabels) === 0; });
				
			var uri = ['http://chart.apis.google.com/chart',
				'?chxs=0,3072F3,11.5,0,lt,676767|1,FF0000,10.5,0,lt,676767|2,676767,11.5,0,lt,676767',
				'&chxt=y,y,x',
				'&chs=440x220',
				'&cht=lc',
				'&chco=3072F3,FF0000',
				'&chds=a',
				'&chdl=Nodes|Edges',
				'&chdlp=b',
				'&chls=1|1',
				'&chma=5,5,5,25|40',
				'&chxr=2,0,',
				s.length,
				'|0,0,',
				s.reduce(function(a,b) {return Math.max(a, b.node);}, 0),
				'|1,0,',
				s.reduce(function(a,b) {return Math.max(a, b.edge);}, 0),
				'&chd=t:',
				s.map(function(item) { return item.node; }).join(','),
				'|',
				s.map(function(item) { return item.edge; }).join(','),
				'&chxl=2:|',
				labels.map(function(item) { var d = item.created; return d.getDate()+'.'+(d.getMonth()+1)+'.'+d.getFullYear(); }).join('|'),
				'&chxp=2,',
				labels.map(function(item, i) { return i*nlabels+offset; }).join(',')
				];

				uri = uri.join('');
				
				request({ uri: uri, encoding: 'binary' }, function (error, response, body) {
					res.header('Content-Type', 'image/png');
					res.end(new Buffer(body, 'binary'));
				});
			});
		} else {
			model.snapshots(function(data) {
				var doc = xmlFactory.create('snapshots', data.map(function(item) {
					return {name: 'snapshot', attrs: {
						created: item.created.toISOString(),
						node: item.node,
						edge: item.edge,
					}};
				}));

				res.header('Content-Type', 'application/xml');
				res.end(doc.toString({ pretty: true }));
            });
		}
	}
};

module.exports = MetaController;