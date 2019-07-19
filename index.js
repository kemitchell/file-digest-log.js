var BlockStream = require('block-stream')
var assert = require('assert')
var fs = require('fs')
var pump = require('pump')
var runSeries = require('run-series')

exports.append = function (file, digest, callback) {
  assert(typeof file === 'string')
  assert(Buffer.isBuffer(digest))
  assert(typeof callback === 'function')
  var digestLength = digest.length
  fs.open(file, 'a+'/* append and read */, function (error, fd) {
    if (error) return callback(error)
    var index
    runSeries([
      function appendTheDigest (done) {
        fs.write(fd, digest, function (error, written) {
          if (error) return callback(error)
          done()
        })
      },
      function statTheFileAndComputeIndex (done) {
        fs.fstat(fd, function (error, stats) {
          if (error) return callback(error)
          var size = stats.size
          index = Math.floor(size / digestLength)
          done()
        })
      }
    ], function (seriesError) {
      fs.close(fd, function (closeError) {
        if (seriesError) return callback(seriesError)
        if (closeError) return callback(closeError)
        callback(null, index)
      })
    })
  })
}

exports.createDigestsStream = function (file, digestLength, limits) {
  assert(typeof file === 'string')
  assert(typeof digestLength === 'number')
  var options = {}
  if (limits) {
    if (limits && limits.start) {
      assert(limits.start > 0)
      options.start = limits.start * digestLength
    }
    if (limits.end) {
      assert(limits.end > 0)
      options.end = limits.end * digestLength - 1
    }
  }
  return pump(
    fs.createReadStream(file, options),
    new BlockStream(digestLength)
  )
}

exports.head = function (file, digestLength, callback) {
  assert(typeof file === 'string')
  assert(typeof digestLength === 'number')
  assert(typeof callback === 'function')
  fs.stat(file, function (error, stats) {
    if (error) return callback(error)
    callback(null, Math.floor(stats.size / digestLength))
  })
}
