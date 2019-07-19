var fileDigestLog = require('./')
var runSeries = require('run-series')
var fs = require('fs')
var tape = require('tape')

tape('test', function (test) {
  var file = 'first.log'
  var firstDigest = Buffer.from('a'.repeat(64), 'hex')
  var secondDigest = Buffer.from('b'.repeat(64), 'hex')
  runSeries([
    function appendFirst (done) {
      fileDigestLog.append(file, firstDigest, function (error, index) {
        test.ifError(error, 'no append error')
        test.equal(index, 1, 'written index')
        done()
      })
    },
    function checkHead (done) {
      fileDigestLog.head(file, 32, function (error, head) {
        test.ifError(error, 'no head error')
        test.equal(head, 1, 'read head')
        done()
      })
    },
    function appendSecond (done) {
      fileDigestLog.append(file, secondDigest, function (error, index) {
        test.ifError(error, 'no append error')
        test.equal(index, 2, 'written index')
        done()
      })
    },
    function checkHeadAgain (done) {
      fileDigestLog.head(file, 32, function (error, head) {
        test.ifError(error, 'no head error')
        test.equal(head, 2, 'read head')
        done()
      })
    },
    function streamAllDigests (done) {
      test.comment('stream all')
      var read = []
      fileDigestLog.createDigestsStream(file, 32)
        .on('data', function (digest) {
          read.push(digest)
        })
        .once('end', function () {
          test.equals(read.length, 2, 'streamed two')
          test.assert(read[0].equals(firstDigest), 'streams first')
          test.assert(read[1].equals(secondDigest), 'streams second')
          done()
        })
    },
    function streamFirstDigest (done) {
      test.comment('stream first')
      var read = []
      fileDigestLog.createDigestsStream(file, 32, { end: 1 })
        .on('data', function (digest) {
          read.push(digest)
        })
        .once('end', function () {
          test.equals(read.length, 1, 'streamed one')
          test.assert(read[0].equals(firstDigest), 'streams first')
          done()
        })
    },
    function streamSecondDigest (done) {
      test.comment('stream second')
      var read = []
      fileDigestLog.createDigestsStream(file, 32, { start: 1 })
        .on('data', function (digest) {
          read.push(digest)
        })
        .once('end', function () {
          test.equals(read.length, 1, 'streamed one')
          test.assert(read[0].equals(secondDigest), 'streams second')
          done()
        })
    }
  ], function (error) {
    test.comment('cleanup')
    test.ifError(error, 'no error')
    fs.unlink(file, function (error) {
      test.ifError(error, 'no unlink error')
      test.end()
    })
  })
})
