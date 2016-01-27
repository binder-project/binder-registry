var _ = require('lodash')
var fs = require('fs')
var shell = require('shelljs')
var path = require('path')

var startWithPM2 = require('binder-utils').startWithPM2
var Module = require('./server.js')

/**
 * The argument-parsing and action components of a CLI command are separated so that the CLI
 * can both be imported from other modules and launched via PM2
 */
function Command (name, cli, action) {
  if (!(this instanceof Command)) {
    return new Command(name, cli, action)
  }
  this.name = name
  this.cli = cli
  this.action = action
}

/**
 * Add an action for this command to the main program
 *
 * @param {Program} program - main commander program
 */
Command.prototype.makeAction = function (program) {
  program.command(this.name)
  this.cli(program)
  program.action(this.action)
  return program
}

var makeCommands = function () {
  var commands = [
    Command('start', function (program) {
      program
        .description('Start the binder-registry server')
        .option('-p, --port', 'the binder-registry server port')
      return program
    }, function (options) {
      console.log('running START')
      var opts = {}
      if (options.config) {
        _.merge(opts, JSON.parse(fs.readFileSync(options.config)))
      } if (options.port) {
        opts.port = options.port
      } if (options.apiKey) {
        opts.apiKey = options.apiKey
      }
      var module = new Module(opts)
      module.start()
    }),
    Command('stop', function (program) {
      program
        .description('Stop the binder-registry server')
      return program
    }, function (options) {
      console.log('running STOP')
      console.log('Stopping the binder-registry server...')
      shell.exec(['pm2', 'stop', 'binder-registry'])
    })
    // TODO: add any module-specific commands here
  ]
  return commands
}

var setupProgram = function (commands, program) {
  program.option('-a, --apiKey', 'Binder API key')
  program.option('-c, --config', 'Module configuration file')
  _.forEach(commands, function (cmd) {
    var command = program.command(cmd.name)
    command = cmd.cli(command)
    command.action(cmd.action)
  })
}

var pm2CLI = function (program) {
  if (!program) {
    program = require('commander')
  }
  // Replace all actions with PM2 subprocess creation
  var pm2Commands = _.map(makeCommands(), function (cmd) {
    cmd.action = function (options) {
      startWithPM2({
        name: 'binder-registry-' + cmd.name,
        script: path.join(__dirname, 'cli.js'),
        args: process.argv.slice(2)
      })
    }
    return cmd
  })
  setupProgram(pm2Commands, program)
  return program
}

var standaloneCLI = function (program) {
  if (!program) {
    program = require('commander')
  }
  setupProgram(makeCommands(), program)
  return program
}

if (require.main === module) {
  var program = standaloneCLI()
  program.parse(process.argv)
} else {
  module.exports = {
    standaloneCLI: standaloneCLI,
    pm2CLI: pm2CLI
  }
}
