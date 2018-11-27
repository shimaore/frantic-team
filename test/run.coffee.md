    describe 'A basic replication', ->
      replicate = require '..'
      prefix = 'http://admin:password@couchdb:5984'
      CouchDB = require 'most-couchdb'
      it 'should run', ->
        @timeout 8000
        await (new CouchDB "#{prefix}/_replicator").create()
        await (new CouchDB "#{prefix}/example").create()
        await replicate prefix, prefix, 'example'
