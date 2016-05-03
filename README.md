[![Build Status](https://travis-ci.org/nawa/node-kinopoisk-ru.svg?branch=master)](https://travis-ci.org/nawa/node-kinopoisk-ru)

Node.js module for getting film info from [kinopoisk.ru], searhing films by query. Operations support login to avoid a ban when you do many requests

##Usage
```javascript
var kinopoisk = require('kinopoisk-ru');

kinopoisk.search('The Shawshank Redemption', null, function(err, films){
	if(err){
		console.error(err.message);
	}else{
		console.dir(films);
	}
});


kinopoisk.getById('326', null, function(err, film){
	if(err){
		console.error(err.message);
	}else{
		console.dir(film);
	}
});
```

##Methods
That is simple, available only three functions
###getById(id, options, callback)
* `id` - kinopoisk film id
* `options` - if null the default options will be passed. Options contains next values

```javascript
{ loginData: [], //login data from login(user, password, callback) function. Can be null or empty
  title: true, //include attribute to result or not
  rating: true, //...
  votes: true, //...
  alternativeTitle: true, //...
  type: true, //...
  description: true, //...
  actors: true, //...
  year: true, //...
  country: true, //...
  director: true, //...
  scenario: true, //...
  producer: true, //...
  operator: true, //...
  composer: true, //...
  cutting: true, //...
  genre: true, //...
  budget: true, //...
  boxoffice: true, //...
  time: true //...
}
```
* `callback(err, film)` - `film` is requested film info with attributes passed into `options`. Attributes like *actors*, *director*, *scenario* are arrays. *Type* is 'series' or 'film'. *Year*, *rating* etc are numbers

###search(query, options, callback)
* `query` - film name
* `options` - if null the default options will be passed. Options contains next values

```javascript
{ loginData: [], //login data from login(user, password, callback) function. Can be null or empty
  limit: 5, //result limit
  parse: true, 	//parse or not resulting films. If true then results will be parsed like in getById(). 
  		//If false then only films id and title will be returned
  parsingOptions: DEFAULT_GET_OPTIONS //Used only if parse is true. Similar to options in getById()
}
```
* `callback(err, films)` - `films` is array of requested films, parsed or not dependent from *option.parse*

###login(user, password, callback)
To avoid a ban when you do many requests use login with your kinopoisk credentials
* `user` - kinopoisk user name
* `password` - kinopoisk user password
* `callback(err, loginData)` - `loginData` must be passed to *getById()* or *search()*  options

**Example**
```javascript
kinopoisk.login('username', 'userpassword', function(err, loginData){
	var options = {
		loginData: loginData,
		title: true
	};
	kinopoisk.getById('326', options, function(err, film){
		if(err){
			console.error(err.message);
		}else{
			console.dir(film);
		}
	});
})
```

[kinopoisk.ru]:http://www.kinopoisk.ru
