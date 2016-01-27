var assert = require('assert')

var shell = require('shelljs')
var request = require('request')
var urljoin = require('url-join')

var settings = require('../lib/settings.js')
var registry = require('../index.js')
var BinderRegistry = registry.server

var sampleTemplate = {
  'name': 'binder-example-requirements',
  'image-name': 'binder-project/example-requirements',
  'image-source': 'gcr.io/generic-notebooks/binder-project-example-requirements',
  'limits': {
    'memory': '512MB',
    'cpu': '10'
  },
  'services': [
    {
      'name': 'spark',
      'version': '1.4.1',
      'params': {
        'heap_mem': '4g',
        'stack_mem': '512m'
      }
    }
  ]
}

describe('binder-registry', function () {
  var registryServer, baseUrl, apiKey

  before(function (done) {
    registryServer = new BinderRegistry(settings)
    registryServer.start()
    registryServer.on('start', function () {
      apiKey = registryServer.apiKey
      baseUrl = 'http://localhost:' + settings.port
      done()
    })
  })

  after(function () {
    if (registryServer) {
      registryServer.stop()
    }
  })

  describe('BinderRegistry', function () {
    it('should register new templates', function (done) {
      var opts = {
        url: urljoin(baseUrl, 'templates'),
        method: 'POST',
        headers: {
          'Authorization': apiKey
        },
        json: true,
        body: sampleTemplate
      }
      request(opts, function (err, rsp, body) {
        if (err) throw err
        console.log('rsp: ' + JSON.stringify(rsp))
        assert(body['time-created'])
        assert(body['time-modified'])
        assert(body['name'])
        done()
      })
    })
    it('should return a registered template', function (done) {
      var opts = {
        url: urljoin(baseUrl, 'templates', 'binder-example-requirements'),
        method: 'GET',
        headers: {
          'Authorization': apiKey
        },
        json: true
      }
      request(opts, function (err, rsp, body) {
        if (err) throw err
        assert.equal(body['name'], 'binder-example-requirements')
        done()
      })
    })
    it('should return an empty object when asked for a nonexistent template', function (done) {
      var opts = {
        url: urljoin(baseUrl, 'templates', 'binder-example-requirements-blahblah'),
        method: 'GET',
        headers: {
          'Authorization': apiKey
        },
        json: true
      }
      request(opts, function (err, rsp, body) {
        if (err) throw err
        assert.notEqual(body['name'], 'binder-example-requirements')
        assert.equal(body, {})
        done()
      })
    })
  })

  describe('CLI', function () {
    it('should properly start the registry server')
    it('should properly stop the registry server')
  })
})
