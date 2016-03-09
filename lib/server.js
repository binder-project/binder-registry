var mongoose = require('mongoose')

var _ = require('lodash')
var inherits = require('inherits')
var format = require('string-format')
format.extend(String.prototype)

var BinderModule = require('binder-module')
var getLogger = require('binder-logging').getLogger
var getDatabase = require('binder-db').getDatabase
var settings = require('./settings.js')

/*
 * An HTTP server that implements the API of a Binder component
 * @constructor
 */
function BinderRegistry (opts) {
  if (!(this instanceof BinderRegistry)) {
    return new BinderRegistry(opts)
  }
  BinderRegistry.super_.call(this, 'binder-registry', 'registry', settings, opts)
  this.logger = getLogger(settings.name, this.opts.logging)
  // the database connection is opened in _start
  this.db = null
  this.templateModel = null
}
inherits(BinderRegistry, BinderModule)

var Template = {
  'name': { type: String, index: { unique: true } },
  'image-name': String,
  'image-source': String,
  'limits': {
    'memory': String,
    'cpu': String
  },
  'services': [{
    'name': String,
    'version': String,
    'params': mongoose.Schema.Types.Mixed
  }],
  'time-created': { type: Date, default: Date.now },
  'time-modified': { type: Date, default: Date.now },
  'command': [String],
  'port': Number
}

// Start of the BinderModule interface

/**
 * Declare which methods implement the binder-registry API
 */
BinderRegistry.prototype._makeBinderAPI = function () {
  return {
    register: this.storeTemplate.bind(this),
    fetch: this.getTemplate.bind(this),
    fetchAll: this.getAllTemplates.bind(this)
  }
}

BinderRegistry.prototype.storeTemplate = function (api) {
  var self = this
  var templateJson = api.params.template
  var conditions = { name: templateJson.name }
  var updateParams = { upsert: true, new: true, overwrite: true }
  this.templateModel.findOneAndUpdate(conditions, templateJson, updateParams, function (err, obj) {
    if (err) {
      return api._badDatabase()
    }
    self.logger.info('successfully stored new template in database: {0}'.format(obj['name']))
    return api._success({
      'time-created': obj['time-created'],
      'time-modified': obj['time-modified'],
      'name': obj['name']
    })
  })
}

BinderRegistry.prototype.getTemplate = function (api) {
  var self = this
  var templateName = api.params['template-name']
  self.logger.info('searching for template {0} in database'.format(templateName))
  this.templateModel.findOne({ name: templateName }, function (err, template) {
    if (err) {
      return api._badDatabase()
    }
    if (!template || (template === {}) {
      return api._doesNotExist()
    }
    self.logger.info('found template with name {0} in database'.format(templateName))
    template = template || {}
    self.logger.info('template: {0}'.format(JSON.stringify(template)))
    return api._success(template)
  })
}

BinderRegistry.prototype.getAllTemplates = function (api) {
  var self = this
  self.logger.info('searching for all templates')
  this.templateModel.find({}, function (err, templates) {
    if (err) return api._badDatabase()
    self.logger.info('found {0} templates'.format(templates.length))
    return api._success(templates)
  })
}

/**
 * Performs all module-specific startup behavior
 * @param {function} cb - callback(error)
 */
BinderRegistry.prototype._start = function (cb) {
  var self = this
  getDatabase(self.opts, function (err, conn) {
    if (err) return cb(err)
    self.db = conn
    self.templateModel = self.db.model('Template', Template)
    return cb()
  })
}

/**
 * Performs all module-specific stopping behavior
 * @param {function} cb - callback(error)
 */
BinderRegistry.prototype._stop = function (cb) {
  if (this.db) {
    this.db.close(cb)
  }
}

// End of the BinderModule interface

module.exports = BinderRegistry
