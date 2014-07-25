var request = require('request'),
    cheerio = require('cheerio'),
    async = require('async'),
    Iconv = require('iconv').Iconv('windows-1251', 'utf8');

const FILM_URL = 'http://www.kinopoisk.ru/film/';
const SEARCH_URL = 'http://www.kinopoisk.ru/s/type/film/list/1/find/';
const LOGIN_URL = 'http://www.kinopoisk.ru/login/';
const DEFAULT_GET_OPTIONS = {
    loginData: [],
    title: true,
    rating: true,
    votes: true,
    alternativeTitle: true,
    description: true,
    type: true,
    actors: true,
    year: true,
    country: true,
    director: true,
    scenario: true,
    producer: true,
    operator: true,
    composer: true,
    cutting: true,
    genre: true,
    budget: true,
    boxoffice: true,
    time: true
};

const DEFAULT_SEARCH_OPTIONS = {
    loginData: [],
    limit: 5,
    parse: false,
    parsingOptions: DEFAULT_GET_OPTIONS
};

var getById = function (id, options, callback) {
    var options = options || DEFAULT_GET_OPTIONS;
    var requestOptions = {
        url: FILM_URL + id,
        headers: {
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36'
        },
        encoding: 'binary'
    };
    if (options.loginData && options.loginData.length > 0) {
        var jar = request.jar();
        for (var i = 0; i < options.loginData.length; i++) {
            jar.setCookie(request.cookie(options.loginData[i]), 'http://www.kinopoisk.ru/');
        }
        requestOptions['jar'] = jar;
    }

    request.get(requestOptions, function (err, response, body) {
        if (err) {
            callback(new Error('Error while "' + FILM_URL + id + '" processing. ' + err.message));
        } else {
            body = Iconv.convert(new Buffer(body, 'binary')).toString();
            var $ = cheerio.load(body);
            var title = '';
            var titleElement = $('#headerFilm .moviename-big');
            if (titleElement.length > 0 && titleElement[0].children.length > 0) {
                title = titleElement[0].children[0].data.trim();
            }
            if (!title) {
                callback(new Error('Film with id ' + id + ' not found'));
            }else{
                var result = {
                    id: id
                };
                if (options.title) result.title =                           title;
                if (options.rating) result.rating =                         parseFloat($('span.rating_ball').text());
                if (options.votes) result.votes =                           parseFloat($('span.ratingCount').text().replace(/\s/g, ''));
                if (options.alternativeTitle) result.alternativeTitle =     $('#headerFilm span[itemprop="alternativeHeadline"]').text();
                if (options.description) result.description =               $('.brand_words[itemprop="description"]').text();
                if (options.actors) result.actors =                         getActors($);
                if (options.year) result.year =                             parseInt(getInfo($, 'год'));
                if (options.country) result.country =                       getMultiInfo($, 'страна');
                if (options.director) result.director =                     getMultiInfo($, 'режиссер');
                if (options.scenario) result.scenario =                     getMultiInfo($, 'сценарий');
                if (options.producer) result.producer =                     getMultiInfo($, 'продюсер');
                if (options.operator) result.operator =                     getMultiInfo($, 'оператор');
                if (options.composer) result.composer =                     getMultiInfo($, 'композитор');
                if (options.cutting) result.cutting =                       getMultiInfo($, 'монтаж');
                if (options.genre) result.genre =                           getMultiInfo($, 'жанр');
                if (options.budget) result.budget =                         getInfo($, 'бюджет');
                if (options.boxoffice) result.boxoffice =                   getInfo($, 'сборы в мире');
                if (options.time) result.time =                             $('.time').text();
                if (options.type) result.type =                             getType($);

                callback(null, result);
            }
        }
    });
}

var search = function (query, options, callback) {
    var options = options || DEFAULT_SEARCH_OPTIONS;
    var requestOptions = {
        url: SEARCH_URL + encodeURIComponent(query),
        headers: {
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36'
        },
        encoding: 'binary'
    };

    if (options.loginData && options.loginData.length > 0) {
        var jar = request.jar();
        for (var i = 0; i < options.loginData.length; i++) {
            jar.setCookie(request.cookie(options.loginData[i]), 'http://www.kinopoisk.ru/');
        }
        requestOptions['jar'] = jar;
    }

    request.get(requestOptions, function (err, response, body) {
        if (err) {
            callback(new Error('Error while "' + (SEARCH_URL + encodeURIComponent(query)) + '" processing. ' + err.message));
        } else {
            body = Iconv.convert(new Buffer(body, 'binary')).toString();
            var $ = cheerio.load(body);
            var films = $('.search_results .info a[href^="/level"]')
                .toArray().splice(0, options.limit)
                .map(function (item) {
                    var href = item.attribs['href'];
                    var id = /\/film\/(.+)\/sr\//.exec(href)[1];
                    var title = item.children[0].data;
                    return {
                        id: id,
                        title: title
                    };
                });
            if (options.parse) {
                async.map(films, function (film, mapCallback) {
                    getById(film.id, options.parsingOptions, function (err, result) {
                        mapCallback(err, result);
                    })
                }, function (err, result) {
                    if (err) {
                        callback(new Error('Error while parsing. ' + err.message));
                    } else {
                        callback(null, result);
                    }
                });
            } else {
                callback(null, films);
            }
        }
    });
}

var login = function (user, password, callback) {
    var requestOptions = {
        url: LOGIN_URL,
        headers: {
            'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
            'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36'
        },
        encoding: 'binary',
        form: {
            'shop_user[login]': user,
            'shop_user[pass]': password,
            'shop_user[mem]': 'on',
            'auth': '%E2%EE%E9%F2%E8+%ED%E0+%F1%E0%E9%F2'
        }
    };
    request.post(requestOptions, function (err, response, body) {
        if (err) {
            callback(new Error('Error while "' + (LOGIN_URL) + '" processing. ' + err.message));
        } else {
            //strange but 302 it's means that login passed correctly
            if(response.statusCode == 302){
                callback(null, response.headers['set-cookie']);
            }else if(response.statusCode == 200){
                callback(new Error('Bad credentials'));
            }else{
                callback(new Error('Unknown kinopoisk status code - ' + response.statusCode));
            }
        }
    })
}

function getMultiInfo($, fieldName) {
    return $('#infoTable td:contains("' + fieldName + '") ~ td').text().split(', ')
        .map(function (item) {
            return item.replace(/\r\n|\n|\r|слова$|сборы$/gm, "").trim();
        }).filter(function (item) {
            return item != '...' && item != '-';
        });
}

function getInfo($, fieldName) {
    return $('#infoTable td:contains("' + fieldName + '") ~ td a').first().text();
}

function getActors($) {
    return  $('#actorList ul').first().find('li[itemprop="actors"] a').toArray()
        .map(function (item) {
            if (item.children.length > 0) {
                return item.children[0].data;
            }
            return "";
        }).filter(function (item) {
            return item != '...';
        });
}

function getType($) {
    return $('#headerFilm .moviename-big span').text().indexOf('сериал') > -1 ? 'series' : 'film';
}

module.exports.getById = getById;
module.exports.search = search;
module.exports.login = login;