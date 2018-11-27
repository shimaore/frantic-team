    describe 'A basic replication', ->
      replicate = require '..'
      CouchDB = require 'most-couchdb'
      it 'should run', ->
        a = new CouchDB 'http://admin:password@couchdb:5984/example'
        await a.create()
        await replicate 'http://admin:password@couchdb:5984', 'http://admin:password@couchdb:5984', 'example'
