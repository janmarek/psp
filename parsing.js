var http = require('http'),
    request = require('request'),
    jsdom = require('jsdom'),
    iconv = require('iconv'),
    win; // window instance - workaround for memory leaks

//constructor
function Parsing() {
	console.log("Parser initialized");
}

Parsing.prototype = {
	/*
	 * primitivni fce pro zakodovani parametru do url (bez escapovani)
	 * priklad: {a:'b', c:'d'}  => 'a=b&c=d'
	 */
	encodeParams: function(params) {
	    var queryString, arr = [];
	    for (p in params) {
	        arr.push(p + '=' + params[p]);
	    }
	    queryString = arr.join('&');
	    if (queryString) {
	        queryString = '?' + queryString;
	    }
	    return queryString;
	},

	/*
	 * fce co udela request na stranky snemovny
	 * argumenty:
	 *     string url .. napr. 'hlasovani.sqw'
	 *     object params .. napr {o:6} pro seste volebni obdobi
	 *     function callback - po nacteni bude zavolana s jednim parametrem jQuery objektem v kontextu dane stranky
	 */
	pspRequest: function(url, params, callback) {
	    var uri = 'http://www.psp.cz/sqw/' + url + this.encodeParams(params);
	    console.log('pspRequest: ' + uri);
	    request({ uri: uri, encoding: 'binary' }, function (error, response, body) {
	        if (error || response.statusCode !== 200) {
	            console.log('Error when contacting server');
	        }

	        // vraceji to v cp1250, prevedeme do utf8
	        body = new Buffer(body, 'binary');
	        var conv = new iconv.Iconv('windows-1250', 'utf8');
	        body = conv.convert(body).toString();

	        // if there is no window instance we create new one,
	        // otherwise we reuse the old one and set innerHTML (to prevent memory leaks)
	        // probably breaks paralelism and introduces race condition, but it won't matter in final application
	        // see http://stackoverflow.com/a/7252892
	        if (!win) {
	            jsdom.env({
	                html: body,
	                scripts: [
	                'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js'
	                ],
	            }, function (err, window) {
	                win = window;
	                callback(window.jQuery);
	            });
	        } else {
	            win.document.innerHTML = body;
	            callback(win.jQuery);
	        };
	    });
	},

	/*
	 * nacte seznam schuzi pro dane volebni obdobi
	 *      pokud je obdobi null tak nacte aktualni obdobi
	 */
	getSeznamSchuzi: function(obdobi, callback) {
	    this.pspRequest('hlasovani.sqw', (obdobi ? {o:obdobi} : {}), function($) {
	        var cisloObdobi = $('h4>a').attr('href').match(/[&?]o=(\d)/)[1],
	            schuze = $('#text-related-secmenu>.text>b>a').map(function() {
	            	return {title: $(this).text().substring(0, $(this).text().indexOf('.')),
	            		url: $(this).attr('href')};
	            }).get();
	        callback({obdobi: cisloObdobi, schuze: schuze});
	    });
	},

	/*
	 * pomocna funkce - vyparsuje seznam hlasovani
	 */
	parseSeznamHlasovani: function($) {
	    var hlasovani = $('#text-related-secmenu table tr').slice(1).map(function () {
	        var cols = $(this).find('td');
	        return {
	            title: cols.eq(3).text(),
	            number: cols.eq(1).find('a').text(),
	            url: cols.eq(1).find('a').attr('href'),
	        };
	    }).get();
	    return hlasovani;
	},

	/*
	 * nacte seznam hlasovani se schuze v danem obdobi
	 */
	getSeznamHlasovani: function(obdobi, schuze, callback) {
	    var params = {o: obdobi, s: schuze};
	    this.pspRequest('phlasa.sqw', params, function($) {
	        var ret = Parsing.prototype.parseSeznamHlasovani($);
	        // zjistime pocet stranek
	        var page = 0, paginator = $('#text-related-secmenu center:eq(1)');
	        if (paginator.length > 0) {
	            page = parseInt(paginator.find('a').last().text(), 10);
	        }

	        // nacteme zbyvajici stranky (rekurzivni fci.. tim zajistime ze to bude v poradi za sebou)
	        function loadPages(i) {
	            if (i <= page) {
	                params.pg = i;
	                Parsing.prototype.pspRequest('phlasa.sqw', params, function($) {
	                    ret = ret.concat(Parsing.prototype.parseSeznamHlasovani($));
	                    loadPages(i+1);
	                });
	            } else {
	                callback(ret);
	            };
	        }

	        // prvni stranku uz mame, nacitame od druhe (cislovani od 1)
	        loadPages(2);

	    });
	},

	/*
	 * nacte vysledek z hlasovani a jednotlive akce poslancu
	 * akce jsou [A] ANO, [N] NE, [0] NEPŘIHLÁŠEN, [M] OMLUVEN, [Z] ZDRŽEL SE
	 */
	getHlasovani: function(url, seznamHlasovaniObj, callback) {
	    this.pspRequest(url, {}, function($) {
	        var content = $('#text-related-secmenu');
	        console.log(url);
	        var strana = '', hlasy = [];
	        content.find('center:eq(1) tr').each(function(i, item) {
	            if ($(item).find('h3').length > 0) {
	                strana = $(item).find('h3').text();
	            } else {
	                poslanci = $(item).find('td');
	                for (var i = 0, len = poslanci.length; i < len; i += 2) {
	                    hlasy.push({
	                        akce: poslanci.eq(i).text(),
	                        poslanec: {
	                            jmeno: poslanci.eq(i+1).text().replace(/^\s+|\s+$/g, ''),
	                            id: poslanci.eq(i+1).find('a').attr('href').match(/[&?]id=(\d+)/)[1],
	                            strana: strana
	                        }
	                    });
	                }
	            }

	        });

	        var info = content.find('center:eq(0)').text();

	        var ret = null;
	        try {
	        	ret = {
		            prijato: !!info.match('PŘIJAT'),
		            pritomno: parseInt(info.match(/PŘÍTOMNO=(\d+)/)[1], 10),
		            jetreba: parseInt(info.match(/JE TŘEBA=(\d+)/)[1], 10),
		            ano: parseInt(info.match(/ANO=(\d+)/)[1], 10),
		            ne: parseInt(info.match(/NE=(\d+)/)[1], 10),
		            hlasy: hlasy,
		            error: false,
		            url: url
		        };
			} catch (e) {
				ret = {
		            error: true,
		            url: url
		        };
			}
	        
	        callback(ret, seznamHlasovaniObj);
	    });
	}
};


module.exports = Parsing;

// demo parsovacich funkci
http.createServer(function (request, response) {
	var parsing = new Parsing();
    switch (request.url) {
        case '/':
            response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            response.end('<h1>parsing demo</h1><ul><li><a href="seznam-schuzi">seznam-schuzi</a></li><li><a href="seznam-hlasovani">seznam-hlasovani</a> chvili trva, musi nacist 12 stranek ze vzdaleneho serveru</li><li><a href="hlasovani">hlasovani</a></li></ul>');
            break;
        case '/seznam-schuzi':
            response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
            parsing.getSeznamSchuzi(null, function(data) {
                response.end(JSON.stringify(data));
            });
            break;
        case '/seznam-hlasovani':
            response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
            parsing.getSeznamHlasovani(6, 36, function(data) {
                response.end(JSON.stringify(data));
            });
            break;
        case '/hlasovani':
            response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
            parsing.getHlasovani('hlasy.sqw?G=55588&o=6', function(data) {
                response.end(JSON.stringify(data));
            });
            break;
        default:
            response.writeHead(404, {'Content-Type': 'text/html; charset=utf-8'});
            response.end('<h1>not found</h1>');
  }
}).listen(1337); // vytvořený server odteď poslouchá na portu 1337

console.log('Server running at http://127.0.0.1:1337/');


// dodatečné poznámky:

//poslanec má id
//např. http://www.psp.cz/sqw/detail.sqw?id=111&o=6

//seznam volebních období
//hlasovani.sqw?zvo=1