var request = require('request'),
  cheerio = require('cheerio'),
  P = require('bluebird'),
  Iconv = require('iconv-lite');

const FILM_URL = 'http://www.kinopoisk.ru/film/';
const SEARCH_URL = 'http://www.kinopoisk.ru/s/type/film/list/1/find/';
const LOGIN_URL = 'http://www.kinopoisk.ru/login/';
const DEFAULT_GET_OPTIONS = {
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
  limit: 5,
  parse: false,
  parsingOptions: DEFAULT_GET_OPTIONS
};

function getById(id, options, callback) {
  options = options || DEFAULT_GET_OPTIONS;
  doGetRequest(FILM_URL + id, options, function (err, body) {
    if (err) {
      callback(err);
    } else {
      var $ = cheerio.load(body);
      var title = '';
      var titleElement = $('#headerFilm .moviename-big');
      if (titleElement.length > 0 && titleElement[0].children.length > 0) {
        title = titleElement[0].children[0].data.trim();
      }
      if (!title) {
        callback(new Error('Film with id ' + id + ' not found'));
      } else {
        var result = {
          id: id + ''
        };
        if (options.title) result.title = title;
        if (options.rating) result.rating = parseFloat($('span.rating_ball').text());
        if (options.votes) result.votes = parseFloat($('span.ratingCount').text().replace(/\s/g, ''));
        if (options.alternativeTitle) result.alternativeTitle = $('#headerFilm span[itemprop="alternativeHeadline"]')
          .text();
        if (options.description) result.description = $('.brand_words[itemprop="description"]').text();
        if (options.actors) result.actors = _getActors($);
        if (options.year) result.year = parseInt(_getInfo($, 'год'));
        if (options.country) result.country = _getMultiInfo($, 'страна');
        if (options.director) result.director = _getMultiInfo($, 'режиссер');
        if (options.scenario) result.scenario = _getMultiInfo($, 'сценарий');
        if (options.producer) result.producer = _getMultiInfo($, 'продюсер');
        if (options.operator) result.operator = _getMultiInfo($, 'оператор');
        if (options.composer) result.composer = _getMultiInfo($, 'композитор');
        if (options.cutting) result.cutting = _getMultiInfo($, 'монтаж');
        if (options.genre) result.genre = _getMultiInfo($, 'жанр');
        if (options.budget) result.budget = _getInfo($, 'бюджет');
        if (options.boxoffice) result.boxoffice = _getInfo($, 'сборы в мире');
        if (options.time) result.time = $('.time').text();
        if (options.type) result.type = _getType($);

        callback(null, result);
      }
    }
  });
}

var getByIdPromisified = P.promisify(getById);

function search(query, options, callback) {
  options = options || DEFAULT_SEARCH_OPTIONS;
  doGetRequest(SEARCH_URL + encodeURIComponent(query), options, function (err, body) {
    if (err) {
      callback(err);
    } else {
      var $ = cheerio.load(body);
      var films = $('.search_results .info a[href^="/level/1/film"]')
        .toArray()
        .splice(0, options.limit)
        .map(function (item) {
          var href = item.attribs['href'];
          try {
            var id = /\/film\/(.+)\/sr\//.exec(href)[1];
            var title = item.children[0].data;
            return {
              id: id,
              title: title
            };
          } catch (err) {
            console.error("Parse href = " + href, err);
          }
          return null;
        }).filter(function (item) {
          return item !== null;
        });
      if (options.parse) {
        P.map(films, function (film) {
          return getByIdPromisified(film.id, options.parsingOptions);
        }).then(function (result) {
          callback(null, result);
        }).catch(function (err) {
          callback(new Error('Error while parsing. ' + err.message));
        });
      } else {
        callback(null, films);
      }
    }
  });
}

function login(user, password, callback) {
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
  request.post(requestOptions, function (err, response, _) {
    if (err) {
      callback(new Error('Error while "' + (LOGIN_URL) + '" processing. ' + err.message));
    } else {
      //strange but 302 it's means that login passed correctly
      if (response.statusCode == 302) {
        callback(null, {
          cookies: response.headers['set-cookie']
        });
      } else if (response.statusCode == 200) {
        callback(new Error('Bad credentials'));
      } else {
        callback(new Error('Unknown kinopoisk status code - ' + response.statusCode));
      }
    }
  })
}

function doGetRequest(url, options, callback) {
  var requestOptions = {
    url: url,
    headers: {
      'Accept-Language': 'ru-RU,ru;q=0.8,en-US;q=0.6,en;q=0.4',
      'User-Agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0.1916.114 Safari/537.36'
    },
    encoding: 'binary'
  };
  if (options.loginData && options.loginData.cookies && options.loginData.cookies.length > 0) {
    var jar = request.jar();
    options.loginData.cookies.forEach(function (cookie) {
      jar.setCookie(request.cookie(cookie), 'http://www.kinopoisk.ru/');
    });
    requestOptions['jar'] = jar;
  }
  request.get(requestOptions, function (err, response, body) {
    if (err) {
      callback(new Error('Error while "' + url + '" processing. ' + err.message));
    } else {
      body = Iconv.decode(new Buffer(body, 'binary'), 'win1251');
      callback(null, body);
    }
  });
}

function _getMultiInfo($, fieldName) {
  return $('#infoTable td:contains("' + fieldName + '") ~ td').text().split(', ').map(function (item) {
    return item.replace(/\r\n|\n|\r|слова$|сборы$/gm, "").trim();
  }).filter(function (item) {
    return item != '...' && item != '-';
  });
}

function _getInfo($, fieldName) {
  return $('#infoTable td:contains("' + fieldName + '") ~ td a').first().text();
}

function _getActors($) {
  return $('#actorList ul').first().find('li[itemprop="actors"] a').toArray().map(function (item) {
    if (item.children.length > 0) {
      return item.children[0].data;
    }
    return "";
  }).filter(function (item) {
    return item != '...';
  });
}

function _getType($) {
  return $('#headerFilm .moviename-big span').text().indexOf('сериал') > -1 ? 'series' : 'film';
}

module.exports.getById = getById;
module.exports.search = search;
module.exports.login = login;
