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
  BinderRegistry.super_.call(this, settings, opts)
  this.logger = getLogger(settings.name, this.opts.logging)
  // the database connection is opened in _start
  this.db = null
  this.templateModel = null
}
inherits(BinderRegistry, BinderModule)

var Template = new mongoose.Schema({
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
  'time-modified': { type: Date, default: Date.now }
})

BinderRegistry.prototype.storeTemplate = function (req, res) {
  var templateJson = req.json
  var template = this.templateModel(templateJson)
  template.save(function (err) {
    if (err) return res.status(500).send('Could not store template: {0}'.format(err))
    res.json({
      'time-created': template['time-created'],
      'time-modified': template['time-modified'],
      'name': template['name']
    })
  })
}

BinderRegistry.prototype.getTemplate = function (req, res) {
  var templateName = req.params.templateName
  this.templateModel.findOne({ name: templateName }, function (err, template) {
    if (err) return res.status(500).send('Could not search for template: {0}'.format(err))
    res.json(template)
  })
}

// Start of the BinderModule interface

/**
 * Attached module's routes/handlers to the main app object
 */
BinderRegistry.prototype._makeRoutes = function (app, authHandler) {
  app.route('/templates')
    .post(authHandler, this.storeTemplate.bind(this))
  app.route('/templates/:templateName')
    .get(authHandler, this.getTemplate.bind(this))
}

/**
 * Performs all module-specific startup behavior
 * @param {function} cb - callback(error)
 */
BinderRegistry.prototype._start = function (cb) {
  var self = this
  getDatabase(function (err, conn) {
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
