`replicate`
-----------

    seem = require 'seem'

`replicate(source,target,name,extensions)`: replicate database `name` from `source` to `target` (all strings) by creating a replication `pull` document on the target.
Before submission, the replication document is passed to the (optional) `extensions` callback.
Returns a Promise. Make sure you `catch()` any errors.

    module.exports = replicate = seem (prefix_source,prefix_target,name,extensions_cb) ->

      replicator_db = "#{prefix_target}/_replicator"
      replicator = new PouchDB replicator_db, skip_setup: true

Here we have multiple solutions, so I'll test them:
- either delete any existing document with the same name (this should cancel the replication, based on the CouchDB docs), and recreate a new one;

      use_delete = true

- or use a different ID for documents that describes different replications.

      # use_delete = false

The one thing we know doesn't work is using the same document ID for documents that describe different replications (e.g. with different filters: experience shows the replicator doesn't notice and keeps using the old filter).
Deleting the replication document should also force the replicator to stop the existing replication and start a new process.

      source = url.parse prefix_source
      comment = "replication of #{name} from #{source.host}"
      debug "Going to start #{comment}."

I'm creating a `model` document.. just in case I'd have to revert to manually pushing to `/_replicate` because the replicator is too broken. :)

      model =
        comment: comment
        continuous: true
        target: name

Remove authorization from the source, because...

        source:
          url: url.format
            protocol: source.protocol
            host: source.host
            pathname: name

...even with CouchDB 1.6.1 we still have the issue with CouchDB not properly managing authorization headers when a username and password are provided in the original URI that contains "special" characters (like `@` or space). So let's handle it ourselves.

      if source.auth?
        auth = (new Buffer source.auth).toString 'base64'
        debug "Encoded `#{source.auth}` of `#{prefix_source}` as `#{auth}`."
        model.source.headers =
          Authorization: "Basic #{auth}"

Let the callback add any field they'd like.
Note: the callback might also prevent replication if it throws. This is intentional.
Note: the callback might return a Promise. Or not. We'll deal with both.

      yield extensions_cb? model

Create a (somewhat) unique ID for the document.

      sum = crypto.createHash 'sha256'
      sum.update JSON.stringify model
      id = sum.digest 'hex'
      model.comment_id = id

When deleting, we can use the `comment` value since it doesn't have to be unique even if we change the record.
When creating documents with different IDs, well, use the computed ID.

      model._id = if use_delete then model.comment else id

Let's get started.

      debug "Going to inject", model

Create the target database if it doesn't already exist.

      target = new PouchDB "#{prefix_target}/#{name}", skip_setup: false
      yield target.info()

When using the deletion method, first delete the existing replication document.

      if use_delete
        {_rev} = yield replicator
          .get model._id
          .catch (error) -> {}
        yield replicator.remove model._id, _rev if _rev?

Give CouchDB some time to breath.

      yield delay 2000

Update the replication document.

      {_rev} = yield replicator
        .get model._id
        .catch (error) -> {}

      doc = {}
      doc._rev = _rev if _rev?
      for own k,v of model
        doc[k] = v

      debug 'Creating replication', doc

      yield replicator
        .put doc
        .catch (error) ->
          debug "put #{model._id}: #{error.stack ? error}"

Catch 403 errors as they indicate the status was updated by CouchDB (too fast for us to see).

          if error.status? and error.status is 403
            debug "Replication already started"
            return

Report all other errors.

          debug "Replication from #{model.source} failed."
          Promise.reject error

Toolbox
=======

    PouchDB = require 'pouchdb'

    delay = require 'timeout-as-promise'
    crypto = require 'crypto'
    url = require 'url'
    pkg = require './package.json'
    debug = (require 'debug') pkg.name
