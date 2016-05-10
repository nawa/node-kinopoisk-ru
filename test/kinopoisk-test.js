'use strict';

var expect = require('chai').expect;
var P = require('bluebird');
var kinopoisk = P.promisifyAll(require('../lib/kinopoisk'));
var KINOPOISK_USERNAME = process.env.KINOPOISK_USERNAME;
var KINOPOISK_USERPASSWORD = process.env.KINOPOISK_USERPASSWORD;
var options = {
  limit: 5,
  parse: true,
  parsingOptions: {
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
  }
};

describe('Kinopoisk module', function () {

  describe('login', function () {
    it('should successfully logged in to kinopoisk with correct credentials', function () {
      return kinopoisk.loginAsync(KINOPOISK_USERNAME, KINOPOISK_USERPASSWORD).then(function (result) {
        expect(result).to.be.not.empty;
      });
    });

    it('should return error with incorrect credentials', function () {
      return kinopoisk.loginAsync('incorrect', 'incorrect').then(function (_) {
        throw new Error('some login credentials returned and not error');
      }).catch(function (err) {
        expect(err).is.not.null;
        expect(err.message).is.eql('Bad credentials');
      });
    });
  });

  describe('get by id', function () {
    context('not logged in', function () {
      it('should successfully get movie', function () {
        return kinopoisk.getByIdAsync(326, options.parsingOptions).then(function (result) {
          expect(result).is.not.null;
          assertShawshankMovie(result);
        });
      });
    });

    context('logged in', function () {
      var optionsWithLogin;

      before(function () {
        optionsWithLogin = JSON.parse(JSON.stringify(options));
        return kinopoisk.loginAsync(KINOPOISK_USERNAME, KINOPOISK_USERPASSWORD).then(function (result) {
          optionsWithLogin.loginData = result;
        });
      });

      it('should successfully get movie', function () {
        return kinopoisk.getByIdAsync('326', options.parsingOptions).then(function (result) {
          expect(result).is.not.null;
          assertShawshankMovie(result);
        });
      });
    });
  });

  describe('search', function () {
    context('not logged in', function () {
      it('should successfully search movie with EN search phrase', function () {
        return kinopoisk.searchAsync('The Shawshank Redemption', options).then(function (result) {
          expect(result).to.have.length(options.limit);
          assertShawshankMovie(result[0]);
        });
      });

      it('should successfully search movie with RU search phrase', function () {
        return kinopoisk.searchAsync('Побег из Шоушенка', options).then(function (result) {
          expect(result).to.have.length(options.limit);
          assertShawshankMovie(result[0]);
        });
      });
    });

    context('logged in', function () {
      var optionsWithLogin;

      before(function () {
        optionsWithLogin = JSON.parse(JSON.stringify(options));
        return kinopoisk.loginAsync(KINOPOISK_USERNAME, KINOPOISK_USERPASSWORD).then(function (result) {
          optionsWithLogin.loginData = result;
        });
      });

      it('should successfully search movie with EN search phrase', function () {
        return kinopoisk.searchAsync('The Shawshank Redemption', optionsWithLogin).then(function (result) {
          expect(result).to.have.length(options.limit);
          assertShawshankMovie(result[0]);
        });
      });

      it('should successfully search movie with RU search phrase', function () {
        return kinopoisk.searchAsync('Побег из Шоушенка', optionsWithLogin).then(function (result) {
          expect(result).to.have.length(options.limit);
          assertShawshankMovie(result[0]);
        });
      });

    });
  });

  describe('bug from https://github.com/nawa/node-kinopoisk-ru/issues/1', function () {
    it('should successfully search movie "Волки и овцы: бе-е-е-зумное превращение"', function () {
      return kinopoisk.searchAsync('Волки и овцы: бе-е-е-зумное превращение', options).then(function (result) {
        expect(result).to.have.length(options.limit);
        expect(result[0]).to.have.property('title').that.eql('Волки и овцы: бе-е-е-зумное превращение');
        expect(result[0]).to.have.property('id').that.eql('738950');
      });
    });

    it('should successfully search movie "Белоснежка и охотник 2"', function () {
      return kinopoisk.searchAsync('Белоснежка и охотник 2', options).then(function (result) {
        expect(result).to.have.length(options.limit);
        expect(result[0]).to.have.property('title').that.eql('Белоснежка и Охотник 2');
        expect(result[0]).to.have.property('id').that.eql('680394');
      });
    });


  });
});

function assertShawshankMovie(movie) {
  expect(movie).to.have.property('title').that.eql('Побег из Шоушенка');
  expect(movie).to.have.property('id').that.eql('326');
  expect(movie).to.have.property('rating').that.a('number');
  expect(movie).to.have.property('votes').that.a('number');
  expect(movie).to.have.property('alternativeTitle').that.eql('The Shawshank Redemption');
  expect(movie).to.have.property('description').that.a('string');
  expect(movie).to.have.property('actors').that.a('array').that.is.not.empty;
  expect(movie).to.have.property('year').that.eql(1994);
  expect(movie).to.have.property('country').that.a('array').that.is.not.empty;
  expect(movie).to.have.property('director').that.a('array').that.is.not.empty;
  expect(movie).to.have.property('scenario').that.a('array').that.is.not.empty;
  expect(movie).to.have.property('producer').that.a('array').that.is.not.empty;
  expect(movie).to.have.property('operator').that.a('array').that.is.not.empty;
  expect(movie).to.have.property('composer').that.a('array').that.is.not.empty;
  expect(movie).to.have.property('cutting').that.a('array').that.is.not.empty;
  expect(movie).to.have.property('genre').that.a('array').that.is.not.empty;
  expect(movie).to.have.property('budget').that.a('string');
  expect(movie).to.have.property('boxoffice').that.a('string');
  expect(movie).to.have.property('time').that.a('string');
  expect(movie).to.have.property('type').that.a('string');
}
