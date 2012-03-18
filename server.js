// import libs
var express = require('express');
var MemStore = require('connect/lib/middleware/session/memory');
var twig = require('twig');

//connects to the MongoDb
var DbAccess = require('./DbAccess');
var dbAccess = new DbAccess();

// import controllers
var MetaController = require('./controllers/MetaController');

var templateHelpers = require('./app/templateHelpers');
var NotFound = require('./app/NotFound');
var Unauthorized = require('./app/Unauthorized');
var Model = require('./models/model');
var DataHandler = require('./DataHandler');

var model = new Model(dbAccess);
var dataHandler = new DataHandler(dbAccess, model);

// Basic create server and configure
var app = express.createServer();
app.listen(8080);
app.configure(function() {
	app.use(express.logger());
	app.use('/public', express.static(__dirname + '/public'));
	app.use(express.bodyParser());
	app.use(express.cookieParser());
	app.use(express.session({
		store: MemStore({
			reapInterval: 60000*10
		}),
		secret: 'topsecrdsgsdfgdetadgfd'
	}));
	app.use(express.methodOverride());
    app.use(app.router);
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack: true
    }));
});

app.dynamicHelpers(templateHelpers);

app.register('twig', twig);
app.set('basepath','/');
app.set('views', __dirname + '/views');
app.set('view engine', 'twig');
app.set("view options", {layout: false});

var controllers = [
	new MetaController(model)
];

controllers.forEach(function (controller) {
	controller.registerRoutes(app);
});

// error handling
app.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404', {
			status: 404,
			locals : {err: err}
		});
	} else if (err instanceof Unauthorized) {
		res.render('403', {
			status: 403
		});
    } else {
        next(err);
    }
});

app.get('/', function(req, res) {
    res.render('root');
});

// first time ever start action
model.lastUpdate(function(data) {
	if (data == null) {
		dataHandler.createSnapshot();
	}
});

// periodic reading of new data
setInterval(function(){
	dbAccess.getDb().collection('appData', function(err, collection) {
        collection.update({name:'lastCheck'}, {$set:{value:(new Date()).getTime()}}, {safe:true}, function(err, result) {});
    });
	dataHandler.createSnapshot();
}, model.updateIntervalMs());
console.log("Reader initialized");