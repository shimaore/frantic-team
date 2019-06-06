(function() {
  // `replicate`
  // -----------
  var CouchDB, crypto, debug, delay, pkg, replicate, site, sleep, url,
    hasProp = {}.hasOwnProperty;

  delay = 2000;

  // `replicate(source,target,name,extensions)`: replicate database `name` from `source` to `target` (all strings) by creating a replication `pull` document on the target.
  // Before submission, the replication document is passed to the (optional) `extensions` callback.
  // Returns a Promise. Make sure you `catch()` any errors.
  // An optional extra parameter might be used to name a distinct replicator database for storage (supported in CouchDB 2 and above).
  module.exports = replicate = async function(prefix_source, prefix_target, name, extensions_cb, group_name = '') {
    var _rev, comment, doc, id, k, model, replicator, replicator_db, source, sum, target, use_delete, v;
    replicator_db = `${prefix_target}/${group_name}_replicator`;
    replicator = new CouchDB(replicator_db);
    // Here we have multiple solutions, so I'll test them:
    // - either delete any existing document with the same name (this should cancel the replication, based on the CouchDB docs), and recreate a new one;
    use_delete = true;
    // - or use a different ID for documents that describes different replications.

    // use_delete = false

    // The one thing we know doesn't work is using the same document ID for documents that describe different replications (e.g. with different filters: experience shows the replicator doesn't notice and keeps using the old filter).
    // Deleting the replication document should also force the replicator to stop the existing replication and start a new process.
    source = url.parse(prefix_source);
    comment = `replication of ${name} from ${source.host}`;
    debug(`Going to start ${comment}.`);
    // I'm creating a `model` document.. just in case I'd have to revert to manually pushing to `/_replicate` because the replicator is too broken. :)
    model = {
      comment: comment,
      continuous: true,
      // Remove authorization from the source and target, because...
      target: site(prefix_target, name),
      source: site(prefix_source, name)
    };
    await (typeof extensions_cb === "function" ? extensions_cb(model) : void 0);
    // Create a (somewhat) unique ID for the document.
    sum = crypto.createHash('sha256');
    sum.update(JSON.stringify(model));
    id = sum.digest('hex');
    model.comment_id = id;
    // When deleting, we can use the `comment` value since it doesn't have to be unique even if we change the record.
    // When creating documents with different IDs, well, use the computed ID.
    model._id = use_delete ? model.comment : id;
    // Let's get started.
    debug("Going to inject", model);
    // Create the target database if it doesn't already exist.
    target = new CouchDB(`${prefix_target}/${name}`);
    await target.create().catch(function(error) {
      // Catch 412 errors as they indicate the database early exists.
      if ((error.status != null) && error.status === 412) {
        debug("Database already exists");
        return;
      }
      // Report all other errors.
      debug.error(`Creating database ${name} failed.`, error);
      return Promise.reject(error);
    });
    target = null;
    // When using the deletion method, first delete the existing replication document.
    if (use_delete) {
      ({_rev} = (await replicator.get(model._id).catch(function(error) {
        return {};
      })));
      if (_rev != null) {
        await replicator.delete({
          _id: model._id,
          _rev
        });
      }
    }
    // Give CouchDB some time to breath.
    await sleep(delay);
    // Update the replication document.
    ({_rev} = (await replicator.get(model._id).catch(function(error) {
      return {};
    })));
    doc = {};
    if (_rev != null) {
      doc._rev = _rev;
    }
    for (k in model) {
      if (!hasProp.call(model, k)) continue;
      v = model[k];
      doc[k] = v;
    }
    debug('Creating replication', doc);
    await replicator.update(doc).catch(function(error) {
      // Catch 403 errors as they indicate the status was updated by CouchDB (too fast for us to see).
      if ((error.status != null) && error.status === 403) {
        debug("Replication already started");
        return;
      }
      // Report all other errors.
      debug.error(`Replication from ${model.source} for ${model._id} failed.`, error);
      return Promise.reject(error);
    });
    // Give CouchDB some time to breath.
    await sleep(delay);
    // Log the status of the replicator
    doc = (await replicator.get(model._id).catch(function(error) {
      return {};
    }));
    debug('Replication status', doc);
    replicator = null;
  };

  // Toolbox
  // =======
  CouchDB = require('most-couchdb/with-update');

  sleep = function(timeout) {
    return new Promise(function(resolve) {
      return setTimeout(resolve, timeout);
    });
  };

  crypto = require('crypto');

  site = require('frantic-site');

  url = require('url');

  pkg = require('./package.json');

  debug = (require('tangible'))(pkg.name);

}).call(this);

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC5jb2ZmZWUubWQiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7RUFBQTs7QUFBQSxNQUFBLE9BQUEsRUFBQSxNQUFBLEVBQUEsS0FBQSxFQUFBLEtBQUEsRUFBQSxHQUFBLEVBQUEsU0FBQSxFQUFBLElBQUEsRUFBQSxLQUFBLEVBQUEsR0FBQTtJQUFBOztFQUdJLEtBQUEsR0FBUSxLQUhaOzs7Ozs7RUFVSSxNQUFNLENBQUMsT0FBUCxHQUFpQixTQUFBLEdBQVksTUFBQSxRQUFBLENBQUMsYUFBRCxFQUFlLGFBQWYsRUFBNkIsSUFBN0IsRUFBa0MsYUFBbEMsRUFBZ0QsYUFBYSxFQUE3RCxDQUFBO0FBRTNCLFFBQUEsSUFBQSxFQUFBLE9BQUEsRUFBQSxHQUFBLEVBQUEsRUFBQSxFQUFBLENBQUEsRUFBQSxLQUFBLEVBQUEsVUFBQSxFQUFBLGFBQUEsRUFBQSxNQUFBLEVBQUEsR0FBQSxFQUFBLE1BQUEsRUFBQSxVQUFBLEVBQUE7SUFBQSxhQUFBLEdBQWdCLENBQUEsQ0FBQSxDQUFHLGFBQUgsQ0FBaUIsQ0FBakIsQ0FBQSxDQUFvQixVQUFwQixDQUErQixXQUEvQjtJQUNoQixVQUFBLEdBQWEsSUFBSSxPQUFKLENBQVksYUFBWixFQURiOzs7SUFNQSxVQUFBLEdBQWEsS0FOYjs7Ozs7OztJQWVBLE1BQUEsR0FBUyxHQUFHLENBQUMsS0FBSixDQUFVLGFBQVY7SUFDVCxPQUFBLEdBQVUsQ0FBQSxlQUFBLENBQUEsQ0FBa0IsSUFBbEIsQ0FBdUIsTUFBdkIsQ0FBQSxDQUErQixNQUFNLENBQUMsSUFBdEMsQ0FBQTtJQUNWLEtBQUEsQ0FBTSxDQUFBLGVBQUEsQ0FBQSxDQUFrQixPQUFsQixDQUEwQixDQUExQixDQUFOLEVBakJBOztJQXFCQSxLQUFBLEdBQ0U7TUFBQSxPQUFBLEVBQVMsT0FBVDtNQUNBLFVBQUEsRUFBWSxJQURaOztNQUtBLE1BQUEsRUFBUSxJQUFBLENBQUss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LEtBQUssQ0FBQyxHQURELENBRVYsQ0FBQyxLQUZTLENBRUgsUUFBQSxDQUFDLEtBQUQsQ0FBQTthQUFXLENBQUE7SUFBWCxDQUZHLENBQU47SUFJTixLQUFBLENBQU0sb0JBQU4sRUFBNEIsR0FBNUI7SUFDQSxVQUFBLEdBQWE7RUE1SGMsRUFWakM7Ozs7RUE0SUksT0FBQSxHQUFVLE9BQUEsQ0FBUSwwQkFBUjs7RUFFVixLQUFBLEdBQVEsUUFBQSxDQUFDLE9BQUQsQ0FBQTtXQUFhLElBQUksT0FBSixDQUFZLFFBQUEsQ0FBQyxPQUFELENBQUE7YUFBYSxVQUFBLENBQVcsT0FBWCxFQUFvQixPQUFwQjtJQUFiLENBQVo7RUFBYjs7RUFDUixNQUFBLEdBQVMsT0FBQSxDQUFRLFFBQVI7O0VBQ1QsSUFBQSxHQUFPLE9BQUEsQ0FBUSxjQUFSOztFQUNQLEdBQUEsR0FBTSxPQUFBLENBQVEsS0FBUjs7RUFDTixHQUFBLEdBQU0sT0FBQSxDQUFRLGdCQUFSOztFQUNOLEtBQUEsR0FBUSxDQUFDLE9BQUEsQ0FBUSxVQUFSLENBQUQsQ0FBQSxDQUFxQixHQUFHLENBQUMsSUFBekI7QUFuSloiLCJzb3VyY2VzQ29udGVudCI6WyJgcmVwbGljYXRlYFxuLS0tLS0tLS0tLS1cblxuICAgIGRlbGF5ID0gMjAwMFxuXG5gcmVwbGljYXRlKHNvdXJjZSx0YXJnZXQsbmFtZSxleHRlbnNpb25zKWA6IHJlcGxpY2F0ZSBkYXRhYmFzZSBgbmFtZWAgZnJvbSBgc291cmNlYCB0byBgdGFyZ2V0YCAoYWxsIHN0cmluZ3MpIGJ5IGNyZWF0aW5nIGEgcmVwbGljYXRpb24gYHB1bGxgIGRvY3VtZW50IG9uIHRoZSB0YXJnZXQuXG5CZWZvcmUgc3VibWlzc2lvbiwgdGhlIHJlcGxpY2F0aW9uIGRvY3VtZW50IGlzIHBhc3NlZCB0byB0aGUgKG9wdGlvbmFsKSBgZXh0ZW5zaW9uc2AgY2FsbGJhY2suXG5SZXR1cm5zIGEgUHJvbWlzZS4gTWFrZSBzdXJlIHlvdSBgY2F0Y2goKWAgYW55IGVycm9ycy5cbkFuIG9wdGlvbmFsIGV4dHJhIHBhcmFtZXRlciBtaWdodCBiZSB1c2VkIHRvIG5hbWUgYSBkaXN0aW5jdCByZXBsaWNhdG9yIGRhdGFiYXNlIGZvciBzdG9yYWdlIChzdXBwb3J0ZWQgaW4gQ291Y2hEQiAyIGFuZCBhYm92ZSkuXG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IHJlcGxpY2F0ZSA9IChwcmVmaXhfc291cmNlLHByZWZpeF90YXJnZXQsbmFtZSxleHRlbnNpb25zX2NiLGdyb3VwX25hbWUgPSAnJykgLT5cblxuICAgICAgcmVwbGljYXRvcl9kYiA9IFwiI3twcmVmaXhfdGFyZ2V0fS8je2dyb3VwX25hbWV9X3JlcGxpY2F0b3JcIlxuICAgICAgcmVwbGljYXRvciA9IG5ldyBDb3VjaERCIHJlcGxpY2F0b3JfZGJcblxuSGVyZSB3ZSBoYXZlIG11bHRpcGxlIHNvbHV0aW9ucywgc28gSSdsbCB0ZXN0IHRoZW06XG4tIGVpdGhlciBkZWxldGUgYW55IGV4aXN0aW5nIGRvY3VtZW50IHdpdGggdGhlIHNhbWUgbmFtZSAodGhpcyBzaG91bGQgY2FuY2VsIHRoZSByZXBsaWNhdGlvbiwgYmFzZWQgb24gdGhlIENvdWNoREIgZG9jcyksIGFuZCByZWNyZWF0ZSBhIG5ldyBvbmU7XG5cbiAgICAgIHVzZV9kZWxldGUgPSB0cnVlXG5cbi0gb3IgdXNlIGEgZGlmZmVyZW50IElEIGZvciBkb2N1bWVudHMgdGhhdCBkZXNjcmliZXMgZGlmZmVyZW50IHJlcGxpY2F0aW9ucy5cblxuICAgICAgIyB1c2VfZGVsZXRlID0gZmFsc2VcblxuVGhlIG9uZSB0aGluZyB3ZSBrbm93IGRvZXNuJ3Qgd29yayBpcyB1c2luZyB0aGUgc2FtZSBkb2N1bWVudCBJRCBmb3IgZG9jdW1lbnRzIHRoYXQgZGVzY3JpYmUgZGlmZmVyZW50IHJlcGxpY2F0aW9ucyAoZS5nLiB3aXRoIGRpZmZlcmVudCBmaWx0ZXJzOiBleHBlcmllbmNlIHNob3dzIHRoZSByZXBsaWNhdG9yIGRvZXNuJ3Qgbm90aWNlIGFuZCBrZWVwcyB1c2luZyB0aGUgb2xkIGZpbHRlcikuXG5EZWxldGluZyB0aGUgcmVwbGljYXRpb24gZG9jdW1lbnQgc2hvdWxkIGFsc28gZm9yY2UgdGhlIHJlcGxpY2F0b3IgdG8gc3RvcCB0aGUgZXhpc3RpbmcgcmVwbGljYXRpb24gYW5kIHN0YXJ0IGEgbmV3IHByb2Nlc3MuXG5cbiAgICAgIHNvdXJjZSA9IHVybC5wYXJzZSBwcmVmaXhfc291cmNlXG4gICAgICBjb21tZW50ID0gXCJyZXBsaWNhdGlvbiBvZiAje25hbWV9IGZyb20gI3tzb3VyY2UuaG9zdH1cIlxuICAgICAgZGVidWcgXCJHb2luZyB0byBzdGFydCAje2NvbW1lbnR9LlwiXG5cbkknbSBjcmVhdGluZyBhIGBtb2RlbGAgZG9jdW1lbnQuLiBqdXN0IGluIGNhc2UgSSdkIGhhdmUgdG8gcmV2ZXJ0IHRvIG1hbnVhbGx5IHB1c2hpbmcgdG8gYC9fcmVwbGljYXRlYCBiZWNhdXNlIHRoZSByZXBsaWNhdG9yIGlzIHRvbyBicm9rZW4uIDopXG5cbiAgICAgIG1vZGVsID1cbiAgICAgICAgY29tbWVudDogY29tbWVudFxuICAgICAgICBjb250aW51b3VzOiB0cnVlXG5cblJlbW92ZSBhdXRob3JpemF0aW9uIGZyb20gdGhlIHNvdXJjZSBhbmQgdGFyZ2V0LCBiZWNhdXNlLi4uXG5cbiAgICAgICAgdGFyZ2V0OiBzaXRlIHByZWZpeF90YXJnZXQsIG5hbWVcbiAgICAgICAgc291cmNlOiBzaXRlIHByZWZpeF9zb3VyY2UsIG5hbWVcblxuTGV0IHRoZSBjYWxsYmFjayBhZGQgYW55IGZpZWxkIHRoZXknZCBsaWtlLlxuTm90ZTogdGhlIGNhbGxiYWNrIG1pZ2h0IGFsc28gcHJldmVudCByZXBsaWNhdGlvbiBpZiBpdCB0aHJvd3MuIFRoaXMgaXMgaW50ZW50aW9uYWwuXG5Ob3RlOiB0aGUgY2FsbGJhY2sgbWlnaHQgcmV0dXJuIGEgUHJvbWlzZS4gT3Igbm90LiBXZSdsbCBkZWFsIHdpdGggYm90aC5cblxuICAgICAgYXdhaXQgZXh0ZW5zaW9uc19jYj8gbW9kZWxcblxuQ3JlYXRlIGEgKHNvbWV3aGF0KSB1bmlxdWUgSUQgZm9yIHRoZSBkb2N1bWVudC5cblxuICAgICAgc3VtID0gY3J5cHRvLmNyZWF0ZUhhc2ggJ3NoYTI1NidcbiAgICAgIHN1bS51cGRhdGUgSlNPTi5zdHJpbmdpZnkgbW9kZWxcbiAgICAgIGlkID0gc3VtLmRpZ2VzdCAnaGV4J1xuICAgICAgbW9kZWwuY29tbWVudF9pZCA9IGlkXG5cbldoZW4gZGVsZXRpbmcsIHdlIGNhbiB1c2UgdGhlIGBjb21tZW50YCB2YWx1ZSBzaW5jZSBpdCBkb2Vzbid0IGhhdmUgdG8gYmUgdW5pcXVlIGV2ZW4gaWYgd2UgY2hhbmdlIHRoZSByZWNvcmQuXG5XaGVuIGNyZWF0aW5nIGRvY3VtZW50cyB3aXRoIGRpZmZlcmVudCBJRHMsIHdlbGwsIHVzZSB0aGUgY29tcHV0ZWQgSUQuXG5cbiAgICAgIG1vZGVsLl9pZCA9IGlmIHVzZV9kZWxldGUgdGhlbiBtb2RlbC5jb21tZW50IGVsc2UgaWRcblxuTGV0J3MgZ2V0IHN0YXJ0ZWQuXG5cbiAgICAgIGRlYnVnIFwiR29pbmcgdG8gaW5qZWN0XCIsIG1vZGVsXG5cbkNyZWF0ZSB0aGUgdGFyZ2V0IGRhdGFiYXNlIGlmIGl0IGRvZXNuJ3QgYWxyZWFkeSBleGlzdC5cblxuICAgICAgdGFyZ2V0ID0gbmV3IENvdWNoREIgXCIje3ByZWZpeF90YXJnZXR9LyN7bmFtZX1cIlxuICAgICAgYXdhaXQgdGFyZ2V0LmNyZWF0ZSgpXG4gICAgICAgIC5jYXRjaCAoZXJyb3IpIC0+XG5cbkNhdGNoIDQxMiBlcnJvcnMgYXMgdGhleSBpbmRpY2F0ZSB0aGUgZGF0YWJhc2UgZWFybHkgZXhpc3RzLlxuXG4gICAgICAgICAgaWYgZXJyb3Iuc3RhdHVzPyBhbmQgZXJyb3Iuc3RhdHVzIGlzIDQxMlxuICAgICAgICAgICAgZGVidWcgXCJEYXRhYmFzZSBhbHJlYWR5IGV4aXN0c1wiXG4gICAgICAgICAgICByZXR1cm5cblxuUmVwb3J0IGFsbCBvdGhlciBlcnJvcnMuXG5cbiAgICAgICAgICBkZWJ1Zy5lcnJvciBcIkNyZWF0aW5nIGRhdGFiYXNlICN7bmFtZX0gZmFpbGVkLlwiLCBlcnJvclxuICAgICAgICAgIFByb21pc2UucmVqZWN0IGVycm9yXG5cbiAgICAgIHRhcmdldCA9IG51bGxcblxuV2hlbiB1c2luZyB0aGUgZGVsZXRpb24gbWV0aG9kLCBmaXJzdCBkZWxldGUgdGhlIGV4aXN0aW5nIHJlcGxpY2F0aW9uIGRvY3VtZW50LlxuXG4gICAgICBpZiB1c2VfZGVsZXRlXG4gICAgICAgIHtfcmV2fSA9IGF3YWl0IHJlcGxpY2F0b3JcbiAgICAgICAgICAuZ2V0IG1vZGVsLl9pZFxuICAgICAgICAgIC5jYXRjaCAoZXJyb3IpIC0+IHt9XG4gICAgICAgIGF3YWl0IHJlcGxpY2F0b3IuZGVsZXRlIHtfaWQ6bW9kZWwuX2lkLCBfcmV2fSBpZiBfcmV2P1xuXG5HaXZlIENvdWNoREIgc29tZSB0aW1lIHRvIGJyZWF0aC5cblxuICAgICAgYXdhaXQgc2xlZXAgZGVsYXlcblxuVXBkYXRlIHRoZSByZXBsaWNhdGlvbiBkb2N1bWVudC5cblxuICAgICAge19yZXZ9ID0gYXdhaXQgcmVwbGljYXRvclxuICAgICAgICAuZ2V0IG1vZGVsLl9pZFxuICAgICAgICAuY2F0Y2ggKGVycm9yKSAtPiB7fVxuXG4gICAgICBkb2MgPSB7fVxuICAgICAgZG9jLl9yZXYgPSBfcmV2IGlmIF9yZXY/XG4gICAgICBmb3Igb3duIGssdiBvZiBtb2RlbFxuICAgICAgICBkb2Nba10gPSB2XG5cbiAgICAgIGRlYnVnICdDcmVhdGluZyByZXBsaWNhdGlvbicsIGRvY1xuXG4gICAgICBhd2FpdCByZXBsaWNhdG9yXG4gICAgICAgIC51cGRhdGUgZG9jXG4gICAgICAgIC5jYXRjaCAoZXJyb3IpIC0+XG5cbkNhdGNoIDQwMyBlcnJvcnMgYXMgdGhleSBpbmRpY2F0ZSB0aGUgc3RhdHVzIHdhcyB1cGRhdGVkIGJ5IENvdWNoREIgKHRvbyBmYXN0IGZvciB1cyB0byBzZWUpLlxuXG4gICAgICAgICAgaWYgZXJyb3Iuc3RhdHVzPyBhbmQgZXJyb3Iuc3RhdHVzIGlzIDQwM1xuICAgICAgICAgICAgZGVidWcgXCJSZXBsaWNhdGlvbiBhbHJlYWR5IHN0YXJ0ZWRcIlxuICAgICAgICAgICAgcmV0dXJuXG5cblJlcG9ydCBhbGwgb3RoZXIgZXJyb3JzLlxuXG4gICAgICAgICAgZGVidWcuZXJyb3IgXCJSZXBsaWNhdGlvbiBmcm9tICN7bW9kZWwuc291cmNlfSBmb3IgI3ttb2RlbC5faWR9IGZhaWxlZC5cIiwgZXJyb3JcbiAgICAgICAgICBQcm9taXNlLnJlamVjdCBlcnJvclxuXG5HaXZlIENvdWNoREIgc29tZSB0aW1lIHRvIGJyZWF0aC5cblxuICAgICAgYXdhaXQgc2xlZXAgZGVsYXlcblxuTG9nIHRoZSBzdGF0dXMgb2YgdGhlIHJlcGxpY2F0b3JcblxuICAgICAgZG9jID0gYXdhaXQgcmVwbGljYXRvclxuICAgICAgICAuZ2V0IG1vZGVsLl9pZFxuICAgICAgICAuY2F0Y2ggKGVycm9yKSAtPiB7fVxuXG4gICAgICBkZWJ1ZyAnUmVwbGljYXRpb24gc3RhdHVzJywgZG9jXG4gICAgICByZXBsaWNhdG9yID0gbnVsbFxuICAgICAgcmV0dXJuXG5cblRvb2xib3hcbj09PT09PT1cblxuICAgIENvdWNoREIgPSByZXF1aXJlICdtb3N0LWNvdWNoZGIvd2l0aC11cGRhdGUnXG5cbiAgICBzbGVlcCA9ICh0aW1lb3V0KSAtPiBuZXcgUHJvbWlzZSAocmVzb2x2ZSkgLT4gc2V0VGltZW91dCByZXNvbHZlLCB0aW1lb3V0XG4gICAgY3J5cHRvID0gcmVxdWlyZSAnY3J5cHRvJ1xuICAgIHNpdGUgPSByZXF1aXJlICdmcmFudGljLXNpdGUnXG4gICAgdXJsID0gcmVxdWlyZSAndXJsJ1xuICAgIHBrZyA9IHJlcXVpcmUgJy4vcGFja2FnZS5qc29uJ1xuICAgIGRlYnVnID0gKHJlcXVpcmUgJ3RhbmdpYmxlJykgcGtnLm5hbWVcbiJdfQ==
//# sourceURL=/dev/shm/frantic-team/index.coffee.md