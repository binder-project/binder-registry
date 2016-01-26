var BinderModule = require('binder-module')
var inherits = require('inherits')

var getLogger = require('binder-logging').getLogger
var getDatabase = require('binder-db')

/*
 * An HTTP server that implements the API of a Binder component
 * @constructor
 */
function BinderRegistry (opts) {
  if (!this instanceof BinderRegistry) {
    return new BinderRegistry(opts)
  }
  this.opts = opts
  this.logger = getLogger(opts.logging)
  BinderModule.call(this)
}
inherits(BinderRegistry, BinderModule)

BinderRegistry.prototype.storeTemplate = function (req, res) {

}

BinderRegistry.prototype.getTemplate = function (req, res) {
  var templateName = req.params.templateName
}

BinderRegistry.prototype.getTemplateStatus = function (req, res) {
  var templateName = req.params.templateName
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
  app.route('/templates/:templateName/status')
    .get(authHandler, this.getTemplateStatus.bind(this))
}

/**
 * Performs all module-specific startup behavior
 */
BinderRegistry.prototype._start = function () {}

/**
 * Performs all module-specific stopping behavior
 */
BinderRegistry.prototype._stop = function () {}

// End of the BinderModule interface

module.exports = BinderRegistry
