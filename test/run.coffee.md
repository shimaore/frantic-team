    describe 'A basic replication', ->
      replicate = require '..'
      prefix = "http://#{process.env.COUCHDB_USER}:#{process.env.COUCHDB_PASSWORD}@couchdb:5984"
      CouchDB = require 'most-couchdb'
      before ->
        await (new CouchDB "#{prefix}/_replicator").create()
        await (new CouchDB "#{prefix}/example").create()
      after ->
        await (new CouchDB "#{prefix}/_replicator").destroy()
        await (new CouchDB "#{prefix}/example").destroy()
      it 'should run', ->
        @timeout 8000
        await replicate prefix, prefix, 'example'

    describe 'A basic replication in a separate replicator database', ->
      replicate = require '..'
      prefix = "http://#{process.env.COUCHDB_USER}:#{process.env.COUCHDB_PASSWORD}@couchdb:5984"
      CouchDB = require 'most-couchdb'
      before ->
        await (new CouchDB "#{prefix}/test_replicator").create()
        await (new CouchDB "#{prefix}/example2").create()
      after ->
        await (new CouchDB "#{prefix}/test_replicator").destroy()
        await (new CouchDB "#{prefix}/example2").destroy()
      it 'should run', ->
        @timeout 8000
        await replicate prefix, prefix, 'example2', null, 'test'
