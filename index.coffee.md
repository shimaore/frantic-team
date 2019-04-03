`replicate`
-----------

    delay = 2000

`replicate(source,target,name,extensions)`: replicate database `name` from `source` to `target` (all strings) by creating a replication `pull` document on the target.
Before submission, the replication document is passed to the (optional) `extensions` callback.
Returns a Promise. Make sure you `catch()` any errors.
An optional extra parameter might be used to name a distinct replicator database for storage (supported in CouchDB 2 and above).

    module.exports = replicate = (prefix_source,prefix_target,name,extensions_cb,group_name = '') ->

      replicator_db = "#{prefix_target}/#{group_name}_replicator"
      replicator = new CouchDB replicator_db

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

Remove authorization from the source and target, because...

        target: site prefix_target, name
        source: site prefix_source, name

Let the callback add any field they'd like.
Note: the callback might also prevent replication if it throws. This is intentional.
Note: the callback might return a Promise. Or not. We'll deal with both.

      await extensions_cb? model

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

      target = new CouchDB "#{prefix_target}/#{name}"
      await target.create()
        .catch (error) ->

Catch 412 errors as they indicate the database early exists.

          if error.status? and error.status is 412
            debug "Database already exists"
            return

Report all other errors.

          debug.error "Creating database #{name} failed.", error
          Promise.reject error

      target = null

When using the deletion method, first delete the existing replication document.

      if use_delete
        {_rev} = await replicator
          .get model._id
          .catch (error) -> {}
        await replicator.delete {_id:model._id, _rev} if _rev?

Give CouchDB some time to breath.

      await sleep delay

Update the replication document.

      {_rev} = await replicator
        .get model._id
        .catch (error) -> {}

      doc = {}
      doc._rev = _rev if _rev?
      for own k,v of model
        doc[k] = v

      debug 'Creating replication', doc

      await replicator
        .update doc
        .catch (error) ->

Catch 403 errors as they indicate the status was updated by CouchDB (too fast for us to see).

          if error.status? and error.status is 403
            debug "Replication already started"
            return

Report all other errors.

          debug.error "Replication from #{model.source} for #{model._id} failed.", error
          Promise.reject error

Give CouchDB some time to breath.

      await sleep delay

Log the status of the replicator

      doc = await replicator
        .get model._id
        .catch (error) -> {}

      debug 'Replication status', doc
      replicator = null
      return

Toolbox
=======

    CouchDB = require 'most-couchdb/with-update'

    sleep = (timeout) -> new Promise (resolve) -> setTimeout resolve, timeout
    crypto = require 'crypto'
    site = require 'frantic-site'
    url = require 'url'
    pkg = require './package.json'
    debug = (require 'tangible') pkg.name
