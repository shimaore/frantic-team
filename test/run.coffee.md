    describe 'A basic replication', ->
      replicate = require '..'
      prefix = "http://#{process.env.COUCHDB_USER}:#{process.env.COUCHDB_PASSWORD}@couchdb:5984"
      CouchDB = require 'most-couchdb'
      it 'should run', ->
        @timeout 8000
        await (new CouchDB "#{prefix}/_replicator").create()
        await (new CouchDB "#{prefix}/example").create()
        await replicate prefix, prefix, 'example'

    describe 'A basic replication in a separate replicator database', ->
      replicate = require '..'
      prefix = "http://#{process.env.COUCHDB_USER}:#{process.env.COUCHDB_PASSWORD}@couchdb:5984"
      CouchDB = require 'most-couchdb'
      it 'should run', ->
        @timeout 8000
        await (new CouchDB "#{prefix}/test_replicator").create()
        await (new CouchDB "#{prefix}/example2").create()
        await replicate prefix, prefix, 'example2', null, 'test'
