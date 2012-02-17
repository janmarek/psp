var http = require('http'),
    request = require('request'),
    jsdom = require('jsdom'),
    iconv = require('iconv');

/*
 * primitivni fce pro zakodovani parametru do url (bez escapovani)
 * priklad: {a:'b', c:'d'}  => 'a=b&c=d'
 */
function encodeParams(params) {
    var queryString, arr = [];
    for (p in params) {
        arr.push(p + '=' + params[p]);
    }
    queryString = arr.join('&');
    if (queryString) {
        queryString = '?' + queryString;
    }
    return queryString;
}

/*
 * fce co udela request na stranky snemovny
 * argumenty:
 *     string url .. napr. 'hlasovani.sqw'
 *     object params .. napr {o:6} pro seste volebni obdobi
 *     function callback - po nacteni bude zavolana s jednim parametrem jQuery objektem v kontextu dane stranky
 */
function pspRequest(url, params, callback) {
    var uri = 'http://www.psp.cz/sqw/' + url + encodeParams(params);
    console.log('pspRequest: ' + uri);
    request({ uri: uri, encoding: 'binary' }, function (error, response, body) {
        if (error && response.statusCode !== 200) {
            console.log('Error when contacting server')
        }

        // vraceji to v cp1250, prevedeme do utf8
        body = new Buffer(body, 'binary');
        var conv = new iconv.Iconv('windows-1250', 'utf8');
        body = conv.convert(body).toString();

        jsdom.env({
            html: body,
            scripts: [
            'https://ajax.googleapis.com/ajax/libs/jquery/1.7.1/jquery.min.js'
            ],
        }, function (err, window) {
            callback(window.jQuery);
        });
    });
}

/*
 * nacte seznam schuzi pro dane volebni obdobi
 *      pokud je obdobi null tak nacte aktualni obdobi
 */
function getSeznamSchuzi(obdobi, callback) {
    pspRequest('hlasovani.sqw', (obdobi ? {o:obdobi} : {}), function($) {
        var cisloObdobi = $('h4>a').attr('href').match(/[&?]o=(\d)/)[1],
            schuze = $('#text-related-secmenu>.text>b>a').map(function() { return {title: $(this).text(), url: $(this).attr('href')} }).get();
        callback({obdobi: cisloObdobi, schuze: schuze});
    });
}

/*
 * pomocna funkce - vyparsuje seznam hlasovani
 */
function parseSeznamHlasovani($) {
    var hlasovani = $('#text-related-secmenu table tr').slice(1).map(function () {
        var cols = $(this).find('td');
        return {
            title: cols.eq(3).text(),
            number: cols.eq(1).find('a').text(),
            url: cols.eq(1).find('a').attr('href'),
        };
    }).get();
    return hlasovani;
}

/*
 * nacte seznam hlasovani se schuze v danem obdobi
 */
function getSeznamHlasovani(obdobi, schuze, callback) {
    var params = {o: obdobi, s: schuze};
    pspRequest('phlasa.sqw', params, function($) {
        var ret = parseSeznamHlasovani($);

        // zjistime pocet stranek
        var page = 0, paginator = $('#text-related-secmenu center:eq(1)');
        if (paginator.length > 0) {
            page = parseInt(paginator.find('a').last().text(), 10);
        }

        // nacteme zbyvajici stranky (rekurzivni fci.. tim zajistime ze to bude v poradi za sebou)
        function loadPages(i) {
            if (i <= page) {
                params.pg = i;
                pspRequest('phlasa.sqw', params, function($) {
                    ret = ret.concat(parseSeznamHlasovani($));
                    loadPages(i+1);
                });
            } else {
                callback(ret);
            }
        }

        // prvni stranku uz mame, nacitame od druhe (cislovani od 1)
        loadPages(2);

    });
}

/*
 * nacte vysledek z hlasovani a jednotlive akce poslancu
 * akce jsou [A] ANO, [N] NE, [0] NEPŘIHLÁŠEN, [M] OMLUVEN, [Z] ZDRŽEL SE
 */
function getHlasovani(url, callback) {
    pspRequest(url, {}, function($) {
        var content = $('#text-related-secmenu');

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
                            jmeno: poslanci.eq(i+1).text(),
                            id: poslanci.eq(i+1).find('a').attr('href').match(/[&?]id=(\d+)/)[1],
                            strana: strana
                        }
                    });
                }
            }

        });

        var info = content.find('center:eq(0)').text();

        callback({
            prijato: !!info.match('PŘIJAT'),
            pritomno: parseInt(info.match(/PŘÍTOMNO=(\d+)/)[1], 10),
            jetreba: parseInt(info.match(/JE TŘEBA=(\d+)/)[1], 10),
            ano: parseInt(info.match(/ANO=(\d+)/)[1], 10),
            ne: parseInt(info.match(/NE=(\d+)/)[1], 10),
            hlasy: hlasy
        })
    });
}

// demo parsovacich funkci
http.createServer(function (request, response) {
    switch (request.url) {
        case '/':
            response.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
            response.end('<h1>parsing demo</h1><ul><li><a href="seznam-schuzi">seznam-schuzi</a></li><li><a href="seznam-hlasovani">seznam-hlasovani</a> chvili trva, musi nacist 12 stranek ze vzdaleneho serveru</li><li><a href="hlasovani">hlasovani</a></li></ul>');
            break;
        case '/seznam-schuzi':
            response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
            getSeznamSchuzi(null, function(data) {
                response.end(JSON.stringify(data));
            });
            break;
        case '/seznam-hlasovani':
            response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
            getSeznamHlasovani(6, 33, function(data) {
                response.end(JSON.stringify(data));
            });
            break;
        case '/hlasovani':
            response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
            getHlasovani('hlasy.sqw?G=55588&o=6', function(data) {
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